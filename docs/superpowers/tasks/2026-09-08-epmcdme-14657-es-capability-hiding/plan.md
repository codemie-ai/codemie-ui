# EPMCDME-14657 ES Capability Hiding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate Insights, CLI Insights, and Custom Dashboard tabs behind the `features:metricsAnalytics` feature flag, with a safe URL fallback for stale `?tab=` params that waits for config to load.

**Architecture:** Add two constants to FEATURE_FLAGS, thread `isMetricsAnalyticsEnabled` + `isMetricsAnalyticsLoaded` from AnalyticsPage down to AnalyticsDashboard as props, gate the affected tabs inside the existing `useMemo` — same pattern already used for `isLeaderboardEnabled` / `isAdoptionEnabled`. A `useEffect` in AnalyticsDashboard replaces a stale `?tab=` param with the first available tab, but only after `isMetricsAnalyticsLoaded=true` to prevent premature redirects before `/v1/config` resolves. `setSearchParams` is called in functional form to preserve all existing params, with `replace:true` so the stale URL is not pushed to history.

**Tech Stack:** React 18, TypeScript, Valtio, React Testing Library / Vitest.

## Global Constraints

- Use `useFeatureFlag` hook exclusively — no new state mechanism.
- Do NOT gate the AI Adoption tab.
- Do NOT change Leaderboard tab gating.
- Do NOT touch knowledgeBases, datasources, codeIndexing.
- Do NOT add new API calls or change backend contracts.
- Commit per task using the repository's existing convention (ticket prefix: EPMCDME-14657).

## Acceptance criteria

- [ ] `FEATURE_FLAGS.AI_CHAMPIONS_LEADERBOARD` and `FEATURE_FLAGS.METRICS_ANALYTICS` exist in `src/constants/featureFlags.ts`.
- [ ] `AnalyticsPage.tsx` uses both constants instead of raw strings.
- [ ] Insights and CLI Insights tabs are absent from the DOM when `features:metricsAnalytics` is false.
- [ ] Custom Dashboard tabs and their action buttons (Edit Dashboard, Manage Dashboards) are absent when `features:metricsAnalytics` is false.
- [ ] AI Adoption tab is unaffected by `metricsAnalytics` (role-gated only).
- [ ] Leaderboard tab behaviour is unchanged (still `aiChampionsLeaderboard` + role-gated).
- [ ] No tab redirect fires while config is still loading (`isMetricsAnalyticsLoaded=false`).
- [ ] Navigating to `?tab=insights` when metricsAnalytics is false (and config loaded) replaces the URL with the first available tab, preserving all other params, using history replace.

## Confirmed no-surface components

`conversationAnalytics`, `smartToolSelection`, Admin Log Lookup, Stale-Datasource Detection, Similar Assistant Suggestions — no frontend surface found; no implementation required.

---

### Task 1: Add feature flag constants

**Files:**
- Modify: `src/constants/featureFlags.ts:37` (after `TOOL_PERMISSIONS`)

**Interfaces:**
- Produces: `FEATURE_FLAGS.AI_CHAMPIONS_LEADERBOARD = 'aiChampionsLeaderboard'` and `FEATURE_FLAGS.METRICS_ANALYTICS = 'features:metricsAnalytics'`

**Test-first: no** — pure constants; TypeScript validates all call sites at compile time.

- [ ] **Step 1: Add both entries to FEATURE_FLAGS**

In `src/constants/featureFlags.ts` inside the `FEATURE_FLAGS` object after `TOOL_PERMISSIONS`, add:

```typescript
  AI_CHAMPIONS_LEADERBOARD: 'aiChampionsLeaderboard',
  METRICS_ANALYTICS: 'features:metricsAnalytics',
```

`FeatureFlag` is a derived type (`(typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]`), so it widens automatically.

---

### Task 2: Wire metricsAnalytics flag in AnalyticsPage

**Files:**
- Modify: `src/pages/analytics/AnalyticsPage.tsx`

**Interfaces:**
- Consumes: `FEATURE_FLAGS.AI_CHAMPIONS_LEADERBOARD`, `FEATURE_FLAGS.METRICS_ANALYTICS` (Task 1)
- Produces: `isMetricsAnalyticsEnabled: boolean` and `isMetricsAnalyticsLoaded: boolean` props on `<AnalyticsDashboard>`

