# Technical Research

**Task**: adoption redirect localStorage dashboard widget
**Generated**: 2026-09-04T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14468: Implement UI safeguards after AI Adoption tab/page retirement: bookmark redirects, stale localStorage cleanup, and fallback rendering for saved custom dashboard widgets that reference removed adoption metrics.

Acceptance Criteria:
- Admin following a bookmark to the adoption analytics tab lands on the Analytics page's current default landing tab.
- Admin following a bookmark to the adoption framework settings page lands on Settings → Administration landing view.
- Redirected users see a retirement notice, not an error or empty dashboard.
- Existing codemie-ai-adoption-config localStorage is discarded on next CodeMie load.
- Saved custom dashboard widgets configured against adoption metrics show 'metric no longer available', while other widgets render normally.

---

## 2. Codebase Findings

### Existing Implementations

**Route layer (`src/router.tsx`)**
- The `analyticsRoutes` array registers one path: `analytics` (id `ANALYTICS`), wrapping `<AnalyticsPage />` in a `<FeatureGuard featureFlag={FEATURE_FLAGS.ENTERPRISE_EDITION}>`. There is no catch-all and no loader on this route.
- The retired `/settings/administration/ai-adoption-config` path was deleted from `settingsRoutes` (id `ai-adoption-config`) in commit `bfc4db012`. The path now resolves to the router `ErrorBoundary: ErrorPage`, not a redirect.
- The retired `?tab=adoption` was the `AnalyticsDashboard.adoption = 'adoption'` enum value (deleted in commit `fd40711e8`). No guard or redirect handles the lingering query param.
- Existing loader-based redirect precedent: `src/router.tsx` `workflowRoutes` uses `loader: () => redirect('/workflows/my')` for the bare `/workflows` path.

**Analytics page layer (`src/pages/analytics/`)**
- `AnalyticsPage.tsx` reads `?tab` from `useSearchParams`, falling back to `AnalyticsDashboardType.insights`. The guard `isCustomDashboard = tab && !isInsightsTab && !isLeaderboardTab && dashboards.some(d => d.id === tab)` means `tab=adoption` falls through all guards silently — `isCustomDashboard` is `false` because no dashboard has that id.
- `AnalyticsDashboard.tsx` builds the tab list from hardcoded tabs (`insights`, `cliInsights`, optional `leaderboard`) plus user-saved custom dashboards. It passes `activeTab` to `<Tabs>`.
- `Tabs.tsx` line 64: `const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.element`. When `activeTab='adoption'` no tab matches, `activeTabContent` is `undefined`, and the panel renders empty — no error, no message, blank content area, no tab visually selected.

**Widget rendering layer (`src/pages/analytics/components/`)**
- `DashboardSection.tsx` iterates `section.widgets` and renders each via `<DynamicWidget widget={widget} filters={filters} />`.
- `DynamicWidget.tsx` dispatches on `widget.widgetType` (TABLE, DONUT, PIE, BAR, OVERVIEW, RATIO) and passes `widget.metricType` down to the concrete widget. The `default` switch case renders `"Unknown widget type: {widgetType}"` — this guards against unknown _widget types_, not unknown _metric types_.
- Concrete widgets (`TableWidget`, `BarChartWidget`, `DonutChartWidget`, `PieChartWidget`, `MetricsWidget`, `RatioWidget`) call `analyticsStore.fetchTabularData(metricType, ...)` or `analyticsStore.fetchSummaries(metricType, ...)`. A retired `metricType` string would reach the API as a 404, and the `AnalyticsWidget` error-state renderer would show the API error message, not a user-friendly retirement notice.

**Removed metric type strings** (confirmed by git diff of `fd40711e8` against `src/types/analytics.ts`):
- `TabularMetricType` removed: `'ai-adoption-user-engagement'`, `'ai-adoption-asset-reusability'`, `'ai-adoption-expertise-distribution'`, `'ai-adoption-feature-adoption'`
- `OverviewMetricType` removed: `'ai-adoption-overview'`, `'ai-adoption-maturity'`
- These six string values may still appear in any custom dashboard persisted in localStorage.

