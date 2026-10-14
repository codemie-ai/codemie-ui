# CTX/CALL Uses API Calls, Not Turns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every "CTX/CALL" metric in CLI Analytics (the Efficiency table column + its sort, the two context-bloat KPIs, and the sessions-list sort) divides cache-read tokens by `api_call_count` (model API calls) instead of `turns` (user prompts), computed once on the backend and only rendered — never recomputed — on the frontend.

**Architecture:** `cost_daily.api_call_count` already exists and is already selected (unused) inside the `_cost_rows` subquery both cost-fact reader queries read from — Task 1 adds it to their SELECT lists. Task 2 introduces one shared `_ctx_per_call()` helper (`cache_read_tokens / api_call_count`, zero-guarded) next to the file's existing `_pct()`-style ratio helper, and all three handler call sites (`get_overview` in Task 2, `get_sessions` in Task 3, `get_efficiency` in Task 4) call that single helper instead of each doing its own inline division — the division logic itself lives in exactly one place. Task 3 also turns the sessions list's private sort-only ratio into a public response field. Task 5 declares that field on the API model so it survives `_respond`'s pydantic validation. Tasks 6-7 add the matching TypeScript field and make the Efficiency table's cell renderer read it instead of dividing client-side.

**Tech Stack:** Python/FastAPI/pydantic (`codemie`), pytest; React/TypeScript (`codemie-ui`), Vitest.

**Requirements:** EPMCDME-15519 (inline ticket text, no spec.md for this flow — see Acceptance criteria below). Technical analysis: `docs/superpowers/tasks/2026-10-07-ctx-per-call-uses-turns-not-api-calls/technical-analysis.md`.

Commit per task using the repository's existing convention (`EPMCDME-15519: Description`).

## Acceptance criteria

- [ ] The Efficiency "Most bloated sessions" table's CTX/CALL column, and its sort order, use `cache_read_tokens / api_call_count`.
- [ ] The "Worst session CTX / call" KPI (`worst_session_ctx_per_call`) uses `api_call_count` as the denominator.
- [ ] The "Avg context / call" KPI (`avg_context_per_call`) uses `api_call_count` as the denominator.
- [ ] The sessions list's `ctx_per_call` sort uses `api_call_count` as the denominator.
- [ ] `ctx_per_call` is computed once on the backend and exposed as a field on the session row API response; the frontend renders that field and performs no client-side division.
- [ ] Both `turns == 0` and `api_call_count == 0` are zero-guarded wherever a ratio is computed from them.

## Global Constraints

- All `ctx_per_call` calculation logic lives on the backend; the frontend only renders the backend-provided field.
- The `cache_read_tokens / api_call_count` ratio is computed by exactly one shared helper (`_ctx_per_call` in `cli_analytics_handler.py`, introduced in Task 2); `get_overview`, `get_sessions`, and `get_efficiency` all call it — none of the three repeats the division inline.
- Use the file's existing `_i()`/`_f()`/`_s()` coercion helpers and zero-guard idiom (`(x / y) if y else 0.0`) for every new division — do not introduce a different convention. (The shared helper itself is the one place this idiom is written for this ratio.)
- No migration: `cost_daily.api_call_count` already exists in the schema.

## Review Focus

- A session with few turns but many API calls (heavy tool use) must rank as *more* bloated under the fix, not less — the two handler tests below pick numbers that flip ranking between the old (turns) and new (api_call_count) formula, so a test that merely swaps the divisor without checking the actual ranking would still pass a weaker assertion.
- `get_overview`, `get_sessions`, and `get_efficiency` must each call the shared `_ctx_per_call` helper from Task 2 — a task that reintroduces its own inline `(cache_read / calls) if calls else 0.0` instead of calling the helper satisfies the per-task numeric assertions but violates the "computed once on the backend" acceptance criterion.
- `api_call_count == 0` on an otherwise-priced row (not just `turns == 0`) must not raise `ZeroDivisionError` — the existing guard only ever had to cover `turns`. The shared helper's own zero-guard test (Task 2) is what pins this, not each call site separately.
- `LocalAnalyticsSessionRow` must declare the new field, or `_respond`'s `model_class(**payload)` / `model_dump()` round-trip silently drops it and the frontend never receives it even though the handler computed it correctly.
- The Efficiency table's CTX/CALL cell must come from `row.ctx_per_call`, not `row.turns` — a test with `displayRows: []` (as today) can't catch a lingering client-side division, so the new frontend test needs a non-empty mock row.
- `BASE_COST_ROW`/`_cost_row` fixtures used by other, unrelated tests have no `api_call_count` key; adding the field to the SQL must not break those by failing to coerce a missing key to `0`.

