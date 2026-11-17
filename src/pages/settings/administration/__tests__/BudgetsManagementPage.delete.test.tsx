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

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import BudgetsManagementPage from '../BudgetsManagementPage'

const DEFAULT_BUDGETS = [
  { budget_id: 'manual-1', name: 'Manual Budget', is_preconfigured: false },
  { budget_id: 'preset-1', name: 'Preset Budget', is_preconfigured: true },
]

const { mockUserStore, mockBudgetsStore, mockToaster } = vi.hoisted(() => ({
  mockUserStore: {
    user: null as null | { isAdmin: boolean; isMaintainer: boolean; isAuditor: boolean },
  },
  mockBudgetsStore: {
    budgets: [] as any[],
    pagination: { page: 0, perPage: 20, totalPages: 1 },
    loading: false,
    syncing: false,
    listBudgets: vi.fn(),
    deleteBudget: vi.fn(),
  },
  mockToaster: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => vi.fn() }
})
vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store: unknown) => store),
  subscribe: vi.fn(),
}))
vi.mock('@/router', () => ({ router: { state: { matches: [] }, navigate: vi.fn() } }))
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn() }, findRouteObject: vi.fn() }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/store/budgets', () => ({ budgetsStore: mockBudgetsStore }))
vi.mock('@/utils/toaster', () => ({ default: mockToaster }))
vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content, rightContent }: any) => (
    <div>
      {rightContent}
      {content}
    </div>
  ),
}))
vi.mock('@/pages/settings/administration/components/BudgetModal', () => ({ default: () => null }))
vi.mock('@/components/form/Select/Select', () => ({ default: () => null }))
vi.mock('@/components/Table', () => ({
  default: ({ items, columnDefinitions, customRenderColumns }: any) => (
    <div>
      {columnDefinitions.map((c: any) => (
        <span key={c.key}>{c.label}</span>
      ))}
      {items.map((item: any) => (
        <div key={item.budget_id} data-testid={`row-${item.budget_id}`}>
          {customRenderColumns.name(item)}
          {customRenderColumns.actions?.(item)}
        </div>
      ))}
    </div>
  ),
}))

const openMenu = (budgetId: string) =>
  fireEvent.click(within(screen.getByTestId(`row-${budgetId}`)).getByRole('button'))

const renderAsMaintainer = () => {
  mockUserStore.user = { isAdmin: true, isMaintainer: true, isAuditor: false }
  render(<BudgetsManagementPage />)
}

const openDeletePopup = () => {
  renderAsMaintainer()
  openMenu('manual-1')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
}

