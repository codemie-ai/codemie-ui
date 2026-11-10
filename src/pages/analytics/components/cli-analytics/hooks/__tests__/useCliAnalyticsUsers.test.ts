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
    observe({ filters: { ...BASE_FILTERS, subscription_type: ['personal'] } })
    await waitFor(() => expect(observe().loading).toBe(true))
    await act(async () => {
      pending.forEach((resolve) => resolve(ok))
    })
    await waitFor(() => expect(observe().loading).toBe(false))

    get.mockRejectedValue(new Error('boom'))
    observe({
      filters: { ...BASE_FILTERS, subscription_type: ['personal'], project_origin: ['none'] },
    })
    await waitFor(() => expect(observe().error).toBe('boom'))
  })

  it('sends subscription_type and project_origin to charts and table and resets the table page', async () => {
    const fetchCharts = vi.spyOn(cliAnalyticsStore, 'fetchUsersCharts').mockResolvedValue(undefined)
    const fetchTable = vi.spyOn(cliAnalyticsStore, 'fetchUsersTable').mockResolvedValue(undefined)

    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams }) => useCliAnalyticsUsers(props.filters),
      { initialProps: { filters: BASE_FILTERS } }
    )
    act(() => result.current.setPage(2))
    expect(result.current.currentPage).toBe(2)

    rerender({
      filters: {
        ...BASE_FILTERS,
        subscription_type: ['codemie'],
        project_origin: ['linked_folder'],
      },
    })

    await waitFor(() => expect(result.current.currentPage).toBe(0))
    expect(fetchCharts).toHaveBeenLastCalledWith(
      expect.objectContaining({ subscription_type: 'codemie', project_origin: 'linked_folder' })
    )
    expect(fetchTable).toHaveBeenLastCalledWith(
      expect.objectContaining({ subscription_type: 'codemie', page: 0 })
    )
    // The page resets with the filters: no request carries the new filters with the old page.
    expect(fetchTable).not.toHaveBeenCalledWith(
      expect.objectContaining({ subscription_type: 'codemie', page: 2 })
    )
  })
})
