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

// Import order matters: @/test-utils/integration must evaluate BEFORE @/store/* imports.
// Entering the module graph through a @/store/* module first triggers the circular chain
// @/store/* → @/utils/api → @/store (barrel), which leaves the barrel's re-exported
// userStore undefined and crashes rendering that depends on it.
// eslint-disable-next-line import/order
import '@/test-utils/integration'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { analyticsStore } from '@/store/analytics'
import { userStore } from '@/store/user'
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

const buildUser = (id: string, name: string, email: string) => ({
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
})

const usersResponse = (data: unknown[]) => ({
  data,
  pagination: { page: 0, per_page: 10, total: data.length },
})

const spendingResponse = (rows: unknown[]) => ({
  data: { columns: [], rows },
  metadata: { timestamp: '', data_as_of: '' },
  pagination: { page: 0, per_page: 50, total_count: rows.length, has_more: false },
})

describe('ProjectMembersManager — merged Spending column', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Jane Doe', 'jane@epam.com')]))
    vi.spyOn(analyticsStore, 'fetchProjectMemberSpending').mockResolvedValue(
      spendingResponse([]) as never
    )
  })

  it('renders the merged Spending column header', async () => {
    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    expect(await screen.findByText('Budget Allocations')).toBeInTheDocument()
    expect(screen.queryByText('Allocated')).not.toBeInTheDocument()
  })

  it('shows spend and allocation together on one line per category', async () => {
    vi.spyOn(analyticsStore, 'fetchProjectMemberSpending').mockResolvedValue(
      spendingResponse([{ user_id: 'u-1', platform: 120.5, platform_limit: 500 }]) as never
    )

    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    await waitFor(() => {
      expect(screen.getByText(/\$120\.50 \/ \$0\.00/)).toBeInTheDocument()
    })
  })

  it('renders a dash for the spend side when a member has no spending row', async () => {
    vi.spyOn(analyticsStore, 'fetchProjectMemberSpending').mockResolvedValue(
      spendingResponse([]) as never
    )

    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    await screen.findByText('Jane Doe')

    await waitFor(() => {
      expect(analyticsStore.fetchProjectMemberSpending).toHaveBeenCalledWith('Test Project')
    })

    const dashes = await screen.findAllByText(/^- \/ \$0\.00$/)
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('still renders the table with dashes when the spending fetch rejects', async () => {
    vi.spyOn(analyticsStore, 'fetchProjectMemberSpending').mockRejectedValue(
      new Error('Spending endpoint not implemented')
    )

    render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

    await waitFor(() => {
      expect(analyticsStore.fetchProjectMemberSpending).toHaveBeenCalledWith('Test Project')
    })

    await screen.findByText('Jane Doe')

    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()

    const dashes = await screen.findAllByText(/^- \/ \$0\.00$/)
    expect(dashes.length).toBeGreaterThan(0)
  })
})
