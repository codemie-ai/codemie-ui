# AI Adoption Retirement Safeguards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the user-facing gaps left after the AI Adoption tab/page removal: broken bookmark URLs and stale localStorage. The widget-level fallback was initially planned but removed — EPMCDME-14465 removes the backend adoption API endpoints, making a frontend guard redundant.

**Architecture:** Delete the settings route entirely (404); generic `useEffect`+`setSearchParams` guard in `AnalyticsPage` to normalise any unrecognised `?tab=` value to `insights`; one `localStorage.removeItem` in `useInitialDataFetch` for cleanup.

**Tech Stack:** React 18, TypeScript 5, react-router 7 (`redirect` / `useSearchParams`), Valtio, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-09-04-EPMCDME-14468/spec.md`

## Global Constraints

- Frontend-only — no backend calls, no new feature flags, no dependency additions.
- `localStorage.removeItem('codemie-ai-adoption-config')` uses the bare key (no `userId` prefix) — the adoption config was written via `localStorage.setItem` directly, not through the storage utility.
- Generic unknown-tab guard normalises any unrecognised `?tab=` value to `insights`; it is NOT adoption-specific.
- `RETIRED_METRIC_TYPES` was NOT added — the guard was removed after EPMCDME-14465 (backend) confirmed endpoint removal makes it redundant.
- Commit per task using the repository's existing convention.

---

### Task 1: Remove stale analytics test file

**Test-first: no — the broken file is the blocker; deletion is the fix.**

**Files:**
- Delete: `src/store/__tests__/analytics.test.ts`

- [ ] Delete `src/store/__tests__/analytics.test.ts`. It imports `AiAdoptionConfig` and `AiAdoptionConfigResponse` (deleted in EPMCDME-14466) and calls `analyticsStore.saveAiAdoptionConfig()` / `resetAiAdoptionConfig()` (also deleted). It blocks `npm run typecheck` and the Vitest unit suite.
- [ ] Confirm `npm run typecheck` exits cleanly after deletion.
- [ ] Commit.

---

### Task 2: Remove settings route and its test

**Test-first: no — we are deleting code, not adding it.**

**Files:**
- Modify: `src/router.tsx`
- Delete: `src/pages/settings/administration/__tests__/AiAdoptionConfigRoute.test.tsx`

- [ ] In `src/router.tsx`, delete the `ai-adoption-config` route object entirely:

```ts
{
  path: '/settings/administration/ai-adoption-config',
  loader: () => redirect('/settings/profile'),
},
```

If `redirect` is no longer referenced anywhere else in the file after deletion, remove it from the `'react-router'` import as well.

- [ ] Delete `src/pages/settings/administration/__tests__/AiAdoptionConfigRoute.test.tsx` — it verified the loader that no longer exists.
- [ ] Commit.

---

### Task 3: Remove RETIRED_METRIC_TYPES constant _(plan reversed — see note)_

> **Note:** The initial plan added this constant. After confirming EPMCDME-14465 removes the backend adoption API endpoints, the constant and the DynamicWidget guard were removed instead. Tasks 3 and 4 below document what was actually done.

**Files:**
- Modify: `src/pages/analytics/constants.ts` — `RETIRED_METRIC_TYPES` removed (was never shipped; removed in same branch)

- [x] Confirmed `constants.ts` contains no `RETIRED_METRIC_TYPES` export.
- [x] Commit included in Task 4 below.

---

### Task 4: Remove RETIRED_METRIC_TYPES guard from DynamicWidget _(plan reversed)_

> **Rationale:** EPMCDME-14465 removes the backend adoption API endpoints. A frontend guard that intercepts adoption `metricType` values before they reach the network is redundant — widgets still in saved dashboards will receive a standard 404 from the backend through the existing error-handling path. The guard-specific test case was removed; the pass-through test (`renders TableWidget for a TABLE widgetType`) was retained.

**Files:**
- Modify: `src/pages/analytics/components/widgets/DynamicWidget.tsx` — guard block and three imports removed
- Modify: `src/pages/analytics/components/widgets/__tests__/DynamicWidget.test.tsx` — guard test removed, pass-through test kept

- [x] Verified `DynamicWidget.tsx` contains no `RETIRED_METRIC_TYPES` reference.
- [x] Verified `DynamicWidget.test.tsx` retains the `renders TableWidget for a TABLE widgetType` test.
- [x] Commit.

---

### Task 5: Generic unknown-tab guard — replace adoption-specific logic

**Test-first: yes — update the existing `AnalyticsPage.test.tsx` tests before modifying `AnalyticsPage.tsx`.**

**Files:**
- Modify: `src/pages/analytics/__tests__/AnalyticsPage.test.tsx`
- Modify: `src/pages/analytics/AnalyticsPage.tsx`

- [ ] In `AnalyticsPage.test.tsx`, ensure a hoisted `mockSetSearchParams` spy is exposed from the `useSearchParams` mock (add if not already present):

```ts
const mockSetSearchParams = vi.hoisted(() => vi.fn())

