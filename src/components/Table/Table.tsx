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
import {
  ColumnDefinition,
  DefinitionTypes,
  SortState,
  TableItem,
  TableVariant,
} from '@/types/table'

import EmptyList from './EmptyList'
import TableCell from './TableCell'
import TableColHeader, { SelectionProps, SortProps } from './TableColHeader'
import { propsAreEqual } from './utils'
import Pagination, { PaginationProps } from '../Pagination/Pagination'

const NESTED_CLASSES = [
  '!mt-0 !mb-0 table-fixed',
  // Header: same colour as a row, knocked back, and stripped of the card's outer edges.
  '[&_thead]:bg-transparent [&_th]:bg-surface-base-secondary/70 [&_th]:rounded-none',
  '[&_th]:border-t-0 [&_th]:border-l-0 [&_th]:border-r-0 [&_th]:!py-3',
  '[&_th]:border-b-border-structural/60',
  // Body: transparent so the expansion panel's own background shows through uniformly.
  '[&_td]:bg-transparent [&_td]:border-l-0 [&_td]:border-r-0 [&_td]:!py-3',
  '[&_td]:border-b-border-structural/50 [&_tr:last-child_td]:border-b-0',
].join(' ')

const TABLE_VARIANT_CLASSES: Record<TableVariant, string> = {
  default: '',
  nested: NESTED_CLASSES,
}

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
  variant?: TableVariant

  selected?: T[] | null
  onSelectRow?: (value: T[]) => void
  isAllSelected?: boolean
  onSelectAllChange?: (checked: boolean) => void

  expandedRowIds?: ReadonlyArray<string>
  onToggleExpand?: (id: string) => void
  renderExpandedRow?: (item: T) => React.ReactNode
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
  variant = 'default',

  selected,
  onSelectRow,
  isAllSelected = false,
  onSelectAllChange,

  expandedRowIds,
  onToggleExpand,
  renderExpandedRow,
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

  const isExpandable = !!onToggleExpand && !!renderExpandedRow

  const renderedColumns: Array<ColumnDefinition> = useMemo(
    () =>
      isExpandable
        ? [
            { key: 'expand', type: DefinitionTypes.Expand, headClassNames: 'w-[40px]' },
            ...columnDefinitions,
          ]
        : columnDefinitions,
    [isExpandable, columnDefinitions]
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
    <div className={cn('w-full relative flex flex-col', { 'pb-20': !embedded && !!pagination })}>
      {loading && (
        <div className="absolute inset-0 bg-surface-base-primary flex items-center justify-center z-30">
          <Spinner />
        </div>
      )}
      <div
        className={cn('w-full grow', {
          'overflow-auto min-h-[300px] show-scroll': !embedded,
        })}
      >
        <table
          className={cn(
            'mt-4 border-separate border-spacing-0 w-full text-[12px] leading-tight',
            TABLE_VARIANT_CLASSES[variant],
            tableClassName,
            className
          )}
        >
          <thead className="bg-surface-base-tertiary text-text-primary sticky top-0 z-20">
            <tr className="font-semibold border-y">
              {renderedColumns.map((column, i) => (
                <TableColHeader
                  key={column.key}
                  column={column}
                  isFirst={i === 0}
                  isLast={i === renderedColumns.length - 1}
                  selectionProps={selectionProps}
                  sortProps={sortProps}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {!items.length ? (
              <EmptyList colSpan={renderedColumns.length} />
            ) : (
              items.map((value, rowIndex) => {
                const idField = idPath ?? 'id'
                const idValue = value[idField]
                const rowKey = idValue ? String(idValue) : `fallback-row-${rowIndex}`
                const isSelected = !!selected?.find((s) => s[idField as keyof T] === value[idField])

                if (value._meta?.customRender) return value._meta?.customRender(value)

                const isExpanded = isExpandable && !!expandedRowIds?.includes(String(idValue))
                const isLastRow = items.length - 1 === rowIndex
                const isExpansionLast = isLastRow && isExpanded && !footer

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={(e) => handleRowClick(value, e)}
                      className={cn(
                        onSelectRow &&
                          !isSelected &&
                          '[&_td]:hover:bg-surface-base-tertiary cursor-pointer',
                        isSelected && '[&_td]:bg-surface-specific-input-prefix cursor-pointer'
                      )}
                    >
                      {renderedColumns.map((definition, colIndex) => (
                        <TableCell
                          value={value}
                          index={isExpandable ? colIndex - 1 : colIndex}
                          key={definition.key}
                          definition={definition}
                          colIndex={colIndex}
                          isLastRow={isLastRow && !isExpanded}
                          hasFooter={!!footer}
                          columnsLength={renderedColumns.length}
                          customRender={customRenderColumns[definition.key]}
                          shrink={definition.shrink}
                          noWrap={noWrap}
                          isSelected={isSelected}
                          onSelect={() => handleRowSelect(value)}
                          isExpanded={isExpanded}
                          onToggleExpand={() => onToggleExpand?.(String(idValue))}
                        />
                      ))}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={renderedColumns.length}
                          className={cn(
                            'bg-surface-base-secondary/40 border-b border-l border-r border-border-structural p-0',
                            isExpansionLast && 'rounded-b-lg overflow-hidden'
                          )}
                        >
                          {renderExpandedRow?.(value)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
            'fixed bottom-0 right-0 bg-surface-base-primary max-w-full px-6 pt-[20px] pb-[14px] transition-all duration-150 z-40',
            paginationOffset
          )}
        />
      )}
    </div>
  )
}

const MemoizedTable = memo(Table, propsAreEqual) as typeof Table

export default MemoizedTable
