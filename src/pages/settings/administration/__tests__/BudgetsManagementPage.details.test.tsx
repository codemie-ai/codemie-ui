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

import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import BudgetsManagementPage from '../BudgetsManagementPage'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: { isAdmin: false, isMaintainer: false, isAuditor: true },
  },
}))

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => vi.fn() }
})
vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store: unknown) => store),
  subscribe: vi.fn(() => vi.fn()),
}))
vi.mock('@/router', () => ({ router: { state: { matches: [] }, navigate: vi.fn() } }))
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn() }, findRouteObject: vi.fn() }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/store/budgets', () => {
  const base = {
    description: null,
    soft_budget: 1,
    max_budget: 2,
    budget_duration: '1d',
    budget_category: 'platform',
  }
  return {
    budgetsStore: {
      budgets: [
        {
          ...base,
          budget_id: 'manual',
          name: 'Manual',
          created_by: 'user-1',
          created_by_name: 'Jane Doe',
        },
        {
          ...base,
          budget_id: 'default',
          name: 'Default',
          created_by: 'system',
          is_preconfigured: true,
          created_by_name: null,
        },
      ],
      pagination: { page: 0, perPage: 20, totalPages: 1 },
      loading: false,
      syncing: false,
      listBudgets: vi.fn().mockResolvedValue(undefined),
    },
  }
})
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))
vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ contextId, items }: any) => (
    <div data-testid={contextId}>
      {items.map((menuItem: any) => (
        <button key={menuItem.title} onClick={menuItem.onClick}>
          {menuItem.title}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@/pages/settings/administration/components/BudgetModal', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/components/BudgetDetailsPopup', () => ({
  default: ({ budget }: any) => (budget ? <div>details for {budget.budget_id}</div> : null),
}))
vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))
vi.mock('@/components/form/Select/Select', () => ({ default: () => <div /> }))

const rowMenu = (budgetId: string) => within(screen.getByTestId(`budget-mgmt-name-${budgetId}`))

describe('BudgetsManagementPage budget details action', () => {
  beforeEach(() => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false, isAuditor: true }
  })

  it('gives an auditor View details on every budget, including preconfigured ones, and no Edit', () => {
    render(<BudgetsManagementPage />)

    for (const budgetId of ['manual', 'default']) {
      expect(rowMenu(budgetId).getByText('View details')).toBeInTheDocument()
      expect(rowMenu(budgetId).queryByText('Edit')).not.toBeInTheDocument()
    }
  })

  it('gives a maintainer Edit only on budgets that are not preconfigured', () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: true, isAuditor: false }
    render(<BudgetsManagementPage />)

    expect(rowMenu('manual').getByText('Edit')).toBeInTheDocument()
    expect(rowMenu('default').queryByText('Edit')).not.toBeInTheDocument()
    expect(rowMenu('default').getByText('View details')).toBeInTheDocument()
  })

  it('opens the details popup for the chosen budget', () => {
    render(<BudgetsManagementPage />)

    fireEvent.click(rowMenu('default').getByText('View details'))

    expect(screen.getByText('details for default')).toBeInTheDocument()
  })
})
