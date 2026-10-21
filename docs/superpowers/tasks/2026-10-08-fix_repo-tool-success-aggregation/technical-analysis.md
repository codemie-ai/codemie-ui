# Technical Research

**Task**: analytics cli-repositories tool-success
**Generated**: 2026-10-08
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-15585: On the CLI Analytics Repositories tab, repository-level Tool Success is calculated incorrectly when a repository has multiple branches. The UI computes a session-count-weighted average of branch-level tool_success_rate percentages, instead of aggregating successful/total tool calls across the repository (successful tool calls / total tool calls x 100). Backend repository-level API, the Overview view, and the Users view all correctly return the aggregated value (e.g. 75% for a repo with branch A: 1 call/0 success, branch B: 3 calls/3 success -> 3/4=75%), but the Repositories tab UI shows 50% (an incorrect average of 0% and 100% weighted by session count=1 each).

Known locations:
- codemie-ui/src/pages/analytics/components/cli-analytics/views/RepositoriesView.tsx (frontend aggregation bug, function aggregateRepos, computing tool_success_rate as weighted average by session_count instead of from raw tool call counts)
- codemie-ui/src/types/cliAnalytics.ts (RepositoryRow type - need to confirm whether raw tool_calls / tool_calls_success fields are already available per-branch row, or need to be added/sourced from backend)
- codemie/src/codemie/service/analytics/handlers/cli_analytics_handler.py (backend handler — confirm how the correct repository-level and per-branch-row tool_success / tool_calls fields are computed and whether per-branch rows returned to the UI already carry raw tool_calls/tool_calls_success counts, or only the pre-computed tool_success_rate percentage)

Investigate exactly what data is available per-branch row today (does the API response already include raw tool call counts per branch, or only a percentage?), what the Overview/Users endpoints do differently that gets this right, and what the minimal correct fix is: either (a) aggregate from raw counts if already present in each branch row, or (b) add raw counts to the API response/type if missing, then fix the frontend aggregation to divide total successful by total tool calls.

---

## 2. Codebase Findings

### Existing Implementations

- `codemie-ui/src/pages/analytics/components/cli-analytics/views/RepositoriesView.tsx:46-94` — `aggregateRepos(rows)` buckets `RepositoryRow[]` (per-branch rows from the API) by `(project_name, repository)`, then for each repo sums `session_count`, `turns`, `files_changed`, `net_lines`, `cost_usd` across branches but computes `tool_success_rate` as a **session-count-weighted average of each branch's percentage**:
  ```ts
  const tool_success_rate =
    session_count > 0
      ? branches.reduce((s, b) => s + b.tool_success_rate * b.session_count, 0) / session_count
      : 0
  ```
  This is the exact bug: branch A (1 call, 0 success → 0%) and branch B (3 calls, 3 success → 100%), both with `session_count: 1`, average to `(0*1 + 100*1)/2 = 50%` instead of the correct `3/4 = 75%`.
- `codemie-ui/src/types/cliAnalytics.ts:137-149` — `RepositoryRow` has `session_count, turns, cost_usd, files_changed, lines_added, lines_removed, net_lines, tool_success_rate, project_name` and no raw `tool_calls` / `tool_calls_success` fields. **Confirmed: raw counts are not available per-branch row today** — only the pre-computed percentage.
- `codemie/src/codemie/service/analytics/handlers/cli_analytics_handler.py`:
  - `_new_repository_bucket` (line 116) initializes `_tool_calls` and `_tool_ok` accumulators per bucket.
  - `_build_repository_rows` (line 146-180) sums `success_by_session[sid]["tool_calls"]` and `["tool_calls_success"]` into `bucket["_tool_calls"]` / `bucket["_tool_ok"]` for every bucket — including per-branch buckets when `include_branches=True` (bucket key is `(project, repository, branch)`).
  - `_finalize_repository_bucket` (line 133-143) **pops** `_tool_calls` and `_tool_ok` off the bucket and replaces them with only `tool_success_rate = _pct(tool_ok, tool_calls)`. The raw counts are computed correctly per branch but discarded before the row reaches the API response.
  - `get_repositories` (line 477-536) is always called by the UI with `include_branches=True` (see hook below), so the API never returns a backend-computed parent-repo-level row for this view — the UI's `aggregateRepos` is solely responsible for combining branch rows into a repo row, and that is where the weighting bug lives.
  - By contrast `include_branches=False` buckets by repository only (one bucket per repo across all branches/projects) and already sums tool calls/success correctly across branches — this is the "backend repository-level API" referenced in the ticket, but it is not the code path RepositoriesView uses.
  - `get_users` (line 431-457) and `get_overview` (line 257-299+) each sum `tool_calls`/`tool_calls_success` directly across sessions into one scalar per row/KPI — there is no cross-row re-aggregation of percentages, so no equivalent bug is possible there. `LocalAnalyticsUserRow` (below) does carry a raw `tool_calls` count; `get_users` does not expose `tool_calls_success`, but it never needs to re-aggregate across users.
