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

import { SKILL_INDEX_SCOPES } from '@/constants/skills'

const mockGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('skillsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSkillsForProject', () => {
    it('sends project_with_marketplace scope in filters', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [] }),
      })

      const { skillsStore } = await import('@/store/skills')
      await skillsStore.getSkillsForProject('my-project')

      expect(mockGet).toHaveBeenCalledTimes(1)
      const url = mockGet.mock.calls[0][0] as string
      const filtersParam = decodeURIComponent(url.split('filters=')[1].split('&')[0])
      const filters = JSON.parse(filtersParam)

      expect(filters.scope).toBe(SKILL_INDEX_SCOPES.PROJECT_WITH_MARKETPLACE)
      expect(filters.project).toEqual(['my-project'])
    })

    it('includes search in filters when provided', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [] }),
      })

      const { skillsStore } = await import('@/store/skills')
      await skillsStore.getSkillsForProject('my-project', 'test-query')

      const url = mockGet.mock.calls[0][0] as string
      const filtersParam = decodeURIComponent(url.split('filters=')[1].split('&')[0])
      const filters = JSON.parse(filtersParam)

      expect(filters.search).toBe('test-query')
      expect(filters.scope).toBe('project_with_marketplace')
      expect(filters.project).toEqual(['my-project'])
    })

    it('does not include search in filters when not provided', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [] }),
      })

      const { skillsStore } = await import('@/store/skills')
      await skillsStore.getSkillsForProject('my-project')

      const url = mockGet.mock.calls[0][0] as string
      const filtersParam = decodeURIComponent(url.split('filters=')[1].split('&')[0])
      const filters = JSON.parse(filtersParam)

      expect(filters.search).toBeUndefined()
    })

    it('returns skills array from response', async () => {
      const mockSkills = [
        { id: '1', name: 'skill-one', description: 'First' },
        { id: '2', name: 'skill-two', description: 'Second' },
      ]
      mockGet.mockResolvedValue({
        json: async () => ({ data: mockSkills }),
      })

      const { skillsStore } = await import('@/store/skills')
      const result = await skillsStore.getSkillsForProject('my-project')

      expect(result).toEqual(mockSkills)
    })

    it('requests per_page=100', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [] }),
      })

      const { skillsStore } = await import('@/store/skills')
      await skillsStore.getSkillsForProject('my-project')

      const url = mockGet.mock.calls[0][0] as string
      expect(url).toContain('per_page=100')
    })
  })
})