---

### Task 1: Reader — expose `api_call_count` in the cost-fact queries

**Files:**
- Modify: `src/codemie/repository/cli_analytics/postgres/reader.py:200-213` (`get_cost_kpis`), `:480-516` (`get_session_cost_facts`)
- Test: `tests/codemie/repository/cli_analytics/postgres/test_reader.py`

**Interfaces:**
- Produces: `get_cost_kpis` rows now carry `total_api_calls`; `get_session_cost_facts` rows now carry `api_call_count`. Both already pass through `_cost_rows`, which selects `cost_daily.api_call_count` unaliased on every row.

Test-first: yes — `test_cost_kpis_selects_total_api_calls` / `test_session_cost_facts_selects_api_call_count` fail today because neither column is selected.

- [ ] **Step 1: Write the failing tests** in `test_reader.py` (same `_sql_of` string-assertion pattern as `test_session_cost_facts_inner_join_sel_without_epoch_defaults`, lines 343-350):

```python
@pytest.mark.asyncio
async def test_cost_kpis_selects_total_api_calls():
    sql, _ = await _sql_of("get_cost_kpis")
    assert "sum(api_call_count)::bigint" in sql
    assert "AS total_api_calls" in sql


@pytest.mark.asyncio
async def test_session_cost_facts_selects_api_call_count():
    sql, _ = await _sql_of("get_session_cost_facts")
    assert "sum(c.api_call_count)::bigint" in sql
    assert "AS api_call_count" in sql
```

- [ ] **Step 2: Run and confirm failure**: `poetry run pytest tests/codemie/repository/cli_analytics/postgres/test_reader.py -k api_call -v` from `codemie/` — expect FAIL (assertion error, no such text in SQL).
- [ ] **Step 3: Implement.** In `get_cost_kpis` (reader.py:200-213), add a line to the `SELECT` list, right after `total_cache_creation_tokens`: `sum(api_call_count)::bigint AS total_api_calls,`. In `get_session_cost_facts` (reader.py:480-516), add to its `SELECT` list, right after `cache_creation_tokens`: `sum(c.api_call_count)::bigint AS api_call_count`. Both read from `cost_daily`/`_cost_rows`, which already carries the column — no join or migration needed.
- [ ] **Step 4: Run and confirm pass**: same command as Step 2 — expect PASS. Also run the full file (`poetry run pytest tests/codemie/repository/cli_analytics/postgres/test_reader.py -v`) to confirm no existing SQL-shape assertion broke.
- [ ] **Step 5: Commit.**

---

### Task 2: Handler — shared `_ctx_per_call` helper, used by `get_overview`'s `avg_context_per_call`

**Files:**
- Modify: `src/codemie/service/analytics/handlers/cli_analytics_handler.py:97` (new helper, placed next to `_pct`), `:284` (add a variable), `:327` (the division)
- Test: `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py`

**Interfaces:**
- Produces: `_ctx_per_call(cache_read_tokens, api_call_count) -> float` — a module-level helper, same visibility and placement style as the existing `_pct()` ratio helper. It is the single place the ctx/call ratio is computed; Task 3 (`get_sessions`) and Task 4 (`get_efficiency`) both call it instead of inlining the division themselves.
- Consumes: `kpi.get("total_api_calls")` from Task 1's `get_cost_kpis`.

Test-first: yes — `test_ctx_per_call_helper_divides_and_zero_guards` (new, pins the shared helper's ratio and zero-guard behavior directly) and `test_overview_avg_context_per_call_divides_by_api_call_count` (pins `get_overview`'s KPI through that helper) both fail today: the helper does not exist yet, and the handler still divides `avg_context_per_call` by `total_turns`.

- [ ] **Step 1: Write the failing tests** in `test_cli_analytics_handler.py`:

```python
def test_ctx_per_call_helper_divides_and_zero_guards():
    from codemie.service.analytics.handlers.cli_analytics_handler import _ctx_per_call

    assert _ctx_per_call(1000, 10) == 100.0
    assert _ctx_per_call(1000, 0) == 0.0   # zero-guard: api_call_count == 0 must not raise
    assert _ctx_per_call(0, 5) == 0.0


@pytest.mark.asyncio
async def test_overview_avg_context_per_call_divides_by_api_call_count():
    """One turn can trigger many API calls (tool use); turns must not be the divisor."""
    repo = MagicMock()
    repo.get_cost_kpis = AsyncMock(return_value=[{
        "total_sessions": 1, "total_cost_usd": 1.0, "total_input_tokens": 0,
        "total_output_tokens": 0, "total_cache_read_tokens": 1000,
        "total_cache_creation_tokens": 0, "total_api_calls": 10,
    }])
    repo.get_model_breakdown = AsyncMock(return_value=[])
    repo.get_lines_totals = AsyncMock(return_value=[])
    repo.get_lines_daily = AsyncMock(return_value=[])
    repo.get_turns_by_session = AsyncMock(return_value=[{"session_id": "s1", "turns": 1}])
    repo.get_file_facts_by_session = AsyncMock(return_value=[])
    repo.get_tool_success_by_session = AsyncMock(return_value=[])
    repo.get_session_durations = AsyncMock(return_value=[])
    repo.get_session_cost_facts = AsyncMock(return_value=[{**BASE_COST_ROW, "session_id": "s1"}])
    handler = LocalAnalyticsHandler(repo)

    data, _, _ = await handler.get_overview(make_filter())

    # 1000 cache_read_tokens / 10 api calls = 100 — the old formula (/1 turn) would give 1000.
    assert data["kpis"]["avg_context_per_call"] == 100.0
```

- [ ] **Step 2: Run and confirm failure**: `poetry run pytest tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py -k "ctx_per_call_helper or avg_context_per_call_divides" -v` — expect FAIL (`ImportError`/`AttributeError` for the helper; `100.0 != 1000.0` for the overview test).
- [ ] **Step 3: Implement.** Add the shared helper next to `_pct` (around line 97):

```python
def _ctx_per_call(cache_read_tokens: Any, api_call_count: Any) -> float:
    """Cache-read tokens per model API call, zero-guarded. The single shared
    computation reused by get_overview, get_sessions and get_efficiency —
    none of them may reimplement this division inline."""
    calls = _i(api_call_count)
    return (_i(cache_read_tokens) / calls) if calls else 0.0
```

  Then at `cli_analytics_handler.py:284`, add `total_api_calls = _i(kpi.get("total_api_calls"))` alongside the other `kpi.get(...)` reads. At line 327, change `"avg_context_per_call": (cache_read_tokens / total_turns) if total_turns else 0.0` to `"avg_context_per_call": _ctx_per_call(cache_read_tokens, total_api_calls)`.
- [ ] **Step 4: Run and confirm pass**: same command as Step 2 — expect PASS.
- [ ] **Step 5: Commit.**

---

### Task 3: Handler — `get_sessions` exposes a public `ctx_per_call` field via the shared helper

**Files:**
- Modify: `src/codemie/service/analytics/handlers/cli_analytics_handler.py:603` (the field), `:623` (sort key), `:634` (remove the pop)
- Test: `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py`

**Interfaces:**
- Consumes: Task 2's `_ctx_per_call` helper and `row.get("api_call_count")` from Task 1's `get_session_cost_facts` rows.
- Produces: each session dict now carries a public `ctx_per_call: float` field (replacing the private, popped `_ctx_per_call` sort key) that Task 5 must declare on `LocalAnalyticsSessionRow` or it is silently dropped by response validation.

Test-first: yes — `test_sessions_ctx_per_call_field_uses_api_call_count_and_sorts_by_it` fails today: there is no `ctx_per_call` key in the response, and the sort order follows turns.

- [ ] **Step 1: Write the failing test**, picking numbers where the turns-based and api_call_count-based rankings disagree:

```python
@pytest.mark.asyncio
async def test_sessions_ctx_per_call_field_uses_api_call_count_and_sorts_by_it():
    s1 = {**BASE_COST_ROW, "session_id": "s1", "cache_read_tokens": 1000, "api_call_count": 200}
    s2 = {**BASE_COST_ROW, "session_id": "s2", "cache_read_tokens": 1000, "api_call_count": 20}
    repo = MagicMock()
    repo.get_session_cost_facts = AsyncMock(return_value=[s1, s2])
    # turns-based ratio would rank s1 (1000/10=100) above s2 (1000/100=10) — the opposite order.
    repo.get_turns_by_session = AsyncMock(
        return_value=[{"session_id": "s1", "turns": 10}, {"session_id": "s2", "turns": 100}]
    )
    repo.get_tool_success_by_session = AsyncMock(return_value=[])
    repo.get_lines_by_session = AsyncMock(return_value=[])
    repo.get_model_breakdown = AsyncMock(return_value=[])
    repo.get_skill_names_by_session = AsyncMock(return_value=[])
    handler = LocalAnalyticsHandler(repo)

    data, _, _ = await handler.get_sessions(
        make_filter(), page=0, per_page=20, sort_by="ctx_per_call", search=None
    )

    rows = data["sessions"]
    sessions = {r["trace_id"]: r for r in rows}
    assert sessions["s1"]["ctx_per_call"] == 5.0    # 1000 / 200 api calls
    assert sessions["s2"]["ctx_per_call"] == 50.0   # 1000 / 20 api calls
    assert [r["trace_id"] for r in rows] == ["s2", "s1"]  # highest ctx_per_call first
```

