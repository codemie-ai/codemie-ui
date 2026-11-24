# Technical Research

**Task**: spend decimals currency analytics profile projects users (EPMCDME-16899)
**Generated**: 2026-11-23
**Research path**: codegraph

---

## 1. Original Context

TICKET: "Spend values use inconsistent decimal precision: Platform shows 4 digits after the decimal point, while CLI and Premium Models show 2". Spend for Platform / CLI / Premium Models must be displayed with exactly 2 decimals in four areas: Analytics, Projects page, Personal settings (Profile), User management. UI-only (codemie-ui); backend, SDK, onboarding untouched; underlying values are not altered. Screenshots on the ticket: Projects management table showing "$0.0017 / $300.00" for Platform; Profile "Your spending: $0.0017"; Analytics Workflows table "Avg Cost ($) $0.0075".

BASE STORY (approved, from ticket attachment) kept as-is except where amended below: AC1 Analytics (cards, tables, charts) 12.3456 -> $12.35; AC2 Personal settings; AC3 User management (user details + per-project spending breakdown); AC4 Projects page; AC5 all three categories identical format side by side; AC6 CLI/Premium no regression; AC8 category with no spend data keeps the "no value" marker, never $0.00; AC9 backend/stored amounts unchanged, display only; AC10 regression tests cover 2-decimal display for all three categories in each of four areas, sub-cent value, empty marker. Out of scope: NG1 backend/SDK/onboarding; NG2 per-record costs shown with 4 decimals on purpose (EPMCDME-16900): data source details, workflow execution details, scheduler run details, chat header incl. "Classifier cost"; NG4 model catalog price-per-token and other non-spend money fields; NG5 Projects page and Usage Attribution tab keep own fixed 2-decimal formatter (D3). Related bug EPMCDME-15204 introduced the sub-cent significant-digits rule in src/utils/currency.ts.

AMENDMENTS agreed with QA and DM (override the story):
1. REVERSED D1, D4, NG3, AC7: spend under $0.01 is shown with exactly 2 decimals like any other value, in all four areas and for all three categories. The sub-cent significant-digits rule must be REMOVED; tests asserting it are updated as intended behaviour, not a regression. This includes the cost columns of the Analytics Workflows table (Avg Cost $0.0075).
2. NARROWED D2, AC1, AC10: the Analytics chart hover tooltip (Weekly Money Spent, StackedBarChartWidget toFixed(4)) is OUT of scope and must stay unchanged.
3. Rounding, not truncation: 12.3456 -> $12.35, 0.0067 -> $0.01, 0.0017 -> $0.00. Cover in tests.
4. Everything else in the story stays.

EXTRA INSTRUCTIONS: A prior technical analysis (ticket attachment, written against codemie-ui 57d394023, an older revision) exists but is NOT provided; do your own research on current main and do not trust claims from memory. Specifically verify against current code: where the sub-cent rule lives (src/utils/currency.ts), every consumer of formatCurrency / formatSpend / formatMetricValue(CURRENCY) / formatMoneySpent / formatRecordMoneySpent and any other money formatter, which of them reach the four areas, and the Analytics Workflows table cost columns (Total Cost, Avg Cost). List explicitly every place that shows money OUTSIDE the four areas and would change if the shared formatter changes (e.g. budgets management page, budget details popup, leaderboard summary, CLI analytics cost views, per-record costs, anything else) — the user will decide on those. Also list all existing tests that assert the sub-cent behaviour or 4-decimal output and would need updating.

---

## 2. Codebase Findings

### Existing Implementations

Purpose A: one shared USD formatter for spend (the sub-cent rule lives here).
- `src/utils/currency.ts:27` `formatCurrency(value)`: if `0 < value < 0.01` returns `toLocaleString('en-US', {maximumSignificantDigits: 2})` (0.0042 -> `$0.0042`, 0.0000026 -> `$0.0000026`); else 2 fixed decimals with thousands separators. Rounds (toLocaleString), does not truncate. 0 -> `$0.00`. Negatives go to the 2-decimal branch. ONE_CENT const at line 18, doc comment cites EPMCDME-15204.
- `src/utils/currency.ts:37` `formatSpend(value)`: null/undefined -> `ABSENT_VALUE_MARKER`, else `formatCurrency`. The only absent-marker wrapper; inherits the sub-cent rule.
- `src/utils/currency.ts:56` `formatMoneySpent(amount, flags)`: separate `toFixed(4)` branch (line 63); pending/unavailable/null -> marker + suffix. NOT part of the sub-cent rule; independent of formatCurrency.
- `src/utils/analyticsFormatters.ts:66` `formatMetricValue(value, CURRENCY)` -> `formatCurrency(Number(value))`; null/undefined return the marker first (line 58). Backend-driven `format: 'currency'` columns/metrics go through here.
- `src/utils/analyticsFormatters.ts:46` `formatRecordMoneySpent` -> `formatMoneySpent` (4 decimals).

