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

import { useCliAnalyticsBranches } from '../useCliAnalyticsBranches'
import { useCliAnalyticsProjectRepositories } from '../useCliAnalyticsProjectRepositories'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn((store: unknown) => store) }
})

const FILTERS: AnalyticsQueryParams = { time_period: TimePeriod.LAST_HOUR, projects: ['other'] }

beforeEach(() => {
  vi.restoreAllMocks()
  cliAnalyticsStore.projectRepositories = null
  cliAnalyticsStore.branches = null
  cliAnalyticsStore.loading = {}
  cliAnalyticsStore.error = {}
})

describe('useCliAnalyticsProjectRepositories', () => {
  it('sends the project scope as projects, with 0-based page and per_page 10', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchProjectRepositories').mockResolvedValue()

    renderHook(() => useCliAnalyticsProjectRepositories(FILTERS, { projectName: 'P' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: 'P',
          is_project_unattributed: undefined,
          page: 0,
          per_page: 10,
        })
      )
    )
  })

  it('sends the unattributed scope without projects', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchProjectRepositories').mockResolvedValue()

    renderHook(() => useCliAnalyticsProjectRepositories(FILTERS, { isProjectUnattributed: true }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ projects: undefined, is_project_unattributed: true })
      )
    )
  })

  it('starts at the initial page, clamps setPage at 0 and reports page changes', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchProjectRepositories').mockResolvedValue()
    const onPageChange = vi.fn()

    const { result } = renderHook(() =>
      useCliAnalyticsProjectRepositories(
        FILTERS,
        { projectName: 'P' },
        { initialPage: 2, onPageChange }
      )
    )
    expect(result.current.page).toBe(2)

    act(() => result.current.setPage(-3))

    expect(result.current.page).toBe(0)
    expect(onPageChange).toHaveBeenCalledWith(0)
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }))
    )
  })

  it('resets the page without a request carrying the old page when a filter changes', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchProjectRepositories').mockResolvedValue()

    const { result, rerender } = renderHook(
      (props: { filters: AnalyticsQueryParams }) =>
        useCliAnalyticsProjectRepositories(props.filters, { projectName: 'P' }),
      { initialProps: { filters: FILTERS } }
    )
    act(() => result.current.setPage(3))
    fetch.mockClear()

    rerender({ filters: { ...FILTERS, users: ['a@co.com'] } })

    await waitFor(() => expect(result.current.page).toBe(0))
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ users: 'a@co.com', page: 0 }))
    expect(fetch).not.toHaveBeenCalledWith(expect.objectContaining({ page: 3 }))
  })

  it('computes totalPages from total_count and refetches on retry', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchProjectRepositories').mockResolvedValue()
    cliAnalyticsStore.projectRepositories = {
      rows: [],
      pagination: { page: 0, per_page: 10, total_count: 25, has_more: true },
    }

    const { result } = renderHook(() =>
      useCliAnalyticsProjectRepositories(FILTERS, { projectName: 'P' })
    )
    expect(result.current.totalPages).toBe(3)
    expect(result.current.perPage).toBe(10)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    act(() => result.current.retry())

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })
})

describe('useCliAnalyticsBranches', () => {
  it('sends repository and project scope with 0-based page and per_page 10', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchBranches').mockResolvedValue()

    renderHook(() => useCliAnalyticsBranches(FILTERS, 'repo-a', { projectName: 'P' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ projects: 'P', repository: 'repo-a', page: 0, per_page: 10 })
      )
    )
  })

  it('sends the unattributed project scope without projects', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchBranches').mockResolvedValue()

    renderHook(() => useCliAnalyticsBranches(FILTERS, 'repo-a', { isProjectUnattributed: true }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ projects: undefined, is_project_unattributed: true })
      )
    )
  })

  it('resets the page when the repository changes', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchBranches').mockResolvedValue()

    const { result, rerender } = renderHook(
      (props: { repository: string }) =>
        useCliAnalyticsBranches(FILTERS, props.repository, { projectName: 'P' }),
      { initialProps: { repository: 'repo-a' } }
    )
    act(() => result.current.setPage(2))
    fetch.mockClear()

    rerender({ repository: 'repo-b' })

    await waitFor(() => expect(result.current.page).toBe(0))
    expect(fetch).toHaveBeenLastCalledWith(
      expect.objectContaining({ repository: 'repo-b', page: 0 })
    )
    expect(fetch).not.toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
  })

  it('computes totalPages and refetches on retry', async () => {
    const fetch = vi.spyOn(cliAnalyticsStore, 'fetchBranches').mockResolvedValue()
    cliAnalyticsStore.branches = {
      rows: [],
      pagination: { page: 0, per_page: 10, total_count: 11, has_more: true },
    }

    const { result } = renderHook(() =>
      useCliAnalyticsBranches(FILTERS, 'repo-a', { projectName: 'P' })
    )
    expect(result.current.totalPages).toBe(2)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    act(() => result.current.retry())

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })
})
