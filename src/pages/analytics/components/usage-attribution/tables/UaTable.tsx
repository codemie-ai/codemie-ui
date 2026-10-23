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

import { ReactNode, useMemo, useState } from 'react'

import Pagination from '@/components/Pagination'
import Table from '@/components/Table'
import { ColumnDefinition, DefinitionTypes, SortState } from '@/types/table'
import { cn } from '@/utils/utils'

import { UA_TABLE_PAGE_OPTIONS } from '../constants'

export interface UaColumn<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  /** Value used for local sorting (defaults to row[key]). */
  sortValue?: (row: T) => number | string | null
  sortable?: boolean
  numeric?: boolean
  total?: ReactNode
  tooltip?: string
}

interface UaTableProps<T> {
  columns: UaColumn<T>[]
  rows: T[]
  idKey: keyof T
  sort?: SortState
  onSort?: (key: string) => void
  /** Server pagination; omit to show every row. */
  pagination?: {
    page: number
    perPage: number
    totalCount: number
    onChange: (page: number, perPage?: number) => void
  }
  showTotals?: boolean
  /** Opens a row's popup from a click anywhere in it; the name button stays the keyboard way in. */
  onRowClick?: (row: T) => void
  ariaLabel: string
  className?: string
  /** Rows that open in place (a chevron column comes first); the expanded content spans the whole row. */
  expand?: {
    ids: ReadonlyArray<string>
    onToggle: (id: string) => void
    render: (row: T) => ReactNode
  }
}

const cellClass = (numeric?: boolean) =>
  cn(numeric && 'text-right [font-variant-numeric:tabular-nums]')

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

/** The analytics table (Table + Pagination, as TableWidget renders them) with typed columns and a totals row. */
export const UaTable = <T,>({
  columns,
  rows,
  idKey,
  sort,
  onSort,
  pagination,
  showTotals,
  onRowClick,
  ariaLabel,
  className,
  expand,
}: UaTableProps<T>) => {
  const definitions: ColumnDefinition[] = columns.map((c) => ({
    key: c.key,
    label: c.label,
    type: DefinitionTypes.Custom,
    sortable: c.sortable !== false && !!onSort,
    headClassNames: cn('whitespace-normal', c.numeric && 'text-right'),
    tooltip: c.tooltip,
  }))
  const renderers = Object.fromEntries(
    columns.map((c) => [
      c.key,
      (item: T) => (
        <div className={cellClass(c.numeric)}>
          {c.render ? c.render(item) : cellText((item as Record<string, unknown>)[c.key])}
        </div>
      ),
    ])
  )
  const footer = showTotals ? (
    <tr className="font-semibold text-text-primary bg-surface-base-tertiary">
      {columns.map((c, i) => (
        <td
          key={c.key}
          className={cn(
            'px-4 py-2.5 border-border-structural border-t border-b',
            cellClass(c.numeric),
            {
              'rounded-bl-lg border-l': i === 0,
              'rounded-br-lg border-r': i === columns.length - 1,
            }
          )}
        >
          {i === 0 ? 'Total' : c.total ?? ''}
        </td>
      ))}
    </tr>
  ) : undefined
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.totalCount / pagination.perPage))
    : 0
  return (
    <div className={cn('flex flex-col w-full', className)}>
      <div className="overflow-x-auto w-full">
        <Table
          items={rows}
          idPath={idKey}
          columnDefinitions={definitions}
          customRenderColumns={renderers}
          embedded
          noWrap={false}
          footer={footer}
          tableClassName="mt-0"
          sort={sort}
          onSort={onSort}
          onRowClick={onRowClick}
          ariaLabel={ariaLabel}
          expandedRowIds={expand?.ids}
          onToggleExpand={expand?.onToggle}
          renderExpandedRow={expand?.render}
        />
      </div>
      {pagination && pagination.totalCount > Number(UA_TABLE_PAGE_OPTIONS[0].value) && (
        <Pagination
          currentPage={pagination.page}
          totalPages={totalPages}
          setPage={pagination.onChange}
          perPage={pagination.perPage}
          perPageOptions={UA_TABLE_PAGE_OPTIONS}
          responsive
          className="mt-4 px-4 py-3 bg-transparent !bg-none"
        />
      )}
    </div>
  )
}

/** A table sorted in the browser: popups and small lists. */
export const LocalTable = <T,>(
  props: Omit<UaTableProps<T>, 'sort' | 'onSort' | 'pagination'> & {
    defaultSort?: SortState
    limit?: number
  }
) => {
  const { columns, rows, defaultSort, limit } = props
  const [sort, setSort] = useState<SortState>(defaultSort ?? {})
  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort.sortKey)
    if (!column) return rows.slice(0, limit ?? rows.length)
    const value = (row: T) =>
      column.sortValue
        ? column.sortValue(row)
        : ((row as Record<string, unknown>)[column.key] as number | string | null)
    const dir = sort.sortOrder === 'asc' ? 1 : -1
    return [...rows]
      .sort((a, b) => {
        const va = value(a)
        const vb = value(b)
        if (va === null || va === undefined) return 1
        if (vb === null || vb === undefined) return -1
        if (typeof va === 'string' || typeof vb === 'string')
          return String(va).localeCompare(String(vb)) * dir
        return (Number(va) - Number(vb)) * dir
      })
      .slice(0, limit ?? rows.length)
  }, [rows, columns, sort, limit])
  const onSort = (key: string) =>
    setSort((s) =>
      s.sortKey === key
        ? { sortKey: key, sortOrder: s.sortOrder === 'desc' ? 'asc' : 'desc' }
        : { sortKey: key, sortOrder: 'desc' }
    )
  return <UaTable {...props} rows={sorted} sort={sort} onSort={onSort} />
}

/** Cycles a column's sort: a new column sorts descending, the same column flips. */
export const nextSort = (current: SortState, key: string): SortState =>
  current.sortKey === key
    ? { sortKey: key, sortOrder: current.sortOrder === 'desc' ? 'asc' : 'desc' }
    : { sortKey: key, sortOrder: 'desc' }
