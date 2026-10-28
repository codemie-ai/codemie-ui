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

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { FC, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import { userStore } from '@/store/user'
import { cleanupDeleteFixture } from '@/test-utils/fixtures/marketplace'

import MarketplaceCleanupPage from '../MarketplaceCleanupPage'
import MarketplaceManagementLayout from '../marketplaceManagement/MarketplaceManagementLayout'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: unknown) => store }
})

// The settings chrome (global nav, user store, customer config) is not the
// subject here and drags in half the app; the section layout's own mount
// effect — which is the subject — is left completely untouched.
vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: (({ content }) => <div>{content}</div>) as FC<{ content?: ReactNode }>,
}))

const apiPost = vi.fn()
const apiGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
  },
}))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <MarketplaceCleanupPage />
    </MemoryRouter>
  )

const MM_BASE = '/settings/administration/marketplace-management'

/**
 * The Cleanup tab as an admin actually reaches it: mounted as the section
 * layout's outlet, so both mount effects run. Fetch-count assertions are only
 * meaningful against this composition — the page in isolation cannot see a
 * request its parent issued.
 */
const renderCleanupTab = () =>
  render(
    <MemoryRouter initialEntries={[`${MM_BASE}/cleanup`]}>
      <Routes>
        <Route path={MM_BASE} element={<MarketplaceManagementLayout />}>
          <Route path="cleanup" element={<MarketplaceCleanupPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

const getUrls = (): string[] => apiGet.mock.calls.map((c) => c[0] as string)

/**
 * The row checkboxes rendered by a `DefinitionTypes.Selection` column. The
 * table also renders a select-all checkbox in the header, so the body ones are
 * queried from `<tbody>` explicitly.
 */
const rowCheckboxes = (): HTMLInputElement[] => {
  const table = screen.getByRole('table')
  const body = table.querySelector('tbody')
  expect(body, 'table must have a body').toBeTruthy()
  return Array.from(body!.querySelectorAll<HTMLInputElement>('[data-selection-checkbox] input'))
}

describe('MarketplaceCleanupPage bulk unpublish (F-45)', () => {
  beforeEach(() => {
    apiPost.mockReset()
    apiPost.mockResolvedValue({ json: async () => ({}) })
    // The page loads the queue on mount, so the mocked GET has to answer with
    // the captured page — otherwise the store empties the table mid-test and
    // the rows the selection refers to disappear.
    apiGet.mockReset()
    apiGet.mockImplementation((url: string) =>
      Promise.resolve({
        json: async () =>
          url.includes('/cleanup')
            ? cleanupDeleteFixture
            : {
                mcps: [],
                categories: [],
                reasons: [],
                tiers: [],
                buckets: [],
                rules: [],
              },
      })
    )
    marketplaceManagementStore.resetCleanupFilters()
    marketplaceManagementStore.cleanup.items = cleanupDeleteFixture.items as never
    marketplaceManagementStore.cleanup.total = cleanupDeleteFixture.total
    marketplaceManagementStore.cleanup.loadError = null
    marketplaceManagementStore.isLoadingCleanup = false
    marketplaceManagementStore.facets = null
    marketplaceManagementStore.overview = null
  })

  // EPMCDME-14765 "Replaced fan-out with a single bulk endpoint" changed
  // withdrawBulk() to one POST to bulk-unpublish instead of N per-row
  // /pending/{id}/withdraw calls, but this test was never updated and kept
  // asserting the pre-refactor fan-out shape, so it failed against the
  // current, intended request pattern ever since.
  it('selecting two rows enables bulk unpublish and calls the bulk-unpublish endpoint once', async () => {
    const [first, second] = cleanupDeleteFixture.items
    expect(first?.id, 'fixture must carry two rows with ids').toBeTruthy()
    expect(second?.id, 'fixture must carry two rows with ids').toBeTruthy()

    renderPage()

    // Nothing selected -> no bulk bar at all.
    expect(screen.queryByTestId('cleanup-bulk-unpublish')).toBeNull()

    // `useSnapshot` is mocked to return the raw store, so the component does
    // not re-render when the mount-time load resolves. Let that load settle
    // before interacting, or the first click renders the mid-flight (empty,
    // loading) store state instead of the loaded page.
    await waitFor(() => {
      expect(marketplaceManagementStore.isLoadingCleanup).toBe(false)
      expect(marketplaceManagementStore.cleanup.items).toHaveLength(
        cleanupDeleteFixture.items.length
      )
    })

    const boxes = rowCheckboxes()
    expect(boxes.length, 'every data row must render a selection checkbox').toBe(
      cleanupDeleteFixture.items.length
    )

    fireEvent.click(boxes[0])
    // Re-query: the row re-renders on selection, so the node captured before
    // the first click can be detached by the time the second one fires.
    fireEvent.click(rowCheckboxes()[1])

    // The bulk bar appears and reports the count.
    const bulkBar = await screen.findByTestId('cleanup-bulk-actions')
    expect(within(bulkBar).getByText('2 selected')).toBeTruthy()

    const unpublish = screen.getByTestId('cleanup-bulk-unpublish')
    expect((unpublish as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(unpublish)

    // Unpublishing is externally visible, so it is confirmed first.
    const confirm = await screen.findByRole('button', { name: 'Unpublish' })
    apiPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ unpublished: 2, failed: [] }),
    })
    fireEvent.click(confirm)

    // One POST to the bulk-unpublish endpoint carrying both ids, not one
    // request per selected row.
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledTimes(1)
    })
    expect(apiPost).toHaveBeenCalledWith(
      expect.stringContaining('bulk-unpublish'),
      { entity_ids: [first.id, second.id] },
      expect.anything()
    )

    // The selection is dropped once the action has run: the rows it referred
    // to are no longer in the cleanup bucket.
    await waitFor(() => {
      expect(screen.queryByTestId('cleanup-bulk-actions')).toBeNull()
    })
  })
})

