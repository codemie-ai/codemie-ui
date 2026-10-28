# Technical Research

**Task**: cli-analytics tool-success-rate overview-summary users-aggregation (EPMCDME-16322)
**Generated**: 2026-10-26
**Research path**: filesystem (codegraph MCP not available — `mcp__codegraph__search` returned "No such tool available")

---

## 1. Original Context

task_context (verbatim from Jira EPMCDME-16322, Bug, Minor, labels Horizon1 / codemie-analytics / codemie_feedback):

Summary: [CLI Analytics] Tool Success shows 0% instead of a dash when the sessions have no tool calls

*Environment*
 * Preview: https://codemie-preview.lab.epam.com
 * UI: 2.49.0-SNAPSHOT.214, API: 2.49.0-SNAPSHOT.217
 * Developer: dzmitry_lopukh@epam.com
 * Test date: 2026-10-23

h2. Description

When the sessions contain no tool calls at all (Tool Calls = 0), the Tool Success metric is displayed as 0% (0.0% on Overview, 0.00% on Users). There is nothing to calculate a success rate from, so a dash (—) should be shown instead. 0% wrongly suggests that every tool call failed.

h2. Steps to reproduce
 # Start a Claude Code session with the CLI Analytics proxy connected and send a prompt that does not trigger any tool call (e.g. "hello claude"), then exit.
 # Open https://codemie-preview.lab.epam.com/analytics?tab=cliAnalytics and filter by the user (period: Last 24 hours).
 # Open the *Overview* tab and look at the *Summary* block (TOOL CALLS card).
 # Open the *Users* tab and look at the *Per-user detail* table.
 # Click the user to open the user modal and look at the *Summary* block.
 # Open the session from the modal and check the *Activity* block (Tool Calls).

h2. Actual vs expected
||Place||Tool Calls||Actual Tool Success||Expected Tool Success||
|Overview -> Summary (TOOL CALLS card, subtitle)|0|0.0% success|- (dash)|
|Users tab -> Per-user detail (TOOL SUCCESS column)|0|0.00%|- (dash)|
|User modal -> Summary (TOOL SUCCESS)|0 (Sessions 1, Turns 1)|0.00%|- (dash)|

Session details (session "hello claude", 2026-10-23 10:10) show Tool Calls = 0, Agents = 0, Skills = 0.

h2. Expected result

If there were no tool calls in the selected sessions, Tool Success is shown as a dash (-) on the Overview Summary, in the Users tab (Per-user detail) and in the user modal Summary. 0% is shown only when tool calls exist and all of them failed.

h2. Acceptance criteria
 * Tool Calls = 0 -> Tool Success is displayed as a dash on Overview, in Per-user detail and in the user modal Summary.
 * Tool Calls > 0 -> Tool Success is displayed as a percentage as before (including a real 0% when all calls failed).

---

Research framing supplied with the task: this repository is the CodeMie **backend** (FastAPI/Python); the bug is reported as a UI display issue, so the research must establish precisely where the fix belongs.

---

## 2. Codebase Findings

### Domain naming

The ticket says "CLI Analytics"; the backend calls this domain **"Local Analytics"** (`LocalAnalytics*` models, `LocalAnalyticsHandler`) while the module/route naming uses `cli_analytics`. Both spellings must be searched.

### Existing Implementations

All tool-success computation for this feature lives in **exactly one module**. There is no duplicate implementation anywhere in `src/` — the only other `tool_success_rate` hits in the repo are `docs/` design notes and `.claude/worktrees/` copies, not live code.

- `src/codemie/service/analytics/handlers/cli_analytics_handler.py` — the only place every CLI-analytics percentage is computed. Contains `_pct()` (line 138) and all tool-success call sites. `LocalAnalyticsHandler` class at line 347. Edge-coercion helpers `_i` (67), `_f` (115), `_s` (124), `_iso` (128), `_ctx_per_call` (149), `_first` (157).
- `src/codemie/rest_api/models/cli_analytics.py` — Pydantic response contract. Module docstring (lines 15-21) states it is "a CONTRACT with the codemie-ui Local Analytics tab (`src/types/localAnalytics.ts`)" — that UI type file is **not** in this repo.
- `src/codemie/rest_api/routers/cli_analytics.py` — FastAPI router: `/overview` (399), `/users` (439), `/user-charts` (460), `/repositories` (499), `/tools` (531), `/sessions` (599), `/sessions/{id}` (631). `_respond()` at 338, `_metadata` 329, `_admin_gate` 118, `FilterParams.resolve` 279. Feature gate `_ensure_enabled()` at 140-144.
- `src/codemie/repository/cli_analytics/postgres/reader.py` — raw-SQL Postgres reader. `get_tool_success_by_session` (495), `get_tool_usage` (506), `get_session_detail_scalars` (713), `get_session_detail_tools` (759).
- `src/codemie/repository/cli_analytics/ports.py` — reader Protocol; `get_tool_success_by_session` at 171 (no docstring, no documented row contract for the zero case).
- `src/codemie/repository/cli_analytics/postgres/rollups.py` — pre-aggregation; `invocations_hourly` insert at 1761-1768, with `count(*) FILTER (WHERE e.success = 'true') AS success`. Comment at 1111-1112: "Failed tool calls, one per tool_use_id … Never calls - success."
- `src/codemie/repository/cli_analytics/{filters,factory,vocabulary}.py` — `LocalAnalyticsFilter`, `get_cli_analytics_storage()`.
- `src/codemie/service/analytics/handlers/user_identity_resolver.py` — post-processes `/users` rows (`_attach_user_ids`, router line 480); touches `user_id` only.

### The single root cause

`src/codemie/service/analytics/handlers/cli_analytics_handler.py:138-146`:

```python
def _pct(numerator: float, denominator: float) -> float:
    """Percent to one decimal using half-up rounding for nonnegative counts.

    Keep one backend rounding rule for analytics percentages, including repository
    and branch rollups: 1/16 is 6.3%, not 6.2%. Clients display the server value.
    """
    if not denominator:
        return 0.0
    return math.floor(numerator / denominator * 1000 + 0.5) / 10
```

`_pct` is the single shared producer of every analytics percentage. Its guard is a **falsy** check, so `0`, `0.0` and `None` all collapse to `0.0`, and the signature `(float, float) -> float` cannot express "undefined". The backend therefore cannot distinguish "0 of 0" from "0 of N" at the API level — both serialize as `0.0`.

