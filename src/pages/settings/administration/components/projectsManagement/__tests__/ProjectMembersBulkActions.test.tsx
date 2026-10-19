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

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { projectBudgetsStore } from '@/store/projectBudgets'
import { UserListItem } from '@/types/entity/user'

import ProjectMembersBulkActions from '../ProjectMembersBulkActions'

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

// Child popups are large forms with their own tests; these stand-ins expose only the
// callbacks whose wiring is under test.
vi.mock('../BulkBudgetOverrideModal', () => ({
  default: ({ visible, onSubmit, onResetUsage }: any) =>
    visible ? (
      <div>
        <button
          type="button"
          onClick={() =>
            onSubmit([
              { budgetId: 'b-1', userId: 'u-1', payload: { max_budget: 1 } },
              { budgetId: 'b-1', userId: 'u-2', payload: { max_budget: 1 } },
            ])
          }
        >
          submit-override
        </button>
        {onResetUsage && (
          <button type="button" onClick={() => onResetUsage()}>
            open-reset
          </button>
        )}
      </div>
    ) : null,
}))

vi.mock(
  '@/pages/settings/administration/usersManagement/components/bulkPopups/BulkResetBudgetsPopup',
  () => ({
    default: ({ isOpen, onSave }: any) =>
      isOpen ? (
        <button type="button" onClick={() => onSave()}>
          save-reset
        </button>
      ) : null,
  })
)

vi.mock('../ChangeProjectRolePopup', () => ({
  default: ({ isOpen, onSave }: any) =>
    isOpen ? (
      <button type="button" onClick={() => onSave()}>
        save-role
      </button>
    ) : null,
}))

vi.mock('../UnassignFromProjectConfirmationPopup', () => ({
  default: ({ isOpen, onSave }: any) =>
    isOpen ? (
      <button type="button" onClick={() => onSave()}>
        save-unassign
      </button>
    ) : null,
}))

const users = [
  { id: 'u-1', name: 'Jane Doe', email: 'jane@epam.com' },
  { id: 'u-2', name: 'John Roe', email: 'john@epam.com' },
] as UserListItem[]

const renderBulk = (overrides: Record<string, unknown> = {}) => {
  const props = {
    projectName: 'Test Project',
    selectedUsers: users,
    currentUserId: 'me',
    canManageProject: true,
    isProjectAdmin: true,
    canManageBudgets: true,
    canResetBudgets: true,
    onClearSelection: vi.fn(),
    refresh: vi.fn(),
    onSuccess: vi.fn(),
    onBudgetsChanged: vi.fn().mockResolvedValue(undefined),
    onOverrideModels: vi.fn(),
    budgets: [],
    budgetAllocationLookup: null,
    ...overrides,
  }
  render(<ProjectMembersBulkActions {...(props as any)} />)
  return props as typeof props & Record<string, ReturnType<typeof vi.fn>>
}

const chooseAction = (title: string) => {
  const bar = screen.getByText('2 selected').parentElement as HTMLElement
  fireEvent.click(within(bar).getByRole('button', { name: /More options/ }))
  fireEvent.click(screen.getByRole('menuitem', { name: title }))
}

describe('ProjectMembersBulkActions — budgets refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(projectBudgetsStore, 'overrideMemberAllocation').mockResolvedValue(undefined as never)
  })

  afterEach(cleanup)

  it('refreshes budgets once after a bulk override, then refreshes members and clears selection', async () => {
    const props = renderBulk()

    chooseAction('Override budgets')
    fireEvent.click(screen.getByText('submit-override'))

    await waitFor(() => expect(props.onClearSelection).toHaveBeenCalledTimes(1))
    expect(props.onBudgetsChanged).toHaveBeenCalledTimes(1)
    expect(props.refresh).toHaveBeenCalledTimes(1)
  })

  it('still refreshes budgets when one member override rejects', async () => {
    vi.spyOn(projectBudgetsStore, 'overrideMemberAllocation')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined as never)
    const props = renderBulk()

    chooseAction('Override budgets')
    fireEvent.click(screen.getByText('submit-override'))

    await waitFor(() => expect(props.onClearSelection).toHaveBeenCalledTimes(1))
    expect(projectBudgetsStore.overrideMemberAllocation).toHaveBeenCalledTimes(2)
    expect(props.onBudgetsChanged).toHaveBeenCalledTimes(1)
  })

  it('refreshes budgets after the bulk reset popup saves', async () => {
    const props = renderBulk()

    chooseAction('Override budgets')
    fireEvent.click(screen.getByText('open-reset'))
    fireEvent.click(screen.getByText('save-reset'))

    await waitFor(() => expect(props.onClearSelection).toHaveBeenCalledTimes(1))
    expect(props.onBudgetsChanged).toHaveBeenCalledTimes(1)
    expect(props.refresh).toHaveBeenCalledTimes(1)
  })

  it('still closes the popup and clears selection when the budgets refetch rejects', async () => {
    const onBudgetsChanged = vi.fn().mockRejectedValue(new Error('refetch failed'))
    const props = renderBulk({ onBudgetsChanged })

    chooseAction('Override budgets')
    fireEvent.click(screen.getByText('submit-override'))

    await waitFor(() => expect(props.onClearSelection).toHaveBeenCalledTimes(1))
    expect(onBudgetsChanged).toHaveBeenCalledTimes(1)
    expect(props.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('submit-override')).not.toBeInTheDocument()
  })

  it('does not refetch budgets after Change Role', async () => {
    const props = renderBulk()

    chooseAction('Change Role')
    fireEvent.click(screen.getByText('save-role'))

    await waitFor(() => expect(props.onClearSelection).toHaveBeenCalledTimes(1))
    expect(props.refresh).toHaveBeenCalledTimes(1)
    expect(props.onBudgetsChanged).not.toHaveBeenCalled()
  })

  it('does not refetch budgets after Unassign', async () => {
    const props = renderBulk()

    chooseAction('Unassign from Project')
    fireEvent.click(screen.getByText('save-unassign'))

    await waitFor(() => expect(props.onClearSelection).toHaveBeenCalledTimes(1))
    expect(props.refresh).toHaveBeenCalledTimes(1)
    expect(props.onBudgetsChanged).not.toHaveBeenCalled()
  })
})

describe('ProjectMembersBulkActions — reset restriction', () => {
  afterEach(cleanup)

  it('does not offer bulk Reset usage when canResetBudgets is false', () => {
    renderBulk({ canResetBudgets: false })

    chooseAction('Override budgets')

    expect(screen.getByText('submit-override')).toBeInTheDocument()
    expect(screen.queryByText('open-reset')).not.toBeInTheDocument()
  })

  it('offers bulk Reset usage when canResetBudgets is true', () => {
    renderBulk({ canResetBudgets: true })

    chooseAction('Override budgets')

    expect(screen.getByText('open-reset')).toBeInTheDocument()
  })
})
