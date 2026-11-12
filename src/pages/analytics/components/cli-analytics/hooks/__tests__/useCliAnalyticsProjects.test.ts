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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import { TimePeriod } from '@/types/analytics'
import type { AnalyticsQueryParams } from '@/types/analytics'

import { useCliAnalyticsProjects } from '../useCliAnalyticsProjects'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn((store: unknown) => store) }
})

const BASE_FILTERS: AnalyticsQueryParams = { time_period: TimePeriod.LAST_HOUR }

describe('useCliAnalyticsProjects', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    cliAnalyticsStore.projects = null
    cliAnalyticsStore.loading = {}
    cliAnalyticsStore.error = {}
  })

  it('requests the first page of 10 projects', async () => {
    const fetchProjects = vi.spyOn(cliAnalyticsStore, 'fetchProjects').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsProjects(BASE_FILTERS))

    expect(result.current.page).toBe(0)
    expect(result.current.perPage).toBe(10)
    await waitFor(() =>
      expect(fetchProjects).toHaveBeenCalledWith(
        expect.objectContaining({ time_period: TimePeriod.LAST_HOUR, page: 0, per_page: 10 })
      )
    )
  })

  it('requests the page and page size the pagination asks for', async () => {
    const fetchProjects = vi.spyOn(cliAnalyticsStore, 'fetchProjects').mockResolvedValue(undefined)
    const { result } = renderHook(() => useCliAnalyticsProjects(BASE_FILTERS))

    act(() => result.current.setPage(2, 10))
    await waitFor(() =>
      expect(fetchProjects).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, per_page: 10 })
      )
    )

    act(() => result.current.setPage(0, 50))
    await waitFor(() =>
      expect(fetchProjects).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 0, per_page: 50 })
      )
    )
  })

  it('goes back to page 0 when the filters or the search change', async () => {
    const fetchProjects = vi.spyOn(cliAnalyticsStore, 'fetchProjects').mockResolvedValue(undefined)
    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams }) => useCliAnalyticsProjects(props.filters),
      { initialProps: { filters: BASE_FILTERS } }
    )

    act(() => result.current.setPage(3, 10))
    rerender({ filters: { ...BASE_FILTERS, time_period: TimePeriod.LAST_30_DAYS } })
    await waitFor(() => expect(result.current.page).toBe(0))
    expect(fetchProjects).not.toHaveBeenCalledWith(
      expect.objectContaining({ time_period: TimePeriod.LAST_30_DAYS, page: 3 })
    )

    act(() => result.current.setPage(2, 10))
    act(() => result.current.setSearch('alpha'))
    await waitFor(() =>
      expect(fetchProjects).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'alpha', page: 0 })
      )
    )
    expect(fetchProjects).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: 'alpha', page: 2 })
    )
  })

  it('returns the rows and derives total pages from the total count', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchProjects').mockResolvedValue(undefined)
    cliAnalyticsStore.projects = {
      rows: [],
      pagination: { page: 0, per_page: 10, total_count: 23, has_more: true },
    }

    const { result } = renderHook(() => useCliAnalyticsProjects(BASE_FILTERS))

    expect(result.current.totalPages).toBe(3)
  })
})
