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

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { SessionRow } from '@/types/cliAnalytics'

import { buildCliAnalyticsParams } from './params'

export interface UseCliAnalyticsSessionsResult {
  displayRows: SessionRow[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  perPage: number
  setPage: (page: number, perPage?: number) => void
  search: string
  setSearch: (s: string) => void
}

export function useCliAnalyticsSessions(
  filters: AnalyticsQueryParams,
  repositories?: string[],
  options?: {
    sort_by?: 'start_time' | 'cost_usd' | 'ctx_per_call'
    per_page?: number
    framework?: string
    isUnattributed?: boolean
    branch?: string
  }
): UseCliAnalyticsSessionsResult {
  const snap = useSnapshot(cliAnalyticsStore)

  const {
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositories: repositoriesParam,
    branch: branchParam,
  } = buildCliAnalyticsParams(filters, repositories, options?.branch)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(options?.per_page ?? 20)
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
  }, [
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositoriesParam,
    branchParam,
    debouncedSearch,
    options?.framework,
    options?.isUnattributed,
  ])

  useEffect(() => {
    cliAnalyticsStore.fetchSessions({
      time_period,
      start_date,
      end_date,
      users,
      projects,
      repositories: repositoriesParam,
      branch: branchParam,
      page: page - 1,
      per_page: perPage,
      sort_by: options?.sort_by,
      search: debouncedSearch || undefined,
      framework: options?.framework || undefined,
      is_unattributed: options?.isUnattributed || undefined,
    })

    return () => {
      cliAnalyticsStore.abortControllers.get('sessions')?.abort()
    }
  }, [
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositoriesParam,
    branchParam,
    page,
    perPage,
    debouncedSearch,
    options?.framework,
    options?.isUnattributed,
  ])

  const setPageState = (newPage: number, newPerPage?: number) => {
    setPage(newPage)
    if (newPerPage !== undefined) setPerPage(newPerPage)
  }

  const totalPages = Math.max(1, Math.ceil((snap.sessions?.total ?? 0) / perPage))

  const displayRows = useMemo(() => snap.sessions?.sessions ?? [], [snap.sessions])

  const loading = snap.loading.sessions ?? false
  const error = snap.error.sessions?.message ?? null

  return {
    displayRows,
    loading,
    error,
    page,
    totalPages,
    perPage,
    setPage: setPageState,
    search,
    setSearch,
  }
}