describe('MarketplaceCleanupPage fetch hygiene (F-62)', () => {
  beforeEach(() => {
    // The section layout only loads data for admins and maintainers.
    userStore.user = { isAdmin: true } as typeof userStore.user
    apiPost.mockReset()
    apiGet.mockReset()
    apiGet.mockImplementation((url: string) =>
      Promise.resolve({
        json: async () =>
          url.includes('/cleanup')
            ? cleanupDeleteFixture
            : {
                mcps: [],
                categories: [],
                reasons: [],
                tiers: [],
                buckets: [],
                rules: [],
                is_running: false,
                run_id: null,
                started_at: null,
                finished_at: null,
                error: null,
              },
      })
    )
    marketplaceManagementStore.resetCleanupFilters()
    marketplaceManagementStore.cleanup.items = []
    marketplaceManagementStore.cleanup.loadError = null
    marketplaceManagementStore.isLoadingCleanup = false
    marketplaceManagementStore.facets = null
    marketplaceManagementStore.overview = null
    marketplaceManagementStore.isAuditing = false
  })

  // `/facets` is one of the five audit-cache touches a single Cleanup page
  // view used to cost, and on a cold cache one of them synchronously runs a
  // full audit. The section layout and the page each fetched it on mount.
  it('loads facets exactly once per mount', async () => {
    renderCleanupTab()

    await waitFor(() => {
      expect(marketplaceManagementStore.isLoadingCleanup).toBe(false)
    })

    expect(getUrls().filter((u) => u.includes('/facets'))).toHaveLength(1)
  })

  it('loads the cleanup queue exactly once per mount', async () => {
    renderCleanupTab()

    await waitFor(() => {
      expect(marketplaceManagementStore.isLoadingCleanup).toBe(false)
    })

    expect(getUrls().filter((u) => u.includes('/cleanup?'))).toHaveLength(1)
  })

  it('loads the overview exactly once per mount', async () => {
    renderCleanupTab()

    await waitFor(() => {
      expect(marketplaceManagementStore.isLoadingCleanup).toBe(false)
    })

    expect(getUrls().filter((u) => u.includes('/overview'))).toHaveLength(1)
  })

  it('loads audit config once on mount (EPMCDME-15056)', async () => {
    // The cleanup page calls loadAuditConfig on mount so tooltip content can
    // reference live threshold values. This asserts the GET /config request
    // is issued exactly once per mount — same hygiene as the /facets assertion.
    renderCleanupTab()

    await waitFor(() => {
      expect(marketplaceManagementStore.isLoadingCleanup).toBe(false)
    })

    expect(getUrls().filter((u) => u.endsWith('/config'))).toHaveLength(1)
  })
})

