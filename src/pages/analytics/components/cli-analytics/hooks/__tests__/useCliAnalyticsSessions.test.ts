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

import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import { TimePeriod } from '@/types/analytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { SessionRow } from '@/types/cliAnalytics'

import { useCliAnalyticsSessions } from '../useCliAnalyticsSessions'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn((store: unknown) => store) }
})

const BASE_FILTERS: AnalyticsQueryParams = { time_period: TimePeriod.LAST_HOUR }

const MOCK_SESSIONS: SessionRow[] = [
  {
    trace_id: 'abc-123',
    developer_name: 'alice@co.com',
    repository: 'proj-a',
    start_time: '2026-07-22T10:00:00Z',
    duration_ms: 60000,
    model_name: 'claude-3',
    input_tokens: 1000,
    output_tokens: 500,
    cost_usd: 0.05,
    tool_call_count: 3,
    prompt: 'Hello world',
    turns: 2,
    branch: 'main',
    cache_read_tokens: 100,
    cache_creation_tokens: 50,
    net_lines: 0,
  },
  {
    trace_id: 'def-456',
    developer_name: 'bob@co.com',
    repository: 'proj-b',
    start_time: '2026-07-22T11:00:00Z',
    duration_ms: 90000,
    model_name: 'claude-3',
    input_tokens: 2000,
    output_tokens: 800,
    cost_usd: 0.1,
    tool_call_count: 5,
    prompt: 'Fix the bug',
    turns: 4,
    branch: 'feature/fix',
    cache_read_tokens: 200,
    cache_creation_tokens: 100,
    net_lines: 0,
  },
]

describe('useCliAnalyticsSessions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    cliAnalyticsStore.sessions = null
    cliAnalyticsStore.loading = {}
    cliAnalyticsStore.error = {}
  })

  it('has initial state: page=1, perPage=20, search=""', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))

    expect(result.current.page).toBe(1)
    expect(result.current.perPage).toBe(20)
    expect(result.current.search).toBe('')
  })

  it('calls fetchSessions with 0-indexed page param', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))

    await waitFor(() => {
      expect(fetchSessions).toHaveBeenCalledWith(expect.objectContaining({ page: 0, per_page: 20 }))
    })
  })

  it('joins repositories as comma-separated string', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsSessions(BASE_FILTERS, ['repo-a', 'repo-b']))

    await waitFor(() => {
      expect(fetchSessions).toHaveBeenCalledWith(
        expect.objectContaining({ repositories: 'repo-a,repo-b' })
      )
    })
  })

  it('omits repositories param when array is empty', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsSessions(BASE_FILTERS, []))

    await waitFor(() => {
      expect(fetchSessions).toHaveBeenCalledWith(
        expect.objectContaining({ repositories: undefined })
      )
    })
  })

  it('resets page to 1 when repositories filter changes', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams; repositories?: string[] }) =>
        useCliAnalyticsSessions(props.filters, props.repositories),
      { initialProps: { filters: BASE_FILTERS, repositories: undefined as string[] | undefined } }
    )

    act(() => {
      result.current.setPage(3)
    })
    expect(result.current.page).toBe(3)

    rerender({ filters: BASE_FILTERS, repositories: ['repo-a'] })

    await waitFor(() => {
      expect(result.current.page).toBe(1)
    })
    expect(fetchSessions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }))
  })

  it('joins projects array as comma-separated string', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    renderHook(() =>
      useCliAnalyticsSessions({
        time_period: TimePeriod.LAST_HOUR,
        projects: ['proj-a', 'proj-b'],
      })
    )

    await waitFor(() => {
      expect(fetchSessions).toHaveBeenCalledWith(
        expect.objectContaining({ projects: 'proj-a,proj-b' })
      )
    })
  })

  it('returns empty displayRows when sessions is null', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))

    expect(result.current.displayRows).toEqual([])
  })

  it('returns displayRows from store sessions', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)
    cliAnalyticsStore.sessions = { sessions: MOCK_SESSIONS, page: 0, per_page: 20, total: 2 }

    const { result } = renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))

    expect(result.current.displayRows).toHaveLength(2)
  })

  it('passes search to API after debounce', async () => {
    vi.useFakeTimers()
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)
    cliAnalyticsStore.sessions = { sessions: MOCK_SESSIONS, page: 0, per_page: 20, total: 2 }

    const { result } = renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))

    act(() => {
      result.current.setSearch('alice')
    })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(fetchSessions).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'alice' }))
    vi.useRealTimers()
  })

  it('does not pass search to API when empty', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)
    cliAnalyticsStore.sessions = { sessions: MOCK_SESSIONS, page: 0, per_page: 20, total: 2 }

    renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))

    expect(fetchSessions).toHaveBeenLastCalledWith(expect.objectContaining({ search: undefined }))
  })

  it('computes totalPages correctly', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)
    cliAnalyticsStore.sessions = { sessions: MOCK_SESSIONS, page: 0, per_page: 20, total: 45 }

    const { result } = renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))

    expect(result.current.totalPages).toBe(3)
  })

  it('totalPages is minimum 1 when sessions is null', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))

    expect(result.current.totalPages).toBe(1)
  })

  it('resets page to 1 when global filter changes', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams }) => useCliAnalyticsSessions(props.filters),
      { initialProps: { filters: BASE_FILTERS } }
    )

    act(() => {
      result.current.setPage(3)
    })

    expect(result.current.page).toBe(3)

    rerender({ filters: { time_period: TimePeriod.LAST_24_HOURS } })

    await waitFor(() => {
      expect(result.current.page).toBe(1)
    })
    expect(fetchSessions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }))
  })

  it('calls abort controller on unmount', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)
    const mockAbort = vi.fn()
    cliAnalyticsStore.abortControllers.set('sessions', {
      abort: mockAbort,
    } as unknown as AbortController)

    const { unmount } = renderHook(() => useCliAnalyticsSessions(BASE_FILTERS))
    unmount()

    expect(mockAbort).toHaveBeenCalled()
  })

  it('forwards isUnattributed option as is_unattributed param to fetchSessions', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsSessions(BASE_FILTERS, undefined, { isUnattributed: true }))

    await waitFor(() => {
      expect(fetchSessions).toHaveBeenCalledWith(expect.objectContaining({ is_unattributed: true }))
    })
  })

  it('omits is_unattributed param when isUnattributed option is false', async () => {
    const fetchSessions = vi.spyOn(cliAnalyticsStore, 'fetchSessions').mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsSessions(BASE_FILTERS, undefined, { isUnattributed: false }))

    await waitFor(() => {
      expect(fetchSessions).toHaveBeenCalledWith(
        expect.not.objectContaining({ is_unattributed: true })
      )
    })
  })
})
