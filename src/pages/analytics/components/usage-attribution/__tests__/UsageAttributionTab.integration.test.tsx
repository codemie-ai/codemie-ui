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

import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { replace } from '@/hooks/useVueRouter'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import { appInfoStore } from '@/store/appInfo'
import { usageAttributionStore } from '@/store/usageAttribution'
import { userStore } from '@/store/user'
import { mockAPI } from '@/test-utils/integration'
import { TimePeriod } from '@/types/analytics'
import type { User } from '@/types/entity/user'
import type { UaAnalysisInfo, UaErrorBody, UaSettingsSchema } from '@/types/usageAttribution'
import toaster from '@/utils/toaster'

import { UA_LINK_PARAM, UA_POLL_MS } from '../constants'
import { buildSettingsLink, encodeOverrides } from '../settings/settingsModel'
import UsageAttributionTab from '../UsageAttributionTab'
import { formatUtcTime } from '../utils'

const UA = 'v1/analytics/usage-attribution'

const USER: User = {
  userId: 'ua-test-user',
  email: 'admin@example.com',
  isAdmin: true,
  isAuthenticated: true,
}

const SCHEMA: UaSettingsSchema = {
  schema_version: 1,
  defaults_hash: 'defaults-1',
  can_tune: true,
  can_refresh: true,
  enrichment: false,
  tuning: {
    enabled: true,
    roles: ['admin', 'maintainer'],
    max_override_bytes: 4096,
    max_custom_computations_per_hour: 10,
    max_computations_per_hour: 60,
  },
  tiers: [
    { id: 'view', label: 'Display only', description: 'Shown differently, no new analysis.' },
  ],
  groups: [{ id: 'display', label: 'Display', tier: 'view' }],
  settings: [
    {
      key: 'shared_project_threshold',
      group: 'display',
      tier: 'view',
      type: 'money',
      label: 'Shared project threshold',
      description: 'The smallest spend of a shared project in the table.',
      default: 100,
      min: 0,
      max: 10000,
      step: 10,
      unit: null,
      max_items: null,
      max_item_length: null,
    },
  ],
  fixed: {
    signal_points: {},
    max_range_days: 365,
    analysis_cache_minutes: 15,
    analysis_timeout_seconds: 120,
    fallback_field_since: '2026-01-01',
  },
}

// The global fetch stub of setupTests (mockAPI and its defaults). vi.spyOn on it would return the stub itself, so
// one endpoint is answered differently by wrapping its implementation, which afterEach puts back.
const fetchStub = vi.mocked(globalThis.fetch)
const stubImplementation = fetchStub.getMockImplementation()!

const urlOf = (input: RequestInfo | URL): string =>
  new URL(String(input instanceof Request ? input.url : input), 'http://localhost').pathname

/** Answers one endpoint of the tab with a failure; everything else as mockAPI says. */
const mockUaFailure = (path: string, answer: () => Promise<Response>) => {
  fetchStub.mockImplementation((input, init) =>
    urlOf(input).endsWith(`/${UA}/${path}`) ? answer() : stubImplementation(input, init)
  )
}

/** An HTTP error with headers (mockAPI cannot set headers). */
const mockUaError = (
  path: string,
  status: number,
  error: UaErrorBody,
  headers: Record<string, string> = {}
) =>
  mockUaFailure(path, () =>
    Promise.resolve(
      new Response(JSON.stringify({ error }), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
      })
    )
  )

const resetStore = () => {
  usageAttributionStore.resetAnalysisStatus()
  usageAttributionStore.settingsSchema = null
  usageAttributionStore.settingsError = null
  usageAttributionStore.setOverrides({}, null)
}

const asOf = () => screen.getByTestId('ua-asof')

