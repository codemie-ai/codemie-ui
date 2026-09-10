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

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import { TimePeriod } from '@/types/analytics'
import type { AnalyticsQueryParams } from '@/types/analytics'

import { useCliAnalyticsOverview } from '../useCliAnalyticsOverview'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn((store: unknown) => store) }
})

const BASE_FILTERS: AnalyticsQueryParams = { time_period: TimePeriod.LAST_HOUR }

const MOCK_KPIS = {
  total_sessions: 100,
  total_cost_usd: 5.0,
  duration_ms: 3600000,
  total_turns: 200,
  total_tool_calls: 500,
  tool_call_success_rate: 95.0,
  total_files_changed: 40,
  net_lines: 120,
  dead_sessions: 5,
  total_input_tokens: 1000000,
  total_output_tokens: 200000,
  total_cache_creation_tokens: 100000,
  total_cache_read_tokens: 300000,
  total_tokens: 1600000,
  cache_read_cost_usd: 0.8,
  bloat_pct: 10.0,
  avg_context_per_call: 12000,
}

describe('useCliAnalyticsOverview', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    cliAnalyticsStore.overview = null
    cliAnalyticsStore.loading = {}
    cliAnalyticsStore.error = {}
  })

  it('calls fetchOverview on mount with filter params', async () => {
    const fetchOverview = vi.spyOn(cliAnalyticsStore, 'fetchOverview').mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsOverview(BASE_FILTERS))

    await waitFor(() => {
      expect(fetchOverview).toHaveBeenCalledWith({
        time_period: TimePeriod.LAST_HOUR,
        start_date: undefined,
        end_date: undefined,
        projects: undefined,
        repositories: undefined,
      })
    })
  })

  it('joins repositories as comma-separated string', async () => {
    const fetchOverview = vi.spyOn(cliAnalyticsStore, 'fetchOverview').mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsOverview(BASE_FILTERS, ['repo-a', 'repo-b']))

    await waitFor(() => {
      expect(fetchOverview).toHaveBeenCalledWith(
        expect.objectContaining({ repositories: 'repo-a,repo-b' })
      )
    })
  })

  it('omits repositories param when array is empty', async () => {
    const fetchOverview = vi.spyOn(cliAnalyticsStore, 'fetchOverview').mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsOverview(BASE_FILTERS, []))

    await waitFor(() => {
      expect(fetchOverview).toHaveBeenCalledWith(
        expect.objectContaining({ repositories: undefined })
      )
    })
  })

  it('returns null kpis and empty arrays when overview is null', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchOverview').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsOverview(BASE_FILTERS))

    expect(result.current.kpis).toBeNull()
    expect(result.current.dailyBuckets).toEqual([])
    expect(result.current.modelBreakdown).toEqual([])
  })

  it('returns kpis and arrays from store when populated', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchOverview').mockResolvedValue(undefined)
    cliAnalyticsStore.overview = {
      kpis: MOCK_KPIS,
      daily_buckets: [{ day: '2026-07-01', net_lines: 10 }],
      model_breakdown: [{ model_name: 'claude-sonnet-4-5', session_count: 60 }],
    }

    const { result } = renderHook(() => useCliAnalyticsOverview(BASE_FILTERS))

    expect(result.current.kpis?.total_sessions).toBe(100)
    expect(result.current.dailyBuckets).toHaveLength(1)
    expect(result.current.modelBreakdown[0].model_name).toBe('claude-sonnet-4-5')
  })

  it('calls abort controller on unmount', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchOverview').mockResolvedValue(undefined)
    const mockAbort = vi.fn()
    cliAnalyticsStore.abortControllers.set('overview', {
      abort: mockAbort,
    } as unknown as AbortController)

    const { unmount } = renderHook(() => useCliAnalyticsOverview(BASE_FILTERS))
    unmount()

    expect(mockAbort).toHaveBeenCalled()
  })
})
