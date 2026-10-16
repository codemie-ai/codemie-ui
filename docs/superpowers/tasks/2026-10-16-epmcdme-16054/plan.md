# EPMCDME-16054 Filter Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filters on Analytics (filter bar + Leaderboard) and Projects sort survive navigate-away-and-back; cleared values stay cleared.

**Architecture:** Reuse the existing URL + localStorage mechanism in `src/utils/filters.ts`. Writes that must not touch the URL (unmount flush, Leaderboard) go straight to `storage.put(userId, getFilterStorageKey(entity), value)` — the precedent is `useAnalyticsFilters.ts:125`. The only change to `filters.ts` is one new enum value.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library (`unit` / `integration` projects). Read `.ai-run/guides/testing/testing-patterns.md` before you write tests.

Commit per task using the repository's existing convention.

**Out of plan (owned by the pipeline):** the Projects search/budget browser reproduction, and any fix that comes out of it.

---

### Task 1: Flush a pending Analytics filter change to storage on unmount

**Files:** Modify `src/pages/analytics/components/AnalyticsFilters.tsx:78-103`. Test `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx`.

Test-first: yes — with fake timers, make two filter changes less than 2 s apart and then unmount. Assert that `localStorage['<userId>_filters_analytics']` holds the second value and that the router's `navigate`/`replace` was not called after unmount. The test fails today because `.cancel()` drops the trailing call.

- [ ] Write the failing test, then run `npx vitest run --project unit src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx`. Expect FAIL.
- [ ] Add a `pendingFiltersRef`. `updateFilters` sets it, the debounced callback clears it after it calls `onFiltersChangeRef.current`, and `handleClearFilters` clears it. In the unmount cleanup (lines 94-98), when the ref is set: call `cancel()`, then `storage.put(currentUserRef.current?.userId, getFilterStorageKey(FILTER_ENTITY.ANALYTICS), cleanObject(pending))`. Store a reset to empty as `{}`, to match `handleFilterChange` in `useAnalyticsFilters.ts:149-163`. Skip the write when `userId` is missing. Never call `setFilters`/`updateUrlWithFilters` here.
- [ ] Re-run the test and expect PASS. Add a second case: a single (leading) change followed by unmount writes nothing extra.

### Task 2: Analytics page restore — user labels and remount regression

**Files:** Modify `src/pages/analytics/AnalyticsPage.tsx:84-95`. Test `src/pages/analytics/__tests__/AnalyticsPage.test.tsx`.

Test-first: yes — seed localStorage `<userId>_filters_analytics` with `{ users: ['u1'] }` and no `projects`, then mount. Assert that `userStore.getAnalyticsUsers` is called and the chip shows the user's label. This fails today because the seed effect requires `projects`.

- [ ] Write the failing test and run it. Expect FAIL.
- [ ] Remove the `!filters.projects?.length` guard. Call `getAnalyticsUsers(filters.projects?.length ? { projects: filters.projects } : {})`.
- [ ] Add remount cases: (a) set the time period and a project, unmount, remount → the control shows the values and the dashboard request params contain them; (b) clear the filters, unmount, remount → the defaults show and the request has no cleared params. Run them and expect PASS.

### Task 3: Persist Leaderboard filters (storage only)

**Files:** Modify `src/utils/filters.ts:32` (enum) and `src/pages/analytics/components/leaderboard/LeaderboardTab.tsx:47-60`. Create `src/pages/analytics/hooks/useLeaderboardFilters.ts`. Test `src/pages/analytics/hooks/__tests__/useLeaderboardFilters.test.ts` and `src/pages/analytics/components/leaderboard/__tests__/LeaderboardTab.test.tsx`.

Test-first: yes — in LeaderboardTab, set tier, search and a sort, then unmount and remount. Assert that the controls show the values and the entries request carries `tier`/`search`/`sort_by`/`sort_order`. This fails today because the state is plain `useState(DEFAULT_FILTERS)`.

- [ ] Write the failing tests and run them. Expect FAIL.
- [ ] Add `ANALYTICS_LEADERBOARD = 'analytics_leaderboard'` to `FILTER_ENTITY`. Make no other change to `filters.ts`.
- [ ] Create the hook:

```ts
const PERSISTED_KEYS = ['tier', 'project', 'search', 'intent', 'cli_only', 'sort_by', 'sort_order'] as const

export const useLeaderboardFilters = (defaults: LeaderboardEntriesParams) => {
  const userId = useSnapshot(userStore).user?.userId
  const [filters, setFilters] = useState<LeaderboardEntriesParams>(() => {
    const stored = userId
      ? storage.getObject<LeaderboardEntriesParams>(userId, getFilterStorageKey(FILTER_ENTITY.ANALYTICS_LEADERBOARD))
      : null
    return stored ? { ...pick(stored, PERSISTED_KEYS) } : defaults
  })
  useEffect(() => {
    if (userId)
      storage.put(userId, getFilterStorageKey(FILTER_ENTITY.ANALYTICS_LEADERBOARD), pick(filters, PERSISTED_KEYS))
  }, [userId, filters])
  return [filters, setFilters] as const
}
```

  If a stored object exists, use it as-is and do not merge `defaults` into it. A sort cleared by `handleSort` (lines 121-130) then stays cleared. Only `null` falls back to `total_score`/`desc`. Do not persist `view`, `season_key`, `snapshot_id`, `page` or `per_page`.
- [ ] At `LeaderboardTab.tsx:60`, replace the `useState` with `useLeaderboardFilters(DEFAULT_FILTERS)`. Add test cases: clearing a filter or resetting the sort stays cleared after remount, and `window.location.search` is unchanged by any Leaderboard change. Run them and expect PASS.

### Task 4: Persist Projects sort, plus a Projects remount regression

**Files:** Modify `src/pages/settings/administration/projectsManagement/hooks/useProjectsFilters.ts:25-98` and `ProjectsManagementFull.tsx:193-194`. Test `hooks/__tests__/useProjectsFilters.test.ts` and create `__tests__/ProjectsManagementFull.persistence.test.tsx`.

Test-first: yes — mount `ProjectsManagementFull` with the real `@/utils/filters` and a `userStore` user, sort by a column, then unmount and remount. Assert that the column shows the sort indicator and `projectsStore.indexProjects` is called with that sort key and order. This fails today because the sort is local `useState({})`.

- [ ] Write the failing persistence test. It also covers search plus budget assignment/category restore and the cleared state after remount; those cases are expected to pass already and act as the regression guard. Run them and expect the sort cases to FAIL.
- [ ] In the hook, add `'sort_by', 'sort_order'` to `PROJECT_FILTER_KEYS.simple` and `sort_by?`/`sort_order?` to `StoredProjectFilters`. Parse the initial `sort: SortState` (`sortOrder` must be `'asc' | 'desc'`, otherwise `{}`). Add `sort` to the write effect, writing keys only when `sortKey` is set, and return `sort` and `setSort`.
- [ ] In `ProjectsManagementFull.tsx:194`, take `sort`/`setSort` from the hook instead of `useState`. Check that the clear-sort-on-search-change effect (around line 369) does not run on the initial mount and wipe the restored sort. Guard it the same way the hook's `isMounted` ref does if needed. Add a hook unit case: resetting the sort to none removes the keys from the stored object.
- [ ] Run both test files and expect PASS.

---

**Negative-constraint pass (spec Non-goals and "must not"):**
- Unmount write must not touch the URL → Task 1 uses `storage.put` only, and its test asserts no navigation.
- Leaderboard not in URL → Task 3 uses storage only, and its test asserts `location.search` is unchanged.
- No persistence for top-N, CLI section toggle, or Leaderboard view/season → Task 3's allow-list excludes them, and no task touches `InsightsTab`/`CLIInsightsTab`/`CliAnalyticsTab`.
- No change to other list pages; `filters.ts` change is additive → Task 3 adds only the enum value.
- No change to URL-over-storage priority, key format or TTL → no task changes `getFilters`/`setFilters`/`storage`.
- No guessed Projects filter fix → Task 4 covers sort plus regression tests only; the reproduction stays with the pipeline.
- `ProjectsManagementDefault` unchanged → no task touches it.