describe('UsageAttributionTab — analysis time line', () => {
  beforeEach(() => {
    userStore.user = USER
    resetStore()
  })

  afterEach(() => {
    fetchStub.mockImplementation(stubImplementation)
    cleanup()
  })

  it('says why the analysis is unavailable when a list request fails with a 500', async () => {
    mockAPI(
      'GET',
      `${UA}/cli-summary`,
      { error: { message: 'Analysis failed', details: 'The query was rejected' } },
      500
    )

    render(<UsageAttributionTab filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)

    expect(
      await screen.findByText('Analysis unavailable: Analysis failed: The query was rejected')
    ).toBeInTheDocument()
    expect(asOf()).not.toHaveTextContent('analysing repositories')
  })

  it('says "Failed to fetch" on a network error', async () => {
    mockUaFailure('shared-projects', () => Promise.reject(new TypeError('Failed to fetch')))

    render(<UsageAttributionTab filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)

    expect(await screen.findByText('Analysis unavailable: Failed to fetch')).toBeInTheDocument()
  })
})

describe('UsageAttributionTab — the time to wait', () => {
  beforeEach(() => {
    userStore.user = USER
    resetStore()
  })

  afterEach(() => {
    fetchStub.mockImplementation(stubImplementation)
    cleanup()
  })

  it('adds the Retry-After of a 429 to the time line', async () => {
    mockUaError(
      'cli-summary',
      429,
      {
        message: 'Too many analyses',
        details:
          'You started 10 computations with custom settings in the last hour, the most allowed. Reset to the defaults or wait.',
      },
      { 'Retry-After': '2520' }
    )

    render(<UsageAttributionTab filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)

    expect(
      await screen.findByText(
        'Analysis unavailable: Too many analyses: You started 10 computations with custom settings in the last hour, the most allowed. Reset to the defaults or wait. Try again in 42 min.'
      )
    ).toBeInTheDocument()
  })

  it('adds retry_after of the error body when the Retry-After header is hidden (another origin)', async () => {
    mockUaError('cli-summary', 429, {
      message: 'Too many analyses',
      details:
        'You started 10 computations with custom settings in the last hour, the most allowed. Reset to the defaults or wait.',
      retry_after: 2520,
    })

    render(<UsageAttributionTab filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)

    expect(
      await screen.findByText(
        'Analysis unavailable: Too many analyses: You started 10 computations with custom settings in the last hour, the most allowed. Reset to the defaults or wait. Try again in 42 min.'
      )
    ).toBeInTheDocument()
  })

  it('adds the Retry-After of a 504 to the time line', async () => {
    mockUaError(
      'shared-projects',
      504,
      { message: 'The analysis timed out' },
      { 'Retry-After': '90' }
    )

    render(<UsageAttributionTab filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)

    expect(
      await screen.findByText('Analysis unavailable: The analysis timed out. Try again in 2 min.')
    ).toBeInTheDocument()
  })

  it('adds the Retry-After of a 429 to the Recompute error toast', async () => {
    mockAPI('GET', `${UA}/settings`, { data: SCHEMA })
    mockUaError(
      'refresh',
      429,
      {
        message: 'Recompute was requested too recently',
        details: 'The analysis of this period and these settings runs at most once a minute.',
      },
      { 'Retry-After': '42' }
    )

    render(<UsageAttributionTab filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)
    await userEvent.click(await screen.findByRole('button', { name: '↻ Recompute' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(
        'Recompute was requested too recently: The analysis of this period and these settings runs at most once a minute. Try again in 42 s.'
      )
    )
  })
})

describe('UsageAttributionTab — over the limit, with an earlier analysis', () => {
  const COMPUTING = 'a newer analysis is being computed and replaces it when ready.'
  const LIMIT =
    'the limit of 10 computations with custom settings an hour is reached; try again in 12 minutes, or reset to the defaults.'
  /** The last finished analysis, shown while another one is computed or refused. */
  const EARLIER: UaAnalysisInfo = {
    computed_at: '2026-10-14T08:00:00Z',
    duration_ms: 1200,
    cache: 'stale',
    stale: true,
    refreshing: false,
    error: null,
    ttl_s: null,
    window: null,
    evidence_window: null,
    coverage: null,
    unclassified_reasons: null,
    allocated: null,
    timings: {},
    settings: {
      hash: 'custom-1',
      defaults_hash: 'defaults-1',
      schema_version: 1,
      overridden: ['shared_project_threshold'],
      tier: 'analysis',
    },
  }
  const showing = (note: string) =>
    `Showing the analysis from ${formatUtcTime(EARLIER.computed_at)}: ${note}`

  /** A table answer that carries only the analysis behind it. */
  const tableAnswer = (analysis: UaAnalysisInfo) => ({
    data: { rows: [], totals: null },
    pagination: { page: 0, per_page: 10, total_count: 0, has_more: false },
    counts: { threshold: 0, all: 0 },
    threshold: 100,
    display: null,
    range: null,
    analysis,
  })

  type Schedule = (handler: unknown, ms?: number, ...args: unknown[]) => unknown

  /** The poll timers of the tab (UA_POLL_MS) that are scheduled and not cleared; the real timers still run. */
  const trackPollTimers = () => {
    const pending = new Set<unknown>()
    const realSetTimeout = globalThis.setTimeout as unknown as Schedule
    const realClearTimeout = globalThis.clearTimeout
    const schedule: Schedule = (handler, ms, ...args) => {
      const id = realSetTimeout(handler, ms, ...args)
      if (ms === UA_POLL_MS) pending.add(id)
      return id
    }
    const set = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(schedule as unknown as typeof setTimeout)
    const clear = vi.spyOn(globalThis, 'clearTimeout').mockImplementation((id) => {
      pending.delete(id)
      realClearTimeout(id)
    })
    return {
      pending,
      restore: () => {
        set.mockRestore()
        clear.mockRestore()
      },
    }
  }

  let timers: ReturnType<typeof trackPollTimers>

  beforeEach(() => {
    localStorage.clear()
    userStore.user = USER
    resetStore()
    mockAPI('GET', `${UA}/settings`, { data: SCHEMA })
    timers = trackPollTimers()
  })

  afterEach(() => {
    timers.restore()
    cleanup()
  })

  it('shows the earlier analysis with the limit on the status line and stops asking again', async () => {
    // A computation was started: the earlier analysis is shown while it runs, and the tab asks again.
    mockAPI(
      'GET',
      `${UA}/shared-projects`,
      tableAnswer({ ...EARLIER, refreshing: true, error: COMPUTING })
    )
    render(<UsageAttributionTab filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)

    expect(await screen.findByText(showing(COMPUTING))).toBeInTheDocument()
    expect(within(asOf()).getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    await waitFor(() => expect(timers.pending.size).toBe(1))

    // The limit refused it: the poll gets the earlier analysis with the limit and the wait, not refreshing.
    mockAPI(
      'GET',
      `${UA}/shared-projects`,
      tableAnswer({ ...EARLIER, refreshing: false, error: LIMIT })
    )
    act(() => usageAttributionStore.poll())

    const status = await screen.findByText(showing(LIMIT))
    expect(status).toHaveClass('text-failed-secondary')
    expect(within(asOf()).queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument()
    await waitFor(() => expect(timers.pending.size).toBe(0))
    expect(usageAttributionStore.polls).toBe(1)
  })
})

describe('UsageAttributionTab — a shared settings link', () => {
  const LINK_VALUES = { shared_project_threshold: 500 }
  const NOTE =
    '1 setting from a shared link. Nothing is applied until you click Apply; Cancel discards them.'

  /** The URL "Copy link" builds on the given page. */
  const sharedLink = (search: string) =>
    buildSettingsLink(LINK_VALUES, UA_LINK_PARAM, {
      origin: window.location.origin,
      pathname: '/analytics',
      search,
    } as Location)

  /**
   * Opens the link in the Analytics page: jsdom's address bar holds it (useAnalyticsFilters and the link reader read
   * window.location), the memory router renders the page.
   */
  const openLink = (search: string) => {
    window.history.replaceState(null, '', sharedLink(search))
    const router = createMemoryRouter([{ path: '/analytics', element: <AnalyticsPage /> }], {
      initialEntries: [`/analytics${search}`],
    })
    return render(<RouterProvider router={router} />)
  }

  beforeEach(() => {
    localStorage.clear()
    userStore.user = USER
    appInfoStore.configs = [{ id: FEATURE_FLAGS.USAGE_ATTRIBUTION, settings: { enabled: true } }]
    appInfoStore.isConfigFetched = true
    resetStore()
    mockAPI('GET', `${UA}/settings`, { data: SCHEMA })
    // What `navigate` in src/hooks/useVueRouter.tsx does for the query-only replace of the Analytics filters sync:
    // router.navigate({ pathname, search }, { replace: true }), so the new URL has no #fragment.
    vi.mocked(replace).mockImplementation((route) => {
      const { query } = route as { query: Record<string, string> }
      const search = new URLSearchParams(query).toString()
      const searchSuffix = search ? `?${search}` : ''
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${searchSuffix}`
      )
    })
  })

  afterEach(() => {
    vi.mocked(replace).mockReset()
    cleanup()
    window.history.replaceState(null, '', '/')
  })

  it('opens Analysis Settings from a link without a period in the URL', async () => {
    openLink('?tab=usageAttribution')

    expect(await screen.findByText(NOTE)).toBeInTheDocument()
    // The filters sync did rewrite the URL without the #fragment before the settings arrived.
    expect(replace).toHaveBeenCalled()
    expect(window.location.hash).toBe('')
    // Nothing is applied until Apply.
    expect(usageAttributionStore.encodedOverrides).toBeNull()
  })

  it('opens Analysis Settings from a link with a period in the URL', async () => {
    openLink('?tab=usageAttribution&time_period=last_30_days')

    expect(await screen.findByText(NOTE)).toBeInTheDocument()
    expect(usageAttributionStore.encodedOverrides).toBeNull()
  })

  it('Cancel discards the values of the link and removes #ua= from the address bar', async () => {
    openLink('?tab=usageAttribution&time_period=last_30_days')
    await screen.findByText(NOTE)
    expect(window.location.hash).toMatch(/^#ua=/)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByText(NOTE)).not.toBeInTheDocument())
    expect(usageAttributionStore.encodedOverrides).toBeNull()
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?tab=usageAttribution&time_period=last_30_days')
  })

  it('a second link opened in the same tab after Cancel opens Analysis Settings again', async () => {
    openLink('?tab=usageAttribution&time_period=last_30_days')
    await screen.findByText(NOTE)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByText(NOTE)).not.toBeInTheDocument())

    // Only the #fragment changes, as when a link to this page is opened in the loaded tab: no reload.
    window.location.hash = new URL(
      sharedLink('?tab=usageAttribution&time_period=last_30_days')
    ).hash

    expect(await screen.findByText(NOTE)).toBeInTheDocument()
    expect(usageAttributionStore.encodedOverrides).toBeNull()
  })

  it('Apply applies the values of the link and removes #ua= from the address bar', async () => {
    openLink('?tab=usageAttribution&time_period=last_30_days')
    await screen.findByText(NOTE)

    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() =>
      expect(usageAttributionStore.encodedOverrides).toBe(encodeOverrides(LINK_VALUES))
    )
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })

  it('Apply applies the values of a link whose #fragment the filters sync dropped', async () => {
    openLink('?tab=usageAttribution')
    await screen.findByText(NOTE)

    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() =>
      expect(usageAttributionStore.encodedOverrides).toBe(encodeOverrides(LINK_VALUES))
    )
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })
})
