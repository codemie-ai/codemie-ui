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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const navigateMock = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const { mockUserStore, mockBudgetsStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: null as null | { isAdmin: boolean; isMaintainer: boolean; isAuditor: boolean },
  },
  mockBudgetsStore: {
    budgets: [],
    pagination: { page: 1, perPage: 20, pages: 1, totalCount: 0 },
    loading: false,
    syncing: false,
    listBudgets: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store: unknown) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/store/budgets', () => ({ budgetsStore: mockBudgetsStore }))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content, rightContent }: any) => (
    <div>
      {rightContent}
      {content}
    </div>
  ),
}))

vi.mock('@/pages/settings/administration/components/BudgetModal', () => ({
  default: () => null,
}))

vi.mock('@/components/Table', () => ({
  default: () => <div data-testid="budget-table" />,
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: () => null,
}))

vi.mock('@/components/form/Select/Select', () => ({
  default: () => null,
}))

vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/plus-filled.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/refresh.svg?react', () => ({ default: () => null }))

describe('BudgetsManagementPage — auditor role (EPMCDME-10930)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBudgetsStore.listBudgets.mockResolvedValue(undefined)
  })

  it('auditor sees the budgets page without being redirected', async () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false, isAuditor: true }

    const { default: BudgetsManagementPage } = await import(
      '@/pages/settings/administration/BudgetsManagementPage'
    )
    render(<BudgetsManagementPage />)

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('regular user without any role is redirected away', async () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false, isAuditor: false }

    const { default: BudgetsManagementPage } = await import(
      '@/pages/settings/administration/BudgetsManagementPage'
    )
    render(<BudgetsManagementPage />)

    expect(navigateMock).toHaveBeenCalledWith('/settings/administration')
  })

  it('auditor does not see the Add or Sync buttons (read-only)', async () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false, isAuditor: true }

    const { default: BudgetsManagementPage } = await import(
      '@/pages/settings/administration/BudgetsManagementPage'
    )
    render(<BudgetsManagementPage />)

    expect(screen.queryByText('Add budget')).not.toBeInTheDocument()
    expect(screen.queryByText('Sync')).not.toBeInTheDocument()
  })
})
