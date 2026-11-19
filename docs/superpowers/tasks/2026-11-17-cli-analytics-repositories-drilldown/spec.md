# CLI Analytics Repositories Drill-down - Spec (EPMCDME-17349)

FE only. The backend branch is implemented in another repository and released together with this change. Precedence: user decisions, then `fe-contract.md`, then the story. Base dir `B` = `src/pages/analytics/components/cli-analytics`.

## Goal

The Repositories tab lists projects only. Each level opens in a modal that loads only its own data: project modal (Summary + paged repositories), repository modal (Summary + paged branches), branch modal (Summary + Sessions, unchanged).

## Behavior

1. **Projects tab** (`B/views/RepositoriesView.tsx`): flat paged table, no carets, no expansion. `ProjectRow.repositories` is removed from the type (`types/cliAnalytics.ts:217`) and nothing reads it. Search matches project name only; placeholder becomes "Search projects..." and the description text no longer mentions repositories or branches. The `matchingRepositories` and forced-open-while-searching logic goes. (story AC1, AC8)
2. **Project modal**: opened by a project row, including the Unattributed one (`project_name` null). Summary from `buildRepoMetrics(row)` of the clicked row, no summary request. Body is a paged repositories list (10/page) from `/repositories` with exactly one project: `projects=<name>`, or `is_project_unattributed=true` for the null row. (story AC2, AC3)
3. **Repository modal**: opened by a named repository row. Summary from the clicked row. Body is a paged branches list (10/page) from the new `/branches`: `repository=<name>` plus the project scope of the parent. The Unattributed repository row (`repository` null) has no branch list: it opens the sessions modal directly (`is_unattributed` plus the project scope, as today).
4. **Branch modal**: the existing `ExtendedSessionsModal` with Sessions, unchanged. A named branch uses `branch` + `repositories` + project scope as today. The null-branch row sends `is_branch_unattributed=true` with the same `repositories` and project scope, and no `branch` (the backend returns 422 otherwise). (story AC6)
5. **Unattributed rows**: each list renders the backend's null-name row as the last row of the last page, as returned, clickable. Last page may show 11 rows. No client-side insertion or counting. Label is "Unattributed" at all three levels (see Decisions).
6. **Paging**: new hooks keep a zero-based page state and send it unchanged (0, 1, 2...), page size 10. `totalPages` = ceil(`total_count`/10), at least 1. The shared `Pagination` is already zero-based. Pagination is hidden when there is one page. The page resets when the scope (project, repository) or the tab filters change, via the render-time filter-key pattern the existing hooks use.
7. **States**: loading, error and empty are per list. The empty state shows when `rows` is empty and not loading, never keyed on `total_count`; a list holding only the Unattributed row is a normal list. A non-super-admin no-project request returns 200 with `rows: []` and shows the empty state. An error shows an error state in the list; the Summary and the modal stay. (story AC10)
8. **Stacking** (story AC9): each list view owns its page state and its selected-row state and renders the child modal as its own sibling. A list stays mounted while the modal above it is open, so closing the top modal leaves the lower one on the same page.

## Design

- **Types/store**: add `CliAnalyticsBranchesData` (rows shaped like `RepositoryBranchRow`, same pagination envelope). Add store fetches `fetchProjectRepositories` and `fetchBranches` through `fetchWithState`, each with its own key and slot (`projectRepositories`, `branches`). The project modal does not use the shared `repositories` slot, which `OverviewView` owns, so the two never abort each other. `useCliAnalyticsRepositories`, `fetchRepositories` and `RepositoriesTable` stay untouched.
- **Hooks** (`B/hooks/`): `useCliAnalyticsProjectRepositories(filters, scope)` and `useCliAnalyticsBranches(filters, repository, scope)`, with `scope = { projectName } | { isProjectUnattributed }`. Both build params from `buildCliAnalyticsParams` plus the scope. `useCliAnalyticsProjects` keeps its zero-based paging; only its comment and search semantics change.
- **Sessions**: `useCliAnalyticsSessions`, `SessionsView` and `ExtendedSessionsTarget` gain an optional `isBranchUnattributed`, sent as `is_branch_unattributed`. It is part of the page-reset filter key. Default false changes nothing for other callers.
- **Shared modal**: `ExtendedSessionsModal` (callers: RepositoriesView, OverviewView:205, UsersView:295) gains one optional prop, `body?: ReactNode`. When absent it renders `SessionsView` exactly as today, so OverviewView and UsersView are unaffected. When present it renders `body` in place of Sessions, under the same header and Summary.
- **New views** (`B/views/`): `ProjectRepositoriesList` (Table + Pagination of repositories, owns the repository modal) and `RepositoryBranchesList` (Table + Pagination of branches, owns the branch modal). Columns follow `RepositoriesTable`: name, Sessions, Files, Lines added/removed, Net.
- **Cleanup**: remove only what this change orphans (nested-repositories code in `RepositoriesView`, the `ProjectRow.repositories` field). `fetchProjectBranches` and `useCliAnalyticsProjectBranches` do not exist on this branch; nothing to remove.

