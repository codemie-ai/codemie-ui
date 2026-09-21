# EPMCDME-14468: AI Adoption Retirement Safeguards

**Ticket**: EPMCDME-14468  
**Branch**: EPMCDME-14344_retire-ai-run-adoption-framework  
**Size**: M (15–20 pts, 2–3 days)

---

## Overview

The AI Adoption tab and settings page were removed in EPMCDME-14466. Without follow-up work, three user-facing gaps remain open:

1. Bookmarked URLs (`?tab=adoption` and `/settings/administration/ai-adoption-config`) land on blank panels or the application error page.
2. Custom dashboard widgets configured against adoption metrics fire API 404s and display raw error messages.
3. A stale `codemie-ai-adoption-config` localStorage key persists indefinitely.

This ticket closes all three gaps with the minimal set of safeguards that satisfy the acceptance criteria. No new feature flags, no backend changes, no schema migrations.

---

## Acceptance Criteria

> Superseded ACs are struck through for historical tracking.

~~**[Superseded]** 1. Visiting `/settings/administration/ai-adoption-config` redirects to `/settings/profile` — no error page shown.~~
~~**[Superseded]** 2. Visiting `?tab=adoption` on the analytics route redirects to `?tab=insights` and shows a retirement notice.~~
~~**[Superseded]** 4. Custom dashboard widgets whose `metricType` is a retired adoption metric display "Metric no longer available" instead of a raw API error.~~
~~**[Superseded]** 5. Custom dashboard widgets with non-adoption metric types continue to render normally.~~

1. The route `/settings/administration/ai-adoption-config` no longer exists in the router. Visiting it returns a 404 — no redirect, no error-page workaround.
2. Visiting `?tab=adoption` (or any other unrecognised tab) on the Analytics page silently redirects to `?tab=insights` — no retirement notice shown.
~~3. On first app load after deployment, `codemie-ai-adoption-config` is removed from localStorage.~~ **[Superseded — QA gate 2026-09-09]** The `localStorage.removeItem('codemie-ai-adoption-config')` call was removed: the key name constitutes a trace of the retired feature in code (decision 2). Stale entries in existing sessions are functionally inert — no code reads this key post-retirement.
4. Generic unknown-tab guard: once dashboards have loaded, any `?tab=` value that is not `insights`, `cliInsights`, `leaderboard`, or a loaded custom dashboard ID is silently redirected to `?tab=insights`.
5. The `AiAdoptionConfigRoute` integration test is deleted (it tested the now-deleted redirect loader).
6. The `RETIRED_METRIC_TYPES` guard is removed from `DynamicWidget`. EPMCDME-14465 removes the backend adoption API endpoints, making the frontend guard redundant. Adoption-metric widgets still in saved dashboards receive a normal 404 from the backend.

---

## Design

### 1. Settings route — `src/router.tsx`

Remove the `{ path: '/settings/administration/ai-adoption-config', loader: () => redirect('/settings/profile') }` entry from `settingsRoutes` entirely. No redirect, no loader — the route simply ceases to exist. Visiting it falls through to the application's 404 handler. The test file `AiAdoptionConfigRoute.test.tsx` that verified the now-deleted loader is also deleted.

### 2. Generic unknown-tab guard — `src/pages/analytics/AnalyticsPage.tsx`

Replace the adoption-specific `useEffect` with a generic guard that runs once dashboards are loaded. Any `?tab=<value>` that is not one of the three built-in tabs (`insights`, `cliInsights`, `leaderboard`) and not the ID of a loaded custom dashboard redirects silently to `?tab=insights`:

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

No `notice` param is set and no retirement banner is shown. The `notice` search-param read and the banner JSX block are removed. The guard is not adoption-specific — it normalises any stale or mistyped tab value.

### 3. Stale localStorage cleanup — `src/hooks/appLevel/useInitialDataFetch.tsx`

In the startup `useEffect` (empty dependency array), add an unconditional `localStorage.removeItem('codemie-ai-adoption-config')` using the **bare key**. The storage utility always compounds keys as `${userId}_${key}`; the adoption config was written directly via `localStorage.setItem` without a userId prefix, so the bare key is the correct target.

