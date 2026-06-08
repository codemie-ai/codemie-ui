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

import { useTermsAndConditions } from '../useTermsAndConditions'

const { mockAppInfoStore, mockUserStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    configs: [] as Array<{
      id: string
      settings: {
        enabled: boolean
        availableForExternal?: boolean
        content?: string
      }
    }>,
    isConfigFetched: false,
  },
  mockUserStore: {
    user: null as null | { user_type: string },
  },
}))

vi.mock('valtio', () => ({
  proxy: vi.fn((store) => store),
  useSnapshot: vi.fn((store) => store),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/store', () => ({
  userStore: mockUserStore,
}))

describe('useTermsAndConditions', () => {
  beforeEach(() => {
    mockAppInfoStore.configs = []
    mockAppInfoStore.isConfigFetched = false
    mockUserStore.user = { user_type: 'internal' }
  })

  it('is loading and disabled before customer config is fetched', () => {
    const { result } = renderHook(() => useTermsAndConditions())

    expect(result.current).toEqual({
      isLoaded: false,
      isEnabled: false,
      content: undefined,
    })
  })

  it('returns configured content for an enabled internal user', () => {
    mockAppInfoStore.isConfigFetched = true
    mockAppInfoStore.configs = [
      {
        id: 'termsAndConditions',
        settings: {
          enabled: true,
          availableForExternal: false,
          content: '## Approved terms',
        },
      },
    ]

    const { result } = renderHook(() => useTermsAndConditions())

    expect(result.current).toEqual({
      isLoaded: true,
      isEnabled: true,
      content: '## Approved terms',
    })
  })

  it('is disabled when the component is absent', () => {
    mockAppInfoStore.isConfigFetched = true

    const { result } = renderHook(() => useTermsAndConditions())

    expect(result.current).toEqual({
      isLoaded: true,
      isEnabled: false,
      content: undefined,
    })
  })

  it('is disabled for an external user when availableForExternal is false', () => {
    mockAppInfoStore.isConfigFetched = true
    mockAppInfoStore.configs = [
      {
        id: 'termsAndConditions',
        settings: {
          enabled: true,
          availableForExternal: false,
          content: '## Internal terms',
        },
      },
    ]
    mockUserStore.user = { user_type: 'external' }

    const { result } = renderHook(() => useTermsAndConditions())

    expect(result.current).toEqual({
      isLoaded: true,
      isEnabled: false,
      content: undefined,
    })
  })

  it('keeps enabled true when configured content is blank', () => {
    mockAppInfoStore.isConfigFetched = true
    mockAppInfoStore.configs = [
      {
        id: 'termsAndConditions',
        settings: {
          enabled: true,
          availableForExternal: false,
          content: '   ',
        },
      },
    ]

    const { result } = renderHook(() => useTermsAndConditions())

    expect(result.current).toEqual({
      isLoaded: true,
      isEnabled: true,
      content: '   ',
    })
  })
})