**Test-first: no** — prop threading; TypeScript fails the build if either prop is missing from Task 3's updated interface.

- [ ] **Step 1: Import constants and wire the two flags**

1. Add `import { FEATURE_FLAGS } from '@/constants/featureFlags'`

2. Line 49 — replace raw string:
   ```typescript
   const [isLeaderboardConfigEnabled] = useFeatureFlag(FEATURE_FLAGS.AI_CHAMPIONS_LEADERBOARD)
   ```

3. After line 50, add:
   ```typescript
   const [isMetricsAnalyticsEnabled, isMetricsAnalyticsLoaded] = useFeatureFlag(FEATURE_FLAGS.METRICS_ANALYTICS)
   ```

- [ ] **Step 2: Gate customization controls and pass new props**

Custom Dashboards are part of the metricsAnalytics surface. Update both button conditions and add the two new props to `<AnalyticsDashboard>`:

- Line 96: `{isMetricsAnalyticsEnabled && isCustomizationEnabled && isCustomDashboard && (`
- Line 112: `{isMetricsAnalyticsEnabled && isCustomizationEnabled && (`
- On `<AnalyticsDashboard>` (~line 131), add:
  ```tsx
  isMetricsAnalyticsEnabled={isMetricsAnalyticsEnabled}
  isMetricsAnalyticsLoaded={isMetricsAnalyticsLoaded}
  ```

---

### Task 3: Gate tabs, add URL fallback, and test

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsDashboard.tsx`
- Create: `src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx` (new file)
- Modify: `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` (existing file — extend only)

**Interfaces:**
- Consumes: `isMetricsAnalyticsEnabled: boolean`, `isMetricsAnalyticsLoaded: boolean` (Task 2)

**Test-first: yes — 6 tests in the new AnalyticsDashboard.test.tsx and 1 new test appended to the existing AnalyticsPage.test.tsx.**

- [ ] **Step 1: Create AnalyticsDashboard.test.tsx**

Create `src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx` (use the Apache 2.0 license header found in sibling test files in the same directory):

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSetSearchParams, mockDashboards } = vi.hoisted(() => ({
  mockSetSearchParams: vi.fn(),
  mockDashboards: [{ id: 'dash1', name: 'My Dashboard' }],
}))

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useSearchParams: () => [new URLSearchParams('tab=insights&filter=foo'), mockSetSearchParams],
}))
vi.mock('valtio', () => ({ useSnapshot: () => ({ dashboards: mockDashboards }) }))
vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    fetchAiAdoptionConfig: vi.fn().mockResolvedValue(undefined),
    fetchAiAdoptionOverview: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/hooks/useAiAdoptionConfig', () => ({
  useAiAdoptionConfig: () => ({
    aiAdoptionConfig: null, loading: {}, error: {}, editingConfig: null,
    validationErrors: {}, showResetConfirmation: false,
    handleCancel: vi.fn(), handleSaveMaturity: vi.fn(),
    handleSaveUserEngagement: vi.fn(), handleSaveAssetReusability: vi.fn(),
    handleSaveExpertiseDistribution: vi.fn(), handleSaveFeatureAdoption: vi.fn(),
    handleReset: vi.fn(), handleResetConfirm: vi.fn(), handleResetCancel: vi.fn(),
    updateNestedValue: vi.fn(),
  }),
}))
vi.mock('../InsightsTab', () => ({ default: () => <div>InsightsTab</div> }))
vi.mock('../CLIInsightsTab', () => ({ default: () => <div>CLIInsightsTab</div> }))
vi.mock('../AIAdoptionTab', () => ({ default: () => <div>AIAdoptionTab</div> }))
vi.mock('../leaderboard/LeaderboardTab', () => ({ default: () => <div>LeaderboardTab</div> }))
vi.mock('../CustomDashboard', () => ({ default: () => <div>CustomDashboard</div> }))
vi.mock('../InfoNotice', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/components/AiAdoptionConfigView', () => ({ default: () => null }))
vi.mock('@/components/ConfirmationModal/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/components/Popup', () => ({
  default: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? <>{children}</> : null,
}))

import AnalyticsDashboardComponent from '../AnalyticsDashboard'

const base = {
  activeTab: 'insights',
  isConfigVisible: false,
  onHideConfig: vi.fn(),
  filters: {} as any,
  isAdoptionEnabled: true,
  isLeaderboardEnabled: false,
  isCustomizationEnabled: false,
  isMetricsAnalyticsEnabled: false,
  isMetricsAnalyticsLoaded: true,
}

describe('AnalyticsDashboard metricsAnalytics gating', () => {
  beforeEach(() => mockSetSearchParams.mockClear())

  it('hides Insights and CLI Insights tabs when metricsAnalytics is disabled', () => {
    render(<AnalyticsDashboardComponent {...base} />)
    expect(screen.queryByRole('tab', { name: 'Insights' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'CLI Insights' })).toBeNull()
  })

  it('shows Insights and CLI Insights tabs when metricsAnalytics is enabled', () => {
    render(<AnalyticsDashboardComponent {...base} isMetricsAnalyticsEnabled={true} />)
    expect(screen.getByRole('tab', { name: 'Insights' })).toBeDefined()
    expect(screen.getByRole('tab', { name: 'CLI Insights' })).toBeDefined()
  })

  it('shows AI Adoption tab regardless of metricsAnalytics flag', () => {
    render(<AnalyticsDashboardComponent {...base} />)
    expect(screen.getByRole('tab', { name: 'AI/Run Adoption' })).toBeDefined()
  })

  it('hides Custom Dashboard tabs when metricsAnalytics is disabled', () => {
    render(<AnalyticsDashboardComponent {...base} isCustomizationEnabled={true} />)
    expect(screen.queryByRole('tab', { name: 'My Dashboard' })).toBeNull()
  })

  it('does NOT redirect while config is still loading', () => {
    render(<AnalyticsDashboardComponent {...base} isMetricsAnalyticsLoaded={false} />)
    expect(mockSetSearchParams).not.toHaveBeenCalled()
  })

  it('redirects stale tab after config loaded, preserving other params, using replace', () => {
    render(<AnalyticsDashboardComponent {...base} />)
    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function), { replace: true })
    const [updater] = mockSetSearchParams.mock.calls[0] as [
      (prev: URLSearchParams) => URLSearchParams,
    ]
    const result = updater(new URLSearchParams('tab=insights&filter=foo'))
    expect(result.get('tab')).toBe('adoption')
    expect(result.get('filter')).toBe('foo')
  })
})
```