**localStorage and storage utilities (`src/utils/storage.ts`, `src/utils/storage/index.ts`)**
- Both files expose `get`, `put`, `getObject`, `remove` with a `${userId}_${key}` compound key.
- Custom dashboards are stored at key `analytics-dashboard-list-key` (constant `ANALYTICS_DASHBOARDS_KEY` in `src/pages/analytics/constants.ts`), compounded as `${userId}_analytics-dashboard-list-key`.
- The ticket's `codemie-ai-adoption-config` key does not appear anywhere in the current source tree. The adoption config was previously server-side (`PUT/DELETE v1/analytics/ai-adoption-config`). The `codemie-ai-adoption-config` key was likely written with a bare `localStorage.setItem` (without userId prefix) in code deleted in earlier commits. A targeted `localStorage.removeItem('codemie-ai-adoption-config')` is needed.

**App initialization (`src/App.tsx`, `src/hooks/appLevel/useInitialDataFetch.tsx`)**
- `useInitialDataFetch.tsx` is called from `App.tsx` and runs once on mount (empty dep array `useEffect`). It sequentially fetches customer config, loads user, then fires all other initializations. This is the canonical hook for one-time startup side-effects.
- `App.tsx` also has a `useEffect` on `[user]` that calls `floatingKataStore.loadFromLocalStorage()` after user is available.

**Stale test file (`src/store/__tests__/analytics.test.ts`)**
- Imports `AiAdoptionConfig` and `AiAdoptionConfigResponse` from `@/types/analytics` — these types were deleted in `fd40711e8` and no longer exist.
- References `analyticsStore.aiAdoptionConfig`, `analyticsStore.saveAiAdoptionConfig()`, `analyticsStore.resetAiAdoptionConfig()` — all deleted from the store.
- The file will fail TypeScript compilation and Vitest will report import errors at runtime.

### Architecture and Layers Affected

| Layer | Component | What needs to change |
|---|---|---|
| Router | `src/router.tsx` `settingsRoutes` | Add a loader redirect from `/settings/administration/ai-adoption-config` to `/settings/administration` |
| Page | `src/pages/analytics/AnalyticsPage.tsx` or `AnalyticsDashboard.tsx` | Detect `?tab=adoption`, redirect to `?tab=insights`, show retirement notice |
| Hook | `src/hooks/appLevel/useInitialDataFetch.tsx` | Remove `codemie-ai-adoption-config` from localStorage on app load |
| Widget | `src/pages/analytics/components/widgets/DynamicWidget.tsx` | Guard retired metric types before dispatching to concrete widgets |
| Test | `src/store/__tests__/analytics.test.ts` | Delete or replace the stale adoption config test file |

### Integration Points

- `analyticsStore.loadDashboards()` (called in `AnalyticsPage` `useEffect`) loads saved dashboards from localStorage; widget metricType values are in the returned payload. Retirement detection must happen downstream of this call.
- `analyticsStore.fetchTabularData(metricType, ...)` / `fetchSummaries(metricType, ...)` in `TableWidget`, `BarChartWidget`, etc. — these will receive retired metricType strings if DynamicWidget does not intercept them.
- `ANALYTICS_DASHBOARDS_KEY = 'analytics-dashboard-list-key'` and `storage.getObject(userId, key)` is the entry point for reading saved dashboard data.
- `react-router` `redirect()` from `'react-router'` is already imported in `router.tsx`.

### Patterns and Conventions

