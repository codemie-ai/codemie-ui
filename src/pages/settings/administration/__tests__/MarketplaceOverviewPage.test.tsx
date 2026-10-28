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
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
// setupTests replaces useNavigate() with this shared spy.
import { overviewFixture } from '@/test-utils/fixtures/marketplace'
import { navigate } from '@/test-utils/integration'

import MarketplaceOverviewPage, { GATE_COLUMNS } from '../MarketplaceOverviewPage'

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

const toasterSuccess = vi.fn()
const toasterInfo = vi.fn()
const toasterError = vi.fn()

vi.mock('@/utils/toaster', () => ({
  default: {
    success: (t: string) => toasterSuccess(t),
    info: (t: string) => toasterInfo(t),
    error: (t: string) => toasterError(t),
  },
}))

/**
 * GET /overview, captured verbatim from a live backend — see
 * src/test-utils/fixtures/marketplace/README.md. The previous literal here invented
 * `cleanup_reasons: { LOW_QUALITY, POLICY_VIOLATION }`, neither of which is a
 * member of the backend's CleanupReason enum (F-44).
 */
const OVERVIEW = overviewFixture

const renderPage = () =>
  render(
    <MemoryRouter>
      <MarketplaceOverviewPage />
    </MemoryRouter>
  )

describe('MarketplaceOverviewPage', () => {
  beforeEach(() => {
    marketplaceManagementStore.overview = OVERVIEW as never
    marketplaceManagementStore.isLoadingOverview = false
    marketplaceManagementStore.overviewLoadError = null
    marketplaceManagementStore.isAuditing = false
    marketplaceManagementStore.auditError = null
    marketplaceManagementStore.auditStatus = null
    marketplaceManagementStore.auditEsDocCount = null
    apiGet.mockReset()
    apiGet.mockResolvedValue({ json: async () => ({}) })
    apiPost.mockReset()
    toasterSuccess.mockReset()
    toasterInfo.mockReset()
    toasterError.mockReset()
    vi.mocked(navigate).mockClear()
  })

  // Regression guard. The audit-freshness line formats `last_run_at` with
  // Intl options, and combining `dateStyle`/`timeStyle` with `timeZoneName`
  // throws `TypeError: Invalid option : option` — which crashed the entire
  // page at render time. No test rendered this page, so it shipped.
  it('renders with a captured payload without throwing', () => {
    expect(() => renderPage()).not.toThrow()
  })

  it('formats the last-audit timestamp instead of crashing on Intl options', () => {
    renderPage()
    const freshness = screen.getByTestId('mm-audit-freshness')
    expect(freshness.textContent).toMatch(/Last audit:/)
    // A real formatted date, not an empty span or "Invalid Date".
    expect(freshness.textContent).not.toMatch(/Invalid Date/)
    expect(freshness.textContent).toMatch(/\d{4}/)
  })

  it('renders when the payload has never been audited and has no timestamp', () => {
    marketplaceManagementStore.overview = {
      ...OVERVIEW,
      has_ever_run: false,
      last_run_at: null,
    } as never

    expect(() => renderPage()).not.toThrow()
    screen.getByTestId('mm-no-audit-banner')
  })

  it('renders while the overview is still loading', () => {
    marketplaceManagementStore.overview = null
    marketplaceManagementStore.isLoadingOverview = true

    expect(() => renderPage()).not.toThrow()
  })

  // F-90: the Top MCPs table wires `onSelectRow` to a navigate(), but a click
  // anywhere in the row was swallowed before it reached the handler, so an
  // Overview drill-down silently did nothing.
  it('navigates to the cleanup queue when a Top MCPs row is clicked', () => {
    renderPage()

    const section = screen.getByTestId('top-mcps-section')
    const row = section.querySelector('tbody tr')
    expect(row, 'Top MCPs table must render a data row').toBeTruthy()
    const topMcp = OVERVIEW.top_mcps[0]
    expect(topMcp, 'captured overview must carry top_mcps').toBeTruthy()
    within(section).getByText(topMcp.value)

    fireEvent.click(row!)

    expect(navigate).toHaveBeenCalledWith(
      '/settings/administration/marketplace-management/cleanup?bucket=ALL&mcp=' +
        encodeURIComponent(topMcp.value)
    )
  })

  it('renders a load-failure banner without throwing', () => {
    marketplaceManagementStore.overview = null
    marketplaceManagementStore.overviewLoadError = 'Upstream timeout'

    expect(() => renderPage()).not.toThrow()
    screen.getByTestId('overview-load-error')
  })

  it('shows how many submissions have waited more than 7 days', () => {
    marketplaceManagementStore.overview = {
      ...OVERVIEW,
      pending: { ...OVERVIEW.pending, count: 9, waiting_over_7d: 4 },
    } as never
    renderPage()
    const label = screen.getByText('Waiting > 7 days')
    expect(label.parentElement).toHaveTextContent('4')
  })

  it('renders the VERIFIED KPI card with label "Qualified" not "Verified"', () => {
    renderPage()
    const kpiCard = screen.getByTestId('marketplace-kpi-VERIFIED')
    expect(kpiCard.textContent).toContain('Qualified')
    expect(kpiCard.textContent).not.toContain('Verified')
  })

  it('renders the no-audit banner with "Qualified" not "Verified"', () => {
    marketplaceManagementStore.overview = {
      ...OVERVIEW,
      has_ever_run: false,
      last_run_at: null,
    } as never
    renderPage()
    const banner = screen.getByTestId('mm-no-audit-banner')
    expect(banner.textContent).toContain('Qualified')
    expect(banner.textContent).not.toContain('Verified')
  })

  it('renders the explainer section with "Qualified" not "Verified"', () => {
    renderPage()
    const explainer = screen.getByTestId('mm-explainer')
    expect(explainer.textContent).toContain('Qualified')
    expect(explainer.textContent).not.toContain('Verified')
  })

  it('VERIFIED KPI card button is not disabled', () => {
    renderPage()
    const kpiButton = screen.getByTestId('marketplace-kpi-VERIFIED')
    expect(kpiButton).not.toBeDisabled()
  })

  it('clicking the VERIFIED KPI card navigates to the cleanup queue filtered to VERIFIED', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('marketplace-kpi-VERIFIED'))
    expect(navigate).toHaveBeenCalledWith(
      '/settings/administration/marketplace-management/cleanup?bucket=VERIFIED'
    )
  })
})

