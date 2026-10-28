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

import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import {
  cleanupDeleteFixture,
  cleanupDuplicateFixture,
  cleanupVerifiedFixture,
  firstCleanupRow,
} from '@/test-utils/fixtures/marketplace'

import MarketplaceCleanupPage, { getColumnTooltips } from '../MarketplaceCleanupPage'
import { verdictKindLabel } from '../marketplaceManagement/components/ReasonChip'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: unknown) => store }
})

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ json: async () => ({ total: 0, items: [] }) }),
    post: vi.fn().mockResolvedValue({ json: async () => ({}) }),
  },
}))

/**
 * The em-dash the table renders when a cell has nothing to show. Every
 * assertion below that names it is guarding against the failure mode F-44
 * describes: a column that renders this on every row while the suite stays
 * green because the only assertion was `not.toThrow()`.
 */
const EM_DASH = '—'

const renderAt = (ui: React.ReactElement, url = '/') =>
  render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>)

/** The `<td>` under the given column header, for the nth data row. */
const rowCell = (columnLabel: string, rowIndex = 0): HTMLElement => {
  const table = screen.getByRole('table')
  const headers = within(table).getAllByRole('columnheader')
  const index = headers.findIndex((h) => {
    const text = (h.textContent ?? '').trim()
    return text === columnLabel || text.startsWith(columnLabel)
  })
  expect(index, `column "${columnLabel}" must exist in the header row`).toBeGreaterThanOrEqual(0)
  const row = table.querySelectorAll('tbody tr')[rowIndex]
  expect(row, `table must render a data row at index ${rowIndex}`).toBeTruthy()
  const cell = row.querySelectorAll('td')[index]
  expect(cell, `row must have a cell under "${columnLabel}"`).toBeTruthy()
  return cell as HTMLElement
}

/** The `<td>` under the given column header, for the table's first data row. */
const firstRowCell = (columnLabel: string): HTMLElement => rowCell(columnLabel, 0)

/** Load one captured cleanup slice into the store as the page's row source. */
const loadCleanup = (payload: typeof cleanupDeleteFixture) => {
  marketplaceManagementStore.cleanup.items = payload.items as never
  marketplaceManagementStore.cleanup.total = payload.total
  marketplaceManagementStore.cleanup.loadError = null
  marketplaceManagementStore.isLoadingCleanup = false
}