- `codemie/src/codemie/rest_api/models/cli_analytics.py:102-115` — Pydantic response schema `LocalAnalyticsRepositoryRow` mirrors the frontend `RepositoryRow`: `repository, branch, session_count, turns, cost_usd, files_changed, lines_added, lines_removed, net_lines, tool_success_rate, project_name` — no `tool_calls` / `tool_calls_success` fields. Compare `LocalAnalyticsUserRow` (line 136-152), which **does** expose `tool_calls: int = 0` alongside `tool_success_rate`.
- `codemie/src/codemie/rest_api/routers/cli_analytics.py:494-513` — `get_repositories` router endpoint; `include_branches` query param defaults `False`, forced `True` under certain conditions (line 508), then calls `_handler().get_repositories(f, resolved_page, resolved_per_page, include_branches, search)`.
- `codemie-ui/src/pages/analytics/components/cli-analytics/hooks/useCliAnalyticsRepositories.ts` — hook always sets `params.include_branches = true` when `includeBranches` arg is truthy; `RepositoriesView` calls the hook with `includeBranches=true` (line 102-107 of RepositoriesView.tsx), confirming the view only ever receives per-branch rows and must do its own repo-level rollup.
- `codemie/src/codemie/rest_api/routers/analytics.py`, `index.py` also reference `include_branches`/repositories but are unrelated endpoints (SVN index creation, etc.) — not in scope.
- `codemie-ui/src/pages/analytics/components/cli-analytics/views/RepositoriesTable.tsx` — a separate, seemingly unused-by-RepositoriesView table component; it has no `tool_success_rate` column renderer at all, so it is not affected by and does not need to participate in the fix.

### Architecture and Layers Affected

- **Backend handler layer**: `LocalAnalyticsHandler.get_repositories` / `_build_repository_rows` / `_finalize_repository_bucket` in `cli_analytics_handler.py` — needs to retain (not pop) raw tool call counts on the finalized row if the fix adds raw counts to the API.
- **Backend API schema layer**: `LocalAnalyticsRepositoryRow` in `rest_api/models/cli_analytics.py` — needs new fields if raw counts are added to the response.
- **Frontend hook/data layer**: `useCliAnalyticsRepositories.ts` passes data through unchanged; `RepositoryRow` type in `src/types/cliAnalytics.ts` needs new optional/required fields to match.
- **Frontend view layer**: `RepositoriesView.tsx`'s `aggregateRepos` function — needs the arithmetic fix regardless of which data-shape option is chosen.

### Integration Points

- Frontend `RepositoryRow` type must stay in lockstep with backend `LocalAnalyticsRepositoryRow` Pydantic schema — this is a cross-repo API contract (`codemie` backend ↔ `codemie-ui` frontend), not enforced by any shared schema generator found in this research pass.
- `success_by_session` dict (keyed by session_id, holding `tool_calls` and `tool_calls_success`) is sourced from `self._repo.get_tool_success_by_session(f)` (`CliAnalyticsReader` port) and reused identically across `get_overview`, `get_users`, `get_repositories`, and `get_sessions` — a single source of truth for raw counts already exists server-side; it is only discarded in the repositories path.

### Patterns and Conventions