### The three ticket surfaces mapped to code

| Ticket surface | Handler site | Field | Model |
|---|---|---|---|
| Overview -> Summary (TOOL CALLS card subtitle) | `cli_analytics_handler.py:476` in `get_overview` (def 416) — `"tool_call_success_rate": _pct(tool_success, tool_calls)` | `tool_call_success_rate` | `LocalAnalyticsOverviewKPIs` (models:58), field at models:64 |
| Users tab -> Per-user detail (TOOL SUCCESS column) | `cli_analytics_handler.py:610` in `get_users` (def 559) — `"tool_success_rate": _pct(tool_ok, tool_calls)` | `tool_success_rate` | `LocalAnalyticsUserRow` (models:160), field at models:173 |
| User modal -> Summary (TOOL SUCCESS) | **same path as above** — the user modal has no dedicated endpoint; it reads the same `LocalAnalyticsUserRow` | `tool_success_rate` | same |

So there are only **two** distinct code paths to fix, not three: fixing `get_users` fixes the Users table and the user modal simultaneously; `get_overview` needs a separate change.

Denominator construction, Overview (`cli_analytics_handler.py:456-459`):

```python
tool_calls = sum(_i(r.get("tool_calls")) for r in success_rows if _s(r.get("session_id")) in cost_sessions)
tool_success = sum(
    _i(r.get("tool_calls_success")) for r in success_rows if _s(r.get("session_id")) in cost_sessions
)
```

Denominator construction, Users (`cli_analytics_handler.py:596-597`):

```python
tool_calls = sum(_i(success_by_session.get(sid, {}).get("tool_calls")) for sid in session_ids)
tool_ok = sum(_i(success_by_session.get(sid, {}).get("tool_calls_success")) for sid in session_ids)
```

### Exact current zero-denominator behaviour

The rate is computed **in Python, not in SQL**. Every path returns `0.0`; none returns `None`; none omits the field.

- **Overview** (`:476`): returns `0.0`. With no tool calls the SQL returns **no rows at all**, so `sum([]) == 0` -> `_pct(0, 0)` -> `0.0`.
- **Users / user modal** (`:610`): returns `0.0`. `success_by_session.get(sid, {}).get("tool_calls")` is `None` for a session absent from the result set, `_i(None)` -> `0` (helper at 67-73) -> `_pct(0, 0)` -> `0.0`.
- **Session detail** (`:907`): returns `0.0`. Denominator is `_i(scalars.get("tool_call_count"))`, where the SQL subselect returns **SQL NULL** for no rows -> `_i(None)` -> `0`.
- **Repositories / branches** (`:192`, `:258`): returns `0.0` for a zero-call bucket, and this is explicitly asserted by an existing test.

SQL side — no division, no `CASE WHEN`, no `NULLIF` in any tool-success query:

- `reader.py:495-504` `get_tool_success_by_session` returns only sums and emits **no row** for a session with no `kind = 1` invocations:
  ```sql
  SELECT session_id, sum(calls)::bigint AS tool_calls, sum(success)::bigint AS tool_calls_success
  FROM invocations_hourly
  WHERE kind = 1 AND session_id <> ''{self._scope(f)}
  GROUP BY session_id
  ```
- `reader.py:722` — `(SELECT sum(tool_calls) FROM tool_facts_daily WHERE session_id = $sid::text)::bigint AS tool_call_count` -> **NULL** (not 0) when the session has no tool facts.
- There is **no** `coalesce`/`LEFT JOIN` onto the session list in the tool-success SQL — contrast `get_file_facts_by_session` at `reader.py:486-491`, which *does* `coalesce(fl.files_changed, 0)` over a `LEFT JOIN`. "No tool calls" is represented by a missing row, indistinguishable downstream from an unmatched session id.

Storage shape: counters are pre-aggregated (`invocations_hourly.calls` / `.success`, `tool_facts_daily.tool_calls`), the percentage is computed on read. **No schema change is needed** — the stored counters already distinguish "0 calls" from "0 successes out of N".

### Response model fields (all in `src/codemie/rest_api/models/cli_analytics.py`)

| Model (line) | Field (line) | Declared type / default | In ticket scope |
|---|---|---|---|
| `LocalAnalyticsOverviewKPIs` (58) | `tool_call_success_rate` (64) | `float` — required, no default, no `Field()` | **Yes** (Overview) |
| `LocalAnalyticsUserRow` (160) | `tool_success_rate` (173) | `float = Field(0.0, description="Percent, one decimal (0.0-100.0)")` | **Yes** (Users + user modal) |
| `LocalAnalyticsSessionDetail` (268) | `tool_success_rate` (275-277) | `float = Field(0.0, description="Percent, one decimal (0.0-100.0). _pct(tool_calls_success, tool_call_count).")` | Adjacent (session modal Activity block) |
| `LocalAnalyticsRepositoryRow` (118) | `tool_success_rate` (131-133) | `float = Field(..., description="… Σsuccess / Σcalls, never averaged.")` — required | No (Repositories tab) |
| `LocalAnalyticsRepositoryBranchRow` (102) | `tool_success_rate` (113-115) | `float = Field(..., …)` — required | No |
| `LocalAnalyticsToolWithSuccessRow` (249) | `success_rate` (253) | `float` — required | No (rows exist only when a tool ran) |

Sibling counters shipped alongside the rate on every surface (the UI already has the zero signal today): `total_tool_calls: int` (models:63) on Overview, `tool_calls: int = 0` (models:170) on the user row, `tool_call_count: int = 0` (models:209) and `tool_calls_success: int = 0` (models:274) on session detail, `tool_calls` + `tool_calls_success` on repository/branch rows.

No `@field_serializer`, `model_serializer`, or `model_config` anywhere in this models module — plain Pydantic v2 `BaseModel`s.

Naming is inconsistent: Overview uses `tool_call_success_rate`, everything else uses `tool_success_rate`, per-tool rows use plain `success_rate`. Required-vs-defaulted is also inconsistent across the five fields (bare `float`, `Field(...)`, `Field(0.0, ...)`).

### Integration Points

- **Serialization is hand-rolled**, `routers/cli_analytics.py:338-347`:
  ```python
  def _respond(payload: dict, model_class: Any) -> JSONResponse:
      validated = model_class(**payload)
      body = validated.model_dump(by_alias=True)
      response = JSONResponse(content=body, status_code=status.HTTP_200_OK)
      ...
  ```
  Because handlers return a `JSONResponse`, FastAPI's `response_model=` is OpenAPI documentation only — it does not re-validate or re-serialize. The validation that matters is the explicit `model_class(**payload)` inside `_respond`.
