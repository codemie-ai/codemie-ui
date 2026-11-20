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
import { describe, it, expect, vi } from 'vitest'

import { UserListItem } from '@/types/entity/user'

import ProjectMembersBulkActions from '../ProjectMembersBulkActions'

vi.mock('@/components/NavigationMore', () => ({
  default: ({ items }: { items: Array<{ title: string; divider?: boolean }> }) => (
    <ul data-testid="bulk-menu">
      {items.map((item) =>
        item.divider ? (
          <li key={item.title} data-testid="menu-divider" />
        ) : (
          <li key={item.title}>{item.title}</li>
        )
      )}
    </ul>
  ),
}))
vi.mock('@/components/Table/BulkActions', () => ({
  default: ({ children }: any) => <div data-testid="bulk-actions">{children}</div>,
}))
vi.mock('../ChangeProjectRolePopup', () => ({ default: () => null }))
vi.mock('../UnassignFromProjectConfirmationPopup', () => ({ default: () => null }))
vi.mock('../BulkBudgetOverrideModal', () => ({ default: () => null }))
vi.mock(
  '@/pages/settings/administration/usersManagement/components/bulkPopups/BulkResetBudgetsPopup',
  () => ({ default: () => null })
)

const selectedUsers = [{ id: 'u-1', name: 'Jane', email: 'jane@example.com' } as UserListItem]

const renderBulkActions = (
  props: Partial<React.ComponentProps<typeof ProjectMembersBulkActions>>
) =>
  render(
    <ProjectMembersBulkActions
      projectName="proj"
      selectedUsers={selectedUsers}
      currentUserId="admin-1"
      canManageProject
      isProjectAdmin={false}
      canManageBudgets={false}
      onClearSelection={vi.fn()}
      refresh={vi.fn()}
      onOverrideModels={vi.fn()}
      budgets={[]}
      budgetAllocationLookup={null}
      {...props}
    />
  )

describe('ProjectMembersBulkActions — membership lock (IDP managed mode)', () => {
  it('offers Change Role and Unassign when membership is not locked', () => {
    renderBulkActions({})

    expect(screen.getByText('Change Role')).toBeInTheDocument()
    expect(screen.getByText('Unassign from Project')).toBeInTheDocument()
    expect(screen.getByTestId('menu-divider')).toBeInTheDocument()
  })

  it('hides Change Role, Unassign and the divider when membership is locked', () => {
    renderBulkActions({ membershipLocked: true, canManageBudgets: true })

    expect(screen.queryByText('Change Role')).not.toBeInTheDocument()
    expect(screen.queryByText('Unassign from Project')).not.toBeInTheDocument()
    expect(screen.queryByTestId('menu-divider')).not.toBeInTheDocument()
    expect(screen.getByText('Override budgets')).toBeInTheDocument()
  })

  it('renders no bulk actions at all when locked and nothing else is available', () => {
    renderBulkActions({ membershipLocked: true, canManageBudgets: false })

    expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument()
  })
})
