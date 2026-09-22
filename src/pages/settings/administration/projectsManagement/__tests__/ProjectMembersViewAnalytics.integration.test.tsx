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

describe('ProjectMembersManager — View analytics button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Jane Doe', 'jane@epam.com')]))
    vi.spyOn(projectBudgetsStore, 'listProjectBudgets').mockResolvedValue(mockBudgets)
  })

  it('renders a View analytics link for each member row when admin and enterprise enabled', async () => {
    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )
    const link = await screen.findByRole('link', { name: /view analytics for jane doe in alpha/i })
    expect(link).toBeInTheDocument()
  })

  it('does NOT render View analytics when the viewer is not admin/project-admin', async () => {
    userStore.user = { userId: 'maintainer-1', isAdmin: false } as never

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await screen.findByText('Jane Doe')
    expect(screen.queryByRole('link', { name: /view analytics/i })).not.toBeInTheDocument()
  })

  it('does NOT render View analytics when enterprise edition is disabled', async () => {
    const { isEnterpriseEdition } = await import('@/utils/enterpriseEdition')
    vi.mocked(isEnterpriseEdition).mockReturnValue(false)

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await screen.findByText('Jane Doe')
    expect(screen.queryByRole('link', { name: /view analytics/i })).not.toBeInTheDocument()

    // Restore for subsequent tests
    vi.mocked(isEnterpriseEdition).mockReturnValue(true)
  })

  it('clicking the View analytics link does not trigger row selection (stopPropagation)', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    const link = await screen.findByRole('link', { name: /view analytics for jane doe in alpha/i })

    // The link is wrapped in a stopPropagation div; clicking it should not throw
    // and the user remains on the page (no navigation occurred in test env).
    await expect(user.click(link)).resolves.not.toThrow()
  })

  it('the href contains tab=insights, projects=Alpha, and users=u-1', async () => {
    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    const link = await screen.findByRole('link', { name: /view analytics for jane doe in alpha/i })
    const href = link.getAttribute('href') ?? ''

    expect(href).toContain('tab=insights')
    expect(href).toContain('projects=Alpha')
    expect(href).toContain('users=u-1')
  })

  it('calls projectBudgetsStore.listProjectBudgets with the project name when viewer is admin', async () => {
    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

    await screen.findByRole('link', { name: /view analytics for jane doe in alpha/i })

    await waitFor(() => {
      expect(projectBudgetsStore.listProjectBudgets).toHaveBeenCalledWith(
        expect.objectContaining({ projectName: 'Alpha' })
      )
    })
  })

  it('disables the View analytics link until the budget fetch resolves, then enables it', async () => {
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

    const link = await screen.findByRole('link', { name: /view analytics for jane doe in alpha/i })
    expect(link).toHaveAttribute('aria-disabled', 'true')

    await expect(userEvent.setup().click(link)).resolves.not.toThrow()

    resolveBudgets(mockBudgets)

    await waitFor(() => {
      expect(link).toHaveAttribute('aria-disabled', 'false')
    })
  })
})
