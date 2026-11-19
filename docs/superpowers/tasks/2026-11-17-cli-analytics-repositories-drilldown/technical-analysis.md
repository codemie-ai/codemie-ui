# Technical Research

**Task**: cli analytics ai attribution repositories projects branches modal pagination
**Generated**: 2026-11-17
**Research path**: filesystem (branch EPMCDME-17349_cli-analytics-repositories-drilldown; supersedes the analysis written on the 17301 branch)

---

## 1. Original Context

Implement story EPMCDME-17349 "CLI Analytics Repositories Drill-down" in the codemie-ui repo, on branch EPMCDME-17349_cli-analytics-repositories-drilldown, created from an up-to-date `main`. The story is at docs/superpowers/tasks/2026-11-17-cli-analytics-repositories-drilldown/story.md. Read it, and ALSO read the backend contract /Users/yevhen_slyva/codemie-dev/codemie/docs/superpowers/tasks/2026-11-17-cli-analytics-repositories-drilldown/fe-contract.md (it is authoritative where it differs from the story).

Story in short: the Repositories tab of AI Attribution / CLI Analytics lists projects only (paginated, no accordions, no repository/branch loading). Clicking a project opens a modal: same Summary (taken from the clicked row), but a paginated repositories list (10 per page) in place of Sessions. Clicking a repository opens a modal: same Summary, with a paginated branches list (10 per page) in place of Sessions. Clicking a branch opens the existing branch modal (Summary + Sessions). Each modal loads only its own data.

Decisions from the user that override or extend the story and the contract:
- A named repository opens its branches modal. Only the Unattributed repository row (repository null) has no branch list and goes straight to the sessions modal.
- A list that has only the Unattributed row (total_count 0) is shown as a normal list; empty state is keyed on rows being empty.
- The FE sends the page index straight to the backend as 0, 1, 2, 3 (zero-based); no page-1 conversion.
- Unattributed row is the last row of the last page, outside the 10 rows, per the contract.
- Backend work is in another repository; FE only here.

(Plus: earlier technical-analysis.md was from branch 17301 and is not trusted; research this branch; cover the new /branches endpoint, `is_branch_unattributed` on /sessions, `is_project_unattributed` on /repositories.)

---

## 2. Codebase Findings

Base dir `B` = `src/pages/analytics/components/cli-analytics`. React/TS, Vite, Valtio, Tailwind, vitest. `git status` shows no source changes on this branch yet; none of the 17301 symbols exist (`useCliAnalyticsProjectBranches`, `fetchProjectBranches` absent).

### Existing Implementations

**Purpose: list projects (Repositories tab)**
- `B/hooks/useCliAnalyticsProjects.ts` — paged hook; **page is 0-based** (`useState(0)`, sends `page` as is, `per_page` default 10, debounced search 350 ms, page reset on filter change via render-time filterKey). Returns `rows,loading,error,page,totalCount,totalPages,perPage,setPage,search,setSearch,appliedSearch`. Comment says "each with its repositories and branches nested". Consumer: `RepositoriesView` only. Test: `hooks/__tests__/useCliAnalyticsProjects.test.ts` (110 lines, 4 tests).
- `store/cliAnalytics.ts:329` `fetchProjects` -> `fetchWithState(..., 'projects', 'v1/analytics/cli-analytics/projects')`; slot `projects: CliAnalyticsProjectsData|null`. Generic `fetchWithState` (l.144) keys loading/error/abort/generation by string key; one slot per key, `queryParamArrayHandling: 'compact'`. Store test `store/__tests__/cliAnalytics.test.ts:286` covers fetchProjects.
- `types/cliAnalytics.ts:204` `ProjectRow` has `repositories: RepositoryRow[]` (l.217) plus `project_name: string|null, repository_count, session_count, turns, cost_usd, files_changed, lines_added/removed, net_lines, tool_calls, tool_calls_success, tool_success_rate`. `CliAnalyticsProjectsData.pagination` reuses the repositories pagination type `{page,per_page,total_count,has_more}`.
- `B/views/RepositoriesView.tsx` (345 lines) — accordion table: `expanded` Set, `Caret`, `CountCells`, `isSearching` forces all projects open, `handleProjectClick` (computes `matchingRepositories` from `project.repositories` when search term does not match by name), `handleRepoClick`, `handleBranchClick` (null repo -> unattributed target). Placeholder "Search projects or repositories...", description "Click a project, repository or branch…". Empty state text "No repository data available" when `projects.length===0 && !loading`. Pagination with `currentPage={page}` (0-based) and `alwaysShowPerPage`. Mounted at `CliAnalyticsTab.tsx:53` as `<RepositoriesView filters={filters} />` (no `repositories` prop passed).
- Only readers of `ProjectRow.repositories`: `RepositoriesView.tsx` (handleProjectClick, render) and its tests/hook test fixtures. `usageAttribution`/`PersonModal` `ProjectRow` are unrelated local types.

