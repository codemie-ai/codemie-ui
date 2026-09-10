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
import type { ChartUserRow, UserRow } from '@/types/cliAnalytics'

import { buildCliAnalyticsParams } from './params'

export interface UseCliAnalyticsUsersResult {
  chartRows: ChartUserRow[]
  tableRows: UserRow[]
  totalCount: number
  currentPage: number
  pageSize: number
  avgSessionDurationMs: number | null
  loading: boolean
  error: string | null
  setPage: (page: number) => void
}

const PAGE_SIZE = 50

export function useCliAnalyticsUsers(
  filters: AnalyticsQueryParams,
  repositories?: string[]
): UseCliAnalyticsUsersResult {
  const snap = useSnapshot(cliAnalyticsStore)
  const [currentPage, setCurrentPage] = useState(0)

  const {
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositories: repositoriesParam,
  } = buildCliAnalyticsParams(filters, repositories)

  useEffect(() => {
    cliAnalyticsStore.fetchUsersCharts({
      time_period,
      start_date,
      end_date,
      users,
      projects,
      repositories: repositoriesParam,
    })
    return () => {
      cliAnalyticsStore.abortControllers.get('usersCharts')?.abort()
    }
  }, [time_period, start_date, end_date, users, projects, repositoriesParam])

  useEffect(() => {
    cliAnalyticsStore.fetchUsersTable({
      time_period,
      start_date,
      end_date,
      users,
      projects,
      repositories: repositoriesParam,
      page: currentPage,
      per_page: PAGE_SIZE,
    })
    return () => {
      cliAnalyticsStore.abortControllers.get('usersTable')?.abort()
    }
  }, [time_period, start_date, end_date, users, projects, repositoriesParam, currentPage])

  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, page))
  }, [])

  return {
    chartRows: snap.users?.charts?.rows ?? [],
    tableRows: snap.users?.table?.rows ?? [],
    totalCount: snap.users?.table?.total_count ?? 0,
    currentPage,
    pageSize: PAGE_SIZE,
    avgSessionDurationMs: snap.users?.table?.avg_session_duration_ms ?? null,
    loading: (snap.loading.userCharts ?? false) || (snap.loading.userTable ?? false),
    error: snap.error.userCharts?.message ?? snap.error.userTable?.message ?? null,
    setPage: handleSetPage,
  }
}