- Backend finalization pattern: accumulate private `_`-prefixed keys on a mutable bucket dict, then "finalize" by computing derived fields and popping the private accumulators (see `_finalize_repository_bucket`). Any fix that preserves raw counts should rename/keep them as public fields rather than popping, following the same style used by `LocalAnalyticsUserRow.tool_calls`.
- `_pct(numerator, denominator)` (line 97-98) is the single rounding/percentage helper (`round(num/den*100, 1)` or `0.0` if `den` is falsy) — any additional percentage computation should reuse it rather than reimplementing rounding.
- Frontend aggregation pattern: `aggregateRepos` already reduces most numeric fields with simple `+=` sums across branches (turns, files_changed, net_lines, cost_usd); `tool_success_rate` is the only field aggregated differently (weighted average) and is the sole mismatch with the sum-based pattern used by its siblings.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `codemie/.ai-run/guides/integration/cli-analytics-storage.md` — describes the OTel/PostgreSQL storage layer behind `codemie.repository.cli_analytics`; documents `tool_calls` rollup semantics (line 169, 183) and notes design/plan docs for the storage layer at `docs/superpowers/specs/2026-09-23-cli-analytics-postgres-storage-design.md` and `docs/superpowers/plans/2026-09-23-cli-analytics-postgres-storage.md` (backend repo). No guide specifically documents the Repositories-tab aggregation contract.
- `codemie-ui/.ai-run/guides/` — no guide file content specifically matches "cli-analytics" aggregation; the only hits for "analytics" are `testing/qa-strategy.md` and `architecture/routing-patterns.md`, neither of which covers this computation.

### Architectural Decisions

- No ADR or inline `NOTE:`/`DECISION:` marker found explaining why repository-level `tool_success_rate` is computed client-side from branch rows rather than requested from the backend's already-correct `include_branches=False` aggregate. The comment at `_build_repository_rows` line 154 ("Bucket sessions by (project, repository, branch) with branches, else by repository only") documents the two bucketing modes but not why the UI combines them client-side.

### Derived Conventions

- Numeric roll-ups in both the handler and the frontend view consistently use simple summation for counts/costs; percentage-of-ratio fields are consistently computed as `success/total*100` from raw counts everywhere **except** this one client-side rollup — strong signal that the weighted-average line is a one-off defect, not an intentional alternate convention.

---

## 4. Testing Landscape

### Existing Coverage

- `codemie/tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py` has `get_repositories` tests (e.g. `test_repositories_unattributed_bucket_when_plugin_absent`, `test_is_unattributed_filter_delegates_to_repository`) but none assert on `tool_success_rate`/`tool_calls` correctness for the repositories handler specifically, and none test `include_branches=True` multi-branch aggregation of tool success.
- `codemie/tests/codemie/service/analytics/handlers/test_cli_analytics_handler_ordering.py` exists (ordering-focused, not tool-success-focused).
- `codemie-ui/src/pages/analytics/components/cli-analytics/__tests__/RepositoriesView.test.tsx` has a `MOCK_ROWS` fixture with two branches of `repo-a` (`tool_success_rate: 80` and `tool_success_rate: 90`, `session_count: 5` and `2`) — but no existing assertion checks the aggregated repo-level `tool_success_rate` value, so the current incorrect weighted-average output is not pinned by a test (a true gap, not a documented behavior).
- `codemie-ui/src/pages/analytics/components/cli-analytics/hooks/__tests__/useCliAnalyticsRepositories.test.ts` tests the hook's param-building, not row shape/content.

### Testing Framework and Patterns

- Backend: `pytest` + `pytest.mark.asyncio`, handler tests built via a `make_repo_handler(cost_facts)` / `make_filter()` helper pattern with mocked `CliAnalyticsReader` methods (`AsyncMock`).
- Frontend: `vitest` + `@testing-library/react`; `RepositoriesView.test.tsx` mocks `useCliAnalyticsRepositories` wholesale and asserts on rendered DOM, using a `MOCK_ROWS` fixture of `RepositoryRow[]`.

### Coverage Gaps

- No backend test exercises `include_branches=True` with mixed success/failure counts across branches of the same repo to confirm raw counts are computed correctly per branch (they are, per code reading, but untested).
- No frontend test asserts the numeric value of the aggregated `tool_success_rate` shown for a multi-branch repo — this is exactly the scenario the ticket describes and is the gap a fix's regression test should close.
- If raw counts are added to the API/type, no existing fixture (`MOCK_ROWS`, `BASE_COST_FACT`) includes `tool_calls`/`tool_calls_success`, so fixtures in both test files will need updating alongside the type/schema change.