describe('BudgetsManagementPage delete budget (EPMCDME-15633)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBudgetsStore.budgets = DEFAULT_BUDGETS.map((budget) => ({ ...budget }))
    mockBudgetsStore.pagination = { page: 0, perPage: 20, totalPages: 1 }
    mockBudgetsStore.listBudgets.mockResolvedValue(undefined)
    mockBudgetsStore.deleteBudget.mockResolvedValue(undefined)
  })

  it('shows Edit and Delete in the menu of a manual budget for a maintainer', () => {
    renderAsMaintainer()
    openMenu('manual-1')

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows only View details, no Edit or Delete, for a preconfigured budget', () => {
    renderAsMaintainer()
    openMenu('preset-1')

    expect(screen.getByRole('menuitem', { name: 'View details' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it.each([
    ['plain admin', { isAdmin: true, isMaintainer: false, isAuditor: false }],
    ['auditor', { isAdmin: false, isMaintainer: false, isAuditor: true }],
  ])('gives a %s only View details, no Edit or Delete', (_, user) => {
    mockUserStore.user = user
    render(<BudgetsManagementPage />)
    openMenu('manual-1')

    expect(screen.getByRole('menuitem', { name: 'View details' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('names the budget in the confirmation popup', () => {
    openDeletePopup()

    expect(screen.getByText(/Delete budget "Manual Budget" \(manual-1\)/)).toBeInTheDocument()
  })

  it('makes no API call when Cancel is clicked', async () => {
    openDeletePopup()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByText(/This cannot be undone/)).not.toBeInTheDocument())
    expect(mockBudgetsStore.deleteBudget).not.toHaveBeenCalled()
  })

  it('deletes the budget, reports success and reloads the list on confirm', async () => {
    openDeletePopup()
    mockBudgetsStore.listBudgets.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockBudgetsStore.deleteBudget).toHaveBeenCalledWith('manual-1'))
    await waitFor(() =>
      expect(mockToaster.info).toHaveBeenCalledWith('Budget deleted successfully')
    )
    expect(mockBudgetsStore.listBudgets).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText(/This cannot be undone/)).not.toBeInTheDocument())
  })

  it('does not report success or reload when the backend refuses (409)', async () => {
    mockBudgetsStore.deleteBudget.mockRejectedValue({
      parsedError: { message: "Budget 'manual-1' is in use: 3 users assigned" },
    })
    openDeletePopup()
    mockBudgetsStore.listBudgets.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText(/This cannot be undone/)).not.toBeInTheDocument())
    expect(mockToaster.info).not.toHaveBeenCalled()
    expect(mockToaster.error).not.toHaveBeenCalled()
    expect(mockBudgetsStore.listBudgets).not.toHaveBeenCalled()
  })

  it('disables Delete and submits once while the request is in flight', async () => {
    let resolveDelete!: () => void
    mockBudgetsStore.deleteBudget.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve
      })
    )
    openDeletePopup()
    const confirm = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    await waitFor(() => expect(confirm).toBeDisabled())
    expect(mockBudgetsStore.deleteBudget).toHaveBeenCalledTimes(1)
    resolveDelete()
    await waitFor(() => expect(mockToaster.info).toHaveBeenCalled())
  })

  it.each([
    [3, '3 users are assigned to this budget. Unassign them before deleting.'],
    [1, '1 user is assigned to this budget. Unassign them before deleting.'],
  ])('disables Delete with a hint when %i user(s) are assigned', (userCount, hint) => {
    mockBudgetsStore.budgets[0].user_count = userCount
    renderAsMaintainer()
    openMenu('manual-1')

    const deleteItem = screen.getByRole('menuitem', { name: 'Delete' })
    expect(deleteItem).toBeDisabled()
    expect(deleteItem).toHaveAttribute('data-tooltip-content', hint)

    fireEvent.click(deleteItem)
    expect(screen.queryByText(/This cannot be undone/)).not.toBeInTheDocument()
    expect(mockBudgetsStore.deleteBudget).not.toHaveBeenCalled()
  })

  it.each([
    ['no users are assigned', 0],
    ['the user count is unknown', undefined],
  ])('keeps Delete enabled without a hint when %s', (_, userCount) => {
    mockBudgetsStore.budgets[0].user_count = userCount
    renderAsMaintainer()
    openMenu('manual-1')

    const deleteItem = screen.getByRole('menuitem', { name: 'Delete' })
    expect(deleteItem).toBeEnabled()
    expect(deleteItem).not.toHaveAttribute('data-tooltip-content')
  })

  it('loads the previous page after deleting the only budget on a later page', async () => {
    mockBudgetsStore.budgets = [mockBudgetsStore.budgets[0]]
    mockBudgetsStore.pagination = { page: 1, perPage: 20, totalPages: 2 }
    openDeletePopup()
    mockBudgetsStore.listBudgets.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockBudgetsStore.listBudgets).toHaveBeenCalled())
    expect(mockBudgetsStore.listBudgets).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }))
  })

  it('stays on the current page when other budgets remain on it', async () => {
    mockBudgetsStore.pagination = { page: 1, perPage: 20, totalPages: 2 }
    openDeletePopup()
    mockBudgetsStore.listBudgets.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockBudgetsStore.listBudgets).toHaveBeenCalled())
    expect(mockBudgetsStore.listBudgets).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })

  it.each([
    ['cancelled', 'Cancel'],
    ['confirmed', 'Delete'],
  ])('keeps naming the budget while the popup closes after it is %s', async (_, button) => {
    openDeletePopup()
    const renderedMessages: string[] = []
    const observer = new MutationObserver(() => {
      const message = screen.queryByText(/This cannot be undone/)
      if (message?.textContent) renderedMessages.push(message.textContent)
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    fireEvent.click(screen.getByRole('button', { name: button }))
    await waitFor(() => expect(screen.queryByText(/This cannot be undone/)).not.toBeInTheDocument())
    observer.disconnect()

    expect(renderedMessages.join('\n')).not.toContain('undefined')
  })
})