- [ ] **Step 2: Run and confirm failure**: `poetry run pytest tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py -k ctx_per_call_field -v` — expect FAIL (`KeyError: 'ctx_per_call'`, since it's still named `_ctx_per_call` and popped).
- [ ] **Step 3: Implement.** At line 603, change the dict key from `"_ctx_per_call": (cache_read / turns) if turns else 0.0` to `"ctx_per_call": _ctx_per_call(row.get("cache_read_tokens"), row.get("api_call_count"))` — Task 2's shared helper, not an inline division. At line 623, change the sort lambda from `s["_ctx_per_call"]` to `s["ctx_per_call"]`. Delete line 634 (`row.pop("_ctx_per_call", None)`) entirely — the field must survive into the response. No separate `api_calls`/`cache_read` locals are needed for this computation: the shared helper coerces both of its arguments itself.
- [ ] **Step 4: Run and confirm pass**: same command as Step 2 — expect PASS. Also re-run the full handler test file to confirm the email-normalization test at line ~439 (which round-trips a session row through `LocalAnalyticsSessionRow(**...)`) still passes once Task 5 declares the field.
- [ ] **Step 5: Commit.**

---

### Task 4: Handler — `get_efficiency`'s worst-session ratio and KPI call the shared helper

**Files:**
- Modify: `src/codemie/service/analytics/handlers/cli_analytics_handler.py:880` (add a variable), `:895` (per-row ratio), `:917` (KPI)
- Test: `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py`

**Interfaces:**
- Consumes: Task 2's `_ctx_per_call` helper, `row.get("api_call_count")` per cost-fact row (Task 1), and `kpi.get("total_api_calls")` (Task 1).

Test-first: yes — `test_efficiency_worst_session_and_avg_use_api_call_count` fails today: both the "worst" session and the KPI value follow `turns`.

- [ ] **Step 1: Write the failing test**, again picking numbers where turns-based and api_call_count-based rankings disagree:

```python
@pytest.mark.asyncio
async def test_efficiency_worst_session_and_avg_use_api_call_count():
    """Heavy tool use (many calls per turn) must not look less bloated than few calls."""
    s1 = {**BASE_COST_ROW, "session_id": "s1", "cache_read_tokens": 1000, "api_call_count": 10}
    s2 = {**BASE_COST_ROW, "session_id": "s2", "cache_read_tokens": 1000, "api_call_count": 100}
    repo = MagicMock()
    repo.get_cost_kpis = AsyncMock(return_value=[{
        "total_sessions": 2, "total_cost_usd": 2.0,
        "total_cache_read_tokens": 2000, "total_api_calls": 110,
    }])
    repo.get_model_breakdown = AsyncMock(return_value=[])
    repo.get_session_cost_facts = AsyncMock(return_value=[s1, s2])
    # turns-based ratio would make s2 (1000/5=200) "worse" than s1 (1000/100=10) — reversed.
    repo.get_turns_by_session = AsyncMock(
        return_value=[{"session_id": "s1", "turns": 100}, {"session_id": "s2", "turns": 5}]
    )
    repo.get_file_facts_by_session = AsyncMock(return_value=[])
    repo.get_lines_totals = AsyncMock(return_value=[])
    handler = LocalAnalyticsHandler(repo)

    data, _ = await handler.get_efficiency(make_filter())

    kpis = data["kpis"]
    assert kpis["worst_session_trace_id"] == "s1"             # 1000/10=100 beats 1000/100=10
    assert kpis["avg_context_per_call"] == pytest.approx(2000 / 110)
```

- [ ] **Step 2: Run and confirm failure**: `poetry run pytest tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py -k efficiency_worst_session_and_avg -v` — expect FAIL (`worst_session_trace_id == 's2'`, wrong KPI value).
- [ ] **Step 3: Implement.** At line 880 area, add `total_api_calls = _i(kpi.get("total_api_calls"))` alongside `cache_read_tokens`. Inside the loop (around line 893-895), replace `turns = turns_by_session.get(sid, 0)` / `ratio = (_i(row.get("cache_read_tokens")) / turns) if turns else 0.0` so the per-row ratio calls Task 2's shared helper instead: `ratio = _ctx_per_call(row.get("cache_read_tokens"), row.get("api_call_count"))`; keep the existing `turns` lookup only for `depth_counts[depth_bucket(turns)]`, which still buckets by turns (unaffected by this ticket). At line 917, change `"avg_context_per_call": (cache_read_tokens / total_turns) if total_turns else 0.0` to `"avg_context_per_call": _ctx_per_call(cache_read_tokens, total_api_calls)` — the same helper Task 2 introduced, not a third inline division.
- [ ] **Step 4: Run and confirm pass**: same command as Step 2 — expect PASS.
- [ ] **Step 5: Commit.**

---

### Task 5: API model — declare `ctx_per_call` (and `api_call_count`) on `LocalAnalyticsSessionRow`

**Files:**
- Modify: `src/codemie/rest_api/models/cli_analytics.py:184-189` (`LocalAnalyticsSessionRow`)
- Test: `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py` (extend Task 3's test)

**Interfaces:**
- Consumes: the `api_call_count` / `ctx_per_call` keys Tasks 1 and 3 add to the session dict.
- Produces: `LocalAnalyticsSessionRow.api_call_count: int`, `LocalAnalyticsSessionRow.ctx_per_call: float` — the fields the frontend's `SessionRow` (Task 6) and cell renderer (Task 7) read.

Test-first: yes — extends Task 3's test to go through the pydantic model, which fails today (`ctx_per_call` key is silently dropped by `model_dump` because the model doesn't declare it, so the field would be absent from the actual API response even once Task 3 adds it to the raw dict).

- [ ] **Step 1: Write the failing assertion**, appended to `test_sessions_ctx_per_call_field_uses_api_call_count_and_sorts_by_it` from Task 3:

```python
    from codemie.rest_api.models.cli_analytics import LocalAnalyticsSessionRow

    dumped = LocalAnalyticsSessionRow(**rows[0]).model_dump(by_alias=True)
    assert dumped["ctx_per_call"] == rows[0]["ctx_per_call"]
    assert dumped["api_call_count"] == 200
```

- [ ] **Step 2: Run and confirm failure**: same test command as Task 3 — expect FAIL (`KeyError: 'ctx_per_call'` on the dumped dict, since the model drops the undeclared field).
- [ ] **Step 3: Implement.** In `cli_analytics.py`, after `tool_call_count: int = 0` (line 185) add `api_call_count: int = 0`; after `cache_creation_tokens: int = 0` (line 189) add `ctx_per_call: float = 0.0`.
- [ ] **Step 4: Run and confirm pass**: same command — expect PASS.
- [ ] **Step 5: Commit.**

---

### Task 6: Frontend type — add `ctx_per_call` to `SessionRow`

**Files:**
- Modify: `codemie-ui/src/types/cliAnalytics.ts:46-65` (`SessionRow`)

**Interfaces:**
- Produces: `SessionRow.ctx_per_call?: number`, matching the backend field from Task 5, for Task 7's renderer to read.

Test-first: no — a TypeScript interface field addition has no runtime behavior to pin; `npm run typecheck` is the only check, and it is covered by the Task 7 change compiling.

- [ ] **Step 1: Implement.** In `cliAnalytics.ts`, inside the `SessionRow` interface (lines 46-65), add `ctx_per_call?: number` alongside the existing optional fields (next to `cache_read_tokens?: number`).
- [ ] **Step 2: Commit** together with Task 7 (the type exists purely to serve that task's renderer).

---

### Task 7: Frontend — `EfficiencyView`'s CTX/CALL cell renders the backend field

**Files:**
- Modify: `codemie-ui/src/pages/analytics/components/cli-analytics/views/EfficiencyView.tsx:193-196`
- Test: `codemie-ui/src/pages/analytics/components/cli-analytics/__tests__/EfficiencyView.test.tsx`

**Interfaces:**
- Consumes: `SessionRow.ctx_per_call` from Task 6.

Test-first: yes — `renders the backend-provided ctx_per_call value without recomputing it from turns` fails today because the cell still computes `cache_read_tokens / turns` client-side.

- [ ] **Step 1: Write the failing test.** Add a case to `EfficiencyView.test.tsx` that overrides the `useCliAnalyticsSessions` mock with a non-empty row whose `turns`-based value would differ from its `ctx_per_call` value, so a lingering client-side division is caught:

```tsx
it('renders the backend-provided ctx_per_call value without recomputing it from turns', () => {
  vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
    displayRows: [
      {
        trace_id: 's1',
        developer_name: 'dev',
        repository: null,
        start_time: '2026-07-01T00:00:00Z',
        duration_ms: 1000,
        model_name: 'claude',
        input_tokens: 10,
        output_tokens: 10,
        cost_usd: 1,
        tool_call_count: 0,
        branch: null,
        turns: 1,
        cache_read_tokens: 1000, // turns-based would render 1,000 — must not.
        ctx_per_call: 5,
      },
    ],
    loading: false,
    error: null,
    page: 1,
    totalPages: 1,
    perPage: 10,
    setPage: vi.fn(),
    search: '',
    setSearch: vi.fn(),
  })

  render(<EfficiencyView filters={MOCK_FILTERS} />)

  expect(screen.getByText('5')).toBeInTheDocument()
  expect(screen.queryByText('1,000')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run and confirm failure**: `npm test -- EfficiencyView` (or `npm run test:unit -- EfficiencyView`) from `codemie-ui/` — expect FAIL (cell shows `1,000`, the turns-based value, not `5`).
- [ ] **Step 3: Implement.** Replace `EfficiencyView.tsx:193-196`'s renderer body with:

```tsx
ctx_per_call: (row: SessionRow) => (
  <div className="text-sm text-text-primary tabular-nums">
    {row.ctx_per_call != null ? formatTokens(row.ctx_per_call) : '—'}
  </div>
),
```

- [ ] **Step 4: Run and confirm pass**: same command as Step 2 — expect PASS. Also re-run the full `EfficiencyView.test.tsx` file to confirm no existing case broke.
- [ ] **Step 5: Commit** (together with Task 6's type change).

---

## Negative-constraints pass

- "All ctx_per_call calculation logic must live on the backend; frontend must NOT recompute it client-side" — Task 7 deletes the only client-side division (`(row.cache_read_tokens ?? 0) / row.turns`) and replaces it with a direct read of `row.ctx_per_call`; no other frontend file performs this division (confirmed in the technical analysis: `SessionsView.tsx` has no CTX/CALL column).
- "`ctx_per_call` is computed once on the backend" (not independently re-derived per call site) — Task 2 introduces the single `_ctx_per_call` helper; Tasks 3 and 4 call it rather than reintroducing their own inline division. The Review Focus section above calls out that a task satisfying only the numeric assertions while reinlining the division would violate this constraint even though its tests pass.
- No whole-suite quality-gate, manual/browser-verification, code-review, or commit-batching task is included — each task's own `Test-first` line is the only testing step, per this plan's scope (the calling flow runs lint/build/test and review itself).
- No `git commit` command block appears anywhere in this plan — the header states the convention once, and each task's Step 5 is a one-line reminder, not an invented commit message format.
