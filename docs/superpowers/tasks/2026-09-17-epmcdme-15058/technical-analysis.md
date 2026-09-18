# Technical Research

**Task**: analytics filters url localStorage sync
**Generated**: 2026-09-17T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Analytics page filters are out of sync between URL query parameters and localStorage in the CodeMie UI React/TypeScript frontend.

Filters on the Analytics page route /analytics are persisted in two places: localStorage (for restoration on return) and URL query parameters (for sharing). Three symptoms observed:
1. Query parameter disappears immediately after selecting a filter.
2. Query parameters are not restored after returning to the page.
3. URL from a shared link is merged with the locally saved state instead of replacing it.

Filter resolution order (desired):
- On filter change: write to URL params first, then mirror to localStorage.
- On page entry/return: if URL has filter params, they fully overwrite localStorage; if URL has no filter params, apply localStorage values and write them back to URL.

The task is to fix synchronization between URL query parameters and localStorage for the Analytics page filters.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/analytics/hooks/useAnalyticsFilters.ts` — central hook for analytics filter state. Initializes `filterState` once from `getFilters()` (reads URL + localStorage), exposes `filters` and `handleFilterChange`. Does NOT subscribe to URL changes after mount.
- `src/pages/analytics/AnalyticsPage.tsx` — page component. Calls `useAnalyticsFilters()`, passes `filters` as prop to `AnalyticsFilters`. Reads `tab` from `useSearchParams()` but has no `setSearchParams` call; uses `[searchParams]` (read-only destructure).
- `src/pages/analytics/components/AnalyticsFilters.tsx` — sidebar filter UI. Maintains `localFilters` state; debounces outbound calls (`leading: true, trailing: true, 2000ms`). Syncs inbound `filters` prop → `localFilters` via `useEffect`.
- `src/pages/analytics/components/AnalyticsDashboard.tsx` — tab bar + tab content. Line 101: `setSearchParams({ tab: tabId })` — React Router's `setSearchParams` with an object argument, which **replaces all search params** wholesale.
- `src/utils/filters.ts` — shared filter utilities used across the entire app:
  - `getFilters(entityKey)` — reads `window.location.search` via `getFiltersFromUrl()` and localStorage, merges per-key with URL taking priority over storage.
  - `setFilters(entityKey, filters)` — calls `updateUrlWithFilters()` then writes to localStorage.
  - `updateUrlWithFilters(filters)` — reads `window.location.search` to preserve the current `tab` param, builds a new `URLSearchParams` with `tab` + filter params, then calls `replace({ query: ... })` from `useVueRouter` which calls `router.navigate(...)` imperatively.
  - `getFiltersFromUrl(keys)` — reads `window.location.search` directly (not through React Router's state).
- `src/pages/analytics/constants.ts` — `DEFAULT_FILTERS = { time_period: TimePeriod.LAST_HOUR }`.
- `src/types/analytics.ts` — `AnalyticsQueryParams`: `{ time_period?, start_date?, end_date?, users?: string[], projects?: string[] }`.
- `src/hooks/useVueRouter.tsx` — exports `replace: RouterPush` (line 184), which calls `router.navigate(..., { replace: true })` imperatively on the browser router instance.
- `src/router.tsx` line 738 — `createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })`. The router is a **browser router** (not hash-based, despite the local variable name `hashRouter` in `useVueRouter.tsx`), so `window.location.search` is the correct source for URL query params.

### Architecture and Layers Affected

- **Page layer** (`AnalyticsPage.tsx`): entry point for filter state, reads `useSearchParams` for tab only.
- **Custom hook layer** (`useAnalyticsFilters.ts`): encapsulates filter read/write logic; owns React state for filters.
- **Shared UI component layer** (`AnalyticsFilters.tsx`): controlled component for filter UI; debounces outbound events.
- **Dashboard/tab layer** (`AnalyticsDashboard.tsx`): owns tab navigation; current implementation overwrites all URL params on tab change.
- **Utility layer** (`src/utils/filters.ts`): shared `getFilters` / `setFilters` / `getFiltersFromUrl` / `updateUrlWithFilters`; used by analytics and other feature areas.

### Integration Points

- `useVueRouter.tsx` / `replace()` — the imperative router navigation path used by `updateUrlWithFilters`. Changes here affect every feature that calls `setFilters`.
- `src/utils/storage.ts` — accessed by `filters.ts` via `storage.getObject` and `storage.put`. Keyed by `userId` + `filters_<entityKey>`.
- `FILTER_ENTITY.ANALYTICS` enum — the localStorage key segment; shared with `filters.ts` and `useAnalyticsFilters.ts`.
- `react-router` `useSearchParams` hook — used by both `AnalyticsPage` (read-only) and `AnalyticsDashboard` (write via `setSearchParams`). The two components each independently interact with URL search params through different mechanisms.

### Patterns and Conventions

- Other feature pages (assistants, skills, etc.) use `getFilters` / `setFilters` from `src/utils/filters.ts` for the same URL + localStorage pattern.
- `AnalyticsFilters.tsx` follows the controlled-component + debounce pattern; inbound prop changes are absorbed via `useEffect`.
- `useVueRouter.tsx`'s `replace()` is the project-standard way to imperatively update search params without a full navigation push.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/routing-patterns.md` — documents React Router v7 browser-based routing, `src/router.tsx` structure, and `useSearchParams` usage. Confirms route file is `src/router.tsx`.
- `.ai-run/guides/patterns/state-management.md` — Component → Store → API rule; hook-level state management patterns.

