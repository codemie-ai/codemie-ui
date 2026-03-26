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
    'text-left px-4 py-2.5 border-border-structural border-t border-b text-nowrap',
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

      <span>{column.label}</span>

      {isSortableColumn && sortProps && (
        <span className="inline-block ml-2">
          <SortIcon order={sortProps.sort.sortOrder} sorted={isSorted} onClick={handleSortClick} />
        </span>
      )}
    </th>
  )
}

export default TableColHeader