- [ ] **Step 2: Extend the existing AnalyticsPage.test.tsx**

`src/pages/analytics/__tests__/AnalyticsPage.test.tsx` already contains four tests from EPMCDME-14659. Make two targeted edits — **do not recreate the file**:

**Edit A — add an import and update the existing `useFeatureFlag` mock.**

After the existing `import { describe, it, expect, vi, beforeEach } from 'vitest'` line, add:
```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
```

The current `vi.mock('@/hooks/useFeatureFlags', ...)` default implementation returns `[false, true]` for unknown flags, which means `features:metricsAnalytics` is disabled by default. After Task 2, the Edit Dashboard button condition becomes `isMetricsAnalyticsEnabled && isCustomizationEnabled && isCustomDashboard`, so the existing "should show Edit Dashboard button when tab is a custom dashboard id" test would fail unless the default also enables `features:metricsAnalytics`.

Extract the default implementation using `vi.hoisted` (so it is accessible outside the factory), then update the mock. Replace the existing `vi.mock('@/hooks/useFeatureFlags', ...)` block with:

```typescript
const { defaultFeatureFlagImpl } = vi.hoisted(() => ({
  defaultFeatureFlagImpl: (flag: string): [boolean, boolean] => {
    if (flag === 'feature:dashboardCustomization') return [true, true]
    if (flag === 'aiChampionsLeaderboard') return [true, true]
    if (flag === 'features:metricsAnalytics') return [true, true]
    return [false, true]
  },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(defaultFeatureFlagImpl),
}))
```

**Edit B — add a new describe block** at the end of the file (after the closing `}` of the existing describe):

