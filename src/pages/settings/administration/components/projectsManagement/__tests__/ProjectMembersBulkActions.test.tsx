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
import { BulkMemberOverrideResponse, BulkMemberOverrideResult } from '@/types/entity/projectBudget'
import { UserListItem } from '@/types/entity/user'
import toaster from '@/utils/toaster'

import ProjectMembersBulkActions from '../ProjectMembersBulkActions'

const stub = vi.hoisted(() => ({
  updates: [
    {
      budgetId: 'b-1',
      userId: 'u-1',
      payload: { allocated_max_budget: 1, allocated_soft_budget: 1 },
    },
    {
      budgetId: 'b-1',
      userId: 'u-2',
      payload: { allocated_max_budget: 1, allocated_soft_budget: 1 },
    },
  ] as unknown[],
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

// Child popups are large forms with their own tests; these stand-ins expose only the
// callbacks whose wiring is under test.
vi.mock('../BulkBudgetOverrideModal', () => ({
  default: ({ visible, onSubmit, onResetUsage }: any) =>
    visible ? (
      <div>
        <button type="button" onClick={() => onSubmit(stub.updates)}>
          submit-override
        </button>
        {onResetUsage && <span>reset-prop-passed</span>}
      </div>
    ) : null,
}))

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

const expectedItems = [
  {
    budget_id: 'b-1',
    user_id: 'u-1',
    allocated_max_budget: 1,
    allocated_soft_budget: 1,
  },
  {
    budget_id: 'b-1',
    user_id: 'u-2',
    allocated_max_budget: 1,
    allocated_soft_budget: 1,
  },
]

const bulkResponse = (
  results: Array<Pick<BulkMemberOverrideResult, 'user_id' | 'status'>>
): BulkMemberOverrideResponse => ({
  results: results.map((r) => ({ budget_id: 'b-1', ...r })),
  budgets: [],
})

const chooseAction = (title: string) => {
  const bar = screen.getByText('2 selected').parentElement as HTMLElement
  fireEvent.click(within(bar).getByRole('button', { name: /More options/ }))
  fireEvent.click(screen.getByRole('menuitem', { name: title }))
}

describe('ProjectMembersBulkActions — budgets refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(projectBudgetsStore, 'overrideMemberAllocation').mockResolvedValue(undefined as never)
    vi.spyOn(projectBudgetsStore, 'bulkOverrideMemberAllocations').mockResolvedValue(
      bulkResponse([
        { user_id: 'u-1', status: 'ok' },
        { user_id: 'u-2', status: 'ok' },
      ])
    )
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

  const submitOverride = async (props: ReturnType<typeof renderBulk>) => {
    chooseAction('Override budgets')
    fireEvent.click(screen.getByText('submit-override'))
    await waitFor(() => expect(props.onClearSelection).toHaveBeenCalledTimes(1))
    expect(props.onBudgetsChanged).toHaveBeenCalledTimes(1)
    expect(props.refresh).toHaveBeenCalledTimes(1)
  }

  it('sends one batch request with every update mapped in order', async () => {
    const props = renderBulk()

    await submitOverride(props)

    expect(projectBudgetsStore.bulkOverrideMemberAllocations).toHaveBeenCalledTimes(1)
    expect(projectBudgetsStore.bulkOverrideMemberAllocations).toHaveBeenCalledWith(expectedItems)
    expect(projectBudgetsStore.overrideMemberAllocation).not.toHaveBeenCalled()
    expect(toaster.success).toHaveBeenCalledWith(
      'Updated budget overrides for 2 user(s) successfully'
    )
  })

  it('sends no request when there are no updates', async () => {
    const original = stub.updates
    stub.updates = []
    try {
      const props = renderBulk()

      await submitOverride(props)

      expect(projectBudgetsStore.bulkOverrideMemberAllocations).not.toHaveBeenCalled()
    } finally {
      stub.updates = original
    }
  })

  it('reports a partial failure from the per-item results', async () => {
    vi.spyOn(projectBudgetsStore, 'bulkOverrideMemberAllocations').mockResolvedValue(
      bulkResponse([
        { user_id: 'u-1', status: 'ok' },
        { user_id: 'u-2', status: 'failed' },
      ])
    )
    const props = renderBulk()

    await submitOverride(props)

    expect(toaster.error).toHaveBeenCalledWith('Updated 1 user(s); failed for 1: John Roe')
    expect(toaster.success).not.toHaveBeenCalled()
  })

  it('reports failure, not success, when every result failed and budgets are empty', async () => {
    vi.spyOn(projectBudgetsStore, 'bulkOverrideMemberAllocations').mockResolvedValue(
      bulkResponse([
        { user_id: 'u-1', status: 'failed' },
        { user_id: 'u-2', status: 'failed' },
      ])
    )
    const props = renderBulk()

    await submitOverride(props)

    expect(toaster.error).toHaveBeenCalledWith(
      'Failed to update budgets for 2 user(s): Jane Doe, John Roe'
    )
    expect(toaster.success).not.toHaveBeenCalled()
  })

  it('lists a user failing in several categories once', async () => {
    vi.spyOn(projectBudgetsStore, 'bulkOverrideMemberAllocations').mockResolvedValue(
      bulkResponse([
        { user_id: 'u-1', status: 'ok' },
        { user_id: 'u-2', status: 'failed' },
        { user_id: 'u-2', status: 'failed' },
      ])
    )
    const props = renderBulk()

    await submitOverride(props)

    expect(toaster.error).toHaveBeenCalledWith('Updated 1 user(s); failed for 1: John Roe')
  })

  it('reports every selected user failed and still refreshes when the request rejects', async () => {
    vi.spyOn(projectBudgetsStore, 'bulkOverrideMemberAllocations').mockRejectedValue(
      new Error('boom')
    )
    const props = renderBulk()

    await submitOverride(props)

    expect(projectBudgetsStore.bulkOverrideMemberAllocations).toHaveBeenCalledTimes(1)
    expect(toaster.error).toHaveBeenCalledWith(
      'Failed to update budgets for 2 user(s): Jane Doe, John Roe'
    )
    expect(screen.queryByText('submit-override')).not.toBeInTheDocument()
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

describe('ProjectMembersBulkActions — no reset usage', () => {
  afterEach(cleanup)

  it('does not pass onResetUsage to the bulk override modal', () => {
    renderBulk()

    chooseAction('Override budgets')

    expect(screen.getByText('submit-override')).toBeInTheDocument()
    expect(screen.queryByText('reset-prop-passed')).not.toBeInTheDocument()
  })
})
