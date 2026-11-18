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

import type { AnalyticsQueryParams } from '@/types/analytics'
import type {
  CliAnalyticsOverviewData,
  DailyBucket,
  ModelBreakdownItem,
  OverviewKPIs,
} from '@/types/cliAnalytics'

import { getKpiCostState, type CostState } from '../costCompleteness'
import { useCliAnalyticsSlice } from './useCliAnalyticsSlice'

export interface UseCliAnalyticsOverviewResult {
  kpis: OverviewKPIs | null
  dailyBuckets: DailyBucket[]
  modelBreakdown: ModelBreakdownItem[]
  personalBilledCost: number | null
  costState: CostState
  loading: boolean
  error: string | null
}

export function useCliAnalyticsOverview(
  filters: AnalyticsQueryParams,
  repositories?: string[]
): UseCliAnalyticsOverviewResult {
  const { data, loading, error } = useCliAnalyticsSlice<CliAnalyticsOverviewData>(
    'overview',
    filters,
    repositories
  )
  return {
    kpis: data?.kpis ?? null,
    dailyBuckets: data?.daily_buckets ?? [],
    modelBreakdown: data?.model_breakdown ?? [],
    personalBilledCost: data?.personal_billed?.cost_usd ?? null,
    costState: getKpiCostState(data?.kpis, data),
    loading,
    error,
  }
}
