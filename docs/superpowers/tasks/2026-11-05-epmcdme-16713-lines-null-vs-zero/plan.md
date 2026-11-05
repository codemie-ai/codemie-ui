# EPMCDME-16713 CLI Analytics null line counts Implementation Plan

**Goal:** Null `lines_added`/`lines_removed`/`net_lines` render the absent marker (never 0, no crash); real 0 and numbers unchanged.

**Spec:** `spec.md` (same dir). Commit per task using the repository's existing convention, prefix `EPMCDME-16713: `. Never commit `public/config.js`, `button.png`, `error.png`.

**Conventions:** Cells live under `src/pages/analytics/components/cli-analytics/`; tests in the sibling `__tests__/`. Marker is `ABSENT_VALUE_MARKER` ('-', `src/utils/analyticsFormatters.ts:33`). Arch-review plan notes: `formatLines` is built on `formatMetricValue` (confirmed: a number with no format returns `toLocaleString()`, `analyticsFormatters.ts:97-99`, so output is identical); run `tsc` right after Task 1 to size the fixture ripple before touching tests.

---

### Task 1: Types and `formatLines` helper

**Files:** `src/types/cliAnalytics.ts` (:42, 63, 112, 126, 146-148, 160-162, 260); `cli-analytics/format.ts`; `cli-analytics/__tests__/format.test.ts`

- Make each lines field `number | null`, keeping any existing `?`. Do not touch `usageAttribution.ts`.
- In `format.ts` add `formatLines(value: number | null | undefined): string` returning `formatMetricValue(value)`, plus `export const LINES_NOT_REPORTED_TITLE = 'Not reported - no line data was received'` and `linesTitle(value)` returning that title only when value is null/undefined, else `undefined`. Cells use these so marker and title are decided in one place.
- Test-first: yes — `formatLines` returns the marker for null and undefined, `'0'` for 0, `'1,234'` (locale grouping, assert against `(1234).toLocaleString()`) for 1234; `linesTitle` is set for null and undefined, absent for 0 and 1234.
- Then run `npx tsc --noEmit` and note which fixtures/call sites break; fix only those required by tsc in the tasks below (fixtures in the task owning the view).

### Task 2: Repositories table and repository view

**Files:** `views/RepositoriesTable.tsx:42,46,50`; `views/RepositoriesView.tsx:233,274`; `format.ts:71` (`buildRepoMetrics` / `RepoMetricsSource`); tests `RepositoriesTable.test.tsx`, `RepositoriesView.test.tsx`, `format.test.ts`

- Table cells: render `formatLines(row.x)` with `title={linesTitle(row.x)}` on the cell div for lines_added, lines_removed, net_lines.
- View: replace the raw interpolation for repo row and branch row net_lines with `formatLines` + `linesTitle` on the `<td>`. Net lines on this view gain thousands grouping (arch AR-2; turns/files stay as is) — state this in the MR.
- `buildRepoMetrics` keeps passing `row.net_lines` as the `Metric` value (null allowed by `MetricValue`, `types/analytics.ts:133`); no `?? 0`.
- Test-first: yes — a repository and a branch row with null lines render the marker with the title and no crash; a row with 0 renders `0` with no title; a row with 1234 renders the grouped number; `buildRepoMetrics` returns `value: null` for null net_lines.

### Task 3: Sessions and Users views

**Files:** `views/SessionsView.tsx:77`; `views/UsersView.tsx:60,103`; tests `SessionsView.test.tsx`, `UsersView.test.tsx`

- Both `NetLinesCell`: replace `(row.net_lines ?? 0).toLocaleString()` with `formatLines` + `linesTitle` on the cell div.
- `UsersView.tsx:60` `buildUserMetrics`: `value: row.net_lines` (drop `?? 0`).
- Test-first: yes — a session row and a user row with null net_lines render the marker with the title (not `0`); 0 renders `0`; a positive number renders as before; the user metric card shows the marker for null.

### Task 4: Efficiency and Overview

**Files:** `views/EfficiencyView.tsx:151`; `views/OverviewView.tsx:73,226-244`; tests `EfficiencyView.test.tsx`, `OverviewView.test.tsx`

- Efficiency: value is `codeChanges ? codeChanges.net_lines : 0` — null passes through; stays 0 only when the `codeChanges` object is absent (loading behavior unchanged).
- Overview `buildHeadlineMetrics`: when `kpis.net_lines == null` the Files Touched description is `net lines not reported`; else the existing `net +N lines` / `net -N lines` (0 gives `net +0 lines`).
- Overview `activityTimelineData`: pass a null `net_lines` through as null (no `?? 0`); no `BarChartWidget` change.
- Test-first: yes — Efficiency net_lines metric is null for null and 0 for 0; Overview description reads "net lines not reported" for null, "net +0 lines" for 0, "net +5 lines" for 5; the chart data row for a null day has `net_lines: null`.

### Task 5: Residual masking and fixtures

**Files:** whole `cli-analytics/` tree and `src/types/cliAnalytics.ts`; fixtures flagged by tsc

- Grep the folder for `net_lines|lines_added|lines_removed` next to `?? 0` or `|| 0`; none may remain on these fields (acceptance 4). Fix any tsc-required fixture typing in hooks/store/widget tests, minimally.
- Test-first: no — verification of earlier tasks only (tsc clean, grep empty).

---

## Negative-constraint pass

- Never 0 for unknown: Tasks 2-4 drop every `?? 0` on these fields; Task 5 greps for leftovers. Efficiency's 0 for an absent `codeChanges` object is the spec's stated exception.
- Not touching backend, API shape, `usageAttribution`, `cliInsights`, `BarChartWidget`, the shared marker glyph: no task edits them.
- No session-detail view, sort, CSV, new tooltip infrastructure or `MetricCard` tooltips: no task adds them (native `title` only).
- Numbers unchanged: honored except the RepositoriesView grouping noted in Task 2.
