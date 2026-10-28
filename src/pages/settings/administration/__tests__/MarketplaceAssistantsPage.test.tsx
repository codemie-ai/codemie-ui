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
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import { assistantsSeededFixture } from '@/test-utils/fixtures/marketplace/assistantsSeededFixture'

import MarketplaceAssistantsPage from '../MarketplaceAssistantsPage'

// --- module mocks -----------------------------------------------------------

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: unknown) => store }
})

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      json: async () => ({ items: assistantsSeededFixture, total: 3 }),
    }),
    post: vi.fn().mockResolvedValue({ json: async () => ({}) }),
  },
}))

/**
 * Stub the Select component so tests can drive it with native fireEvent.change
 * rather than PrimeReact internals.
 */
vi.mock('@/components/form/Select/Select', () => ({
  default: ({
    options,
    value,
    onChange,
    ...rest
  }: {
    options: Array<{ label: string; value: string }>
    value: string
    onChange?: (e: { value: string }) => void
    [key: string]: unknown
  }) => (
    <select
      data-testid={rest['data-testid'] as string}
      data-value={value}
      value={value}
      onChange={(e) => onChange?.({ value: e.target.value })}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

// ---------------------------------------------------------------------------

const renderPage = (initialUrl = '/') =>
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <MarketplaceAssistantsPage />
    </MemoryRouter>
  )

beforeEach(() => {
  marketplaceManagementStore.assistants.items = assistantsSeededFixture
  marketplaceManagementStore.assistants.total = 3
  marketplaceManagementStore.assistants.hasLoaded = true
  marketplaceManagementStore.facets = null
  marketplaceManagementStore.overview = null
})

afterEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Test 1: loadAssistants is called on mount
// ---------------------------------------------------------------------------
describe('MarketplaceAssistantsPage — mount behaviour', () => {
  it('calls loadAssistants on mount', async () => {
    const spy = vi.spyOn(marketplaceManagementStore, 'loadAssistants')
    renderPage()
    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})

// ---------------------------------------------------------------------------
// Test 2: no Status column. EPMCDME-15254 ("Fix gate-check modal, update
// copy, remove Status column") explicitly removed the Status column (header
// + renderer + import) from this page — its own commit message says so.
// This test was never updated to match and kept asserting the pre-removal
// behavior, so it failed against the current, intended table shape ever
// since. The status each row is in is conveyed by which row-action menu
// items are offered (Publish/Reject for pending, Force-publish for
// rejected, no menu at all for a fully verified row — see the
// "verified row action menu" and "rejected row action menu" tests above).
// ---------------------------------------------------------------------------
describe('MarketplaceAssistantsPage — Status column', () => {
  it('renders no Status column / AssistantStatusBadge (role=status) for any row', async () => {
    renderPage()
    await screen.findByText('Verified Bot')

    // AssistantStatusBadge renders <span role="status">
    expect(screen.queryAllByRole('status')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Test 3: Verified row (APPROVED + is_verified=true) has no row-actions menu
// at all. EPMCDME-14234 "Remove withdraw action for assistants in the review
// queue" (commit 23e32f0a2) intentionally made getAssistantActions() return
// [] for this exact case — a fully-verified assistant needs no action from
// this review queue. That commit updated the sibling pending+critical test
// but missed this one, which kept asserting the pre-change "shows Withdraw"
// behavior and so failed against the current, intended logic.
// ---------------------------------------------------------------------------
describe('MarketplaceAssistantsPage — verified row action menu', () => {
  it('renders no row-actions menu for a verified (APPROVED + is_verified) row', async () => {
    renderPage()
    await screen.findByText('Verified Bot')

    // The trigger testid pattern is assistants-row-actions-{assistant_id} —
    // NavigationMore renders nothing at all when getAssistantActions()
    // returns an empty array, so the trigger itself must not exist.
    expect(screen.queryByTestId('assistants-row-actions-a-verified')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Test 4: Rejected row action menu contains "Force-publish"
// ---------------------------------------------------------------------------
describe('MarketplaceAssistantsPage — rejected row action menu', () => {
  it('shows "Force-publish" in the rejected row action menu', async () => {
    renderPage()
    await screen.findByText('Rejected Bot')

    const trigger = screen.getByTestId('assistants-row-actions-a-rejected')
    fireEvent.click(trigger)

    expect(screen.getByRole('menuitem', { name: 'Force-publish' })).toBeTruthy()
    // REJECTED rows must NOT have Reject or Withdraw actions
    expect(screen.queryByRole('menuitem', { name: 'Reject' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Withdraw' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test 5: Pending+CRITICAL row action menu contains "Force-publish", "Reject" and no "Withdraw"
// ---------------------------------------------------------------------------
describe('MarketplaceAssistantsPage — pending+critical row action menu', () => {
  it('shows Force-publish and Reject, but not Withdraw, for a PENDING_REVIEW row with CRITICAL findings', async () => {
    renderPage()
    await screen.findByText('Pending Critical')

    const trigger = screen.getByTestId('assistants-row-actions-a-pending-crit')
    fireEvent.click(trigger)

    expect(screen.getByRole('menuitem', { name: 'Force-publish' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Reject' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Withdraw' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test 6: Bulk action bar shows disabled message when Verified + Pending selected
// ---------------------------------------------------------------------------
describe('MarketplaceAssistantsPage — bulk action guard', () => {
  it('shows disabled bulk-action message when verified and pending rows are both selected', async () => {
    renderPage()
    await screen.findByText('Verified Bot')

    // Click the Verified row to select it
    const verifiedRow = screen.getByTestId('marketplace-assistants-row-a-verified')
    const verifiedCheckbox = verifiedRow.querySelector('[data-selection-checkbox] input')
    expect(verifiedCheckbox).toBeTruthy()
    fireEvent.click(verifiedCheckbox as HTMLElement)

    // Click the Pending row to also select it
    const pendingRow = screen.getByTestId('marketplace-assistants-row-a-pending-crit')
    const pendingCheckbox = pendingRow.querySelector('[data-selection-checkbox] input')
    expect(pendingCheckbox).toBeTruthy()
    fireEvent.click(pendingCheckbox as HTMLElement)

    await waitFor(() => {
      expect(screen.getByText('Bulk actions are available for Pending items only')).toBeTruthy()
    })
  })
})

// Test 7: no status hides any other filter.
describe.each(['VERIFIED', 'REJECTED', 'PENDING', 'ALL'])(
  'MarketplaceAssistantsPage — status=%s keeps every filter visible',
  (status) => {
    it('renders Wait time', async () => {
      renderPage(`/?status=${status}`)
      await screen.findByText('Verified Bot')

      expect(screen.getByTestId('asstsWaitTime-select')).toBeInTheDocument()
    })
  }
)

// Test 9: Sort applies client-side — this endpoint has no order_by param.
describe('MarketplaceAssistantsPage — Sort', () => {
  const rowOrder = () =>
    screen
      .getAllByTestId(/^marketplace-assistants-row-/)
      .map((row) => row.getAttribute('data-testid'))

  it('name_asc orders rows alphabetically by name', async () => {
    renderPage('/?sort_by=name_asc')
    await screen.findByText('Verified Bot')

    expect(rowOrder()).toEqual([
      'marketplace-assistants-row-a-pending-crit', // Pending Critical
      'marketplace-assistants-row-a-rejected', // Rejected Bot
      'marketplace-assistants-row-a-verified', // Verified Bot
    ])
  })

  it('submitted_asc orders rows oldest first, with unknown submitted_at last', async () => {
    marketplaceManagementStore.assistants.items = [
      { ...assistantsSeededFixture[0], assistant_id: 'a-newer', submitted_at: 2000 },
      { ...assistantsSeededFixture[1], assistant_id: 'a-no-date', submitted_at: null },
      { ...assistantsSeededFixture[2], assistant_id: 'a-older', submitted_at: 1000 },
    ]
    // loadAssistants would otherwise overwrite the items above with the
    // module-level mocked fetch response (assistantsSeededFixture).
    const spy = vi.spyOn(marketplaceManagementStore, 'loadAssistants').mockResolvedValue(undefined)

    renderPage('/?sort_by=submitted_asc')
    await screen.findByText('Verified Bot')

    spy.mockRestore()

    expect(rowOrder()).toEqual([
      'marketplace-assistants-row-a-older',
      'marketplace-assistants-row-a-newer',
      'marketplace-assistants-row-a-no-date',
    ])
  })
})

// While rows are selected the bulk actions take the filter row's place.
describe('MarketplaceAssistantsPage — filter row vs selection', () => {
  it('renders the filters, then hides them while rows are selected', async () => {
    renderPage()
    await screen.findByText('Verified Bot')
    expect(screen.getByTestId('asstsWaitTime-select')).toBeInTheDocument()

    const checkbox = screen
      .getByTestId('marketplace-assistants-row-a-pending-crit')
      .querySelector('[data-selection-checkbox] input')
    fireEvent.click(checkbox as HTMLElement)

    await waitFor(() => {
      expect(screen.queryByTestId('asstsWaitTime-select')).not.toBeInTheDocument()
    })
  })
})
