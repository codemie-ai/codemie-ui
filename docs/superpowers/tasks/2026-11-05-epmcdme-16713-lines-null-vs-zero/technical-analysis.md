# Technical Research

**Task**: cli-analytics lines net_lines null format
**Generated**: 2026-11-05
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-16713 (UI half) — [CLI Analytics] Lines+, Lines- and Net lines show 0 when line data is missing. Backend now returns null (number | null) for lines_added, lines_removed, net_lines when a session has no line source; real zero stays 0. Aggregates are null only if every underlying session is unknown. Mixed sessions are NOT flagged (accepted limitation).
UI must: (1) not crash on null (currently RepositoriesTable.tsx calls row.lines_added.toLocaleString() on null -> full-page error); (2) show unknown as '–' (tooltip 'Not reported — no line data was received for this session' where tooltips already exist), never 0; (3) keep real zeros as 0 and existing numbers unchanged.
Endpoints under /v1/analytics/cli-analytics: /repositories (row + each branch row: lines_added, lines_removed, net_lines), /sessions (net_lines), /sessions/{id} (net_lines), /users (net_lines), /overview (net_lines in KPI block and daily buckets), /efficiency (code changes net_lines).
Files per handoff: src/types/cliAnalytics.ts (lines ~42,63,112,126,146-148,160-162,260; NOT src/types/usageAttribution.ts); src/pages/analytics/components/cli-analytics/{format.ts, views/RepositoriesTable.tsx (42,46,50), views/RepositoriesView.tsx (~233,~274), views/SessionsView.tsx (77 '?? 0' masks null; ~210), views/UsersView.tsx (60,105 '?? 0'; ~234), views/EfficiencyView.tsx (151), views/OverviewView.tsx (73 sign logic; ~229-231, ~286 daily table/chart)}; session detail view; check CLIInsightsUserDetailsModal.tsx (cliInsights is a different feature — leave alone unless it uses the CLI Analytics endpoints).
Display rules: shared helper formatLines(value: number|null|undefined): string in cli-analytics/format.ts ('–' for null/undefined, else toLocaleString(), real 0 -> '0'); replace every '?? 0' on these fields (never '|| 0'); client-side sort puts nulls last in both directions; Overview KPI description shows 'net lines not reported' with no sign when null; Overview daily table/chart null day renders as gap or '–' (simplest option the chart supports); CSV/export writes empty cell for null.
Acceptance: page loads with no-lines session; null -> '–' in repositories, sessions, session detail, users, overview KPI, efficiency; real zero renders 0; types number | null, tsc/lint pass; unit tests for helper (null, undefined, 0, 1234) and one component test per changed view for null vs 0 vs number.
Out of scope: backend, API shape, mixed-session coverage indicator, usageAttribution and cliInsights features.
Full handoff doc: C:\Users\Yauheni_Hil\repos\codemie-dev\epmcdme-16713-repro\ui-handoff.md. Jira ticket EPMCDME-16713 has no comments beyond the description.

---

## 2. Codebase Findings

### Existing Implementations

