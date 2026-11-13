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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import UnifiedProjectBudgetModal from '../UnifiedProjectBudgetModal'
import { activePlan, deferred } from './budgetModalTestUtils'

vi.mock('@/hooks/useFeatureFlags', () => ({
  useProjectChargebackEnabled: () => [false, true],
  useFeatureFlag: () => [false, true],
  useBudgetSoftLimitNotificationEnabled: () => [true, true],
  useBudgetSoftLimitEmailEnabled: () => [true, true],
}))

vi.mock('@/store/projects', () => ({
  projectsStore: { updateProject: vi.fn() },
}))

const listProjectBudgetGroups = vi.fn()
const getProjectBudgetGroup = vi.fn()
const updateProjectBudgetGroup = vi.fn()
const createProjectBudgetGroup = vi.fn()
vi.mock('@/store/projectBudgets', () => ({
  projectBudgetsStore: {
    listProjectBudgetGroups: (...a: unknown[]) => listProjectBudgetGroups(...a),
    getProjectBudgetGroup: (...a: unknown[]) => getProjectBudgetGroup(...a),
    updateProjectBudgetGroup: (...a: unknown[]) => updateProjectBudgetGroup(...a),
    createProjectBudgetGroup: (...a: unknown[]) => createProjectBudgetGroup(...a),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

vi.mock('../UnifiedBudgetDragBar', () => ({
  default: ({ disabled }: any) => (
    <div data-testid="dragbar" data-disabled={String(Boolean(disabled))} />
  ),
}))
vi.mock('../BudgetCategoryTable', () => ({ default: () => <div data-testid="cat-table" /> }))

vi.mock('@/components/Popup', async () => ({
  default: (await import('./budgetModalTestUtils')).MockPopup,
}))

const onHide = vi.fn()

const resetPeriod = () => document.getElementById('budget_duration')

async function renderModal() {
  render(<UnifiedProjectBudgetModal visible onHide={onHide} projectName="p1" canManageBudgets />)
  await waitFor(() => expect(screen.getByDisplayValue('My Budget')).toBeInTheDocument())
}

async function renderCreateModal() {
  render(
    <UnifiedProjectBudgetModal
      visible
      onHide={onHide}
      projectName="p1"
      canManageBudgets
      forceCreate
    />
  )
  await userEvent.type(screen.getByLabelText(/Name/), 'New Budget')
}

function deferCreate() {
  const save = deferred()
  createProjectBudgetGroup.mockImplementation(() => save.promise)
  return save
}

function deferUpdate() {
  const save = deferred()
  updateProjectBudgetGroup.mockImplementation(() => save.promise)
  return save
}

describe('UnifiedProjectBudgetModal — in-flight save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listProjectBudgetGroups.mockResolvedValue([{ group_id: 'g1', deleted_at: null }])
    getProjectBudgetGroup.mockResolvedValue(activePlan)
  })

  it('locks the dialog, shows progress copy and disables inputs while saving', async () => {
    const save = deferUpdate()
    await renderModal()

    await userEvent.click(screen.getByRole('button', { name: 'Update Budget' }))

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true'))
    expect(screen.getByRole('button', { name: 'Updating…' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByDisplayValue('My Budget')).toBeDisabled()
    expect(resetPeriod()).toHaveClass('p-disabled')
    expect(screen.getByText('Send email notifications')).toHaveClass('cursor-not-allowed')
    expect(screen.getByTestId('dragbar')).toHaveAttribute('data-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Reset to Default' })).toHaveClass(
      'cursor-not-allowed'
    )
    expect(screen.getByTestId('busy-hint')).toHaveTextContent(
      'Large projects can take a little longer to save.'
    )

    save.resolve({})
    await waitFor(() => expect(onHide).toHaveBeenCalledTimes(1))
  })

  it('unlocks with values kept when the save fails', async () => {
    const save = deferUpdate()
    await renderModal()

    await userEvent.click(screen.getByRole('button', { name: 'Update Budget' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true'))

    save.reject(new Error('boom'))

    await waitFor(() => expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-busy'))
    expect(screen.getByDisplayValue('My Budget')).toBeEnabled()
    expect(resetPeriod()).not.toHaveClass('p-disabled')
    expect(screen.getByText('Send email notifications')).not.toHaveClass('cursor-not-allowed')
    expect(screen.getByTestId('dragbar')).toHaveAttribute('data-disabled', 'false')
    expect(screen.getByRole('button', { name: 'Reset to Default' })).not.toHaveClass(
      'cursor-not-allowed'
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Update Budget' })).toBeInTheDocument()
    expect(onHide).not.toHaveBeenCalled()
  })

  it('sends a single request when submit is triggered twice', async () => {
    deferUpdate()
    await renderModal()

    const submit = screen.getByRole('button', { name: 'Update Budget' })
    await userEvent.click(submit)
    const busySubmit = await screen.findByRole('button', { name: 'Updating…' })
    await userEvent.click(busySubmit)

    expect(updateProjectBudgetGroup).toHaveBeenCalledTimes(1)
  })

  it('sends a single request when submit fires twice in the same tick', async () => {
    const save = deferUpdate()
    await renderModal()

    const submit = screen.getByRole('button', { name: 'Update Budget' })
    fireEvent.click(submit)
    fireEvent.click(submit)

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true'))
    expect(updateProjectBudgetGroup).toHaveBeenCalledTimes(1)

    save.resolve({})
    await waitFor(() => expect(onHide).toHaveBeenCalledTimes(1))
    expect(updateProjectBudgetGroup).toHaveBeenCalledTimes(1)
  })

  it('locks the dialog while creating and sends a single request', async () => {
    const save = deferCreate()
    await renderCreateModal()

    await userEvent.click(screen.getByRole('button', { name: 'Create Budget' }))

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true'))
    const busySubmit = screen.getByRole('button', { name: 'Creating…' })
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByDisplayValue('New Budget')).toBeDisabled()

    await userEvent.click(busySubmit)
    expect(createProjectBudgetGroup).toHaveBeenCalledTimes(1)
    expect(updateProjectBudgetGroup).not.toHaveBeenCalled()

    save.resolve({})
    await waitFor(() => expect(onHide).toHaveBeenCalledTimes(1))
  })

  it('unlocks with values kept when creating fails', async () => {
    const save = deferCreate()
    await renderCreateModal()

    await userEvent.click(screen.getByRole('button', { name: 'Create Budget' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true'))

    save.reject(new Error('boom'))

    await waitFor(() => expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-busy'))
    expect(screen.getByDisplayValue('New Budget')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Create Budget' })).toBeInTheDocument()
    expect(onHide).not.toHaveBeenCalled()
  })
})
