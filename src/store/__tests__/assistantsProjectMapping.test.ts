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

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('assistantsProjectMappingStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchMappings', () => {
    it('stores assistants and pagination on success', async () => {
      const mockAssistants = [
        {
          id: 'a1',
          name: 'Assistant One',
          slug: 'assistant-one',
          description: '',
          is_global: false,
          shared: false,
          created_at: '',
          updated_at: '',
          system_prompt: '',
          llm_model_type: '',
        },
      ]
      mockGet.mockResolvedValue({
        json: async () => ({
          data: mockAssistants,
          pagination: { page: 0, per_page: 12, total: 1, pages: 1 },
        }),
      })

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await assistantsProjectMappingStore.fetchMappings('my-project')

      expect(mockGet).toHaveBeenCalledWith(
        'v1/assistants/projects/mapping?feature=teams&project=my-project&page=0&per_page=12'
      )
      expect(assistantsProjectMappingStore.assistants).toEqual(mockAssistants)
      expect(assistantsProjectMappingStore.pagination.totalCount).toBe(1)
      expect(assistantsProjectMappingStore.loading).toBe(false)
    })

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await expect(assistantsProjectMappingStore.fetchMappings('my-project')).rejects.toThrow()

      expect(assistantsProjectMappingStore.error).toContain('Failed to fetch')
      expect(assistantsProjectMappingStore.loading).toBe(false)
    })
  })

  describe('addMapping', () => {
    it('calls POST with correct URL and body', async () => {
      mockPost.mockResolvedValue({ json: async () => ({ message: 'ok' }) })
      mockGet.mockResolvedValue({
        json: async () => ({ data: [], pagination: { page: 0, per_page: 12, total: 0, pages: 0 } }),
      })

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await assistantsProjectMappingStore.addMapping('assistant-uuid-123', 'my-project')

      expect(mockPost).toHaveBeenCalledWith('v1/assistants/assistant-uuid-123/projects/mapping', {
        project_name: 'my-project',
        feature: 'teams',
      })
    })
  })

  describe('removeMapping', () => {
    it('calls DELETE with correct URL and query params', async () => {
      mockDelete.mockResolvedValue({ json: async () => ({ message: 'ok' }) })
      mockGet.mockResolvedValue({
        json: async () => ({ data: [], pagination: { page: 0, per_page: 12, total: 0, pages: 0 } }),
      })

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await assistantsProjectMappingStore.removeMapping('assistant-uuid-123', 'my-project')

      expect(mockDelete).toHaveBeenCalledWith(
        'v1/assistants/assistant-uuid-123/projects/mapping?project=my-project&feature=teams'
      )
    })

    it('treats 404 as a no-op (does not throw)', async () => {
      const notFoundError: any = new Error('Not found')
      notFoundError.response = { status: 404 }
      mockDelete.mockRejectedValue(notFoundError)
      mockGet.mockResolvedValue({
        json: async () => ({ data: [], pagination: { page: 0, per_page: 12, total: 0, pages: 0 } }),
      })

      const { assistantsProjectMappingStore } = await import('@/store/assistantsProjectMapping')
      await expect(
        assistantsProjectMappingStore.removeMapping('assistant-uuid-123', 'my-project')
      ).resolves.not.toThrow()
    })
  })
})
