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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UserListItem } from '@/types/entity/user'

import UserDetailsPopup from '../UserDetailsPopup'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: null as any,
    getUserById: vi.fn(),
    getUserBudgets: vi.fn(),
    updateUser: vi.fn(),
    updateUserBudgets: vi.fn(),
    addUserProjectAccess: vi.fn(),
    updateUserProjectAccess: vi.fn(),
    removeUserProjectAccess: vi.fn(),
    setDefaultProject: vi.fn(),
  },
}))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})
vi.mock('@/hooks/useFeatureFlags', () => ({ useBudgetManagementEnabled: () => [true, true] }))
vi.mock('@/components/Popup', () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="popup">{children}</div> : null,
}))
vi.mock('@/components/Spinner', () => ({ default: () => <div data-testid="spinner" /> }))
vi.mock('@/components/form/Switch', () => ({ default: () => null }))
vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('@/components/Tooltip', () => ({ default: () => null }))
vi.mock('@/components/details/DetailsCopyField', () => ({ default: () => null }))
vi.mock('@/components/details/DetailsProperty', () => ({ default: () => null }))
vi.mock('@/components/form/Select/Select', () => ({ default: () => null }))
vi.mock('@/components/form/Select', () => ({ default: () => null }))
vi.mock('@/pages/settings/components/SpendingCard', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/components/BudgetAssignmentsEditor', () => ({
  default: () => null,
}))
vi.mock('@/pages/settings/administration/usersManagement/components/UserAvatar', () => ({
  default: () => null,
}))
vi.mock(
  '@/pages/settings/administration/usersManagement/components/popups/AddProjectPopup',
  () => ({ default: () => null })
)

const makeUser = (projects: UserListItem['projects']): UserListItem => ({
  id: 'target-1',
  name: 'Target User',
  username: 'target',
  email: 'target@example.com',
  is_admin: false,
  is_maintainer: false,
  is_auditor: false,
  is_active: true,
  user_type: 'regular',
  auth_source: 'internal',
  last_login_at: null,
  projects,
  picture: null,
  date: null,
})

const pressedState = () =>
  [...document.querySelectorAll('[data-testid="default-toggle"]')].map((b) => [
    b.closest('tr')?.querySelector('td')?.textContent?.trim(),
    String(b.querySelector('input')?.checked),
  ])

describe('UserDetailsPopup — confirmed default survives a failed refresh (R05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: true,
      isMaintainer: false,
      isAuditor: false,
    }
    mockUserStore.getUserBudgets.mockResolvedValue([])
    mockUserStore.setDefaultProject.mockResolvedValue(undefined)
  })

  it('keeps the new default when the details refetch after a successful set-default fails', async () => {
    const initial = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])
    mockUserStore.getUserById
      .mockResolvedValueOnce(initial)
      .mockRejectedValue(new Error('network down'))

    render(<UserDetailsPopup userId="target-1" isOpen onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('proj-b')).toBeInTheDocument())

    const rowB = screen.getByText('proj-b').closest('tr') as HTMLElement
    fireEvent.click(rowB.querySelector('[data-testid="default-toggle"]') as HTMLElement)

    await waitFor(() => expect(mockUserStore.getUserById).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(pressedState()).toEqual([
        ['proj-a', 'false'],
        ['proj-b', 'true'],
      ])
    )
  })

  it('keeps fetched details when only the budgets request fails', async () => {
    mockUserStore.getUserById.mockResolvedValue(
      makeUser([{ name: 'proj-a', is_project_admin: false, is_default: true }])
    )
    mockUserStore.getUserBudgets.mockRejectedValue(new Error('budgets down'))

    render(<UserDetailsPopup userId="target-1" isOpen onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('proj-a')).toBeInTheDocument())
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
  })
})