**Purpose: list repositories (paged, filterable by project)**
- `B/hooks/useCliAnalyticsRepositories.ts` — **page is 1-based internally** (`useState(1)`, sends `page-1`); params `(filters, repositories, includeBranches, initialPerPage)`; `initialPerPage===0` = fetch all without paging; `include_branches` flag; on mount/variant change calls `cliAnalyticsStore.clearRepositories()` because the single `repositories` store slot is shared; has search (debounced); `totalPages` from `total_count/perPage`. Only consumer: `OverviewView.tsx:82` `useCliAnalyticsRepositories(filters, repositories, false, 10)`. No remaining caller uses `includeBranches=true` or `fetchAll` in src (RepositoriesView uses projects hook). Takes `filters.projects` (comma-joined) as the project filter; it has no `is_project_unattributed` parameter and no per-call project override. Test `hooks/__tests__/useCliAnalyticsRepositories.test.ts` (322 lines).
- `store/cliAnalytics.ts:314` `fetchRepositories`, slot `repositories` (single, shared; `clearRepositories` l.325); key `'repositories'` so a modal list and Overview would abort each other if both mounted (modal opened from Overview is a different list — Overview's list stays mounted below).
- `types/cliAnalytics.ts:174` `RepositoryRow` (`repository: string|null`, metrics, `project_name?`, `branches?`), `RepositoryBranchRow` (l.160: `branch: string|null`, same metrics) — this is the shape the contract's `/branches` rows match. `CliAnalyticsRepositoriesData` has `rows`+`pagination`.
- `B/views/RepositoriesTable.tsx` (213 lines) — generic repositories `Table` with Pagination (props `page/totalPages/perPage/setPage/onRowClick/clearSelectionRef/search`), columns Repository/Sessions/Files/Lines added/removed/Net; Unattributed label for null repository; empty state when rows empty and not loading. Consumers: `OverviewView.tsx:194` only. Test `__tests__/RepositoriesTable.test.tsx` (178 lines).

**Purpose: show Summary + sessions modal**
- `B/views/ExtendedSessionsModal.tsx` (61 lines) — `Popup` (isFullWidth, `xl:max-w-[90vw]`, header=`target.title`, hideFooter), Summary widget of `MetricCard`s from `target.metrics`, then hardwired `<SessionsView filters repositories isUnattributed branch projectName isProjectUnattributed/>`. **Callers: `RepositoriesView`, `OverviewView.tsx:205`, `UsersView.tsx:295`** (the latter two with targets lacking projectName/branch). No prop to replace the Sessions section.
- `types/cliAnalytics.ts:336` `ExtendedSessionsTarget {title, metrics, sessionFilters, repositories?, isUnattributed?, branch?, projectName?, isProjectUnattributed?}` — shared by the three callers.
- `B/format.ts:161` `buildRepoMetrics(row)` builds the 5 Summary metrics from any row with session_count/cost_usd/files_changed/net_lines/tool_success_rate/tool_calls; usable on ProjectRow, RepositoryRow, RepositoryBranchRow.
- `B/views/SessionsView.tsx` (265 lines) — has its own search, framework select, Table, Pagination (`currentPage={page-1}`, hook is 1-based), embeds `SessionModal` for a clicked session (`useSessionModal`), closes it on page/search change. Its `AnalyticsWidget` title "Sessions". Also used standalone by other tabs (props `repositories,isUnattributed,branch,projectName,isProjectUnattributed`, see ExtendedSessionsModal). `useCliAnalyticsSessions.ts` (1-based state, sends `page-1`) sends `projects` (clicked `projectName` overrides filter; `isProjectUnattributed` drops projects and sends `is_project_unattributed`), `repositories`, `branch`, `is_unattributed`, `is_project_unattributed`. **No `is_branch_unattributed` anywhere in src.** Filter key for page reset lists framework/isUnattributed/isProjectUnattributed.
- `B/views/SessionModal.tsx` — single session detail popup (traceId), used by SessionsView, CostView, EfficiencyView; not part of this task's modal chain.

**Purpose: /branches (new endpoint)** — None found in `store/cliAnalytics.ts`, types or hooks (searched `branches`, `fetchBranches`, `/branches`). Store has no `branches` slot.

**Purpose: Unattributed labels** — `constants/cliAnalytics.ts:16` `UNATTRIBUTED_LABEL='Unattributed'`, `:22` `NO_PROJECT_LABEL='(no project)'`; used in RepositoriesView, RepositoriesTable, OverviewView. Today the project null row shows "(no project)"; contract/story AC7 calls the row "Unattributed" (naming decision for spec).

### Decisions Already in the Code
- Paging indices differ per hook: projects hook 0-based (state = wire value), repositories and sessions hooks 1-based state with `page-1` on the wire; shared `Pagination` component is 0-based (`currentPage`, `setPage(page, perPage)`; resets to `setPage(0, newPerPage)`; hidden when `totalPages<=1` unless `alwaysShowPerPage`). The user decision "send 0-based straight" matches the projects hook; the contract text says "hook state is 1-based: send page-1" and differs.
- One store slot + one abort key per endpoint (`projects`, `repositories`, `sessions`); a new request on a key aborts the previous. Drill-down modals stacked on one another (project modal list -> repository modal list -> branch modal sessions) would share the `repositories`/`sessions` keys with other mounted views (Overview's repositories list, none for sessions).
- Page reset on filter change uses a render-time `filterKey` comparison (all three hooks).
- Summary via `buildRepoMetrics(row)` from the clicked row (existing pattern in Overview/Repositories views).
- Modal stacking: SessionsView renders `SessionModal` nested inside the ExtendedSessionsModal tree; `closeModal` in views calls `clearSelectionRef` to clear table selection.
- `RepositoriesView` null-project convention: `projectName: project.project_name || undefined`, `isProjectUnattributed: !project_name`.

### Task Statements Checked Against the Code
- "Repositories tab lists projects only, no repo/branch loading": contradicted today; projects rows carry `repositories` (type l.217) and view renders them; the render reads `repo.branches`, but this branch has no branch loader.
- "Repositories … existing paged listing filtered by project" (D6): holds partially — `useCliAnalyticsRepositories` pages but has no project override or `is_project_unattributed`, and its `repositories` slot is shared with Overview.
- "`fetchProjectBranches`/`useCliAnalyticsProjectBranches` to be removed" (contract/D6): not present on this branch; nothing to remove.
- "branch modal unchanged" (AC6): holds — branch target exists via `branch` + `repositories` + `projectName`/`isProjectUnattributed`; the null-branch row would need the new flag, absent from `useCliAnalyticsSessions`.
- "RepositoriesView, ProjectRow … any other reader" (contract): only RepositoriesView and its tests read `repositories`.
- "Existing branch modal opens with Summary + Sessions": ExtendedSessionsModal is that modal. "Shared modal has other callers": holds (UsersView, OverviewView).
- Contract "FE hook state is 1-based": contradicted by the user decision; projects hook already 0-based.
- Contract fields on /repositories/branches/projects, `is_branch_unattributed` 422 rules: unverified here (backend repo), taken from the contract file.

### Consumers of Changed Contracts
- `ProjectRow.repositories` (removed by contract): `RepositoriesView.tsx` (handleProjectClick, row render), `RepositoriesView.test.tsx` fixtures, `useCliAnalyticsProjects.test.ts`, `store/__tests__/cliAnalytics.test.ts:286` fixtures (check).
- `/projects` `search` now name-only: `RepositoriesView` placeholder and the `matchingRepositories` logic assume repository-name matching.
- `ExtendedSessionsModal` / `ExtendedSessionsTarget` (if extended or split): `OverviewView`, `UsersView`, `RepositoriesView`, tests `ExtendedSessionsModal.test.tsx`, `OverviewView.test.tsx`, `UsersView.test.tsx`.
- `useCliAnalyticsRepositories` / `repositories` store slot (if reused for the project modal): `OverviewView` list; `OverviewView.test.tsx`, hook test.
- `/sessions` `is_branch_unattributed` additive: `useCliAnalyticsSessions` (+ test), `SessionsView`, `ExtendedSessionsModal`.

### Architecture and Layers Affected
Types (`types/cliAnalytics.ts`) -> store (`store/cliAnalytics.ts`, `fetchWithState`) -> hooks (`B/hooks/`) -> views (`B/views/`) -> shared modal (`ExtendedSessionsModal`) -> tab (`CliAnalyticsTab.tsx` unchanged mount).

### Integration Points
REST `GET v1/analytics/cli-analytics/{projects,repositories,branches(new),sessions}` via `api.get` with `skipErrorHandling`. Shared filters from `buildCliAnalyticsParams` (`hooks/params.ts`: time_period, start/end, users, projects, repositories, branch — no project-unattributed or branch-unattributed flags). `Pagination`, `Table`, `Popup`, `AnalyticsWidget`, `MetricCard` shared components.

### Patterns and Conventions
Hook per endpoint wraps store fetch, `useSnapshot`, abort on cleanup, debounced search; store keyed slots with loading/error maps; views build `ExtendedSessionsTarget` with `buildRepoMetrics`; Apache licence header on every file; tests in sibling `__tests__/`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (components, patterns/state-management, testing, development/api-integration, architecture); not individually read beyond the AGENTS.md routing. Tests only to be written when the user asks (AGENTS.md rule).

### Architectural Decisions
Story D1-D9 and the backend `fe-contract.md` (Section 8). No ADR found for CLI analytics.

### Derived Conventions
Per code: comments explain "why"; one hook per list; Pagination 0-based; slot per endpoint.

---

## 4. Testing Landscape

### Existing Coverage
- `__tests__/RepositoriesView.test.tsx` (487 lines, ~28 tests): nearly all accordion behaviour (expand carets, branch rows, search auto-expand, `matchingRepositories`, project-unattributed target); tests on server paging, search forwarding, error, net-lines rendering, tool-success rate are reusable in spirit.
- `__tests__/ExtendedSessionsModal.test.tsx` (134 lines, 6 tests): header, metrics, passes filters/repositories to a mocked SessionsView, onHide, hidden, summary.
- `__tests__/RepositoriesTable.test.tsx` (178 lines): table rows, pagination, empty, row click, clearSelectionRef, Unattributed label, line counts.
- Hooks: `useCliAnalyticsProjects.test.ts`, `useCliAnalyticsRepositories.test.ts`, `useCliAnalyticsSessions.test.ts`; store `cliAnalytics.test.ts` (fetchProjects at l.286).

### Testing Framework and Patterns
vitest + Testing Library; modules mocked with `vi.mock` (hooks, SessionsView); store tests mock `api.get`.

### Coverage Gaps
No tests for `/branches`, `is_branch_unattributed`, project-scoped repositories hook, drill-down modal chain or stacked-modal close behaviour (AC9).

---

## 5. Configuration and Environment

### Environment Variables
None relevant found.

### Configuration Files
None governing this area; `.codemie/codemie-cli.config.json` is modified in the working tree (tooling, unrelated).

### Feature Flags and Deployment Concerns
None in this area. Contract says FE and backend release together (breaking `/projects`).

---

## 6. Risk Indicators

- Speculative: `ExtendedSessionsModal` hardcodes `SessionsView`; replacing the Sessions section for project/repository levels touches a modal with 3 callers and tests.
- Speculative: `useCliAnalyticsRepositories` has no project-scope override or `is_project_unattributed`, is 1-based, and writes a store slot/abort key shared with Overview (`clearRepositories` on mount) — reuse for the project modal is entangled with Overview's list.
- Speculative: stacked modals each need their own store slot/abort key (`repositories`, a new `branches`), and AC9 (lower modal keeps its page) depends on each list's page state surviving while a modal opens above it.
- Paging-index inconsistency across hooks (0-based vs 1-based) against the user's "send 0-based straight" decision; the contract text says 1-based hook state.
- Empty-state must key on `rows` empty, not `total_count`; Unattributed row makes the last page 11 rows and `totalPages` derives from `total_count` (0 with only the Unattributed row gives 1 page; page-beyond-last returns no rows).
- Unattributed naming: project null row today "(no project)" vs "Unattributed" in story.
- `is_branch_unattributed` requires `repositories` and is invalid with `branch` (422); `useCliAnalyticsSessions` has no such flag and `branch` param is sent today.
- `/branches` takes `repository` as a query param (names may contain `/`) and `projects` or `is_project_unattributed`; no existing request builder for these.
- `RepositoriesView.test.tsx` (~28 tests) largely invalidated; roughly 620 lines of accordion tests need rewriting.
- Existing mechanism kept in place: `useCliAnalyticsRepositories` single shared slot (Section 2, Consumers).
- Backend contract not verifiable from this repo (unverified, Section 8).

---

## 7. Summary for Complexity Assessment

Layers: types, one store (new `branches` fetch/slot plus `is_branch_unattributed` pass-through), hooks (project-scoped repositories list, new branches list, sessions flag), views (`RepositoriesView` rewritten to a flat table; two new list-in-modal views), and the shared `ExtendedSessionsModal` that has three callers. Existing surface: about 6-8 files edited (`RepositoriesView`, `ExtendedSessionsModal`, `types/cliAnalytics.ts`, `store/cliAnalytics.ts`, `useCliAnalyticsProjects`, `useCliAnalyticsSessions`, possibly `useCliAnalyticsRepositories`, `params.ts`) and new files for the branches hook and list views.

Novelty: paged lists inside modals and a three-deep modal stack are new in this tab; paging, Summary-from-row, Popup, Pagination, and the fetchWithState pattern all exist. The paging index convention is mixed across hooks, and the shared `repositories` slot/abort key is the main reuse hazard.

Tests: all three named view suites exist; `RepositoriesView.test.tsx` needs a near-total rewrite; nothing covers the new endpoints or modals. The backend contract is only available as a document.

---

## 8. External References

- `/Users/yevhen_slyva/codemie-dev/codemie/docs/superpowers/tasks/2026-11-17-cli-analytics-repositories-drilldown/fe-contract.md` — resolved. Facts: envelope `{page, per_page, total_count, has_more}`, `page` zero-based, size 10. `/projects`: rows without `repositories`, `search` matches project name only, rows keep `project_name, repository_count, session_count, turns, cost_usd, files_changed, lines_*, net_lines, tool_calls, tool_calls_success, tool_success_rate`. `/repositories` project modal: `projects=<name>&page&per_page` or `is_project_unattributed=true&page&per_page` (super-admin only; non-super-admin gets `rows: []`, total 0, HTTP 200); send exactly one project; order sessions desc, cost desc, name; rows unchanged shape; unpaged mode stays. `/branches` (new): `repository=<name>` required (may contain `/`), `projects=<name>` or `is_project_unattributed=true`, `page`, `per_page`; rows `{branch|null, session_count, turns, cost_usd, files_changed, lines_added, lines_removed, net_lines, tool_calls, tool_calls_success, tool_success_rate}`; Unattributed repository row (`repository: null`) has no branch list. `/sessions`: `is_branch_unattributed=true` only sessions without a branch, ANDs with `projects`, `is_project_unattributed`, `repositories`; requires `repositories`, invalid with `branch` (both 422). Unattributed row: null name, not in `total_count`/`has_more`, last row of last page (up to 11 rows), absent when `search` set or none exist; only-Unattributed list has `total_count` 0, `has_more` false, rows with that one row; empty state keyed on `rows` empty. Release FE and backend together.
- Story `docs/superpowers/tasks/2026-11-17-cli-analytics-repositories-drilldown/story.md` — resolved; AC1-AC11, D1-D9 as quoted by the caller; contract wins where it differs (it says 1-based hook state; the user overrides to 0-based on the wire).
