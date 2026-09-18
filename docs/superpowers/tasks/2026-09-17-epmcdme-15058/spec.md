# Analytics Filter URL–localStorage Sync Fix (EPMCDME-15058)

## Problem

The Analytics page (`/analytics`) persists filter state in two places: URL query parameters (for
sharing) and localStorage (for session restore). Four root-cause bugs break synchronisation:

1. **`AnalyticsDashboard.tsx:101`** calls `setSearchParams({ tab: tabId })` with an object literal,
   which replaces all search params wholesale. Any filter params written by `updateUrlWithFilters`
   moments earlier are wiped on every tab change — the proximate cause of symptom 1.
2. **`useAnalyticsFilters.ts`** reads `window.location.search` exactly once at mount with no
   reactive subscription. On back-navigation the hook never re-derives state from the URL, leaving
   stale React state — the cause of symptom 2.
3. **`getFilters()` in `filters.ts`** merges URL params with localStorage per-key (URL wins per
   field, absent URL keys fall back to localStorage). A shared link that specifies only
   `time_period` silently retains the user's `projects` and `users` from localStorage instead of
   showing only the link's filter set — the cause of symptom 3.
4. **`getFilters()` returns `{}` when `userStore.user?.userId` is falsy**
   (`filters.ts:88-89`). The hook's `useState` initializer (`useAnalyticsFilters.ts:35`) runs
   exactly once; if the user store has not hydrated by first render, filters stay permanently empty
   and no code re-runs to recover them. Switching to a reactive URL subscription (Fix 2) alone does
   not address this because `userId` is not part of the URL.

## Approach

Four independent fixes, applied in the order that reduces risk:

### Fix 1 — Stop tab changes from clobbering filter params (`AnalyticsDashboard.tsx`)

Replace the object-form `setSearchParams({ tab: tabId })` call with the function form so only the
`tab` param is mutated and all other params are preserved:

```ts
// before (line 101)
setSearchParams({ tab: tabId });

// after
setSearchParams(prev => { prev.set('tab', tabId); return prev; });
```

This is a single-line change with no cross-cutting risk.

### Fix 2 — Reactive URL subscription, correct initialisation priority, and userId hydration (`useAnalyticsFilters.ts`)

Replace the one-time `window.location.search` read with React Router's `useSearchParams` so the
hook re-evaluates on every URL change. The decision tree on mount and on URL change:

- If `searchParams` contains **any** key from `AnalyticsQueryParams`'s known set
  (`time_period`, `start_date`, `end_date`, `users`, `projects`): treat URL as the sole source of
  truth, write URL-derived values to localStorage, and set React state from URL. Do not read
  localStorage at all.
- If `searchParams` contains **no** known filter key: read localStorage; if it has values, set React
  state from localStorage and write those values back to URL (address bar stays in sync); if
  localStorage is also empty, apply `DEFAULT_FILTERS` and write them to URL.

**userId hydration guard.** Because `getFilters()` returns `{}` when `userId` is falsy, the hook
must also subscribe to `userId` from the user store. The filter derivation logic above must re-run
whenever `userId` transitions from falsy to truthy after mount. The simplest implementation is a
`useEffect` with `[searchParams, userId]` as dependencies that runs the decision tree above each
time either changes.

On `handleFilterChange`: call `setFilters(entityKey, newFilters)` (which writes URL + localStorage
via the existing shared utility), then update React state.

**Stability note.** Because `updateUrlWithFilters` calls `useVueRouter.replace()` (imperative
navigation), `useSearchParams` will fire again after every filter write. The hook must compare the
URL-derived values against current React state before setting state, updating state only when
values differ — this prevents an update loop.

**Validation.** Unknown or malformed URL keys are silently ignored during the "any known key"
presence check and during value parsing. The page must not throw.

### Fix 3 — Scope "URL fully overwrites localStorage" logic to the analytics hook (`filters.ts` — no change)

The per-key merge behaviour of `getFilters()` must not change — 11+ feature areas depend on it.
The overwrite rule ("any URL filter param present → full overwrite of localStorage") is implemented
entirely inside `useAnalyticsFilters.ts`. The hook reads URL params and localStorage separately
(via `getFiltersFromUrl` and storage utilities already available), applies the rule itself, and
calls `setFilters` only to persist the resolved state forward.

### Fix 4 — Reset/clear writes DEFAULT_FILTERS, not an empty state (`useAnalyticsFilters.ts`)

The Analytics page always requires a time period; a truly empty filter set is not a valid state.
When the user resets or clears filters, the hook calls `setFilters(entityKey, DEFAULT_FILTERS)`,
which writes `DEFAULT_FILTERS` to both URL and localStorage. There is no separate "clear to empty"
path. Ticket AC 5 ("removes query params and clears localStorage") was worded for generic list
pages; for Analytics it is adjusted: reset writes `DEFAULT_FILTERS` to URL and localStorage so the
page always renders with a valid time period.

