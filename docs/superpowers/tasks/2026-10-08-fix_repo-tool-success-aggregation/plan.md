# Repository Tool Success Aggregation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix EPMCDME-15585 — the CLI Analytics Repositories tab shows a wrong repository-level "Tool Success" percentage for multi-branch repos because it weight-averages each branch's rounded percentage instead of summing raw tool-call counts first.

**Design (revised per human review):** Do not keep `tool_success_rate` alongside new raw counts. Remove it entirely from both the backend `LocalAnalyticsRepositoryRow` schema and the frontend `RepositoryRow` type, and expose only raw `tool_calls` / `tool_calls_success`. The frontend computes the percentage from those raw counts through exactly one shared helper, `calcToolSuccessRate`, called everywhere a repository-row percentage is rendered. `LocalAnalyticsUserRow` (Users tab) is a separate schema and keeps its own `tool_success_rate`/`tool_calls` fields untouched — this fix does not touch Users.

**Tech Stack:** Backend — FastAPI, Pydantic, pytest/pytest-asyncio. Frontend — React, TypeScript, Vitest, @testing-library/react.

**Spec:** No spec.md for this task; requirements are the inline ticket text reproduced in Acceptance Criteria below. Technical analysis: `docs/superpowers/tasks/2026-10-08-fix_repo-tool-success-aggregation/technical-analysis.md` (codemie-ui repo).

Commit per task using each repo's existing convention (`EPMCDME-15585: <description>`) — do not invent a different format.

## Global Constraints

- Ticket prefix `EPMCDME-15585` on every commit, in both repos.
- Backend repo (`codemie`): never touch `config/customer/customer-config.yaml` or `src/codemie/configs/customer_config.py` — pre-existing unrelated local modifications, out of scope.
- The percentage is always sum-of-raw-counts-then-divide, never a weighted average of per-branch percentages, in neither repo.
- Two separate commits, one per repo, each in that repo's own git history. Never combine them into one commit.
- `src/pages/analytics/components/cli-analytics/views/RepositoriesTable.tsx` (codemie-ui) itself is a separate component rendered from `OverviewView.tsx`, not from `RepositoriesView.tsx`; it has no `tool_success_rate` column renderer and reads neither `tool_success_rate` nor `tool_calls`/`tool_calls_success`. **The component file itself must not be edited.** Its test fixture, and the `OverviewView.test.tsx` mock that stands in for it, construct `RepositoryRow` literals and *do* need a one-line field swap (see Task 2) purely to keep type-checking — this is a fixture update, not a change to the component or its behavior.
- `LocalAnalyticsUserRow` / `UserRow` (Users tab) are not touched by this fix — separate schema and type, keep their own `tool_success_rate`/`tool_calls` fields exactly as-is.

## Acceptance Criteria

- [ ] Repository-level Tool Success equals `(sum of tool_calls_success across all branches) / (sum of tool_calls across all branches) * 100`, never a weighted average of per-branch percentages.
- [ ] Ticket's exact example is pinned by a test: branch "sweep-cd" (1 tool call, 0 successful) + branch "sweep-cd-b" (3 tool calls, 3 successful) → repository-level result renders as 75%, not 50%, end-to-end through the real `aggregateRepos` → `calcToolSuccessRate` → rendered table cell.
- [ ] No `RepositoryRow` — backend `LocalAnalyticsRepositoryRow` or frontend `RepositoryRow` — carries a `tool_success_rate` field sourced from the API. Both schemas instead carry `tool_calls: int`/`tool_calls_success: int` (backend) and `tool_calls: number`/`tool_calls_success: number` (frontend), required on both sides, for every repository row (`include_branches` true or false).
- [ ] Exactly one function in the `codemie-ui` codebase computes `tool_calls_success / tool_calls * 100` from raw counts: `calcToolSuccessRate` in `src/pages/analytics/components/cli-analytics/format.ts`. `buildRepoMetrics` and both inline table-cell renders in `RepositoriesView.tsx` call it; none reimplements the formula.
- [ ] `aggregateRepos` sums raw `tool_calls`/`tool_calls_success` across branches, following the same reduce pattern as `session_count`, `turns`, `files_changed`, `net_lines`, `cost_usd`; it no longer computes `tool_success_rate` itself.
- [ ] Both repos have a test written to fail first (TDD) before the implementation lands, each pinning the ticket's numbers.
- [ ] `RepositoriesTable.tsx` (the component) is untouched. Its test fixture and the `OverviewView.test.tsx` mock payload are updated only to match the new required `RepositoryRow` fields.
- [ ] `config/customer/customer-config.yaml` and `src/codemie/configs/customer_config.py` are untouched.
- [ ] Two separate commits, one per repo, same ticket prefix.