Purpose B: the four areas and what formats them today.
- Profile (Personal settings): `src/pages/settings/ProfilePage.tsx` -> `src/pages/settings/components/SpendingCard.tsx` (metric list line 145 `formatMetricValue(metric.value, metric.format)`; table via `SpendingTable.tsx:57`) and `SpendingUsage.tsx:100` ("Your spending: ..." `formatMetricValue(spent, CURRENCY)`) and `:63` ("Available" = limit - spent, same path). All reach the sub-cent rule. SpendingCard is also rendered with `userId` inside `UserDetailsPopup.tsx:425` (User management details, label "Spending").
- User management: `UserDetailsPopup.tsx:425` `<SpendingCard userId>` (above); per-project breakdown `usersManagement/components/UserProjectSpendingTable.tsx:79` -> `administration/components/SpendingAmount.tsx:35` (`formatSpend(spend) / formatSpend(limit)`); users list column `UsersManagementPage.tsx:398` `BudgetSpendCell` (`administration/components/BudgetSpendCell.tsx:52,68,91`: `formatCurrency` for the total spend, `formatSpend` for others). Absent spend -> marker via formatSpend; total with no tracked spends -> literal `'-'`.
- Projects page: `projectsManagement/ProjectsManagementFull.tsx:598` `BudgetSpendCell` (same component as above, so Users list and Projects list change together); tooltip at `:604-608` uses `formatSpend(current_spending)`, `formatCurrency(soft)`, `formatCurrency(allocated total)` from `@/utils/currency`.
- Projects detail views (Overview/Budgets/Members, cost-center rollup, `BudgetSpendMetrics`, `UserBudgetsCell`, `ProjectBudgetsSection`, `ProjectOverviewSection`, `CostCenterBudgetRollupCard`) use a DIFFERENT local `formatCurrency` in `projectsManagement/components/spendPresentation.ts:24` (fixed 2 decimals, `toLocaleString(undefined,...)`, null -> `—`/`-`). No sub-cent rule; not affected by editing `utils/currency.ts`. (Story NG5 "Projects page keeps own formatter" matches this.) Exception: `ProjectOverviewSection` imports from `spendPresentation` (lines 31-36), verified; none import from `@/utils/currency`.
- Analytics: all widgets use `formatMetricValue`: `MetricCard.tsx:58`, `TableWidget.tsx:219` (cells) and `:290` (totals footer), `RatioWidget.tsx:152`, `BarChartWidget.tsx:225` (tooltip), `PieChartWidget.tsx:123,147`, `DonutChartWidget.tsx:142,170`, `DistributionBarWidget.tsx:99` (`'currency'`). Workflows table Total Cost / Avg Cost: columns are defined by the backend response (no column definitions found in the UI source) with `format: currency` and rendered by `TableWidget.formatCellValue` -> `formatMetricValue` -> `formatCurrency`; so `$0.0075` comes from the sub-cent branch and is fixed by the shared change. Column ids were not found in UI source (searched `Avg Cost|total_cost|avg_cost`: hits only CLI analytics files).
- `StackedBarChartWidget.tsx:210` tooltip `$${point.toFixed(4)}` (explicitly out of scope, stays); `:257` y-axis tick `toFixed(2)` already 2 decimals.