- **A `None` would survive to the wire** — `model_dump(by_alias=True)` with no `exclude_none`; `src/codemie/rest_api/main.py:1016` is plain `app = FastAPI(lifespan=lifespan)` with no `default_response_class`, no custom encoder, no default `response_model_exclude_none`; and the CLI analytics router sets `response_model_exclude_none` on **no** endpoint (contrast `routers/customer_config.py`, `routers/llm_models.py`, which do). CLI analytics is safe from the silent-null-drop hazard.
- **But the models would reject `None` first**: the rate fields are non-nullable `float`, so `model_class(**payload)` raises `ValidationError` (-> 500) the moment a handler returns `None`. The model types must change in the same commit as the handler.
- Response caching in `_respond`: `Cache-Control: private, max-age=300` plus an ETag over the body hash. Deployed clients may serve a cached `0%` body for up to 5 minutes after the fix ships.
- `cli_analytics_handler.py:213` — `_BRANCH_ROW_FIELDS` includes the literal string `"tool_success_rate"`; nested branch dicts are rebuilt by whitelist at `:253`. A renamed/added field must be registered here or it is silently dropped.
- `cli_analytics_handler.py:215-224` — `_REPO_SUM_FIELDS` sums `tool_calls`/`tool_calls_success` raw, deliberately **not** the percentage.
- Inbound dependencies: `LocalAnalyticsHandler` has exactly **one** importer in `src/` — the router (`cli_analytics.py:90`). `rest_api/models/cli_analytics.py` is imported only by the router. Nothing else in the backend reads these rate fields back — they are terminal, write-only into the JSON response. No CSV/export path, no Grafana query, no second aggregation consumes them.
- The real downstream consumer is the external `codemie-ui` (`src/types/localAnalytics.ts`), which is not in this repo.
- Deployment: no CLI-analytics references in `docker/`, `deploy-templates/`, or `grafana-provisioning/`. No manifest needs touching.

### deps_direction

- `codemie.rest_api.routers.cli_analytics` -> `codemie.service.analytics.handlers.cli_analytics_handler` (router:90)
- `codemie.rest_api.routers.cli_analytics` -> `codemie.rest_api.models.cli_analytics` (router:73-84)
- `codemie.rest_api.routers.cli_analytics` -> `codemie.repository.cli_analytics.{factory,filters,hook_events,ports}` (router:60-72)
- `codemie.rest_api.routers.cli_analytics` -> `codemie.service.analytics.{access_filter,cli_analytics_project_gate,delivery_framework,time_parser}` + `handlers.user_identity_resolver` (router:87-92)
- `codemie.service.analytics.handlers.cli_analytics_handler` -> `codemie.repository.cli_analytics.{filters,ports,vocabulary}` (handler:37-39)
- `codemie.service.analytics.handlers.cli_analytics_handler` -> `codemie.service.analytics.delivery_framework`, `handlers.coding_agent_pricing` (handler:40-41)
- `codemie.repository.cli_analytics.ports` -> references `LocalAnalyticsHandler` in a docstring only — no code dependency, no cycle.

### Architecture and Layers Affected

- **API router**: `src/codemie/rest_api/routers/cli_analytics.py` — `/overview` 399-416, `/users` 439-457, `/user-charts` 460-477, `_respond` 338. Likely unchanged by the fix.
- **Service / handler (all computation — primary change site)**: `src/codemie/service/analytics/handlers/cli_analytics_handler.py`.
- **Model / schema (secondary change site)**: `src/codemie/rest_api/models/cli_analytics.py`.
- **Repository port + adapter**: `ports.py`, `postgres/reader.py` — no change expected; the counters already carry the signal.
- **DB migration**: `src/external/alembic_cli_analytics/versions/a1c1a0000001_…` and `…a1c1a0000006_…` — no change needed.
- **Contract guard**: `tests/codemie/rest_api/router_guards/baselines/openapi.json` — must be regenerated.

### Patterns and Conventions

- **One shared rounding helper, one shared zero guard.** `_pct` is deliberately the single producer of every analytics percentage ("Clients display the server value", handler:142). Half-up via `math.floor(x*1000 + 0.5)/10`, one decimal. Locked by `test_pct_tie_and_float_error_values`.
- **Sum raw counters, call `_pct` once per level — never average percentages** (EPMCDME-15585 precedent, documented at handler:228-231 and 273-276). Any fix must preserve this: a 0/0 bucket contributes nothing to a parent sum.
- **Coercion-at-the-edge.** `_i`/`_f`/`_s`/`_iso` turn reader `None`/`Decimal` into `0`/`0.0`/`""` right at the boundary (handler:67, 115, 124, 128). This is precisely what erases the "absent row" signal.
- **Zero-guarded ratios live in one shared module-level helper, never inlined** — see the `_ctx_per_call` docstring (handler:150-152): "The single shared computation reused by get_overview, get_sessions and get_efficiency — none of them may reimplement this division inline."
- **"No data -> null, not 0" is already an established convention in this very domain**, expressed as `X | None = None` plus an explanatory `Field(description=...)`:
  - `avg_session_duration_ms: int | None = None` (models:181) — handler:622 `int(sum(durations) / len(durations)) if durations else None`
  - `avg_cost_per_dead: float | None = None` (models:353) — handler:1100 `(wasted / dead_count) if dead_count else None`
  - `worst_session_ctx_per_call: float | None = None` (models:341)
  - `LocalAnalyticsDispatchRow.duration_ms: int | None = Field(None, description="null when an agent's stop never arrived")` (models:260), with a dedicated test asserting it. **Tool success is the odd one out.**
