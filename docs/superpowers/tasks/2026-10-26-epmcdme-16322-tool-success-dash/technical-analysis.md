# Technical Analysis — EPMCDME-16322 (frontend)

Tool Success must render a dash (—) instead of 0% when the selected sessions
contain no tool calls. Companion file: `technical-analysis-backend.md` (the
backend research that established the fix does **not** belong in `codemie`).

Verified against `codemie-ui` `origin/main` @ `e1c2cbefc` (2.62.0).

## Why this is a frontend-only fix

The backend computes the rate in `_pct()`
(`codemie/src/codemie/service/analytics/handlers/cli_analytics_handler.py:138-146`),
whose falsy guard returns `0.0` for a zero denominator and whose `-> float`
signature cannot express "undefined".

Making the backend return `null` was considered and rejected, because it fixes
nothing on its own and breaks one surface:

| Surface | Current UI code | Effect of a backend `null` |
|---|---|---|
| Overview | `kpis.tool_call_success_rate.toFixed(1)` | **Runtime TypeError** — TS type is a required `number` |
| Users table | `row.tool_success_rate ?? 0` | Coerced back to `0` — bug unchanged |
| User modal | `row.tool_success_rate ?? 0` | Coerced back to `0` — bug unchanged |

Every payload already ships the sibling counter the dash decision needs, so the
UI can satisfy both acceptance criteria with no API contract change, no OpenAPI
baseline regeneration and no cross-repo coordination.

## Codebase Findings

### The three acceptance-criteria surfaces are three edits in two files

| AC surface | File:line | Current code | Counter to branch on |
|---|---|---|---|
| Overview → Summary (TOOL CALLS subtitle) | `src/pages/analytics/components/cli-analytics/views/OverviewView.tsx:80` | `description: \`${kpis.tool_call_success_rate.toFixed(1)}% success\`` | `kpis.total_tool_calls` (same object, `:79`) |
| Users → Per-user detail (TOOL SUCCESS column) | `src/pages/analytics/components/cli-analytics/views/UsersView.tsx:98-102` (`ToolSuccessRateCell`) | `formatMetricValue(row.tool_success_rate ?? 0, MetricFormat.PERCENTAGE)` | `row.tool_calls` |
| User modal → Summary (TOOL SUCCESS tile) | `src/pages/analytics/components/cli-analytics/views/UsersView.tsx:61-67` (`buildUserMetrics`) | `value: row.tool_success_rate ?? 0` + `format: PERCENTAGE` | `row.tool_calls` (same `UserRow`) |

The user modal has no dedicated endpoint or component tree of its own — it is fed
by `buildUserMetrics(row)` at `UsersView.tsx:196` from the same `UserRow` the
table renders, so the modal and the table are two renderers over one data shape.

### Dash-rendering mechanics

`MetricCard.tsx:52` renders a tile as `formatMetricValue(metric.value, metric.format)`.

`src/utils/analyticsFormatters.ts:27-63`:
- `MetricFormat.PERCENTAGE` → `` `${Number(value).toFixed(2)}%` `` with **no** non-numeric guard, so a `'—'` value that keeps the format renders `NaN%`.
- With **no** `format`, a string value falls through to `return String(value)` → `'—'`.

Therefore the modal tile must drop `format` when it carries the dash.
`MetricValue` is `string | number | boolean` (`src/types/analytics.ts:132`), so
a string value is type-legal.

### In-repo precedents for exactly this pattern

- `EfficiencyView.tsx:210` — `row.bloat_pct != null ? formatMetricValue(row.bloat_pct, MetricFormat.PERCENTAGE) : '—'` (dash in a table cell)
- `SessionBody.tsx:144-145` — `m('agents', 'Agents', session.agent_count != null ? String(session.agent_count) : '—')` (dash as a Metric tile value, no format)
- `EfficiencyView.tsx:195`, `SessionBody.tsx:122` — same shape for other metrics

The dash glyph used throughout is the em dash `—` (U+2014).

### Explicitly out of scope

The identical zero-denominator display exists on surfaces the acceptance
criteria do not name. Leaving them alone is deliberate:

- `RepositoriesView.tsx:237,:278` — Repositories tab (EPMCDME-15585 territory)
- `SessionBody.tsx:106` — session detail `"% ok"`
- `format.ts:63-67` — shared metric builder used by `RepositoryRow`; **must not** be touched, it would change the Repositories tab

### Test posture

- Existing specs: `src/pages/analytics/components/cli-analytics/__tests__/OverviewView.test.tsx` (fixture `tool_call_success_rate: 94.5` at `:36`), `__tests__/UsersView.test.tsx` (fixture `tool_success_rate: 95` at `:34`).
- No test asserts the zero-tool-call case on any of the three surfaces — the new tests have an obvious home in those two files.
- Sorting is unaffected: the TOOL SUCCESS column is `sortable: false` (`UsersView.tsx:231`).

## Risk Indicators

1. **`NaN%` trap** — keeping `format: PERCENTAGE` while passing `'—'` silently renders `NaN%`. The modal tile must omit the format.
2. **AC2 regression risk** — a truthiness check on the rate (`row.tool_success_rate ? ... : '—'`) would wrongly dash a real 0% (all calls failed). The branch must be on the **tool-call counter**, never on the rate.
3. **Optional-counter coercion** — `tool_calls` is `tool_calls?: number` (`src/types/cliAnalytics.ts`), so `undefined` must be treated as "no data"; use `(row.tool_calls ?? 0) === 0`.
4. **Shared-builder blast radius** — `format.ts` builds a `tool_success_rate` metric shared with `RepositoryRow`; editing it would silently change the Repositories tab.
5. **Overview type asymmetry** — `tool_call_success_rate: number` is required while `tool_success_rate?: number` is optional; the two surfaces need slightly different null handling.
6. **Stale cache during verification** — the backend sends `Cache-Control: private, max-age=300` plus an ETag on these endpoints, so a verifier can see up to 5 minutes of stale `0%`. Verification trap, not a bug.
7. **Pre-commit hook weight** — Husky runs lint-staged, license headers, gitleaks and a local Sonar scan on every commit.

## Gates (codemie-ui)

`npm run lint`, `npm run typecheck`, `npm run test:unit:slnt`, `npm run test:integration:slnt`.
`npm run test-harness` output is mandatory in the MR's `## Test harness` section
(the `auto_epm-cdme_vcs` bot checks it).
