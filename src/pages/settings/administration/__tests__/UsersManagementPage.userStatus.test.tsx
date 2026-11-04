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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import storage from '@/utils/storage'
import toaster from '@/utils/toaster'

import UsersManagementPage from '../UsersManagementPage'

const { mockUserStore, mockAppInfoStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: { userId: 'me', isAdmin: true, isMaintainer: false, isAuditor: false } as any,
    getUsers: vi.fn(),
    deactivateUser: vi.fn(),
    reactivateUser: vi.fn(),
  },
  mockAppInfoStore: {
    getIdpProvider: vi.fn(() => 'local'),
    configs: [] as unknown[],
    isConfigFetched: true,
    fetchCustomerConfig: vi.fn(),
  },
}))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/hooks/useVueRouter')
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))

vi.mock('@/components/Table', () => ({
  default: ({ items, customRenderColumns }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.id} data-testid={`row-${item.id}`}>
          {customRenderColumns.name(item)}
          {customRenderColumns.actions(item)}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: any) => (
    <div>
      {items.map((i: any) => (
        <button key={i.title} onClick={i.onClick}>
          {i.title}
        </button>
      ))}
    </div>
  ),
}))

const { modalRenders } = vi.hoisted(() => ({
  modalRenders: [] as { visible: boolean; header: string; message: string }[],
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ visible, header, message, confirmText, onConfirm, onCancel }: any) => {
    modalRenders.push({ visible, header, message })
    return visible ? (
      <div data-testid="confirm-modal">
        <h2>{header}</h2>
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText}</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  },
}))

vi.mock('../usersManagement/components/UsersManagementFilters', () => ({ default: () => null }))
vi.mock('../usersManagement/components/UsersManagementBulkActions', () => ({ default: () => null }))
vi.mock('../usersManagement/components/popups/UserDetailsPopup', () => ({ default: () => null }))
vi.mock('../usersManagement/components/popups/ResetBudgetPopup', () => ({ default: () => null }))
vi.mock('../usersManagement/components/popups/CreateUserPopup', () => ({ default: () => null }))
vi.mock('../components/BudgetAssignmentsModal', () => ({ default: () => null }))
vi.mock('../usersManagement/components/UserProjectSpendingTable', () => ({
  default: () => null,
  clearSpendingCache: vi.fn(),
}))

const makeUser = (id: string, name: string, is_active: boolean) => ({
  id,
  name,
  username: name.toLowerCase(),
  email: `${name.toLowerCase()}@test.com`,
  is_admin: false,
  is_active,
  user_type: 'internal',
  projects: [],
  budget_assignments: [],
})

const ACTIVE = makeUser('u-active', 'Alice', true)
const INACTIVE = makeUser('u-inactive', 'Bob', false)
const SELF = makeUser('me', 'Me', true)
const MAINTAINER = { ...makeUser('u-maint', 'Carol', true), is_maintainer: true }
const INACTIVE_MAINTAINER = { ...makeUser('u-maint-off', 'Dave', false), is_maintainer: true }
const ADMIN_ROW = { ...makeUser('u-admin', 'Erin', true), is_admin: true }

const setUsers = (...users: unknown[]) =>
  mockUserStore.getUsers.mockResolvedValue({
    data: users,
    pagination: { page: 0, per_page: 10, total: users.length },
  })

const setRole = (role: Record<string, boolean>) => {
  mockUserStore.user = {
    userId: 'me',
    isAdmin: false,
    isMaintainer: false,
    isAuditor: false,
    ...role,
  }
}

const renderPage = async () => {
  render(<UsersManagementPage />)
  await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())
}

const row = (id: string) => screen.findByTestId(`row-${id}`)