- **Response-model style**: `{"data": …, "metadata": …}` envelope, `response_model=` on every route, hand-built dicts validated through `_respond(payload, Model)`, `model_dump(by_alias=True)`.
- **Parallel fact queries**: every handler method `asyncio.gather`s 6-8 independent reader queries and joins per-session facts in Python (rationale in module docstring, handler:22-26).
- **Priced-session universe ("D1 rule")**: Overview and Users restrict roll-ups to sessions present in `get_session_cost_facts` (handler:446-449, 619-621), so the denominator is already filtered before `_pct`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/integration/cli-analytics-storage.md` — authoritative storage/aggregation guide; documents `tool_errors`/`tool_calls` derivation, the counter fallback, window semantics, and states the API response contract is fixed.
- `.ai-run/guides/integration/cli-analytics-events.md` — event contract for the six CodeMie CLI events; defines `tool_calls`/`tool_results`/`tool_errors` and the sender-side "missing number is null, never 0" rule.
- `.ai-run/guides/api/endpoint-conventions.md` — response models belong in `src/codemie/rest_api/models/<feature>.py`; no rule on nullable metrics.
- `.ai-run/guides/api/rest-api-patterns.md` — router/service split; warns that any model change trips the OpenAPI snapshot guard.
- `.ai-run/guides/testing/testing-api-patterns.md` — Router Contract Guards: a `float` -> `float | None` change alters the OpenAPI baseline.
- `.ai-run/guides/testing/testing-patterns.md` — tests mirror `src/` under `tests/codemie/...`; the "Seam Tests for Policy Helpers" section applies directly: changing `_pct` needs a callsite test per branch, not just a helper unit test.
- `.ai-run/guides/data/repository-patterns.md` — repositories return data objects, upper layers format; supports making the dash-vs-0 decision in the handler, not the reader.
- `.ai-run/guides/architecture/layered-architecture.md` — router -> service -> repository; formatting decisions belong above the repository.
- `.ai-run/guides/data/database-patterns.md` — SQLModel/Alembic only; not relevant (fix is in the handler, not SQL).
- `.ai-run/guides/quality-gates.md`, `.ai-run/guides/project.md`, `.ai-run/guides/standards/git-workflow.md` — gates and delivery conventions (below).

Full guide inventory: 46 files under `.ai-run/guides/{agents,api,architecture,data,development,integration,security,standards,testing}/` plus root `project.md` and `quality-gates.md`.

### Architectural Decisions

No ADR directory exists in the repo. The recorded decisions bearing on this fix:

1. **One backend rounding rule; clients display the server value** — `cli_analytics_handler.py:138-146` docstring. Implies the dash must be representable in the payload (null), not inferred client-side.
2. **`if not denominator: return 0.0`** — the exact line producing the bug. It is mirrored in the originating design doc `docs/superpowers/specs/2026-07-20-epmcdme-13561-coding-agents-read-endpoints-design.md:780`: "`success_rate` computed in handler: `round(success_count / total_calls * 100, 1) if total_calls > 0 else 0.0`." So **today's 0.0 is a recorded decision, not an oversight** — this ticket reverses a documented choice.
3. **Backend owns `tool_success_rate`; the UI never recomputes or re-averages** — `cli_analytics_handler.py:275-276` docstring citing EPMCDME-15585; model descriptions "Σsuccess / Σcalls, never averaged." (models:114, :132).
4. **Zero-guarded ratios live in one shared helper, never inlined** — `_ctx_per_call` docstring (handler:150-152). `_pct` is shared by Overview, Users, session detail, Repositories, per-tool rows, `bloat_pct` and `dead_sessions.pct_of_sessions`, so editing `_pct` in place propagates well beyond the ticket's AC.
5. **"The API contract is fixed (see design D1/D3/D5/D10/D11)"** — `cli-analytics-storage.md` § Where Code Belongs: "Changing a response shape | The API contract is fixed …; a new reader query goes into the port and the PostgreSQL reader, with a test".
6. **Event-contract rule 4** (`cli-analytics-events.md` § Conventions): "A missing string is `\"\"`; a missing number, boolean, array or object is `null` or is left out. **Never `0`, never a default.**" — the in-feature precedent that argues *for* null here.

### Derived Conventions

- **Nullable metric fields**: no convention documented in `.ai-run/guides/`. Nothing in `endpoint-conventions.md` or `rest-api-patterns.md` addresses nullable metrics. The nearest text is the endpoint-conventions line "Returning persistence objects without considering API shape | Use explicit response models when behavior is user-facing".
- **Zero-denominator representation**: the de facto house style, from the 13561 design doc, is *ratios -> `0.0` on empty denominator; identity/time fields -> `None` when absent* (`date_range_min: str | None  # None when no data`, `last_active_ms: int | None`, `active_ms: int | None`). This ticket moves a ratio into the `None` camp. No guide forbids it, but it contradicts the design doc at `:780` and the field descriptions "Percent, one decimal (0.0-100.0)" — both should be updated with the fix.
- **Counter-precedent inside the same handler**: four ratio/average fields already return `None` for "no data" (`avg_session_duration_ms`, `avg_cost_per_dead`, `worst_session_ctx_per_call`, `LocalAnalyticsDispatchRow.duration_ms`). The convention the fix should follow is therefore already present in-domain.
- **Event contract has no `tool_success_rate`** — it is not on the wire from the CLI; it is derived backend-side only. Numerator/denominator derivation per `cli-analytics-storage.md`: `tool_calls` = `sum(tool_facts_daily.tool_calls)` (rollup); `success` = "an `agent.tool.end` with the same `tool_use_id`, counted on the day of the start".
- Documented known limitation worth noting for QA: "A tool call starts before midnight and its `agent.tool.end` arrives after 01:00 in a later batch | `success` stays 0 on the start's day until that day is recomputed" — i.e. a genuine `0%` is a real state distinct from "no tools".

### Validation commands (verbatim from `.ai-run/guides/quality-gates.md`)

- `make ruff` — "Ruff format completes, `ruff check --fix` applies safe fixes, and final `ruff check` exits successfully."
- `make build`
- `make license-check` (auto-fix `make license-fix`)
- `make gitleaks`
- `make test` — "Pytest exits successfully over `tests/`."
- `make test-cli-analytics-live` — **"Skip if: The change does not touch CLI Analytics SQL (`src/codemie/repository/cli_analytics/postgres/`)."** A handler-only fix skips this gate.
- `make coverage`, `make sonar-local`
- `make verify` — "Ruff, license, gitleaks, and tests complete successfully."
- `make test-harness` — "**Required for the MR compliance bot**: paste the copy-pasted terminal summary … into a `## Test harness` section of the MR description as a code block… Without this section the `auto_epm-cdme_vcs` bot fails checks 3.1 and 3.2."
- Baseline regeneration (per `testing-api-patterns.md`): `poetry run python -m tests.codemie.rest_api.router_guards.regenerate_baselines` — "Regenerating baselines to make a failing guard pass" is listed under Avoid; regenerate only after an intended, reviewed change and review the baseline diff in the MR.
- Guide caveats: "List the current targets rather than trusting a copy here: `grep -nE '^[a-zA-Z_-]+:' Makefile`" and "A gate that could not run is unverified, not passed."

