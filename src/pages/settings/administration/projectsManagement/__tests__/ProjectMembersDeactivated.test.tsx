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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const buildUser = (id: string, name: string, isActive = true) => ({
  id,
  name,
  username: name.toLowerCase(),
  email: `${name.toLowerCase()}@test.com`,
  is_admin: false,
  is_active: isActive,
  user_type: 'INTERNAL',
  auth_source: 'local',
  last_login_at: null,
  projects: [{ name: 'Test Project', is_project_admin: false }],
  picture: null,
  date: null,
})

describe('ProjectMembersManager — deactivated members', () => {
  let getUsers: ReturnType<typeof vi.fn>

  const setup = (total: number) => {
    getUsers = vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => ({
      data: page === 0 ? [buildUser('u1', 'Alice'), buildUser('u2', 'Bob', false)] : [],
      pagination: { page, per_page: perPage, total },
    }))
    userStore.getUsers = getUsers as never
  }

  // Deactivated members stay listed so they can still be removed from the project
  const expectNoActiveFilter = () => {
    expect(getUsers.mock.calls.length).toBeGreaterThan(0)
    for (const [args] of getUsers.mock.calls) {
      expect(args.filters).not.toHaveProperty('is_active')
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(useVueRouter).mockReturnValue(mockRouterState as never)
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
  })

  it('lists deactivated members with a Deactivated label', async () => {
    setup(2)
    render(<ProjectMembersManager project={mockProject} />)
    await screen.findByText('bob@test.com')

    expect(screen.getAllByText('Deactivated')).toHaveLength(1)
    expect(screen.getByText('bob@test.com').parentElement).toHaveTextContent('Deactivated')
    expect(screen.getByText('alice@test.com').parentElement).not.toHaveTextContent('Deactivated')
    expectNoActiveFilter()
  })

  it('locks the role of a deactivated member', async () => {
    setup(2)
    const { container } = render(<ProjectMembersManager project={mockProject} />)
    await screen.findByText('bob@test.com')

    const roleOf = (id: string) => container.querySelector(`#role-${id}`)?.closest('.p-dropdown')
    expect(roleOf('u2')).toHaveClass('p-disabled')
    expect(roleOf('u1')).not.toHaveClass('p-disabled')
  })

  it('does not filter by status on any page of the fetch-all path', async () => {
    setup(250)
    vi.mocked(useVueRouter).mockReturnValue({
      ...mockRouterState,
      query: { overrides: 'platform' },
    } as never)
    render(<ProjectMembersManager project={mockProject} />)

    await waitFor(() => expect(getUsers.mock.calls.length).toBeGreaterThanOrEqual(3))
    expectNoActiveFilter()
  })

  it('does not filter by status when selecting all matching users', async () => {
    setup(25)
    render(<ProjectMembersManager project={mockProject} />)
    await screen.findByText('alice@test.com')
    getUsers.mockClear()

    fireEvent.click(screen.getAllByRole('checkbox')[0])

    await waitFor(() => expect(getUsers).toHaveBeenCalled())
    expectNoActiveFilter()
  })
})