## Clarifications Recorded

**Tab param in shared links.** The `tab` param is already preserved by `updateUrlWithFilters`
(`filters.ts:190-195`), which reads the current `tab` value and re-includes it when building the
new `URLSearchParams`. A shared link therefore already carries the sender's active tab. No
additional work is needed; the non-goal below records that tab sync is not part of this fix.

**Single localStorage key for Analytics.** `FILTER_ENTITY.CLI_ANALYTICS` (`'local_analytics'`) is
declared in `filters.ts` but has zero consumers anywhere in the codebase. Analytics uses a single
key — `FILTER_ENTITY.ANALYTICS` (`'analytics'`) — for all filter controls on the page. This is
what makes acceptance criterion 7 (consistent behaviour across every filter control) achievable
without per-control keys.

**Pagination and sorting.** Pagination state and sort order are not written to the filter
localStorage key or to URL query params by this mechanism. They are not affected by this change.

## Files Affected

| File | Change |
|---|---|
| `src/pages/analytics/components/AnalyticsDashboard.tsx` | Replace object-form `setSearchParams` with function form at line 101 |
| `src/pages/analytics/hooks/useAnalyticsFilters.ts` | Replace one-time read with reactive `useSearchParams`; subscribe to `userId`; implement URL-priority decision tree with userId guard; add known-key validation; enforce DEFAULT_FILTERS on reset |
| `src/utils/filters.ts` | No logic changes; `getFiltersFromUrl` and `setFilters` called as-is |
| `src/pages/analytics/AnalyticsPage.tsx` | No changes expected |
| `src/pages/analytics/components/AnalyticsFilters.tsx` | No changes expected |

## Test Coverage Required

All symptom code paths are currently untested. Tests must be added before the fix ships:

**`src/pages/analytics/hooks/__tests__/useAnalyticsFilters.test.ts`** (new file):
- URL params present → state derived from URL only; localStorage overwritten; no merge with prior storage
- URL params absent, localStorage has values → state from localStorage; URL updated to match
- URL params absent, localStorage empty → `DEFAULT_FILTERS` applied; URL and localStorage updated
- Filter change via `handleFilterChange` → URL and localStorage both updated
- Unknown/malformed URL param keys → silently ignored, no crash, known keys still parsed
- Filter reset/clear → URL and localStorage both reflect `DEFAULT_FILTERS` (not empty)
- User store hydrates after mount → filters are still restored correctly

**`src/pages/analytics/components/__tests__/AnalyticsDashboard.test.tsx`** (new file):
- Tab change via `handleTabChange` preserves existing filter query params in URL

**`src/utils/__tests__/filters.test.ts`** (additions to existing file):
- `updateUrlWithFilters` preserves the current `tab` param when writing filter params
- `getFiltersFromUrl` returns only the keys it was asked for; unknown keys not returned

## Acceptance Criteria

1. Selecting a filter writes both URL and localStorage; the value stays in the address bar without
   disappearing.
2. Navigating away then returning restores filters consistently in UI, URL params, and localStorage.
3. Opening a shared link shows only the link's filter set; locally saved state is not merged in.
4. After opening a link with filters, reopening the page without query params shows those same
   values (localStorage was updated from URL on link open).
5. Resetting filters writes `DEFAULT_FILTERS` to URL and localStorage; no filter control is left
   in an empty or invalid state. (Analytics always requires a time period.)
6. Invalid/unknown query params are silently ignored; the page does not crash.
7. All filter controls on the Analytics page behave consistently under the above rules (a single
   localStorage key, `FILTER_ENTITY.ANALYTICS`, covers the whole page).
8. Empty URL with no query params applies localStorage filters and reflects them in the URL.
9. If the user store hydrates after the first render, filters are still correctly restored from URL
   or localStorage.

## Non-Goals

- Changing the merge behaviour of `getFilters()` in `src/utils/filters.ts` for any consumer other
  than analytics.
- Modifying filter persistence behaviour on any page other than `/analytics`.
- Adding URL filter sync to pages that currently use only localStorage.
- Changing the 2000 ms debounce timing in `AnalyticsFilters.tsx`.
- Migrating `updateUrlWithFilters` away from the imperative `useVueRouter.replace()` path.
- Any UI/UX or visual changes beyond restoring correct filter values.
- Performance optimisation of the filter read/write path.
- Adding filter sync to the tab param (the tab is already preserved by `updateUrlWithFilters`; no
  additional work is needed).
- Persisting pagination state or sort order via this mechanism.
- Introducing or consuming `FILTER_ENTITY.CLI_ANALYTICS`; it has zero consumers and is out of scope.
