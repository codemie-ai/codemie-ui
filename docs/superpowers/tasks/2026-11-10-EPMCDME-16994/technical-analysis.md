# Technical Research

**Task**: cli-analytics activity timezone heatmap
**Generated**: 2026-11-10
**Research path**: filesystem (cross-repository: UI `codemie-ui`, backend `codemie`)

---

## 1. Original Context

Environment
Production https://codemie.lab.epam.com, backend 2.65.3 (UI release notice: 2.65.0)
Browser time zone Europe/Madrid (UTC+1)
Checked 2026-11-07 ~21:40 UTC, read-only, with the reporter's own sessions
Steps to reproduce
In a browser whose time zone is not UTC, open Analytics > CLI Analytics and set Users = yourself.
Set Start date and End date to the minute a known session started, in local time (here 11/07/2026 19:37 - 11/07/2026 19:37).
Sessions tab: note the session's Date. Activity tab: note the hour column of the heatmap cell and the "By hour of day" bar.
Actual result
Session    Sessions tab Date (local, UTC+1)    Activity heatmap / By hour of day    Activity weekday
32929fc3-8756-4726-910e-a0bfb821c331    Nov 07, 19:37    hour 18    Sat
8ac53605-1c95-4576-87c9-d77d73ce5cbc    Nov 01, 18:44    hour 17    Sun
GET /v1/analytics/cli-analytics/activity returns by_hour with the count at index 18 (resp. 17), i.e. the UTC hour of the session start.
The widgets do not say that they use UTC, while the date filter, the Sessions table and the session detail use the browser's local time.
Expected result
"Sessions by weekday x hour", "By hour of day" and "By weekday" use the same time zone as the date filter and the Sessions table (the browser's local time), as already done for session times in EPMCDME-15437.
Alternatively, if UTC is intended, the three widgets state "UTC" explicitly.
Technical root cause
Backend cli_analytics_handler.get_activity buckets get_session_start_times rows with started.weekday() and started.hour of the UTC datetime and returns only the aggregated 7x24 / 24 / 7 arrays.
UI ActivityView renders the indices as they are. Because the API returns pre-aggregated UTC buckets and no time-zone parameter, the UI cannot convert them.
Impact
Hour-of-day and weekday usage patterns are shifted by the viewer's UTC offset (1 h here, up to 12 h elsewhere); sessions that start within that offset of midnight are shown on a different weekday than in the Sessions table (derived from the code, not observed here).
The Activity tab disagrees with the filter the user just set: a 19:37 filter shows activity at 18:00.
Evidence
Attached activity-utc-hour.jpg: filter 11/07/2026 19:37 - 19:37 (local), heatmap cell in column 18.
Related (not duplicates)
EPMCDME-15437 (Closed): session times shown in UTC in the Sessions table and session details; its acceptance criteria excluded backend changes and did not cover the Activity tab.
EPMCDME-15517: Activity tab counts sessions that the other tabs exclude (session set, not time zone).

---

## 2. Codebase Findings

Paths: UI = `codemie-ui/`, BE = `codemie/src/codemie/`.

### Existing Implementations

**Purpose A — show when sessions start by weekday/hour (Activity tab).**
- BE route `GET /v1/analytics/cli-analytics/activity` — `rest_api/routers/cli_analytics.py:668-686`. Params: only `FilterParams` (`time_period`, `start_date`, `end_date`, `users`, `projects`, `repositories`, `subscription_type`, `project_origin`; `cli_analytics.py:320-345`). No time-zone parameter. Gated by `_admin_gate`; scope from `filters.resolve(user)`.
- BE handler `LocalAnalyticsHandler.get_activity` — `service/analytics/handlers/cli_analytics_handler.py:1222-1236`. Loops rows, skips non-`datetime`, `weekday = started.weekday()` (Mon=0), `hour = started.hour`, fills `heat[7][24]`, `by_hour[24]`, `by_weekday[7]`. Returns aggregates only.
- BE reader `get_session_start_times` — `repository/cli_analytics/postgres/reader.py:1505-1511` (port `repository/cli_analytics/ports.py:398`): `SELECT session_start AS started_at FROM act` over `_sessions_cte(f)` + `_activity_cte()` (`reader.py:739-747`). Values pass `normalise` → naive UTC (`reader.py:479`: `astimezone(utc).replace(tzinfo=None)`). So `started.hour` is the UTC hour.
- BE response model `LocalAnalyticsActivityData` — `rest_api/models/cli_analytics.py:396-399`; `heat` description explicitly says "weekday 0=Mon..6=Sun, UTC". `by_hour`/`by_weekday` descriptions do not mention UTC.
- UI type `CliAnalyticsActivityData` — `src/types/cliAnalytics.ts:218-222` (comment omits UTC).
- UI fetch: `cliAnalyticsStore.fetchActivity` — `src/store/cliAnalytics.ts:194-203` via `useCliAnalyticsSlice('activity', …)` (`cli-analytics/hooks/useCliAnalyticsSlice.ts`) and `useCliAnalyticsActivity`. Params from `buildCliAnalyticsParams` (`hooks/params.ts`) — passes `start_date`/`end_date` through unchanged, no tz field.
- UI render `ActivityView` — `src/pages/analytics/components/cli-analytics/views/ActivityView.tsx:33-146`: renders `heat[wd][h]`, `by_hour[i]`, `by_weekday[i]` by index; titles "Sessions by Weekday and Hour", "Sessions by Weekday", "Sessions by Hour of Day"; descriptions do not mention a time zone. Axis `WEEKDAYS_MON_FIRST` from `components/utils/usagePatterns.ts`.
- Sibling, same purpose: CLI Insights "Usage Patterns" — BE `service/analytics/handlers/cli/insights_handler.py:766-811` (`_get_cli_time_pattern_rows`): Elasticsearch `date_histogram` `calendar_interval: hour` with **no `time_zone`**, weekday/hour taken from UTC bucket keys. Also UTC, also no tz param (`rest_api/routers/analytics/cli_insights.py:40-80`). UI `CLIInsightsTab.tsx` uses `toMonFirstWeekdays`/`toAllHoursOfDay`.

**Purpose B — show session times in the viewer's local time (EPMCDME-15437 approach).**
- UI `parseDate` — `src/utils/helpers.ts:43-49`: reads the string in `'utc'` (production) or the browser zone (development mode) then `setZone(browser zone)`. `formatDateTime` (`helpers.ts:76-95`) uses it. Sessions table (`views/SessionsView.tsx:38`), session detail "Started" (`views/SessionBody.tsx:140`), Users "last active" (`views/UsersView.tsx:125`) call `formatDateTime`.
- Commit `87ccf71a1` "EPMCDME-15437: Show CLI Analytics times in the user's local time zone" added `formatLocalDateTime` in `format.ts`; it exists only on `origin/EPMCDME-15437_cli_analytics_time_fix` and is **not an ancestor of HEAD**; `format.ts` on HEAD has no local/UTC helper. Its message: "The date filter and the request parameters are unchanged."

**Purpose C — raw per-session start times the UI could bucket itself.**
- `GET /sessions` returns `start_time` per row (`models/cli_analytics.py:247-259`), paginated, `per_page ≤ MAX_PER_PAGE = 1000` (`cli_analytics.py:110, 728`). It uses `filters.resolve_sessions(...)` (own-Personal-only for non-admins, optional `personal_only`), **not** `resolve` like `/activity`; no `_admin_gate`. No other endpoint returns the start-time list behind `/activity` (searched `get_session_start_times`: only `get_activity` consumes it).

### Decisions Already in the Code
- Buckets computed server-side in Python from UTC naive datetimes, aggregates only returned — `cli_analytics_handler.py:1222-1236`. Alternative: SQL `AT TIME ZONE <tz>` or returning raw times. Reason: none found beyond the model's "UTC" note.
- Analytics-wide convention: everything UTC on the wire. `reader.py:164-175` ("`day` columns are always written in UTC"), `routers/analytics/activity.py:247-250` ("All timestamps are in UTC timezone"), `FilterParams` normalises `start_date`/`end_date` via `to_utc` (`cli_analytics.py:339-340`). The UI date filter sends ISO strings; localisation happens in the UI on display (`parseDate`).
- No analytics endpoint in BE accepts a tz name or offset (searched `time_zone|tz_name|utc_offset|timezone: str` across `rest_api/routers/analytics/` and `cli_analytics.py`: none). Time-zone parameters exist only in non-analytics features (datasource scheduler cron; UI commits `57bc77025`, `bcd38ec6c`).
- Data shape vs need: stored/returned as UTC-bucketed counts; the task needs local-zone buckets. Hour-level UTC buckets cannot be re-bucketed for non-whole-hour offsets, and a 7x24 UTC heat **can** be rotated by a whole-hour offset, but the result is wrong across DST transitions inside the window and for 30/45-min zones (facts of the data, not a recommendation).

### Task Statements Checked Against the Code
- "get_activity buckets … with started.weekday() and started.hour of the UTC datetime and returns only the aggregated arrays" — **holds** (`cli_analytics_handler.py:1229-1236`, `reader.py:479`).
- "API returns … no time-zone parameter" — **holds** (`cli_analytics.py:320-337, 674-678`).
- "UI ActivityView renders the indices as they are" — **holds** (`ActivityView.tsx:47, 62, 99`).
- "date filter, Sessions table and session detail use the browser's local time" — **holds for production builds** via `parseDate` (`helpers.ts:43-49`); in development mode `parseDate` reads the value in the browser zone.
- "as already done for session times in EPMCDME-15437" — **partly contradicted**: the 15437 helper commit is not on HEAD; current local display relies on `parseDate`.
- "EPMCDME-15437 … excluded backend changes" — unverified (ticket text; commit message is consistent).
- "Alternatively … widgets state UTC" — **keeps** `get_activity` UTC bucketing in place; consumers: `ActivityView` only (UI), plus BE tests below.
- CLI Insights Usage Patterns has the same UTC behaviour — not mentioned by the task.

### Consumers of Changed Contracts
- `/activity` response & `get_activity`: UI `store/cliAnalytics.ts:194-203`, `useCliAnalyticsSlice.ts`, `useCliAnalyticsActivity.ts`, `ActivityView.tsx`; UI tests `__tests__/ActivityView.test.tsx`, `__tests__/CliAnalyticsTab.test.tsx`. BE tests `tests/codemie/repository/cli_analytics/postgres/test_live_costless_sessions.py:310,339` (sum of `by_hour` only).
- `/activity` query params: OpenAPI snapshot guard `tests/codemie/rest_api/router_guards/baselines/openapi.json` (contains the route; `test_openapi_snapshot.py`, `regenerate_baselines.py`).
- `FilterParams` is shared by every `/cli-analytics/*` route (`cli_analytics.py:320`).
- `get_session_start_times`: only `get_activity`; tests `test_reader.py:520-525,1333`, `test_reader_live_session_range.py:153`, `test_live_session_binding.py:593-597`.

### Architecture and Layers Affected
UI: view (`ActivityView`), hook/params (`useCliAnalyticsSlice`, `params.ts`), store (`cliAnalytics.ts`), types. BE: router (`cli_analytics.py` `get_activity`, `FilterParams`), handler (`get_activity`), reader (`get_session_start_times`), response model.

### Integration Points
UI → `api.ts` → BE `/v1/analytics/cli-analytics/activity` → Postgres analytics reader. Sibling CLI Insights → Elasticsearch `date_histogram`.

### Patterns and Conventions
UI slice fetch via `useCliAnalyticsSlice` + `fetchWithState` with abort controllers; Valtio store. BE routes: `@handle_errors`, `_ensure_enabled()`, `filters.resolve(user)`, `_respond(..., ResponseModel)`, `_metadata(...)`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` present (architecture, development, patterns, testing…); no guide mentions time zone/timezone.

### Architectural Decisions
BE `routers/analytics/activity.py:247-250` and `reader.py:164` document UTC-everywhere. Model field description "UTC" at `models/cli_analytics.py:397`.

### Derived Conventions
Server returns UTC; UI localises at display via Luxon (`parseDate`).

---

## 4. Testing Landscape

### Existing Coverage
UI `ActivityView.test.tsx`: renders widgets with zero data, error state; no assertion on bucket placement or tz. BE: no unit test of `get_activity` bucketing in `tests/codemie/service/analytics/handlers/test_cli_analytics_handler.py` (no `get_activity` hit); live Postgres tests only check totals.

### Testing Framework and Patterns
UI: Vitest + RTL, hook mocked with `vi.mock`, `mockReturnValueOnce`. BE: pytest, live-Postgres tests, SQL recorder (`_sql_of`) in `test_reader.py`, OpenAPI snapshot guard.

### Coverage Gaps
Weekday/hour placement (any zone), DST, midnight crossing — untested in both repos.

---

## 5. Configuration and Environment

### Environment Variables
None tz-related in the feature area.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
`_ensure_enabled()` gate on CLI analytics routes. UI and BE release separately (UI 2.65.0, BE 2.65.3 in prod).

**Backend repo state**: `/Users/Sviatoslav_Likhtarchyk/mdtu_gpt/codemie` is on `main`, 2 commits behind `origin/main`, with a modified `.codemie/codemie-cli.config.json` and untracked review dirs; no EPMCDME-16994 branch exists. A feature branch would need to be created.

---

## 6. Risk Indicators

- Speculative: a UI-only fix has no raw data source with the same session set — `/sessions` uses `resolve_sessions` scope and pagination (≤1000/page), unlike `/activity`'s `resolve` (see Purpose C).
- Speculative: rotating the UTC 7x24 heat by the browser offset is exact only for fixed whole-hour offsets with no DST change inside the window.
- A BE param change touches shared `FilterParams` or the `get_activity` signature and the OpenAPI snapshot baseline.
- CLI Insights Usage Patterns (`insights_handler.py:766`) has the same UTC bucketing; the task's "state UTC" alternative keeps both in place.
- 15437 helper (`formatLocalDateTime`) is not on HEAD; local display relies on `parseDate`, which behaves differently in development mode — local verification in `npm run dev` may mislead.
- Cross-repo coordination: UI and BE release independently; backend repo has no task branch.
- No tests for bucket placement in either repo.

---

## 7. Summary for Complexity Assessment

The Activity tab's three widgets are fed by one endpoint, `GET /v1/analytics/cli-analytics/activity`, whose handler (`get_activity`) buckets naive-UTC session starts into 7x24/24/7 arrays and returns only aggregates. The route accepts only the shared `FilterParams`; no analytics endpoint in the backend accepts a time-zone name or offset, and the whole analytics stack is UTC on the wire with localisation in the UI (`parseDate`). The sibling CLI Insights Usage Patterns is also UTC-bucketed. On the UI side the surface is small: `ActivityView.tsx`, the slice hook/params, store and type.

No endpoint exposes the same session set's raw start times: `/sessions` returns `start_time` but with a different scope resolver (`resolve_sessions`) and pagination, so the UI cannot re-bucket the exact `/activity` set from it. Re-rotating the UTC buckets client-side is possible only as an offset shift and is inexact across DST or for non-hour offsets. A local-zone result matching the ticket's expectation rests on backend data that only `get_session_start_times`/`get_activity` hold.

Test posture is thin: UI tests only check widgets render; backend tests only check `by_hour` totals; the OpenAPI snapshot guard will flag any route-param change. The backend checkout is on `main` (2 behind origin, a local config modification) with no task branch.

---

## 8. External References

None named by the task as a file path. Backend repo (`/Users/Sviatoslav_Likhtarchyk/mdtu_gpt/codemie`) was named by the caller and researched in Section 2. Attachment `activity-utc-hour.jpg` not available locally.