describe('MarketplaceOverviewPage run audit (F-62, 9.2)', () => {
  const finishedRun = (extra: Record<string, unknown> = {}) => ({
    json: async () => ({
      is_running: false,
      run_id: 'r1',
      started_at: 1,
      finished_at: 2,
      error: null,
      ...extra,
    }),
  })

  beforeEach(() => {
    marketplaceManagementStore.overview = OVERVIEW as never
    marketplaceManagementStore.isLoadingOverview = false
    marketplaceManagementStore.overviewLoadError = null
    marketplaceManagementStore.isAuditing = false
    marketplaceManagementStore.auditError = null
    marketplaceManagementStore.auditStatus = null
    marketplaceManagementStore.auditEsDocCount = null
    apiGet.mockReset()
    apiGet.mockResolvedValue({ json: async () => ({}) })
    apiPost.mockReset()
    toasterSuccess.mockReset()
    toasterInfo.mockReset()
    toasterError.mockReset()
  })

  // `runAudit()` already refreshes the overview and the facets once the run
  // finishes; the click handler repeated both, so every audit cost two extra
  // audit-cache reads for data that had just been fetched.
  it('refreshes the overview and facets once, not twice, after an audit', async () => {
    apiPost.mockResolvedValue(finishedRun())

    renderPage()
    fireEvent.click(screen.getByTestId('run-audit-button'))

    await waitFor(() => {
      expect(toasterSuccess).toHaveBeenCalled()
    })

    const urls = apiGet.mock.calls.map((c) => c[0] as string)
    expect(urls.filter((u) => u.includes('/overview'))).toHaveLength(1)
    expect(urls.filter((u) => u.includes('/facets'))).toHaveLength(1)
  })

  // A degraded run (phase 9.2: similarity backend unavailable, so the pass
  // covered a subset) reports `error: null` and would otherwise be announced
  // with the same "up to date" toast as a full pass.
  it('does not announce a PARTIAL audit as up to date', async () => {
    apiPost.mockResolvedValue(finishedRun({ status: 'PARTIAL', es_doc_count: 18 }))

    renderPage()
    fireEvent.click(screen.getByTestId('run-audit-button'))

    await waitFor(() => {
      expect(toasterInfo).toHaveBeenCalled()
    })
    expect(toasterSuccess).not.toHaveBeenCalled()
    expect(toasterInfo.mock.calls[0][0]).toMatch(/partial|incomplete/i)
  })
})

describe('failed quality checks — filter link', () => {
  /**
   * Reported in manual testing: the table listed check, importance and count
   * with no way to reach the assistants behind a number.
   *
   * The `action` renderer already existed and already built the correct URL —
   * it simply had no column in GATE_COLUMNS, so it never rendered. Every
   * sibling table (MCPs, categories) declares one.
   */
  it('declares an action column so the Filter link renders', () => {
    const actionColumn = GATE_COLUMNS.find((c) => c.key === 'action')

    expect(actionColumn).toBeDefined()
  })

  it('keeps the check, importance and count columns alongside it', () => {
    expect(GATE_COLUMNS.map((c) => c.key)).toEqual(['rule', 'severity', 'count', 'action'])
  })
})
