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

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { ProjectRow } from '@/types/cliAnalytics'

import { getCostState, type CostState } from '../costCompleteness'
import { buildCliAnalyticsParams } from './params'

const DEFAULT_PER_PAGE = 10
const SEARCH_DEBOUNCE_MS = 350

export interface UseCliAnalyticsProjectsResult {
  rows: ProjectRow[]
  costState: CostState
  loading: boolean
  error: string | null
  page: number // 0-based
  totalCount: number
  totalPages: number
  perPage: number
  setPage: (page: number, perPage?: number) => void
  search: string
  setSearch: (s: string) => void
  // The term the shown rows were requested with (the debounced `search`).
  appliedSearch: string
}

// One server page of projects; their repositories load on demand.
export function useCliAnalyticsProjects(
  filters: AnalyticsQueryParams,
  repositories?: string[]
): UseCliAnalyticsProjectsResult {
  const snap = useSnapshot(cliAnalyticsStore)
  const {
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositories: repositoriesParam,
  } = buildCliAnalyticsParams(filters, repositories)

  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  // Reset the page while rendering, so no request goes out with the new filters and the old page.
  const filterKey = JSON.stringify([
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositoriesParam,
    debouncedSearch,
  ])
  const [pageFilterKey, setPageFilterKey] = useState(filterKey)
  if (pageFilterKey !== filterKey) {
    setPageFilterKey(filterKey)
    setPage(0)
  }

  useEffect(() => {
    cliAnalyticsStore.fetchProjects({
      time_period,
      start_date,
      end_date,
      users,
      projects,
      repositories: repositoriesParam,
      search: debouncedSearch || undefined,
      page,
      per_page: perPage,
    })
    return () => {
      cliAnalyticsStore.abortControllers.get('projects')?.abort()
    }
  }, [
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositoriesParam,
    debouncedSearch,
    page,
    perPage,
  ])

  const totalCount = snap.projects?.pagination.total_count ?? 0

  return {
    rows: snap.projects?.rows ?? [],
    costState: getCostState(snap.projects),
    loading: snap.loading.projects ?? false,
    error: snap.error.projects?.message ?? null,
    page,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    perPage,
    // Pagination passes the page size on every call and page 0 when the size changes.
    setPage: useCallback((newPage: number, newPerPage?: number) => {
      setPage(Math.max(0, newPage))
      if (newPerPage !== undefined) setPerPage(newPerPage)
    }, []),
    search,
    setSearch,
    appliedSearch: debouncedSearch,
  }
}
