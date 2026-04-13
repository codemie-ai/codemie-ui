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

import { FC } from 'react'

import SpendingProgressBar from '@/pages/analytics/components/widgets/SpendingProgressBar'
import { MetricFormat } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { cn } from '@/utils/utils'

export const SPENDING_DANGER_THRESHOLD = 75
export const SPENDING_WARNING_THRESHOLD = 50

interface SpendingColumn {
  id: string
  label: string
  format?: string | null
}

interface SpendingTableProps {
  columns: SpendingColumn[]
  rows: Record<string, unknown>[]
  hiddenColumns?: string[]
}

const SpendingTable: FC<SpendingTableProps> = ({ columns, rows, hiddenColumns = [] }) => {
  const visibleColumns = columns.filter((col) => !hiddenColumns.includes(col.id))

  const renderCell = (col: SpendingColumn, value: unknown) => {
    if (value === null || value === undefined) return <span>-</span>

    if (col.format === MetricFormat.PERCENTAGE && col.id === 'total') {
      const percentage = typeof value === 'number' ? value : 0
      return (
        <SpendingProgressBar
          percentage={percentage}
          dangerThreshold={SPENDING_DANGER_THRESHOLD}
          warningThreshold={SPENDING_WARNING_THRESHOLD}
        />
      )
    }

    return (
      <span>
        {formatMetricValue(
          value as string | number | boolean,
          col.format ? (col.format as MetricFormat) : undefined
        )}
      </span>
    )
  }

  if (rows.length === 0) return null

  const lastColIndex = visibleColumns.length - 1

  return (
    <div className="overflow-x-auto">
      <table className="mt-0 border-separate border-spacing-0 w-full text-[12px] leading-tight">
        <thead className="bg-surface-base-tertiary text-text-primary">
          <tr className="font-semibold">
            {visibleColumns.map((col, colIndex) => (
              <th
                key={col.id}
                className={cn(
                  'text-left px-4 py-2.5 border-border-structural border-t border-b text-nowrap text-text-quaternary',
                  {
                    'rounded-tl-lg border-l': colIndex === 0,
                    'rounded-tr-lg border-r': colIndex === lastColIndex,
                  }
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const isLastRow = rowIndex === rows.length - 1
            return (
              <tr key={rowIndex}>
                {visibleColumns.map((col, colIndex) => (
                  <td
                    key={col.id}
                    className={cn(
                      'text-text-primary px-4 py-2 text-left bg-surface-base-secondary border-b border-border-structural',
                      {
                        'border-l': colIndex === 0,
                        'border-r': colIndex === lastColIndex,
                        'rounded-bl-lg': isLastRow && colIndex === 0,
                        'rounded-br-lg': isLastRow && colIndex === lastColIndex,
                        'min-w-[186px]':
                          col.format === MetricFormat.PERCENTAGE && col.id === 'total',
                      }
                    )}
                  >
                    {renderCell(col, row[col.id] as string | number | null)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default SpendingTable
