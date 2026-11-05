# EPMCDME-16713 (UI half) - CLI Analytics: null line counts

## Problem
The backend now returns `null` for `lines_added`, `lines_removed`, `net_lines` when a session has no line source; a real zero stays `0`. Aggregates are null only if every underlying session is unknown. The UI crashes on null in `RepositoriesTable.tsx:42,46,50` (`null.toLocaleString()`, full-page error) and elsewhere shows 0 or "net +null lines" (`SessionsView.tsx:77`, `UsersView.tsx:60,103`, `EfficiencyView.tsx:151`, `OverviewView.tsx:73`). Size: M (complexity-assessment.json).

## Behavior
- Null/undefined line figure renders the shared absent marker `ABSENT_VALUE_MARKER` (`src/utils/analyticsFormatters.ts:33`); never 0.
- Real `0` renders `0`; any non-null number renders exactly as today (`toLocaleString()`).
- Page loads with a no-lines session present; no error boundary.

## Changes
- Types `src/types/cliAnalytics.ts` (:42, 63, 112, 126, 146-148, 160-162, 260): line fields become `number | null`, keeping existing `?`. `usageAttribution.ts` untouched.
- New helper `formatLines(value: number | null | undefined): string` in `cli-analytics/format.ts`, built on the marker; used by every cell that prints a lines figure.
- `RepositoriesTable`, `RepositoriesView` (:233, :274), `SessionsView` `NetLinesCell`, `UsersView` `NetLinesCell`: render through `formatLines`. Cells this change touches carry a native `title` of "Not reported - no line data was received for this session" only when the value is null.
- `UsersView:60`, `EfficiencyView:151`, `format.ts:71` (`buildRepoMetrics`): pass null through as the `Metric` value (`MetricValue` already allows null, `src/types/analytics.ts:133`; `MetricCard` renders the marker via `formatMetricValue`). Drop `?? 0` on these fields. In `EfficiencyView` the value stays 0 when the `codeChanges` object itself is absent (current loading behavior); only a null `net_lines` becomes null.
- `OverviewView:73`: when `kpis.net_lines` is null the Files Touched description reads "net lines not reported", no sign.
- `OverviewView:226-244` daily chart: null `net_lines` is passed through as null so `BarChartWidget` leaves a gap (`BarChartWidget.tsx:138`); no change to the widget.
- Test fixtures typed on the changed interfaces are updated only as far as tsc requires.

## Acceptance criteria
1. Repositories table, repository view (incl. branch rows), sessions list, users table render the marker for null and `0` for zero; numbers unchanged.
2. Overview KPI description reads "net lines not reported" for null, "net +N lines" / "net -N lines" otherwise, and "net +0 lines" for zero.
3. Overview daily chart draws no bar for a null day; Efficiency and user/repo metric cards show the marker for null, `0` for zero.
4. No `?? 0` or `|| 0` remains on these fields.
5. `tsc` and lint pass with the `number | null` types.
6. Tests (requested by the handoff): `formatLines` for null, undefined, 0, 1234; one null/0/number case per changed view (RepositoriesTable, RepositoriesView, SessionsView, UsersView, EfficiencyView, OverviewView).

## Non-goals
- Backend, API shape, backfill.
- Mixed-session coverage indicator.
- `usageAttribution` and `cliInsights` (`CLIInsightsUserDetailsModal`) features.
- Session-detail view, client-side sorting, CSV export for these fields: none exists in the code (analysis sections 2 and 4), so nothing to change.
- New tooltip infrastructure; `MetricCard` tooltips.
- Changing the shared marker glyph or `BarChartWidget`.

## Decisions
- Reuse the existing `ABSENT_VALUE_MARKER` ('-') over the handoff's en dash '–': one absent glyph across analytics; the repo convention is established.
- `formatLines` as a thin wrapper in `format.ts` over a second absent mechanism: gives one call site for table cells while `MetricCard` keeps `formatMetricValue`.
- Native `title` on null cells that this change touches, over skipping tooltips: cheap and cell-level; no new component.
- Null day in the daily chart is a gap over a marker label: the chart already supports it.
- Drop session-detail, nulls-last sort and CSV requirements over adding new surfaces: none exist for these fields.
- Efficiency keeps 0 when `codeChanges` is absent over mapping it to null: unchanged loading behavior.

## Assumptions
- `ExtendedSessionsModal` reuses `SessionsView`, so it needs no separate change (analysis section 2).
- Backend/UI ship together (rollout note for the MR).