## Acceptance criteria

- AC1: The tab lists projects only, paged, no expandable rows; it requests no repositories or branches. (story AC1)
- AC2: Clicking a project opens a modal with the Summary of the clicked row and a repositories list of 10 per page. (story AC2)
- AC3: Opening the project modal sends one `/repositories` request with a single project scope and `page=0`; a page change sends one request for that page; no summary request. (story AC3)
- AC4: Clicking a named repository opens a modal with its Summary and a branches list of 10 per page; the Unattributed repository row opens the sessions modal directly.
- AC5: Opening the repository modal sends one `/branches` request with `repository` and the project scope; a page change sends one request. (story AC5)
- AC6: Clicking a branch opens the existing Summary + Sessions modal, unchanged; the null-branch row sends `is_branch_unattributed=true` with `repositories` and the project scope, and no `branch`. (story AC6)
- AC7: Each list shows the null-name row as returned, labelled "Unattributed", clickable, opening the matching modal.
- AC8: The tab search filters by project name only; placeholder reads as a project search. (story AC8)
- AC9: Closing the top modal leaves the one below open on the same page. (story AC9)
- AC10: A failed repositories or branches request shows a list error state; the Summary stays, the modal stays open. (story AC10)
- AC11: A list with empty `rows` shows the empty state and no pagination; a list with only the Unattributed row is shown as a normal list.
- AC12: OverviewView and UsersView open `ExtendedSessionsModal` exactly as before, and Overview's repositories list is not affected by an open project modal.

## Non-goals

- NG1: Search or filters inside the repositories or branches lists. (story NG1)
- NG2: Changes to the branch modal's Summary and Sessions, or to other analytics tabs. (story NG2)
- NG3: Backend work. (story NG3)
- NG4: Client-side paging of branches. (story NG4)
- NG5: Finding a repository by name from the tab. (story NG5)
- NG6: Writing new tests (repo rule: only when the user asks).
- NG7: Changing `OverviewView`, `RepositoriesTable`, `useCliAnalyticsRepositories` or the unpaged/`include_branches` mode.

## Decisions

- A named repository opens a branches modal; only the Unattributed repository row skips it and opens sessions. — user
- A list with only the Unattributed row is shown as a normal list; the empty state keys on `rows` being empty, not `total_count`. — user
- The page index is sent zero-based as is, over a page-1 conversion in the new lists. — user
- The Unattributed row is the last row of the last page, outside the 10 rows, not in `total_count`, absent when search is set. — user
- The null-branch row uses `is_branch_unattributed` on `/sessions` with the same project and repository scope; the branch modal stays Summary + Sessions. — user
- Each modal's Summary comes from the clicked row, over a separate summary request. — user
- Tab search matches project name only; no search in the repositories or branches lists. — user
- The label for null rows is "Unattributed" at project, repository and branch level, over "(no project)". Reason: the story and contract call it that, and one name across the three lists is clearer. `NO_PROJECT_LABEL` stays for the code that still uses it outside this tab.
- `ExtendedSessionsModal` gets an optional `body` slot, over a new modal component or a mode enum. Reason: absent prop keeps the 3 callers byte-identical; Summary and header stay in one place.
- Project modal repositories use a new hook with its own store key, over reusing `useCliAnalyticsRepositories`. Reason: that hook is 1-based, has no project override or `is_project_unattributed`, and writes the `repositories` slot Overview owns (cleared on mount).
- Stacked modals keep state in the list view that owns them, with one store key per endpoint, over a shared modal-stack store. Reason: one project modal and one repository modal exist at a time, so one slot each is enough, and the list staying mounted keeps its page (AC9).
- Request order is not part of the contract, so the FE sends exactly one project in the scope, as the contract requires for `/repositories`.

## Open points for the user

- The roughly 28 accordion tests in `__tests__/RepositoriesView.test.tsx` (487 lines) become obsolete: they cover carets, branch rows, search auto-expand, `matchingRepositories`. Other fixtures reading `ProjectRow.repositories` (`useCliAnalyticsProjects.test.ts`, `store/__tests__/cliAnalytics.test.ts:286`) may need the field dropped. This spec does not require new tests. The user decides: (a) delete the obsolete accordion tests and keep the still-valid ones (paging, search forwarding, error, net-lines, success rate), recommended as the smallest change that keeps the suite green; (b) also ask for replacement tests of the new views.

## Assumptions (not verified in this repo)

- The `/projects`, `/repositories`, `/branches`, `/sessions` shapes and the 422 rules are taken from `fe-contract.md`, not from backend code.
- Non-super-admin behavior for no-project requests is as the contract states (200, empty rows).
