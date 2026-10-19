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
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BudgetCategory } from '@/types/entity/budget'
import { ProjectBudget } from '@/types/entity/projectBudget'
import { UserListItem } from '@/types/entity/user'

import BulkBudgetOverrideModal from '../BulkBudgetOverrideModal'

const HARD_ERROR = 'Hard limit must be a non-negative number'
const SOFT_ERROR = 'Soft limit must be a non-negative number'

const users = [
  { id: 'u1', name: 'User One' },
  { id: 'u2', name: 'User Two' },
] as UserListItem[]

const buildBudget = (maxValues: number[], softValues: number[]): ProjectBudget => ({
  budget_id: 'b1',
  name: 'Platform Budget',
  project_name: 'Test Project',
  budget_category: 'platform' as BudgetCategory,
  max_budget: 1000,
  soft_budget: 800,
  budget_duration: 'monthly',
  provider_sync_status: null,
  member_count: users.length,
  allocated_member_budget_total: 0,
  member_allocations: users.map((user, index) => ({
    user_id: user.id,
    allocation_mode: 'equal',
    allocated_max_budget: maxValues[index],
    allocated_soft_budget: softValues[index],
    sync_status: null,
  })),
})

const renderModal = ({ maxValues, softValues }: { maxValues: number[]; softValues: number[] }) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const props = {
    visible: true,
    users,
    budgets: [buildBudget(maxValues, softValues)],
    budgetAllocationLookup: null,
    onHide: vi.fn(),
    onSubmit,
  }
  const view = render(<BulkBudgetOverrideModal {...props} />)
  return { ...view, props, onSubmit }
}

const hardInput = () => screen.getByLabelText('Hard Limit ($)')
const softInput = () => screen.getByLabelText('Soft Limit ($)')
const saveButton = () => screen.getByRole('button', { name: 'Save Override' })
const revertButton = () => screen.queryByLabelText('Revert')

describe('BulkBudgetOverrideModal — non-mixed fields', () => {
  const values = { maxValues: [10, 10], softValues: [5, 5] }

  it('keeps the values on focus without errors, Revert or enabling Save', async () => {
    renderModal(values)

    await userEvent.click(hardInput())
    await userEvent.click(softInput())

    expect(hardInput()).toHaveValue('10')
    expect(softInput()).toHaveValue('5')
    expect(screen.queryByText(HARD_ERROR)).not.toBeInTheDocument()
    expect(screen.queryByText(SOFT_ERROR)).not.toBeInTheDocument()
    expect(revertButton()).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('accepts a valid hard limit edit', async () => {
    renderModal(values)

    await userEvent.clear(hardInput())
    await userEvent.type(hardInput(), '20')

    expect(screen.queryByText(HARD_ERROR)).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('accepts a valid soft limit edit', async () => {
    renderModal(values)

    await userEvent.clear(softInput())
    await userEvent.type(softInput(), '3')

    expect(screen.queryByText(SOFT_ERROR)).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it.each([
    ['empty', ''],
    ['a lone dot', '.'],
    ['unparseable', '1.2.3'],
  ])('rejects %s hard limit input', async (_label, input) => {
    renderModal(values)

    await userEvent.clear(hardInput())
    if (input) await userEvent.type(hardInput(), input)

    expect(screen.getByText(HARD_ERROR)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it.each([
    ['empty', ''],
    ['a lone dot', '.'],
    ['unparseable', '1.2.3'],
  ])('rejects %s soft limit input', async (_label, input) => {
    renderModal(values)

    await userEvent.clear(softInput())
    if (input) await userEvent.type(softInput(), input)

    expect(screen.getByText(SOFT_ERROR)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('treats a retyped original value as unchanged', async () => {
    renderModal(values)

    await userEvent.clear(hardInput())
    await userEvent.type(hardInput(), '10')

    expect(screen.queryByText(HARD_ERROR)).not.toBeInTheDocument()
    expect(revertButton()).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('drops the error once a cleared field gets a valid value', async () => {
    renderModal(values)

    await userEvent.clear(hardInput())
    expect(screen.getByText(HARD_ERROR)).toBeInTheDocument()

    await userEvent.type(hardInput(), '15')

    expect(screen.queryByText(HARD_ERROR)).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })
})

describe('BulkBudgetOverrideModal — mixed fields', () => {
  const values = { maxValues: [10, 20], softValues: [5, 5] }

  it('clears the Mixed text on focus without editing the field and restores it on blur', async () => {
    renderModal(values)

    await userEvent.click(hardInput())

    expect(hardInput()).toHaveValue('')
    expect(screen.queryByText(HARD_ERROR)).not.toBeInTheDocument()
    expect(revertButton()).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await userEvent.tab()

    expect(hardInput()).toHaveValue('Mixed')
  })

  it('marks the field edited once the user types', async () => {
    renderModal(values)

    await userEvent.type(hardInput(), '7')

    expect(hardInput()).toHaveValue('7')
    expect(revertButton()).toBeInTheDocument()
    expect(screen.queryByText(HARD_ERROR)).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('treats an emptied field as unchanged and keeps each user value on submit', async () => {
    const { onSubmit } = renderModal(values)

    await userEvent.type(hardInput(), '7')
    await userEvent.clear(hardInput())

    expect(hardInput()).toHaveValue('')
    expect(screen.queryByText(HARD_ERROR)).not.toBeInTheDocument()
    expect(revertButton()).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await userEvent.tab()
    expect(hardInput()).toHaveValue('Mixed')

    await userEvent.clear(softInput())
    await userEvent.type(softInput(), '3')
    await userEvent.click(saveButton())

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const updates = onSubmit.mock.calls[0][0]
    expect(updates.map(({ userId, payload }) => [userId, payload.allocated_max_budget])).toEqual([
      ['u1', 10],
      ['u2', 20],
    ])
    expect(updates.every(({ payload }) => payload.allocated_soft_budget === 3)).toBe(true)
  })

  it('restores Mixed on the hard field when tabbing into a mixed soft field', async () => {
    renderModal({ maxValues: [10, 20], softValues: [5, 8] })

    await userEvent.click(hardInput())
    await userEvent.tab()

    expect(hardInput()).toHaveValue('Mixed')
    expect(softInput()).toHaveValue('')
  })

  it('shows Mixed after reverting an edited field', async () => {
    renderModal(values)

    await userEvent.type(hardInput(), '7')
    await userEvent.click(screen.getByLabelText('Revert'))

    expect(hardInput()).toHaveValue('Mixed')
  })

  it('keeps a focused field blank for typing when a budgets refresh makes it Mixed', async () => {
    const { props, rerender } = renderModal({ maxValues: [10, 10], softValues: [5, 5] })

    await userEvent.click(hardInput())
    rerender(<BulkBudgetOverrideModal {...props} budgets={[buildBudget([10, 20], [5, 5])]} />)

    expect(hardInput()).toHaveValue('')

    await userEvent.keyboard('7')

    expect(hardInput()).toHaveValue('7')
    expect(screen.queryByText(HARD_ERROR)).not.toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('shows Mixed after the modal is closed and reopened', async () => {
    const { props, rerender } = renderModal(values)

    await userEvent.click(hardInput())
    rerender(<BulkBudgetOverrideModal {...props} visible={false} />)
    rerender(<BulkBudgetOverrideModal {...props} visible />)

    expect(hardInput()).toHaveValue('Mixed')
  })
})
