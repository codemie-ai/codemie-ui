# CLI Analytics Repositories Drill-down Implementation Plan (EPMCDME-17349)

**Goal:** The Repositories tab lists projects only; project, repository and branch levels each open a modal that loads only its own data.
**Spec:** `spec.md` (same dir). **Analysis:** `technical-analysis.md`. Base dir `B` = `src/pages/analytics/components/cli-analytics`.
Commit per task using the repository's existing convention (ticket key EPMCDME-17349). Every new file gets the Apache licence header. No new tests are written (repo rule: tests only on request); quality gates and browser verification belong to Stage 7, not to this plan.

## Cross-cutting rules (from arch review)
- Project scope type defined once: `ProjectScope = { projectName: string } | { isProjectUnattributed: true }`, in `types/cliAnalytics.ts`. The scope REPLACES `filters.projects` in `/repositories`, `/branches` and `/sessions` params (never added to it); with the unattributed scope `projects` is omitted.
- Sessions params are built in one place (the sessions hook): `branch` and `isBranchUnattributed` are never both sent; when `isBranchUnattributed` is set, `branch` is dropped.
- Each new hook has a comment that page state is zero-based and sent unchanged.
- Unattributed-row handling stays in the hooks; views read only `rows` and `totalPages`. No client-side insertion or counting.
- Store comment: a slot belongs to a consumer, not an endpoint (`projectRepositories` is the project modal's, `repositories` is Overview's).
- A list shows loading, never stale rows: the new store fetches reset their slot to null when a request starts, and hooks return `rows: []` while loading.

### Task 1: Types and store
**Files:** `src/types/cliAnalytics.ts`, `src/store/cliAnalytics.ts`, `src/constants/cliAnalytics.ts`
**Test-first:** no — repo rule: tests only on request
- Remove `ProjectRow.repositories` (`types/cliAnalytics.ts:217`). Add `CliAnalyticsBranchesData` (`rows: RepositoryBranchRow[]` plus the existing pagination type) and `ProjectScope`. Add optional `isBranchUnattributed?: boolean` to `ExtendedSessionsTarget` (l.336).
- Store: add slots `projectRepositories` and `branches` and fetches `fetchProjectRepositories` (GET `v1/analytics/cli-analytics/repositories`) and `fetchBranches` (GET `.../branches`) beside `fetchRepositories` (l.314) via `fetchWithState`, each with its own key; add `is_branch_unattributed` to the sessions params type. Reset the slot when a request starts. Add the slot-ownership comment.
- Keep `NO_PROJECT_LABEL` in `constants/cliAnalytics.ts:22` only if still used after Task 6; its only current users are in `RepositoriesView`, so remove it if Task 6 leaves it unreferenced.

### Task 2: Sessions flag
**Files:** `B/hooks/useCliAnalyticsSessions.ts`, `B/views/SessionsView.tsx`
**Test-first:** no — repo rule: tests only on request
Add `isBranchUnattributed` to the hook options (l.38-49) and send it as `is_branch_unattributed` (undefined when false), drop `branch` when set, and include it in `filterKey` (l.83-95). `SessionsView` accepts and forwards the prop.

### Task 3: New list hooks
**Files:** create `B/hooks/useCliAnalyticsProjectRepositories.ts`, `B/hooks/useCliAnalyticsBranches.ts`
**Test-first:** no — repo rule: tests only on request
Signatures `useCliAnalyticsProjectRepositories(filters, scope)` and `useCliAnalyticsBranches(filters, repository, scope)`. Model on `useCliAnalyticsProjects.ts` (zero-based page state sent as is, `per_page` 10, render-time `filterKey` reset covering filters, scope and repository, abort on cleanup). Params come from `buildCliAnalyticsParams` with `projects` replaced by the scope (`projects=<name>` or `is_project_unattributed=true`); `/branches` also sends `repository`. Return `rows` (empty while loading), `loading`, `error`, `page`, `setPage`, `totalPages` (ceil(total_count/10), at least 1), `perPage`.

### Task 4: Shared modal body slot
**Files:** `B/views/ExtendedSessionsModal.tsx`
**Test-first:** no — repo rule: tests only on request
Add optional `body?: ReactNode`; when present render it instead of `SessionsView` under the same header and Summary; when absent output is unchanged (OverviewView:205 and UsersView:295 unaffected). Pass `target.isBranchUnattributed` to `SessionsView`.

