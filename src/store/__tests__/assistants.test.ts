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

import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { assistantsStore, normalizeAssistant } from '@/store/assistants'
import { Assistant } from '@/types/entity/assistant'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
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

  describe('saveUserMappingSettings', () => {
    it('sends every slot, using an empty integration_id for DEFAULT (base config) slots', async () => {
      mockPost.mockResolvedValue({ ok: true, json: async () => ({}) })

      const userMappingSettings = {
        'MCP_srv-a': { originalName: 'MCP:srv-a', settingId: 'int-1' }, // explicit integration
        'MCP_srv-b': { originalName: 'MCP:srv-b', settingId: null }, // DEFAULT -> base config
        Git: { originalName: 'Git', settingId: undefined }, // never selected -> default
      }

      await assistantsStore.saveUserMappingSettings('a-1', userMappingSettings as never)

      expect(mockPost).toHaveBeenCalledWith('v1/assistants/a-1/users/mapping', {
        tools_config: [
          { name: 'MCP:srv-a', integration_id: 'int-1' },
          { name: 'MCP:srv-b', integration_id: '' },
          { name: 'Git', integration_id: '' },
        ],
      })
    })
  })

  describe('getAssistantBySlug', () => {
    it('maps nested_assistants to nestedAssistants for the slug-based Edit route', async () => {
      const nested = [{ id: 'sub-1', name: 'Sub Assistant' }]
      mockGet.mockResolvedValue({
        json: async () => ({ id: 'a-1', name: 'Root', nested_assistants: nested }),
      })

      const result = await assistantsStore.getAssistantBySlug('root-slug', false, 'demo')

      expect(mockGet).toHaveBeenCalledWith('v1/assistants/slug/root-slug?project=demo', {
        skipErrorHandling: false,
      })
      expect(result.nestedAssistants).toEqual(nested)
    })

    it('defaults is_pinned and is_favorited when no preferences exist', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ id: 'a-1', name: 'Root', nested_assistants: [] }),
      })

      const result = await assistantsStore.getAssistantBySlug('root-slug', false)

      expect(result.is_pinned).toBe(false)
      expect(result.is_favorited).toBe(false)
    })
  })

  describe('getAssistant', () => {
    it('maps nested_assistants to nestedAssistants for the id-based Edit route', async () => {
      const nested = [{ id: 'sub-1', name: 'Sub Assistant' }]
      mockGet.mockResolvedValue({
        json: async () => ({ id: 'a-1', name: 'Root', nested_assistants: nested }),
      })

      const result = await assistantsStore.getAssistant('a-1')

      expect(mockGet).toHaveBeenCalledWith('v1/assistants/id/a-1', { skipErrorHandling: false })
      expect(result.nestedAssistants).toEqual(nested)
    })
  })

  describe('normalizeAssistant', () => {
    it('maps nested_assistants to nestedAssistants and defaults flags without preferences', () => {
      const nested = [{ id: 'sub-1', name: 'Sub Assistant' }]
      const raw = { id: 'a-1', name: 'Root', nested_assistants: nested } as unknown as Assistant

      const result = normalizeAssistant(raw)

      expect(result.nestedAssistants).toEqual(nested)
      expect(result.is_pinned).toBe(false)
      expect(result.is_favorited).toBe(false)
      // preserves the rest of the raw payload
      expect(result.id).toBe('a-1')
      expect(result.name).toBe('Root')
    })
  })

  describe('indexAssistants', () => {
    const mockPagination = { page: 0, per_page: 12, pages: 1, total: 2 }
    const mockTemplates = [
      { id: 't-1', name: 'Template One' },
      { id: 't-2', name: 'Template Two' },
    ]

    it('clears assistantTemplates before fetching templates scope', async () => {
      assistantsStore.assistantTemplates = [{ id: 'stale', name: 'Stale' }] as any

      let snapshotDuringFetch: unknown[] | undefined
      mockGet.mockImplementation(() => {
        snapshotDuringFetch = [...assistantsStore.assistantTemplates]
        return Promise.resolve({
          json: () => Promise.resolve({ data: mockTemplates, pagination: mockPagination }),
        })
      })

      await assistantsStore.indexAssistants(ASSISTANT_INDEX_SCOPES.TEMPLATES)

      expect(snapshotDuringFetch).toEqual([])
    })

    it('sets assistantTemplates to API response after fetch', async () => {
      mockGet.mockResolvedValue({
        json: () => Promise.resolve({ data: mockTemplates, pagination: mockPagination }),
      })

      await assistantsStore.indexAssistants(ASSISTANT_INDEX_SCOPES.TEMPLATES)

      expect(assistantsStore.assistantTemplates).toEqual(mockTemplates)
    })

    it('does not clear assistantTemplates for non-templates scope', async () => {
      assistantsStore.assistantTemplates = [{ id: 'kept', name: 'Kept' }] as any

      mockGet.mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: [],
            pagination: mockPagination,
          }),
      })

      await assistantsStore.indexAssistants(ASSISTANT_INDEX_SCOPES.ALL ?? 'all')

      expect(assistantsStore.assistantTemplates).toEqual([{ id: 'kept', name: 'Kept' }])
    })
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
