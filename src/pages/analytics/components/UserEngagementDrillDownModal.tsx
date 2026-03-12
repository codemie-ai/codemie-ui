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
import { ButtonType } from '@/constants'
import {
  analyticsStore,
  closeUserEngagementDrillDown,
  updateUserEngagementFilters,
  updateUserEngagementPage,
} from '@/store/analytics'
import { ColumnType } from '@/types/analytics'
import { DefinitionTypes } from '@/types/table'
import type { ColumnDefinition } from '@/types/table'
import { formatMetricValue } from '@/utils/analyticsFormatters'

/**
 * User Engagement Drill-Down Modal
 *
 * Displays individual users for a specific project with filtering,
 * sorting, and pagination capabilities.
 */
const UserEngagementDrillDownModal: FC = () => {
  const snap = useSnapshot(analyticsStore)
  const drillDownState = snap.userEngagementDrillDown
  const loading = snap.loading['user-engagement-drill-down']
  const error = snap.error['user-engagement-drill-down']

  if (!drillDownState.isOpen) {
    return null
  }

  // Filter options
  const userTypeOptions = [
    { label: 'All Types', value: undefined },
    { label: 'Power User', value: 'power_user' },
    { label: 'Engaged', value: 'engaged' },
    { label: 'Occasional', value: 'occasional' },
    { label: 'New', value: 'new' },
    { label: 'Inactive', value: 'inactive' },
  ]

  const activityLevelOptions = [
    { label: 'All Activity', value: undefined },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Inactive', value: 'inactive' },
  ]

  const multiAssistantOptions = [
    { label: 'All Users', value: undefined },
    { label: 'Multi-Assistant Only', value: true },
    { label: 'Single Assistant Only', value: false },
  ]

  // Handle filter changes
  const handleUserTypeChange = (value: string | undefined) => {
    updateUserEngagementFilters({ user_type: value })
  }

  const handleActivityLevelChange = (value: string | undefined) => {
    updateUserEngagementFilters({ activity_level: value })
  }

  const handleMultiAssistantChange = (value: boolean | undefined) => {
    updateUserEngagementFilters({ multi_assistant_only: value })
  }

  // Handle clear filters
  const handleClearFilters = () => {
    updateUserEngagementFilters({
      user_type: undefined,
      activity_level: undefined,
      multi_assistant_only: undefined,
    })
  }

  const hasActiveFilters =
    drillDownState.filters.user_type ||
    drillDownState.filters.activity_level ||
    drillDownState.filters.multi_assistant_only !== undefined

  // Map analytics column type to table definition type
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
    drillDownState.data?.data.columns.map((col) => ({
      key: col.id,
      label: col.label,
      type: mapColumnType(col.type),
    })) ?? []

  // Format table items with proper value formatting
  const items =
    drillDownState.data?.data.rows.map((row) => {
      const formattedRow: Record<string, string | number | boolean> = {}

      drillDownState.data!.data.columns.forEach((col) => {
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

      return formattedRow
    }) ?? []

  const totalPages = drillDownState.data
    ? Math.ceil(
        drillDownState.data.pagination.total_count / drillDownState.data.pagination.per_page
      )
    : 0

  const handlePaginationChange = (newPage: number) => {
    updateUserEngagementPage(newPage)
  }

  const perPageOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ]

  return (
    <Popup
      visible={true}
      onHide={closeUserEngagementDrillDown}
      header={`User Engagement: ${drillDownState.project}`}
      className="w-[90vw] max-w-[1400px]"
      bodyClassName="pb-6"
      hideFooter
    >
      <div className="flex flex-col gap-4">
        {/* Filter Controls */}
        <div className="flex gap-3 items-end flex-wrap p-3 bg-table-header-bg rounded-lg border border-new-stroke">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">User Type</label>
            <Dropdown
              value={drillDownState.filters.user_type}
              options={userTypeOptions}
              onChange={(e) => handleUserTypeChange(e.value)}
              placeholder="Filter by type"
              className="w-full"
              optionLabel="label"
              optionValue="value"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Activity Level</label>
            <Dropdown
              value={drillDownState.filters.activity_level}
              options={activityLevelOptions}
              onChange={(e) => handleActivityLevelChange(e.value)}
              placeholder="Filter by activity"
              className="w-full"
              optionLabel="label"
              optionValue="value"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Assistant Usage</label>
            <Dropdown
              value={drillDownState.filters.multi_assistant_only}
              options={multiAssistantOptions}
              onChange={(e) => handleMultiAssistantChange(e.value)}
              placeholder="Filter by assistants"
              className="w-full"
              optionLabel="label"
              optionValue="value"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-end pb-0.5">
              <CustomButton variant={ButtonType.BASE} onClick={handleClearFilters}>
                Clear Filters
              </CustomButton>
            </div>
          )}
        </div>

        {/* Table Display */}
        {(() => {
          if (loading) {
            return (
              <div className="flex justify-center items-center py-8">
                <Spinner />
                <span className="ml-3 text-lg">Loading users...</span>
              </div>
            )
          }

          if (error) {
            return (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                <i className="pi pi-exclamation-triangle mr-2" />
                {error.message}
              </div>
            )
          }

          if (drillDownState.data && items.length > 0) {
            return (
              <div className="flex flex-col w-full">
                <div className="overflow-x-auto w-full">
                  <Table items={items} columnDefinitions={columnDefinitions} embedded noWrap />
                </div>
                {drillDownState.data.pagination.total_count >
                  parseInt(perPageOptions[0].value, 10) && (
                  <Pagination
                    currentPage={drillDownState.page}
                    totalPages={totalPages}
                    setPage={handlePaginationChange}
                    perPage={drillDownState.per_page}
                    perPageOptions={perPageOptions}
                    responsive
                    className="mt-4 px-4 py-3 bg-transparent !bg-none"
                  />
                )}
              </div>
            )
          }

          return (
            <div className="text-center py-8 text-gray-500">
              No users found with current filters
            </div>
          )
        })()}
      </div>
    </Popup>
  )
}

export default UserEngagementDrillDownModal
