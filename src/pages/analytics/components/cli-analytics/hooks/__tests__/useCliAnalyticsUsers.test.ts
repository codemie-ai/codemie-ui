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
import api from '@/utils/api'

import { useCliAnalyticsUsers } from '../useCliAnalyticsUsers'

const BASE_FILTERS: AnalyticsQueryParams = { time_period: TimePeriod.LAST_HOUR }

describe('useCliAnalyticsUsers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    cliAnalyticsStore.users = null
    cliAnalyticsStore.loading = {}
    cliAnalyticsStore.error = {}
  })

  it('surfaces pending and rejected state of the real users executors after a filter change', async () => {
    const get = vi.spyOn(api, 'get')
    const ok = { json: async () => ({ data: { rows: [], total_count: 0 } }) } as Response
    get.mockResolvedValue(ok)
    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams }) => useCliAnalyticsUsers(props.filters),
      { initialProps: { filters: BASE_FILTERS } }
    )
    // Unit setup replaces useSnapshot with a non-reactive store read, so re-render to observe the store.
    let current = { filters: BASE_FILTERS }
    const observe = (next = current) => {
      current = next
      rerender(next)
      return result.current
    }
    await waitFor(() => expect(observe().loading).toBe(false))

    const pending: Array<(r: Response) => void> = []
    get.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          pending.push(resolve)
        }) as ReturnType<typeof api.get>
    )
    observe({ filters: { ...BASE_FILTERS, users: ['a@co.com'] } })
    await waitFor(() => expect(observe().loading).toBe(true))
    await act(async () => {
      pending.forEach((resolve) => resolve(ok))
    })
    await waitFor(() => expect(observe().loading).toBe(false))

    get.mockRejectedValue(new Error('boom'))
    observe({ filters: { ...BASE_FILTERS, users: ['b@co.com'] } })
    await waitFor(() => expect(observe().error).toBe('boom'))
  })

  it('sends a filter change to the table request and resets the table page', async () => {
    const fetchTable = vi.spyOn(cliAnalyticsStore, 'fetchUsersTable').mockResolvedValue(undefined)

    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams }) => useCliAnalyticsUsers(props.filters),
      { initialProps: { filters: BASE_FILTERS } }
    )
    act(() => result.current.setPage(2))
    expect(result.current.currentPage).toBe(2)

    rerender({
      filters: { ...BASE_FILTERS, users: ['a@co.com'] },
    })

    await waitFor(() => expect(result.current.currentPage).toBe(0))
    expect(fetchTable).toHaveBeenLastCalledWith(
      expect.objectContaining({ users: 'a@co.com', page: 0 })
    )
    // The page resets with the filters: no request carries the new filters with the old page.
    expect(fetchTable).not.toHaveBeenCalledWith(
      expect.objectContaining({ users: 'a@co.com', page: 2 })
    )
  })

  it('defaults to 10 rows and goes back to the first page when the page size changes', async () => {
    const fetchTable = vi.spyOn(cliAnalyticsStore, 'fetchUsersTable').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsUsers(BASE_FILTERS))
    expect(result.current.pageSize).toBe(10)
    expect(fetchTable).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, per_page: 10 }))

    act(() => result.current.setPage(3))
    await waitFor(() =>
      expect(fetchTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 3, per_page: 10 })
      )
    )

    act(() => result.current.setPage(0, 50))
    await waitFor(() =>
      expect(fetchTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 0, per_page: 50 })
      )
    )
    expect(result.current.pageSize).toBe(50)
  })

  it('asks for the cost-share chart in the page request and reads the chart rows from its answer', async () => {
    const chart = [
      { developer_name: 'a@example.com', cost_usd: 3 },
      { developer_name: 'b@example.com', cost_usd: 1 },
    ]
    const get = vi.spyOn(api, 'get').mockResolvedValue({
      json: async () => ({
        data: { rows: [], total_count: 2, avg_session_duration_ms: null, chart },
      }),
    } as Response)

    const { result, rerender } = renderHook(() => useCliAnalyticsUsers(BASE_FILTERS))
    await waitFor(() => expect(get).toHaveBeenCalled())
    await act(async () => {})
    rerender()

    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith(
      'v1/analytics/cli-analytics/users',
      expect.objectContaining({
        params: expect.objectContaining({
          include_chart: true,
          include_daily_activity: false,
          include_avg_duration: false,
          page: 0,
          per_page: 10,
        }),
      })
    )
    expect(result.current.chartRows).toEqual(chart)
  })
})
