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

import { Dropdown } from 'primereact/dropdown'
import { FC } from 'react'
import { useSnapshot } from 'valtio'

import CustomButton from '@/components/Button'
import Pagination from '@/components/Pagination'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import Tabs, { Tab } from '@/components/Tabs/Tabs'
import { ButtonType } from '@/constants'
import {
  analyticsStore,
  closeAssetReusabilityDrillDown,
  setAssetReusabilityTab,
  updateAssistantsFilters,
  updateWorkflowsFilters,
  updateDatasourcesFilters,
  updateAssistantsPage,
  updateWorkflowsPage,
  updateDatasourcesPage,
} from '@/store/analytics'
import { ColumnType } from '@/types/analytics'
import { DefinitionTypes } from '@/types/table'
import type { ColumnDefinition } from '@/types/table'
import { formatMetricValue } from '@/utils/analyticsFormatters'

type TabId = 'assistants' | 'workflows' | 'datasources'

/**
 * Unified Asset Reusability Drill-Down Modal with Tabs
 *
 * Displays detailed asset metrics for a specific project with three tabs:
 * - Assistants: Individual assistant usage and adoption
 * - Workflows: Individual workflow execution and reuse
 * - Datasources: Individual datasource usage and sharing
 */
const AssetReusabilityDrillDownModal: FC = () => {
  const snap = useSnapshot(analyticsStore)
  const drillDownState = snap.assetReusabilityDrillDown

  if (!drillDownState.isOpen) {
    return null
  }

  const { activeTab } = drillDownState
  const currentTabState = drillDownState[activeTab]

  // Get loading/error from global state based on active tab
  let loadingKey: string
  if (activeTab === 'assistants') {
    loadingKey = 'asset-reusability-assistants'
  } else if (activeTab === 'workflows') {
    loadingKey = 'asset-reusability-workflows'
  } else {
    loadingKey = 'asset-reusability-datasources'
  }
  const loading = snap.loading[loadingKey]
  const error = snap.error[loadingKey]

  // Handle tab change
  const handleTabChange = (tabId: TabId) => {
    setAssetReusabilityTab(tabId)
  }

  // Map column type
  const mapColumnType = (type: ColumnType): DefinitionTypes => {
    switch (type) {
      case ColumnType.BOOLEAN:
        return DefinitionTypes.Boolean
      case ColumnType.STRING:
      case ColumnType.INTEGER:
      case ColumnType.NUMBER:
      default:
        return DefinitionTypes.String
    }
  }

  // Convert analytics column definitions to table column definitions
  const columnDefinitions: ColumnDefinition[] =
    currentTabState.data?.data.columns.map((col) => ({
      key: col.id,
      label: col.label,
      type:
        (activeTab === 'assistants' && col.id === 'assistant_name') ||
        (activeTab === 'workflows' && col.id === 'workflow_name') ||
        (activeTab === 'datasources' && col.id === 'datasource_name')
          ? DefinitionTypes.Custom
          : mapColumnType(col.type),
    })) ?? []

  // Format table items
  const items =
    currentTabState.data?.data.rows.map((row) => {
      const formattedRow: Record<string, string | number | boolean> = {}

      currentTabState.data!.data.columns.forEach((col) => {
        const rawValue = row[col.id]
        if (rawValue !== null && rawValue !== undefined) {
          formattedRow[col.id] = formatMetricValue(
            rawValue as string | number | boolean,
            col.format
          )
        } else {
          formattedRow[col.id] = '-'
        }
      })

      // Include IDs for link functionality (not displayed as columns)
      if (activeTab === 'assistants' && row.assistant_id) {
        formattedRow.assistant_id = row.assistant_id as string
      } else if (activeTab === 'workflows' && row.workflow_id) {
        formattedRow.workflow_id = row.workflow_id as string
      } else if (activeTab === 'datasources' && row.datasource_id) {
        formattedRow.datasource_id = row.datasource_id as string
      }

      return formattedRow
    }) ?? []

  // Custom render for name columns (links to detail pages)
  const customRenderColumns: Record<string, (item: Record<string, unknown>) => React.ReactNode> = {}

  if (activeTab === 'assistants') {
    customRenderColumns.assistant_name = (item: Record<string, unknown>) => {
      const assistantId = item.assistant_id as string
      const assistantName = item.assistant_name as string
      return (
        <a
          href={`/#/assistants/${assistantId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-link hover:text-text-link-hover hover:underline"
        >
          {assistantName}
        </a>
      )
    }
  } else if (activeTab === 'workflows') {
    customRenderColumns.workflow_name = (item: Record<string, unknown>) => {
      const workflowId = item.workflow_id as string
      const workflowName = item.workflow_name as string
      return (
        <a
          href={`/#/workflows/${workflowId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-link hover:text-text-link-hover hover:underline"
        >
          {workflowName}
        </a>
      )
    }
  } else if (activeTab === 'datasources') {
    customRenderColumns.datasource_name = (item: Record<string, unknown>) => {
      const datasourceId = item.datasource_id as string
      const datasourceName = item.datasource_name as string
      return (
        <a
          href={`/#/data-sources/${datasourceId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-link hover:text-text-link-hover hover:underline"
        >
          {datasourceName}
        </a>
      )
    }
  }

  const totalPages = currentTabState.data
    ? Math.ceil(
        currentTabState.data.pagination.total_count / currentTabState.data.pagination.per_page
      )
    : 0

  const perPageOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ]

  const handlePaginationChange = (newPage: number) => {
    switch (activeTab) {
      case 'assistants':
        updateAssistantsPage(newPage)
        break
      case 'workflows':
        updateWorkflowsPage(newPage)
        break
      case 'datasources':
        updateDatasourcesPage(newPage)
        break
      default:
        break
    }
  }

  // Render Assistants filters
  const renderAssistantsFilters = () => {
    const state = drillDownState.assistants

    const statusOptions = [
      { label: 'All Status', value: undefined },
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ]

    const adoptionOptions = [
      { label: 'All Adoption', value: undefined },
      { label: 'Team-Adopted', value: 'team_adopted' },
      { label: 'Single-User', value: 'single_user' },
    ]

    const hasActiveFilters = state.filters.status || state.filters.adoption

    return (
      <div className="flex gap-3 items-end flex-wrap p-3 bg-table-header-bg rounded-lg border border-new-stroke">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium mb-1">Status</label>
          <Dropdown
            value={state.filters.status}
            options={statusOptions}
            onChange={(e) => updateAssistantsFilters({ status: e.value })}
            placeholder="Filter by status"
            className="w-full"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium mb-1">Adoption</label>
          <Dropdown
            value={state.filters.adoption}
            options={adoptionOptions}
            onChange={(e) => updateAssistantsFilters({ adoption: e.value })}
            placeholder="Filter by adoption"
            className="w-full"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-end pb-0.5">
            <CustomButton
              variant={ButtonType.BASE}
              onClick={() =>
                updateAssistantsFilters({
                  status: undefined,
                  adoption: undefined,
                })
              }
            >
              Clear Filters
            </CustomButton>
          </div>
        )}
      </div>
    )
  }

  // Render Workflows filters
  const renderWorkflowsFilters = () => {
    const state = drillDownState.workflows

    const statusOptions = [
      { label: 'All Status', value: undefined },
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ]

    const reuseOptions = [
      { label: 'All Reuse', value: undefined },
      { label: 'Multi-User', value: 'multi_user' },
      { label: 'Single-User', value: 'single_user' },
    ]

    const hasActiveFilters = state.filters.status || state.filters.reuse

    return (
      <div className="flex gap-3 items-end flex-wrap p-3 bg-table-header-bg rounded-lg border border-new-stroke">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-1">Status</label>
          <Dropdown
            value={state.filters.status}
            options={statusOptions}
            onChange={(e) => updateWorkflowsFilters({ status: e.value })}
            placeholder="Filter by status"
            className="w-full"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-1">Reuse</label>
          <Dropdown
            value={state.filters.reuse}
            options={reuseOptions}
            onChange={(e) => updateWorkflowsFilters({ reuse: e.value })}
            placeholder="Filter by reuse"
            className="w-full"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-end pb-0.5">
            <CustomButton
              variant={ButtonType.BASE}
              onClick={() =>
                updateWorkflowsFilters({
                  status: undefined,
                  reuse: undefined,
                })
              }
            >
              Clear Filters
            </CustomButton>
          </div>
        )}
      </div>
    )
  }

  // Render Datasources filters
  const renderDatasourcesFilters = () => {
    const state = drillDownState.datasources

    const statusOptions = [
      { label: 'All Status', value: undefined },
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ]

    const sharedOptions = [
      { label: 'All Sharing', value: undefined },
      { label: 'Shared', value: 'shared' },
      { label: 'Single-Assistant', value: 'single' },
    ]

    const hasActiveFilters = state.filters.status || state.filters.shared || state.filters.type

    return (
      <div className="flex gap-3 items-end flex-wrap p-3 bg-table-header-bg rounded-lg border border-new-stroke">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-1">Status</label>
          <Dropdown
            value={state.filters.status}
            options={statusOptions}
            onChange={(e) => updateDatasourcesFilters({ status: e.value })}
            placeholder="Filter by status"
            className="w-full"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-1">Sharing</label>
          <Dropdown
            value={state.filters.shared}
            options={sharedOptions}
            onChange={(e) => updateDatasourcesFilters({ shared: e.value })}
            placeholder="Filter by sharing"
            className="w-full"
            optionLabel="label"
            optionValue="value"
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-end pb-0.5">
            <CustomButton
              variant={ButtonType.BASE}
              onClick={() =>
                updateDatasourcesFilters({
                  status: undefined,
                  shared: undefined,
                  type: undefined,
                })
              }
            >
              Clear Filters
            </CustomButton>
          </div>
        )}
      </div>
    )
  }

  // Render tab content (filters + table + pagination)
  const renderTabContent = (tabLabel: string) => {
    // Determine which filters to render based on active tab
    const renderFilters = () => {
      switch (activeTab) {
        case 'assistants':
          return renderAssistantsFilters()
        case 'workflows':
          return renderWorkflowsFilters()
        case 'datasources':
          return renderDatasourcesFilters()
        default:
          return null
      }
    }

    // Render content based on state
    let content
    if (loading) {
      content = (
        <div className="flex justify-center items-center py-8">
          <Spinner />
          <span className="ml-3 text-lg">Loading {tabLabel.toLowerCase()}...</span>
        </div>
      )
    } else if (error) {
      content = (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <i className="pi pi-exclamation-triangle mr-2" />
          {error.message}
        </div>
      )
    } else if (currentTabState.data && items.length > 0) {
      content = (
        <div className="flex flex-col w-full">
          <div className="overflow-x-auto w-full">
            <Table
              items={items}
              columnDefinitions={columnDefinitions}
              customRenderColumns={customRenderColumns}
              embedded
              noWrap
            />
          </div>
          {currentTabState.data.pagination.total_count > parseInt(perPageOptions[0].value, 10) && (
            <Pagination
              currentPage={currentTabState.page}
              totalPages={totalPages}
              setPage={handlePaginationChange}
              perPage={currentTabState.per_page}
              perPageOptions={perPageOptions}
              responsive
              className="mt-4 px-4 py-3 bg-transparent !bg-none"
            />
          )}
        </div>
      )
    } else {
      content = (
        <div className="text-center py-8 text-gray-500">
          No {tabLabel.toLowerCase()} found with current filters
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        {renderFilters()}
        {content}
      </div>
    )
  }

  // Define tabs
  const tabs: Tab<TabId>[] = [
    {
      id: 'assistants',
      label: 'Assistants',
      element: renderTabContent('Assistants'),
    },
    {
      id: 'workflows',
      label: 'Workflows',
      element: renderTabContent('Workflows'),
    },
    {
      id: 'datasources',
      label: 'Datasources',
      element: renderTabContent('Datasources'),
    },
  ]

  return (
    <Popup
      visible={true}
      onHide={closeAssetReusabilityDrillDown}
      header={`Asset Reusability: ${drillDownState.project}`}
      className="w-[90vw] max-w-[1400px]"
      bodyClassName="pb-6"
      hideFooter
    >
      <Tabs<TabId>
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        isEmbedded={true}
        className="mt-4"
      />
    </Popup>
  )
}

export default AssetReusabilityDrillDownModal
