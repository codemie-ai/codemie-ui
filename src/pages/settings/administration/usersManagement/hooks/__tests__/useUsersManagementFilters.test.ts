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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FILTER_INITIAL_STATE } from '@/pages/settings/administration/usersManagement/constants'
import {
  USERS_FILTER_KEYS,
  useUsersManagementFilters,
} from '@/pages/settings/administration/usersManagement/hooks/useUsersManagementFilters'
import { userStore } from '@/store/user'
import { FILTER_ENTITY, checkEmptyFilters, getFilters, setFilters } from '@/utils/filters'
import storage from '@/utils/storage'

describe('useUsersManagementFilters — is_active', () => {
  beforeEach(() => {
    userStore.user = { userId: 'filters-user' } as never
    const store = new Map<string, unknown>()
    vi.mocked(storage.put).mockImplementation((_user, key, value) => {
      store.set(key, JSON.parse(JSON.stringify(value)))
    })
    vi.mocked(storage.getObject).mockImplementation(
      ((_user: string, key: string) => store.get(key) ?? {}) as never
    )
    window.history.replaceState({}, '', '/')
  })

  it('starts with is_active null', () => {
    const { result } = renderHook(() => useUsersManagementFilters())
    expect(result.current.filters.is_active).toBeNull()
  })

  it('persists is_active=false and restores it on mount', () => {
    const first = renderHook(() => useUsersManagementFilters())
    act(() =>
      first.result.current.handleFilterChange({ ...FILTER_INITIAL_STATE, is_active: false })
    )

    expect(first.result.current.filters.is_active).toBe(false)
    expect(getFilters(FILTER_ENTITY.USERS_MANAGEMENT, USERS_FILTER_KEYS)).toEqual(
      expect.objectContaining({ is_active: false })
    )

    window.history.replaceState({}, '', '/')
    const second = renderHook(() => useUsersManagementFilters())
    expect(second.result.current.filters.is_active).toBe(false)
  })

  it('persists and restores is_active=true', () => {
    const first = renderHook(() => useUsersManagementFilters())
    act(() => first.result.current.handleFilterChange({ ...FILTER_INITIAL_STATE, is_active: true }))

    window.history.replaceState({}, '', '/')
    const second = renderHook(() => useUsersManagementFilters())
    expect(second.result.current.filters.is_active).toBe(true)
  })

  it('treats null as absent after switching back to All', () => {
    const { result } = renderHook(() => useUsersManagementFilters())
    act(() => result.current.handleFilterChange({ ...FILTER_INITIAL_STATE, is_active: false }))
    act(() => result.current.handleFilterChange({ ...FILTER_INITIAL_STATE, is_active: null }))

    expect(result.current.filters.is_active).toBeNull()
    window.history.replaceState({}, '', '/')
    const again = renderHook(() => useUsersManagementFilters())
    expect(again.result.current.filters.is_active).toBeNull()
  })

  it('falls back to null when a stored is_active is not boolean', () => {
    setFilters(FILTER_ENTITY.USERS_MANAGEMENT, { is_active: 'banana' })
    window.history.replaceState({}, '', '/')
    const { result } = renderHook(() => useUsersManagementFilters())
    expect(result.current.filters.is_active).toBeNull()
  })

  it('does not consider is_active=false an empty filter set', () => {
    expect(checkEmptyFilters({ ...FILTER_INITIAL_STATE, is_active: false })).toBe(false)
    expect(checkEmptyFilters({ ...FILTER_INITIAL_STATE, is_active: null })).toBe(true)
  })
})
