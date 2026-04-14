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

import { useState, useRef, useCallback, useEffect } from 'react'

export interface LoadListParams {
  searchTerm: string
  page: number
}

export interface LoadListResult<T> {
  items: T[]
  hasMore: boolean
}

interface UsePaginatedOptionsOptions<T> {
  loadList: (params: LoadListParams) => Promise<LoadListResult<T>>
}

interface UsePaginatedOptionsResult<T> {
  options: T[]
  loadOptions: (searchTerm?: string) => void
  handleScrollBottom: () => void
}

// Manages paginated options state for a dropdown/multiselect.
// Pass a loadList function that fetches a page of items and returns whether
// more pages exist; the hook returns ready-to-use callbacks for filter input
// and scroll-to-bottom events.
export const usePaginatedOptions = <T>({
  loadList,
}: UsePaginatedOptionsOptions<T>): UsePaginatedOptionsResult<T> => {
  const [options, setOptions] = useState<T[]>([])

  // Pagination state in refs to avoid triggering re-renders on scroll
  const currentPageRef = useRef(0)
  const currentSearchRef = useRef('')
  const hasMoreRef = useRef(true)
  const isLoadingRef = useRef(false)

  // Keep a ref to loadList so pagination callbacks stay stable across re-renders
  const loadListRef = useRef(loadList)
  useEffect(() => {
    loadListRef.current = loadList
  }, [loadList])

  const resetPaginationRefs = useCallback((searchTerm = '') => {
    currentPageRef.current = 0
    currentSearchRef.current = searchTerm
    hasMoreRef.current = true
  }, [])

  const loadPage = useCallback(async (searchTerm: string, pageNumber: number) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    try {
      const { items, hasMore } = await loadListRef.current({ searchTerm, page: pageNumber })
      hasMoreRef.current = hasMore
      setOptions((prev) => (pageNumber > 0 ? [...prev, ...items] : items))
    } catch (error) {
      console.error('Error loading paginated options:', error)
      if (pageNumber === 0) setOptions([])
    } finally {
      isLoadingRef.current = false
    }
  }, [])

  // Resets pagination and loads from page 0; pass a search term to filter results
  const loadOptions = useCallback(
    (searchTerm = '') => {
      resetPaginationRefs(searchTerm)
      loadPage(searchTerm, 0)
    },
    [resetPaginationRefs, loadPage]
  )

  // Call when the dropdown list is scrolled to the bottom; loads the next page
  const handleScrollBottom = useCallback(() => {
    if (!hasMoreRef.current || isLoadingRef.current) return
    const nextPage = currentPageRef.current + 1
    currentPageRef.current = nextPage
    loadPage(currentSearchRef.current, nextPage)
  }, [loadPage])

  return { options, loadOptions, handleScrollBottom }
}
