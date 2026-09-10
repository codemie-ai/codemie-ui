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

import { useCliAnalyticsRepositories } from '../useCliAnalyticsRepositories'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn((store: unknown) => store) }
})

const BASE_FILTERS: AnalyticsQueryParams = { time_period: TimePeriod.LAST_HOUR }

describe('useCliAnalyticsRepositories', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    cliAnalyticsStore.repositories = null
    cliAnalyticsStore.loading = {}
    cliAnalyticsStore.error = {}
  })

  it('has initial state: page=1, perPage=20', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchRepositories').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsRepositories(BASE_FILTERS))

    expect(result.current.page).toBe(1)
    expect(result.current.perPage).toBe(20)
  })

  it('calls fetchRepositories with 0-indexed page param', async () => {
    const fetchRepositories = vi
      .spyOn(cliAnalyticsStore, 'fetchRepositories')
      .mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsRepositories(BASE_FILTERS))

    await waitFor(() => {
      expect(fetchRepositories).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0, per_page: 20 })
      )
    })
  })

  it('joins repositories as comma-separated string', async () => {
    const fetchRepositories = vi
      .spyOn(cliAnalyticsStore, 'fetchRepositories')
      .mockResolvedValue(undefined)

    renderHook(() => useCliAnalyticsRepositories(BASE_FILTERS, ['repo-a', 'repo-b']))

    await waitFor(() => {
      expect(fetchRepositories).toHaveBeenCalledWith(
        expect.objectContaining({ repositories: 'repo-a,repo-b' })
      )
    })
  })

  it('returns empty rows when repositories is null', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchRepositories').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsRepositories(BASE_FILTERS))

    expect(result.current.rows).toEqual([])
  })

  it('returns rows from store when populated', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchRepositories').mockResolvedValue(undefined)
    cliAnalyticsStore.repositories = {
      rows: [
        {
          repository: 'my-repo',
          session_count: 42,
          turns: 100,
          cost_usd: 2.5,
          files_changed: 15,
          lines_added: 200,
          lines_removed: 80,
          net_lines: 120,
          tool_success_rate: 95.0,
        },
      ],
      pagination: { page: 0, per_page: 20, total_count: 1, has_more: false },
    }

    const { result } = renderHook(() => useCliAnalyticsRepositories(BASE_FILTERS))

    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0].repository).toBe('my-repo')
  })

  it('computes totalPages correctly', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchRepositories').mockResolvedValue(undefined)
    cliAnalyticsStore.repositories = {
      rows: [],
      pagination: { page: 0, per_page: 20, total_count: 45, has_more: true },
    }

    const { result } = renderHook(() => useCliAnalyticsRepositories(BASE_FILTERS))

    expect(result.current.totalPages).toBe(3)
  })

  it('totalPages is minimum 1 when repositories is null', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchRepositories').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCliAnalyticsRepositories(BASE_FILTERS))

    expect(result.current.totalPages).toBe(1)
  })

  it('resets page to 1 when global filter changes', async () => {
    const fetchRepositories = vi
      .spyOn(cliAnalyticsStore, 'fetchRepositories')
      .mockResolvedValue(undefined)

    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams }) => useCliAnalyticsRepositories(props.filters),
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
    expect(fetchRepositories).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }))
  })

  it('resets page to 1 when repositories filter changes', async () => {
    const fetchRepositories = vi
      .spyOn(cliAnalyticsStore, 'fetchRepositories')
      .mockResolvedValue(undefined)

    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams; repositories?: string[] }) =>
        useCliAnalyticsRepositories(props.filters, props.repositories),
      { initialProps: { filters: BASE_FILTERS, repositories: undefined as string[] | undefined } }
    )

    act(() => {
      result.current.setPage(2)
    })
    expect(result.current.page).toBe(2)

    rerender({ filters: BASE_FILTERS, repositories: ['repo-a'] })

    await waitFor(() => {
      expect(result.current.page).toBe(1)
    })
    expect(fetchRepositories).toHaveBeenLastCalledWith(
      expect.objectContaining({ repositories: 'repo-a' })
    )
  })

  it('calls abort controller on unmount', () => {
    vi.spyOn(cliAnalyticsStore, 'fetchRepositories').mockResolvedValue(undefined)
    const mockAbort = vi.fn()
    cliAnalyticsStore.abortControllers.set('repositories', {
      abort: mockAbort,
    } as unknown as AbortController)

    const { unmount } = renderHook(() => useCliAnalyticsRepositories(BASE_FILTERS))
    unmount()

    expect(mockAbort).toHaveBeenCalled()
  })
})
