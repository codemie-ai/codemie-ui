# Technical Research

**Task**: filters projects analytics persistence
**Generated**: 2026-10-16
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16054 (Bug): Filters reset unexpectedly after navigating away and back
General purpose and value: Filters applied on CodeMie list and analytics screens should persist when the user navigates away and returns. Today they are cleared, so users must re-apply them and can read results under the wrong scope without noticing.
Preconditions: User is logged in to CodeMie UI; user has access to the Projects list screen and the Analytics screen; data exists on both screens so the filters have an effect.
Steps to Reproduce: 1. Open the Projects list screen (or the Analytics screen). 2. Open a filter and apply it. 3. Navigate away from the screen. 4. Return to the same screen.
Expected Result: The previously applied filter is still applied and visible after returning.
Actual Result: The filter is cleared/reset after returning.
Affected Areas: Projects list screen (filters); Analytics screen (filters); Frontend filter state handling.
Acceptance Criteria:
1. Filters applied on the Projects list screen are preserved after navigating away and returning.
2. Filters applied on the Analytics screen are preserved after navigating away and returning.
3. The filter control displays the applied value after returning to the screen.
4. The results shown match the preserved filter.
5. Clearing a filter still works and is not restored after returning.

---

## 2. Codebase Findings

### Existing Implementations
A URL + localStorage persistence mechanism **already exists** for both screens (added by EPMCDME-12703 for projects, reworked by EPMCDME-15058 for analytics). The bug is therefore in how/when it is written or read, not a missing feature.

- `src/utils/filters.ts` — shared persistence: `getFilters(entity, keys)` (URL params win over storage; returns `{}` when `userStore.user?.userId` is absent), `setFilters` (calls `updateUrlWithFilters` -> `replace()` from `useVueRouter`, then `storage.put(userId, "filters_<entity>")`), `clearFilters`, `FILTER_ENTITY` enum (`PROJECTS`, `ANALYTICS`, `CLI_ANALYTICS` — the last is declared but unused).
- `src/utils/storage.ts` — plain localStorage keyed `<userId>_<key>`. A byte-equivalent duplicate exists at `src/utils/storage/index.ts`; `./storage` imports resolve to the `.ts` file.
- **Projects list**: route `projects-management` `/settings/administration/projects` -> `ProjectsManagementPage.tsx`, which renders `ProjectsManagementFull` only when `useUserManagementEnabled()` is true (`ProjectsManagementDefault` has no list/filters).
  - `src/pages/settings/administration/projectsManagement/hooks/useProjectsFilters.ts` — `search`, `budget_assignment`, `budget_category`; initial state read via `useState(getInitialFilters)`; an effect writes via `setFilters(FILTER_ENTITY.PROJECTS, …)` on every change, skipping the first run with an `isMounted` ref.
  - `ProjectsManagementFull.tsx` — consumes the hook; `sort` is local `useState({})` (not persisted); pagination lives in global `projectsStore`; budget filter params are only sent when `useBudgetManagementEnabled()` is true (a false->true flag transition triggers a corrective refetch); search reload goes through `useDebouncedApply(search, 500, …)` (`src/hooks/useDebounceApply.ts`).
- **Analytics**: route `analytics` -> `src/pages/analytics/AnalyticsPage.tsx`.
  - `src/pages/analytics/hooks/useAnalyticsFilters.ts` — keys `time_period,start_date,end_date,users,projects`; lazy initializer resolves URL then storage; effect on `[user?.userId, searchStr]` re-resolves and writes back; `handleFilterChange` writes `DEFAULT_FILTERS` (`{}`) on reset.
  - `src/pages/analytics/components/AnalyticsFilters.tsx` — keeps `localFilters` mirrored from props; every change goes through `debounce(onFiltersChange, 2000, { leading: true, trailing: true })`, and **the debounce is `.cancel()`ed on unmount** (lines ~90-98). A second change made within 2 s of the previous one is only persisted by the trailing call, which is discarded if the user navigates away first. `handleClearFilters` cancels the debounce and writes immediately.
  - `src/pages/analytics/components/leaderboard/LeaderboardTab.tsx:60` — leaderboard filters are plain `useState(DEFAULT_FILTERS)`; no persistence. `InsightsTab`/`CLIInsightsTab` top-N selectors and `CliAnalyticsTab` `activeSection` are also local `useState`.
  - `AnalyticsPage` tab-validation effect calls `setSearchParams({ tab: insights }, { replace: true })`, which drops filter params from the URL (storage then repopulates them).
  - User-chip labels: `seedUserOptions` is fetched only when **both** `filters.users` and `filters.projects` are present on mount; otherwise selected users rely on the async options list.

### Architecture and Layers Affected
- Page/hook layer: `useProjectsFilters`, `useAnalyticsFilters`.
- Component layer: `AnalyticsFilters` (debounce), `ProjectsManagementFull`, possibly `LeaderboardTab`/`LeaderboardFilters`.
- Utils layer: `src/utils/filters.ts`, `src/utils/storage.ts`, `src/hooks/useVueRouter.tsx` (`replace` -> `getRouter().navigate`).

### Integration Points
- `userStore.user.userId` (namespace for storage; reads/writes no-op without it).
- `src/routerInstance.ts` (`getRouter`, introduced by the most recent commit 198bee735); `updateUrlWithFilters` swallows errors in try/catch.
- Inbound links that set analytics URL filters (URL wins and overwrites storage): `src/utils/getAnalyticsMemberLink.ts`, `ProjectOverviewSection.tsx:363`, `Navigation.tsx:164` (plain `/analytics`).
- Backend: `projectsStore.indexProjects(...)`, `userStore.getAnalyticsUsers(...)`.

