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

/**
 * Bulk approve/reject with a partial failure — EXECUTION-PLAN 10.5, spec §2.10.
 *
 * **Why this is not a browser test.** There is no bulk endpoint on the backend
 * at all (`store/marketplaceManagement.ts`: "Bulk endpoints have no backend
 * counterpart yet"). The behaviour under test — the `Promise.allSettled`
 * fan-out, the succeeded/failed split, and the single summary toast that tells
 * the admin whether to retry everything or only part of it — is entirely
 * client-side. Arranging "three of these five requests fail" is trivial here
 * and close to impossible against a real server, so a Playwright version would
 * be slower, flakier, and would assert less.
 *
 * The browser keeps exactly one bulk test, and it is about persistence:
 * `e2e/marketplace-approval-negative.spec.ts` §2.10 approves three seeded rows
 * and asserts the delta in SQL.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import type { PendingRow } from '@/types/generated/marketplaceManagement'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

import MarketplacePendingBulkActions from '../MarketplacePendingBulkActions'

/**
 * `api.makeRequest` rejects with a cloned `Response` carrying `parsedError` —
 * **not** an `Error`. That is the whole reason `errorMessage` exists: `String(err)`
 * on a `Response` is the literal "[object Response]", which is non-empty, so a
 * `|| fallback` never fires and the admin used to read "[object Response]" in
 * the banner. The rejection below reproduces that shape rather than a
 * convenient `new Error(...)`, or the test would pass against the bug.
 */
const rejectionLike = (message: string): Error =>
  Object.assign(new Error(message), { status: 500, parsedError: { message } })

/** A rejection with no parsed body at all — the fallback path. */
const opaqueRejection = (): Error => new Error()

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ json: async () => ({ total: 0, items: [] }) }),
    post: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const ROWS = ['a-1', 'a-2', 'a-3', 'a-4', 'a-5'].map(
  (assistant_id, i) => ({ assistant_id, name: `Row ${i + 1}`, gate_findings: [] } as unknown)
) as PendingRow[]

/** 3 × 200 and 2 × 500 — the partial failure §2.10 names. */
const threeOkTwoFailing = (failing: string[], message = 'Assistant is not pending review.') =>
  vi
    .mocked(api.post)
    .mockImplementation((url: string) =>
      failing.some((id) => String(url).includes(id))
        ? Promise.reject(rejectionLike(message))
        : (Promise.resolve({ json: async () => ({ ok: true }) }) as unknown as ReturnType<
            typeof api.post
          >)
    )

describe('bulk fan-out — store level', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('splits the outcome per id instead of failing the whole call', async () => {
    threeOkTwoFailing(['a-4', 'a-5'])

    const result = await marketplaceManagementStore.approveBulk(['a-1', 'a-2', 'a-3', 'a-4', 'a-5'])

    // `Promise.allSettled`, never `Promise.all`: with `all`, one failure
    // rejected the whole call while the other requests kept running, so the
    // caller's refresh and clear-selection never ran and the table still listed
    // assistants that HAD been approved — with their ids still selected.
    expect(result.succeeded).toEqual(['a-1', 'a-2', 'a-3'])
    expect(result.failed.map((f) => f.id)).toEqual(['a-4', 'a-5'])
    expect(api.post).toHaveBeenCalledTimes(5)
  })

  it('reports the parsed server message, not "[object Response]"', async () => {
    threeOkTwoFailing(['a-2'], 'Assistant is not pending review.')

    const result = await marketplaceManagementStore.approveBulk(['a-1', 'a-2'])

    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].message).toBe('Assistant is not pending review.')
    expect(result.failed[0].message).not.toContain('[object')
  })

  it('falls back to a readable message when the rejection carries no body', async () => {
    vi.mocked(api.post).mockImplementation(() => Promise.reject(opaqueRejection()))

    const result = await marketplaceManagementStore.approveBulk(['a-1'])

    expect(result.succeeded).toEqual([])
    expect(result.failed[0].message).toBe('Request failed')
    expect(result.failed[0].message).not.toContain('[object')
  })

  it('sends the reason once per id on a bulk reject', async () => {
    threeOkTwoFailing([])

    await marketplaceManagementStore.rejectBulk(['a-1', 'a-2'], 'Duplicate of an existing entry')

    const bodies = vi.mocked(api.post).mock.calls.map((c) => c[1])
    expect(bodies).toEqual([
      { reason: 'Duplicate of an existing entry' },
      { reason: 'Duplicate of an existing entry' },
    ])
  })
})

describe('MarketplacePendingBulkActions — partial failure reporting', () => {
  const onClearSelection = vi.fn()
  const onRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderBar = () =>
    render(
      <MarketplacePendingBulkActions
        selectedItems={ROWS}
        onClearSelection={onClearSelection}
        onRefresh={onRefresh}
      />
    )

  it('reports one summary toast naming both halves, and still clears and refreshes', async () => {
    threeOkTwoFailing(['a-4', 'a-5'])
    renderBar()

    fireEvent.click(screen.getByTestId('pending-bulk-approve'))
    fireEvent.click(screen.getByTestId('pending-bulk-approve-confirm'))

    await waitFor(() => expect(toaster.error).toHaveBeenCalledTimes(1))
    expect(toaster.error).toHaveBeenCalledWith(
      '3 assistant(s) approved, 2 failed. The failed ones are still pending.'
    )
    // One summary, not N toasts: five independent toasts do not tell an admin
    // whether to retry the whole selection or only part of it.
    expect(toaster.success).not.toHaveBeenCalled()

    // Both run even on a partial failure. The rows that did succeed are no
    // longer pending, and leaving them selected let the admin press the button
    // again and re-approve them.
    expect(onClearSelection).toHaveBeenCalledTimes(1)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('reports an all-success run as a single success toast', async () => {
    threeOkTwoFailing([])
    renderBar()

    fireEvent.click(screen.getByTestId('pending-bulk-approve'))
    fireEvent.click(screen.getByTestId('pending-bulk-approve-confirm'))

    await waitFor(() => expect(toaster.success).toHaveBeenCalledTimes(1))
    expect(toaster.success).toHaveBeenCalledWith('5 assistant(s) approved.')
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('reports an all-failure run as one error toast and no success toast', async () => {
    threeOkTwoFailing(['a-1', 'a-2', 'a-3', 'a-4', 'a-5'])
    renderBar()

    fireEvent.click(screen.getByTestId('pending-bulk-approve'))
    fireEvent.click(screen.getByTestId('pending-bulk-approve-confirm'))

    await waitFor(() => expect(toaster.error).toHaveBeenCalledTimes(1))
    expect(toaster.success).not.toHaveBeenCalled()
    // "0 approved, 5 failed" would be arithmetic; the admin needs the verdict.
    expect(vi.mocked(toaster.error).mock.calls[0][0]).toMatch(
      /Could not approve any of the 5 selected assistant\(s\)\./
    )
  })

  it('does not submit a bulk reject whose reason the server would refuse', async () => {
    threeOkTwoFailing([])
    renderBar()

    fireEvent.click(screen.getByTestId('pending-bulk-reject'))
    fireEvent.change(screen.getByTestId('pending-bulk-reason-input'), {
      target: { value: 'too short' },
    })
    fireEvent.click(screen.getByTestId('pending-bulk-submit'))

    // The disabled button is not the only path into the handler, so the bound is
    // re-checked there too: a bulk reject that failed `_validate_reason` would
    // 400 once per selected row.
    expect(api.post).not.toHaveBeenCalled()
    expect(toaster.error).not.toHaveBeenCalled()
  })
})