---

## 5. Configuration and Environment

### Environment Variables

- None found specific to this feature; CLI analytics ingestion/storage env vars (if any) are out of scope for this UI-aggregation bug and were not surveyed further.

### Configuration Files

- No feature-specific config file governs the Repositories tab; behavior is entirely in the handler, schema, hook, and view files listed above.

### Feature Flags and Deployment Concerns

- None found. No feature flag gates the Repositories tab or `include_branches` behavior — `include_branches` is a plain request parameter, not a toggle.

---

## 6. Risk Indicators

- Speculative: If the fix adds raw `tool_calls`/`tool_calls_success` fields to `LocalAnalyticsRepositoryRow` and `RepositoryRow`, both the Pydantic schema (`codemie/src/codemie/rest_api/models/cli_analytics.py`) and the TypeScript type (`codemie-ui/src/types/cliAnalytics.ts`) must change together across two separate repositories/packages with no shared schema generator found — a drift risk if only one side is updated.
- Speculative: Existing test fixtures (`MOCK_ROWS` in `RepositoriesView.test.tsx`, `BASE_COST_FACT`/`BASE_COST_ROW` in `test_cli_analytics_handler.py`) do not include raw tool-call fields and will need updating if option (b) (add raw counts to the API) is chosen; a plan should budget for touching both fixtures.
- `_finalize_repository_bucket` currently pops `_tool_calls`/`_tool_ok` for both `include_branches=True` and `include_branches=False` paths — any fix must decide whether to expose raw counts on all repository rows (branch and non-branch) or only when `include_branches=True`, since `RepositoriesTable.tsx` and any other unexamined consumer of `get_repositories(include_branches=False)` also share the same `LocalAnalyticsRepositoryRow` schema.
- No regression test currently pins the correct multi-branch aggregated value (75% in the ticket's example), so without a new test the bug could silently reappear.
- `RepositoriesTable.tsx` is a parallel, likely-unused table component sharing the `RepositoryRow` type; worth a quick existence check (not performed here) to confirm it is genuinely dead code before assuming the type change has no other blast radius.

---

## 7. Summary for Complexity Assessment

This bug touches two layers in two separate repositories: the FastAPI/Pydantic handler and schema layer in `codemie` (`cli_analytics_handler.py`, `rest_api/models/cli_analytics.py`) and the React view/type layer in `codemie-ui` (`RepositoriesView.tsx`, `types/cliAnalytics.ts`). The backend already computes correct raw tool-call/success counts per branch bucket in `_build_repository_rows`, but `_finalize_repository_bucket` discards them, keeping only the rounded percentage — so the data needed for a correct fix either already exists transiently server-side (cheap to expose) or must be reconstructed. The frontend's `aggregateRepos` function is a single, isolated, well-contained bug: one line computes a session-count-weighted average of percentages instead of following the sum-then-divide pattern used by every sibling field in the same function.

Technical novelty is low — this is a straightforward aggregation-formula fix, not a new feature, and the correct formula is already implemented and tested implicitly in two other code paths (`get_overview`, `get_users`, and the `include_branches=False` branch of `get_repositories` itself). The primary complexity driver is coordinating a schema change across the backend Pydantic model and the frontend TypeScript type if raw counts are added to the API (option b), versus a frontend-only fix if the per-branch rows can instead be requested unaggregated some other way — but research confirms option (b) is necessary: today's per-branch API rows carry only the percentage, not raw counts.

Test coverage posture is thin at the exact point of risk: no existing backend or frontend test pins the correct multi-branch aggregated value, so the regression this ticket describes was not caught by any existing suite and a fix should add a targeted test on both sides (handler-level test with mixed-success branches, and a `RepositoriesView`/`aggregateRepos` test with the ticket's exact 1/0 and 3/3 example). Risk is otherwise low: no feature flags, no config, no migrations, and a single well-isolated function on each side of the stack.

---

## 8. External References

None named by the task.
