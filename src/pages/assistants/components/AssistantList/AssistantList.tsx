// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import React, { useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import Announcement from '@/components/Announcement/Announcement'
import Spinner from '@/components/Spinner'
import { ASSISTANT_TEMPLATE_DETAILS } from '@/constants/routes'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import { useVueRouter } from '@/hooks/useVueRouter'
import { useAssistants } from '@/pages/assistants/hooks/useAssistants'
import { userStore } from '@/store'
import { favoritesStore } from '@/store/favorites'
import { Assistant } from '@/types/entity/assistant'
import { pluralize } from '@/utils/helpers'

import AssistantGrid from './AssistantGrid/AssistantGrid'
import { getAssistantRoute } from '../../utils/getAssistantLink'

interface AssistantsListProps {
  exportAssistant?: (assistant: Assistant) => void
  reloadAssistants: () => void
  isTemplate?: boolean
  loading?: boolean
  assistants?: Assistant[]
  hasActiveFilter?: boolean
  searchVersion?: number
}

const AssistantsList: React.FC<AssistantsListProps> = ({
  exportAssistant,
  reloadAssistants,
  isTemplate,
  loading,
  assistants: assistantsProp,
  hasActiveFilter,
  searchVersion,
}) => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore) as typeof userStore
  const {
    assistants: fetchedAssistants = [],
    assistantTemplates,
    assistantTemplatesPagination,
    pagination,
  } = useAssistants()
  const { assistantsPagination: favoritesPagination } = useSnapshot(favoritesStore)
  const assistants = assistantsProp ?? fetchedAssistants

  const getTotalCount = () => {
    // assistantsProp is only passed on Favorites. It holds one page, so the total comes from the
    // favorites store; a legacy response without a total falls back to the page length.
    if (assistantsProp) return favoritesPagination.totalCount || assistantsProp.length
    if (isTemplate) return assistantTemplatesPagination?.totalCount
    return pagination?.totalCount
  }
  const totalCount = getTotalCount()

  // The live region lives here rather than in AssistantGrid: this component stays mounted while
  // the list reloads, so the grid can unmount behind the spinner without losing the announcement.
  // The page keys it by tab, so this state starts fresh on each tab.
  const { announce, announcement } = useAnnouncementQueue()
  const prevSearchVersionRef = useRef(searchVersion)
  // Whether a filter was active when the previous search completed, so clearing it is announced.
  const wasFilterActiveRef = useRef(false)

  useEffect(() => {
    const prevSearchVersion = prevSearchVersionRef.current
    prevSearchVersionRef.current = searchVersion

    // Announce only once a search has completed. On mount, and when the filter has just turned on
    // but the results have not arrived yet, totalCount still holds the previous count.
    if (prevSearchVersion === searchVersion || totalCount == null) return

    const wasFilterActive = wasFilterActiveRef.current
    wasFilterActiveRef.current = !!hasActiveFilter
    // Loads with no filter before or after, such as opening the page or paging, stay silent.
    if (!hasActiveFilter && !wasFilterActive) return

    if (totalCount === 0) {
      announce(isTemplate ? 'No templates found' : 'No assistants found')
    } else {
      announce(`${totalCount} ${pluralize(totalCount, isTemplate ? 'template' : 'assistant')}`)
    }
    // totalCount is left out of the deps: the store write that updates it renders before the
    // searchVersion bump, so including it would announce the same search twice.
  }, [searchVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const showAssistant = (assistant) => {
    if (isTemplate) {
      router.push({ name: ASSISTANT_TEMPLATE_DETAILS, params: { id: assistant.slug } })
    } else {
      router.push(getAssistantRoute(assistant))
    }
  }

  return (
    <>
      {loading && <Spinner />}

      {!loading && (
        <AssistantGrid
          totalCount={totalCount}
          assistants={assistants}
          user={user}
          assistantTemplates={assistantTemplates}
          showAssistant={showAssistant}
          exportAssistant={exportAssistant}
          isTemplate={isTemplate}
          reloadAssistants={reloadAssistants}
        />
      )}

      <Announcement announcement={announcement} />
    </>
  )
}

export default React.memo(AssistantsList)
