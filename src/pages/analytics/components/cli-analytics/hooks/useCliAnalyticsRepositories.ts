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
import type { RepositoryRow } from '@/types/cliAnalytics'

import { buildCliAnalyticsParams } from './params'

export interface UseCliAnalyticsRepositoriesResult {
  rows: RepositoryRow[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  perPage: number
  setPage: (page: number, perPage?: number) => void
  search: string
  setSearch: (s: string) => void
}

export function useCliAnalyticsRepositories(
  filters: AnalyticsQueryParams,
  repositories?: string[],
  includeBranches?: boolean,
  initialPerPage?: number
): UseCliAnalyticsRepositoriesResult {
  const snap = useSnapshot(cliAnalyticsStore)
  // initialPerPage === 0 signals "fetch all" (no pagination params sent to the server)
  const fetchAll = initialPerPage === 0

  const {
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositories: repositoriesParam,
  } = buildCliAnalyticsParams(filters, repositories)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(initialPerPage || 20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [time_period, start_date, end_date, users, projects, repositoriesParam, debouncedSearch])

  useEffect(() => {
    const params: any = {
      time_period,
      start_date,
      end_date,
      users,
      projects,
      repositories: repositoriesParam,
      search: debouncedSearch || undefined,
    }
    if (!fetchAll) {
      params.page = page - 1
      params.per_page = perPage
    }
    if (includeBranches) {
      params.include_branches = true
    }
    cliAnalyticsStore.fetchRepositories(params)
    return () => {
      cliAnalyticsStore.abortControllers.get('repositories')?.abort()
    }
  }, [
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositoriesParam,
    page,
    perPage,
    includeBranches,
    fetchAll,
    debouncedSearch,
  ])

  const totalPages = Math.max(
    1,
    Math.ceil((snap.repositories?.pagination.total_count ?? 0) / (perPage || 1))
  )

  return {
    rows: snap.repositories?.rows ?? [],
    loading: snap.loading.repositories ?? false,
    error: snap.error.repositories?.message ?? null,
    page,
    totalPages,
    perPage,
    setPage: useCallback((newPage: number, newPerPage?: number) => {
      setPage(newPage)
      if (newPerPage !== undefined) setPerPage(newPerPage)
    }, []),
    search,
    setSearch,
  }
}
