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
  CliAnalyticsCostData,
  CliAnalyticsCostKPIs,
  CostByModelRow,
  CostByUserRow,
} from '@/types/cliAnalytics'

import { useCliAnalyticsSlice } from './useCliAnalyticsSlice'

export interface UseCliAnalyticsCostResult {
  kpis: CliAnalyticsCostKPIs | null
  costByUser: CostByUserRow[]
  costByModel: CostByModelRow[]
  loading: boolean
  error: string | null
}

export function useCliAnalyticsCost(
  filters: AnalyticsQueryParams,
  repositories?: string[]
): UseCliAnalyticsCostResult {
  const { data, loading, error } = useCliAnalyticsSlice<CliAnalyticsCostData>(
    'cost',
    filters,
    repositories
  )
  return {
    kpis: data?.kpis ?? null,
    costByUser: data?.cost_by_user ?? [],
    costByModel: data?.cost_by_model ?? [],
    loading,
    error,
  }
}
