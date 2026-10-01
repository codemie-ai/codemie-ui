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

import React, { useId } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { cn } from '@/utils/utils'

import SortIcon from './SortIcon'
import { TableCellContent } from './TableCell'
import { getSelectAllState, SelectionProps, SortProps } from './TableColHeader'

const ACTIONS_COLUMN_KEY = 'actions'

// Taps on the text of a selectable card reach the card button under it; controls inside the card
// keep receiving their own taps.
const SELECTABLE_CARD_CONTENT_CLASS_NAME =
  'pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_[role=button]]:pointer-events-auto'

interface TableCardListProps<T> {
  items: Array<T> | ReadonlyArray<T>
  columnDefinitions: Array<ColumnDefinition>
  customRenderColumns: Record<string, (item: T, i: number) => React.ReactNode>
  getRowId: (item: T, index: number) => string
  isRowSelected: (item: T) => boolean
  onRowSelect: (item: T) => void
  /** Selects a row by tapping its card, for tables without a selection column (e.g. drill-downs). */
  onCardSelect?: (item: T) => void
  selectionProps?: SelectionProps<T>
  sortProps?: SortProps
  expandedRowIds?: ReadonlyArray<string>
  onToggleExpand?: (id: string) => void
  renderExpandedRow?: (item: T) => React.ReactNode
}

const EXPAND_COLUMN: ColumnDefinition = { key: 'expand', type: DefinitionTypes.Expand }

/**
 * Table rows as cards, for screens too narrow for columns: the first column is the card title,
 * the actions column sits next to it and every other column becomes a labelled field. The select
 * all checkbox and the sortable columns of the table header move to a toolbar above the cards.
 */
const TableCardList = <T,>({
  items,
  columnDefinitions,
  customRenderColumns,
  getRowId,
  isRowSelected,
  onRowSelect,
  onCardSelect,
  selectionProps,
  sortProps,
  expandedRowIds,
  onToggleExpand,
  renderExpandedRow,
}: TableCardListProps<T>): React.ReactNode => {
  const titleIdPrefix = useId()
  const selectionColumn = columnDefinitions.find(({ type }) => type === DefinitionTypes.Selection)
  // With a selection column, its checkbox selects the row.
  const isCardSelectable = !!onCardSelect && !selectionColumn
  const actionsColumn = columnDefinitions.find(({ key }) => key === ACTIONS_COLUMN_KEY)
  const [titleColumn, ...detailColumns] = columnDefinitions.filter(
    (column) => column !== selectionColumn && column !== actionsColumn
  )
  const isExpandable = !!onToggleExpand && !!renderExpandedRow
  const selectAll = selectionColumn && selectionProps ? getSelectAllState(selectionProps) : null
  const sortableColumns = sortProps ? columnDefinitions.filter(({ sortable }) => sortable) : []

  if (!items.length) {
    return (
      <div className="mt-4 py-7 px-4 rounded-lg border border-border-structural bg-surface-base-secondary text-center text-h4 font-bold text-text-quaternary">
        No data available
      </div>
    )
  }

  const renderSortButton = (column: ColumnDefinition) => {
    const handleSort = () => sortProps?.onSort?.(column.key)

    return (
      <button
        key={column.key}
        type="button"
        className="inline-flex items-center h-7 px-2 rounded-lg border border-border-structural bg-surface-base-secondary font-semibold text-text-primary"
        onClick={handleSort}
      >
        {column.label}
        {/* Clicks go to the button, as in the table header. */}
        <span className="pointer-events-none">
          <SortIcon
            order={sortProps?.sort.sortOrder}
            sorted={sortProps?.sort.sortKey === column.key}
            onClick={handleSort}
          />
        </span>
      </button>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {(selectAll || sortableColumns.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {selectAll && (
            <Checkbox
              label="Select all"
              checked={selectAll.isAllPageSelected}
              mixed={selectAll.isIndeterminate}
              onChange={selectAll.toggleAll}
            />
          )}
          {sortableColumns.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-text-quaternary">Sort by</span>
              {sortableColumns.map(renderSortButton)}
            </div>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item, index) => {
          const rowId = getRowId(item, index)
          const titleId = `${titleIdPrefix}-${index}`
          const isSelected = isRowSelected(item)
          const isExpanded = isExpandable && !!expandedRowIds?.includes(rowId)

          const renderCell = (definition: ColumnDefinition) => (
            <TableCellContent
              value={item}
              index={index}
              definition={definition}
              customRender={customRenderColumns[definition.key]}
              isSelected={isSelected}
              onSelect={() => onRowSelect(item)}
              isExpanded={isExpanded}
              onToggleExpand={() => onToggleExpand?.(rowId)}
            />
          )

          return (
            <li
              key={rowId}
              className={cn(
                'relative rounded-lg border border-border-structural',
                'bg-surface-base-secondary text-xs text-text-primary',
                { 'bg-surface-specific-input-prefix': isSelected }
              )}
            >
              {isCardSelectable && (
                // A real button under the content makes the whole card selectable without nesting
                // the controls inside the card in it.
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-labelledby={titleColumn ? titleId : undefined}
                  className="absolute inset-0 rounded-lg"
                  onClick={() => onCardSelect?.(item)}
                />
              )}

              <div
                className={cn(
                  'relative flex flex-col gap-3 p-4',
                  isCardSelectable && SELECTABLE_CARD_CONTENT_CLASS_NAME
                )}
              >
                <div className="flex items-start gap-3">
                  {selectionColumn && renderCell(selectionColumn)}
                  {titleColumn && (
                    <div id={titleId} className="flex-1 min-w-0 text-sm font-semibold break-words">
                      {renderCell(titleColumn)}
                    </div>
                  )}
                  {actionsColumn && (
                    <div className="shrink-0 ml-auto">{renderCell(actionsColumn)}</div>
                  )}
                </div>

                {detailColumns.length > 0 && (
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                    {detailColumns.map((definition) => (
                      <div
                        key={definition.key}
                        className={cn('min-w-0', definition.fullWidthInCard && 'col-span-full')}
                      >
                        {definition.label && (
                          <dt className="text-text-quaternary">{definition.label}</dt>
                        )}
                        {/* Column alignment (e.g. right-aligned numbers) does not apply to a stacked field. */}
                        <dd className="mt-1 break-words [&_*]:text-left">
                          {renderCell(definition)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {isExpandable && (
                  <>
                    <div className="flex justify-end -my-1">{renderCell(EXPAND_COLUMN)}</div>
                    {isExpanded && (
                      // Like the table's own expansion row, the expanded content does not select the row.
                      <div className="-mx-4 -mb-4 border-t border-border-structural pointer-events-auto">
                        {renderExpandedRow?.(item)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default TableCardList