Purpose A: render a lines figure in CLI Analytics without crashing and without masking null as 0.
- `RepositoriesTable.tsx:42,46,50` — cells call `row.lines_added/lines_removed/net_lines.toLocaleString()` directly (the crash). Cell map `REPOSITORY_CELL_RENDERERS` at :57-59; columns at :129-148 all `sortable: false`. Rendered by `OverviewView` (top-10) and `RepositoriesView`.
- `RepositoriesView.tsx:233` (`repo.net_lines`) and `:274` (`b.net_lines`) — raw interpolation in a hand-built `<table>`; null renders as empty text, not a crash. `lines_added`/`lines_removed` not shown here.
- `SessionsView.tsx:77` — `NetLinesCell`: `(row.net_lines ?? 0).toLocaleString()` (masks null). Registered at :105; column def ~:210, `sortable: false` on all columns. Also rendered inside `ExtendedSessionsModal` (opened from Repositories/Overview).
- `UsersView.tsx:60` — `buildUserMetrics` metric `value: row.net_lines ?? 0`; `:103` — `NetLinesCell` `(row.net_lines ?? 0).toLocaleString()`; column def ~:232.
- `EfficiencyView.tsx:151` — `buildCodeChangesMetrics` metric `net_lines` `value: codeChanges?.net_lines ?? 0` (the `?? 0` also covers a missing `codeChanges` object, not only null lines).
- `OverviewView.tsx:73` — `buildHeadlineMetrics` Files Touched description: `` `net ${kpis.net_lines >= 0 ? '+' : ''}${kpis.net_lines} lines` `` (null >= 0 is true in JS, so it prints "net +null lines").
- `OverviewView.tsx:226-244` — `activityTimelineData` maps `dailyBuckets` to `{day, net_lines}` rows, rendered by `BarChartWidget valueField="net_lines"` (:288).
- `format.ts:22-25,71` — `RepoMetricsSource` Pick includes `net_lines`; `buildRepoMetrics` passes `value: row.net_lines` to a `Metric` (used by `OverviewView.tsx:187` and `RepositoriesView` for the modal header metrics). No lines helper exists in `format.ts` (exports: `formatDuration`, `formatToolSuccess`, `truncateModelName`, `buildRepoMetrics`).
- Types `src/types/cliAnalytics.ts`: `UserRow.net_lines?: number` :42; `SessionRow.net_lines?: number` :63; `OverviewKPIs.net_lines: number` :112; `DailyBucket.net_lines: number` :126; `RepositoryBranchRow` lines_added/removed/net_lines :146-148; `RepositoryRow` :160-162; `CliAnalyticsCodeChangesKPIs.net_lines: number` :260. `SessionDetail extends SessionRow` (:91), so it inherits `net_lines`.

Purpose B: show "absent" instead of 0 — existing mechanisms (not lines-specific).
- `src/utils/analyticsFormatters.ts:33` `ABSENT_VALUE_MARKER = '-'` (ASCII hyphen, not the en dash '–' the task specifies); `formatMetricValue` (:63-69) returns it for null/undefined before any coercion, with a comment that absent is not zero. Consumed by `MetricCard.tsx:55` (`formatMetricValue(metric.value, metric.format)`), so any `Metric` with `value: null` already renders the marker. Also used for nulls elsewhere (`formatCliAnalyticsCost`, `formatToolSuccess` falls back to '—' em dash).
- `BarChartWidget.tsx:138-140` — `toSeriesPoint(row[valueField])`; comment says a null cell stays null so Chart.js draws no bar (gap). Existing tests: `widgets/__tests__/BarChartWidget.test.tsx` (net_lines positive/negative/mixed/zero), none for null.
- Dash glyphs in use in this folder: '—' (em dash, `format.ts`, `EfficiencyView.tsx:190-210`), '-' (ABSENT_VALUE_MARKER), none use '–'.

Purpose C: tooltips on cells.
- `title=`/Tooltip appear across the views (e.g. `EfficiencyView.tsx:180,187`, `RepositoriesView.tsx:258`); `RepositoriesTable.tsx` has 2 occurrences, `SessionsView` 5, `UsersView` 5. Lines cells in Repositories/Sessions/Users cells are plain `<div className="text-right">` with no title.

Other touched code
- Session detail: `SessionBody.tsx` and `SessionTimeline.tsx` (views/) do not reference `net_lines` (grep across cli-analytics non-test files lists only the 7 files above). `SessionDetail` inherits `net_lines?` but no view renders it. `fetchSessionDetail` in `src/store/cliAnalytics.ts` stores the raw JSON.
- Store `src/store/cliAnalytics.ts` casts `response.json() as T` (:130) with no transformation, so null reaches components unchanged.

### Decisions Already in the Code
- Convention: absent figure is not zero (`analyticsFormatters.ts:67-69` comment; `BarChartWidget.tsx:138`; `format.ts:41` "0 of 0 is no data" for tool success). Alternative is `?? 0`; used by the lines fields today. Reason recorded for the former.
- Convention: `Metric.value` accepts null and `formatMetricValue` renders the marker (stored direction matches read direction).
- Lists in cli-analytics are server-sorted/paginated; `useCliAnalyticsSessions.ts:41` `sort_by` is limited to `'start_time' | 'cost_usd' | 'ctx_per_call'`; all table columns in Repositories/Sessions are `sortable: false`. No client-side sort on lines fields was found (UsersView sortable flags not verified; its column def at ~:232).
- Absent marker glyph: code uses '-' / '—'; task specifies '–'. Reason for difference: none found.
- No CSV/export for these tables found in the cli-analytics folder (search: `net_lines` outside tests yields only the 7 files).