```typescript
describe('AnalyticsPage - metricsAnalytics button gating', () => {
  afterEach(() => {
    vi.mocked(useFeatureFlag).mockImplementation(defaultFeatureFlagImpl)
  })

  it('hides Manage Dashboards and Edit Dashboard buttons when metricsAnalytics is disabled', () => {
    vi.mocked(useFeatureFlag).mockImplementation((flag: string) => {
      if (flag === 'features:metricsAnalytics') return [false, true]
      return defaultFeatureFlagImpl(flag)
    })
    mockSearchParams.get.mockImplementation((key: string) =>
      key === 'tab' ? 'some-custom-dashboard-id' : null,
    )
    render(<AnalyticsPage />)
    expect(screen.queryByText('Edit Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Dashboards')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```
npm run test:unit -- --reporter=verbose src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx src/pages/analytics/__tests__/AnalyticsPage.test.tsx
```

Expected: 9 tests total (4 existing AnalyticsPage + 1 new AnalyticsPage + 6 new AnalyticsDashboard). TypeScript errors on missing props or failing assertions on unconditional tabs cause failures. Existing 4 tests should remain green.

- [ ] **Step 4: Implement the changes in AnalyticsDashboard.tsx**

In `src/pages/analytics/components/AnalyticsDashboard.tsx`:

1. **Extend `AnalyticsDashboardProps`** (lines 35-43) — add:
   ```typescript
   isMetricsAnalyticsEnabled: boolean
   isMetricsAnalyticsLoaded: boolean
   ```

2. **Destructure the new props** alongside the others (lines 45-53).

3. **Replace the unconditional `tabsList` initialization** (lines 101-115) with a conditional push:
   ```typescript
   const tabsList: Tab<string>[] = []
   if (isMetricsAnalyticsEnabled) {
     tabsList.push(
       { id: AnalyticsDashboard.insights, label: 'Insights', element: <InsightsTab filters={filters} />, className: '[overflow-wrap:normal]' },
       { id: AnalyticsDashboard.cliInsights, label: 'CLI Insights', element: <CLIInsightsTab filters={filters} />, className: '[overflow-wrap:normal]' },
     )
   }
   ```

4. **Gate Custom Dashboards** (line 135): `if (isMetricsAnalyticsEnabled && isCustomizationEnabled) {`

5. **Add `isMetricsAnalyticsEnabled` to the `useMemo` dependency array** (line 146).

6. **Add the load-aware, param-preserving fallback `useEffect`** after the `useMemo` block:
   ```typescript
   useEffect(() => {
     if (!isMetricsAnalyticsLoaded) return
     if (tabs.length > 0 && !tabs.find((t) => t.id === activeTab)) {
       setSearchParams(
         (prev) => {
           const next = new URLSearchParams(prev)
           next.set('tab', tabs[0].id)
           return next
         },
         { replace: true },
       )
     }
   }, [activeTab, tabs, isMetricsAnalyticsLoaded, setSearchParams])
   ```

- [ ] **Step 5: Run tests, lint, and type-check — verify all pass**

Run the targeted test files:
```
npm run test:unit -- --reporter=verbose src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx src/pages/analytics/__tests__/AnalyticsPage.test.tsx
```

Expected: all 9 assertions green.

Run type-check:
```
npm run typecheck
```

Run lint:
```
npm run lint
```

All three must exit 0 before committing.

---

## Negative constraint pass

| Constraint | Status |
|---|---|
| Do NOT gate knowledgeBases/datasources/codeIndexing | No task touches those files. |
| Do NOT change backend contracts or add new API calls | No fetch or store-method additions in any task. |
| Do NOT gate AI Adoption tab | Task 3 Step 4: adoption tab remains under `isAdoptionEnabled` only. |
| Do NOT change Leaderboard tab gating | Task 3 Step 4: leaderboard block is untouched; still guarded by `isLeaderboardEnabled` only. |
| Do NOT change navigation | No nav file touched in any task. |
| Do NOT overwrite existing AnalyticsPage.test.tsx | Task 3 Step 2 makes two targeted edits to the existing file; all four EPMCDME-14659 tests are preserved. |

`negative-constraints: all six stated constraints verified above; no task violates any of them.`
