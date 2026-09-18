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

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { TimePeriod } from '@/types/analytics'

import { DEFAULT_FILTERS } from '../../constants'
import { useAnalyticsFilters } from '../useAnalyticsFilters'

const mockGetFiltersFromUrl = vi.hoisted(() => vi.fn(() => ({})))
const mockGetFilters = vi.hoisted(() => vi.fn(() => ({})))
const mockSetFilters = vi.hoisted(() => vi.fn())
const mockStoragePut = vi.hoisted(() => vi.fn())
const mockGetFilterStorageKey = vi.hoisted(() => vi.fn((k: string) => `filters_${k}`))
const mockUserStore = vi.hoisted(() => ({ user: null as { userId: string } | null }))
const mockSearchParams = vi.hoisted(() => new URLSearchParams())

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useSearchParams: vi.fn(() => [mockSearchParams, vi.fn()]) }
})
vi.mock('valtio', () => ({
  useSnapshot: vi.fn((s: unknown) => s),
  proxy: (o: unknown) => o,
  subscribe: vi.fn(),
}))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/utils/filters', () => ({
  FILTER_ENTITY: { ANALYTICS: 'analytics' },
  getFilters: mockGetFilters,
  getFiltersFromUrl: mockGetFiltersFromUrl,
  setFilters: mockSetFilters,
  getFilterStorageKey: mockGetFilterStorageKey,
}))
vi.mock('@/utils/storage', () => ({ default: { put: mockStoragePut } }))
vi.mock('@/utils/helpers', () => ({ cleanObject: (o: unknown) => o }))