### Delivery conventions (`project.md`, `standards/git-workflow.md`)

Tracker Jira, prefix `EPMCDME`; branch `EPMCDME-12345_short-description`; commit `EPMCDME-####: Description` (colon required); GitLab MR to `main` via `glab mr create`, description from `.gitlab/merge_request_templates/Default.md`; complexity recorded as add-only Jira labels `sdlc-factory-est-<SIZE>` / `sdlc-factory-act-<SIZE>`. No pipeline runs the gates; the regression suite runs when a human posts `/sanity` on the MR.

Run state already exists: `docs/superpowers/tasks/2026-10-26-epmcdme-16322-tool-success-dash/.state.json` -> `{"flow": "sdlc-light", "slug": "epmcdme-16322-tool-success-dash", "branch": "EPMCDME-16322_tool-success-dash", "phase": "main"}` — only `.state.json`, no spec or plan yet.

### Prior related task dirs (`docs/superpowers/tasks/`)

- `2026-10-08-fix_repo-tool-success-aggregation` — **most relevant**: EPMCDME-15585, the previous Tool Success bug. Its `plan.md` Review Focus explicitly chose zero: "Total `tool_calls` across all branches of a repo is 0 … `calcToolSuccessRate` must return `0`, not `NaN`/`Infinity`." Names the exact files and tests this fix will touch.
- `2026-10-07-ctx-per-call-uses-turns-not-api-calls` — closest process precedent: a zero-denominator ratio fix in the same handler that introduced `_ctx_per_call` "next to `_pct`" as a single shared computation; its `code-review-final.json` records approval of that helper style.
- `2026-07-20-epmcdme-13561-coding-agents-read-endpoints` — original build; `plan.md:1868` has the literal `… if total_tools > 0 else 0.0`.
- `2026-09-23-epmcdme-15207-cli-analytics-wasted-cost-pct` — `_pct` rounding expectations; its review notes "new field with default 0.0, consistent with sibling fields".
- `2026-10-14-epmcdme-15584-sessionend-duration-fallback` — full artifact set (technical-analysis.md, qa-report.md, mr-description.md); best template for this ticket's deliverables.
- `2026-10-16-epmcdme-15506-session-start-before-first-activity`, `2026-10-19-epmcdme-16072-member-spend-limit-rounding`, `2026-10-01-cli-analytics-users-avg-duration-priced-sessions`, `2026-10-02-epmcdme-15295-cli-analytics-unit-test-coverage`, `2026-10-05-cli-analytics-repositories-grouped-by-project`, `2026-10-08-cli-analytics-dispatch-attribution`, `2026-09-29-postgres-window-filter`, `2026-10-15-epmcdme-16025-cli-analytics-project-gate-be` — same handler/reader surface.
- Note: there is **no** `EPMCDME-15916` task dir.

Design docs: `docs/superpowers/specs/2026-07-20-epmcdme-13561-coding-agents-read-endpoints-design.md` (origin of the contract being changed), `docs/superpowers/specs/2026-09-23-cli-analytics-postgres-storage-design.md` (the D1/D3/D5/D10/D11 "fixed API contract"), `docs/superpowers/handoffs/2026-09-24-cli-analytics-postgres-storage-handoff.md`.

No mention of CLI analytics in `CHANGELOG.md`; no other changelog/release-notes file exists. No `TODO`/`HACK`/`FIXME`/`DECISION` comments in `src/codemie/service/analytics/**`, `src/codemie/repository/cli_analytics/**`, or `src/codemie/rest_api/models/cli_analytics.py` (the one `NOTE:` found, `service/analytics/query_pipeline.py:550`, is unrelated).

---

## 4. Testing Landscape

### Existing Coverage

- `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py` (1100 lines) — **the only file that asserts `tool_success_rate` numerics**. Relevant functions: `test_repositories_backend_rolls_up_branches_with_nested_tool_success_rate` (L166), `test_repositories_zero_call_branch_does_not_drag_rate_down` (L201), `test_pct_tie_and_float_error_values` (L233, parametrized), `test_overview_avg_context_per_call_divides_by_api_call_count` (L864), `test_get_users_avg_duration_only_priced_sessions` (L732), `test_get_users_avg_duration_none_when_no_priced_sessions` (L739), `test_rows_with_developer_name_also_carry_user_email` (L779), `test_ctx_per_call_helper_divides_and_zero_guards` (L855), plus ~50 others.
- `tests/codemie/service/analytics/handlers/test_cli_analytics_handler_ordering.py` — deterministic ordering/bucketing; stubs `get_tool_success_by_session` (L65) but asserts no rates.
- `tests/codemie/rest_api/models/test_cli_analytics_models.py` — response-model nullability: `test_session_row_repository_nullable`, `test_repository_row_repository_nullable` (passes `tool_success_rate=0.0` at L51), and `test_dispatch_row_keeps_an_unknown_subagent_duration_as_null` — **the precedent for "null, not 0", exactly this ticket's shape**.
- `tests/codemie/rest_api/router_guards/test_openapi_snapshot.py` — `test_openapi_matches_baseline` (`@pytest.mark.enterprise`), exact-text compare against `baselines/openapi.json`.
- `tests/codemie/rest_api/routers/test_cli_analytics_storage_wiring.py` — TestClient against `/overview`, but only 503/error wiring, never payload values.
- `tests/codemie/repository/cli_analytics/postgres/test_reader.py` — `get_tool_success_by_session` only via scope-guard parametrize (L669, L683); no rate math. Live-PG tests skipped unless `TEST_LOCAL_PG_URL` is set.
- `tests/codemie/repository/cli_analytics/test_ports.py` — `test_the_handler_calls_only_queries_the_reader_port_declares` greps handler source for `self._repo.<name>(`; a new reader call would break it.

### Zero-case assertions that pin current behaviour

