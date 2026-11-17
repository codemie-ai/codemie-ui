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

import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { preferencesStore } from '@/store/preferences'
import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
import { mockAPI, renderPage } from '@/test-utils/integration'
import { SkillVisibility } from '@/types/entity/skill'

describe('SkillsListPage - Integration', () => {
  describe('Favorites', () => {
    afterEach(() => {
      preferencesStore.preferences = null
    })

    it('fills the favorite button when preferences arrive after the list, without refetching it', async () => {
      const countSkillListCalls = () =>
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
          ([url, init]) => String(url).includes('v1/skills') && (init?.method ?? 'GET') === 'GET'
        ).length
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/skills', {
        data: [
          {
            id: 'skill-1',
            name: 'Test Skill',
            description: 'A test skill',
            content: 'Skill content',
            project: 'test-project',
            visibility: SkillVisibility.PROJECT,
            categories: [],
            version: '1.0.0',
          },
        ],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })

      renderPage('/skills')

      await waitFor(() => {
        expect(screen.getByText('Test Skill')).toBeInTheDocument()
      })
      expect(await screen.findByRole('button', { name: 'Add to favorites' })).toBeInTheDocument()
      const listCallsBefore = countSkillListCalls()

      act(() => {
        preferencesStore.preferences = {
          user_id: 'test-user-id',
          pinned_assistants: [],
          favorites: { assistants: [], skills: ['skill-1'], workflows: [] },
        }
      })

      expect(
        await screen.findByRole('button', { name: 'Remove from favorites' })
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add to favorites' })).not.toBeInTheDocument()
      expect(countSkillListCalls()).toBe(listCallsBefore)
    })
  })

  describe('Project filter display name', () => {
    beforeEach(() => {
      projectDisplayNamesStore.cache = {}
      localStorage.clear()
    })

    it('shows project display name in filter chip on refresh (resolved state)', async () => {
      // Filter key: `test-user-id_filters_skills.project`
      // (FILTERS_PREFIX = 'filters', FILTER_ENTITY.SKILLS = 'skills',
      //  default tab = SkillTab.PROJECT → scope = 'project')
      localStorage.setItem(
        'test-user-id_filters_skills.project',
        JSON.stringify({ project: ['non-roster-proj'] })
      )

      mockAPI('GET', 'v1/config', [{ id: 'features:userManagement', settings: { enabled: true } }])

      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_admin: true,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: [],
        projects: [],
      })

      mockAPI('GET', 'v1/skills', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      mockAPI('GET', 'v1/projects/non-roster-proj', {
        name: 'non-roster-proj',
        display_name: 'Non Roster Project',
      })

      renderPage('/skills')

      await waitFor(() => {
        expect(screen.getByText('non-roster-proj (Non Roster Project)')).toBeInTheDocument()
      })
    })
  })
})
