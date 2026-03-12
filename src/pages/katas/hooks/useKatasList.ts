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

import { useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import { katasStore } from '@/store/katas'
import { KataFilters } from '@/types/entity/kata'

const DEFAULT_PER_PAGE = 12

interface UseKatasListProps {
  filterValues?: KataFilters
}

export const useKatasList = ({ filterValues }: UseKatasListProps) => {
  const router = useVueRouter()
  const route = useVueRoute()
  const { katasPagination } = useSnapshot(katasStore)

  const { perPage, totalPages } = katasPagination

  // Get page and perPage from URL query params (only used on initial load)
  const getPageFromURL = useCallback(() => {
    const pageFromQuery = route.query.page
    const perPageFromQuery = route.query.per_page

    let pageToLoad = 1
    if (pageFromQuery && typeof pageFromQuery === 'string') {
      const parsedPage = parseInt(pageFromQuery, 10)
      pageToLoad = !Number.isNaN(parsedPage) && parsedPage >= 1 ? parsedPage : 1
    }

    let perPageToLoad = DEFAULT_PER_PAGE
    if (perPageFromQuery && typeof perPageFromQuery === 'string') {
      const parsedPerPage = parseInt(perPageFromQuery, 10)
      perPageToLoad =
        !Number.isNaN(parsedPerPage) && parsedPerPage > 0 ? parsedPerPage : DEFAULT_PER_PAGE
    }

    return { page: pageToLoad, perPage: perPageToLoad }
  }, [route.query.page, route.query.per_page])

  // Update URL with current page and perPage
  const updateURL = useCallback(
    (page: number, currentPerPage: number) => {
      const currentRoute = router.currentRoute.value
      const { page: _, per_page: __, ...restQuery } = currentRoute.query
      const newQuery = { ...restQuery } as Record<string, string>

      // Add page param only for pages 2+
      if (page > 1) {
        newQuery.page = page.toString()
      }

      // Add per_page param only if it differs from default
      if (currentPerPage !== DEFAULT_PER_PAGE) {
        newQuery.per_page = currentPerPage.toString()
      }

      router.replace({ query: newQuery })
    },
    [router]
  )

  // Unified function to load katas
  const loadKatasList = useCallback(
    async (options: { page?: number; perPage?: number } = {}, shouldLoadFromURL = false) => {
      const { page, perPage: newPerPage } = options

      // Determine which page and perPage to load
      let pageToLoad: number
      let perPageToLoad: number

      if (shouldLoadFromURL) {
        const fromURL = getPageFromURL()
        pageToLoad = fromURL.page
        perPageToLoad = fromURL.perPage
      } else {
        pageToLoad = page ?? 1
        perPageToLoad = newPerPage ?? DEFAULT_PER_PAGE
      }

      try {
        // Load katas
        await katasStore.fetchKatas(filterValues, pageToLoad, perPageToLoad)

        // Update URL after successful load
        updateURL(pageToLoad, perPageToLoad)
      } catch (error) {
        console.error('Error loading katas:', error)
      }
    },
    [filterValues, updateURL, getPageFromURL]
  )

  return {
    loadKatasList,
    currentPage: katasPagination.page,
    perPage,
    totalPages,
    totalCount: katasPagination.totalCount,
  }
}