- `test_cli_analytics_handler.py:220` — `assert branches["no-calls"]["tool_success_rate"] == 0.0  # denominator-guarded display, not a vote` — **the one assertion that must flip**. Its docstring (L202-203, EPMCDME-15585 AC3) stays valid; only the expected value changes — and only if the Repositories tab is included in scope.
- `test_cli_analytics_handler.py:190` — `assert branches["sweep-cd"]["tool_success_rate"] == 0.0` — **must NOT change**: 1 call / 0 success is a real 0% (ticket AC: "including a real 0% when all calls failed").
- `test_cli_analytics_handler.py:859` — `assert _ctx_per_call(1000, 0) == 0.0` — different helper, keep.
- `tests/codemie/rest_api/models/test_cli_analytics_models.py:51` — `tool_success_rate=0.0` is a constructor argument, not an assertion; still valid after the change.
- **No test anywhere asserts the Overview `tool_call_success_rate` or the per-user `tool_success_rate` at all** — zero or otherwise.

### Testing Framework and Patterns

- pytest `^8.3.1`, `pytest-asyncio ^1.4.0`, `pytest-cov ^7.1.0`, `pytest-env ^1.1.3`, `pytest-mock ^3.14.0`, `pytest-httpx ^0.35.0`, `pytest-xdist ^3.6.1`. Python 3.12+, Poetry.
- Config in `pytest.ini` (not pyproject): `testpaths = tests`, `pythonpath = src`, `addopts = --import-mode=importlib -n 3`, `asyncio_default_fixture_loop_scope = function`. **asyncio mode is strict** (not `auto`) -> every async test needs an explicit `@pytest.mark.asyncio`. Only marker: `enterprise` (runs by default, skipped with `--skip-enterprise`). Injected env: `ENV=local`, `REPOS_LOCAL_DIR=./codemie-repos`, `PG_URL=postgresql://pg:pg123@localhost:111/postgres` (a dead port on purpose). No coverage thresholds wired into addopts.
- conftests that apply: `tests/conftest.py` (only one covering the handler and model tests) — `load_dotenv(tests/.env.test)`, `--skip-enterprise` option, autouse `isolate_run_reporting_state`, session-scoped autouse `mock_database_engine` patching `PostgresClient.get_engine`. Plus `tests/codemie/rest_api/conftest.py` (autouse `reset_client_source`) and `tests/codemie/rest_api/routers/conftest.py` (autouse `_inject_request_uuid`). **No conftest under `tests/codemie/service/analytics/`** — handler tests are self-contained.
- **Repo mocking, not DB**: `repo = MagicMock()` with each reader method as `AsyncMock(return_value=[...])`, then `LocalAnalyticsHandler(repo)`. Factories in the handler test file: `make_handler(cost_facts=None)` (L29, sessions), `make_repo_handler(cost_facts)` (L119, repositories), ad-hoc `_users_repo(user_rows)` (L709, users). The Overview path has **no** factory — L866-888 builds its own `MagicMock` with all 8 reader methods.
- **Fixture data = module-level raw dicts spread with `**`**: `BASE_COST_ROW` (L41), `BASE_COST_FACT` (L129), overridden per test. No factory-boy, no builders, no DB inserts in this area (the `support/` builders exist only under `tests/codemie/repository/cli_analytics/support/`).
- **Per-test override of a single reader method after construction** — e.g. `handler._repo.get_tool_success_by_session = AsyncMock(return_value=[{"session_id": "s1", "tool_calls": 1, "tool_calls_success": 0}])` (L176-181, L209-214, L240-242). This is exactly the hook needed for a zero-tool-call case.
- **Direct handler calls, never TestClient, for metric values.** `TestClient` is used only in `rest_api/routers/*` and only for status codes/wiring.
- **Exact equality for numeric asserts** (`== 75.0`, `== 0.0`, `is None`). No `pytest.approx`, no snapshot/syrupy in this area; the only snapshot is the OpenAPI text baseline. No `freezegun` — time is pinned by literal `datetime(2026, 1, 1)` constants.
- **Pydantic round-trip assertion pattern**: build the model from the handler dict and `model_dump(by_alias=True)` to prove the contract survives serialization (L844-852, L921-926, and `test_dispatch_row_keeps_an_unknown_subagent_duration_as_null`). This is the pattern for proving `None` serializes as `null`.
- Style: flat module-level functions (no classes, no AAA comments), a docstring naming the ticket and invariant on each non-obvious test, long descriptive snake_case names, `@pytest.mark.parametrize` with a name tuple + list of tuples for numeric tables (L223-231), trailing `#` comments to justify a surprising expected value.

### Coverage Gaps

- **Overview summary** (`get_overview` -> `kpis["tool_call_success_rate"]`, handler:476) — **no test asserts this field at all**, zero-call or otherwise. Only `avg_context_per_call` is covered on that path.
- **Per-user list / user modal** (`get_users` -> row `tool_success_rate`, handler:610) — **no test asserts this field**; the two existing `get_users` tests cover only `avg_session_duration_ms`, and `_users_repo` returns `[]` for `get_tool_success_by_session`, so the rate is never exercised.
- **Session detail** (handler:907) — no test for the rate (its tests cover only cache-read pricing and model lists).
- Only the Repositories path (handler:192, :258) has any `tool_success_rate` coverage — and it is the one path whose zero-case expectation is currently the opposite of the new AC.
- **`_pct` itself has no direct unit test for the `denominator == 0` branch** (handler:144-145) — only indirect coverage, in contrast to its sibling `test_ctx_per_call_helper_divides_and_zero_guards`.

**Obvious home for a test-first fix**: `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py` — it already imports `_pct` and `LocalAnalyticsHandler`, already owns the only `tool_success_rate` assertions (including the line that must flip at `:220`), and already has mock scaffolding for all affected paths (`make_repo_handler`, `_users_repo`, the inline Overview mock). A failing-first test per surface plus a direct zero-denominator guard test can be added with no new scaffolding.

---

## 5. Configuration and Environment

### Environment Variables

All defined in `src/codemie/configs/config.py` (pydantic `Settings`; **no `os.environ`/`os.getenv` anywhere in the CLI-analytics code path**):

