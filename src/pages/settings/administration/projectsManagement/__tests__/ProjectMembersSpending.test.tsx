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

import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { analyticsStore } from '@/store/analytics'
import { userStore } from '@/store/user'
import { BudgetAssignment } from '@/types/entity/budget'
import { ProjectBudget, ProjectBudgetMemberAllocation } from '@/types/entity/projectBudget'
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
  user_count: 1,
  admin_count: 1,
  cost_center_id: 'cc-1',
  cost_center_name: 'Cost Center',
  enforce_member_spend_limits: true,
  members: [],
}

const mockBudgets: ProjectBudget[] = [
  {
    budget_id: 'budget-1',
    name: 'Platform budget',
    project_name: 'Test Project',
    budget_category: 'platform',
    soft_budget: 400,
    max_budget: 500,
    budget_duration: 'monthly',
    provider_sync_status: null,
    member_count: 1,
    allocated_member_budget_total: 500,
    member_allocations: [
      {
        user_id: 'u-1',
        allocation_mode: 'equal',
        allocated_soft_budget: 0,
        allocated_max_budget: 0,
        sync_status: null,
      } satisfies ProjectBudgetMemberAllocation,
    ],
  },
]

const buildUser = (
  id: string,
  name: string,
  email: string,
  budget_assignments?: BudgetAssignment[]
) => ({
  id,
  name,
  username: name,
  email,
  is_admin: false,
  is_active: true,
  user_type: 'INTERNAL',
  auth_source: 'local',
  last_login_at: null,
  projects: [{ name: 'Test Project', is_project_admin: false }],
  picture: null,
  date: null,
  ...(budget_assignments ? { budget_assignments } : {}),
})

const usersResponse = (data: unknown[]) => ({
  data,
  pagination: { page: 0, per_page: 10, total: data.length },
})

describe('ProjectMembersManager — merged Spending column', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Jane Doe', 'jane@epam.com')]))
  })

  it('renders the merged Spending column header', async () => {
    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    expect(await screen.findByText('Budget Allocations')).toBeInTheDocument()
    expect(screen.queryByText('Allocated')).not.toBeInTheDocument()
  })

  it('shows project spend and allocation together on one line per category', async () => {
    vi.spyOn(analyticsStore, 'fetchProjectMemberSpending').mockResolvedValue({
      data: { rows: [{ user_id: 'u-1', platform: 120.5 }] },
    } as never)

    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    await waitFor(() => {
      expect(screen.getByText('$120.50')).toBeInTheDocument()
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })
    expect(analyticsStore.fetchProjectMemberSpending).toHaveBeenCalledWith('Test Project')
  })

  it('ignores the personal budget spend and limit when a project allocation exists', async () => {
    vi.spyOn(analyticsStore, 'fetchProjectMemberSpending').mockResolvedValue({
      data: { rows: [{ user_id: 'u-1', platform: 120.5 }] },
    } as never)
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(
        usersResponse([
          buildUser('u-1', 'Jane Doe', 'jane@epam.com', [
            { category: 'platform', budget_id: 'personal', current_spending: 7, max_budget: 250 },
          ]),
        ])
      )

    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    await waitFor(() => {
      expect(screen.getByText('$120.50')).toBeInTheDocument()
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })
    expect(screen.queryByText('$7.00')).not.toBeInTheDocument()
    expect(screen.queryByText('$250.00')).not.toBeInTheDocument()
  })

  it('renders a dash for the spend side when a member has no spending row', async () => {
    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    await screen.findByText('Jane Doe')

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })
  })

  it('still renders the table with dashes when a member has no budget_assignments', async () => {
    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    await screen.findByText('Jane Doe')

    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })
  })
})
