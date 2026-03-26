import { useState, useCallback } from 'react'

export interface UseTableSelectionOptions<TItem> {
  totalCount: number
  currentItems: TItem[]
  onFetchAll?: () => Promise<TItem[]>
}

export interface UseTableSelectionReturn<TItem> {
  selected: TItem[]
  isAllSelected: boolean
  onSelectRow: (newSelection: TItem[]) => void
  onSelectAllChange: (checked: boolean) => Promise<void>
  clearSelection: () => void
}

export function useTableSelection<TItem>({
  totalCount,
  currentItems,
  onFetchAll,
}: UseTableSelectionOptions<TItem>): UseTableSelectionReturn<TItem> {
  const [selected, setSelected] = useState<TItem[]>([])
  const [isAllSelected, setIsAllSelected] = useState(false)

  const onSelectRow = useCallback(
    (newSelection: TItem[]) => {
      setSelected(newSelection)
      setIsAllSelected(newSelection.length === totalCount)
    },
    [totalCount]
  )

  const onSelectAllChange = useCallback(
    async (checked: boolean) => {
      if (!checked) {
        setSelected([])
        setIsAllSelected(false)
        return
      }

      if (!onFetchAll) {
        setSelected(currentItems)
        setIsAllSelected(true)
        return
      }

      try {
        const allItems = await onFetchAll()
        setSelected(allItems)
        setIsAllSelected(true)
      } catch (error) {
        console.error('Failed to fetch all items for selection:', error)
      }
    },
    [currentItems, onFetchAll]
  )

  const clearSelection = useCallback(() => {
    setSelected([])
    setIsAllSelected(false)
  }, [])

  return {
    selected,
    isAllSelected,
    onSelectRow,
    onSelectAllChange,
    clearSelection,
  }
}
