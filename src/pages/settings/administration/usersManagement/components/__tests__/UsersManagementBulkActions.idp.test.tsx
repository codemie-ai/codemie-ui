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

import UsersManagementBulkActions from '../UsersManagementBulkActions'

vi.mock('@/components/DropdownButton/DropdownButton', () => ({
  default: ({ items }: { items: { label: string }[] }) => (
    <ul data-testid="bulk-items">
      {items.map((i) => (
        <li key={i.label}>{i.label}</li>
      ))}
    </ul>
  ),
}))
vi.mock('@/components/Table/BulkActions', () => ({
  default: ({ children }: any) => <div data-testid="bulk-panel">{children}</div>,
}))
vi.mock('@/pages/settings/administration/components/BudgetAssignmentsModal', () => ({
  default: () => null,
}))
vi.mock('../bulkPopups/AssignToProjectPopup', () => ({ default: () => null }))
vi.mock('../bulkPopups/BulkResetBudgetsPopup', () => ({ default: () => null }))
vi.mock('../bulkPopups/ChangeRolePopup', () => ({ default: () => null }))
vi.mock('../bulkPopups/UnassignBudgetsPopup', () => ({ default: () => null }))
vi.mock('../bulkPopups/UnassignFromProjectPopup', () => ({ default: () => null }))

const renderBar = (props: { canManageBudgets?: boolean; membershipLocked?: boolean }) =>
  render(
    <UsersManagementBulkActions
      selectedUsers={[]}
      onClearSelection={vi.fn()}
      refresh={vi.fn()}
      {...props}
    />
  )

describe('UsersManagementBulkActions — IdP managed mode', () => {
  it('offers project actions when membership is not locked', () => {
    renderBar({ canManageBudgets: false })
    expect(screen.getByText('Assign to Project')).toBeInTheDocument()
    expect(screen.getByText('Unassign from Project')).toBeInTheDocument()
  })

  it('removes project actions and keeps budget actions when locked', () => {
    renderBar({ canManageBudgets: true, membershipLocked: true })
    expect(screen.queryByText('Assign to Project')).not.toBeInTheDocument()
    expect(screen.queryByText('Unassign from Project')).not.toBeInTheDocument()
    expect(screen.getByText('Assign Budgets')).toBeInTheDocument()
    expect(screen.getByText('Unassign Budgets')).toBeInTheDocument()
    expect(screen.getByText('Reset Budgets')).toBeInTheDocument()
  })

  it('renders no panel when locked and no budget rights', () => {
    renderBar({ canManageBudgets: false, membershipLocked: true })
    expect(screen.queryByTestId('bulk-panel')).not.toBeInTheDocument()
  })
})
