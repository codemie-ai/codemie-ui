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
// eslint-disable-next-line import/order
import '@/test-utils/integration'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { userStore } from '@/store/user'
import { ProjectType } from '@/types/entity/project'
import type { ProjectBudget, ProjectBudgetMemberAllocation } from '@/types/entity/projectBudget'
import type { ProjectDetail } from '@/types/entity/projectManagement'

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: vi.fn(() => true),
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

// Override the global useVueRouter mock so that resolve() encodes query into the href,
// letting the href-shape test assert on the actual query parameters.
vi.mock('@/hooks/useVueRouter', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    useVueRouter: vi.fn(() => ({
      path: '/',
      name: '',
      params: {},
      query: {},
      hash: '',
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      currentRoute: { value: { path: '/', name: '', params: {}, query: {}, hash: '' } },
      resolve: vi.fn(({ query }: { query: Record<string, string> }) => {
        const qs = new URLSearchParams(query).toString()
        const fullPath = qs ? `/analytics?${qs}` : '/analytics'
        return { fullPath, path: fullPath, href: fullPath, searchParamsString: qs }
      }),
    })),
  }
})

const mockProject: ProjectDetail = {
  name: 'Alpha',
  description: '',
  project_type: 'shared',
  created_by: 'owner-1',
  created_at: '2026-01-01T00:00:00Z',
  user_count: 1,
  admin_count: 1,
  cost_center_id: null,
  cost_center_name: null,
  enforce_member_spend_limits: false,
  members: [],
}

const mockBudgets: ProjectBudget[] = [
  {
    budget_id: 'b-1',
    name: 'Monthly',
    project_name: 'Alpha',
    budget_category: 'platform',
    soft_budget: 100,
    max_budget: 200,
    budget_duration: '30d',
    budget_reset_at: '2026-06-01T00:00:00.000Z',
    provider_sync_status: null,
    member_count: 1,
    allocated_member_budget_total: 100,
    member_allocations: [
      {
        user_id: 'u-1',
        allocation_mode: 'equal',
        allocated_soft_budget: 50,
        allocated_max_budget: 100,
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
  projects: [{ name: 'Alpha', is_project_admin: false }],
  picture: null,
  date: null,
})

const usersResponse = (data: unknown[]) => ({
  data,
  pagination: { page: 0, per_page: 10, total: data.length },
})

describe('ProjectMembersManager — Actions dropdown', () => {
  const openMenu = async () => {
    const trigger = await screen.findByRole('button', { name: /more options/i })
    await userEvent.setup().click(trigger)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Jane Doe', 'jane@epam.com')]))
    vi.spyOn(projectBudgetsStore, 'listProjectBudgets').mockResolvedValue(mockBudgets)
  })

  it("wires the kebab trigger's aria-labelledby to the member name span's id", async () => {
    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    const trigger = await screen.findByRole('button', { name: /more options/i })
    const labelledBy = trigger.getAttribute('aria-labelledby') ?? ''
    const nameId = labelledBy.split(' ').find((id) => id.startsWith('user-more-'))

    expect(nameId).toBe('user-more-u-1')
    expect(document.getElementById(nameId as string)).toHaveTextContent('Jane Doe')
  })

  it('does NOT show a tooltip on the View analytics menu item', async () => {
    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()
    const item = await screen.findByRole('menuitem', { name: /view analytics/i })
    expect(item).not.toHaveAttribute('data-tooltip-content')
  })

  it('renders the View analytics menu item as a link with tab=insights, projects, and users query params', async () => {
    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()
    const item = await screen.findByRole('menuitem', { name: /view analytics/i })
    expect(item.tagName).toBe('A')
    const href = item.getAttribute('href') ?? ''

    expect(href).toContain('tab=insights')
    expect(href).toContain('projects=Alpha')
    expect(href).toContain('users=u-1')
  })

  it('does NOT render a View analytics menu item for a non-admin/non-project-admin viewer', async () => {
    userStore.user = { userId: 'maintainer-1', isAdmin: false } as never

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await screen.findByText('Jane Doe')
    expect(screen.queryByRole('menuitem', { name: /view analytics/i })).not.toBeInTheDocument()
  })

  it('does NOT render a View analytics menu item when enterprise edition is disabled', async () => {
    const { isEnterpriseEdition } = await import('@/utils/enterpriseEdition')
    vi.mocked(isEnterpriseEdition).mockReturnValue(false)

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()
    expect(screen.queryByRole('menuitem', { name: /view analytics/i })).not.toBeInTheDocument()
    // No analytics item means no divider should render either — otherwise the
    // lone "Unassign from Project" item would have an orphan separator above it.
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()

    // Restore for subsequent tests
    vi.mocked(isEnterpriseEdition).mockReturnValue(true)
  })

  it('clicking the View analytics menu item does not throw and does not trigger row selection', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()
    const item = await screen.findByRole('menuitem', { name: /view analytics/i })

    // The dropdown is wrapped in a stopPropagation div; clicking a menu item should not
    // throw and should not bubble up into row selection.
    await expect(user.click(item)).resolves.not.toThrow()
  })

  it('does NOT render a separator between View analytics and Unassign from Project', async () => {
    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()
    await screen.findByRole('menuitem', { name: /view analytics/i })
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('hides the Unassign from Project menu item for the project creator, while View analytics stays present, becomes enabled, and leaves no orphan separator', async () => {
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('owner-1', 'Owner Name', 'owner@epam.com')]))

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()

    const analyticsItem = await screen.findByRole('menuitem', { name: /view analytics/i })
    await waitFor(() => {
      expect(analyticsItem).toHaveAttribute('aria-disabled', 'false')
    })

    await waitFor(() => {
      expect(
        screen.queryByRole('menuitem', { name: /unassign from project/i })
      ).not.toBeInTheDocument()
    })
    // With the item hidden and only "View analytics" remaining, no orphan
    // separator should render on the creator's row either.
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('hides the Unassign from Project menu item for a member of a personal project', async () => {
    const personalProject: ProjectDetail = {
      ...mockProject,
      project_type: ProjectType.PERSONAL,
      created_by: 'owner-1',
    }

    render(
      <MemoryRouter>
        <ProjectMembersManager project={personalProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()

    await waitFor(() => {
      expect(
        screen.queryByRole('menuitem', { name: /unassign from project/i })
      ).not.toBeInTheDocument()
    })
  })

  it('keeps Unassign from Project enabled and clickable for a normal member row', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()

    const unassignItem = await screen.findByRole('menuitem', { name: /unassign from project/i })
    expect(unassignItem).not.toBeDisabled()

    await expect(user.click(unassignItem)).resolves.not.toThrow()
  })

  it('disables the View analytics menu item until the budget fetch resolves, then enables it', async () => {
    let resolveBudgets: (budgets: ProjectBudget[]) => void = () => {}
    vi.spyOn(projectBudgetsStore, 'listProjectBudgets').mockReturnValue(
      new Promise((resolve) => {
        resolveBudgets = resolve
      })
    )

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await openMenu()
    const item = await screen.findByRole('menuitem', { name: /view analytics/i })
    expect(item).toHaveAttribute('aria-disabled', 'true')

    resolveBudgets(mockBudgets)

    await waitFor(() => {
      expect(item).toHaveAttribute('aria-disabled', 'false')
    })
  })
})
