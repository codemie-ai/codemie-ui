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

import { FC, useCallback, useEffect, useState, ReactElement, ReactNode } from 'react'
import { useSnapshot } from 'valtio'

import Pagination from '@/components/Pagination'
import Table from '@/components/Table'
import { analyticsStore } from '@/store/analytics'
import type { TabularResponse, PaginatedQueryParams } from '@/types/analytics'
import { TabularMetricType, ColumnType, MetricFormat } from '@/types/analytics'
import type { ColumnDefinition } from '@/types/table'
import { DefinitionTypes } from '@/types/table'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { cn } from '@/utils/utils'

import AnalyticsWidget from '../AnalyticsWidget'

interface TableWidgetProps {
  metricType: TabularMetricType
  title: string
  description?: string
  filters?: PaginatedQueryParams
  refreshTrigger?: number
  onRowClick?: (row: Record<string, unknown>, rowIndex: number) => void
  expandable?: boolean
  waitForAdoptionConfig?: boolean
  initialData?: TabularResponse | null
  hideWrapper?: boolean
  hidePagination?: boolean
  hiddenColumns?: string[]
  tableStyles?: {
    className: string
    minWidth?: string
    cellPadding?: string
    columnWidths?: Record<string, string>
  }
  customRenderColumns?: Record<string, (item: Record<string, any>) => ReactElement>
  actions?: ReactNode
}

interface ProjectButtonCellProps {
  item: Record<string, any>
  onRowClick: (row: Record<string, unknown>, rowIndex: number) => void
}

const getPrimitiveString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : fallback

const ProjectButtonCell: FC<ProjectButtonCellProps> = ({ item, onRowClick }) => (
  <button
    type="button"
    className="font-bold hover:underline cursor-pointer"
    onClick={() => onRowClick(item, 0)}
  >
    {getPrimitiveString(item.project)}
  </button>
)

const buildProjectRenderColumns = (
  onRowClick: (row: Record<string, unknown>, rowIndex: number) => void
): Record<string, (item: Record<string, any>) => ReactElement> => ({
  project: (item: Record<string, any>) => <ProjectButtonCell item={item} onRowClick={onRowClick} />,
})

const TableWidget: FC<TableWidgetProps> = ({
  metricType,
  title,
  description,
  filters,
  refreshTrigger = 0,
  onRowClick,
  expandable,
  waitForAdoptionConfig = true,
  initialData,
  hideWrapper = false,
  hidePagination = false,
  hiddenColumns = [],
  tableStyles,
  customRenderColumns: customRenderColumnsProp,
  actions,
}) => {
  const { loading, loaded, error, aiAdoptionConfig } = useSnapshot(analyticsStore)
  const [data, setData] = useState<TabularResponse | null>(initialData || null)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(10)

  const fetchData = useCallback(async () => {
    if (initialData) return

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
  }, [
    metricType,
    page,
    perPage,
    filters,
    loaded['ai-adoption-config'],
    waitForAdoptionConfig,
    initialData,
  ])

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
    data?.data.columns
      .filter((col) => !hiddenColumns.includes(col.id))
      .map((col) => {
        let type: DefinitionTypes
        if (
          col.format === MetricFormat.PERCENTAGE &&
          col.id === 'total' &&
          metricType === TabularMetricType.KEY_SPENDING
        ) {
          type = DefinitionTypes.Custom
        } else if (customRenderColumnsProp?.[col.id]) {
          type = DefinitionTypes.Custom
        } else if (onRowClick && col.id === 'project') {
          type = DefinitionTypes.Custom
        } else {
          type = mapColumnType(col.type)
        }

        let maxLength: number | undefined
        if (col.id === 'project') {
          maxLength = tableStyles?.columnWidths ? undefined : 17
        }

        return {
          key: col.id,
          label: col.label,
          type,
          maxLength,
          headClassNames: 'whitespace-normal',
        }
      }) ?? []

  const formatCellValue = (col: any, rawValue: any): unknown => {
    if (rawValue === null || rawValue === undefined) return '-'

    if (
      col.format === MetricFormat.PERCENTAGE &&
      col.id === 'total' &&
      metricType === TabularMetricType.KEY_SPENDING
    ) {
      return rawValue as number
    }

    return formatMetricValue(rawValue as string | number | boolean, col.format)
  }

  // Format table items with proper value formatting
  const items =
    data?.data.rows.map((row) => {
      const formattedRow: Record<string, unknown> = { ...row }

      data.data.columns
        .filter((col) => !hiddenColumns.includes(col.id))
        .forEach((col) => {
          if (customRenderColumnsProp?.[col.id]) {
            formattedRow[col.id] = row[col.id]
            return
          }

          formattedRow[col.id] = formatCellValue(col, row[col.id])
        })

      return formattedRow
    }) ?? []

  const customRenderColumns =
    customRenderColumnsProp || (onRowClick ? buildProjectRenderColumns(onRowClick) : undefined)

  const totalPages = data?.pagination
    ? Math.ceil(data.pagination.total_count / data.pagination.per_page)
    : 0

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

    const tableStyleTag = tableStyles ? (
      <style>{`
        .${tableStyles.className} th,
        .${tableStyles.className} td {
          ${
            tableStyles.cellPadding
              ? `padding-left: ${tableStyles.cellPadding} !important; padding-right: ${tableStyles.cellPadding} !important;`
              : ''
          }
        }
        .${tableStyles.className} th:first-child,
        .${tableStyles.className} td:first-child {
          padding-left: 1rem !important;
        }
        .${tableStyles.className} th:last-child,
        .${tableStyles.className} td:last-child {
          padding-right: 1rem !important;
        }
        .${tableStyles.className} table {
          ${tableStyles.minWidth ? `min-width: ${tableStyles.minWidth};` : ''}
          table-layout: ${tableStyles.columnWidths ? 'fixed' : 'auto'};
          width: 100%;
        }
        ${
          tableStyles.columnWidths && data
            ? data.data.columns
                .map((col, index) => {
                  const width = tableStyles.columnWidths![col.id]
                  if (!width) return ''
                  return `
          .${tableStyles.className} th:nth-child(${index + 1}),
          .${tableStyles.className} td:nth-child(${index + 1}) {
            width: ${width};
            min-width: ${width};
            max-width: ${width};
            box-sizing: border-box;
            white-space: normal;
            word-wrap: break-word;
          }
        `
                })
                .join('')
            : ''
        }
      `}</style>
    ) : null

    return (
      <div className="flex flex-col w-full">
        {tableStyleTag}
        <div className={cn('overflow-x-auto w-full', tableStyles?.className)}>
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
        {!hidePagination && data.pagination.total_count > parseInt(perPageOptions[0].value, 10) && (
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

  if (hideWrapper) {
    return renderTableContent()
  }

  return (
    <AnalyticsWidget
      title={title}
      description={description}
      loading={loading[metricType]}
      error={error[metricType]}
      expandable={expandable}
      actions={actions}
    >
      {renderTableContent()}
    </AnalyticsWidget>
  )
}

export default TableWidget