**Negative constraints check:** "never a weighted average" / "must not be touched" (RepositoriesTable.tsx component) / "do not keep tool_success_rate alongside new raw counts" (this revision's core instruction) / "does not touch Users at all" — each is honored above and in the task steps below; no task computes the rate by any averaging-of-percentages mechanism, no task edits `RepositoriesTable.tsx`'s component code, no task adds a second place that derives the percentage, and no task touches `LocalAnalyticsUserRow`/`UserRow`/`UsersView.tsx`.

## Review Focus

- Total `tool_calls` across all branches of a repo is 0 (e.g. a repo whose sessions never ran a tool) — `calcToolSuccessRate` must return `0`, not `NaN`/`Infinity`. Covered by Task 2's helper and its own unit test.
- `include_branches=False` (single bucket per repo, no branch rows) must also carry `tool_calls`/`tool_calls_success` now, since it shares `_finalize_repository_bucket` with the `include_branches=True` path. Covered by Task 1's test, which exercises both flag values.
- Removing `tool_success_rate` from `RepositoryRow` and making `tool_calls`/`tool_calls_success` required (not optional — there is no backward-compatibility need) breaks type-checking in every file that builds a `RepositoryRow` literal, not just `RepositoriesView.test.tsx`. Confirmed by searching the codebase: `RepositoriesTable.test.tsx` (`MOCK_ROW`), `useCliAnalyticsRepositories.test.ts` (inline row literal), and `OverviewView.test.tsx` (mocked `RepositoriesTable`'s `onRowClick` payload) all construct one. All three are fixture-only edits (swap the field, no behavior asserted on it) and are covered in Task 2, Step 1.
- Backend bucket-dict convention uses `_`-prefixed private accumulator keys (`_tool_calls`, `_tool_ok`) that `_finalize_repository_bucket` currently pops. The fix keeps popping them into **public** `tool_calls`/`tool_calls_success` fields but drops the `_pct(...)` call that used to also set `tool_success_rate` — `_pct` itself is untouched (still used by `get_users`/`get_sessions`), only this one call site stops using it.
- `UsersView.test.tsx` and `UserRow` are unaffected — different type, different schema, not in scope; left as-is.

---

### Task 1: Backend — remove `tool_success_rate`, expose raw tool-call counts on repository rows (`codemie` repo)

**Files:**
- Modify: `src/codemie/rest_api/models/cli_analytics.py:102-115` (`LocalAnalyticsRepositoryRow`)
- Modify: `src/codemie/service/analytics/handlers/cli_analytics_handler.py:133-143` (`_finalize_repository_bucket`)
- Test: `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py` (new test)
- Test: `tests/codemie/rest_api/models/test_cli_analytics_models.py:35-48` (`test_repository_row_repository_nullable` — constructs a `LocalAnalyticsRepositoryRow` with `tool_success_rate=0.0`)

**Interfaces:**
- Consumes: `_build_repository_rows`'s existing `_tool_calls`/`_tool_ok` bucket accumulators (unchanged, line ~172-173). `_pct` is **not** used by this path anymore; it remains unchanged and still used elsewhere (`get_users`, `get_sessions`).
- Produces: every repository row dict (`include_branches` true or false) carries `tool_calls: int` and `tool_calls_success: int`, and no longer carries `tool_success_rate`. Task 2 reads these two field names verbatim and must not read `tool_success_rate` from the API.

Test-first: yes — `test_repositories_expose_raw_tool_call_counts` fails today with `KeyError: 'tool_calls'` (rows still only carry `tool_success_rate`); `test_repository_row_repository_nullable` fails with a pydantic "field required" error for `tool_success_rate` once its kwargs are updated to the new shape, since the schema hasn't changed yet.

- [ ] **Step 1: Write the failing tests**

Add to `test_cli_analytics_handler.py`, reusing `make_repo_handler`/`BASE_COST_FACT`/`make_filter`:

```python
@pytest.mark.asyncio
async def test_repositories_expose_raw_tool_call_counts():
    """EPMCDME-15585 repro: 1 call/0 success + 3 calls/3 success across two branches
    of one repo. Backend exposes only raw counts now, no tool_success_rate."""
    cost_facts = [
        {**BASE_COST_FACT, "session_id": "s1", "repository": "repo-x", "branch": "sweep-cd", "project_name": "proj"},
        {**BASE_COST_FACT, "session_id": "s2", "repository": "repo-x", "branch": "sweep-cd-b", "project_name": "proj"},
    ]
    handler = make_repo_handler(cost_facts)
    handler._repo.get_tool_success_by_session = AsyncMock(
        return_value=[
            {"session_id": "s1", "tool_calls": 1, "tool_calls_success": 0},
            {"session_id": "s2", "tool_calls": 3, "tool_calls_success": 3},
        ]
    )

    branch_rows = (await handler.get_repositories(make_filter(), page=0, per_page=50, include_branches=True))["rows"]
    sweep_cd = next(r for r in branch_rows if r["branch"] == "sweep-cd")
    sweep_cd_b = next(r for r in branch_rows if r["branch"] == "sweep-cd-b")
    assert (sweep_cd["tool_calls"], sweep_cd["tool_calls_success"]) == (1, 0)
    assert (sweep_cd_b["tool_calls"], sweep_cd_b["tool_calls_success"]) == (3, 3)
    assert "tool_success_rate" not in sweep_cd

    repo_rows = (await handler.get_repositories(make_filter(), page=0, per_page=50, include_branches=False))["rows"]
    repo_x = next(r for r in repo_rows if r["repository"] == "repo-x")
    assert (repo_x["tool_calls"], repo_x["tool_calls_success"]) == (4, 3)
```

In `test_cli_analytics_models.py`, change `test_repository_row_repository_nullable` (lines 35-46): replace the `tool_success_rate=0.0` kwarg with `tool_calls=0, tool_calls_success=0`.

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd codemie && poetry run pytest tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py::test_repositories_expose_raw_tool_call_counts tests/codemie/rest_api/models/test_cli_analytics_models.py::test_repository_row_repository_nullable -v`
Expected: both FAIL — `KeyError: 'tool_calls'` and a pydantic validation error for the missing required `tool_success_rate`, respectively.

- [ ] **Step 3: Implement the minimal fix**

In `cli_analytics_handler.py`, replace `_finalize_repository_bucket` (lines 133-143) to stop computing `tool_success_rate` and instead keep the raw counts as public fields:

```python
def _finalize_repository_bucket(bucket: dict, include_branches: bool) -> dict:
    bucket["tool_calls"] = bucket.pop("_tool_calls")
    bucket["tool_calls_success"] = bucket.pop("_tool_ok")
    projects = bucket.pop("_projects")
    if not include_branches:
        bucket["project_name"] = _most_frequent(projects)
    bucket["net_lines"] = bucket["lines_added"] - bucket["lines_removed"]
    return bucket
```

In `cli_analytics.py`, on `LocalAnalyticsRepositoryRow`, remove `tool_success_rate: float` (line 114) and add in its place:

```python
    tool_calls: int
    tool_calls_success: int
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `cd codemie && poetry run pytest tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py tests/codemie/rest_api/models/test_cli_analytics_models.py -v`
Expected: PASS, including both updated/new tests and every pre-existing test in both files (no regression in `test_repositories_unattributed_bucket_when_plugin_absent` or the ordering tests — none of them assert on `tool_success_rate`).

- [ ] **Step 5: Commit**

Commit the four changed files (`cli_analytics.py`, `cli_analytics_handler.py`, `test_cli_analytics_handler.py`, `test_cli_analytics_models.py`) using the repo's existing convention. Do not stage or otherwise touch `config/customer/customer-config.yaml` or `src/codemie/configs/customer_config.py`.

---

### Task 2: Frontend — remove `tool_success_rate`, aggregate from raw counts via one shared helper (`codemie-ui` repo)

**Files:**
- Modify: `src/types/cliAnalytics.ts:137-149` (`RepositoryRow` interface)
- Modify: `src/pages/analytics/components/cli-analytics/format.ts` (new `calcToolSuccessRate`; `buildRepoMetrics`)
- Modify: `src/pages/analytics/components/cli-analytics/views/RepositoriesView.tsx` (`RepoSummary` interface, `aggregateRepos`, two inline cell renders at ~276 and ~317)
- Test: `src/pages/analytics/components/cli-analytics/__tests__/format.test.ts` (new `calcToolSuccessRate` cases)
- Test: `src/pages/analytics/components/cli-analytics/__tests__/RepositoriesView.test.tsx` (`MOCK_ROWS` swap + new pinning test)
- Fixture-only (compile fix, no behavior change, same commit): `src/pages/analytics/components/cli-analytics/__tests__/RepositoriesTable.test.tsx:58-68` (`MOCK_ROW`), `src/pages/analytics/components/cli-analytics/hooks/__tests__/useCliAnalyticsRepositories.test.ts:85-100`, `src/pages/analytics/components/cli-analytics/__tests__/OverviewView.test.tsx:106-116` (mocked `RepositoriesTable`'s `onRowClick` payload)

**Interfaces:**
- Consumes: `RepositoryRow.tool_calls` / `RepositoryRow.tool_calls_success`, produced unconditionally by Task 1; no longer consumes `RepositoryRow.tool_success_rate` anywhere.
- Produces: `calcToolSuccessRate(calls: number, successCalls: number): number`, the single place in the codebase that computes this percentage. `aggregateRepos(rows): ProjectGroup[]` keeps its signature; each `RepoSummary` now carries raw `tool_calls`/`tool_calls_success` instead of a precomputed `tool_success_rate`. `buildRepoMetrics(row)` — already the single path both `OverviewView.tsx`'s top-repositories list and `RepositoriesView.tsx`'s modal route through — derives the `Metric`'s value via `calcToolSuccessRate`; verified no further change is needed at either call site, since both already pass a row/`RepoSummary` shape that now carries the raw fields.

Test-first: yes — two failing tests, for two different reasons. `format.test.ts`'s new `calcToolSuccessRate` cases fail because the function does not exist yet (import/compile failure — TDD framing: write the test against the not-yet-existing symbol). `RepositoriesView.test.tsx`'s ticket-pinning case fails because today's `aggregateRepos` still weight-averages percentages; writing it requires the `RepositoryRow` type edit first (type scaffolding, not the behavioral fix) so the fixture can be expressed at all — that type edit is Step 1a below, done before the behavioral fix in Step 3.

- [ ] **Step 1: Write the failing tests (plus the type scaffolding needed to express them)**

a) `src/types/cliAnalytics.ts`: replace `tool_success_rate: number` (line 147) with required `tool_calls: number` and `tool_calls_success: number`. This alone breaks type-checking everywhere a `RepositoryRow` literal is built — intentional, see (d).

b) `format.test.ts`: add

```ts
describe('calcToolSuccessRate', () => {
  it('computes percentage from raw counts', () => {
    expect(calcToolSuccessRate(4, 3)).toBe(75)
  })
  it('returns 0 when there are no calls', () => {
    expect(calcToolSuccessRate(0, 0)).toBe(0)
  })
})
```

c) `RepositoriesView.test.tsx`: in `MOCK_ROWS`, replace each entry's `tool_success_rate` with an equivalent `tool_calls`/`tool_calls_success` pair (`repo-a`/`main`: 10/8; `repo-a`/`dev`: 10/9; `repo-b`/`main`: 10/7). Add a `SWEEP_ROWS` fixture reproducing the ticket (`repo-x`/`sweep-cd`: 1/0; `repo-x`/`sweep-cd-b`: 3/3) and a new test:

```ts
it('aggregates repository tool_success_rate from raw counts, not a session-weighted average of percentages', () => {
  vi.mocked(useCliAnalyticsRepositories).mockReturnValue({ ...EMPTY_HOOK_RESULT, rows: SWEEP_ROWS })
  render(<RepositoriesView filters={MOCK_FILTERS} />)
  expect(screen.getByText('75.00%')).toBeInTheDocument()
  expect(screen.queryByText('50.00%')).not.toBeInTheDocument()
})
```

d) Fixture-only compile fixes (no assertion on the field in any of these, confirmed by reading each file — safe to swap the value):
   - `RepositoriesTable.test.tsx:67`: replace `tool_success_rate: 95.0` with `tool_calls: 20, tool_calls_success: 19`.
   - `useCliAnalyticsRepositories.test.ts:98`: replace `tool_success_rate: 95.0` with `tool_calls: 100, tool_calls_success: 95`.
   - `OverviewView.test.tsx:115`: replace `tool_success_rate: 90` with `tool_calls: 10, tool_calls_success: 9`.

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test:unit -- format`
Expected: FAIL — `calcToolSuccessRate` is not exported from `format.ts`.

Run: `npm run test:unit -- RepositoriesView`
Expected: FAIL — `getByText('75.00%')` finds nothing; today's code renders `50.00%`.

- [ ] **Step 3: Implement the minimal fix**

In `format.ts`, add the exported helper and switch `buildRepoMetrics` to use it:

```ts
export function calcToolSuccessRate(calls: number, successCalls: number): number {
  return calls > 0 ? (successCalls / calls) * 100 : 0
}
```

In `buildRepoMetrics`, change the `tool_success_rate` metric's `value` (line 60) from `row.tool_success_rate` to `calcToolSuccessRate(row.tool_calls, row.tool_calls_success)`.

In `RepositoriesView.tsx`:
- Import `calcToolSuccessRate` from `../format` alongside the existing `buildRepoMetrics` import.
- `RepoSummary` interface (lines 29-39): replace `tool_success_rate: number` with `tool_calls: number` and `tool_calls_success: number`.
- `aggregateRepos` (lines 69-79): replace the weighted-average block with sums following the sibling-field pattern:
  ```ts
  const tool_calls = branches.reduce((s, b) => s + b.tool_calls, 0)
  const tool_calls_success = branches.reduce((s, b) => s + b.tool_calls_success, 0)
  ```
  and push `tool_calls, tool_calls_success` onto the pushed object instead of `tool_success_rate`.
- Line ~276 (repo row cell, inside `formatMetricValue(...)`): replace `repo.tool_success_rate` with `calcToolSuccessRate(repo.tool_calls, repo.tool_calls_success)`.
- Line ~317 (branch row cell, inside `formatMetricValue(...)`): replace `b.tool_success_rate` with `calcToolSuccessRate(b.tool_calls, b.tool_calls_success)`.
- `handleRepoClick`/`handleBranchClick`: no change — they pass a `RepoSummary`/`RepositoryRow` into `buildRepoMetrics`, which now derives the percentage itself from the raw fields already present on both shapes.

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test:unit -- format RepositoriesView RepositoriesTable useCliAnalyticsRepositories OverviewView`
Expected: PASS across all five files — the behavioral fix in `format.ts`/`RepositoriesView.tsx`, and no behavior change (only type-shape) in the other three.

- [ ] **Step 5: Commit**

Commit the eight changed files (`cliAnalytics.ts`, `format.ts`, `RepositoriesView.tsx`, `format.test.ts`, `RepositoriesView.test.tsx`, `RepositoriesTable.test.tsx`, `useCliAnalyticsRepositories.test.ts`, `OverviewView.test.tsx`) using the repo's existing convention. Do not touch `RepositoriesTable.tsx` itself.
