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

import { FILTER_ENTITY, getFilters, setFilters as setActiveFilters } from '@/utils/filters'

import { PaginationState, SortState } from '../types/table'
import { makeCleanObject } from '../utils/utils'

interface UseTableFiltersProps {
  initialSort?: SortState
  initialPagination?: PaginationState
  onSortCallback?: (sort: SortState) => void
  onApplyFiltersCallback?: (filters: Record<string, unknown>) => void
  onPaginationUpdateCallback?: (pagination: PaginationState) => void
  filterKey?: FILTER_ENTITY
}

export interface UseTableFiltersReturn {
  sort: SortState
  pagination: PaginationState
  filters: Record<string, unknown>
  onSort: (key: string) => void
  applyFilters: (newFilters?: Record<string, unknown>) => void
  onPaginationUpdate: (pageValue?: number | null, perPageValue?: number | null) => void
}

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 10

type FiltersState = Record<string, string | null | Array<string>>

export const useTableFilters = ({
  initialSort = { sortKey: undefined, sortOrder: undefined },
  initialPagination = { page: DEFAULT_PAGE, perPage: DEFAULT_PER_PAGE },
  onSortCallback,
  onApplyFiltersCallback,
  onPaginationUpdateCallback,
  filterKey,
}: UseTableFiltersProps = {}): UseTableFiltersReturn => {
  const [filters, setFilters] = useState<FiltersState>(getFilters(filterKey!))
  const [sort, setSort] = useState<SortState>(initialSort)
  const [pagination, setPagination] = useState<PaginationState>(initialPagination)

  const onSort = useCallback(
    (key: string) => {
      setSort((prevSort) => {
        let newSortOrder: 'asc' | 'desc' | undefined = 'asc'

        if (prevSort.sortKey === key) {
          if (prevSort.sortOrder === 'asc') {
            newSortOrder = 'desc'
          } else if (prevSort.sortOrder === 'desc') {
            newSortOrder = undefined
          } else {
            newSortOrder = 'asc'
          }
        }

        const newSortState = { sortKey: newSortOrder ? key : undefined, sortOrder: newSortOrder }

        setPagination((prev) => ({ ...prev, page: DEFAULT_PAGE }))

        onSortCallback?.(newSortState)

        return newSortState
      })
    },
    [onSortCallback]
  )

  const applyFilters = useCallback(
    (newFilters: Record<string, unknown> = {}) => {
      const cleanedFilters = makeCleanObject(newFilters)
      setFilters(cleanedFilters)

      setPagination((prev) => ({ ...prev, page: DEFAULT_PAGE }))

      onApplyFiltersCallback?.(cleanedFilters)
      setActiveFilters(filterKey!, cleanedFilters)
    },
    [sort, pagination, onApplyFiltersCallback]
  )

  const onPaginationUpdate = useCallback(
    (pageValue?: number | null, perPageValue?: number | null) => {
      setPagination((prevPagination) => {
        const newPage =
          pageValue !== null && pageValue !== undefined ? pageValue : prevPagination.page
        const newPerPage =
          perPageValue !== null && perPageValue !== undefined
            ? perPageValue
            : prevPagination.perPage

        const newPaginationState = { page: newPage, perPage: newPerPage }

        onPaginationUpdateCallback?.(newPaginationState)

        return newPaginationState
      })
    },
    [sort, filters, onPaginationUpdateCallback]
  )

  return {
    sort,
    pagination,
    filters,
    onSort,
    applyFilters,
    onPaginationUpdate,
  }
}
