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

import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
import { mockAPI, renderPage } from '@/test-utils/integration'

describe('SkillsListPage - Integration', () => {
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
        expect(screen.getByText('Non Roster Project')).toBeInTheDocument()
      })
    })
  })
})
