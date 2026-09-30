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

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getPersistedSidebarSections,
  setPersistedSidebarSection,
  useResyncPersistedSidebarSections,
} from '../useChatSidebarSectionPersistence'

// Backs the mocked storage module with an in-memory record, so getObject/put behave like the
// real localStorage-backed implementation instead of the setupTests.unit.ts stub (which always
// returns []) — this is what lets the second test prove a genuine round trip.
const backingStore = vi.hoisted(() => new Map<string, unknown>())

const mockStorage = vi.hoisted(() => ({
  put: vi.fn((userId: string, key: string, value: unknown) => {
    backingStore.set(`${userId}_${key}`, value)
  }),
  get: vi.fn(),
  getObject: vi.fn((userId: string, key: string, defaultValue: unknown) => {
    const compoundKey = `${userId}_${key}`
    return backingStore.has(compoundKey) ? backingStore.get(compoundKey) : defaultValue
  }),
  remove: vi.fn(),
}))
vi.mock('@/utils/storage', () => ({ default: mockStorage }))

const mockUserStore = vi.hoisted(() => ({
  user: { userId: 'user-1' } as { userId: string } | null,
}))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

beforeEach(() => {
  backingStore.clear()
  mockUserStore.user = { userId: 'user-1' }
  mockStorage.put.mockClear()
  mockStorage.getObject.mockClear()
})

describe('useChatSidebarSectionPersistence (EPMCDME-15211)', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(getPersistedSidebarSections()).toEqual({
      pinnedExpanded: true,
      recentAssistantsExpanded: true,
    })
  })

  it('round-trips a patched value through storage', () => {
    setPersistedSidebarSection({ pinnedExpanded: false })

    expect(getPersistedSidebarSections()).toEqual({
      pinnedExpanded: false,
      recentAssistantsExpanded: true,
    })
  })

  it('does not read the anonymous bucket before auth resolves (EPMCDME-15211 CR-006)', () => {
    mockUserStore.user = null

    expect(getPersistedSidebarSections()).toEqual({
      pinnedExpanded: true,
      recentAssistantsExpanded: true,
    })
    expect(mockStorage.getObject).not.toHaveBeenCalled()
  })

  it('does not write the anonymous bucket before auth resolves (EPMCDME-15211 CR-006)', () => {
    mockUserStore.user = null

    setPersistedSidebarSection({ pinnedExpanded: false })

    expect(mockStorage.put).not.toHaveBeenCalled()
  })

  it("does not mix a previously-anonymous read into another user's bucket once auth resolves (EPMCDME-15211 CR-006)", () => {
    mockUserStore.user = null
    expect(getPersistedSidebarSections().pinnedExpanded).toBe(true)

    mockUserStore.user = { userId: 'user-1' }
    setPersistedSidebarSection({ pinnedExpanded: false })

    expect(getPersistedSidebarSections()).toEqual({
      pinnedExpanded: false,
      recentAssistantsExpanded: true,
    })
  })
})

describe('useResyncPersistedSidebarSections (EPMCDME-15211 CR-006)', () => {
  it('does not call onHydrate when userId is already present on mount', () => {
    const onHydrate = vi.fn()
    renderHook(() => useResyncPersistedSidebarSections(onHydrate))

    expect(onHydrate).not.toHaveBeenCalled()
  })

  it('calls onHydrate exactly once when userId transitions from absent to present', () => {
    mockUserStore.user = null
    const onHydrate = vi.fn()
    const { rerender } = renderHook(() => useResyncPersistedSidebarSections(onHydrate))

    expect(onHydrate).not.toHaveBeenCalled()

    mockUserStore.user = { userId: 'user-1' }
    rerender()

    expect(onHydrate).toHaveBeenCalledTimes(1)

    mockUserStore.user = { userId: 'user-2' }
    rerender()

    expect(onHydrate).toHaveBeenCalledTimes(1)
  })
})
