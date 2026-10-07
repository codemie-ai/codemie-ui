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

import { screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// eslint-disable-next-line import/order
import { appInfoStore } from '@/store/appInfo'
import { mockAPI, renderPage } from '@/test-utils/integration'

const maintainerUser = {
  user_id: 'maintainer-1',
  id: 'maintainer-1',
  email: 'maintainer@test.com',
  name: 'Maintainer User',
  username: 'maintainer',
  is_admin: true,
  is_maintainer: true,
  user_type: 'INTERNAL',
  applications: [],
  projects: [],
}

const janeUser = {
  id: 'jane-1',
  name: 'Jane Doe',
  username: 'jane',
  email: 'jane@epam.com',
  is_admin: false,
  user_type: 'INTERNAL',
  applications: [],
  projects: [
    { name: 'project-a', is_project_admin: false, is_default: true },
    { name: 'project-b', is_project_admin: false, is_default: false },
  ],
}

const manyProjectsUser = {
  id: 'many-1',
  name: 'Many Projects',
  username: 'many',
  email: 'many@epam.com',
  is_admin: false,
  user_type: 'INTERNAL',
  applications: [],
  projects: [
    { name: 'alpha', is_project_admin: false, is_default: false },
    { name: 'beta', is_project_admin: false, is_default: false },
    { name: 'gamma', is_project_admin: false, is_default: false },
    { name: 'delta', is_project_admin: false, is_default: true },
  ],
}

const usersResponse = (data: unknown[]) => ({
  data,
  pagination: { page: 0, per_page: 10, total: data.length },
})

describe('UsersManagementPage — default project marker (EPMCDME-15112)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.configs = [] as never
    appInfoStore.isConfigFetched = true
    mockAPI('GET', 'v1/user', maintainerUser)
    mockAPI('GET', 'v1/admin/users', usersResponse([janeUser, manyProjectsUser]))
  })

  it('renders a marker icon on the default project and not on the non-default one', async () => {
    renderPage('/settings/administration/users')

    await screen.findByText('project-a (user)')

    const defaultBadge = screen.getByText('project-a (user)').closest('a, div')
    const nonDefaultBadge = screen.getByText('project-b (user)').closest('a, div')

    expect(defaultBadge?.querySelector('[data-testid="default-project-marker"]')).not.toBeNull()
    expect(nonDefaultBadge?.querySelector('[data-testid="default-project-marker"]')).toBeNull()
    expect(document.querySelectorAll('[data-testid="default-project-marker"]')).toHaveLength(2) // jane + many
  })

  it('shows the default marker at rest even when the default is beyond the badge cap', async () => {
    renderPage('/settings/administration/users')

    await screen.findByText('delta (user)')

    // Only MAX_DISPLAYED_PROJECTS badges render at rest; the rest sit in a hover-only overflow,
    // so the default must be ordered first to stay visible without opening the user.
    const defaultBadge = screen.getByText('delta (user)').closest('a, div')
    expect(defaultBadge?.querySelector('[data-testid="default-project-marker"]')).not.toBeNull()
    expect(screen.queryByText('gamma (user)')).toBeNull()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })
})
