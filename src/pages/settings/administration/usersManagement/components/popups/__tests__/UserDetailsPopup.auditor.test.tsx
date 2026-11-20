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

// ---------------------------------------------------------------------------
// Store mocks
// ---------------------------------------------------------------------------

const { mockUserStore, mockAppInfoStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: null as any,
    getUserById: vi.fn(),
    getUserBudgets: vi.fn(),
    updateUser: vi.fn(),
    updateUserBudgets: vi.fn(),
  },
  mockAppInfoStore: { idpManagedEnabled: false, isAppInfoLoaded: true },
}))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})

vi.mock('@/hooks/useFeatureFlags', () => ({
  useBudgetManagementEnabled: () => [true, true],
}))

// ---------------------------------------------------------------------------
// UI component mocks (keep simple so test assertions land on real logic)
// ---------------------------------------------------------------------------

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="popup">{children}</div> : null,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner" />,
}))

vi.mock('@/components/form/Switch', () => ({
  default: ({ id, label, disabled, value, onChange }: any) => (
    <label>
      {label}
      <input
        id={id}
        type="checkbox"
        checked={!!value}
        disabled={!!disabled}
        onChange={onChange ?? (() => {})}
        data-testid={`switch-${id}`}
      />
    </label>
  ),
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/Tooltip', () => ({ default: () => null }))
vi.mock('@/components/details/DetailsCopyField', () => ({ default: () => null }))
vi.mock('@/components/details/DetailsProperty', () => ({ default: () => null }))
vi.mock('@/components/form/Select/Select', () => ({
  default: () => <div data-testid="user-type-select" />,
}))
vi.mock('@/pages/settings/components/SpendingCard', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/components/BudgetAssignmentsEditor', () => ({
  default: () => <div data-testid="budget-assignments-editor" />,
}))
vi.mock('@/components/Avatar/UserAvatar', () => ({
  default: () => null,
}))
vi.mock('@/pages/settings/administration/usersManagement/components/UserProjectsTable', () => ({
  default: () => null,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeUser = (overrides: Partial<UserListItem> = {}): UserListItem => ({
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
  projects: [],
  picture: null,
  date: null,
  ...overrides,
})

const renderPopup = (userId = 'target-1') =>
  render(<UserDetailsPopup userId={userId} isOpen onClose={vi.fn()} />)

const waitForContent = () =>
  waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument())

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserDetailsPopup — auditor role (EPMCDME-10930)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.getUserBudgets.mockResolvedValue([])
    mockAppInfoStore.idpManagedEnabled = false
    mockAppInfoStore.isAppInfoLoaded = true
  })

  describe('Admin switch', () => {
    const viewAs = async (viewer: object, target: Partial<UserListItem>) => {
      mockUserStore.user = { userId: 'viewer-1', isMaintainer: false, isAuditor: false, ...viewer }
      mockUserStore.getUserById.mockResolvedValue(makeUser({ id: 'target-2', ...target }))
      renderPopup('target-2')
      await waitForContent()
      return screen.getByTestId('switch-user-admin-role')
    }

    it('is enabled when an admin views a regular user', async () => {
      expect(await viewAs({ isAdmin: true, isMaintainer: true }, { is_admin: false })).not.toBeDisabled()
    })

    it('is disabled for a maintainer target, whose admin flag cannot be cleared', async () => {
      expect(
        await viewAs({ isAdmin: true, isMaintainer: true }, { is_admin: true, is_maintainer: true })
      ).toBeDisabled()
    })

    it('is disabled in IDP managed mode, where the Admin role comes from the identity provider', async () => {
      mockAppInfoStore.idpManagedEnabled = true

      expect(await viewAs({ isAdmin: true, isMaintainer: true }, { is_admin: false })).toBeDisabled()
    })

    it('is disabled until the app info has loaded, when the IDP mode is still unknown', async () => {
      mockAppInfoStore.isAppInfoLoaded = false

      expect(await viewAs({ isAdmin: true, isMaintainer: true }, { is_admin: false })).toBeDisabled()
    })

    it('is enabled when a maintainer, who counts as an admin, views an admin', async () => {
      expect(
        await viewAs({ isAdmin: true, isMaintainer: true }, { is_admin: true })
      ).not.toBeDisabled()
    })

    it('demotes an admin when a maintainer turns the switch off', async () => {
      mockUserStore.updateUser.mockResolvedValue(undefined)
      const adminSwitch = await viewAs({ isAdmin: true, isMaintainer: true }, { is_admin: true })

      fireEvent.click(adminSwitch)

      await waitFor(() =>
        expect(mockUserStore.updateUser).toHaveBeenCalledWith(
          'target-2',
          expect.objectContaining({ is_admin: false })
        )
      )
    })
  })

  it('hides the Platform Roles section when the viewer is admin-only (not maintainer)', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: true,
      isMaintainer: false,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(makeUser({ id: 'target-2' }))

    renderPopup('target-2')
    await waitForContent()

    expect(screen.queryByText('Platform Roles')).not.toBeInTheDocument()
    expect(screen.queryByTestId('switch-user-auditor-role')).not.toBeInTheDocument()
    expect(screen.queryByTestId('switch-user-admin-role')).not.toBeInTheDocument()
    expect(screen.queryByTestId('switch-user-maintainer-role')).not.toBeInTheDocument()
  })

  it('Platform Roles section is visible when viewer is maintainer', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: false,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(makeUser())

    renderPopup()
    await waitForContent()

    expect(screen.getByText('Platform Roles')).toBeInTheDocument()
    expect(screen.getByTestId('switch-user-auditor-role')).toBeInTheDocument()
  })

  it('Auditor switch is disabled when viewer is viewing their own account (canAssignAuditor = false)', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: false,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(makeUser({ id: 'viewer-1' }))

    renderPopup('viewer-1')
    await waitForContent()

    const auditorSwitch = screen.getByTestId('switch-user-auditor-role')
    expect(auditorSwitch).toBeDisabled()
  })

  it('Auditor switch is enabled when maintainer views a different user whose is_admin is false', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: false,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(makeUser({ id: 'target-1', is_admin: false }))

    renderPopup('target-1')
    await waitForContent()

    const auditorSwitch = screen.getByTestId('switch-user-auditor-role')
    expect(auditorSwitch).not.toBeDisabled()
  })

  it('Budget section is visible for auditor viewer and Edit button is absent (canViewBudgets=true, canManageBudgets=false)', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: false,
      isMaintainer: false,
      isAuditor: true,
    }
    mockUserStore.getUserById.mockResolvedValue(makeUser())

    renderPopup()
    await waitForContent()

    expect(screen.getByText('Budget assignments')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('Auditor switch is disabled and tooltip text is set when target user is admin', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: false,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(makeUser({ id: 'target-1', is_admin: true }))

    const { container } = renderPopup('target-1')
    await waitForContent()

    const auditorSwitch = screen.getByTestId('switch-user-auditor-role')
    expect(auditorSwitch).toBeDisabled()

    const tooltipSpan = container.querySelector('.user-auditor-role-tooltip')
    expect(tooltipSpan).toHaveAttribute('data-pr-tooltip', expect.stringContaining('Admin'))
  })

  it('Auditor switch is rendered before Admin and Maintainer switches', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: false,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(makeUser({ id: 'target-1' }))

    renderPopup('target-1')
    await waitForContent()

    const switchIds = screen
      .getAllByRole('checkbox')
      .map((el) => el.getAttribute('id'))
      .filter((id): id is string => !!id && id.endsWith('-role'))

    expect(switchIds).toEqual(['user-auditor-role', 'user-admin-role', 'user-maintainer-role'])
  })

  it('Turning on Admin for an auditor target clears the Auditor flag', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: false,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(
      makeUser({ id: 'target-1', is_auditor: true, is_admin: false, is_maintainer: false })
    )
    mockUserStore.updateUser.mockResolvedValue(undefined)

    renderPopup('target-1')
    await waitForContent()

    const auditorSwitch = screen.getByTestId('switch-user-auditor-role')
    const adminSwitch = screen.getByTestId('switch-user-admin-role')
    expect(auditorSwitch).toBeChecked()

    fireEvent.click(adminSwitch)

    await waitFor(() =>
      expect(mockUserStore.updateUser).toHaveBeenCalledWith(
        'target-1',
        expect.objectContaining({ is_admin: true, is_auditor: false })
      )
    )
    expect(auditorSwitch).not.toBeChecked()
    expect(auditorSwitch).toBeDisabled()
  })

  it('Turning on Maintainer for an auditor target clears the Auditor flag', async () => {
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: false,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(
      makeUser({ id: 'target-1', is_auditor: true, is_admin: false, is_maintainer: false })
    )
    mockUserStore.updateUser.mockResolvedValue(undefined)

    renderPopup('target-1')
    await waitForContent()

    const auditorSwitch = screen.getByTestId('switch-user-auditor-role')
    const maintainerSwitch = screen.getByTestId('switch-user-maintainer-role')
    expect(auditorSwitch).toBeChecked()

    fireEvent.click(maintainerSwitch)

    await waitFor(() =>
      expect(mockUserStore.updateUser).toHaveBeenCalledWith(
        'target-1',
        expect.objectContaining({ is_maintainer: true, is_admin: true, is_auditor: false })
      )
    )
    expect(auditorSwitch).not.toBeChecked()
    expect(auditorSwitch).toBeDisabled()
  })
})

