# Analytics Filter URL–localStorage Sync Fix (EPMCDME-15058)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four root-cause bugs so Analytics page filters stay in the address bar, survive back-navigation, and fully overwrite (not merge) local state when opened from a shared link.

**Architecture:** Four source files change. `AnalyticsDashboard.tsx` gets a one-line tab-clobber fix. `src/utils/filters.ts` gains one additive export (`getFilterStorageKey`) that exposes the private key format without touching any existing function body. `useAnalyticsFilters.ts` is fully rewritten: it subscribes to `useSearchParams` reactively, initialises state synchronously on first render via a **pure** `resolveInitialFilters` function (no side effects — all writes happen in the effect), implements a URL-priority decision tree scoped to analytics-only keys, sanitizes URL values per-field keeping valid siblings (AC 6), guards against delayed userId hydration (AC 9), and routes URL and localStorage writes through separate paths to avoid the URL param-reorder loop.

**Tech Stack:** React 18, TypeScript 5, React Router 7 (`useSearchParams`, `createMemoryRouter`), Valtio (`useSnapshot`), lodash `isEqual`, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-09-17-epmcdme-15058/spec.md`

## Global Constraints

- **The merge behaviour of `getFilters()` in `src/utils/filters.ts` must not change** — 11+ other feature areas depend on it. Additive exports (new exported functions or constants that do not touch existing function bodies) are allowed; they carry no regression risk.
- No changes to `AnalyticsPage.tsx` or `AnalyticsFilters.tsx`.
- Reset/clear must write `DEFAULT_FILTERS = { time_period: TimePeriod.LAST_HOUR }`, never empty state.
- Commit per task using the repository's existing convention (`EPMCDME-15058: <description>`).

---

### Task 1: Fix tab-change parameter clobbering in AnalyticsDashboard.tsx

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsDashboard.tsx:101`
- Create: `src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx` (unit)
- Create: `src/pages/analytics/components/__tests__/AnalyticsDashboard.integration.test.tsx` (real-router)

**Test-first: yes — unit tests drive the line 101 fix; the integration test asserts the observable end-to-end behaviour that filter params survive a tab change in a real router.**

- [ ] **Step 1: Create the unit test file**

Follow the mock pattern from `src/pages/analytics/__tests__/AnalyticsPage.test.tsx`: `vi.hoisted` + `vi.mock` for react-router, valtio, analyticsStore, useAiAdoptionConfig, all child tab components, and UI primitives. The critical mock:

```ts
const mockSetSearchParams = vi.hoisted(() => vi.fn())
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useSearchParams: vi.fn(() => [
      new URLSearchParams('time_period=last_hour&tab=insights'),
      mockSetSearchParams,
    ]),
  }
})
```

Two test cases — `minimalProps = { activeTab: 'insights', isConfigVisible: false, onHideConfig: vi.fn(), filters: { time_period: 'last_hour' } as any, isAdoptionEnabled: false, isLeaderboardEnabled: false, isCustomizationEnabled: false, isCliAnalyticsEnabled: false }`:

```ts
it('tab change calls setSearchParams with a function updater, not an object', () => {
  render(<AnalyticsDashboardComponent {...minimalProps} />)
  fireEvent.click(screen.getByText('CLI Insights'))
  expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function))
})

it('the updater preserves filter params and updates only tab', () => {
  render(<AnalyticsDashboardComponent {...minimalProps} />)
  fireEvent.click(screen.getByText('CLI Insights'))
  const updater = mockSetSearchParams.mock.calls[0][0] as (p: URLSearchParams) => URLSearchParams
  const result = updater(new URLSearchParams('time_period=last_hour&tab=insights'))
  expect(result.get('time_period')).toBe('last_hour')
  expect(result.get('tab')).toBe('cliInsights')
})
```

- [ ] **Step 2: Run the unit tests — expect both to fail**

`npx vitest run src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx`

- [ ] **Step 3: Apply the one-line fix**

`src/pages/analytics/components/AnalyticsDashboard.tsx:101` — replace `setSearchParams({ tab: tabId })` with:

```ts
setSearchParams(prev => { prev.set('tab', tabId); return prev })
```

- [ ] **Step 4: Run the unit tests — expect both to pass**

`npx vitest run src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx`

- [ ] **Step 5: Create the integration test file**

Does not mock `react-router`. Wraps with `createMemoryRouter` + `RouterProvider`. Mocks everything else (valtio, analyticsStore, useAiAdoptionConfig, `@/components/Tabs/Tabs`, all child tab components, and UI primitives):

```ts
import { render, screen, fireEvent } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, it, expect, vi } from 'vitest'

// No vi.mock('react-router') — real useSearchParams is required

vi.mock('valtio', () => ({ useSnapshot: vi.fn((s: unknown) => s), proxy: (o: unknown) => o, subscribe: vi.fn() }))
vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    dashboards: [], aiAdoptionConfig: null, loading: {}, error: {},
    fetchAiAdoptionConfig: vi.fn().mockResolvedValue(null),
    fetchAiAdoptionOverview: vi.fn().mockResolvedValue(null),
  },
}))
vi.mock('@/hooks/useAiAdoptionConfig', () => ({
  useAiAdoptionConfig: () => ({
    aiAdoptionConfig: null, loading: false, error: null, editingConfig: false,
    validationErrors: {}, showResetConfirmation: false,
    handleCancel: vi.fn(), handleSaveMaturity: vi.fn(), handleSaveUserEngagement: vi.fn(),
    handleSaveAssetReusability: vi.fn(), handleSaveExpertiseDistribution: vi.fn(),
    handleSaveFeatureAdoption: vi.fn(), handleReset: vi.fn(),
    handleResetConfirm: vi.fn(), handleResetCancel: vi.fn(), updateNestedValue: vi.fn(),
  }),
}))
vi.mock('@/components/Tabs/Tabs', () => ({
  default: ({ tabs, onChange }: any) => (
    <div>{tabs.map((t: any) => <button key={t.id} onClick={() => onChange(t.id)}>{t.label}</button>)}</div>
  ),
}))
vi.mock('../InsightsTab', () => ({ default: () => null }))
vi.mock('../CLIInsightsTab', () => ({ default: () => null }))
vi.mock('../AIAdoptionTab', () => ({ default: () => null }))
vi.mock('../leaderboard/LeaderboardTab', () => ({ default: () => null }))
vi.mock('../CustomDashboard', () => ({ default: () => null }))
vi.mock('../cli-analytics/CliAnalyticsTab', () => ({ default: () => null }))
vi.mock('../InfoNotice', () => ({ default: () => null }))
vi.mock('@/components/ConfirmationModal/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/components/Popup', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/components/AiAdoptionConfigView', () => ({ default: () => null }))

import AnalyticsDashboardComponent from '../AnalyticsDashboard'

const minimalProps = {
  activeTab: 'insights', isConfigVisible: false, onHideConfig: vi.fn(),
  filters: { time_period: 'last_hour' } as any,
  isAdoptionEnabled: false, isLeaderboardEnabled: false,
  isCustomizationEnabled: false, isCliAnalyticsEnabled: false,
}

describe('AnalyticsDashboardComponent integration', () => {
  it('tab change preserves existing filter params in the real router URL', () => {
    const router = createMemoryRouter(
      [{ path: '/analytics', element: <AnalyticsDashboardComponent {...minimalProps} /> }],
      { initialEntries: ['/analytics?time_period=last_hour&tab=insights'] }
    )
    render(<RouterProvider router={router} />)
    fireEvent.click(screen.getByText('CLI Insights'))
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('time_period')).toBe('last_hour')
    expect(params.get('tab')).toBe('cliInsights')
  })
})
```

- [ ] **Step 6: Run the integration test — expect it to pass**

`npx vitest run src/pages/analytics/components/__tests__/AnalyticsDashboard.integration.test.tsx`

---

### Task 2: Add getFilterStorageKey to filters.ts and add baseline utility tests

**Files:**
- Modify: `src/utils/filters.ts` (additive export only)
- Modify: `src/utils/__tests__/filters.test.ts`