Purpose C: other places that show money (OUTSIDE the four areas) and would CHANGE if `formatCurrency`/`formatSpend`/`formatMetricValue(CURRENCY)` change (only for values in (0, 0.01); everything else already renders as 2 decimals):
- Budgets management page: `administration/BudgetsManagementPage.tsx:302,304` (`formatCurrency` max/soft budget); budgets are configured limits, rarely sub-cent.
- Budget details popup: `administration/components/BudgetDetailsPopup.tsx:48` (max and soft).
- Project activity history: `utils/activityEventPresentation.tsx:72,145` (`formatCurrency` for event values/differences; difference is pre-rounded with `toFixed(2)` at :127) -> `ProjectActivityHistoryModal`.
- Leaderboard summary: `analytics/components/leaderboard/LeaderboardSummaryMetrics.tsx:59` `formatSpend` (this is in Analytics area: Leaderboard is an analytics tab; counts as area 1).
- CLI analytics (Analytics area, CLI category): `cli-analytics/views/CostView.tsx:229` (`formatSpend`) and CURRENCY metric formats at `:141,156,201,244`; `EfficiencyView.tsx:76,110,118,352` and descriptions `:101,164` via `formatMetricValue`; `overviewMetrics.ts:29-85` (Est. Cost, API Spend...); `format.ts:173`; `UsersView.tsx:64,193`; `SessionBody.tsx:81` (axis tick), `:125,129` (Est. Cost, Cache Re-Read Cost); `SessionTimeline.tsx:70,130,185`; `SessionCostValue.tsx:47,48,75,95,106`. These are CLI cost views; a sub-cent CLI cost now reads `$0.00` instead of `$0.004` (AC6 says CLI no regression; amendment 1 says all categories).
- Not changed by the shared formatter (verified, own formatters or toFixed): `BudgetOverrideCategoryCard.tsx:58` (local 2-decimal), `UnifiedProjectBudgetModal.tsx:671` and `BudgetAmountInput.tsx:27` (input fields), `modelCatalog.ts:25` and `ModelConfigurationTable.tsx:47` (price per 1M tokens, 2 decimals), `usage-attribution/utils.ts:32-53` and `settingsModel.ts:54` (own formatters), `SettingRow.tsx:60`, `helpers.ts:379,388` (Intl formatters; not inspected for money use).
- Per-record 4-decimal formatter (`formatMoneySpent`/`formatRecordMoneySpent`) is untouched by a `formatCurrency` edit: `WorkflowExecutionInfoPopup.tsx:110`, `DataSourceDetails.tsx:826`, `SchedulerRunDetailsPage.tsx:60`, `ChatHeader.tsx:176` ("Money spent"). `ChatHeader.tsx:183` "Classifier cost" is an inline `toFixed(4)`.

### Decisions Already in the Code
- Sub-cent significant digits chosen over fixed 2 decimals so real spend never reads `$0.00`; recorded reason: EPMCDME-15204, `currency.ts:20-26`. Alternative: fixed 4 decimals (rejected in comment). Amendment 1 reverses this.
- Absent figure is the marker, never `$0.00`: `currency.ts:33-38`, `analyticsFormatters.ts:56-60`, `SpendingUsage.tsx:60-64`, `TableWidget.tsx:209`. Established convention; reason recorded in comments. Measured 0 renders `$0.00` (`TableWidget.absentFigures.test.tsx:75`).
- Per-record cost deliberately 4 decimals: `currency.ts:55-64`, `analyticsFormatters.ts:40-45`.
- Two parallel formatters named `formatCurrency` exist: `utils/currency.ts:27` (shared, has sub-cent rule) and `spendPresentation.ts:24` (local, fixed 2). Same name, different behaviour; reason for duplication: none found.
- `setupTests.tsx:68-90` patches `Intl.NumberFormat` and `Number#toLocaleString` to a fixed locale, so formatted-currency assertions are host-independent.

### Task Statements Checked Against the Code
- "Platform shows 4 digits": holds, via the sub-cent branch ($0.0017 -> `$0.0017`) and, for per-record costs, `toFixed(4)`. For values >= 0.01, Platform already shows 2 decimals: the 4-digit symptom exists only for amounts < $0.01 in the shared formatter, plus `StackedBarChartWidget` tooltip.
- "Projects management table shows $0.0017 / $300.00": holds, `BudgetSpendCell.tsx:91` -> `formatSpend` -> sub-cent branch.
- "Profile: Your spending: $0.0017": holds, `SpendingUsage.tsx:100`.
- "Analytics Workflows table Avg Cost $0.0075": holds via `TableWidget` + backend `currency` format; column definition is backend-driven (unverified in UI source).
- NG5 "Projects page keeps own fixed 2-decimal formatter": partly contradicted. The Projects list page (`ProjectsManagementFull.tsx:55,598-608`, `BudgetSpendCell`) uses the shared `@/utils/currency`, which has the sub-cent rule and shows `$0.0017`. Only the project detail/budget sections use the local `spendPresentation` formatter. The Usage Attribution tab part of NG5 holds (`usage-attribution/utils.ts:32`).
- Amendment 1 "remove sub-cent rule": keeps no existing mechanism for the same purpose beyond `currency.ts`; consumers listed in Purpose C change together.
- Amendment 2 tooltip out of scope: holds, `StackedBarChartWidget.tsx:210` is independent code (inline `toFixed(4)`), not reached by `formatCurrency`.
- NG2 per-record costs keep 4 decimals: holds, `formatMoneySpent` is independent of `formatCurrency`.
- AC3 "per-project spending breakdown": `UserProjectSpendingTable` -> `SpendingAmount` -> `formatSpend`. Holds.
- AC8 "no value marker never $0.00": holds today in `formatSpend` / `formatMetricValue`; `BudgetSpendCell` total uses literal `'-'` (different glyph from `ABSENT_VALUE_MARKER`) when no tracked spends, and `SpendingTable.tsx:42` renders `-` for null.

