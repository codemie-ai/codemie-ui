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
vi.mock('@/components/form/Switch', () => ({
  default: ({ id, value, disabled, onChange }: any) => (
    <input
      type="checkbox"
      data-testid={id}
      checked={!!value}
      disabled={disabled}
      onChange={onChange}
    />
  ),
}))
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

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const PROJECTS: UserListItem['projects'] = [
  { name: 'proj-a', is_project_admin: false, is_default: true },
  { name: 'proj-b', is_project_admin: false, is_default: false },
]

const withAdmin = (user: UserListItem, isAdmin: boolean): UserListItem => ({
  ...user,
  is_admin: isAdmin,
})

const adminSwitch = () => screen.getByTestId<HTMLInputElement>('user-admin-role')

// The panel stays editable while it refreshes in place (EPMCDME-15747), so a save can finish while
// that refresh still reads the pre-save snapshot. The confirmed save must win either way.
describe('UserDetailsPopup — a save during an in-place refresh is not overwritten', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: true,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserBudgets.mockResolvedValue([])
    mockUserStore.setDefaultProject.mockResolvedValue(undefined)
  })

  const openAndStartRefresh = async (staleRefresh: Promise<UserListItem>) => {
    const initial = withAdmin(makeUser(PROJECTS), false)
    mockUserStore.getUserById.mockResolvedValueOnce(initial).mockReturnValueOnce(staleRefresh)

    render(<UserDetailsPopup userId="target-1" isOpen onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('proj-b')).toBeInTheDocument())

    const rowB = screen.getByText('proj-b').closest('tr') as HTMLElement
    fireEvent.click(rowB.querySelector('[data-testid="default-toggle"]') as HTMLElement)
    await waitFor(() => expect(mockUserStore.getUserById).toHaveBeenCalledTimes(2))
  }

  it('refreshes again when a role save lands while the refresh is in flight', async () => {
    const staleRefresh = deferred<UserListItem>()
    await openAndStartRefresh(staleRefresh.promise)
    const save = deferred<void>()
    mockUserStore.updateUser.mockReturnValueOnce(save.promise)
    mockUserStore.getUserById.mockResolvedValueOnce(withAdmin(makeUser(PROJECTS), true))

    fireEvent.click(adminSwitch())
    save.resolve()

    await waitFor(() => expect(mockUserStore.getUserById).toHaveBeenCalledTimes(3))
    staleRefresh.resolve(withAdmin(makeUser(PROJECTS), false))
    await waitFor(() => expect(adminSwitch().checked).toBe(true))
  })

  it('keeps the saved role when the stale refresh lands before the save completes', async () => {
    const staleRefresh = deferred<UserListItem>()
    await openAndStartRefresh(staleRefresh.promise)
    const save = deferred<void>()
    mockUserStore.updateUser.mockReturnValueOnce(save.promise)

    fireEvent.click(adminSwitch())
    staleRefresh.resolve(withAdmin(makeUser(PROJECTS), false))
    await waitFor(() => expect(adminSwitch().checked).toBe(false))

    save.resolve()

    await waitFor(() => expect(adminSwitch().checked).toBe(true))
    expect(mockUserStore.getUserById).toHaveBeenCalledTimes(2)
  })
})