**Test-first: yes — write a failing test for the new `getFilterStorageKey` export before adding it; the baseline tests for existing functions are test-first: no (they document existing behavior).**

- [ ] **Step 1: Write the failing test for `getFilterStorageKey`**

Add to `src/utils/__tests__/filters.test.ts` (at the end, after existing describe blocks):

```ts
import { getFilterStorageKey } from '@/utils/filters'

describe('getFilterStorageKey', () => {
  it('returns the prefixed key for a given entity', () => {
    expect(getFilterStorageKey('analytics')).toBe('filters_analytics')
    expect(getFilterStorageKey('assistants')).toBe('filters_assistants')
  })
})
```

- [ ] **Step 2: Run to confirm the test fails (function not exported yet)**

`npx vitest run src/utils/__tests__/filters.test.ts`

- [ ] **Step 3: Add the export to `src/utils/filters.ts`**

After the `FILTERS_PREFIX` constant (line 23), add:

```ts
/**
 * Returns the localStorage key for a given filter entity.
 * Exposes the private FILTERS_PREFIX format so callers can write to the
 * correct key directly without duplicating the prefix constant.
 */
export const getFilterStorageKey = (entityKey: string): string =>
  `${FILTERS_PREFIX}_${entityKey}`
```

No existing function body is touched.

- [ ] **Step 4: Run to confirm the new test passes**

`npx vitest run src/utils/__tests__/filters.test.ts`

- [ ] **Step 5: Add module-level mocks and three more describe blocks to `src/utils/__tests__/filters.test.ts`**

At module scope (after the `getFilterStorageKey` import line), add:

```ts
import { getFilters, getFiltersFromUrl, updateUrlWithFilters, FilterKeys } from '@/utils/filters'

const mockReplace = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useVueRouter', () => ({
  replace: mockReplace,
  parseSearchParams: (p: URLSearchParams) => {
    const q: Record<string, string | string[]> = {}
    p.forEach((v, k) => {
      const ex = q[k]
      q[k] = ex === undefined ? v : Array.isArray(ex) ? [...ex, v] : [ex, v]
    })
    return q
  },
}))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'u1' } } }))
vi.mock('@/utils/storage', () => ({
  default: { getObject: vi.fn(() => ({})), put: vi.fn(), remove: vi.fn() },
}))
```

Append the three describe blocks at the end:

```ts
const ANALYTICS_KEYS: FilterKeys = {
  simple: ['time_period', 'start_date', 'end_date'],
  boolean: [],
  multiple: ['users', 'projects'],
}

describe('updateUrlWithFilters', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    vi.stubGlobal('location', { ...window.location, search: '?tab=insights' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('preserves the current tab param when writing filter params', () => {
    updateUrlWithFilters({ time_period: 'last_hour' })
    expect(mockReplace).toHaveBeenCalledOnce()
    const q = mockReplace.mock.calls[0][0].query
    expect(q.tab).toBe('insights')
    expect(q.time_period).toBe('last_hour')
  })
})

describe('getFiltersFromUrl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns only the keys in the provided FilterKeys schema, ignoring unknown keys', () => {
    vi.stubGlobal('location', { ...window.location, search: '?time_period=last_hour&search=foo&tab=insights' })
    const result = getFiltersFromUrl(ANALYTICS_KEYS)
    expect(result.time_period).toBe('last_hour')
    expect(result.search).toBeUndefined()
    expect(result.tab).toBeUndefined()
  })

  it('returns multiple values for a multiple-type key', () => {
    vi.stubGlobal('location', { ...window.location, search: '?users=alice&users=bob' })
    expect(getFiltersFromUrl(ANALYTICS_KEYS)).toEqual({ users: ['alice', 'bob'] })
  })

  it('returns empty object when search is empty', () => {
    vi.stubGlobal('location', { ...window.location, search: '' })
    expect(getFiltersFromUrl(ANALYTICS_KEYS)).toEqual({})
  })
})

describe('getFilters scoped to ANALYTICS_KEYS', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not include non-analytics URL params (search, status) in the result', () => {
    vi.stubGlobal('location', { ...window.location, search: '?search=foo&status=active' })
    const result = getFilters('analytics', ANALYTICS_KEYS)
    expect((result as any).search).toBeUndefined()
    expect((result as any).status).toBeUndefined()
  })
})
```

