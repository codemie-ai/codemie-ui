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
import React, { useCallback, useEffect, useState, useRef } from 'react'
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
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import AssistantsList from '@/pages/assistants/components/AssistantList'
import AssistantFilters from '@/pages/assistants/components/AssistantList/AssistantFilters'
import AssistantsNavigation from '@/pages/assistants/components/AssistantsNavigation'
import ExportAssistantPopup from '@/pages/assistants/components/ExportAssistantPopup'
import { useAssistantFilters } from '@/pages/assistants/hooks/useAssistantFilters'
import { useAssistantsList } from '@/pages/assistants/hooks/useAssistantsList'
import { appInfoStore } from '@/store/appInfo'
import { assistantsStore } from '@/store/assistants'
import { Assistant } from '@/types/entity/assistant'
import { isConfigItemEnabled } from '@/utils/settings'
import toaster from '@/utils/toaster'

interface AssistantsListPageProps {
  tab: AssistantTab
}

const DEFAULT_TEMPLATES_PER_PAGE = 12

const AssistantsListPage = ({ tab }: AssistantsListPageProps) => {
  const router = useVueRouter()
  const route = useVueRoute()
  const scopeByTab = {
    [AssistantTab.ALL]: ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER,
    [AssistantTab.MARKETPLACE]: ASSISTANT_INDEX_SCOPES.MARKETPLACE,
    [AssistantTab.TEMPLATES]: ASSISTANT_INDEX_SCOPES.TEMPLATES,
    [AssistantTab.FAVORITES]: ASSISTANT_INDEX_SCOPES.FAVORITES,
  }
  const appInfo = useSnapshot(appInfoStore)
  const currentTabId = tab || AssistantTab.ALL
  const activeScope = scopeByTab[currentTabId] || ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER
  const isTemplate = currentTabId === AssistantTab.TEMPLATES
  const isFavorites = currentTabId === AssistantTab.FAVORITES
  const { filters, handleFilterChange } = useAssistantFilters({ scope: activeScope })

  const [showExportPopup, setShowExportPopup] = useState(false)
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)

  const { loadAssistantsList, currentPage, perPage, totalPages, assistants, loading } =
    useAssistantsList({
      scope: activeScope,
      filterValues: filters,
    })

  const { assistantTemplatesPagination: templatesPagination, assistantTemplatesLoading } =
    useSnapshot(assistantsStore)

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

  const getTemplatesPageFromURL = useCallback(() => {
    const pageFromQuery = route.query.page
    const perPageFromQuery = route.query.per_page

    let pageToLoad = 0
    if (pageFromQuery && typeof pageFromQuery === 'string') {
      const parsed = parseInt(pageFromQuery, 10)
      pageToLoad = !Number.isNaN(parsed) && parsed >= 1 ? parsed - 1 : 0
    }

    let perPageToLoad = DEFAULT_TEMPLATES_PER_PAGE
    if (perPageFromQuery && typeof perPageFromQuery === 'string') {
      const parsed = parseInt(perPageFromQuery, 10)
      perPageToLoad = !Number.isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_TEMPLATES_PER_PAGE
    }

    return { page: pageToLoad, perPage: perPageToLoad }
  }, [route.query.page, route.query.per_page])

  const updateTemplatesURL = useCallback(
    (backendPage: number, currentPerPage: number) => {
      const { page: _, per_page: __, ...restQuery } = router.currentRoute.value.query
      const newQuery = { ...restQuery } as Record<string, string>
      if (backendPage > 0) newQuery.page = (backendPage + 1).toString()
      if (currentPerPage !== DEFAULT_TEMPLATES_PER_PAGE)
        newQuery.per_page = currentPerPage.toString()
      router.replace({ query: newQuery })
    },
    [router]
  )

  const handleTemplatesPageChange = async (page: number, perPage?: number) => {
    const currentPerPage = perPage ?? templatesPagination.perPage
    try {
      await assistantsStore.loadAssistantTemplates(page, currentPerPage)
      updateTemplatesURL(page, currentPerPage)
    } catch {
      toaster.error('Failed to load assistant templates')
    }
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
      const { page, perPage } = getTemplatesPageFromURL()
      assistantsStore.loadAssistantTemplates(page, perPage).catch(() => {
        toaster.error('Failed to load assistant templates')
      })
    } else {
      const isInitialLoad = isInitialMountRef.current

      if (isInitialLoad) {
        isInitialMountRef.current = false
      }

      loadAssistantsList({ page: 0 }, isInitialLoad)
    }
  }, [JSON.stringify(filters), isTemplate])

  const getLoading = () => {
    if (isTemplate) return assistantTemplatesLoading
    return loading
  }
  const isLoading = getLoading()
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
          assistants={isFavorites ? assistants : undefined}
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
        {isTemplate && (
          <Pagination
            className={cn(
              'z-[10] mt-6 fixed bottom-0 right-0 bg-surface-base-primary duration-150 px-6 pt-[20px] pb-[14px]',
              paginationOffset
            )}
            currentPage={templatesPagination.page}
            totalPages={templatesPagination.totalPages}
            setPage={handleTemplatesPageChange}
            perPage={templatesPagination.perPage}
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
