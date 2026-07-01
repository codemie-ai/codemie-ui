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

import { useState } from 'react'
import { useSnapshot } from 'valtio'

import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { assistantsStore } from '@/store/assistants'
import { favoritesStore } from '@/store/favorites'
import { FavoritesFilters } from '@/types/entity/favorites'

export const useAssistants = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentScope, setCurrentScope] = useState('')
  const snap = useSnapshot(assistantsStore) as typeof assistantsStore
  const favSnap = useSnapshot(favoritesStore)

  const isFavoritesScope = currentScope === ASSISTANT_INDEX_SCOPES.FAVORITES

  const loadAssistants = async ({
    scope = ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER,
    filters = {},
    page = 0,
    perPage = 12,
    minimalResponse = false,
    saveFilters = false,
  }) => {
    setLoading(true)
    setError(null)
    setCurrentScope(scope)

    try {
      if (scope === ASSISTANT_INDEX_SCOPES.FAVORITES) {
        await favoritesStore.fetchFavoriteAssistants(
          filters as Partial<FavoritesFilters>,
          page,
          perPage
        )
        const { totalPages } = favoritesStore.assistantsPagination
        if (page > 0 && page >= totalPages) {
          await favoritesStore.fetchFavoriteAssistants(
            filters as Partial<FavoritesFilters>,
            Math.max(0, totalPages - 1),
            perPage
          )
        }
      } else {
        await assistantsStore.indexAssistants(
          scope,
          filters,
          page,
          perPage,
          minimalResponse,
          saveFilters
        )
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return {
    assistants: isFavoritesScope
      ? (favSnap.assistants as unknown as typeof snap.assistants)
      : snap.assistants,
    assistantTemplates: snap.assistantTemplates,
    pagination: isFavoritesScope ? favSnap.assistantsPagination : snap.assistantsPagination,
    loading: isFavoritesScope ? favSnap.loading : loading,
    error,
    loadAssistants,
    assistantsStore,
  }
}