- [ ] **Step 6: Run the full filters test suite — expect all to pass**

`npx vitest run src/utils/__tests__/filters.test.ts`

---

### Task 3: Rewrite useAnalyticsFilters with reactive URL sync and userId guard

**Files:**
- Modify: `src/pages/analytics/hooks/useAnalyticsFilters.ts` (full rewrite)
- Create: `src/pages/analytics/hooks/__tests__/useAnalyticsFilters.test.ts`

**Test-first: yes — write 10 failing tests covering: userId guard, URL-priority branches, per-field sanitization with sibling retention, URL rewrite on sanitization, scoped getFilters call, handleFilterChange reset, userId-after-mount hydration, and the AC 4+9 scenario (URL filter params present when userId is initially unavailable).**

- [ ] **Step 1: Create the test file**

```ts
// src/pages/analytics/hooks/__tests__/useAnalyticsFilters.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TimePeriod } from '@/types/analytics'
import { DEFAULT_FILTERS } from '../../constants'

const mockGetFiltersFromUrl = vi.hoisted(() => vi.fn(() => ({})))
const mockGetFilters = vi.hoisted(() => vi.fn(() => ({})))
const mockSetFilters = vi.hoisted(() => vi.fn())
const mockStoragePut = vi.hoisted(() => vi.fn())
const mockGetFilterStorageKey = vi.hoisted(() => vi.fn((k: string) => `filters_${k}`))
const mockUserStore = vi.hoisted(() => ({ user: null as { userId: string } | null }))
const mockSearchParams = vi.hoisted(() => new URLSearchParams())

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useSearchParams: vi.fn(() => [mockSearchParams, vi.fn()]) }
})
vi.mock('valtio', () => ({ useSnapshot: vi.fn((s: unknown) => s), proxy: (o: unknown) => o, subscribe: vi.fn() }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/utils/filters', () => ({
  FILTER_ENTITY: { ANALYTICS: 'analytics' },
  getFilters: mockGetFilters,
  getFiltersFromUrl: mockGetFiltersFromUrl,
  setFilters: mockSetFilters,
  getFilterStorageKey: mockGetFilterStorageKey,
}))
vi.mock('@/utils/storage', () => ({ default: { put: mockStoragePut } }))
vi.mock('@/utils/helpers', () => ({ cleanObject: (o: unknown) => o }))

import { useAnalyticsFilters } from '../useAnalyticsFilters'

describe('useAnalyticsFilters', () => {
  beforeEach(() => {
    mockSetFilters.mockClear()
    mockStoragePut.mockClear()
    mockGetFilters.mockReturnValue({})
    mockGetFiltersFromUrl.mockReturnValue({})
    mockUserStore.user = null
    ;[...mockSearchParams.keys()].forEach(k => mockSearchParams.delete(k))
  })

  it('does not run filter logic when userId is not yet available', () => {
    renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).not.toHaveBeenCalled()
    expect(mockStoragePut).not.toHaveBeenCalled()
  })

  it('URL present, all valid: storage.put called with URL values; setFilters NOT called; state reflects URL', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ time_period: TimePeriod.LAST_7_DAYS, users: ['alice'] })
    const { result } = renderHook(() => useAnalyticsFilters())
    expect(mockStoragePut).toHaveBeenCalledWith('u1', 'filters_analytics', { time_period: TimePeriod.LAST_7_DAYS, users: ['alice'] })
    expect(mockSetFilters).not.toHaveBeenCalled()
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_7_DAYS)
    expect(result.current.filters.users).toEqual(['alice'])
  })

  it('URL present, malformed time_period: falls back to DEFAULT_FILTERS; setFilters called to rewrite URL', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ time_period: 'garbage' as TimePeriod })
    const { result } = renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', DEFAULT_FILTERS)
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_HOUR)
  })

  it('URL present, malformed start_date but valid end_date: valid sibling retained; setFilters rewrites URL', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ start_date: 'not-a-date', end_date: '2024-01-01' })
    renderHook(() => useAnalyticsFilters())
    // start_date dropped; end_date kept; wasSanitized → setFilters rewrites URL
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', { end_date: '2024-01-01' })
  })

  it('URL absent, localStorage has values: setFilters called with storage values', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({})
    mockGetFilters.mockReturnValue({ time_period: TimePeriod.LAST_30_DAYS })
    const { result } = renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', { time_period: TimePeriod.LAST_30_DAYS })
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_30_DAYS)
  })

  it('URL absent, localStorage empty: DEFAULT_FILTERS applied via setFilters', () => {
    mockUserStore.user = { userId: 'u1' }
    renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', DEFAULT_FILTERS)
  })

  it('localStorage branch: getFilters called with ANALYTICS_FILTER_KEYS to prevent non-analytics key leakage', () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({})
    renderHook(() => useAnalyticsFilters())
    expect(mockGetFilters).toHaveBeenCalledWith(
      'analytics',
      expect.objectContaining({
        simple: expect.arrayContaining(['time_period', 'start_date', 'end_date']),
        multiple: expect.arrayContaining(['users', 'projects']),
      })
    )
  })

  it('handleFilterChange with all-empty values writes DEFAULT_FILTERS', async () => {
    mockUserStore.user = { userId: 'u1' }
    mockGetFiltersFromUrl.mockReturnValue({ time_period: TimePeriod.LAST_HOUR })
    const { result } = renderHook(() => useAnalyticsFilters())
    mockSetFilters.mockClear()
    await act(async () => {
      await result.current.handleFilterChange({
        time_period: undefined, users: [], projects: [], start_date: '', end_date: '',
      })
    })
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', DEFAULT_FILTERS)
  })

  it('userId becomes available after mount: filters restored from localStorage', () => {
    mockGetFiltersFromUrl.mockReturnValue({})
    mockGetFilters.mockReturnValue({ time_period: TimePeriod.LAST_24_HOURS })
    const { result, rerender } = renderHook(() => useAnalyticsFilters())
    expect(mockSetFilters).not.toHaveBeenCalled()
    mockUserStore.user = { userId: 'u1' }
    rerender()
    expect(mockSetFilters).toHaveBeenCalledWith('analytics', { time_period: TimePeriod.LAST_24_HOURS })
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_24_HOURS)
  })

  it('URL has valid filter params AND userId is unavailable at first render: once userId arrives, localStorage is written with URL values and filters reflect them (AC 4 + AC 9)', () => {
    // Covers the scenario where resolveInitialFilters returns {} (userId null),
    // then the effect re-runs when userId becomes available and must write localStorage.
    mockUserStore.user = null
    mockGetFiltersFromUrl.mockReturnValue({ time_period: TimePeriod.LAST_7_DAYS })
    const { result, rerender } = renderHook(() => useAnalyticsFilters())
    // Before userId: no writes
    expect(mockStoragePut).not.toHaveBeenCalled()
    expect(mockSetFilters).not.toHaveBeenCalled()
    // userId arrives
    mockUserStore.user = { userId: 'u1' }
    rerender()
    // URL params are valid → storage.put (not setFilters); no URL rewrite needed
    expect(mockStoragePut).toHaveBeenCalledWith('u1', 'filters_analytics', { time_period: TimePeriod.LAST_7_DAYS })
    expect(result.current.filters.time_period).toBe(TimePeriod.LAST_7_DAYS)
  })
})
```