### Task Statements Checked Against the Code
- "RepositoriesTable calls row.lines_added.toLocaleString() on null" — holds (`RepositoriesTable.tsx:42,46,50`).
- "SessionsView.tsx:77 '?? 0' masks null" — holds. "UsersView 60,105 '?? 0'" — holds at 60 and 103 (not 105). "EfficiencyView 151" — holds.
- "OverviewView.tsx:73 sign logic" — holds. "daily table/chart ~229-231, ~286" — holds (226-244, 288); chart supports null gaps (`BarChartWidget.tsx:138`); no separate "daily table" was found, only the BarChartWidget.
- "RepositoriesView ~233, ~274 print raw" — holds.
- "session detail view shows net_lines" — contradicted: no cli-analytics view reads `net_lines` from `SessionDetail` (`SessionBody.tsx`, `SessionTimeline.tsx` have no match).
- "client-side sort puts nulls last" — no client-side sort on these fields found; keeps nothing in place.
- "tooltip where tooltips already exist" — cells for these fields have none today.
- "CSV/export" — none found.
- "formatLines in format.ts, '–' for null" — parallel mechanism: `formatMetricValue`/`ABSENT_VALUE_MARKER` (`analyticsFormatters.ts:33,69`) already serves "render absent number"; consumers: `MetricCard.tsx:55` and every `Metric` in the analytics pages.
- "cliInsights is a different feature" — holds: `CLIInsightsUserDetailsModal.tsx:218` lists `'net_lines'` as a column in a `TableWidget` with `TabularMetricType.CLI_INSIGHTS_USER_REPOSITORIES`, not the `/cli-analytics` store.
- "usageAttribution net_lines is a different API" — holds (`src/types/usageAttribution.ts:496,506,515`; `PersonModal.tsx:175-288` uses `formatNumber`).

### Consumers of Changed Contracts
Types `RepositoryRow`, `RepositoryBranchRow`, `SessionRow`, `UserRow`, `OverviewKPIs`, `DailyBucket`, `CliAnalyticsCodeChangesKPIs`:
- `RepositoriesTable.tsx:42-50` (crash on null); `RepositoriesView.tsx:233,274` (prints nothing); `format.ts:71` via `RepoMetricsSource` (value to `MetricCard` -> renders marker, type-compatible only if `Metric.value` allows null); `OverviewView.tsx:73,233`; `SessionsView.tsx:77`; `UsersView.tsx:60,103`; `EfficiencyView.tsx:151`.
- `buildRepoMetrics` callers: `OverviewView.tsx:187`, `RepositoriesView` (handleRepoClick/handleBranchClick, header metrics of `ExtendedSessionsModal`).
- Test fixtures typed with these shapes (all non-null today): `__tests__/{RepositoriesTable,RepositoriesView,OverviewView,UsersView,SessionsView,EfficiencyView,CostView,format}.test.*`, `hooks/__tests__/{useCliAnalyticsRepositories,useCliAnalyticsOverview,useCliAnalyticsSessions}.test.ts`, `src/store/__tests__/cliAnalytics.test.ts`, `widgets/__tests__/BarChartWidget*.test.tsx`.
- Hooks `useCliAnalyticsRepositories`, `useCliAnalyticsOverview`, `useCliAnalyticsUsers`, `useCliAnalyticsEfficiency` pass data through (no lines math found in the grep over hooks).
- `Metric.value` type in `src/types/analytics.ts` — not confirmed to accept null (declaration not located in this pass).

### Architecture and Layers Affected
Types (`src/types/cliAnalytics.ts`) -> store (`src/store/cliAnalytics.ts`, passthrough) -> hooks (`cli-analytics/hooks`) -> views (`cli-analytics/views`) -> shared formatters (`cli-analytics/format.ts`, `src/utils/analyticsFormatters.ts`) -> shared widgets (`MetricCard`, `BarChartWidget`).

### Integration Points
`ExtendedSessionsModal` renders `SessionsView`; `OverviewView` and `RepositoriesView` both render `RepositoriesTable`/open the modal; `UsageAttributionTab` references an `OverviewView` (usage-attribution one, separate).

### Patterns and Conventions
Cell components as `const XCell = ({row})` plus a `*_CELL_RENDERERS` map consumed by `AnalyticsWidget` custom columns; metrics built by `build*Metrics` functions returning `Metric[]`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (testing/testing-patterns.md, components/component-patterns.md, development/api-integration.md, quality-gates.md, standards/git-workflow.md). Not read in depth in this pass; AGENTS.md routes tests to testing-patterns.md and says tests only when requested (this task explicitly requests them).