describe('Decision column tooltip (EPMCDME-15056)', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiGet.mockResolvedValue({
      json: async () => ({
        mcps: [],
        categories: [],
        reasons: [],
        tiers: [],
        buckets: [],
        rules: [],
        is_running: false,
        run_id: null,
        started_at: null,
        finished_at: null,
        error: null,
      }),
    })
    marketplaceManagementStore.resetCleanupFilters()
    marketplaceManagementStore.cleanup.loadError = null
    marketplaceManagementStore.isLoadingCleanup = false
    marketplaceManagementStore.facets = null
    marketplaceManagementStore.overview = null
  })

  it('renders a TooltipButton in the Decision cell when detail is non-null', async () => {
    // Seed the store with one CANDIDATE_FOR_CLEANUP row carrying a detail string.
    marketplaceManagementStore.cleanup.items = [
      {
        ...cleanupDeleteFixture.items[0],
        id: 'row-with-detail',
        verdict_kind: 'CANDIDATE_FOR_CLEANUP',
        detail: 'Near-duplicate of Foo Bot (42u vs 3u)',
      },
    ] as never
    marketplaceManagementStore.cleanup.total = 1

    renderPage()

    await waitFor(() => {
      expect(marketplaceManagementStore.isLoadingCleanup).toBe(false)
    })

    // The TooltipButton renders a button with aria-label="More information"
    // and data-tooltip-id="react-tooltip". At least one must be present in the
    // decision cell (the column that carries verdict_kind).
    const decisionCell = document.querySelector('[data-value="CANDIDATE_FOR_CLEANUP"]')
    expect(decisionCell, 'decision cell with CANDIDATE_FOR_CLEANUP must be rendered').toBeTruthy()
    const tooltipButton = (decisionCell as HTMLElement)
      .closest('span')
      ?.querySelector('[data-tooltip-id="react-tooltip"]')
    expect(
      tooltipButton,
      'TooltipButton must be rendered next to the verdict label when detail is set'
    ).toBeTruthy()
  })

  it('does not render a TooltipButton in the Decision cell when detail is null', async () => {
    // Seed the store with one KEEP row (no detail).
    marketplaceManagementStore.cleanup.items = [
      {
        ...cleanupDeleteFixture.items[0],
        id: 'row-without-detail',
        verdict_kind: 'KEEP',
        detail: null,
      },
    ] as never
    marketplaceManagementStore.cleanup.total = 1

    renderPage()

    await waitFor(() => {
      expect(marketplaceManagementStore.isLoadingCleanup).toBe(false)
    })

    const decisionCell = document.querySelector('[data-value="KEEP"]')
    expect(decisionCell, 'decision cell with KEEP must be rendered').toBeTruthy()
    const tooltipButton = (decisionCell as HTMLElement)
      .closest('span')
      ?.querySelector('[data-tooltip-id="react-tooltip"]')
    expect(tooltipButton, 'TooltipButton must NOT be rendered when detail is null').toBeNull()
  })
})