- [ ] **Step 2: Run the tests — expect 10 failures**

`npx vitest run src/pages/analytics/hooks/__tests__/useAnalyticsFilters.test.ts`

- [ ] **Step 3: Rewrite `useAnalyticsFilters.ts`**

Full replacement (keep the Apache 2.0 licence header verbatim from the existing file):

```ts
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import isEqual from 'lodash/isEqual'
import { useSnapshot } from 'valtio'

import { AnalyticsQueryParams, TimePeriod } from '@/types/analytics'
import {
  FILTER_ENTITY,
  FilterKeys,
  getFilterStorageKey,
  getFilters,
  getFiltersFromUrl,
  setFilters,
} from '@/utils/filters'
import { cleanObject } from '@/utils/helpers'
import { userStore } from '@/store/user'
import storage from '@/utils/storage'

import { DEFAULT_FILTERS } from '../constants'

/** Narrows URL and localStorage reads to analytics-only keys. */
const ANALYTICS_FILTER_KEYS: FilterKeys = {
  simple: ['time_period', 'start_date', 'end_date'],
  boolean: [],
  multiple: ['users', 'projects'],
}

const isValidTimePeriod = (v: unknown): v is TimePeriod =>
  Object.values(TimePeriod).includes(v as TimePeriod)

const isValidISODate = (v: unknown): v is string =>
  typeof v === 'string' && !isNaN(Date.parse(v))

/**
 * Per-field sanitization (AC 6): keeps valid siblings, drops invalid fields.
 * Falls back to DEFAULT_FILTERS only when nothing valid remains.
 */
const sanitizeUrlFilters = (f: AnalyticsQueryParams): AnalyticsQueryParams => {
  const result: AnalyticsQueryParams = {}
  if (f.time_period !== undefined && isValidTimePeriod(f.time_period)) result.time_period = f.time_period
  if (f.start_date !== undefined && isValidISODate(f.start_date)) result.start_date = f.start_date
  if (f.end_date !== undefined && isValidISODate(f.end_date)) result.end_date = f.end_date
  if (f.users !== undefined) result.users = f.users
  if (f.projects !== undefined) result.projects = f.projects
  return Object.keys(result).length > 0 ? result : DEFAULT_FILTERS
}

/**
 * Pure synchronous state resolver — no side effects.
 * Runs in the useState lazy initializer to give the first render valid filters
 * (prevents AnalyticsDashboard's fetch effect from firing with an empty set).
 * All writes (URL and localStorage) happen exclusively in the useEffect below.
 */
function resolveInitialFilters(): AnalyticsQueryParams {
  const userId = userStore.user?.userId
  if (!userId) return {}
  const urlFilters = getFiltersFromUrl(ANALYTICS_FILTER_KEYS) as AnalyticsQueryParams
  const hasUrlFilters = Object.keys(urlFilters).length > 0
  if (hasUrlFilters) return sanitizeUrlFilters(urlFilters)
  const stored = getFilters<AnalyticsQueryParams>(FILTER_ENTITY.ANALYTICS, ANALYTICS_FILTER_KEYS)
  return Object.keys(stored).length > 0 ? stored : DEFAULT_FILTERS
}

export const useAnalyticsFilters = () => {
  const [searchParams] = useSearchParams()
  // String dep prevents effect re-firing when React Router re-issues an identical URL string.
  const searchStr = searchParams.toString()
  const { user } = useSnapshot(userStore)
  const [filterState, setFilterState] = useState<AnalyticsQueryParams>(resolveInitialFilters)

  useEffect(() => {
    if (!user?.userId) return

    const urlFilters = getFiltersFromUrl(ANALYTICS_FILTER_KEYS) as AnalyticsQueryParams
    const hasUrlFilters = Object.keys(urlFilters).length > 0

    let resolved: AnalyticsQueryParams
    if (hasUrlFilters) {
      const sanitized = sanitizeUrlFilters(urlFilters)
      const wasSanitized = !isEqual(sanitized, urlFilters)
      resolved = sanitized

      if (wasSanitized) {
        // Malformed values corrected: rewrite URL via setFilters.
        // The param-reorder-loop concern does not apply because URL content
        // is genuinely changing; the next effect pass will find no sanitization
        // needed and drop into the storage.put path below.
        setFilters(FILTER_ENTITY.ANALYTICS, resolved)
      } else {
        // URL already valid: write only to localStorage.
        // Skipping updateUrlWithFilters prevents the param-reorder loop
        // (?time_period=x&tab=y → ?tab=y&time_period=x → effect re-fires).
        storage.put(user.userId, getFilterStorageKey(FILTER_ENTITY.ANALYTICS), resolved)
      }
    } else {
      // No URL filter params: restore from localStorage, or apply defaults.
      const stored = getFilters<AnalyticsQueryParams>(FILTER_ENTITY.ANALYTICS, ANALYTICS_FILTER_KEYS)
      resolved = Object.keys(stored).length > 0 ? stored : DEFAULT_FILTERS
      setFilters(FILTER_ENTITY.ANALYTICS, resolved) // writes URL + localStorage
    }

    // Stability guard: skip re-render when derived values equal current state.
    setFilterState(prev => (isEqual(prev, resolved) ? prev : resolved))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, searchStr])

  const filters = useMemo(
    (): AnalyticsQueryParams => ({
      time_period: filterState.time_period,
      start_date: filterState.start_date,
      end_date: filterState.end_date,
      users: filterState.users?.length ? filterState.users : undefined,
      projects: filterState.projects?.length ? filterState.projects : undefined,
    }),
    [filterState]
  )

  const handleFilterChange = useCallback(async (newFilters: AnalyticsQueryParams) => {
    const cleanFilters = cleanObject(newFilters)
    try {
      const isReset = Object.entries(newFilters).every(([_key, value]) => {
        if (Array.isArray(value)) return value.length === 0
        if (typeof value === 'string') return value === ''
        return value === null || value === undefined
      })
      const filtersToApply = isReset ? DEFAULT_FILTERS : (cleanFilters as AnalyticsQueryParams)
      setFilters(FILTER_ENTITY.ANALYTICS, filtersToApply)
      setFilterState(filtersToApply)
    } catch (error) {
      console.error('Error applying filters:', error)
    }
  }, [])

  return { filters, handleFilterChange }
}
```

