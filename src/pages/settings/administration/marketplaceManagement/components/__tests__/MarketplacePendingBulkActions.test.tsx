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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PendingRow } from '@/types/generated/marketplaceManagement'

import MarketplacePendingBulkActions from '../MarketplacePendingBulkActions'

const mockApiPost = vi.fn().mockResolvedValue({ json: async () => ({}) })

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ json: async () => ({ total: 0, items: [] }) }),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}))

const ROWS = [
  { assistant_id: 'a-1', name: 'One', gate_findings: [] },
  { assistant_id: 'a-2', name: 'Two', gate_findings: [] },
] as unknown as PendingRow[]

const renderBar = () =>
  render(
    <MarketplacePendingBulkActions
      selectedItems={ROWS}
      onClearSelection={vi.fn()}
      onRefresh={vi.fn()}
    />
  )

/**
 * The bulk reject reason goes to the same `_validate_reason` as the row-level
 * one, so it carries the same 20–2000 bound (F-64). A bulk action that fails
 * the bound fails for every selected row at once, which is the worse of the
 * two places to learn the rule from a 400.
 */
describe('MarketplacePendingBulkActions reason validation', () => {
  it('submit is disabled below 20 characters', () => {
    renderBar()
    fireEvent.click(screen.getByRole('button', { name: 'Reject selected' }))

    const submit = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Reject' })
    const box = () => screen.getByPlaceholderText('Enter rejection reason…')

    expect(submit().disabled).toBe(true)

    fireEvent.change(box(), { target: { value: 'x'.repeat(19) } })
    expect(submit().disabled).toBe(true)

    fireEvent.change(box(), { target: { value: 'x'.repeat(20) } })
    expect(submit().disabled).toBe(false)

    fireEvent.change(box(), { target: { value: 'x'.repeat(2001) } })
    expect(submit().disabled).toBe(true)
  })

  it('states the bound rather than only disabling the button', () => {
    renderBar()
    fireEvent.click(screen.getByRole('button', { name: 'Reject selected' }))
    fireEvent.change(screen.getByPlaceholderText('Enter rejection reason…'), {
      target: { value: 'too short' },
    })

    const hint = screen.getByTestId('bulk-reason-hint')
    expect(hint.textContent).toContain('20')
    expect(hint.textContent).toContain('2000')
  })
})

/**
 * Publishing every selected assistant to the marketplace at once is as
 * consequential as the single-item approve in AssistantDetailsDrawer, which
 * requires a confirm — bulk approve used to fire straight from the button's
 * onClick with no "are you sure" step (EPMCDME-14234, CR-002).
 */
describe('MarketplacePendingBulkActions approve confirmation', () => {
  beforeEach(() => {
    mockApiPost.mockClear()
  })

  it('does not call approveBulk until the confirmation is accepted', () => {
    renderBar()

    fireEvent.click(screen.getByTestId('pending-bulk-approve'))

    // The confirm dialog is up, but nothing has been sent yet.
    expect(mockApiPost).not.toHaveBeenCalled()
    expect(screen.getByTestId('pending-bulk-approve-confirm')).toBeInTheDocument()
  })

  it('calls approveBulk only after the confirmation is accepted', async () => {
    renderBar()

    fireEvent.click(screen.getByTestId('pending-bulk-approve'))
    fireEvent.click(screen.getByTestId('pending-bulk-approve-confirm'))

    await waitFor(() => expect(mockApiPost).toHaveBeenCalled())
  })

  it('sends nothing if the confirmation is cancelled', () => {
    renderBar()

    fireEvent.click(screen.getByTestId('pending-bulk-approve'))
    fireEvent.click(screen.getByTestId('pending-bulk-approve-cancel'))

    expect(mockApiPost).not.toHaveBeenCalled()
  })
})
