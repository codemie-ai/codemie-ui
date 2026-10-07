# CLI Analytics Repositories Grouped By Project (EPMCDME-15446) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** `/repositories` returns flat rows bucketed by (project, repository, branch) with null projects kept; `/sessions` can filter null-project sessions and the UI modal passes the clicked project group.

**Architecture:** Add `project_name` to the handler bucket key (drop most-frequent label). Add a `project_unattributed` flag on `LocalAnalyticsFilter` (no port signature change), applied in `_sessions_cte`, exposed as query param `is_project_unattributed` (existing `is_unattributed` already means repository IS NULL, so it cannot be reused). UI forwards the group's project.

**Tech Stack:** FastAPI, asyncpg reader, pytest; React/TS, vitest.

**Spec:** requirements inline; research in `technical-analysis.md` (same dir).

Commit per task using the repository's existing convention. Do not stage `config/customer/customer-config.yaml` or `src/codemie/configs/customer_config.py`.

## Acceptance criteria

- `/repositories?include_branches=true` returns one flat row per (project_name, repository, branch); a repo used under 2 projects yields 2 rows; sessions without project yield rows with `project_name: null`.
- Row schema (`LocalAnalyticsRepositoryRow`) and UI `aggregateRepos` keep working unchanged.
- `/sessions?is_project_unattributed=true` returns only sessions with no project (super admin only; project admins get an empty result).
- Clicking a branch/repo under a project group, including "(no project)", lists only that group's sessions.

## Global Constraints

- Null project is never collapsed or hidden; wire field stays `project_name: str | null`.
- Non-branch mode keeps `(project, repository)` buckets and pagination over them.

## Review Focus

- Repo in several projects: separate rows, summed metrics equal the old single row.
- Null project plus named projects for the same repo: distinct rows.
- Project admin with `is_project_unattributed=true`: nothing leaks (deny_all).
- `is_project_unattributed` combined with `projects` filter: flag wins, no contradictory empty set.

### Task 1: Bucket repositories by project (handler)

**Files:**
- Modify: `src/codemie/service/analytics/handlers/cli_analytics_handler.py:439-486` (`get_repositories`)
- Test: `tests/codemie/service/analytics/handlers/test_cli_analytics_handler_ordering.py` (supersede most-frequent-project test ~L137), `test_cli_analytics_handler.py`

- [ ] Test-first: yes — a repo with sessions under projects A, B and null yields three rows with `project_name` A, B, None and per-row session counts; non-branch mode keys `(project, repository)`.
- [ ] Change the bucket key to `(project, repository, branch)` / `(project, repository)` where `project = _s(row.get("project_name")) or None`; set `project_name` from the key; delete the `_projects` counter, the `_most_frequent` use in this method and the D3 comment (remove `_most_frequent` if unused elsewhere). Tie-break sort at L486 gains `r["project_name"] or ""`.

### Task 2: Null-project filter in sessions (filter, reader, router)

**Files:**
- Modify: `src/codemie/repository/cli_analytics/filters.py` (`LocalAnalyticsFilter`: add `project_unattributed: bool = False`)
- Modify: `src/codemie/repository/cli_analytics/postgres/reader.py:166-167` (`_sessions_cte`)
- Modify: `src/codemie/rest_api/routers/cli_analytics.py:269-311` (`FilterParams.resolve`) and `:589-610` (`get_sessions`)
- Modify: `src/codemie/service/analytics/handlers/cli_analytics_handler.py:512-523` (no change needed if router sets the flag on `f`; otherwise pass through)
- Test: `tests/codemie/repository/test_cli_analytics_repository.py`, `tests/codemie/rest_api/routers/test_cli_analytics_storage_wiring.py`

- [ ] Test-first: yes — (a) `_sessions_cte` with `project_unattributed=True` contains `project_name = ''` and not `ANY($projects`; (b) router with `is_project_unattributed=true` sets `f.project_unattributed` and clears `projects`; non-admin gets `deny_all=True`.
- [ ] In `_sessions_cte`: if `f.project_unattributed` append `project_name = ''`, `elif f.projects` keep the existing condition. In `resolve` add kwarg `project_unattributed: bool = False`: when true set `projects=None`, and for non-admin `deny_all=True`; set the field on the returned filter. In `get_sessions` add `is_project_unattributed: bool = Query(False, description="Return only sessions with no project")` and pass it to `resolve`.

### Task 3: UI sessions modal passes the project group

**Files:**
- Modify: `codemie-ui/src/pages/analytics/components/cli-analytics/views/RepositoriesView.tsx:126-166` (click handlers; group's `project_name` is on `RepoSummary`)
- Modify: `.../views/ExtendedSessionsModal.tsx:~51` and `.../views/SessionsView.tsx:115-132` (new optional `projectName`, `isProjectUnattributed` props)
- Modify: `.../hooks/useCliAnalyticsSessions.ts:44-121` (options `isProjectUnattributed`; send `is_project_unattributed: ... || undefined`; when `projectName` set, override `projects` param with it)
- Test: `codemie-ui/src/pages/analytics/components/cli-analytics/__tests__/RepositoriesView.test.tsx`, hook test

- [ ] Test-first: yes — clicking a branch under "(no project)" opens the modal with `is_project_unattributed=true` and no `projects`; under project "P" sends `projects=P`.
- [ ] Add `projectName?: string` and `isProjectUnattributed?: boolean` to `ExtendedSessionsTarget`; set them in both handlers from `repo.project_name` (null means `isProjectUnattributed: true`); thread through modal, `SessionsView` and hook options; add both to the hook's effect dependency list.
