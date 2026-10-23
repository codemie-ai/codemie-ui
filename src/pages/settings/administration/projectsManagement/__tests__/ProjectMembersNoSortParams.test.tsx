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

// EPMCDME-16133: the backend defaults GET /v1/admin/users to A to Z by name, so the Members tab
// must rely on that default and never send sort options of its own.

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { useVueRouter } from '@/hooks/useVueRouter'
import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { userStore } from '@/store/user'
import { ProjectBudget } from '@/types/entity/projectBudget'
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
  user_count: 3,
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

// The budget usage filter keeps only members with a fixed override, so give every member one.
const platformBudget: ProjectBudget = {
  budget_id: 'b-platform',
  name: 'Platform',
  project_name: 'Test Project',
  budget_category: 'platform' as ProjectBudget['budget_category'],
  soft_budget: 100,
  max_budget: 100,
  budget_duration: '30d',
  provider_sync_status: 'ok',
  member_count: serverPage.length,
  allocated_member_budget_total: 30,
  member_allocations: serverPage.map((user) => ({
    user_id: user.id,
    allocation_mode: 'fixed' as const,
    allocated_soft_budget: 10,
    allocated_max_budget: 10,
    sync_status: 'ok' as const,
  })),
}

const renderedEmails = () =>
  screen.getAllByText(/@test\.com$/).map((element) => element.textContent)

describe('ProjectMembersManager — relies on the server default order', () => {
  let getUsers: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    getUsers = vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => ({
      data: page === 0 ? serverPage : [],
      pagination: { page, per_page: perPage, total: serverPage.length },
    }))
    userStore.getUsers = getUsers as never
  })

  it.each([
    ['plain listing', {}, undefined],
    ['budget usage filter', { overrides: 'platform' }, [platformBudget]],
  ])('sends no sort options and renders rows in server order (%s)', async (_label, query, budgets) => {
    vi.mocked(useVueRouter).mockReturnValue({ ...mockRouterState, query } as never)
    render(<ProjectMembersManager project={mockProject} budgets={budgets} />)

    await waitFor(() => expect(renderedEmails()).toEqual(serverEmailOrder))
    expect(getUsers).toHaveBeenCalled()

    for (const [args] of getUsers.mock.calls) {
      expect(args).not.toHaveProperty('sortBy')
      expect(args).not.toHaveProperty('sortOrder')
    }
  })
})