### Consumers of Changed Contracts
Contract: `formatCurrency` / `formatSpend` / `formatMetricValue(_, CURRENCY)` output for `0 < v < 0.01`.
- Direct `utils/currency` importers (non-test): `analyticsFormatters.ts:18`, `activityEventPresentation.tsx:16`, `BudgetsManagementPage.tsx:45`, `ProjectsManagementFull.tsx:55`, `SpendingAmount.tsx:19`, `BudgetSpendCell.tsx:20`, `BudgetDetailsPopup.tsx:20`, `LeaderboardSummaryMetrics.tsx:19`, `CostView.tsx:31`, `SessionBody.tsx:33`, `SessionCostValue.tsx:20`, `SessionTimeline.tsx:22`.
- `formatMetricValue` money consumers: SpendingUsage, SpendingTable, SpendingCard, TableWidget, MetricCard, RatioWidget, BarChartWidget, PieChartWidget, DonutChartWidget, DistributionBarWidget, CLI EfficiencyView/overviewMetrics/format/UsersView/CostView/SessionTimeline (see Purpose B/C). Non-money `formatMetricValue` calls (tokens/percent): SchedulerRunDetailsPage, SessionBody, overviewMetrics, format.ts.
- Rounding behaviour: `toLocaleString` fixed 2 decimals uses half-expand rounding on the decimal representation; 0.0067 -> `$0.01`, 0.0017 -> `$0.00`, 0.005 -> `$0.01` expected (float edge cases such as 1.005 -> `$1.00` possible; not tested in the repo).
- Percent/limit math (`SpendingUsage.tsx:63` `limit - spent`, `usage` percent) use raw numbers, not the formatted strings, so they are unaffected.

### Architecture and Layers Affected
- Utility layer: `src/utils/currency.ts`, `src/utils/analyticsFormatters.ts`.
- Presentation: analytics widgets, settings (Profile) components, administration (users/projects budget cells).
- No store/API changes (display only).

### Integration Points
- Backend column/metric `format` strings (`MetricFormat.CURRENCY = 'currency'`, `types/analytics.ts:52`) drive Analytics and Profile tables; `DistributionBarWidget.tsx:99` casts the literal `'currency'`.

### Patterns and Conventions
- Single formatter reached via `formatMetricValue` for backend-formatted data; `formatSpend` for nullable numbers; absent marker constant `ABSENT_VALUE_MARKER` from `@/constants`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
Not read in this pass; AGENTS.md routes to `.ai-run/guides/` (testing-patterns, quality-gates). Guide globbing was not performed for this analysis, so conventions are derived from code.

### Architectural Decisions
- `currency.ts:20-26` doc comment (EPMCDME-15204), `analyticsFormatters.ts:40-45`, `spendPresentation.ts:20-23`. No ADR found.

### Derived Conventions
- Formatter docs state intent in comments; tests named after the failure they guard ("never as $0.00").

---

## 4. Testing Landscape

### Existing Coverage
Tests that assert sub-cent behaviour (will need updating under Amendment 1):
- `src/utils/__tests__/currency.test.ts:37-40` (`0.0042 -> $0.0042`, `0.004999 -> $0.005`, `0.0000026 -> $0.0000026`), `:44` (`0.01 -> $0.01`, still valid), `:65-66` (`formatSpend(0.0042) -> $0.0042`).
- `src/utils/__tests__/analyticsFormatters.test.ts:34-35` (`formatMetricValue(0.0042, CURRENCY) -> $0.0042`).
- `src/pages/analytics/components/cli-analytics/__tests__/SessionBody.test.tsx:101,124` (`Cache Re-Read Cost` `$0.004`; CLI area).

Tests asserting 4-decimal output that must NOT change (per-record / tooltip, out of scope): `StackedBarChartWidget.absentSeries.test.tsx:154-155` (`$1.5000`, `$0.0000`), `DataSourceDetails.test.tsx:219,260,277`, `WorkflowExecutionInfoPopup.test.tsx:130,150,168,183,204,220,257`, `SchedulerRunDetailsPage.integration.test.tsx:143` (`$0.0125`), `ChatHeader.test.tsx:406` (`$1.5000`).

