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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { userStore } from '@/store/user'
import type { ProjectDetail } from '@/types/entity/projectManagement'
import { isUserManagementEnabled } from '@/utils/featureFlags'
import toaster from '@/utils/toaster'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: vi.fn(() => true),
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/utils/featureFlags', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return { ...original, isUserManagementEnabled: vi.fn(() => true) }
})

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
      push,
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

describe('ProjectMembersManager — Details action', () => {
  const renderManager = () =>
    render(
      <MemoryRouter>
        <ProjectMembersManager project={mockProject} budgets={[]} />
      </MemoryRouter>
    )

  const openMenu = async () => {
    const trigger = await screen.findByRole('button', { name: /more options/i })
    await userEvent.setup().click(trigger)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isUserManagementEnabled).mockReturnValue(true)
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userStore.getUsers = vi
      .fn()
      .mockResolvedValue(usersResponse([buildUser('u-1', 'Jane Doe', 'jane@epam.com')]))
    vi.spyOn(projectBudgetsStore, 'listProjectBudgets').mockResolvedValue([])
  })

  it('opens Users management filtered by the member name', async () => {
    renderManager()

    await openMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /details/i }))

    expect(push).toHaveBeenCalledWith({
      name: 'administration-users',
      query: { search: 'Jane Doe' },
    })
  })

  it.each([
    ['empty name', '', 'jane@epam.com', 'jane@epam.com'],
    ['null name', null, 'jane@epam.com', 'jane@epam.com'],
  ])('falls back to email for a member with %s', async (_label, name, email, expected) => {
    userStore.getUsers = vi.fn().mockResolvedValue(
      usersResponse([
        {
          ...buildUser('u-2', 'ignored', email),
          name,
          username: 'jane.username',
        },
      ])
    )

    renderManager()

    await openMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /details/i }))

    expect(push).toHaveBeenCalledWith({
      name: 'administration-users',
      query: { search: expected },
    })
  })

  it('does not show Details to a viewer without Users tab access', async () => {
    userStore.user = { userId: 'x', isAdmin: false } as never

    renderManager()

    await screen.findByText('Jane Doe')
    // Without Users tab access every row action is hidden, so no menu trigger renders at all.
    expect(screen.queryByRole('button', { name: /more options/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /details/i })).not.toBeInTheDocument()
  })

  it('shows an info toast and does not navigate when user management is disabled', async () => {
    vi.mocked(isUserManagementEnabled).mockReturnValue(false)

    renderManager()

    await openMenu()
    await userEvent.setup().click(await screen.findByRole('menuitem', { name: /details/i }))

    expect(toaster.info).toHaveBeenCalledWith('Users Management is unavailable in this environment')
    expect(push).not.toHaveBeenCalled()
  })
})
