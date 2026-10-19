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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { useVueRouter } from '@/hooks/useVueRouter'
import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { userStore } from '@/store/user'
import { ProjectDetail } from '@/types/entity/projectManagement'

vi.mock('@/utils/toaster', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

const mockProject: ProjectDetail = {
  name: 'Test Project',
  description: 'Project description',
  project_type: 'shared',
  created_by: 'admin@epam.com',
  created_at: '2026-03-19T10:00:00Z',
  user_count: 6,
  admin_count: 1,
  cost_center_id: 'cc-1',
  cost_center_name: 'Cost Center',
  enforce_member_spend_limits: true,
  members: [],
}

const buildUser = (id: string, name: string | null, username: string, email: string) => ({
  id,
  name,
  username,
  email,
  is_admin: false,
  is_active: true,
  user_type: 'INTERNAL',
  auth_source: 'local',
  last_login_at: null,
  projects: [{ name: 'Test Project', is_project_admin: false }],
  picture: null,
  date: null,
})

// Deliberately not alphabetical: the server owns the order, the UI must not reorder it.
const serverPage = [
  buildUser('u-zed', 'Zed', 'zed', 'zed@test.com'),
  buildUser('u-alice', 'Alice', 'alice', 'alice@test.com'),
  buildUser('u-bob', 'bob', 'bob', 'bob@test.com'),
]
const serverEmailOrder = ['zed@test.com', 'alice@test.com', 'bob@test.com']

const renderedEmails = () =>
  screen.getAllByText(/@test\.com$/).map((element) => element.textContent)

describe('ProjectMembersManager — server-side A to Z order', () => {
  let getUsers: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(useVueRouter).mockReturnValue(mockRouterState as never)
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    getUsers = vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => ({
      data: page === 0 ? serverPage : [],
      pagination: { page, per_page: perPage, total: serverPage.length },
    }))
    userStore.getUsers = getUsers as never
  })

  it('loads one server page sorted by name ascending and renders it in server order', async () => {
    render(<ProjectMembersManager project={mockProject} />)

    await waitFor(() => expect(renderedEmails()).toEqual(serverEmailOrder))

    expect(getUsers).toHaveBeenCalledTimes(1)
    expect(getUsers).toHaveBeenCalledWith({
      page: 0,
      perPage: 10,
      filters: expect.objectContaining({ projects: ['Test Project'] }),
      sortBy: 'name',
      sortOrder: 'asc',
    })
  })

  it('requests name ascending on every call when a budget usage filter is active', async () => {
    vi.mocked(useVueRouter).mockReturnValue({
      ...mockRouterState,
      query: { overrides: 'platform' },
    } as never)
    render(<ProjectMembersManager project={mockProject} />)

    await waitFor(() => expect(getUsers).toHaveBeenCalled())

    for (const [args] of getUsers.mock.calls) {
      expect(args).toEqual(expect.objectContaining({ sortBy: 'name', sortOrder: 'asc' }))
    }
  })
})
