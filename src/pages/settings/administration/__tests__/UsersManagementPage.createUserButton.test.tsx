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

import UsersManagementPage from '../UsersManagementPage'

const { mockUserStore, mockAppInfoStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: { isAdmin: false, isMaintainer: false, isAuditor: false },
    getUsers: vi.fn(),
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

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content, rightContent }: any) => (
    <div data-testid="settings-layout">
      {rightContent}
      {content}
    </div>
  ),
}))

vi.mock('@/components/Table', () => ({ default: () => <div data-testid="table" /> }))

vi.mock('../usersManagement/components/UsersManagementFilters', () => ({
  default: () => <div data-testid="filters" />,
}))

vi.mock('../usersManagement/components/UsersManagementBulkActions', () => ({
  default: () => <div data-testid="bulk-actions" />,
}))

vi.mock('../usersManagement/components/popups/UserDetailsPopup', () => ({
  default: () => null,
}))

vi.mock('../usersManagement/components/popups/ResetBudgetPopup', () => ({
  default: () => null,
}))

vi.mock('../components/BudgetAssignmentsModal', () => ({
  default: () => null,
}))

vi.mock('../usersManagement/components/UserProjectSpendingTable', () => ({
  default: () => null,
  clearSpendingCache: vi.fn(),
}))

vi.mock('../usersManagement/components/popups/CreateUserPopup', () => ({
  default: ({ isOpen, onCreated }: any) =>
    isOpen ? (
      <div data-testid="create-user-popup">
        <button onClick={onCreated}>Simulate created</button>
      </div>
    ) : null,
}))

describe('UsersManagementPage — Create user button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.getUsers.mockResolvedValue({
      data: [],
      pagination: { page: 0, per_page: 10, total: 0 },
    })
    mockAppInfoStore.getIdpProvider.mockReturnValue('local')
  })

  it('is hidden for a plain user on a local IDP', async () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false, isAuditor: false }
    render(<UsersManagementPage />)
    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('is hidden for an admin when IDP is not local', async () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false, isAuditor: false }
    mockAppInfoStore.getIdpProvider.mockReturnValue('keycloak')
    render(<UsersManagementPage />)
    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('is hidden for an auditor on a local IDP', async () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false, isAuditor: true }
    mockAppInfoStore.getIdpProvider.mockReturnValue('local')
    render(<UsersManagementPage />)
    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('is visible for an admin on a local IDP and opens the popup', async () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false, isAuditor: false }
    mockAppInfoStore.getIdpProvider.mockReturnValue('local')
    render(<UsersManagementPage />)
    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByTestId('create-user-popup')).toBeInTheDocument()
  })

  it('is visible for a maintainer on a local IDP, opens the popup, and refreshes on created', async () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: true, isAuditor: false }
    mockAppInfoStore.getIdpProvider.mockReturnValue('local')
    render(<UsersManagementPage />)
    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByTestId('create-user-popup')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Simulate created'))
    expect(screen.queryByTestId('create-user-popup')).not.toBeInTheDocument()

    await waitFor(() => expect(mockUserStore.getUsers).toHaveBeenCalledTimes(2))
  })
})
