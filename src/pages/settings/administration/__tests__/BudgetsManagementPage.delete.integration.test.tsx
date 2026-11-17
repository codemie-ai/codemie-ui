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

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { mockAPI, renderPage } from '@/test-utils/integration'
import toaster from '@/utils/toaster'

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

const budgetsResponse = {
  data: [
    {
      budget_id: 'manual-1',
      name: 'Manual Budget',
      budget_category: 'platform',
      max_budget: 100,
      soft_budget: 50,
      is_preconfigured: false,
    },
  ],
  pagination: { page: 0, per_page: 10, total: 1 },
}

const IN_USE_MESSAGE = "Budget 'manual-1' is in use: 3 users assigned"

const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

const budgetListRequests = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter(
      ([input, init]) =>
        requestUrl(input).includes('v1/admin/budgets?') && (init?.method ?? 'GET') === 'GET'
    )

const confirmDelete = async () => {
  mockAPI('GET', 'v1/user', maintainerUser)
  mockAPI('GET', 'v1/admin/budgets', budgetsResponse)
  renderPage('/settings/administration/budgets')

  const nameCell = await screen.findByText('Manual Budget')
  const row = nameCell.closest('tr') as HTMLElement
  fireEvent.click(within(row).getByRole('button'))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
  const dialog = await screen.findByRole('dialog')
  const listCallsBefore = budgetListRequests().length
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
  return listCallsBefore
}

describe('BudgetsManagementPage delete budget — API flow (EPMCDME-15633)', () => {
  it('sends DELETE for the budget and reports success', async () => {
    mockAPI('DELETE', 'v1/admin/budgets/manual-1', null)

    await confirmDelete()

    await waitFor(() =>
      expect(vi.mocked(toaster.info)).toHaveBeenCalledWith('Budget deleted successfully')
    )
    const deleteCall = vi
      .mocked(fetch)
      .mock.calls.find(([, init]) => init?.method?.toUpperCase() === 'DELETE')
    expect(deleteCall ? requestUrl(deleteCall[0]) : undefined).toMatch(
      /v1\/admin\/budgets\/manual-1$/
    )
  })

  it('shows the backend "users assigned" message once when the budget is in use (409)', async () => {
    mockAPI('DELETE', 'v1/admin/budgets/manual-1', { error: { message: IN_USE_MESSAGE } }, 409)

    const listCallsBefore = await confirmDelete()

    await waitFor(() => expect(vi.mocked(toaster.error)).toHaveBeenCalledWith(IN_USE_MESSAGE))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(vi.mocked(toaster.error)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(toaster.info)).not.toHaveBeenCalled()
    expect(budgetListRequests()).toHaveLength(listCallsBefore)
  })
})
