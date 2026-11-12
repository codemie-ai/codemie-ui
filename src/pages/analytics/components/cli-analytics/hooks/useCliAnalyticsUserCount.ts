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

import { useCliAnalyticsSlice } from './useCliAnalyticsSlice'

export interface UseCliAnalyticsUserCountResult {
  userCount: number | null
  loading: boolean
  error: string | null
}

export function useCliAnalyticsUserCount(
  filters: AnalyticsQueryParams,
  repositories?: string[]
): UseCliAnalyticsUserCountResult {
  const { data, loading, error } = useCliAnalyticsSlice<number>('userCount', filters, repositories)
  return { userCount: data ?? null, loading, error }
}
