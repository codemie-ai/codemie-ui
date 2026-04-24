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

import { ColumnDefinition, DefinitionTypes, SortState } from '@/types/table'

import SortIcon from './SortIcon'
import { Checkbox } from '../form/Checkbox'

export interface SelectionProps<T> {
  selected?: T[] | null
  isAllSelected: boolean
  isLazyMode: boolean
  items: Array<T> | ReadonlyArray<T>
  onSelectRow?: (value: T[]) => void
  onSelectAllChange?: (checked: boolean) => void
}

export interface SortProps {
  sort: SortState
  onSort?: (key: string) => void
}

interface TableColHeaderProps<T> {
  column: ColumnDefinition
  isFirst: boolean
  isLast: boolean
  selectionProps?: SelectionProps<T>
  sortProps?: SortProps
}

const TableColHeader = <T,>({
  column,
  isFirst,
  isLast,
  selectionProps,
  sortProps,
}: TableColHeaderProps<T>) => {
  const isSelectionColumn = column.type === DefinitionTypes.Selection
  const isSortableColumn = sortProps && column.sortable

  const getIsAllPageSelected = () => {
    if (!selectionProps || selectionProps.items.length === 0) return false
    if (selectionProps.isLazyMode) return selectionProps.isAllSelected
    return selectionProps.selected?.length === selectionProps.items.length
  }

  const isAllPageSelected = getIsAllPageSelected()
  const hasSelection = selectionProps?.selected && selectionProps.selected.length > 0
  const isIndeterminate = Boolean(hasSelection && !isAllPageSelected)

  const isSorted = Boolean(sortProps && sortProps.sort.sortKey === column.key)

  const handleSelectionChange = () => {
    if (!selectionProps) return

    if (selectionProps.isLazyMode) {
      selectionProps.onSelectAllChange?.(!isAllPageSelected)
    } else if (isAllPageSelected) {
      selectionProps.onSelectRow?.([])
    } else {
      selectionProps.onSelectRow?.(selectionProps.items as T[])
    }
  }

  const handleSortClick = () => {
    sortProps?.onSort?.(column.key)
  }

  const headerClassName = cn(
    column.headClassNames,
    'text-left px-4 py-2.5 border-border-structural border-t border-b',
    column.headerNoWrap !== false ? 'text-nowrap' : 'whitespace-normal break-words',
    {
      'rounded-tl-lg border-l': isFirst,
      'rounded-tr-lg border-r': isLast,
      'pr-0.5 w-[1%]': isSelectionColumn,
    }
  )

  return (
    <th key={column.key} className={headerClassName}>
      {isSelectionColumn && selectionProps && (
        <Checkbox
          checked={isAllPageSelected}
          mixed={isIndeterminate ?? undefined}
          onChange={handleSelectionChange}
        />
      )}

      {isSortableColumn ? (
        <button
          type="button"
          className="inline-flex items-center cursor-pointer select-none bg-transparent border-none p-0 font-semibold text-inherit"
          onClick={handleSortClick}
          title={column.tooltip}
        >
          <span>{column.label}</span>
          <span className="inline-block ml-2 pointer-events-none">
            <SortIcon
              order={sortProps!.sort.sortOrder}
              sorted={isSorted}
              onClick={handleSortClick}
            />
          </span>
        </button>
      ) : (
        <span title={column.tooltip}>{column.label}</span>
      )}
    </th>
  )
}

export default TableColHeader