### Task 5: List views
**Files:** create `B/views/ProjectRepositoriesList.tsx`, `B/views/RepositoryBranchesList.tsx`; minimal optional-prop edit to `B/views/RepositoriesTable.tsx`
**Test-first:** no — repo rule: tests only on request
- `ProjectRepositoriesList({ filters, scope })` uses the project-repositories hook and renders `RepositoriesTable` (rows, loading, error, `page={page+1}`, `setPage={(p, pp) => setPage(p-1, pp)}` adapting its 1-based page, `totalPages`, `perPage`). Narrow edit to `RepositoriesTable`: optional `title`/`description` props defaulting to current text, so Overview is unchanged. It owns the selected repository and renders the child modal as its sibling: named repository opens `ExtendedSessionsModal` with `body={<RepositoryBranchesList .../>}` and `buildRepoMetrics(row)`; null repository opens `ExtendedSessionsModal` with `isUnattributed` plus the project scope and the default Sessions body. Use `clearSelectionRef` to clear selection on close.
- `RepositoryBranchesList({ filters, repository, scope })` is a `Table` + `Pagination` (0-based, 10/page, hidden at one page) of branch rows, columns as in `RepositoriesTable`, branch null shown as `UNATTRIBUTED_LABEL`, empty state keyed on `rows` empty and not loading, error shown via `AnalyticsWidget`. A clicked branch opens `ExtendedSessionsModal` (Sessions) with `repositories: [repository]`, project scope, and `branch` or `isBranchUnattributed` for the null row.

### Task 6: Flat projects table
**Files:** `B/views/RepositoriesView.tsx` (mounted unchanged at `CliAnalyticsTab.tsx:53`)
**Test-first:** no — repo rule: tests only on request
Rewrite to a flat paged table: remove `expanded`, `Caret`, `CountCells`, `isSearching`, `matchingRepositories`, `handleRepoClick`, `handleBranchClick`. Placeholder "Search projects...", description without repositories or branches, null project labelled `UNATTRIBUTED_LABEL`. Row click opens `ExtendedSessionsModal` with `buildRepoMetrics(row)` and `body={<ProjectRepositoriesList scope=... />}` (`{ projectName }` or `{ isProjectUnattributed: true }`). Keep paging, search debounce and error/empty behavior. Update the comment in `B/hooks/useCliAnalyticsProjects.ts` (no nested repositories).

### Task 7: Remove obsolete tests and fixture fields
**Files:** `B/__tests__/RepositoriesView.test.tsx`, `B/hooks/__tests__/useCliAnalyticsProjects.test.ts`, `src/store/__tests__/cliAnalytics.test.ts` (around l.286)
**Test-first:** no — removing obsolete tests
Delete the ~28 accordion tests in `RepositoriesView.test.tsx` (carets, branch rows, search auto-expand, `matchingRepositories`, project-unattributed target); keep paging, search forwarding, error, net-lines and success-rate tests, adjusting any assertion that depends on the old placeholder or "(no project)" label. Drop the `repositories` field from `ProjectRow` fixtures in the two other files so type-check passes. Write no new tests.

## Negative-constraint pass
- Spec/story: no summary request per modal -> Tasks 5, 6 (Summary via `buildRepoMetrics(row)`). No `repositories`/`branches` loading on the tab -> Task 6. No search in lists (NG1) -> Task 5 has none. No client-side paging or Unattributed insertion (NG4, Behavior 5) -> Task 3 hooks pass backend rows. No new tests (NG6) -> Task 7 only deletes. NG7: `useCliAnalyticsRepositories`, `fetchRepositories`, OverviewView untouched; the only `RepositoriesTable` change is an optional-prop default (arch review AR-3 narrowing). `branch` with `is_branch_unattributed` never sent -> Task 2. No backend work (NG3), no shared `repositories` slot reuse -> Task 1.
- Arch review notes: scope replaces filter projects (rule 1, Task 3); stale rows (Tasks 1, 3); single sessions params builder (Task 2); zero-based comment (Task 3); slot-ownership comment (Task 1); `NO_PROJECT_LABEL` (Tasks 1, 6).
