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

import React, { memo } from 'react'

import Spinner from '@/components/Spinner'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { ColumnDefinition, SortState, TableItem } from '@/types/table'
import { cn } from '@/utils/utils'

import EmptyList from './EmptyList'
import SortIcon from './SortIcon'
import TableCell from './TableCell'
import { propsAreEqual } from './utils'
import Pagination, { PaginationProps } from '../Pagination/Pagination'

export interface TableProps<T = TableItem> {
  items: Array<T> | ReadonlyArray<T>
  columnDefinitions: Array<ColumnDefinition>
  customRenderColumns?: Record<string, (item: T, i: number) => React.ReactNode>
  idPath?: string
  sort?: SortState
  loading?: boolean
  onSort?: (key: string) => void
  innerPagination?: boolean
  onPaginationChange?: PaginationProps['setPage']
  perPageOptions?: PaginationProps['perPageOptions']
  pagination?: { page: number; totalPages: number; perPage: number }
  embedded?: boolean
  noWrap?: boolean
  footer?: React.ReactNode
  tableClassName?: string
}

const Table = <T,>({
  columnDefinitions,
  items,
  sort,
  idPath,
  innerPagination,
  loading = false,
  pagination,
  perPageOptions,
  customRenderColumns = {},
  onSort,
  onPaginationChange,
  embedded = false,
  noWrap = false,
  footer,
  tableClassName,
}: TableProps<T>): React.ReactNode => {
  const isSorted = (key) => !!sort && sort.sortKey === key

  const paginationProps = {
    perPageOptions,
    setPage: onPaginationChange!,
    currentPage: pagination?.page ?? 0,
    totalPages: pagination?.totalPages ?? 0,
    perPage: !innerPagination && pagination?.perPage ? pagination.perPage : undefined,
  }
  const paginationOffset = useSidebarOffsetClass()

  if (loading) {
    return <Spinner />
  }

  return (
    <div className="w-full relative flex flex-col">
      <div className={cn('w-full grow', { 'overflow-scroll min-h-[300px]': !embedded })}>
        <table
          className={cn(
            'mt-4 border-separate border-spacing-0 w-full text-[12px] leading-tight',
            {
              'mb-[80px]': !embedded,
            },
            tableClassName
          )}
        >
          <thead className="bg-surface-base-tertiary text-text-primary sticky top-0">
            <tr className="font-semibold border-y">
              {columnDefinitions.map((column, i) => (
                <th
                  key={column.key}
                  className={cn(
                    column.headClassNames,
                    'text-left px-4 py-2.5 border-border-structural border-t border-b text-nowrap',
                    {
                      'rounded-tl-lg border-l': i === 0,
                      'rounded-tr-lg border-r': i === columnDefinitions.length - 1,
                    }
                  )}
                >
                  <span>{column.label}</span>
                  {sort && column.sortable && (
                    <span className="inline-block ml-2">
                      <SortIcon
                        order={sort.sortOrder}
                        sorted={isSorted(column.key)}
                        onClick={() => onSort?.(column.key)}
                      />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!items.length ? (
              <EmptyList colSpan={columnDefinitions.length} />
            ) : (
              items.map((value, rowIndex) => {
                const idField = idPath ?? 'id'
                const idValue = value[idField] as string
                const rowKey = idValue ? String(idValue) : `fallback-row-${rowIndex}`

                if (value._meta?.customRender) return value._meta?.customRender(value)

                return (
                  <tr key={rowKey}>
                    {columnDefinitions.map((definition, colIndex) => (
                      <TableCell
                        value={value}
                        index={colIndex}
                        key={definition.key}
                        definition={definition}
                        colIndex={colIndex}
                        isLastRow={items.length - 1 === rowIndex}
                        hasFooter={!!footer}
                        columnsLength={columnDefinitions.length}
                        customRender={customRenderColumns[definition.key]}
                        shrink={definition.shrink}
                        noWrap={noWrap}
                      />
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>

      {pagination && (
        <Pagination
          {...paginationProps}
          className={cn(
            'fixed bottom-0 right-0 bg-surface-base-primary max-w-full px-6 pt-[20px] pb-[14px] transition-all duration-150',
            paginationOffset
          )}
        />
      )}
    </div>
  )
}

const MemoizedTable = memo(Table, propsAreEqual) as typeof Table

export default MemoizedTable