### Patterns and Conventions
- Per-entity hook passing its own `FilterKeys` to `getFilters` (avoid polluting `knownFilterKeys`).
- Read in `useState` lazy initializer; write in effect; URL takes priority over localStorage.
- Other list pages use the same utils (`useTableFilters`, assistants/skills/workflows/katas filter hooks).

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists. `patterns/state-management.md` (§ Filtered / Search Store Pattern — Valtio store example, not what these pages use), `patterns/custom-hooks.md:49` lists `useTableFilters`. No guide documents `utils/filters.ts` URL/localStorage persistence. `testing/testing-patterns.md` governs tests.

### Architectural Decisions
- Inline comments in `useAnalyticsFilters.ts` record the decision to write only localStorage when the URL is already valid (prevents a param-reorder navigation loop).
- `AnalyticsFilters.handleClearFilters` comment records that clear bypasses the 2 s debounce because unmount would cancel it — i.e. the unmount-cancel hazard is known but handled only for clear.

### Derived Conventions
Commits referencing prior fixes: `0ea5b653e` (EPMCDME-12703 persist projects filters), `cd2327fc7` (EPMCDME-15058 analytics URL/localStorage sync).

---

## 4. Testing Landscape

### Existing Coverage
- `projectsManagement/hooks/__tests__/useProjectsFilters.test.ts` — restore/persist/clear; mocks `@/utils/filters` with an in-memory store.
- `projectsManagement/__tests__/ProjectsManagementFull.*.test.tsx` (search, initialLoad, pagination integration, etc.).
- `analytics/hooks/__tests__/useAnalyticsFilters.test.ts` — URL/storage resolution, sanitization, reset, late userId.
- `analytics/components/__tests__/AnalyticsFilters.test.tsx`, `AnalyticsDashboard*.test.tsx`, `analytics/__tests__/AnalyticsPage.test.tsx`, `leaderboard/__tests__/LeaderboardTab.test.tsx`.
- `src/utils/__tests__/filters.test.ts`.

### Testing Framework and Patterns
Vitest + React Testing Library, `unit` and `integration` projects (`vite.config.ts`). `vi.mock` of `@/utils/filters`, `renderHook`.

### Coverage Gaps
- No test unmounts and remounts a page (navigate away/back) and asserts restored control value + request params, for either screen.
- No test for a filter change followed by unmount within the 2 s debounce window in `AnalyticsFilters`.
- Leaderboard filter persistence: none exists, so none tested.

---

## 5. Configuration and Environment

### Environment Variables
None specific to filters.

### Configuration Files
None; storage keys are `<userId>_filters_projects` and `<userId>_filters_analytics` in localStorage.

### Feature Flags and Deployment Concerns
- `useUserManagementEnabled` gates the Projects list (Full vs Default view).
- `useBudgetManagementEnabled` gates budget filters and their query params.
- `feature:dashboardCustomization`, `aiChampionsLeaderboard`, `FEATURE_FLAGS.CLI_ANALYTICS` gate analytics tabs; an invalid tab triggers a URL replace.

---

## 6. Risk Indicators

- Root cause for the Projects screen was **not identified by static reading**: `useProjectsFilters` restores and persists correctly per its unit tests (which mock the persistence util). Browser reproduction is needed (check localStorage key `<userId>_filters_projects` and URL after returning).
- Concrete analytics defect candidate: `AnalyticsFilters.tsx` cancels its 2 s trailing debounce on unmount, losing any filter change made within 2 s of a previous one when the user navigates away.
- Leaderboard tab filters (`LeaderboardTab.tsx:60`) and top-N selectors are never persisted; whether the ticket's "Analytics screen filters" includes them is unconfirmed.
- AC3 risk: restored `users` may render without chip labels because `seedUserOptions` fetches only when both `users` and `projects` are set.
- `sort` on Projects is local state and resets; whether it counts as a "filter" is unclear.
- "Projects list screen" is ambiguous; the only projects list with filters found is `/settings/administration/projects` (visible only with user management enabled).
- Shared `src/utils/filters.ts` changes affect every list page (assistants, skills, workflows, katas, datasources, users management).
- Speculative: a fix may flush (not cancel) the debounce on unmount; that would write URL via `replace()` after the route changed, which can rewrite the new route's query — needs care.

---

## 7. Summary for Complexity Assessment

The change is confined to the frontend page/hook layer: `useProjectsFilters` + `ProjectsManagementFull` for Projects, and `useAnalyticsFilters` + `AnalyticsFilters` (plus possibly `LeaderboardTab`) for Analytics, backed by the shared `src/utils/filters.ts` URL/localStorage utilities. Persistence already exists for both screens, so this is a regression/defect fix rather than new functionality; expected touch surface is 2-4 source files plus tests.

Static reading found one concrete defect on Analytics: `AnalyticsFilters` debounces changes for 2 s (leading+trailing) and cancels the pending trailing write on unmount, so rapid successive changes are lost on navigation. Leaderboard filters are not persisted at all. For Projects, the hook appears correct and no root cause was found statically — reproduction is required, which is the main uncertainty.

Test posture is moderate: unit tests exist for both hooks and the components, but they mock the persistence util and none exercises an unmount/remount cycle or the debounce-cancel window. Risks: unknown Projects root cause, ambiguity over which analytics tabs are in scope, and blast radius if the shared util is modified.

---

## 8. External References

None named by the task.