- **Router redirect**: `loader: () => redirect('/target-path')` (see `workflowRoutes`, `router.tsx` line 343).
- **Analytics tab navigation**: `setSearchParams({ tab: tabId })` is used inside `AnalyticsDashboard.tsx` to change tabs.
- **InfoNotice**: `src/pages/analytics/components/InfoNotice.tsx` renders a styled banner with a link. Currently used for "view personal spendings → Profile". This is the closest existing pattern for a retirement notice.
- **AnalyticsWidget error state**: renders `<p className="text-failed-secondary font-semibold">{error.message}</p>` when `error` prop is set — usable for the "metric no longer available" display if a synthetic error object is passed.
- **Storage cleanup on load**: `floatingKataStore.loadFromLocalStorage()` in `App.tsx` user-effect is precedent for localStorage operations at startup, scoped after user load.
- **Retired metric string set**: The six retired strings are known; a `Set<string>` constant with these values can be defined in `src/pages/analytics/constants.ts` or `src/pages/analytics/components/widgets/DynamicWidget.tsx` and checked before dispatching.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/routing-patterns.md` — covers loader-based redirects, `useSearchParams`, and the anti-pattern of using `navigate(-1)` vs `loader: () => redirect()`.
- `.ai-run/guides/architecture/architecture.md` — confirms Valtio store owns all API calls; page/component must not call `api.*` directly; store must not render JSX.

### Architectural Decisions

- The routing guide (line 60–64) documents the `loader: () => redirect()` pattern as the standard for default sub-routes and by implication for retired routes.
- The routing guide (lines 195–208) documents that route protection is done by `FeatureGuard` wrapper at the route level, not by a generic `ProtectedRoute`. The same wrapping pattern applies to the retired analytics route entry.
- The routing guide is slightly stale on two points: it refers to `createHashRouter` but the app currently uses `createBrowserRouter`; it references `aiAdoptionConfigRoutes` at line 384 which has been deleted. Trust the source (`router.tsx`) over the guide.

### Derived Conventions

- Retirement notices follow the same visual style as `InfoNotice` — a panel-outline bordered box with `text-h5 text-text-primary` and an optional `<Link>`.
- Unknown-state fallbacks in widgets use a bordered `div` with `text-text-quaternary` text — seen in `DynamicWidget`'s `default` switch case.
- Test cleanup: when a feature is removed, its dedicated test file is deleted; the `analytics.test.ts` file was not cleaned up with the adoption removal commits.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` — unit tests for `AnalyticsPage`. Includes a test case `'should NOT show Edit Dashboard button when tab is adoption (removed tab)'` that verifies the `isCustomDashboard` guard. No test covers the blank-panel state when `?tab=adoption` is active.
- `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx`, `AnalyticsUserFilter.test.tsx`, `InfoNotice.test.tsx` — cover filter UI and the notice component.
- `src/store/__tests__/analytics.test.ts` — **broken**: imports deleted types and calls deleted methods.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library. Two projects: `unit` (`*.test.tsx`) and `integration` (`*.integration.test.tsx`).
- Unit tests mock `useSnapshot`, `@/utils/api`; integration tests do not.
- `vi.mock('react-router', ...)` with `useSearchParams` override is used in `AnalyticsPage.test.tsx` — the pattern for testing query-param-driven behavior.
- `vi.mock('@/store/analytics', ...)` with `loadDashboards: vi.fn()` — the pattern for mocking dashboard load.

### Coverage Gaps

- No test for the redirect behavior when `?tab=adoption` is in the URL (currently blank panel; after fix should redirect).
- No test for the router-level redirect from `/settings/administration/ai-adoption-config`.
- No test for the `localStorage.removeItem('codemie-ai-adoption-config')` cleanup call on app load.
- No test for the "metric no longer available" fallback in `DynamicWidget` when a widget's `metricType` is a retired adoption metric.
- `src/store/__tests__/analytics.test.ts` is entirely broken and blocks the unit test suite.

---

## 5. Configuration and Environment

### Environment Variables

No adoption-specific env vars are present in the current source. The `FEATURE_FLAGS.ENTERPRISE_EDITION` flag gates the analytics routes and was already used to guard both the analytics page and the now-removed `ai-adoption-config` route.

### Configuration Files

- `src/pages/analytics/constants.ts` — `ANALYTICS_DASHBOARDS_KEY = 'analytics-dashboard-list-key'`; `MAX_DASHBOARDS_LIMIT = 5`. The set of retired metric type strings will need a constant definition here or in `DynamicWidget.tsx`.
- `src/constants/routes.ts` — no adoption route constant remains; the `ai-adoption-config` id constant was deleted in commit `bfc4db012`.

### Feature Flags and Deployment Concerns