This call is safe as a no-op for users who never had the config. It runs on every app mount.

### 4. Remove `RETIRED_METRIC_TYPES` constant and `DynamicWidget` guard

The initial design added a `RETIRED_METRIC_TYPES` `Set` to `src/pages/analytics/constants.ts` and a guard at the top of `DynamicWidget` that returned an "Metric no longer available" error widget for adoption metric types. This was superseded when EPMCDME-14465 (backend) was confirmed: it removes the adoption API endpoints entirely. The frontend guard is therefore redundant — widgets with adoption `metricType` values will receive a standard 404 from the backend through the existing error-handling path.

Both the constant and the guard were removed:
- `RETIRED_METRIC_TYPES` deleted from `src/pages/analytics/constants.ts`.
- Three imports (`AnalyticsWidget`, `ErrorDetails`, `RETIRED_METRIC_TYPES`) and the guard block removed from `DynamicWidget.tsx`.
- The guard-specific test case removed from `DynamicWidget.test.tsx`; the pass-through test (`renders TableWidget for a TABLE widgetType`) was retained.

### 5. Stale test file removal — `src/store/__tests__/analytics.test.ts`

Delete this file. It imports `AiAdoptionConfig` and `AiAdoptionConfigResponse` (deleted in EPMCDME-14466) and calls `analyticsStore.saveAiAdoptionConfig()` / `resetAiAdoptionConfig()` (also deleted). It prevents `npm run typecheck` and blocks the unit test suite. The functionality it tested no longer exists and has no replacement in this ticket.

---

## Files Changed

| File | Change |
|---|---|
| `src/router.tsx` | Delete `ai-adoption-config` route entry |
| `src/pages/settings/administration/__tests__/AiAdoptionConfigRoute.test.tsx` | Delete (tested the now-deleted route) |
| `src/pages/analytics/AnalyticsPage.tsx` | Replace adoption-specific guard with generic unknown-tab guard; remove `notice` param and retirement banner |
| `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` | Replace adoption-specific tests with generic unknown-tab guard tests |
| ~~`src/hooks/appLevel/useInitialDataFetch.tsx`~~ | ~~Add `localStorage.removeItem('codemie-ai-adoption-config')`~~ — **superseded by QA gate 2026-09-09; call was not added** |
| `src/pages/analytics/constants.ts` | Remove `RETIRED_METRIC_TYPES` constant (superseded — see Design §4) |
| `src/pages/analytics/components/widgets/DynamicWidget.tsx` | Remove `RETIRED_METRIC_TYPES` guard and related imports (superseded — see Design §4) |
| `src/pages/analytics/components/widgets/__tests__/DynamicWidget.test.tsx` | Remove guard-specific test; retain pass-through test |
| `src/store/__tests__/analytics.test.ts` | Delete |

---

## Non-goals

- Showing any retirement notice (banner, toast, or inline message) for the settings route or the analytics tab — clean redirect / silent normalisation only.
- Redirecting `/settings/administration/ai-adoption-config` to another page — the route is removed; 404 is the correct outcome.
- Displaying "Metric no longer available" for widgets with adoption `metricType` values — EPMCDME-14465 removes the backend endpoints; widgets receive a standard 404 through the existing error path.
- Cleaning up saved custom dashboard data in localStorage that contains adoption metric widget definitions — stored data can remain; the backend change handles the functional outcome.
- Removing or migrating custom dashboards that consist entirely of adoption metric widgets — no frontend migration required.
- Backend changes of any kind — all safeguards are frontend-only.
- Adding a new feature flag — `FEATURE_FLAGS.ENTERPRISE_EDITION` already gates the analytics section.
- Migrating `codemie-ai-adoption-config` data — the value is discarded, not preserved.

---

## Open Risks

- **Bare-key assumption**: If any browser session wrote `codemie-ai-adoption-config` with a userId prefix (i.e., through the storage utility instead of bare `localStorage.setItem`), the cleanup call misses it and the stale key persists silently. Consequence is cosmetic only; no functional impact.
