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
import { beforeEach, describe, expect, it } from 'vitest'

import { preferencesStore } from '@/store/preferences'
import { UserPreferences } from '@/types/entity/favorites'

import { useIsAssistantFavorited, useIsAssistantPinned } from '../useAssistantPreferenceFlags'

describe('useAssistantPreferenceFlags', () => {
  beforeEach(() => {
    preferencesStore.preferences = null
  })

  it('returns false for both flags while preferences are null', () => {
    const pinned = renderHook(() => useIsAssistantPinned('a1'))
    const favorited = renderHook(() => useIsAssistantFavorited('a2'))

    expect(pinned.result.current).toBe(false)
    expect(favorited.result.current).toBe(false)
  })

  it('flips already rendered hooks when preferences arrive after mount', async () => {
    const pinnedA1 = renderHook(() => useIsAssistantPinned('a1'))
    const pinnedA2 = renderHook(() => useIsAssistantPinned('a2'))
    const favoritedA1 = renderHook(() => useIsAssistantFavorited('a1'))
    const favoritedA2 = renderHook(() => useIsAssistantFavorited('a2'))

    act(() => {
      preferencesStore.preferences = {
        user_id: 'u1',
        pinned_assistants: ['a1', ''],
        favorites: { assistants: ['a2'], skills: [], workflows: [] },
      }
    })

    await waitFor(() => expect(pinnedA1.result.current).toBe(true))
    expect(pinnedA2.result.current).toBe(false)
    expect(favoritedA1.result.current).toBe(false)
    expect(favoritedA2.result.current).toBe(true)
  })

  it('does not throw when lists are missing', () => {
    preferencesStore.preferences = { user_id: 'u1' } as unknown as UserPreferences

    const pinned = renderHook(() => useIsAssistantPinned('a1'))
    const favorited = renderHook(() => useIsAssistantFavorited('a1'))

    expect(pinned.result.current).toBe(false)
    expect(favorited.result.current).toBe(false)
  })
})
