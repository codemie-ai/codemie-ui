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

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { ProjectScope, RepositoryRow } from '@/types/cliAnalytics'

import { buildCliAnalyticsParams } from './params'

const PER_PAGE = 10

export interface UseCliAnalyticsProjectRepositoriesResult {
  rows: RepositoryRow[]
  loading: boolean
  error: string | null
  page: number // 0-based
  setPage: (page: number) => void
  totalPages: number
  perPage: number
  retry: () => void
}

// One server page of a project's repositories. The scope replaces filters.projects (never added to
// it); the unattributed scope omits `projects`. Page state is zero-based and sent unchanged.
export function useCliAnalyticsProjectRepositories(
  filters: AnalyticsQueryParams,
  scope: ProjectScope,
  pagination?: { initialPage?: number; onPageChange?: (page: number) => void }
): UseCliAnalyticsProjectRepositoriesResult {
  const snap = useSnapshot(cliAnalyticsStore)
  const { time_period, start_date, end_date, users } = buildCliAnalyticsParams(filters)
  const projects = 'projectName' in scope ? scope.projectName : undefined
  const isProjectUnattributed = 'isProjectUnattributed' in scope ? true : undefined

  const [page, setPage] = useState(pagination?.initialPage ?? 0)
  const [retryKey, setRetryKey] = useState(0)

  // Reset the page while rendering, so no request goes out with the new scope and the old page.
  const filterKey = JSON.stringify([
    time_period,
    start_date,
    end_date,
    users,
    projects,
    isProjectUnattributed,
  ])
  const [pageFilterKey, setPageFilterKey] = useState(filterKey)
  if (pageFilterKey !== filterKey) {
    setPageFilterKey(filterKey)
    setPage(0)
  }

  useEffect(() => {
    cliAnalyticsStore.fetchProjectRepositories({
      time_period,
      start_date,
      end_date,
      users,
      projects,
      is_project_unattributed: isProjectUnattributed,
      page,
      per_page: PER_PAGE,
    })
    return () => {
      cliAnalyticsStore.abortControllers.get('projectRepositories')?.abort()
    }
  }, [time_period, start_date, end_date, users, projects, isProjectUnattributed, page, retryKey])

  const loading = snap.loading.projectRepositories ?? false
  const totalCount = snap.projectRepositories?.pagination.total_count ?? 0

  return {
    rows: loading ? [] : snap.projectRepositories?.rows ?? [],
    loading,
    error: snap.error.projectRepositories?.message ?? null,
    page,
    setPage: useCallback(
      (newPage: number) => {
        const nextPage = Math.max(0, newPage)
        setPage(nextPage)
        pagination?.onPageChange?.(nextPage)
      },
      [pagination?.onPageChange]
    ),
    totalPages: Math.max(1, Math.ceil(totalCount / PER_PAGE)),
    perPage: PER_PAGE,
    retry: useCallback(() => setRetryKey((key) => key + 1), []),
  }
}
