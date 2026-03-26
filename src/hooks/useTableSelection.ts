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
