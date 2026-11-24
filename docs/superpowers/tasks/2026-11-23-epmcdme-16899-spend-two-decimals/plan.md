# EPMCDME-16899 Spend with exactly 2 decimals - Implementation Plan

**Goal:** Remove the sub-cent significant-digits rule from the shared USD formatter so all spend (Platform / CLI / Premium Models) shows exactly 2 decimals in Analytics, Projects page, Profile, User management.

**Architecture:** One-function change in `src/utils/currency.ts`; everything else is test updates and new focused tests. Display only; no backend, no refactors, no marker unification.

**Conventions:** Commit per task using the repository's existing convention (`EPMCDME-16899: Capital sentence`). Tests: Vitest + RTL, co-located `__tests__/`, `*.test.tsx` = unit project (testing-patterns.md). Run gates one at a time (quality-gates.md). Rounding is whatever `toLocaleString('en-US', {min/maxFractionDigits: 2})` gives (half-expand on the decimal representation); no custom rounding is added, and float edge cases such as 1.005 are not tested.

## Acceptance criteria

- Platform, CLI and Premium Models spend all render with exactly 2 decimals in Analytics (cards, tables, totals, charts' formatted values), Projects list page, Profile (Your spending / Available / spending table) and User management (details spending card, per-project breakdown, users list cell).
- Rounding, not truncation: 12.3456 -> $12.35, 0.0067 -> $0.01, 0.0017 -> $0.00; Workflows table Avg Cost 0.0075 -> $0.01.
- Absent spend (null/undefined) still renders the marker, never $0.00; a measured 0 still renders $0.00.
- Unchanged: Analytics chart hover tooltip (toFixed(4)), per-record 4-decimal costs (data source, workflow execution, scheduler run, ChatHeader incl. Classifier cost), model catalog price per token, Projects detail sections' `spendPresentation.ts` formatter. Their existing tests stay unchanged and green.
- Backend and stored values untouched.

## Task 1: Remove the sub-cent rule from formatCurrency

**Files:** Modify `src/utils/currency.ts:18-30`; Test `src/utils/__tests__/currency.test.ts:37-41,65-67`.

- Test-first: yes - `formatCurrency(0.0042)` expects `$0.00` (currently `$0.0042`); `formatCurrency(0.0067)` expects `$0.01`; `formatCurrency(0.0017)` expects `$0.00`; `formatCurrency(12.3456)` expects `$12.35`; `formatSpend(0.0067)` expects `$0.01`.
- [ ] Replace the test at `currency.test.ts:37-41` ("keeps two significant digits...") with "rounds sub-cent amounts to two decimals" asserting 0.0067 -> `$0.01`, 0.0017 -> `$0.00`, 0.0042 -> `$0.00`, 0.0000026 -> `$0.00`; add 12.3456 -> `$12.35` next to the existing rounding test. Replace `currency.test.ts:65-66` ("sub-cent amount with significant digits") with `formatSpend(0.0067)` -> `$0.01`. Keep the null/undefined -> `-` and `0 -> $0.00` tests untouched. Run `npm test -- currency.test` and see these fail.
- [ ] In `currency.ts`, delete `ONE_CENT` (line 18) and the sub-cent branch so `formatCurrency` always returns the fixed 2-decimal string; rewrite the doc comment (lines 20-26) to state the new rule: always two decimals, sub-cent values round (0.0017 -> `$0.00`), and reference EPMCDME-16899 instead of EPMCDME-15204. Leave `formatSpend` and `formatMoneySpent` untouched. Re-run the test.

## Task 2: Update the remaining tests that assert the old rule

**Files:** Modify `src/utils/__tests__/analyticsFormatters.test.ts:34-35`; `src/pages/analytics/components/cli-analytics/__tests__/SessionBody.test.tsx:101,124`.

- Test-first: no - these are expectation updates of existing tests to the new intended behaviour (they fail after Task 1 until edited).
- [ ] `analyticsFormatters.test.ts:35`: `formatMetricValue(0.0042, CURRENCY)` expectation -> `$0.00`, and add a `0.0075` -> `$0.01` case (Workflows Avg Cost example); rename the test to say sub-cent values round to 2 decimals. `SessionBody.test.tsx:101,124`: `Cache Re-Read Cost` `$0.004` -> `$0.00`. Then run the whole unit project once (`npm run test:unit:slnt`) to confirm no other test depended on the old rule; the grep for `$0.0\d*[1-9]` / `$\d+\.\d{3,}` in tests found only these plus the out-of-scope 4-decimal tests (StackedBarChartWidget.absentSeries 154-155, DataSourceDetails, WorkflowExecutionInfoPopup, SchedulerRunDetailsPage.integration:143, ChatHeader:406), which must not be edited.

## Task 3: Regression tests - Analytics Workflows table and Profile spending

**Files:** Modify `src/pages/analytics/components/widgets/__tests__/TableWidget.absentFigures.test.tsx` (reuse its `MONEY_COLUMNS`, `buildResponse`, `renderWidget`, lines 41-64); Create `src/pages/settings/components/__tests__/SpendingUsage.test.tsx` and `.../SpendingTable.test.tsx` (none exist).

- Test-first: no - regression guards written after Task 1, so they pass on the first run; they protect the rule against reintroduction. They are TableWidget (`0.0075` -> `$0.01`, `12.3456` -> `$12.35`; Workflows Total Cost / Avg Cost are backend-defined `format: currency`), `SpendingUsage` (`spent=0.0067` -> "Your spending: $0.01") and `SpendingTable` (`0.0017` -> `$0.00`).
- [ ] TableWidget: one test with a sub-cent and a multi-decimal row asserting `$0.01` and `$12.35` (add near line 80; marker and zero tests already exist at 67-80 and cover the empty marker).
- [ ] `SpendingUsage.test.tsx` (props `percentage`, `spent`, `limit` per `SpendingUsage.tsx:34-41`): (a) `spent=12.3456, limit=100` shows `Your spending: $12.35` and `Available: $87.65`; (b) `spent=0.0067` shows `$0.01`; (c) `spent=null, limit=null` shows the marker (`ABSENT_VALUE_MARKER`) for spending and Available and no `$0.00`.
- [ ] `SpendingTable.test.tsx` (props `columns` `{id,label,format}`, `rows` per `SpendingTable.tsx:26-36`): currency column with rows for three categories (platform 12.3456, cli 0.0067, premium_models 0.0017) renders `$12.35`, `$0.01`, `$0.00` side by side; a `null` cell renders `-` and no `$0.00`. Use the standard `afterEach(cleanup)` pattern.

## Task 4: Regression tests - Projects page and User management

**Files:** Modify `src/pages/settings/administration/components/__tests__/BudgetSpendCell.test.tsx` (item helper and cases at lines 20-96) and `.../SpendingAmount.test.tsx`.

- Test-first: no - regression guards written after Task 1, so they pass on the first run. They are `BudgetSpendCell` (platform `current_spending: 0.0067` -> `$0.01 / $100.00`, `0.0017` -> `$0.00 / $100.00`) and `SpendingAmount` (`spend=0.0067, limit=300` -> `$0.01 / $300.00`).
- [ ] BudgetSpendCell (used by the Projects list and the Users list): add one test with platform 12.3456 / cli 0.0067 / premium_models 0.0017 asserting the three per-category lines are `$12.35 / ...`, `$0.01 / ...`, `$0.00 / ...`; the null -> `-` and zero -> `$0.00` cases already exist (lines 62-68, 85-93), do not duplicate.
- [ ] SpendingAmount (per-project breakdown in the user details popup): one sub-cent/rounding test and one `spend=null` marker assertion if the existing file lacks it. `SpendingCard` in `UserDetailsPopup` and on Profile shares `SpendingUsage`/`SpendingTable` / `formatMetricValue`, so Task 3 covers it; no separate test.

## Money display outside the four areas (for the MR description)

Re-verified against current code. These shared-formatter consumers change only for values in (0, 0.01): they now read `$0.00`/`$0.01` instead of significant digits. Everything else already rendered 2 decimals.

- Budgets management page: `src/pages/settings/administration/BudgetsManagementPage.tsx:302,304` (max / soft budget).
- Budget details popup: `src/pages/settings/administration/components/BudgetDetailsPopup.tsx:48` (max and soft).
- Project activity history: `src/utils/activityEventPresentation.tsx:72,145` (event value and difference; difference is already pre-rounded at :127).
- CLI analytics cost views (Analytics area, so in scope, listed for visibility): `cli-analytics/views/CostView.tsx:229`, `SessionBody.tsx:81,125,129`, `SessionTimeline.tsx:70`, `SessionCostValue.tsx:47,48,75,95,106`; plus `formatMetricValue(CURRENCY)` users `EfficiencyView`, `overviewMetrics.ts`, `format.ts`, `UsersView`. `LeaderboardSummaryMetrics.tsx:59` (Analytics).
- Projects list tooltip `ProjectsManagementFull.tsx:604-608` (soft limit, allocated total): inside the Projects area.
- No additional importers of `@/utils/currency` found beyond the list in `technical-analysis.md`; `spendPresentation.ts` consumers (ProjectOverviewSection, ProjectBudgetsSection, CostCenterBudgetRollupCard, BudgetSpendMetrics, UserBudgetsCell) use their own local `formatCurrency` and are unaffected.

## Negative-constraint pass

- Chart tooltip (`StackedBarChartWidget.tsx:210` toFixed(4)) unchanged: no task touches it (Task 1 edits only `formatCurrency`).
- Per-record 4-decimal costs unchanged: `formatMoneySpent`/`formatRecordMoneySpent` left as-is (Task 1); their tests are excluded from Task 2.
- Model catalog price-per-token, `spendPresentation.ts`: untouched.
- Absent spend never `$0.00`: `formatSpend` null path untouched; marker asserted in Tasks 1, 3, 4. No unification of the literal `'-'` (`BudgetSpendCell.tsx:53`, `SpendingTable.tsx:42`) with `ABSENT_VALUE_MARKER`.
- No backend change, no new separate formatter, no truncation (rounding only, via `toLocaleString`).