- [ ] **Step 4: Run the hook tests — expect all 10 to pass**

`npx vitest run src/pages/analytics/hooks/__tests__/useAnalyticsFilters.test.ts`

- [ ] **Step 5: Run related regression suites**

`npx vitest run src/pages/analytics/__tests__/AnalyticsPage.test.tsx`
`npx vitest run src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx`

---

## Self-review

**Spec coverage:**
- Fix 1 (tab clobber) → Task 1 line 101 ✓
- Fix 2 (reactive URL subscription, userId hydration) → Task 3 `useEffect([user?.userId, searchStr])` + `useState(resolveInitialFilters)` ✓
- Fix 3 (URL fully overwrites localStorage, scoped to hook) → Task 3 `ANALYTICS_FILTER_KEYS` + `getFiltersFromUrl` direct call ✓
- Fix 4 (DEFAULT_FILTERS on reset) → Task 3 `handleFilterChange` isReset path ✓
- AC 4 (shared link → localStorage updated) → effect always writes for URL-present branch; also covered by the delayed-userId test (AC 9) ✓
- Tab param preserved by `updateUrlWithFilters` (existing behaviour) — no task needed ✓

**Round 3 reviewer changes status:**
1a. Per-field `sanitizeUrlFilters` — implemented ✓
1b. URL rewritten on sanitization via `setFilters` (`wasSanitized` branch) ✓
2. `getFilterStorageKey` additive export — implemented in Task 2 ✓
3. `isInitialMountRef` approach — **withdrawn by reviewer due to AC 9 regression**. `resolveInitialFilters` is pure (no storage.put). Effect always writes. One idempotent redundant localStorage write on valid mount is accepted as the simpler, correct tradeoff. "storage.put called exactly once" assertion removed; AC 4+9 delayed-userId test added instead ✓

**Negative-constraint pass:**
- "Merge behaviour of `getFilters()` must not change" — only an additive export added; no existing body touched ✓
- "Must not modify filter persistence on any other page" — all changes scoped to analytics hook and dashboard ✓
- "Must not change the 2000ms debounce in `AnalyticsFilters.tsx`" — not touched ✓
- "Must not migrate `updateUrlWithFilters` away from `useVueRouter.replace()`" — URL-absent and `wasSanitized` branches still call `setFilters` which calls it; URL-present valid branch intentionally bypasses it ✓
- "Must not introduce `FILTER_ENTITY.CLI_ANALYTICS`" — not in plan ✓
- "Must not add pagination/sort URL sync" — not in plan ✓
