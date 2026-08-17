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

import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Import order matters: @/test-utils/integration must evaluate BEFORE @/store/analytics.
// Entering the module graph through @/store/analytics triggers the circular chain
// @/store/analytics → @/utils/api → @/store (barrel), which leaves the barrel's re-exported
// userStore undefined and crashes SessionExpiredPopup (useSnapshot(undefined)) on every render.
// eslint-disable-next-line import/order
import { mockAPI, renderPage } from '@/test-utils/integration'
import { clearSpendingCache } from '@/pages/settings/administration/usersManagement/components/UserProjectSpendingTable'
import { analyticsStore } from '@/store/analytics'
import { appInfoStore } from '@/store/appInfo'

const maintainerUser = {
  user_id: 'maintainer-1',
  id: 'maintainer-1',
  email: 'maintainer@test.com',
  name: 'Maintainer User',
  username: 'maintainer',
  is_admin: true,
  is_maintainer: true,
  user_type: 'INTERNAL',
  applications: [],
  projects: [],
}

const janeUser = {
  user_id: 'jane-1',
  id: 'jane-1',
  name: 'Jane Doe',
  email: 'jane@epam.com',
  username: 'jane',
  is_admin: false,
  user_type: 'INTERNAL',
  applications: [],
  projects: [{ name: 'project-6', is_project_admin: false }],
  budget_assignments: [],
}

const johnUser = {
  user_id: 'john-1',
  id: 'john-1',
  name: 'John Smith',
  email: 'john@epam.com',
  username: 'john',
  is_admin: false,
  user_type: 'INTERNAL',
  applications: [],
  projects: [{ name: 'project-7', is_project_admin: false }],
  budget_assignments: [],
}

const usersResponse = (data: unknown[]) => ({
  data,
  pagination: { page: 0, per_page: 10, total: data.length },
})

const spendingResponse = (rows: unknown[]) => ({
  data: { columns: [], rows },
  metadata: { timestamp: '', data_as_of: '' },
  pagination: { page: 0, per_page: 50, total_count: rows.length, has_more: false },
})

const janeSpendingRows = [
  {
    project_name: 'project-6',
    display_name: 'Project 6',
    platform: 120.5,
    cli: 40,
    premium_models: 0,
    platform_limit: 500,
    cli_limit: null,
    premium_models_limit: null,
  },
]

const johnSpendingRows = [
  {
    project_name: 'project-7',
    display_name: 'Project 7',
    platform: 10,
    cli: 5,
    premium_models: 0,
    platform_limit: 500,
    cli_limit: null,
    premium_models_limit: null,
  },
]

describe('UsersManagementPage — expandable spending row', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSpendingCache()

    // canManageBudgets requires both the feature flag and a maintainer user.
    appInfoStore.configs = [
      { id: 'features:budgetManagement', settings: { enabled: true } },
    ] as never
    appInfoStore.isConfigFetched = true
    mockAPI('GET', 'v1/user', maintainerUser)

    mockAPI('GET', 'v1/admin/users', usersResponse([janeUser]))

    // BudgetSelector mounts with the budget-management flag on and fetches options in an
    // uncaught useEffect. Unmocked routes resolve to a null body, which makes it throw.
    mockAPI('GET', 'v1/admin/budgets', { data: [] })
  })

  it('renders one nested row per project when a user row is expanded', async () => {
    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockResolvedValue(
      spendingResponse(janeSpendingRows) as never
    )

    renderPage('/settings/administration/users')

    await screen.findByText('jane@epam.com')

    fireEvent.click(screen.getByRole('button', { name: 'Expand row' }))

    expect(await screen.findByText('Project 6')).toBeInTheDocument()
    expect(screen.getByText('$120.50 / $500.00')).toBeInTheDocument()
  })

  it('does not fetch spending until a row is expanded', async () => {
    const spy = vi
      .spyOn(analyticsStore, 'fetchUserProjectSpending')
      .mockResolvedValue(spendingResponse(janeSpendingRows) as never)

    renderPage('/settings/administration/users')

    await screen.findByText('jane@epam.com')
    expect(spy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Expand row' }))

    await screen.findByText('Project 6')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('jane@epam.com')
  })

  it('does not refetch when the same row is re-expanded', async () => {
    const spy = vi
      .spyOn(analyticsStore, 'fetchUserProjectSpending')
      .mockResolvedValue(spendingResponse(janeSpendingRows) as never)

    renderPage('/settings/administration/users')

    await screen.findByText('jane@epam.com')

    fireEvent.click(screen.getByRole('button', { name: 'Expand row' }))
    await screen.findByText('Project 6')
    expect(spy).toHaveBeenCalledTimes(1)

    // Collapse.
    fireEvent.click(screen.getByRole('button', { name: 'Collapse row' }))
    expect(screen.queryByText('Project 6')).not.toBeInTheDocument()

    // Re-expand.
    fireEvent.click(screen.getByRole('button', { name: 'Expand row' }))
    await screen.findByText('Project 6')

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('expands two rows independently', async () => {
    mockAPI('GET', 'v1/admin/users', usersResponse([janeUser, johnUser]))

    vi.spyOn(analyticsStore, 'fetchUserProjectSpending').mockImplementation(
      async (userEmail: string) =>
        (userEmail === 'jane@epam.com'
          ? spendingResponse(janeSpendingRows)
          : spendingResponse(johnSpendingRows)) as never
    )

    renderPage('/settings/administration/users')

    await screen.findByText('jane@epam.com')
    await screen.findByText('john@epam.com')

    const expandButtons = screen.getAllByRole('button', { name: 'Expand row' })
    expect(expandButtons).toHaveLength(2)

    fireEvent.click(expandButtons[0])
    await screen.findByText('Project 6')

    fireEvent.click(screen.getAllByRole('button', { name: 'Expand row' })[0])
    await screen.findByText('Project 7')

    expect(screen.getByText('Project 6')).toBeInTheDocument()
    expect(screen.getByText('Project 7')).toBeInTheDocument()
  })
})
