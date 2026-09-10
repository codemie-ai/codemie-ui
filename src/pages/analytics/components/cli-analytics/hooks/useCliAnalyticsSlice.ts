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

import { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'

import { buildCliAnalyticsParams } from './params'

export type CliAnalyticsSliceKey = 'activity' | 'cost' | 'efficiency' | 'overview' | 'tools'

const SLICE_FETCHER_NAMES = {
  activity: 'fetchActivity',
  cost: 'fetchCost',
  efficiency: 'fetchEfficiency',
  overview: 'fetchOverview',
  tools: 'fetchTools',
} as const satisfies Record<CliAnalyticsSliceKey, keyof typeof cliAnalyticsStore>

export interface UseCliAnalyticsSliceResult<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useCliAnalyticsSlice<T>(
  key: CliAnalyticsSliceKey,
  filters: AnalyticsQueryParams,
  repositories?: string[]
): UseCliAnalyticsSliceResult<T> {
  const snap = useSnapshot(cliAnalyticsStore)

  const {
    time_period,
    start_date,
    end_date,
    users,
    projects,
    repositories: repositoriesParam,
  } = buildCliAnalyticsParams(filters, repositories)

  useEffect(() => {
    cliAnalyticsStore[SLICE_FETCHER_NAMES[key]]({
      time_period,
      start_date,
      end_date,
      users,
      projects,
      repositories: repositoriesParam,
    })
    return () => {
      cliAnalyticsStore.abortControllers.get(key)?.abort()
    }
  }, [key, time_period, start_date, end_date, users, projects, repositoriesParam])

  return {
    data: snap[key] as T | null,
    loading: snap.loading[key] ?? false,
    error: snap.error[key]?.message ?? null,
  }
}