### Architectural Decisions
None found for lines semantics; backend rollout note in handoff (section 10) says backend and UI must ship together.

### Derived Conventions
Absent-value convention above.

---

## 4. Testing Landscape

### Existing Coverage
`cli-analytics/__tests__/`: RepositoriesTable, RepositoriesView, OverviewView, UsersView, SessionsView, EfficiencyView, CostView, format.test.ts; hooks tests; `BarChartWidget.test.tsx`. All use non-null line fixtures (e.g. `RepositoriesTable.test.tsx:64-66`, `SessionsView.test.tsx:82` net_lines 0).

### Testing Framework and Patterns
Vitest + React Testing Library, `unit` and `integration` projects (AGENTS.md). `EfficiencyView.test.tsx:213` asserts `metric-net_lines` test id (MetricCard mocked in that test, per testid).

### Coverage Gaps
No test with null line fields anywhere. No `formatLines` test (helper absent). No test for session detail lines (nothing rendered).

---

## 5. Configuration and Environment

### Environment Variables
None relevant found.

### Configuration Files
Untracked `public/config.js` (local-only, per handoff do not commit). Backend feature flag `features:cliAnalytics` is backend-side.

### Feature Flags and Deployment Concerns
Backend/UI must ship together (handoff section 10).

---

## 6. Risk Indicators

- Existing mechanism for the same purpose: `formatMetricValue`/`ABSENT_VALUE_MARKER` ('-') vs the task's new `formatLines` ('–'); two absent glyphs would coexist (see Task Statements).
- Task names a session detail display and client-side sorting/CSV; none found in code — scope lines in the task may not map to anything (see Task Statements).
- `UsersView.tsx:60` and `EfficiencyView.tsx:151` feed `MetricCard`, whose marker comes from `formatMetricValue`, not from a new helper.
- `EfficiencyView.tsx:151` `?? 0` also covers a missing `codeChanges` object (loading/no data), not only null lines.
- `RepositoriesView.tsx:233,274` currently print raw values; null renders blank rather than crashing.
- `OverviewView.tsx:73`: null >= 0 is true, so sign logic yields "net +null lines" rather than failing.
- `Metric.value` nullability and `RepoMetricsSource` typing in `format.ts:22-25` are unconfirmed; tsc may surface more call sites once types change.
- Test fixtures across 12+ test files are typed on the changed interfaces.
- Speculative: guides (testing-patterns.md, component-patterns.md) were not read in depth.

---

## 7. Summary for Complexity Assessment

The change sits in one feature folder (`cli-analytics`) plus one types file: 7 source files carry lines fields (RepositoriesTable, RepositoriesView, SessionsView, UsersView, EfficiencyView, OverviewView, format.ts) and 7 type declarations. No new infrastructure is evident: shared formatters already render absent values for `Metric` cards and `BarChartWidget` already leaves a gap for null. The store passes data through untouched, so no hook logic handles lines.

Several statements in the task do not match the code: no session-detail view renders lines, no client-side sort or CSV export for these fields exists, and "daily table" is a bar chart. An existing absent-value mechanism uses '-' rather than '–'. Test posture: strong existing view tests with non-null fixtures only; no null-case or `formatLines` coverage.

Key risks: type narrowing ripple through fixtures and `Metric`/`RepoMetricsSource` typing, `?? 0` in EfficiencyView doing double duty, and glyph inconsistency with the existing formatter.

---

## 8. External References

`C:\Users\Yauheni_Hil\repos\codemie-dev\epmcdme-16713-repro\ui-handoff.md` — resolved. Facts: backend returns null for `lines_added`/`lines_removed`/`net_lines` together when unknown; aggregates null only if all sessions unknown; mixed sessions not flagged; do not touch `usageAttribution`; display rules as in section 1 (helper `formatLines`, tooltip text, nulls-last sort, KPI text "net lines not reported", CSV empty cell); seed sessions `16713000-...0001` (repo `repro-16713-nolines`, expect null) and `...0002` (repo `repro-16713-control`, 84/5/79); handoff says branch from `origin/main` (repo already on `EPMCDME-16713_lines-null-vs-zero`); commit prefix `EPMCDME-16713:`; do not commit `public/config.js`; backfill needed on the backend after rollout.
