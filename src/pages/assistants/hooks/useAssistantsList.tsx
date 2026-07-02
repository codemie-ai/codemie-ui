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

import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import { useAssistants } from '@/pages/assistants/hooks/useAssistants'
import { router as hashRouter } from '@/router'

const DEFAULT_PER_PAGE = 12

interface UseAssistantsListProps {
  scope: string
  filterValues: Record<string, unknown>
}

export const useAssistantsList = ({ scope, filterValues }: UseAssistantsListProps) => {
  const router = useVueRouter()
  const route = useVueRoute()
  const { loadAssistants, pagination, assistants, loading } = useAssistants()

  const { perPage, totalPages } = pagination

  const isFavoritesScope = scope === ASSISTANT_INDEX_SCOPES.FAVORITES

  // Get page and perPage from URL query params (only used on initial load)
  const getPageFromURL = useCallback(() => {
    const pageFromQuery = route.query.page
    const perPageFromQuery = route.query.per_page

    let pageToLoad = 0
    if (pageFromQuery && typeof pageFromQuery === 'string') {
      const parsedPage = parseInt(pageFromQuery, 10)
      // Convert from 1-based URL to 0-based backend
      pageToLoad = !Number.isNaN(parsedPage) && parsedPage >= 1 ? parsedPage - 1 : 0
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
    (backendPage: number, currentPerPage: number) => {
      const currentRoute = router.currentRoute.value
      const { page: _, per_page: __, ...restQuery } = currentRoute.query
      const newQuery = { ...restQuery } as Record<string, string>

      // Add page param only for pages 2+ (convert to 1-based URL)
      if (backendPage > 0) {
        newQuery.page = (backendPage + 1).toString()
      }

      // Add per_page param only if it differs from default
      if (currentPerPage !== DEFAULT_PER_PAGE) {
        newQuery.per_page = currentPerPage.toString()
      }

      router.replace({ query: newQuery })
    },
    [router]
  )

  // Unified function to load assistants
  const loadAssistantsList = useCallback(
    async (options: { page?: number; perPage?: number } = {}, shouldLoadFromURL = false) => {
      const { page, perPage: newPerPage } = options
      const pathAtCallTime = hashRouter.state.location.pathname

      // Determine which page and perPage to load
      let pageToLoad: number
      let perPageToLoad: number

      if (shouldLoadFromURL && !isFavoritesScope) {
        const fromURL = getPageFromURL()
        pageToLoad = fromURL.page
        perPageToLoad = fromURL.perPage
      } else {
        pageToLoad = page ?? 0
        perPageToLoad = newPerPage ?? DEFAULT_PER_PAGE
      }

      try {
        await loadAssistants({
          scope,
          page: pageToLoad,
          perPage: perPageToLoad,
          filters: filterValues,
          minimalResponse: true,
        })

        // Skip URL update if the user navigated away during the API call
        if (!isFavoritesScope && hashRouter.state.location.pathname === pathAtCallTime) {
          updateURL(pageToLoad, perPageToLoad)
        }
      } catch (error) {
        console.error('Error loading assistants:', error)
      }
    },
    [scope, filterValues, perPage, loadAssistants, updateURL, getPageFromURL, isFavoritesScope]
  )

  return {
    loadAssistantsList,
    currentPage: pagination.page,
    perPage,
    totalPages,
    assistants,
    loading,
  }
}
