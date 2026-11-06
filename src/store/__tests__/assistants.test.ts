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
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/utils/api', async (importOriginal) => ({
  formatErrorMessage: (await importOriginal<typeof import('@/utils/api')>()).formatErrorMessage,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    patch: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { appInfo: null },
}))

const mockPutPreferences = vi.hoisted(() => vi.fn())
const mockPreferencesStore = vi.hoisted(() => ({
  preferences: null as unknown,
  putPreferences: vi.fn(),
}))

vi.mock('@/store/preferences', () => ({
  preferencesStore: mockPreferencesStore,
}))

vi.mock('@/store/user', () => ({
  userStore: { user: { userId: 'user-1' } },
}))

describe('assistantsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPreferencesStore.preferences = null
    mockPreferencesStore.putPreferences = mockPutPreferences
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

    it('posts the workflow scope when saving from a workflow panel', async () => {
      mockPost.mockResolvedValue({ ok: true, json: async () => ({}) })

      const userMappingSettings = {
        Git: { originalName: 'Git', settingId: 'int-1' },
      }

      await assistantsStore.saveUserMappingSettings('a-1', userMappingSettings as never, {
        workflowId: 'w-1',
        applyToAssistant: false,
      })

      expect(mockPost).toHaveBeenCalledWith('v1/assistants/a-1/users/mapping', {
        tools_config: [{ name: 'Git', integration_id: 'int-1' }],
        workflow_id: 'w-1',
        apply_to_assistant: false,
      })
    })

    it('asks the backend to apply the selection to the whole assistant', async () => {
      mockPost.mockResolvedValue({ ok: true, json: async () => ({}) })

      await assistantsStore.saveUserMappingSettings(
        'a-1',
        { Git: { originalName: 'Git', settingId: 'int-1' } } as never,
        { workflowId: 'w-1', applyToAssistant: true }
      )

      expect(mockPost).toHaveBeenCalledWith('v1/assistants/a-1/users/mapping', {
        tools_config: [{ name: 'Git', integration_id: 'int-1' }],
        workflow_id: 'w-1',
        apply_to_assistant: true,
      })
    })

    it('keeps the assistant-scoped payload when no scope is given', async () => {
      mockPost.mockResolvedValue({ ok: true, json: async () => ({}) })

      await assistantsStore.saveUserMappingSettings('a-1', {
        Git: { originalName: 'Git', settingId: 'int-1' },
      } as never)

      expect(mockPost).toHaveBeenCalledWith('v1/assistants/a-1/users/mapping', {
        tools_config: [{ name: 'Git', integration_id: 'int-1' }],
      })
    })
  })

  describe('getUserMapping', () => {
    it('requests the effective mapping for a workflow', async () => {
      mockGet.mockResolvedValue({ ok: true, json: async () => ({}) })

      await assistantsStore.getUserMapping('a-1', 'w-1')

      expect(mockGet).toHaveBeenCalledWith('v1/assistants/a-1/users/mapping?workflow_id=w-1')
    })

    it('asks what auto lookup would resolve for the displayed slots', async () => {
      mockGet.mockResolvedValue({ ok: true, json: async () => ({}) })

      await assistantsStore.getUserMapping('a-1', undefined, ['jira', 'git'])

      expect(mockGet).toHaveBeenCalledWith(
        'v1/assistants/a-1/users/mapping?credential_types=jira%2Cgit'
      )
    })

    it('combines the workflow scope with the credential types', async () => {
      mockGet.mockResolvedValue({ ok: true, json: async () => ({}) })

      await assistantsStore.getUserMapping('a-1', 'w-1', ['jira'])

      expect(mockGet).toHaveBeenCalledWith(
        'v1/assistants/a-1/users/mapping?workflow_id=w-1&credential_types=jira'
      )
    })

    it('requests the assistant-scoped mapping without a workflow', async () => {
      mockGet.mockResolvedValue({ ok: true, json: async () => ({}) })

      await assistantsStore.getUserMapping('a-1')

      expect(mockGet).toHaveBeenCalledWith('v1/assistants/a-1/users/mapping')
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

    it('does not stamp pinned or favorited flags even when preferences list the assistant', async () => {
      mockPreferencesStore.preferences = {
        pinned_assistants: ['a-1'],
        favorites: { assistants: ['a-1'], skills: [], workflows: [] },
      }
      mockGet.mockResolvedValue({
        json: async () => ({ id: 'a-1', name: 'Root', nested_assistants: [] }),
      })

      const result = await assistantsStore.getAssistantBySlug('root-slug', false)

      expect(result).not.toHaveProperty('is_pinned')
      expect(result).not.toHaveProperty('is_favorited')
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
    it('maps nested_assistants to nestedAssistants without stamping preference flags', () => {
      mockPreferencesStore.preferences = {
        pinned_assistants: ['a-1'],
        favorites: { assistants: ['a-1'], skills: [], workflows: [] },
      }
      const nested = [{ id: 'sub-1', name: 'Sub Assistant' }]
      const raw = { id: 'a-1', name: 'Root', nested_assistants: nested } as unknown as Assistant

      const result = normalizeAssistant(raw)

      expect(result.nestedAssistants).toEqual(nested)
      expect(result).not.toHaveProperty('is_pinned')
      expect(result).not.toHaveProperty('is_favorited')
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

    it('does not stamp pinned or favorited flags on indexed assistants', async () => {
      mockPreferencesStore.preferences = {
        pinned_assistants: ['a-1'],
        favorites: { assistants: ['a-1'], skills: [], workflows: [] },
      }
      mockGet.mockResolvedValue({
        json: () =>
          Promise.resolve({ data: [{ id: 'a-1', name: 'One' }], pagination: mockPagination }),
      })

      await assistantsStore.indexAssistants(ASSISTANT_INDEX_SCOPES.ALL)

      expect(assistantsStore.assistants[0]).not.toHaveProperty('is_pinned')
      expect(assistantsStore.assistants[0]).not.toHaveProperty('is_favorited')
    })

    it('URL-encodes sort parameters in query string', async () => {
      mockGet.mockResolvedValue({
        json: () => Promise.resolve({ data: [], pagination: mockPagination }),
      })

      await assistantsStore.indexAssistants(ASSISTANT_INDEX_SCOPES.ALL, {
        sort_by: 'name&hack=true',
        sort_order: 'asc&foo=bar',
      })

      const calledUrl = mockGet.mock.calls[0]?.[0] as string
      expect(calledUrl).toContain('sort_by=name%26hack%3Dtrue')
      expect(calledUrl).toContain('sort_order=asc%26foo%3Dbar')
    })
  })

  describe('pinAssistant', () => {
    it('PUTs the appended pinned list and tracks the assistant in pinnedAssistants', async () => {
      mockPreferencesStore.preferences = { pinned_assistants: ['x', '', 'y'] }
      assistantsStore.pinnedAssistants = []
      assistantsStore.assistants = [{ id: 'a-1', name: 'One' }] as any

      await assistantsStore.pinAssistant('a-1')

      expect(mockPutPreferences).toHaveBeenCalledWith('user-1', {
        pinned_assistants: ['x', 'y', 'a-1'],
      })
      expect(assistantsStore.pinnedAssistants.map((p) => p.id)).toEqual(['a-1'])
      expect(assistantsStore.assistants[0]).not.toHaveProperty('is_pinned')
    })

    it('unpinAssistant PUTs the list without the id and drops it from pinnedAssistants', async () => {
      mockPreferencesStore.preferences = { pinned_assistants: ['a-1', 'y'] }
      assistantsStore.pinnedAssistants = [{ id: 'a-1', name: 'One' }] as any
      assistantsStore.assistants = [{ id: 'a-1', name: 'One' }] as any

      await assistantsStore.unpinAssistant('a-1')

      expect(mockPutPreferences).toHaveBeenCalledWith('user-1', { pinned_assistants: ['y'] })
      expect(assistantsStore.pinnedAssistants).toEqual([])
      expect(assistantsStore.assistants[0]).not.toHaveProperty('is_pinned')
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

  describe('fetchAssistantsByIds', () => {
    beforeEach(() => {
      assistantsStore.recentAssistants = [{ id: 'recent-1', name: 'Recent Assistant' } as Assistant]
      assistantsStore.chatAssistants = []
    })

    it('stores avatar hydration results separately from recent assistants', async () => {
      const hydratedAssistant = {
        id: 'chat-1',
        name: 'Chat Assistant',
        icon_url: 'https://cdn/chat-1.png',
      } as Assistant
      mockGet.mockResolvedValue({
        json: async () => ({ data: [hydratedAssistant] }),
      })

      await assistantsStore.fetchAssistantsByIds(['chat-1'])

      expect(assistantsStore.chatAssistants).toEqual([hydratedAssistant])
      expect(assistantsStore.recentAssistants).toEqual([
        { id: 'recent-1', name: 'Recent Assistant' },
      ])
    })

    it('does not add duplicate assistants to the chat cache', async () => {
      const hydratedAssistant = { id: 'chat-1', name: 'Chat Assistant' } as Assistant
      assistantsStore.chatAssistants = [hydratedAssistant]
      mockGet.mockResolvedValue({
        json: async () => ({ data: [hydratedAssistant, hydratedAssistant] }),
      })

      await assistantsStore.fetchAssistantsByIds(['chat-1'])

      expect(assistantsStore.chatAssistants).toEqual([hydratedAssistant])
    })
  })

  describe('getSharedWith', () => {
    it('calls the correct endpoint and tolerates the wrapped response shape', async () => {
      const users = [{ id: 'u1', name: 'Alice', email: 'alice@test.com' }]
      mockGet.mockResolvedValue({ json: async () => ({ shared_with: users }) })

      const result = await assistantsStore.getSharedWith('a-1')

      expect(mockGet).toHaveBeenCalledWith('v1/assistants/a-1/shared-with', {
        skipErrorHandling: true,
      })
      expect(result).toEqual(users)
    })

    it('tolerates a flat array response', async () => {
      const users = [{ id: 'u1', name: 'Alice', email: 'alice@test.com' }]
      mockGet.mockResolvedValue({ json: async () => users })

      const result = await assistantsStore.getSharedWith('a-1')

      expect(result).toEqual(users)
    })

    it('propagates the error when the request fails', async () => {
      mockGet.mockRejectedValue(new Error('network error'))

      await expect(assistantsStore.getSharedWith('a-1')).rejects.toThrow('network error')
    })
  })

  describe('shareWith', () => {
    it('posts the user ids to the share endpoint', async () => {
      mockPost.mockResolvedValue(undefined)

      await assistantsStore.shareWith('a-1', ['u1', 'u2'])

      expect(mockPost).toHaveBeenCalledWith(
        'v1/assistants/a-1/share',
        { user_ids: ['u1', 'u2'] },
        { skipErrorHandling: true }
      )
    })

    it('skips duplicate error handling to allow the popup to toast once', async () => {
      mockPost.mockResolvedValue(undefined)

      await assistantsStore.shareWith('a-1', ['u1', 'u2'])

      expect(mockPost).toHaveBeenCalledWith(
        'v1/assistants/a-1/share',
        { user_ids: ['u1', 'u2'] },
        { skipErrorHandling: true }
      )
    })
  })

  describe('updateAssistant', () => {
    it('skips duplicate error handling so only the form shows the failure once', async () => {
      mockPut.mockRejectedValue(
        Object.assign(new Error('HTTP error 400'), {
          parsedError: { message: 'Personal integrations cannot be used in a shared assistant.' },
        })
      )

      await assistantsStore.updateAssistant('a-1', { name: 'Test' } as Assistant)

      expect(mockPut).toHaveBeenCalledWith('v1/assistants/a-1', expect.anything(), {
        skipErrorHandling: true,
      })
    })

    it('surfaces the backend parsedError message when the request is rejected', async () => {
      mockPut.mockRejectedValue(
        Object.assign(new Error('HTTP error 400'), {
          parsedError: { message: 'Personal integrations cannot be used in a shared assistant.' },
        })
      )

      const result = await assistantsStore.updateAssistant('a-1', { name: 'Test' } as Assistant)

      expect(result.error).toBe('Personal integrations cannot be used in a shared assistant.')
    })

    it('keeps the backend details: HTML for the toast, plain text for the inline error', async () => {
      mockPut.mockRejectedValue(
        Object.assign(new Error('HTTP error 400'), {
          parsedError: {
            message: 'Failed to update assistant',
            details: 'An error occurred while trying to update the assistant: Category is required',
          },
        })
      )

      const result = await assistantsStore.updateAssistant('a-1', { name: 'Test' } as Assistant)

      expect(result.error).toBe(
        'Failed to update assistant<br> An error occurred while trying to update the assistant: Category is required'
      )
      expect(result.message).toBe(
        'Failed to update assistant. An error occurred while trying to update the assistant: Category is required'
      )
    })

    it('falls back to a generic message when the rejection has no parsedError', async () => {
      mockPut.mockRejectedValue(new Error('network error'))

      const result = await assistantsStore.updateAssistant('a-1', { name: 'Test' } as Assistant)

      expect(result.error).toBe('network error')
    })
  })

  describe('removeShare', () => {
    it('deletes the user ids from the share endpoint', async () => {
      mockDelete.mockResolvedValue(undefined)

      await assistantsStore.removeShare('a-1', ['u1'])

      expect(mockDelete).toHaveBeenCalledWith(
        'v1/assistants/a-1/share',
        { user_ids: ['u1'] },
        { skipErrorHandling: true }
      )
    })

    it('skips duplicate error handling to allow the popup to toast once', async () => {
      mockDelete.mockResolvedValue(undefined)

      await assistantsStore.removeShare('a-1', ['u1'])

      expect(mockDelete).toHaveBeenCalledWith(
        'v1/assistants/a-1/share',
        { user_ids: ['u1'] },
        { skipErrorHandling: true }
      )
    })
  })

  describe('getSharableUsers', () => {
    it('calls the correct endpoint with an encoded query and tolerates the wrapped response shape', async () => {
      const users = [{ id: 'u2', name: 'Bob', email: 'bob@test.com' }]
      mockGet.mockResolvedValue({ json: async () => ({ users }) })

      const result = await assistantsStore.getSharableUsers('a-1', 'bo b')

      expect(mockGet).toHaveBeenCalledWith('v1/assistants/a-1/sharable-users?q=bo%20b')
      expect(result).toEqual(users)
    })

    it('tolerates a flat array response', async () => {
      const users = [{ id: 'u2', name: 'Bob', email: 'bob@test.com' }]
      mockGet.mockResolvedValue({ json: async () => users })

      const result = await assistantsStore.getSharableUsers('a-1', 'bob')

      expect(result).toEqual(users)
    })

    it('returns an empty array when the request fails', async () => {
      mockGet.mockRejectedValue(new Error('network error'))

      const result = await assistantsStore.getSharableUsers('a-1', 'bob')

      expect(result).toEqual([])
    })
  })
})