describe('Marketplace queue pages, driven by captured backend payloads', () => {
  beforeEach(() => {
    marketplaceManagementStore.resetCleanupFilters()
    loadCleanup(cleanupDeleteFixture)
    marketplaceManagementStore.facets = null
    marketplaceManagementStore.overview = null
  })

  // ------------------------------------------------------------------
  // One assertion per rendered Cleanup column: the cell is NOT the
  // em-dash fallback. A captured row has a value for each of these, so an
  // em-dash means the frontend is reading a field the backend does not
  // emit under that name (F-15, F-58).
  // ------------------------------------------------------------------

  it('renders the Assistant column from the captured row, not a fallback', () => {
    const row = firstCleanupRow(cleanupDeleteFixture)
    renderAt(<MarketplaceCleanupPage />)
    const cell = firstRowCell('Assistant')
    expect(cell.textContent).toContain(row.name)
    expect(cell.textContent?.trim()).not.toBe(EM_DASH)
  })

  it('renders the Creator column from the captured row, not a fallback', () => {
    const row = firstCleanupRow(cleanupDeleteFixture)
    renderAt(<MarketplaceCleanupPage />)
    const cell = firstRowCell('Creator')
    expect(row.creator, 'captured row must carry a creator').toBeTruthy()
    expect(cell.textContent?.trim()).not.toBe(EM_DASH)
  })

  it('renders the Users column from the captured row, not a fallback', () => {
    renderAt(<MarketplaceCleanupPage />)
    const cell = firstRowCell('Users')
    expect(cell.textContent?.trim()).not.toBe(EM_DASH)
    expect(cell.textContent?.trim()).toMatch(/^\d+$/)
  })

  // F-58: `unique_likes_count` exists on AssistantRecord and is populated by
  // entity_adapter, but the cleanup row builder never emitted it — so this
  // column was permanently an em-dash. The VERIFIED slice is used because
  // every DELETE-bucket row in the captured data has zero likes, and zero is
  // a legitimate value that would mask a missing field.
  it('renders the Likes column from the captured row, not a fallback', () => {
    loadCleanup(cleanupVerifiedFixture)
    // Assert against a row whose captured like count is non-zero: "0" would
    // also differ from the em-dash, so a zero-like row cannot distinguish
    // "the field arrived" from "the field is missing and something else
    // printed a zero".
    const index = cleanupVerifiedFixture.items.findIndex((r) => (r.unique_likes_count ?? 0) > 0)
    expect(index, 'captured VERIFIED slice must contain a row with likes').toBeGreaterThanOrEqual(0)
    const row = cleanupVerifiedFixture.items[index]

    renderAt(<MarketplaceCleanupPage />)
    const cell = rowCell('Likes', index)
    expect(cell.textContent?.trim()).not.toBe(EM_DASH)
    expect(cell.textContent?.trim()).toBe(String(row.unique_likes_count))
  })

  it('renders the Tier column from the captured row, not a fallback', () => {
    const row = firstCleanupRow(cleanupDeleteFixture)
    renderAt(<MarketplaceCleanupPage />)
    const cell = firstRowCell('Tier')
    expect(row.usage_tier, 'captured row must carry a usage_tier').toBeTruthy()
    expect(cell.textContent?.trim()).not.toBe(EM_DASH)
  })

  it('renders the Bucket column from the captured row, not a fallback', () => {
    const row = firstCleanupRow(cleanupDeleteFixture)
    renderAt(<MarketplaceCleanupPage />)
    const cell = firstRowCell('Bucket')
    expect(row.bucket, 'captured row must carry a bucket').toBeTruthy()
    expect(cell.textContent?.trim()).not.toBe(EM_DASH)
  })

  // F-15: the Decision column reads `verdict_kind`, nested as `verdict.kind`.
  it('renders the Decision column from the captured row, not a fallback', () => {
    renderAt(<MarketplaceCleanupPage />)
    const cell = firstRowCell('Decision')
    expect(cell.textContent?.trim()).not.toBe(EM_DASH)
    // The cell shows the label; the raw enum stays on data-value so this
    // assertion still pins the underlying contract.
    expect(cell.textContent?.trim()).toMatch(/^(Keep|Review|Cleanup)$/)
    expect(cell.querySelector('[data-value]')?.getAttribute('data-value')).toMatch(
      /^(KEEP|REVIEW|CANDIDATE_FOR_CLEANUP)$/
    )
  })

  // F-15: the "↳ canonical:" hint reads `canonical_name`, nested as
  // `verdict.canonical_name`. The duplicate slice is the only captured row
  // that has one.
  it('renders the canonical hint for the captured duplicate row', () => {
    loadCleanup(cleanupDuplicateFixture)
    renderAt(<MarketplaceCleanupPage />)
    const cell = firstRowCell('Assistant')
    expect(cell.textContent).toContain('↳ canonical:')
  })

  // ------------------------------------------------------------------
  // Rendering paths that do not depend on a specific field.
  // ------------------------------------------------------------------

  it('renders the cleanup queue with an active reason and tier filter', () => {
    expect(() =>
      renderAt(<MarketplaceCleanupPage />, '/?bucket=&reason=duplicate&tier=DEAD')
    ).not.toThrow()
  })

  it('renders the cleanup queue with the details drawer open via the URL', () => {
    const row = firstCleanupRow(cleanupDeleteFixture)
    expect(() => renderAt(<MarketplaceCleanupPage />, `/?assistant=${row.id}`)).not.toThrow()
  })

  it('renders the cleanup queue with a load error', () => {
    marketplaceManagementStore.cleanup.items = []
    marketplaceManagementStore.cleanup.loadError = 'Upstream timeout'
    renderAt(<MarketplaceCleanupPage />)
    expect(screen.getByTestId('cleanup-load-error')).toBeTruthy()
  })

  it('renders VERIFIED bucket chip with label "Qualified" not "Verified"', () => {
    loadCleanup(cleanupVerifiedFixture)
    renderAt(<MarketplaceCleanupPage />)
    const cell = firstRowCell('Bucket')
    expect(cell.textContent).toContain('Qualified')
    expect(cell.textContent).not.toContain('Verified')
  })

  it('offers a "Qualified" option in the bucket filter dropdown', () => {
    renderAt(<MarketplaceCleanupPage />)
    // Open the bucket dropdown so PrimeReact renders option items into the DOM
    const select = screen.getByTestId('clnBucket-select')
    fireEvent.click(select)
    expect(screen.queryByText('Qualified')).not.toBeNull()
  })

  it('bucket filter always includes "Qualified" option regardless of URL', () => {
    // Render at default URL (no bucket=VERIFIED in params) — VERIFIED must still appear
    renderAt(<MarketplaceCleanupPage />)
    // The bucket dropdown contains 'Qualified' as a static option
    const bucketSelect = screen.getByTestId('clnBucket-select')
    // Open the dropdown to expose options
    fireEvent.click(bucketSelect)
    const qualifiedOption = screen.queryByText('Qualified')
    expect(qualifiedOption).not.toBeNull()
  })
})

describe('Decision column reads as a label, not an enum value', () => {
  /**
   * Reported from manual testing: the Decision column rendered
   * `CANDIDATE_FOR_CLEANUP` verbatim — a backend enum member shown to a
   * reviewer. Every other coded value on this page (bucket, reason, tier,
   * severity, gate rule) is mapped to a human label; the verdict was the one
   * that was not.
   */
  it.each([
    ['KEEP', 'Keep'],
    ['REVIEW', 'Review'],
    ['CANDIDATE_FOR_CLEANUP', 'Cleanup'],
  ])('renders %s as %s', (kind, label) => {
    expect(verdictKindLabel(kind)).toBe(label)
  })

  it('falls back to a readable form for a verdict it does not know', () => {
    // A new enum member must not surface as SCREAMING_SNAKE.
    expect(verdictKindLabel('SOME_NEW_VERDICT')).toBe('Some new verdict')
  })

  it('Decision header tooltip no longer says "no action needed"', () => {
    const tooltips = getColumnTooltips(null)
    expect(tooltips.decision).not.toContain('no action needed')
  })
})