describe('UserDetailsPopup — IdP locked platform roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.getUserBudgets.mockResolvedValue([])
    mockUserStore.user = {
      userId: 'viewer-1',
      isAdmin: true,
      isMaintainer: true,
      isAuditor: false,
    }
    mockUserStore.getUserById.mockResolvedValue(makeUser())
    mockAppInfoStore.idpManagedEnabled = false
    mockAppInfoStore.isAppInfoLoaded = true
  })

  it('keeps the user type editable and all role switches enabled when not locked', async () => {
    renderPopup()
    await waitForContent()

    expect(screen.getByTestId('user-type-select')).toBeInTheDocument()
    expect(screen.getByTestId('switch-user-auditor-role')).not.toBeDisabled()
    expect(screen.getByTestId('switch-user-admin-role')).not.toBeDisabled()
    expect(screen.getByTestId('switch-user-maintainer-role')).not.toBeDisabled()
  })

  it.each([
    ['IdP managed mode is on', { idpManagedEnabled: true, isAppInfoLoaded: true }],
    ['the app info has not loaded', { idpManagedEnabled: false, isAppInfoLoaded: false }],
  ])('shows user type read-only and disables every role switch when %s', async (_l, flags) => {
    Object.assign(mockAppInfoStore, flags)
    renderPopup()
    await waitForContent()

    expect(screen.queryByTestId('user-type-select')).not.toBeInTheDocument()
    expect(screen.getByTestId('switch-user-auditor-role')).toBeDisabled()
    expect(screen.getByTestId('switch-user-admin-role')).toBeDisabled()
    expect(screen.getByTestId('switch-user-maintainer-role')).toBeDisabled()
  })
})