- `ANALYTICS_DEFAULT_PAGE_SIZE` (:201), `ANALYTICS_INGEST_MAX_BODY_BYTES` (:204, 5 MiB)
- `CLI_ANALYTICS_PG_URL` (:209 — empty means use the application DB; in the sensitive-keys redaction list at :1101), `CLI_ANALYTICS_PG_SCHEMA` (:210, default `codemie_analytics`), `CLI_ANALYTICS_PG_POOL_SIZE` (:211), `CLI_ANALYTICS_PG_STATEMENT_TIMEOUT_MS` (:212), `CLI_ANALYTICS_PG_WORK_MEM` (:213), `CLI_ANALYTICS_PG_INGEST_ACQUIRE_TIMEOUT_MS` (:216), `CLI_ANALYTICS_PG_INGEST_STATEMENT_TIMEOUT_MS` (:219)
- Retention/rollup: `CLI_ANALYTICS_RAW_RETENTION_DAYS` (:220), `CLI_ANALYTICS_ROLLUP_RETENTION_DAYS` (:221), `CLI_ANALYTICS_SESSION_RETENTION_DAYS` (:225), `CLI_ANALYTICS_SESSION_PURGE_BATCH_SIZE` (:227), `CLI_ANALYTICS_DEDUP_RETENTION_DAYS` (:230), `CLI_ANALYTICS_ROLLUP_REFRESH_SECONDS` (:231), `CLI_ANALYTICS_ROLLUP_BATCH_SIZE` (:232), `CLI_ANALYTICS_PARTITION_PREMAKE_WEEKS` (:233), `CLI_ANALYTICS_MAINTENANCE_INTERVAL_MINUTES` (:234). Validator `_check_cli_analytics_retention` at :1004-1008.

**Nothing in this bug's path is configurable** — `tool_success_rate` is computed in code, with no thresholds or flags.

### Configuration Files

- `src/codemie/configs/config.py:200-234` — all CLI-analytics settings.
- `config/customer/customer-config.yaml:119-136` — component `features:cliAnalytics` (`enabled: false` by default).
- `src/codemie/repository/cli_analytics/postgres/settings.py` — reads `CLI_ANALYTICS_PG_*` into the storage/pool settings object.
- `src/external/alembic_cli_analytics/env.py` — online-only migrations; unqualified names so they apply to whatever `CLI_ANALYTICS_PG_SCHEMA` names; version table `cli_analytics_alembic_version`.

### Feature Flags and Deployment Concerns

- `features:cliAnalytics` (customer config) gates the whole feature — enforced at `routers/cli_analytics.py:140-144` (`_ensure_enabled()` -> 404 "Local Analytics feature is not available") on every ingest and read endpoint, and at `service/analytics/cli_analytics_jobs.py:89` for the background rollup runtime. `features:cliAnalytics.deliveryFramework` is consumed at `service/analytics/delivery_framework.py:45` and `service/usage_attribution/handler.py:146-149` — unrelated to tool success.
- **No flag anywhere toggles metric shape, rounding, or null-vs-zero behaviour.**
- **Frozen OpenAPI contract**: `tests/codemie/rest_api/router_guards/baselines/openapi.json` is a byte-for-byte committed baseline pinning `tool_call_success_rate` (:15581, in `required` at :15632) and `tool_success_rate` (:15745/:15765, :15842/:15862, :16070, :16561) as `"type": "number"`. Comparison helper `tests/codemie/rest_api/router_guards/baseline.py:54-74`. A `float | None` change turns these into `anyOf [number, null]` and may drop them from `required` -> the guard **will** fail until regenerated.
- No generated client, SDK, or schema-export file in this repo pins these fields. No frontend code in this repo.
- No CLI-analytics references in `docker/`, `deploy-templates/`, or `grafana-provisioning/`; no dashboard reads tool success. `tests/codemie/standalone/test_standalone_compose_contract.py` references `CLI_ANALYTICS_PG_URL` only for config plumbing.
- **Response cache**: `Cache-Control: private, max-age=300` + ETag in `_respond` means up to 5 minutes of stale `0%` after deploy — a verification caveat, not a code change.

---

## 6. Risk Indicators

- **`_pct` is shared by nine call sites — editing it in place silently changes five surfaces outside the ticket's AC.** Changing `return 0.0` to `return None` at `cli_analytics_handler.py:144-145` would also alter `bloat_pct` (:486 overview, :765 session row, :900 session detail, :1093 efficiency), `dead_sessions.pct_of_sessions` (:1098), per-tool `success_rate` (:846, :1006) and repository/branch `tool_success_rate` (:192, :258). The in-repo precedent (`_ctx_per_call`, EPMCDME-15584-era review) favours a **new dedicated helper** over mutating `_pct`.
- **A `None` returned today causes a 500, not a dash.** `_respond` validates via `model_class(**payload)` (`routers/cli_analytics.py:339`); the rate fields are non-nullable `float` (models:64, :173, :275, :113, :131, :253). The handler change and the model change must land together or the endpoint breaks.
- **The frozen OpenAPI baseline will fail** (`test_openapi_matches_baseline`). Regeneration via `poetry run python -m tests.codemie.rest_api.router_guards.regenerate_baselines` is a deliberate, reviewed action — `testing-api-patterns.md` lists "regenerating baselines to make a failing guard pass" under Avoid, so the baseline diff must be reviewed in the MR.
- **This reverses a recorded decision, not an accident.** `docs/superpowers/specs/2026-07-20-epmcdme-13561-…-design.md:780` specifies `… else 0.0`, and EPMCDME-15585's plan explicitly required `0` for a zero-call repo. `cli-analytics-storage.md` states "The API contract is fixed (see design D1/D3/D5/D10/D11)". The field descriptions "Percent, one decimal (0.0-100.0)" become wrong and must be updated with the fix.
- **Contract change for an out-of-repo consumer.** The models' docstring (models:15-21) names `codemie-ui` `src/types/localAnalytics.ts` as the contract counterparty; that file is not in this repo. The field goes from always-present number to nullable — a UI doing `rate.toFixed(1)` will break. A backend-only fix is incomplete without paired UI handling, and the two must ship compatibly.
- **An alternative no-contract-change fix exists and should be adjudicated explicitly**: the sibling counter is already on every payload (`total_tool_calls` on Overview, `tool_calls` on the user row, `tool_call_count` on session detail), so the UI can already derive the dash today. Choosing the backend-null route is a deliberate contract change; choosing the UI route makes this a non-backend ticket. The handler docstring at :142 ("Clients display the server value") and the event-contract rule "Never `0`, never a default" both argue for the backend-null route, but this is a decision the spec must record, not assume.
- **Scope boundary is genuinely ambiguous.** The AC names three surfaces (= two code paths), but the identical defect exists on Repositories (:192, :258) and session detail (:907). Leaving them at `0.0` creates an inconsistent API where the same field name means different things on different endpoints; fixing them exceeds the AC. Flag for product decision.
- **Zero existing test coverage for both in-scope surfaces.** No test asserts Overview `tool_call_success_rate` or per-user `tool_success_rate` at all. The only `tool_success_rate` coverage is on the out-of-scope Repositories path. There is also no direct unit test of `_pct`'s zero branch. A test-first fix is building coverage from nothing on the paths that matter.
- **One existing assertion must flip and an adjacent one must not** — `test_cli_analytics_handler.py:220` (`"no-calls"` -> currently `0.0`) vs `:190` (`"sweep-cd"`, 1 call / 0 success -> a real `0.0`). Getting these backwards silently violates the second AC.
- **`_BRANCH_ROW_FIELDS` whitelist** (`cli_analytics_handler.py:213`) rebuilds nested branch dicts by name; any new or renamed field not registered there is silently dropped from nested branch rows.
- **Required-vs-defaulted inconsistency across the five rate fields** (bare `float`, `Field(...)`, `Field(0.0, ...)`) means a uniform nullable change is five separate edits with three different shapes, plus the OpenAPI `required` lists.
- **Coercion-at-the-edge erases the signal** — `_i(None) -> 0` (handler:67-73) plus tool-success SQL that emits no row (no `coalesce`/`LEFT JOIN`, unlike `get_file_facts_by_session` at reader:486-491). "No tool calls" and "session not in the result set" are indistinguishable after `_i`. The fix must distinguish them above the coercion boundary (sum the raw counters and test the denominator), not inside `_pct`.
- **Deployed clients may show stale `0%` for up to 5 minutes** after the fix (`Cache-Control: private, max-age=300` in `_respond`) — a QA-verification trap, not a bug.
- **No pipeline runs the gates** in this repo; `make test-harness` output is mandatory in the MR description for the `auto_epm-cdme_vcs` bot, and regression requires a human `/sanity` on the MR.
- Minor: `make test-cli-analytics-live` is skippable only because this fix should not touch `repository/cli_analytics/postgres/`. If a reader query changes, that gate becomes mandatory and `test_ports.py::test_the_handler_calls_only_queries_the_reader_port_declares` comes into play.