describe('useAnalyticsFilters', () => {
  beforeEach(() => {
    mockSetFilters.mockClear()
    mockStoragePut.mockClear()
    mockGetFilters.mockReturnValue({})
    mockGetFiltersFromUrl.mockReturnValue({})
    mockUserStore.user = null
    ;[...mockSearchParams.keys()].forEach((k) => mockSearchParams.delete(k))
  })

  it('does not run filter logic when userId is not yet available', () => {
    renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).not.toHaveBeenCalled()
    expect(mockStoragePut).not.toHaveBeenCalled()
  })

  it('URL present, all valid: storage.put called with URL values; setFilters NOT called; state reflects URL', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ time_period: TimePeriod.LAST_7_DAYS, users: ['alice'] })
    const { result } = renderHook(() => useAnalyticsFilters())
    expect(mockStoragePut).toHaveBeenCalledWith('u1', 'filters_analytics', {
      time_period: TimePeriod.LAST_7_DAYS,
      users: ['alice'],
    })
    expect(mockSetFilters).not.toHaveBeenCalled()
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_7_DAYS)
    expect(result.current.filters.users).toEqual(['alice'])
  })

  it('URL present, malformed time_period: dropped without substituting a period; setFilters rewrites URL', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ time_period: 'garbage' as TimePeriod })
    const { result } = renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', DEFAULT_FILTERS)
    expect(result.current.filters.time_period).toBeUndefined()
  })

  it('URL present, malformed start_date but valid end_date: valid sibling retained; setFilters rewrites URL', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ start_date: 'not-a-date', end_date: '2024-01-01' })
    renderHook(() => useAnalyticsFilters())
    // start_date dropped; end_date kept; no period substituted; wasSanitized → setFilters rewrites URL
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', {
      end_date: '2024-01-01',
    })
  })

  it('URL absent and localStorage empty: no time period is applied and none is written to the URL', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({})
    mockGetFilters.mockReturnValue({})
    const { result } = renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', {})
    expect(result.current.filters.time_period).toBeUndefined()
    expect(result.current.filters.start_date).toBeUndefined()
    expect(result.current.filters.end_date).toBeUndefined()
  })

  it('URL absent, localStorage has values: setFilters called with storage values', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({})
    mockGetFilters.mockReturnValue({ time_period: TimePeriod.LAST_30_DAYS })
    const { result } = renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', {
      time_period: TimePeriod.LAST_30_DAYS,
    })
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_30_DAYS)
  })

  it('URL absent, localStorage empty: DEFAULT_FILTERS applied via setFilters', () => {
    mockUserStore.user = { userId: 'u1' }
    renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', DEFAULT_FILTERS)
  })

  it('localStorage branch: getFilters called with ANALYTICS_FILTER_KEYS to prevent non-analytics key leakage', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({})
    renderHook(() => useAnalyticsFilters())
    expect(mockGetFilters).toHaveBeenCalledWith(
      'analytics',
      expect.objectContaining({
        simple: expect.arrayContaining(['time_period', 'start_date', 'end_date']),
        multiple: expect.arrayContaining(['users', 'projects']),
      })
    )
  })

  it('handleFilterChange with non-empty value calls setFilters with those values and updates state', async () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({})
    const { result } = renderHook(() => useAnalyticsFilters())
    mockSetFilters.mockClear()
    await act(async () => {
      await result.current.handleFilterChange({ time_period: TimePeriod.LAST_7_DAYS })
    })
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', {
      time_period: TimePeriod.LAST_7_DAYS,
    })
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_7_DAYS)
  })

  it('handleFilterChange with all-empty values writes DEFAULT_FILTERS', async () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ time_period: TimePeriod.LAST_HOUR })
    const { result } = renderHook(() => useAnalyticsFilters())
    mockSetFilters.mockClear()
    await act(async () => {
      await result.current.handleFilterChange({
        time_period: undefined,
        users: [],
        projects: [],
        start_date: '',
        end_date: '',
      })
    })
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', DEFAULT_FILTERS)
  })

  it('userId becomes available after mount: filters restored from localStorage', () => {
    mockGetFiltersFromUrl.mockReturnValue({})
    mockGetFilters.mockReturnValue({ time_period: TimePeriod.LAST_24_HOURS })
    const { result, rerender } = renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).not.toHaveBeenCalled()
    mockUserStore.user = { userId: 'u1' }
    rerender()
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', {
      time_period: TimePeriod.LAST_24_HOURS,
    })
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_24_HOURS)
  })

  it('handleFilterChange: setFilters throws → filterState is NOT updated', async () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ time_period: TimePeriod.LAST_7_DAYS })
    const { result } = renderHook(() => useAnalyticsFilters())
    const stateBefore = result.current.filters.time_period
    mockSetFilters.mockClear()
    mockSetFilters.mockImplementationOnce(() => {
      throw new Error('QuotaExceededError')
    })
    await act(async () => {
      await result.current.handleFilterChange({ time_period: TimePeriod.LAST_30_DAYS })
    })
    expect(result.current.filters.time_period).toBe(stateBefore)
  })

  it('isValidISODate: trailing garbage is rejected', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ start_date: '2024-01-01garbage' })
    renderHook(() => useAnalyticsFilters())
    // start_date is invalid → dropped; setFilters rewrites URL with only time_period fallback
    expect(mockSetFilters).toHaveBeenCalledWith(
      'analytics',
      expect.not.objectContaining({ start_date: '2024-01-01garbage' })
    )
  })

  it('isValidISODate: full ISO timestamps emitted by DatePicker are accepted', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-31T23:59:59Z',
    })
    const { result } = renderHook(() => useAnalyticsFilters())
    expect(result.current.filters.start_date).toBe('2024-01-01T00:00:00Z')
    expect(result.current.filters.end_date).toBe('2024-01-31T23:59:59Z')
  })

  it('isValidISODate: impossible calendar values are rejected', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ start_date: '2024-99-99' })
    renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).toHaveBeenCalledWith(
      'analytics',
      expect.not.objectContaining({ start_date: '2024-99-99' })
    )
  })

  it('URL has valid filter params AND userId is unavailable at first render: once userId arrives, localStorage is written with URL values and filters reflect them (AC 4 + AC 9)', () => {
    // Covers the scenario where resolveInitialFilters returns {} (userId null),
    // then the effect re-runs when userId becomes available and must write localStorage.
    mockUserStore.user = null
    mockGetFiltersFromUrl.mockReturnValue({ time_period: TimePeriod.LAST_7_DAYS })
    const { result, rerender } = renderHook(() => useAnalyticsFilters())
    // Before userId: no writes
    expect(mockStoragePut).not.toHaveBeenCalled()
    expect(mockSetFilters).not.toHaveBeenCalled()
    // userId arrives
    mockUserStore.user = { userId: 'u1' }
    rerender()
    // URL params are valid → storage.put (not setFilters); no URL rewrite needed
    expect(mockStoragePut).toHaveBeenCalledWith('u1', 'filters_analytics', {
      time_period: TimePeriod.LAST_7_DAYS,
    })
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_7_DAYS)
  })
})
