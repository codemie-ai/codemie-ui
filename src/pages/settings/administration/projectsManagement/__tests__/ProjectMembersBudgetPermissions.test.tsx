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

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProjectMembersManager from '@/pages/settings/administration/projectsManagement/ProjectMembersManager'
import { analyticsStore } from '@/store/analytics'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { userStore } from '@/store/user'
import { ProjectBudget } from '@/types/entity/projectBudget'
import { ProjectDetail } from '@/types/entity/projectManagement'

vi.mock('@/utils/toaster', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// The real bulk modal is a large form; this stand-in exposes only what the wiring under test
// consumes: whether Reset usage is offered, and the onSubmit callback.
vi.mock(
  '@/pages/settings/administration/components/projectsManagement/BulkBudgetOverrideModal',
  () => ({
    default: ({ visible, onSubmit, onResetUsage }: any) =>
      visible ? (
        <div data-testid="bulk-override-modal">
          {onResetUsage && <button type="button">Reset budget usage (bulk)</button>}
          <button
            type="button"
            onClick={() =>
              onSubmit([{ budgetId: 'budget-1', userId: 'u-1', payload: { max_budget: 10 } }])
            }
          >
            Submit bulk override
          </button>
        </div>
      ) : null,
  })
)

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
      },
    ],
  },
]

const memberUser = {
  id: 'u-1',
  name: 'Jane Doe',
  username: 'Jane Doe',
  email: 'jane@epam.com',
  is_admin: false,
  is_active: true,
  user_type: 'INTERNAL',
  auth_source: 'local',
  last_login_at: null,
  projects: [{ name: 'Test Project', is_project_admin: false }],
  picture: null,
  date: null,
}

const PROJECT_ADMIN = {
  userId: 'pa-1',
  isAdmin: false,
  isMaintainer: false,
  applicationsAdmin: ['Test Project'],
}
const MAINTAINER = {
  userId: 'm-1',
  isAdmin: false,
  isMaintainer: true,
  applicationsAdmin: ['Test Project'],
}

const PROJECT_ADMIN_OTHER = {
  userId: 'pa-2',
  isAdmin: false,
  isMaintainer: false,
  applicationsAdmin: ['Other Project'],
}
const REGULAR_USER = { userId: 'r-1', isAdmin: false, isMaintainer: false, applicationsAdmin: [] }
const PLATFORM_ADMIN = {
  userId: 'a-1',
  isAdmin: true,
  isMaintainer: false,
  applicationsAdmin: ['Test Project'],
}
const PLATFORM_ADMIN_MAINTAINER = { ...PLATFORM_ADMIN, isMaintainer: true }

const isRowOverrideVisible = async () => {
  await screen.findByText('Jane Doe')
  const trigger = screen.queryByRole('button', { name: /More options/ })
  if (!trigger) return false
  fireEvent.click(trigger)
  return !!screen.queryByRole('menuitem', { name: 'Override budgets' })
}

// Only users who can manage the project get table selection, so the "N selected" bar
// appearing is the signal that a bulk bar is reachable at all.
const selectFirstRow = async () => {
  fireEvent.click(await screen.findByText('Jane Doe'))
  return !!(await screen.findByText('1 selected', {}, { timeout: 300 }).catch(() => null))
}

const openBulkMenu = async () => {
  if (!(await selectFirstRow())) return false
  const bar = screen.getByText('1 selected').parentElement as HTMLElement
  fireEvent.click(within(bar).getByRole('button', { name: /More options/ }))
  return true
}

const isBulkOverrideVisible = async () => {
  if (!(await openBulkMenu())) return false
  return !!screen.queryByRole('menuitem', { name: 'Override budgets' })
}

const openRowOverrideModal = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /More options/ }))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Override budgets' }))
  expect(await screen.findByText('Budget Override — Jane Doe')).toBeInTheDocument()
}

