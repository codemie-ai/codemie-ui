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
import React, { memo, MouseEvent, useCallback, useMemo } from 'react'

import Spinner from '@/components/Spinner'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { ColumnDefinition, SortState, TableItem } from '@/types/table'

import EmptyList from './EmptyList'
import TableCell from './TableCell'
import TableColHeader, { SelectionProps, SortProps } from './TableColHeader'
import { propsAreEqual } from './utils'
import Pagination, { PaginationProps } from '../Pagination/Pagination'

export interface TableProps<T = TableItem> {
  items: Array<T> | ReadonlyArray<T>
  columnDefinitions: Array<ColumnDefinition>
  customRenderColumns?: Record<string, (item: T, i: number) => React.ReactNode>
  idPath?: keyof T
  sort?: SortState
  loading?: boolean
  onSort?: (key: string) => void
  innerPagination?: boolean
  onPaginationChange?: PaginationProps['setPage']
  perPageOptions?: PaginationProps['perPageOptions']
  pagination?: { page: number; totalPages: number; perPage: number; totalCount?: number }
  embedded?: boolean
  noWrap?: boolean
  footer?: React.ReactNode
  className?: string
  tableClassName?: string

  selected?: T[] | null
  onSelectRow?: (value: T[]) => void
  isAllSelected?: boolean
  onSelectAllChange?: (checked: boolean) => void
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
  className,
  tableClassName,

  selected,
  onSelectRow,
  isAllSelected = false,
  onSelectAllChange,
}: TableProps<T>): React.ReactNode => {
  const isLazyMode = !!pagination?.totalCount && !!onSelectAllChange

  const selectionProps: SelectionProps<T> | undefined = useMemo(
    () =>
      onSelectRow
        ? {
            selected,
            isAllSelected,
            isLazyMode,
            items,
            onSelectRow,
            onSelectAllChange,
          }
        : undefined,
    [selected, isAllSelected, isLazyMode, items, onSelectRow, onSelectAllChange]
  )

  const sortProps: SortProps | undefined = useMemo(
    () => (sort ? { sort, onSort } : undefined),
    [sort, onSort]
  )

  const paginationProps = {
    perPageOptions,
    setPage: onPaginationChange!,
    currentPage: pagination?.page ?? 0,
    totalPages: pagination?.totalPages ?? 0,
    perPage: !innerPagination && pagination?.perPage ? pagination.perPage : undefined,
  }
  const paginationOffset = useSidebarOffsetClass()

  const handleRowSelect = useCallback(
    (item: T) => {
      const isSelected = !!selected?.find((s) => s[idPath!] === item[idPath!])
      if (isSelected) onSelectRow?.(selected?.filter((s) => s[idPath!] !== item[idPath!]) ?? [])
      else onSelectRow?.([...(selected ?? []), item])
    },
    [selected, idPath, onSelectRow]
  )

  const handleRowClick = useCallback(
    (item: T, event: MouseEvent<HTMLTableRowElement>) => {
      const target = event.target as HTMLElement

      const interactiveElement = target.closest('button, a, input, [role="button"], [role="link"]')
      const isSelectionCheckbox = target.closest('[data-selection-checkbox]')

      if (interactiveElement && !isSelectionCheckbox) return

      handleRowSelect(item)
    },
    [handleRowSelect]
  )

  return (
    <div className="w-full relative flex flex-col">
      {loading && (
        <div className="absolute inset-0 bg-surface-base-primary flex items-center justify-center z-30">
          <Spinner />
        </div>
      )}
      <div className={cn('w-full grow', { 'overflow-auto min-h-[300px]': !embedded })}>
        <table
          className={cn(
            'mt-4 border-separate border-spacing-0 w-full text-[12px] leading-tight',
            {
              'mb-[80px]': !embedded,
            },
            tableClassName,
            className
          )}
        >
          <thead className="bg-surface-base-tertiary text-text-primary sticky top-0 z-20">
            <tr className="font-semibold border-y">
              {columnDefinitions.map((column, i) => (
                <TableColHeader
                  key={column.key}
                  column={column}
                  isFirst={i === 0}
                  isLast={i === columnDefinitions.length - 1}
                  selectionProps={selectionProps}
                  sortProps={sortProps}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {!items.length ? (
              <EmptyList colSpan={columnDefinitions.length} />
            ) : (
              items.map((value, rowIndex) => {
                const idField = idPath ?? 'id'
                const idValue = value[idField]
                const rowKey = idValue ? String(idValue) : `fallback-row-${rowIndex}`
                const isSelected = !!selected?.find((s) => s[idField as keyof T] === value[idField])

                if (value._meta?.customRender) return value._meta?.customRender(value)

                return (
                  <tr
                    onClick={(e) => handleRowClick(value, e)}
                    key={rowKey}
                    className={cn(
                      onSelectRow &&
                        !isSelected &&
                        '[&_td]:hover:bg-surface-base-tertiary cursor-pointer',
                      isSelected && '[&_td]:bg-surface-specific-input-prefix cursor-pointer'
                    )}
                  >
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
                        isSelected={isSelected}
                        onSelect={() => handleRowSelect(value)}
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

      {pagination && !embedded && (
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
