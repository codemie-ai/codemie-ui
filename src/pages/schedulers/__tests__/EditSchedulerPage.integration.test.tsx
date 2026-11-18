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

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { userStore } from '@/store/user'
import { mockAPI, renderPage } from '@/test-utils/integration'

const scheduler = {
  id: 'sch-1',
  user_id: 'u1',
  alias: 'nightly',
  credential_type: 'Scheduler',
  project_name: 'p1',
  credential_values: [],
  is_global: false,
}

beforeEach(() => {
  userStore.user = null
  mockAPI('GET', 'v1/config', [])
  mockAPI('GET', 'v1/user', {
    user_id: 'u1',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    is_admin: false,
    is_maintainer: false,
    user_type: 'INTERNAL',
    applications: ['p1'],
    applications_admin: ['p1'],
    projects: [{ name: 'p1', display_name: 'P One', is_project_admin: true }],
  })
})

describe.each([
  [
    'scheduler-project-edit',
    '/schedulers/project/edit',
    'v1/settings/project',
    'Edit Project Scheduler',
  ],
  ['scheduler-user-edit', '/schedulers/user/edit', 'v1/settings/user', 'Edit Scheduler'],
])('%s', (name, path, listUrl, title) => {
  it('renders the form without the integration Scope field (AC-20)', async () => {
    mockAPI('GET', listUrl, {
      data: [scheduler],
      pagination: { page: 0, per_page: 10000, pages: 1, total: 1 },
    })
    mockRouterState.currentRoute.value = {
      path,
      name,
      params: {},
      query: { project_name: 'p1', credential_type: 'Scheduler', alias: 'nightly' },
      hash: '',
    }
    const { container } = renderPage(path)

    await waitFor(() =>
      expect(
        container.querySelector('[data-onboarding="integration-project-scope-fields"]')
      ).toBeInTheDocument()
    )
    expect(screen.getAllByText(title).length).toBeGreaterThan(0)
    expect(container.querySelector('[data-onboarding="integration-scope-field"]')).toBeNull()
  })
})