- `FEATURE_FLAGS.ENTERPRISE_EDITION` gates the entire analytics section and formerly gated the adoption config route. The safeguards in this task operate within the already-gated routes and do not require a new flag.
- The retired localStorage key (`codemie-ai-adoption-config`) cleanup is unconditional — it should run for all users on first load after the deployment.

---

## 6. Risk Indicators

- **Stale test file blocks CI**: `src/store/__tests__/analytics.test.ts` imports types and calls methods that no longer exist. The unit test project will fail type-check (`npm run typecheck`) and Vitest will report import errors. This must be fixed before any other gate can be considered passing.
- **Blank-panel silent failure**: `?tab=adoption` currently renders an empty tab panel with no error, no message, and no active tab selected — an admin with a bookmarked adoption URL lands on a blank analytics page with no indication of what happened. This is a poor UX but not a thrown error, so it is easy to miss in manual testing.
- **Router 404 for settings page**: `/settings/administration/ai-adoption-config` hits the `ErrorBoundary: ErrorPage` rather than a soft redirect — admins see the application error page rather than a graceful landing.
- **Widget API 404 storm**: If any user has a saved custom dashboard with adoption metric widgets, every dashboard load fires API requests for retired endpoints (`v1/analytics/ai-adoption-user-engagement`, etc.), all of which return 404. The `AnalyticsWidget` will display the raw API error message (likely a generic "failed to fetch" string), not a human-readable retirement notice.
- **Unknown localStorage key scope**: The ticket names `codemie-ai-adoption-config` as a bare key (no userId prefix). The storage utility always compounds keys as `${userId}_${key}`. If the adoption feature wrote the key directly via `localStorage.setItem('codemie-ai-adoption-config', ...)`, the cleanup must also use bare `localStorage.removeItem('codemie-ai-adoption-config')` rather than the `storage.remove(userId, key)` helper. This distinction matters: using `storage.remove` would look for `${userId}_codemie-ai-adoption-config`, not `codemie-ai-adoption-config`.
- **Retirement notice placement ambiguity**: `InfoNotice` is the closest existing pattern, but it is a persistent banner above all tab content. For a redirect scenario the notice may be better as a transient toast or a temporary query-param-driven inline message. The `ToastContainer` is mounted in `App.tsx` and is available app-wide.
- **No guard for `cliInsights` tab bookmark**: The `AnalyticsDashboard.cliInsights` tab still exists; only `adoption` was removed. A guard that detects unknown tab values generically (any tab not in the current tab list) would be more future-proof than a hard-coded `'adoption'` string, but also riskier if custom dashboard IDs are mistakenly caught.

---

## 7. Summary for Complexity Assessment

The task touches four distinct layers with low coupling between them, making it decomposable but requiring careful coordination: the router (loader redirect for the settings page), the analytics page (tab-level redirect and retirement notice for `?tab=adoption`), app initialization (localStorage cleanup), and the custom-dashboard widget renderer (graceful fallback for retired metric types). The router and localStorage changes are small and follow well-established patterns already in the codebase. The analytics tab redirect requires a decision about where the guard lives — in `AnalyticsPage` via a `useEffect`/`useNavigate` pattern or in the `AnalyticsDashboard` component — and whether the retirement notice is a persistent `InfoNotice` banner or a transient toast via the already-mounted `ToastContainer`.

The widget fallback is the most novel piece. There is no existing precedent for marking a metric type as retired; `DynamicWidget` dispatches only on `widgetType`, not `metricType`. The implementation requires defining a constant set of six retired metric type strings and adding a guard before the dispatch switch. The `AnalyticsWidget` wrapper already accepts an `error` prop that renders a styled error state — passing a synthetic `ErrorDetails` object with a user-friendly message is the lowest-risk path that avoids changing the concrete widget components. The retired metric strings are fixed and known from the deleted enum values.

The primary blocker identified during research is the stale test file `src/store/__tests__/analytics.test.ts`, which imports deleted TypeScript types and calls deleted store methods; this file prevents `npm run typecheck` and the unit test suite from passing. It must be removed or replaced before the task is considered complete. Combined with the four feature changes and the test coverage gaps, the overall work surface spans approximately six files plus one new constant definition and possibly one new test file.

---

## 8. External References

None named by the task.
