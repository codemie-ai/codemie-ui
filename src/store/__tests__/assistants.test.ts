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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assistantsStore } from '@/store/assistants'

const mockGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { appInfo: null },
}))

vi.mock('@/store/preferences', () => ({
  preferencesStore: { preferences: null },
}))

vi.mock('@/store/user', () => ({
  userStore: { user: null },
}))

describe('assistantsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getHedgeableToolkits', () => {
    it('calls the correct API endpoint', async () => {
      mockGet.mockResolvedValue({ json: async () => [] })

      await assistantsStore.getHedgeableToolkits()

      expect(mockGet).toHaveBeenCalledTimes(1)
      expect(mockGet).toHaveBeenCalledWith('v1/assistants/hedgeable_tools')
    })

    it('stores the returned toolkits in hedgeableToolkits state', async () => {
      const mockToolkits = [
        { toolkit: 'web_search', tools: [{ name: 'search', label: 'Search' }] },
        { toolkit: 'calculator', tools: [{ name: 'calc', label: 'Calculator' }] },
      ]
      mockGet.mockResolvedValue({ json: async () => mockToolkits })

      await assistantsStore.getHedgeableToolkits()

      expect(assistantsStore.hedgeableToolkits).toEqual(mockToolkits)
    })

    it('returns the toolkits array from the response', async () => {
      const mockToolkits = [{ toolkit: 'web_search', tools: [] }]
      mockGet.mockResolvedValue({ json: async () => mockToolkits })

      const result = await assistantsStore.getHedgeableToolkits()

      expect(result).toEqual(mockToolkits)
    })

    it('stores an empty array when the response is empty', async () => {
      mockGet.mockResolvedValue({ json: async () => [] })

      const result = await assistantsStore.getHedgeableToolkits()

      expect(result).toEqual([])
      expect(assistantsStore.hedgeableToolkits).toEqual([])
    })
  })
})