Tests touching 2-decimal money that should stay green (useful for regression extension): `MetricCard.test.tsx:41,53`, `TableWidget.absentFigures.test.tsx:67-78`, `SessionsView.test.tsx`, `EfficiencyView.test.tsx`, `CostView.test.tsx`, `CostIncomplete.integration.test.tsx`, `LeaderboardSummaryMetrics.test.tsx`, `BudgetSpendCell.test.tsx`, `SpendingAmount.test.tsx`, `UserProjectSpendingTable.test.tsx`, `ProjectMembersSpending.test.tsx`, `ProjectBudgetsSection.test.tsx`, `CostCenterBudgetRollupCard.test.tsx`, `ProjectActivityHistoryModal.test.tsx`, `activityEventPresentation.test.tsx`. Not individually inspected for sub-cent inputs expecting longer output; a grep for `$0.0\d*[1-9]` and `\$\d+\.\d{3,}` in all tests found only the lines listed above.
- Not found: tests for `SpendingCard`/`SpendingUsage`/`SpendingTable` (Profile) money output (codegraph reported "no tests found within 3 caller hops" for `SpendingColumn`); `Workflows` table Avg Cost formatting.

### Testing Framework and Patterns
- Vitest + Testing Library; `src/setupTests.tsx:68-90` fixes locale for number formatting. Per AGENTS.md, tests are written/run only on explicit request.

### Coverage Gaps
- Profile spending components (Spending*), `BudgetDetailsPopup`, `BudgetsManagementPage` money, and sub-cent rounding (0.0067 -> `$0.01`, 0.0017 -> `$0.00`) have no found assertions.

---

## 5. Configuration and Environment

### Environment Variables
None found for this domain.

### Configuration Files
- `src/setupTests.tsx` (locale patch for tests).

### Feature Flags and Deployment Concerns
- Budget UI gated by `useBudgetManagementEnabled` (`UserDetailsPopup.tsx:82`, `ProjectsManagementFull.tsx:229`); Budgets column on the Projects page only appears when enabled.

---

## 6. Risk Indicators

- Shared formatter blast radius: editing `currency.ts` also changes Budgets management page, Budget details popup, project activity history, and all CLI analytics cost views (Purpose C list); user decision needed on whether these are in scope.
- NG5 is inaccurate for the Projects list page: it uses the shared formatter, not the local one (see Task Statements).
- Two `formatCurrency` functions with the same name; imports must be checked when changing either.
- Removing the rule makes real sub-cent spend read `$0.00` (the failure EPMCDME-15204 guarded against); conflicts with the `$0.00` vs absent-marker convention only in meaning, not in code. Accepted by Amendment 1.
- `BudgetSpendCell.tsx:53` uses `'-'` while others use `ABSENT_VALUE_MARKER`; AC8 marker consistency not guaranteed.
- Workflows table Avg/Total Cost column definitions are backend-driven; not verifiable in UI source.
- Existing tests to update: currency.test.ts, analyticsFormatters.test.ts, SessionBody.test.tsx (listed above); AC10 needs new tests for Profile components (no existing coverage).
- Speculative: `formatMoneySpent`/StackedBarChart tooltip must be left alone to keep NG2/Amendment 2, so a change confined to `formatCurrency` is expected to satisfy that.

---

## 7. Summary for Complexity Assessment

The sub-cent rule lives in one place, `src/utils/currency.ts:27` (`formatCurrency`), reached by `formatSpend` and `formatMetricValue(CURRENCY)`. Through those, it reaches all four areas: Analytics widgets (MetricCard, TableWidget cells and totals, charts, leaderboard, CLI cost views), Profile (SpendingCard/Usage/Table), User management (details popup SpendingCard, SpendingAmount breakdown, BudgetSpendCell) and the Projects list (BudgetSpendCell, tooltip). Project detail sections use a separate local fixed 2-decimal formatter. Per-record costs use independent `toFixed(4)` code and the chart tooltip is separate inline code; these are unaffected by a change confined to the shared formatter.

The change surface is small (one function, one file), but the blast radius is wide: several screens outside the four areas (Budgets management, Budget details popup, project activity history, CLI analytics cost views) change for sub-cent values and need a decision. Three existing test files assert the old rule; Profile spending components have no money-output tests, so AC10 requires new tests across areas.

Key risk factors: scope of the shared change versus the four areas, an inaccurate NG5 premise, duplicate formatter names, backend-driven Workflows table columns, and sub-cent spend now reading `$0.00`.

---

## 8. External References

None named by the task (the prior technical analysis attachment was stated as not provided).