// in the vi.mock('react-router', ...) factory:
useSearchParams: vi.fn(() => [mockSearchParams, mockSetSearchParams]),
```

- [ ] Remove any existing test cases that assert `tab=adoption` redirects to `{ tab: 'insights', notice: 'adoption-retired' }` or that check for the retirement notice banner.

- [ ] Add two new `it` cases covering the generic guard:

```ts
it('redirects an unrecognised tab to insights once dashboards have loaded', async () => {
  mockSearchParams.get.mockImplementation((key: string) => {
    if (key === 'tab') return 'stale-unknown-tab'
    return null
  })
  render(<AnalyticsPage />)
  // trigger dashboardsLoaded by resolving loadDashboards
  await waitFor(() =>
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { tab: 'insights' },
      { replace: true },
    )
  )
})

it('does not redirect a recognised built-in tab', async () => {
  mockSearchParams.get.mockImplementation((key: string) => {
    if (key === 'tab') return 'insights'
    return null
  })
  render(<AnalyticsPage />)
  await waitFor(() => expect(mockSetSearchParams).not.toHaveBeenCalled())
})
```

- [ ] Run the full test file — confirm the two new cases fail, existing cases still pass.

- [ ] In `AnalyticsPage.tsx`, replace the adoption-specific `useEffect` (lines 73–77) with the generic guard:

```ts
useEffect(() => {
  if (!dashboardsLoaded) return
  const isValidTab =
    tab === AnalyticsDashboardType.insights ||
    tab === AnalyticsDashboardType.cliInsights ||
    tab === AnalyticsDashboardType.leaderboard ||
    dashboards.some((d) => d.id === tab)
  if (!isValidTab) {
    setSearchParams({ tab: AnalyticsDashboardType.insights }, { replace: true })
  }
}, [tab, dashboardsLoaded, dashboards, setSearchParams])
```

- [ ] Remove the `notice` search-param read (`const notice = searchParams.get('notice')`) and the retirement notice banner JSX block that was conditionally rendered on `notice === 'adoption-retired'`.

- [ ] Run the full test file — confirm all cases pass.
- [ ] Commit.

---

### Task 6: Stale localStorage cleanup _(plan reversed — QA gate 2026-09-09)_

> **Note:** The initial plan added `localStorage.removeItem('codemie-ai-adoption-config')` to `useInitialDataFetch`. After QA gate review (decision 2: no mention of retired functionality in code), the call was not added — the key name is itself a trace. Stale entries in existing sessions are functionally inert because no code reads this key post-retirement. Spec AC #3 is marked superseded accordingly.

- [x] Confirmed `useInitialDataFetch.tsx` contains no `localStorage.removeItem('codemie-ai-adoption-config')` call.

---

## Negative-constraints record

| Non-goal | How the plan honors it |
|---|---|
| No retirement notice anywhere | Task 2 deletes the route (no UI); Task 5 redirects silently with no banner |
| No redirect for the settings URL | Task 2 deletes the route entirely; 404 is the correct outcome |
| No "Metric no longer available" frontend guard | Tasks 3 & 4 removed it — EPMCDME-14465 removes backend endpoints, making it redundant |
| No cleanup of saved custom dashboard data | No task touches `analytics-dashboard-list-key` |
| No dashboard removal or migration | No task deletes dashboard entries from localStorage |
| No backend changes | All tasks are frontend-only |
| No new feature flag | No task adds a flag; `FEATURE_FLAGS.ENTERPRISE_EDITION` unchanged |
| No adoption config data migration | Task 6 calls `removeItem` — no read, copy, or preserve |
