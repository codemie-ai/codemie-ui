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

import { FC, useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import Pagination from '@/components/Pagination'
import Table from '@/components/Table'
import { analyticsStore } from '@/store/analytics'
import type { TabularMetricType, TabularResponse, AnalyticsQueryParams } from '@/types/analytics'
import { ColumnType } from '@/types/analytics'
import type { ColumnDefinition } from '@/types/table'
import { DefinitionTypes } from '@/types/table'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { cn } from '@/utils/utils'

import AnalyticsWidget from '../AnalyticsWidget'

interface TableWidgetProps {
  metricType: TabularMetricType
  title: string
  description?: string
  filters?: AnalyticsQueryParams
  refreshTrigger?: number
  onRowClick?: (row: Record<string, unknown>, rowIndex: number) => void
  expandable?: boolean
  waitForAdoptionConfig?: boolean
}

const TableWidget: FC<TableWidgetProps> = ({
  metricType,
  title,
  description,
  filters,
  refreshTrigger = 0,
  onRowClick,
  expandable,
  waitForAdoptionConfig = true,
}) => {
  const { loading, loaded, error, aiAdoptionConfig } = useSnapshot(analyticsStore)
  const [data, setData] = useState<TabularResponse | null>(null)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)

  const fetchData = useCallback(async () => {
    if (!loaded['ai-adoption-config'] && waitForAdoptionConfig) return

    const result = await analyticsStore.fetchTabularData(metricType, {
      ...filters,
      page,
      per_page: perPage,
      config: aiAdoptionConfig?.data as any,
    })
    if (result) {
      setData(result)
    }
  }, [metricType, page, perPage, filters, loaded['ai-adoption-config'], waitForAdoptionConfig])

  useEffect(() => {
    fetchData().catch(console.error)
  }, [fetchData, refreshTrigger])

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
    data?.data.columns.map((col) => ({
      key: col.id,
      label: col.label,
      // Use 'custom' type for project column when onRowClick is enabled
      type: onRowClick && col.id === 'project' ? DefinitionTypes.Custom : mapColumnType(col.type),
    })) ?? []

  // Format table items with proper value formatting
  const items =
    data?.data.rows.map((row) => {
      const formattedRow: Record<string, string | number | boolean> = {}

      data.data.columns.forEach((col) => {
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

  // Custom render for project column when row click is enabled
  const customRenderColumns = onRowClick
    ? {
        project: (item: Record<string, string | number | boolean>) => (
          <span
            className="font-bold hover:underline cursor-pointer"
            onClick={() => onRowClick(item, 0)}
          >
            {item.project}
          </span>
        ),
      }
    : undefined

  const totalPages = data ? Math.ceil(data.pagination.total_count / data.pagination.per_page) : 0

  const handlePaginationChange = (newPage: number, newPerPage?: number) => {
    setPage(newPage)
    if (newPerPage !== undefined) {
      setPerPage(newPerPage)
    }
  }

  const perPageOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ]

  const renderTotalsFooter = () => {
    if (!data?.data.totals || Object.keys(data.data.totals).length === 0) {
      return null
    }

    return (
      <tr className="font-semibold text-text-primary bg-surface-base-tertiary">
        {columnDefinitions.map((col, index) => {
          const totalValue = data.data.totals?.[col.key]
          const hasTotal = totalValue !== null && totalValue !== undefined

          // Get the format from the original column definition
          const originalCol = data.data.columns.find((c) => c.id === col.key)

          // First column shows "Total" label
          let displayValue = ''
          if (index === 0) {
            displayValue = 'Total'
          } else if (hasTotal) {
            displayValue = formatMetricValue(totalValue as string | number, originalCol?.format)
          }

          return (
            <td
              key={col.key}
              className={cn('px-4 py-2.5 text-left border-border-structural border-t border-b', {
                'rounded-bl-lg border-l': index === 0,
                'rounded-br-lg border-r': index === columnDefinitions.length - 1,
              })}
            >
              {displayValue}
            </td>
          )
        })}
      </tr>
    )
  }

  const renderTableContent = () => {
    if (!data) return null

    return (
      <div className="flex flex-col w-full">
        <div className="overflow-x-auto w-full">
          <Table
            items={items}
            columnDefinitions={columnDefinitions}
            embedded
            noWrap
            footer={renderTotalsFooter()}
            customRenderColumns={customRenderColumns}
            tableClassName="mt-0"
          />
        </div>
        {data.pagination.total_count > parseInt(perPageOptions[0].value, 10) && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            setPage={handlePaginationChange}
            perPage={perPage}
            perPageOptions={perPageOptions}
            responsive
            className="mt-4 px-4 py-3 bg-transparent !bg-none"
          />
        )}
      </div>
    )
  }

  return (
    <AnalyticsWidget
      title={title}
      description={description}
      loading={loading[metricType]}
      error={error[metricType]}
      expandable={expandable}
    >
      {renderTableContent()}
    </AnalyticsWidget>
  )
}

export default TableWidget
