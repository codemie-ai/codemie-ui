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

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import {
  cleanupDeleteFixture,
  facetsFixture,
  overviewFixture,
} from '@/test-utils/fixtures/marketplace'

import MarketplaceAssistantsPage from '../MarketplaceAssistantsPage'
import MarketplaceCleanupPage from '../MarketplaceCleanupPage'
import MarketplaceOverviewPage from '../MarketplaceOverviewPage'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: unknown) => store }
})

const apiGet = vi.fn()
const apiPost = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

/**
 * EXECUTION-PLAN 10.0 / review-e2e-coverage-spec §3 — the selector contract.
 *
 * The Marketplace Assistants tab is the primary moderation surface, listing
 * assistants across Verified/Pending/Rejected statuses. Each testid here is
 * the positive selector e2e specs use to assert lifecycle actions. Renaming
 * a testid in the page requires an update here first.
 */
const ASSISTANTS_ROW = {
  assistant_id: '8f4b6b1e-9d51-4b0e-9a6b-6f0a9c2a1d34',
  name: 'Release Notes Writer',
  marketplace_status: 'PENDING_REVIEW',
  is_verified: false,
  gate_findings: [],
  marketplace_decision_reason: null,
  submitted_at: 1787000000,
  submitted_by: 'someone@example.com',
}

const seedAssistants = (items: unknown[]): void => {
  marketplaceManagementStore.assistants.items = items as never
  marketplaceManagementStore.assistants.total = items.length
  marketplaceManagementStore.assistants.hasLoaded = true
}

const renderAssistants = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <MarketplaceAssistantsPage />
    </MemoryRouter>
  )