---

## 7. Summary for Complexity Assessment

**Layers and change surface.** This is a narrow, single-module defect with a wide contract blast radius. All computation lives in one file — `src/codemie/service/analytics/handlers/cli_analytics_handler.py` — and the root cause is one line: `if not denominator: return 0.0` in the shared `_pct` helper at :144-145. The three UI surfaces in the AC collapse to **two** handler call sites (Overview `:476` and `get_users` `:610`; the user modal has no dedicated endpoint and reuses `LocalAnalyticsUserRow`). The expected change set is small and well-bounded: the handler (one new zero-aware helper plus two call sites), 2-3 Pydantic fields in `src/codemie/rest_api/models/cli_analytics.py` (`:64`, `:173`, and `:275` if session detail is included), the committed OpenAPI baseline `tests/codemie/rest_api/router_guards/baselines/openapi.json`, and new tests in one existing test file. Realistically **4-6 files**, no SQL change, no migration, no router change, no config, no deployment manifest. Only two layers are genuinely touched (service/handler and response model), plus one generated contract artifact.

**Technical novelty.** Low on mechanics, non-trivial on judgment. The pattern to follow already exists inside the same handler: four sibling ratio/average fields already return `None` for "no data" (`avg_session_duration_ms` models:181, `avg_cost_per_dead` models:353, `worst_session_ctx_per_call` models:341, `LocalAnalyticsDispatchRow.duration_ms` models:260 with the explicit description "null when an agent's stop never arrived" and its own test). Serialization is already null-safe: no global or per-route `exclude_none`, and `_respond` does `model_dump(by_alias=True)`, so a `None` reaches the wire as JSON `null` — but only after the model type allows it, otherwise the endpoint 500s. What raises the difficulty above "trivial" is three decisions a spec must settle rather than assume: (1) `_pct` is shared by nine call sites, so the fix needs a separate helper rather than an in-place edit, or it silently changes `bloat_pct`, `dead_sessions.pct_of_sessions`, per-tool rates and the Repositories tab; (2) this **reverses an explicitly recorded decision** — the originating design doc specifies `… else 0.0` and EPMCDME-15585's plan demanded `0` for a zero-call repo, while `cli-analytics-storage.md` declares the API contract fixed; (3) the scope boundary is ambiguous, since the identical defect exists on Repositories and session detail, and leaving them makes the same field name mean different things on different endpoints. There is also a credible **zero-backend-change alternative**: every payload already ships the sibling counter (`total_tool_calls`, `tool_calls`, `tool_call_count`), so the UI can derive the dash today — and since the real consumer (`codemie-ui` `src/types/localAnalytics.ts`) is outside this repo, the backend-null route is a cross-repo contract change that needs paired UI work to avoid a `rate.toFixed(1)` break.

**Test coverage posture.** Mixed, and worse than it first appears on exactly the paths that matter. The two in-scope surfaces have **zero** assertions on the rate field — no test touches Overview `tool_call_success_rate` or per-user `tool_success_rate` at all — and `_pct`'s zero branch has no direct unit test. The only existing `tool_success_rate` coverage sits on the out-of-scope Repositories path, where `test_cli_analytics_handler.py:220` actively asserts the *old* behaviour (`== 0.0` for a no-calls branch) and must flip, while the adjacent `:190` (1 call / 0 success) must stay `0.0` to satisfy the second AC — an easy pair to get backwards. The upside is excellent scaffolding: `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py` already imports `_pct` and `LocalAnalyticsHandler`, has mock factories for every affected path, uses per-test `AsyncMock` overrides of `get_tool_success_by_session` (exactly the hook for a zero-call fixture), and has an established Pydantic round-trip pattern for proving `None` serializes as `null`. A test-first fix has an unambiguous home with no new scaffolding.

**Key risk factors for scoring**: shared-helper blast radius across nine call sites; a frozen OpenAPI baseline that fails until deliberately regenerated (and whose regeneration is listed under "Avoid" in the testing guide); reversal of a documented architectural decision across three design docs; a cross-repo UI contract change with no UI code in this repo; an unsettled scope boundary (Repositories and session detail); and zero baseline coverage on both in-scope paths. Mechanically this is a handful of lines; procedurally it carries contract-change ceremony (baseline regeneration, guide/description updates, `/sanity` handoff, `make test-harness` in the MR description) and needs an explicit spec decision on backend-null vs UI-derived before implementation starts.
