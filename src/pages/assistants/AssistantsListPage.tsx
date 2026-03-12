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

import { classNames as cn } from 'primereact/utils'
import React, { useEffect, useState, useRef } from 'react'
import { useSnapshot } from 'valtio'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Pagination from '@/components/Pagination'
import Sidebar from '@/components/Sidebar'
import { AssistantTab, ButtonSize } from '@/constants'
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { NEW_ASSISTANT, NEW_REMOTE_ASSISTANT } from '@/constants/routes'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { useVueRouter } from '@/hooks/useVueRouter'
import AssistantsList from '@/pages/assistants/components/AssistantList'
import AssistantFilters from '@/pages/assistants/components/AssistantList/AssistantFilters'
import AssistantsNavigation from '@/pages/assistants/components/AssistantsNavigation'
import ExportAssistantPopup from '@/pages/assistants/components/ExportAssistantPopup'
import { useAssistantFilters } from '@/pages/assistants/hooks/useAssistantFilters'
import { useAssistants } from '@/pages/assistants/hooks/useAssistants'
import { useAssistantsList } from '@/pages/assistants/hooks/useAssistantsList'
import { appInfoStore } from '@/store/appInfo'
import { Assistant } from '@/types/entity/assistant'
import { isConfigItemEnabled } from '@/utils/settings'

interface AssistantsListPageProps {
  tab: AssistantTab
}

const AssistantsListPage = ({ tab }: AssistantsListPageProps) => {
  const router = useVueRouter()
  const scopeByTab = {
    [AssistantTab.ALL]: ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER,
    [AssistantTab.MARKETPLACE]: ASSISTANT_INDEX_SCOPES.MARKETPLACE,
    [AssistantTab.TEMPLATES]: ASSISTANT_INDEX_SCOPES.NONE,
  }
  const appInfo = useSnapshot(appInfoStore)
  const currentTabId = tab || AssistantTab.ALL
  const activeScope = scopeByTab[currentTabId] || ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER
  const isTemplate = currentTabId === AssistantTab.TEMPLATES
  const { assistants, loading } = useAssistants(false)
  const { loadAssistants: loadTemplates, loading: loadingTemplates } = useAssistants(true)
  const { filters, handleFilterChange } = useAssistantFilters({ scope: activeScope })

  const [showExportPopup, setShowExportPopup] = useState(false)
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)

  const { loadAssistantsList, currentPage, perPage, totalPages } = useAssistantsList({
    scope: activeScope,
    filterValues: filters,
  })

  const isInitialMountRef = useRef(true)

  const handleCreateAssistant = React.useCallback(async () => {
    router.push({ name: NEW_ASSISTANT })
  }, [router])

  const handleCreateRemoteAssistant = React.useCallback(async () => {
    router.push({ name: NEW_REMOTE_ASSISTANT })
  }, [router])

  const headerActions = React.useMemo(
    () => (
      <div className="flex gap-3">
        <Button type="primary" onClick={handleCreateAssistant} size={ButtonSize.MEDIUM}>
          <PlusIcon />
          Create Assistant
        </Button>
        {isConfigItemEnabled(appInfo.configs, 'remoteAssistant') && (
          <Button type="primary" size={ButtonSize.MEDIUM} onClick={handleCreateRemoteAssistant}>
            <PlusIcon />
            Create Remote Assistant
          </Button>
        )}
      </div>
    ),
    [handleCreateAssistant, appInfo]
  )

  const reloadAssistants = () => {
    loadAssistantsList({ page: currentPage }, false)
  }

  const handlePageChange = (page: number, perPage?: number) => {
    loadAssistantsList({ page, perPage }, false)
  }

  const handleExportAssistant = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setShowExportPopup(true)
  }

  const handleHideExportPopup = () => {
    setShowExportPopup(false)
    setSelectedAssistant(null)
  }

  useEffect(() => {
    appInfoStore.fetchCustomerConfig()
  }, [])

  useEffect(() => {
    if (isTemplate) {
      loadTemplates({})
    } else {
      const isInitialLoad = isInitialMountRef.current

      if (isInitialLoad) {
        isInitialMountRef.current = false
      }

      loadAssistantsList({ page: 0 }, isInitialLoad)
    }
  }, [JSON.stringify(filters), isTemplate])

  const isLoading = isTemplate ? loadingTemplates : loading
  const paginationOffset = useSidebarOffsetClass()

  return (
    <div className="flex h-full">
      <Sidebar title="Assistants" description="Browse and chat with available AI assistants">
        <AssistantsNavigation activeTabID={currentTabId} />
        {activeScope !== ASSISTANT_INDEX_SCOPES.NONE && (
          <AssistantFilters
            key={activeScope}
            activeScope={activeScope}
            onFilterChange={handleFilterChange}
            filters={filters}
          />
        )}
      </Sidebar>
      <PageLayout rightContent={headerActions}>
        <AssistantsList
          loading={isLoading}
          isTemplate={isTemplate}
          reloadAssistants={reloadAssistants}
          exportAssistant={handleExportAssistant}
        />
        {!!assistants.length && !isTemplate && (
          <Pagination
            className={cn(
              'z-[10] mt-6 fixed bottom-0 right-0 bg-surface-base-primary duration-150 px-6 pt-[20px] pb-[14px]',
              paginationOffset
            )}
            currentPage={currentPage}
            totalPages={totalPages}
            setPage={handlePageChange}
            perPage={perPage}
          />
        )}
      </PageLayout>

      <ExportAssistantPopup
        visible={showExportPopup}
        onHide={handleHideExportPopup}
        assistant={selectedAssistant}
      />
    </div>
  )
}

export default AssistantsListPage