describe('ProjectMembersManager — budget permissions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    userStore.getUsers = vi.fn().mockResolvedValue({
      data: [memberUser],
      pagination: { page: 0, per_page: 10, total: 1 },
    })
    vi.spyOn(analyticsStore, 'fetchProjectMemberSpending').mockResolvedValue({
      data: { rows: [] },
    } as never)
  })

  afterEach(cleanup)

  describe('Reset usage in the row Override budgets modal', () => {
    it('is absent for a project admin who is not a maintainer', async () => {
      userStore.user = PROJECT_ADMIN as never
      render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

      await openRowOverrideModal()

      expect(screen.queryByRole('button', { name: /Reset budget usage/ })).not.toBeInTheDocument()
    })

    it('is offered to a maintainer', async () => {
      userStore.user = MAINTAINER as never
      render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

      await openRowOverrideModal()

      expect(screen.getByRole('button', { name: /Reset budget usage/ })).toBeInTheDocument()
    })
  })
  describe('row and bulk Override budgets share one permission', () => {
    it.each([
      ['maintainer', MAINTAINER, true],
      ['project admin of this project', PROJECT_ADMIN, true],
      ['platform admin who is not a maintainer', PLATFORM_ADMIN, true],
      ['platform admin who is also a maintainer', PLATFORM_ADMIN_MAINTAINER, true],
      ['project admin of another project', PROJECT_ADMIN_OTHER, false],
      ['regular user', REGULAR_USER, false],
    ])('%s: row and bulk visibility match (%s)', async (_label, user, expected) => {
      userStore.user = user as never
      const { unmount } = render(
        <ProjectMembersManager project={mockProject} budgets={mockBudgets} />
      )
      const rowVisible = await isRowOverrideVisible()
      unmount()

      render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)
      const bulkVisible = await isBulkOverrideVisible()

      expect(rowVisible).toBe(expected)
      expect(bulkVisible).toBe(expected)
    })

    it.each([
      ['maintainer', MAINTAINER],
      ['project admin', PROJECT_ADMIN],
      ['platform admin', PLATFORM_ADMIN],
      ['platform admin and maintainer', PLATFORM_ADMIN_MAINTAINER],
    ])('%s: no override anywhere when no budgets are loaded', async (_label, user) => {
      userStore.user = user as never
      const { unmount } = render(<ProjectMembersManager project={mockProject} budgets={[]} />)
      const rowVisible = await isRowOverrideVisible()
      unmount()

      render(<ProjectMembersManager project={mockProject} budgets={[]} />)
      const bulkVisible = await isBulkOverrideVisible()

      expect(rowVisible).toBe(false)
      expect(bulkVisible).toBe(false)
    })
  })

  describe('Reset usage in the bulk Override budgets modal', () => {
    const openBulkModal = async () => {
      await openBulkMenu()
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Override budgets' }))
      await screen.findByTestId('bulk-override-modal')
    }

    it('is absent for a project admin who is not a maintainer', async () => {
      userStore.user = PROJECT_ADMIN as never
      render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

      await openBulkModal()

      expect(screen.queryByText('Reset budget usage (bulk)')).not.toBeInTheDocument()
    })

    it('is offered to a maintainer', async () => {
      userStore.user = MAINTAINER as never
      render(<ProjectMembersManager project={mockProject} budgets={mockBudgets} />)

      await openBulkModal()

      expect(screen.getByText('Reset budget usage (bulk)')).toBeInTheDocument()
    })

    it('refetches project budgets after a bulk override and hands them to onBudgetsChanged', async () => {
      userStore.user = PROJECT_ADMIN as never
      const refreshed = [{ ...mockBudgets[0], name: 'Refetched budget' }]
      vi.spyOn(projectBudgetsStore, 'overrideMemberAllocation').mockResolvedValue(
        undefined as never
      )
      const listSpy = vi
        .spyOn(projectBudgetsStore, 'listProjectBudgets')
        .mockResolvedValue(refreshed as never)
      const onBudgetsChanged = vi.fn()
      render(
        <ProjectMembersManager
          project={mockProject}
          budgets={mockBudgets}
          onBudgetsChanged={onBudgetsChanged}
        />
      )

      await openBulkModal()
      fireEvent.click(screen.getByText('Submit bulk override'))

      await waitFor(() => expect(onBudgetsChanged).toHaveBeenCalledWith(refreshed))
      expect(listSpy).toHaveBeenCalledWith({ projectName: 'Test Project' })
    })
  })
})