describe('Column header glossary tooltips (EPMCDME-15056)', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiGet.mockResolvedValue({
      json: async () => ({ total: 0, items: [] }),
    })
    marketplaceManagementStore.cleanup.items = []
    marketplaceManagementStore.cleanup.total = 0
    marketplaceManagementStore.isLoadingCleanup = false
    marketplaceManagementStore.facets = null
    marketplaceManagementStore.overview = null
    // Seed a realistic auditConfig so the column-header tooltip content is
    // derived from real threshold values rather than the static fallback.
    marketplaceManagementStore.auditConfig = {
      usage_tiers: { hot_percentile: 90, warm_percentile: 50, cold_percentile: 10 },
      verification: { hot_min_users: 90, warm_min_users: 50, cold_min_users: 10 },
    } as never
  })

  it('renders a TooltipButton in each of the four glossary column headers', () => {
    renderPage()

    const thead = document.querySelector('thead')
    expect(thead, 'table must have a thead').toBeTruthy()
    const tooltipButtons = (thead as HTMLElement).querySelectorAll(
      '[data-tooltip-id="react-tooltip"]'
    )
    // Tier, Bucket, Decision — three headers with info icons.
    expect(tooltipButtons.length, 'expected 3 glossary header tooltips').toBeGreaterThanOrEqual(3)
  })

  it('Tier header tooltip references the hot_percentile from auditConfig', () => {
    renderPage()

    const thead = document.querySelector('thead')
    expect(thead, 'table must have a thead').toBeTruthy()
    // The Tier <th> contains the text "Tier" (but not "Bucket" etc.)
    const tierTh = Array.from((thead as HTMLElement).querySelectorAll('th')).find(
      (th) => th.textContent?.includes('Tier') && !th.textContent?.includes('Bucket')
    )
    expect(tierTh, 'Tier column header must exist').toBeTruthy()
    const btn = (tierTh as HTMLElement).querySelector('[data-tooltip-id="react-tooltip"]')
    expect(btn, 'TooltipButton must be in Tier header').toBeTruthy()
    // The tooltip content must reference the mocked hot_percentile value.
    expect((btn as HTMLElement).getAttribute('data-tooltip-content')).toContain('90')
  })
})

describe('Tier and Bucket chip tooltips (EPMCDME-15056)', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiGet.mockResolvedValue({ json: async () => ({ total: 0, items: [] }) })
    marketplaceManagementStore.isLoadingCleanup = false
    marketplaceManagementStore.facets = null
    marketplaceManagementStore.overview = null
    marketplaceManagementStore.auditConfig = {
      usage_tiers: { hot_percentile: 90, warm_percentile: 50, cold_percentile: 10 },
      verification: { hot_min_users: 90, warm_min_users: 50, cold_min_users: 10 },
    } as never
  })

  it('TierChip with usage_tier HOT carries tooltip attributes with content containing hot_percentile', () => {
    marketplaceManagementStore.cleanup.items = [
      { ...cleanupDeleteFixture.items[0], id: 'row-hot', usage_tier: 'HOT' },
    ] as never
    marketplaceManagementStore.cleanup.total = 1

    renderPage()

    // Find the tier cell by looking for the TierChip span containing "Hot".
    // The chip itself is now the tooltip target — no separate icon sibling.
    const tierCells = document.querySelectorAll(
      '[class*="rounded-full"][class*="border"][class*="font-semibold"]'
    )
    const hotChip = Array.from(tierCells).find((el) => el.textContent?.trim() === 'Hot')
    expect(hotChip, 'Hot TierChip must be rendered').toBeTruthy()
    expect(hotChip?.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(hotChip?.getAttribute('data-tooltip-content')).toContain('90')
  })

  it('BucketChip with bucket VERIFIED carries tooltip attributes', () => {
    marketplaceManagementStore.cleanup.items = [
      { ...cleanupDeleteFixture.items[0], id: 'row-verified', bucket: 'VERIFIED' },
    ] as never
    marketplaceManagementStore.cleanup.total = 1

    renderPage()

    // The BucketChip for VERIFIED renders "Qualified". The chip itself is now
    // the tooltip target — no separate icon sibling.
    const bucketChips = document.querySelectorAll(
      '[class*="rounded-full"][class*="font-semibold"][class*="success"]'
    )
    const qualifiedChip = Array.from(bucketChips).find((el) =>
      el.textContent?.includes('Qualified')
    )
    expect(qualifiedChip, 'Qualified BucketChip must be rendered').toBeTruthy()
    expect(qualifiedChip?.getAttribute('data-tooltip-id')).toBe('react-tooltip')
  })
})