describe('the marketplace selector contract (EXECUTION-PLAN 10.0)', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiGet.mockResolvedValue({
      json: async () => ({ total: 1, items: [ASSISTANTS_ROW] }),
    })
    apiPost.mockReset()
    apiPost.mockResolvedValue({ json: async () => ({}) })
    marketplaceManagementStore.entityKind = 'ASSISTANT'
    marketplaceManagementStore.overview = overviewFixture as never
    marketplaceManagementStore.facets = facetsFixture as never
    marketplaceManagementStore.isLoadingOverview = false
    marketplaceManagementStore.overviewLoadError = null
    marketplaceManagementStore.isAuditing = false
    marketplaceManagementStore.auditError = null
    marketplaceManagementStore.isLoadingCleanup = false
    marketplaceManagementStore.cleanup.items = []
    marketplaceManagementStore.cleanup.total = 0
    marketplaceManagementStore.cleanup.selected = new Set()
    marketplaceManagementStore.cleanup.loadError = null
    seedAssistants([ASSISTANTS_ROW])
  })

  describe('Marketplace Assistants tab', () => {
    it('exposes the table, the row and every column the reviewer reads', async () => {
      renderAssistants()

      await waitFor(() =>
        expect(screen.getByTestId('marketplace-assistants-table')).toBeInTheDocument()
      )

      const row = screen.getByTestId(`marketplace-assistants-row-${ASSISTANTS_ROW.assistant_id}`)
      expect(row).toBeInTheDocument()
      expect(within(row).getByTestId('marketplace-assistants-assistant-name')).toHaveTextContent(
        ASSISTANTS_ROW.name
      )
      expect(within(row).getByTestId('assistants-creator')).toHaveTextContent(
        ASSISTANTS_ROW.submitted_by
      )
      expect(within(row).getByTestId('assistants-submitted-at')).toBeInTheDocument()
      expect(
        within(row).getByTestId(`assistants-row-actions-${ASSISTANTS_ROW.assistant_id}`)
      ).toBeInTheDocument()
    })

    it('exposes the search input without binding to its placeholder copy', async () => {
      renderAssistants()
      await waitFor(() => expect(screen.getByTestId('assts-search-input')).toBeInTheDocument())
    })

    it('exposes the pagination control once the list spans more than one page', async () => {
      // The control legitimately does not render for a single page
      // (Pagination.tsx returns null at totalPages <= 1), so §2.8a's
      // page-change assertions need a list that actually paginates.
      apiGet.mockResolvedValue({
        json: async () => ({ total: 45, items: [ASSISTANTS_ROW] }),
      })
      renderAssistants()
      await waitFor(() => expect(screen.getByTestId('assistants-pagination')).toBeInTheDocument())
    })

    it('exposes row action menu items for a pending row without critical findings', async () => {
      // PENDING_REVIEW + no CRITICAL gate findings → ['publish', 'reject']
      renderAssistants()
      await waitFor(() =>
        expect(screen.getByTestId('marketplace-assistants-table')).toBeInTheDocument()
      )

      await userEvent.click(
        screen.getByTestId(`assistants-row-actions-${ASSISTANTS_ROW.assistant_id}`)
      )

      expect(
        screen.getByTestId(`assistants-action-publish-${ASSISTANTS_ROW.assistant_id}`)
      ).toBeInTheDocument()
      expect(
        screen.getByTestId(`assistants-action-reject-${ASSISTANTS_ROW.assistant_id}`)
      ).toBeInTheDocument()
      expect(
        screen.queryByTestId(`assistants-action-withdraw-${ASSISTANTS_ROW.assistant_id}`)
      ).not.toBeInTheDocument()
    })

    it('exposes the reject reason input and its submit button', async () => {
      renderAssistants()
      await waitFor(() =>
        expect(screen.getByTestId('marketplace-assistants-table')).toBeInTheDocument()
      )

      await userEvent.click(
        screen.getByTestId(`assistants-row-actions-${ASSISTANTS_ROW.assistant_id}`)
      )
      await userEvent.click(
        screen.getByTestId(`assistants-action-reject-${ASSISTANTS_ROW.assistant_id}`)
      )

      expect(screen.getByTestId('assistants-reason-input')).toBeInTheDocument()
      // §2.4 asserts this button's disabled state against the 20-character
      // server minimum, so it must be addressable, not reached by its copy.
      expect(screen.getByTestId('assistants-moderation-submit')).toBeDisabled()
    })

    it('exposes bulk actions and the bulk reject popup once a pending row is selected', async () => {
      renderAssistants()
      await waitFor(() =>
        expect(screen.getByTestId('marketplace-assistants-table')).toBeInTheDocument()
      )

      const row = screen.getByTestId(`marketplace-assistants-row-${ASSISTANTS_ROW.assistant_id}`)
      await userEvent.click(within(row).getByRole('checkbox'))

      expect(screen.getByTestId('pending-bulk-approve')).toBeInTheDocument()
      await userEvent.click(screen.getByTestId('pending-bulk-reject'))
      expect(screen.getByTestId('pending-bulk-reason-input')).toBeInTheDocument()
      expect(screen.getByTestId('pending-bulk-submit')).toBeInTheDocument()
    })

    it('distinguishes empty from error with a positive selector for each', async () => {
      apiGet.mockResolvedValue({ json: async () => ({ total: 0, items: [] }) })
      seedAssistants([])
      const { unmount } = renderAssistants()

      await waitFor(() =>
        expect(screen.getByTestId('marketplace-assistants-empty-state')).toBeInTheDocument()
      )
      expect(screen.queryByTestId('assistants-load-error')).not.toBeInTheDocument()
      unmount()

      // The inverse: a failed load shows the banner and NOT the empty state,
      // so a test can tell the two apart in both directions.
      apiGet.mockRejectedValue(new Error('boom'))
      renderAssistants()
      await waitFor(() => expect(screen.getByTestId('assistants-load-error')).toBeInTheDocument())
      expect(screen.queryByTestId('marketplace-assistants-empty-state')).not.toBeInTheDocument()
    })
  })

  describe('Cleanup tab', () => {
    const renderCleanup = () =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <MarketplaceCleanupPage />
        </MemoryRouter>
      )

    it('carries the cln*-select testids on the dropdown control itself', async () => {
      renderCleanup()
      await waitFor(() => expect(screen.getByTestId('cleanup-table')).toBeInTheDocument())

      const ids = [
        'clnBucket-select',
        'clnReason-select',
        'clnTier-select',
        'clnMcp-select',
        'clnCategory-select',
      ]
      ids.forEach((id) => {
        const el = screen.getByTestId(id)
        // The testid used to sit on a layout `<div>` wrapping the control, so
        // the id and the interactive element were different nodes. PrimeReact
        // marks its Dropdown root with data-pc-name="dropdown".
        expect(el).toHaveAttribute('data-pc-name', 'dropdown')
        expect(el).toHaveAttribute('data-value')
      })
    })

    it('distinguishes empty from error', async () => {
      renderCleanup()
      await waitFor(() => expect(screen.getByTestId('cleanup-empty-state')).toBeInTheDocument())
      expect(screen.queryByTestId('cleanup-load-error')).not.toBeInTheDocument()
    })

    it('exposes the cleanup load-error banner', async () => {
      marketplaceManagementStore.cleanup.loadError = 'boom'
      marketplaceManagementStore.cleanup.items = cleanupDeleteFixture.items as never
      marketplaceManagementStore.cleanup.total = cleanupDeleteFixture.total
      renderCleanup()
      await waitFor(() => expect(screen.getByTestId('cleanup-load-error')).toBeInTheDocument())
    })
  })

  describe('Overview tab', () => {
    it('exposes the overview load-error banner', async () => {
      marketplaceManagementStore.overviewLoadError = 'boom'
      render(
        <MemoryRouter initialEntries={['/']}>
          <MarketplaceOverviewPage />
        </MemoryRouter>
      )
      await waitFor(() => expect(screen.getByTestId('overview-load-error')).toBeInTheDocument())
    })
  })
})