describe('UsersManagementPage — user status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storage.getObject).mockReturnValue([])
    setRole({ isAdmin: true })
    mockAppInfoStore.getIdpProvider.mockReturnValue('local')
    mockUserStore.deactivateUser.mockResolvedValue({ message: 'ok' })
    mockUserStore.reactivateUser.mockResolvedValue({})
    setUsers(ACTIVE, INACTIVE)
  })

  it('shows a Deactivated badge only on deactivated users', async () => {
    await renderPage()
    expect(await row('u-inactive')).toHaveTextContent('Deactivated')
    expect(await row('u-active')).not.toHaveTextContent('Deactivated')
  })

  it.each([
    ['admin', { isAdmin: true }],
    ['maintainer', { isMaintainer: true }],
  ])('lets a %s deactivate active and reactivate deactivated users', async (_label, role) => {
    setRole(role)
    await renderPage()
    expect(await row('u-active')).toHaveTextContent('Deactivate user')
    expect(await row('u-active')).not.toHaveTextContent('Reactivate user')
    expect(await row('u-inactive')).toHaveTextContent('Reactivate user')
    expect(await row('u-inactive')).not.toHaveTextContent('Deactivate user')
  })

  it.each([
    ['auditor', { isAuditor: true }],
    ['plain user', {}],
  ])('hides the actions from a %s', async (_label, role) => {
    setRole(role)
    await renderPage()
    expect(await row('u-active')).not.toHaveTextContent(/activate user/)
    expect(await row('u-inactive')).not.toHaveTextContent(/activate user/)
  })

  it('hides the actions on maintainer rows from a plain admin', async () => {
    setUsers(MAINTAINER, INACTIVE_MAINTAINER, ADMIN_ROW)
    await renderPage()
    expect(await row('u-maint')).not.toHaveTextContent(/activate user/)
    expect(await row('u-maint-off')).not.toHaveTextContent(/activate user/)
    expect(await row('u-admin')).toHaveTextContent('Deactivate user')
  })

  it('offers the actions on maintainer and admin rows to a maintainer', async () => {
    setRole({ isMaintainer: true })
    setUsers(MAINTAINER, INACTIVE_MAINTAINER, ADMIN_ROW)
    await renderPage()
    expect(await row('u-maint')).toHaveTextContent('Deactivate user')
    expect(await row('u-maint-off')).toHaveTextContent('Reactivate user')
    expect(await row('u-admin')).toHaveTextContent('Deactivate user')
  })

  it('does not offer Deactivate on the own row', async () => {
    setUsers(SELF, ACTIVE)
    await renderPage()
    expect(await row('me')).not.toHaveTextContent('Deactivate user')
    expect(await row('u-active')).toHaveTextContent('Deactivate user')
  })

  it('does not offer Deactivate on the own row for a maintainer', async () => {
    setRole({ isMaintainer: true })
    setUsers(SELF)
    await renderPage()
    expect(await row('me')).not.toHaveTextContent('Deactivate user')
  })

  it('confirms by name, deactivates, refreshes the list and toasts success', async () => {
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate user' }))

    expect(screen.getByTestId('confirm-modal')).toHaveTextContent('Alice')
    expect(mockUserStore.deactivateUser).not.toHaveBeenCalled()
    mockUserStore.getUsers.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(mockUserStore.deactivateUser).toHaveBeenCalledWith('u-active'))
    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())
    expect(toaster.info).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument())
  })

  it('confirms by name and reactivates', async () => {
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate user' }))

    expect(screen.getByTestId('confirm-modal')).toHaveTextContent('Bob')
    mockUserStore.getUsers.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }))

    await waitFor(() => expect(mockUserStore.reactivateUser).toHaveBeenCalledWith('u-inactive'))
    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())
    expect(toaster.info).toHaveBeenCalled()
  })

  it('calls nothing when the confirmation is cancelled', async () => {
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate user' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockUserStore.deactivateUser).not.toHaveBeenCalled()
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()
  })

  it('toasts the backend message and does not refresh when the action fails', async () => {
    mockUserStore.reactivateUser.mockRejectedValue({ parsedError: { message: 'Already active' } })
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate user' }))
    mockUserStore.getUsers.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }))

    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Already active'))
    expect(mockUserStore.getUsers).not.toHaveBeenCalled()
    expect(toaster.info).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument())
  })

  it('sends a single request when the confirm button is clicked twice', async () => {
    let resolve: (v: unknown) => void = () => {}
    mockUserStore.deactivateUser.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate user' }))
    const confirm = screen.getByRole('button', { name: 'Deactivate' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    resolve({ message: 'ok' })
    await waitFor(() => expect(toaster.info).toHaveBeenCalledTimes(1))
    expect(mockUserStore.deactivateUser).toHaveBeenCalledTimes(1)
  })

  it('keeps the confirmed user in the modal text while it closes', async () => {
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate user' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument())

    const closing = modalRenders[modalRenders.length - 1]
    expect(closing.visible).toBe(false)
    expect(closing.header).toBe('Deactivate user?')
    expect(closing.message).toBe('Are you sure you want to deactivate Alice?')
  })

  it('ignores Cancel while the request is in flight', async () => {
    let resolve: (v: unknown) => void = () => {}
    mockUserStore.deactivateUser.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate user' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()
    resolve({ message: 'ok' })
    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument())
  })

  const deactivateOnlyRowOfLastPage = async () => {
    mockUserStore.getUsers.mockResolvedValue({
      data: [ACTIVE],
      pagination: { page: 1, per_page: 10, total: 11 },
    })
    await renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate user' }))
    mockUserStore.getUsers.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(mockUserStore.deactivateUser).toHaveBeenCalledWith('u-active'))
    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())
  }

  it.each([true, false])(
    'loads the previous page when the only row of a later page changes status under is_active=%s',
    async (isActive) => {
      vi.mocked(storage.getObject).mockReturnValue({ is_active: isActive })
      await deactivateOnlyRowOfLastPage()

      expect(mockUserStore.getUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 0 }))
    }
  )

  it('refreshes the current page under the All filter when the only row of a later page is deactivated', async () => {
    await deactivateOnlyRowOfLastPage()

    expect(mockUserStore.getUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
    expect(mockUserStore.getUsers).not.toHaveBeenCalledWith(expect.objectContaining({ page: 0 }))
  })
})
