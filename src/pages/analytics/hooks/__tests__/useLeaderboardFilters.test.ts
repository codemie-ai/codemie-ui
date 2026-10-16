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

import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { LeaderboardEntriesParams } from '@/types/analytics'

import { useLeaderboardFilters } from '../useLeaderboardFilters'

const mockUserStore = vi.hoisted(() => ({ user: null as { userId: string } | null }))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
// Real storage (setupTests.unit mocks it) so reads and writes hit localStorage.
vi.mock('@/utils/storage', async (importOriginal) => importOriginal())

const STORAGE_KEY = 'user-1_filters_analytics_leaderboard'
const DEFAULTS: LeaderboardEntriesParams = { sort_by: 'total_score', sort_order: 'desc' }
const readStored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')

describe('useLeaderboardFilters', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUserStore.user = { userId: 'user-1' }
  })

  it('starts from the defaults when nothing is stored', () => {
    const { result } = renderHook(() => useLeaderboardFilters(DEFAULTS))

    expect(result.current[0]).toEqual(DEFAULTS)
  })

  it('restores the stored object as-is without merging the defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tier: 'gold' }))

    const { result } = renderHook(() => useLeaderboardFilters(DEFAULTS))

    expect(result.current[0]).toEqual({ tier: 'gold' })
  })

  it('persists only the allow-listed keys', () => {
    const { result } = renderHook(() => useLeaderboardFilters(DEFAULTS))

    act(() =>
      result.current[1]({
        tier: 'gold',
        project: 'p1',
        search: 'ann',
        intent: 'coding',
        cli_only: true,
        sort_by: 'tier_level',
        sort_order: 'asc',
        page: 3,
        per_page: 50,
        view: 'monthly',
        season_key: 's1',
        snapshot_id: 'snap',
      })
    )

    expect(readStored()).toEqual({
      tier: 'gold',
      project: 'p1',
      search: 'ann',
      intent: 'coding',
      cli_only: true,
      sort_by: 'tier_level',
      sort_order: 'asc',
    })
  })

  it('ignores stored keys outside the allow-list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ search: 'ann', page: 4, view: 'monthly' }))

    const { result } = renderHook(() => useLeaderboardFilters(DEFAULTS))

    expect(result.current[0]).toEqual({ search: 'ann' })
  })

  it('neither reads nor writes storage without a user', () => {
    mockUserStore.user = null
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tier: 'gold' }))

    const { result } = renderHook(() => useLeaderboardFilters(DEFAULTS))
    act(() => result.current[1]({ tier: 'silver' }))

    expect(result.current[0]).toEqual({ tier: 'silver' })
    expect(readStored()).toEqual({ tier: 'gold' })
  })
})