### Architectural Decisions

- The routing guide describes the router as "hash-based (`createHashRouter`)" but `src/router.tsx` line 738 uses `createBrowserRouter`. The actual source is authoritative; the guide description is stale.

### Derived Conventions

- Filter persistence is a cross-cutting concern in `src/utils/filters.ts`: all feature areas share the same `getFilters`/`setFilters` API. Changes to the merge logic in `getFilters` or `updateUrlWithFilters` affect every page using these utilities (assistants, skills, workflows, etc.).
- `setSearchParams` from React Router (used in `AnalyticsDashboard.tsx`) accepts either an object (full replacement) or a function `(prev) => next` (merge). The function form is the safe way to change one param without losing others.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` — unit tests for `AnalyticsPage`; mocks `useAnalyticsFilters` entirely (`vi.mock('../hooks/useAnalyticsFilters', ...)`). No URL/localStorage sync behavior is tested here.
- `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx` — tests for `AnalyticsFilters` component: race condition on user search, debounce behavior, AbortController, admin server-side search, project selection. No coverage of URL-to-localFilters sync or of `onFiltersChange` being called with URL-restored values.
- `src/utils/__tests__/filters.test.ts` — tests `getChangedKeys`, `getInitialAssistantFilters`, `checkEmptyFilters`, `createEmptyFilters`. Does NOT test `getFilters`, `setFilters`, `updateUrlWithFilters`, or `getFiltersFromUrl`.
- `src/pages/analytics/components/AnalyticsDashboard.tsx` — **no test file exists**.
- `src/pages/analytics/hooks/useAnalyticsFilters.ts` — **no test file exists**.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library. Two projects: `unit` (`.test.tsx`) and `integration` (`.integration.test.tsx`).
- Unit setup mocks `useSnapshot` and `@/utils/api`. Integration tests use real valtio and fetch.
- Common patterns: `vi.hoisted`, `vi.mock`, `vi.useFakeTimers`, `waitFor`, controlled-component test via `rerender`.
- Tests live in co-located `__tests__/` directories.

### Coverage Gaps

- `useAnalyticsFilters.ts` — no tests at all. The URL-priority logic, the localStorage fallback, and `handleFilterChange` are untested.
- `AnalyticsDashboard.tsx` — no tests at all. The `handleTabChange`/`setSearchParams` interaction is untested.
- `getFilters`, `setFilters`, `updateUrlWithFilters`, `getFiltersFromUrl` in `src/utils/filters.ts` — not covered by any existing test.
- The three reported symptoms each map to an untested code path.

---

## 5. Configuration and Environment

### Environment Variables

- `import.meta.env.BASE_URL` — used as `basename` in `createBrowserRouter`. No filter-specific env vars.

### Configuration Files

- No feature flags govern analytics filter sync behavior.
- `FILTER_ENTITY.ANALYTICS = 'analytics'` in `src/utils/filters.ts` — controls the localStorage key `filters_analytics` scoped by `userId`.

### Feature Flags and Deployment Concerns

- No feature flags are involved in the filter URL/localStorage sync path.
- `src/utils/filters.ts` is a shared utility used by assistants, skills, workflows, datasources, katas, user-settings, project-settings, CLI analytics, users-management, favorites, and projects pages. Any change to `getFilters` or `updateUrlWithFilters` is a cross-cutting change.

---

## 6. Risk Indicators

- **Cross-cutting utility risk**: `src/utils/filters.ts` (`getFilters`, `setFilters`, `updateUrlWithFilters`, `getFiltersFromUrl`) is consumed by at least 11 feature areas across `FILTER_ENTITY`. Changing merge logic in `getFilters` to implement "URL params fully overwrite localStorage" will affect every page that uses these utilities — a regression in any of them is possible.
- **Dual URL-write paths conflict**: `updateUrlWithFilters()` calls `replace()` from `useVueRouter` (imperative, bypasses React lifecycle); `AnalyticsDashboard.handleTabChange` calls `setSearchParams({ tab: tabId })` from React Router (object form, replaces all params). These two paths are not coordinated. Writing filter params via the imperative path and then switching tabs via `setSearchParams({tab})` wipes filter params.
- **No reactive URL subscription in `useAnalyticsFilters`**: The hook reads URL params once on mount via `window.location.search`. It has no `useEffect` or `useSearchParams` subscription to re-read URL params when the URL changes (e.g., when a shared link is opened, or when the user navigates back). The desired "URL params overwrite localStorage on page entry/return" behavior requires reactive URL reading.
- **Merge-not-replace in `getFilters`**: Current logic merges URL params with localStorage per-key. The desired behavior is: if ANY URL filter param is present, treat the URL as the sole source of truth and ignore localStorage entirely. This logic change must be scoped to the analytics entity or made configurable to avoid breaking other filter consumers that may expect merging.
- **`setSearchParams` object-form call in `AnalyticsDashboard` line 101**: Every tab change completely replaces the URL search params, wiping any filter params that were set. This requires either switching to the function form `(prev) => { prev.set('tab', tabId); return prev }` or routing the tab change through `updateUrlWithFilters`.
- **No tests for `useAnalyticsFilters`**: Implementing the new sync logic without a test harness creates regression risk. All three scenarios (shared-link entry, return from navigation, filter change) need unit tests.
- **`AnalyticsDashboard.tsx` is entirely untested**: The `handleTabChange` + `setSearchParams` interaction that causes filter-param loss has no test coverage.
- **`filters.ts` core functions are untested**: `getFilters`, `setFilters`, `updateUrlWithFilters`, `getFiltersFromUrl` lack tests; adding tests before changing logic is necessary to establish a baseline.

---

## 7. Summary for Complexity Assessment

The change touches three architectural layers: the shared utility layer (`src/utils/filters.ts`), the custom hook layer (`src/pages/analytics/hooks/useAnalyticsFilters.ts`), and the dashboard component layer (`src/pages/analytics/components/AnalyticsDashboard.tsx`). The file surface is small — three to four source files — but `src/utils/filters.ts` is a cross-cutting utility consumed by eleven feature areas, making any logic change there a broad regression risk. The two distinct URL-write mechanisms (imperative `replace()` via `useVueRouter` and React's `setSearchParams` hook) must be reconciled to prevent mutual clobbering.

The primary technical novelty is introducing reactive URL-to-state synchronization in `useAnalyticsFilters`. Currently the hook reads `window.location.search` exactly once at mount time. The desired behavior — "URL params fully overwrite localStorage on page entry, localStorage written back to URL when URL has no params" — requires either adopting `useSearchParams` reactively within the hook or adding a `useEffect` that re-derives state from the URL on location change. Neither pattern exists in the current hook; the closest comparable pattern is the CLI analytics `params.ts` module, which builds request params from the shared `AnalyticsQueryParams` type but performs no sync.

Test coverage for the affected code paths is absent. `useAnalyticsFilters.ts` has no test file, `AnalyticsDashboard.tsx` has no test file, and the core `getFilters`/`setFilters`/`updateUrlWithFilters`/`getFiltersFromUrl` functions in `filters.ts` have no tests. The three reported symptoms each correspond to an untested code path. The implementer should add tests for at minimum `useAnalyticsFilters` (URL-priority init, no-URL localStorage fallback + URL write-back, shared-link full-overwrite) and `updateUrlWithFilters` (tab param preservation) before shipping. Overall complexity is medium: the file count is low, but the cross-cutting nature of `filters.ts`, the dual URL-write conflict, and the zero test baseline for all relevant code paths elevate the risk.

---

## 8. External References

None named by the task.
