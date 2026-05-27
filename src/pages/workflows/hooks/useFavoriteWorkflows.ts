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

import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { favoritesStore } from '@/store/favorites'

const DEFAULT_PER_PAGE = 12

export const useFavoriteWorkflows = (
  isFavorites: boolean,
  workflowFilters: Record<string, unknown>
) => {
  const [favoritesPage, setFavoritesPage] = useState(0)
  const [favoritesPerPage, setFavoritesPerPage] = useState(DEFAULT_PER_PAGE)
  const {
    workflows: favoriteWorkflows,
    loading: favoritesLoading,
    workflowsPagination,
  } = useSnapshot(favoritesStore)

  useEffect(() => {
    setFavoritesPage(0)
    setFavoritesPerPage(DEFAULT_PER_PAGE)
  }, [isFavorites])

  useEffect(() => {
    if (isFavorites) {
      favoritesStore.fetchFavoriteWorkflows(workflowFilters, favoritesPage, favoritesPerPage)
    }
  }, [isFavorites, favoritesPage, favoritesPerPage, JSON.stringify(workflowFilters)])

  const handleRefresh = useCallback(() => {
    favoritesStore
      .fetchFavoriteWorkflows(workflowFilters, favoritesPage, favoritesPerPage)
      .then(() => {
        const { totalPages } = favoritesStore.workflowsPagination
        if (favoritesPage > 0 && favoritesPage >= totalPages) {
          setFavoritesPage(Math.max(0, totalPages - 1))
        }
      })
  }, [workflowFilters, favoritesPage, favoritesPerPage])

  const handleFavoritesPageChange = useCallback((page: number, newPerPage?: number) => {
    if (newPerPage !== undefined) setFavoritesPerPage(newPerPage)
    setFavoritesPage(page)
  }, [])

  return {
    favoriteWorkflows,
    favoritesLoading,
    workflowsPagination,
    favoritesPage,
    handleRefresh,
    handleFavoritesPageChange,
  }
}
