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
import { appInfoStore } from '@/store/appInfo'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { userStore } from '@/store/user'
import { ProjectType } from '@/types/entity/project'
import type { ProjectDetail } from '@/types/entity/projectManagement'

vi.mock('@/utils/enterpriseEdition', () => ({ isEnterpriseEdition: vi.fn(() => false) }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))

const project: ProjectDetail = {
  name: 'Alpha',
  description: '',
  project_type: ProjectType.SHARED,
  created_by: 'owner-1',
  created_at: '2026-01-01T00:00:00Z',
  user_count: 1,
  admin_count: 1,
  cost_center_id: null,
  cost_center_name: null,
  enforce_member_spend_limits: false,
  members: [],
}

const member = {
  id: 'u-1',
  name: 'Jane Doe',
  username: 'jane',
  email: 'jane@epam.com',
  is_admin: false,
  is_active: true,
  user_type: 'INTERNAL',
  auth_source: 'local',
  last_login_at: null,
  projects: [{ name: 'Alpha', is_project_admin: false }],
  picture: null,
  date: null,
}

const renderManager = () =>
  render(
    <MemoryRouter>
      <ProjectMembersManager project={project} budgets={[]} />
    </MemoryRouter>
  )

const openRowMenu = async () => {
  const trigger = await screen.findByRole('button', { name: /more options/i })
  await userEvent.setup().click(trigger)
}

describe('ProjectMembersManager — membership is read-only when the IdP owns it', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.idpManagedEnabled = false
    appInfoStore.isAppInfoLoaded = true
    userStore.user = { userId: 'admin-1', isAdmin: true } as never
    userStore.getUsers = vi.fn().mockResolvedValue({
      data: [member],
      pagination: { page: 0, per_page: 10, total: 1 },
    })
    vi.spyOn(projectBudgetsStore, 'listProjectBudgets').mockResolvedValue([])
  })

  it('offers the membership controls when the deployment is not IDP managed', async () => {
    renderManager()

    expect(await screen.findByRole('button', { name: /add user to project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import users/i })).toBeInTheDocument()
    expect(document.getElementById('role-u-1')).not.toHaveAttribute('data-p-disabled', 'true')
    await openRowMenu()
    expect(
      await screen.findByRole('menuitem', { name: /unassign from project/i })
    ).toBeInTheDocument()
  })

  it.each([
    ['the deployment is IDP managed', { idpManagedEnabled: true, isAppInfoLoaded: true }],
    ['the app info has not loaded yet', { idpManagedEnabled: false, isAppInfoLoaded: false }],
  ])('locks the role, hides add, import and unassign when %s', async (_label, flags) => {
    Object.assign(appInfoStore, flags)

    renderManager()

    await screen.findByText('Jane Doe')
    expect(document.getElementById('role-u-1')).toHaveAttribute('data-p-disabled', 'true')
    expect(screen.queryByRole('button', { name: /add user to project/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /import users/i })).not.toBeInTheDocument()
    await openRowMenu()
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('menuitem', { name: /unassign from project/i })
    ).not.toBeInTheDocument()
  })
  describe('bulk actions on a selected member', () => {
    const selectMember = async () => {
      await screen.findByText('Jane Doe')
      const rowCheckbox = screen.getAllByRole('checkbox').find((el) => !el.closest('thead'))
      await userEvent.setup().click(rowCheckbox as HTMLElement)
      expect(rowCheckbox).toBeChecked()
    }

    it('offers Bulk Actions when the deployment is not IDP managed', async () => {
      renderManager()

      await selectMember()

      expect(await screen.findByText(/bulk actions/i)).toBeInTheDocument()
    })

    it.each([
      ['the deployment is IDP managed', { idpManagedEnabled: true, isAppInfoLoaded: true }],
      ['the app info has not loaded yet', { idpManagedEnabled: false, isAppInfoLoaded: false }],
    ])('offers no Change Role or Unassign bulk action when %s', async (_label, flags) => {
      Object.assign(appInfoStore, flags)
      renderManager()

      await selectMember()

      expect(screen.queryByText(/bulk actions/i)).not.toBeInTheDocument()
    })
  })
})
