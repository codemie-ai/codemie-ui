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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { providersStore } from '@/store/providers'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: vi.fn(),
    params: {},
  }),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    info: vi.fn(),
  },
}))

const mockProviders = [
  { id: '1', name: 'Provider 1' },
  { id: '2', name: 'Provider 2' },
]

describe('ProvidersManagementPage Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    providersStore.providers = []
    providersStore.loading = false
    providersStore.error = null
  })

  it('initializes with empty providers array', () => {
    expect(providersStore.providers).toEqual([])
  })

  it('has loading state', () => {
    expect(providersStore.loading).toBe(false)
  })

  it('has error state', () => {
    expect(providersStore.error).toBeNull()
  })

  it('has indexProviders method', () => {
    expect(typeof providersStore.indexProviders).toBe('function')
  })

  it('has deleteProvider method', () => {
    expect(typeof providersStore.deleteProvider).toBe('function')
  })

  it('can set providers', () => {
    providersStore.providers = mockProviders
    expect(providersStore.providers).toEqual(mockProviders)
    expect(providersStore.providers).toHaveLength(2)
  })

  it('can set loading state', () => {
    providersStore.loading = true
    expect(providersStore.loading).toBe(true)
  })
})
