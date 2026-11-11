# Remove Spend Qualification Suffix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Delete `formatSpendQualificationSuffix` and everything that exists only to feed it, with rendered output unchanged.

**Architecture:** Pure deletion, leaves first: settings budget components, then analytics widgets, then the shared utils, then the type declarations. Whether a type or field is removed is decided by evidence (Task 1). Tests are removed or kept case by case (see Test disposition).

**Tech Stack:** React 18, TypeScript 5, Vitest + RTL.

**Spec:** `story.md` (EPMCDME-16942) and `technical-analysis.md`, both in this directory.

## Acceptance criteria

- No definition, import or call of `formatSpendQualificationSuffix` remains.
- Wrappers, props, helpers and markup that only produced or passed the suffix are gone, with no unused imports or variables.
- `readSpendQualification`, `getCategoryQualification` and their feeders are gone, and SpendingCard and user project spending render the same values.
- Only tests whose subject is the suffix, a removed wrapper or removed markup (including "suffix is absent" assertions) are removed. Tests of live behaviour (absent marker, measured zero, absent footer totals, colours, mixed known and unknown totals, retired lifetime figure) are kept, rewritten without the removed fields and props, and pass.
- Rendered text and layout are unchanged.
- Lint and type-check are clean and the affected tests pass.

## Global Constraints

- Do not run `git commit` or branch operations. The calling flow owns them. Renaming a test file is a plain file move.
- No new tests, including for `SpendingAmount`. Do not delete a test file unless every case in it has a removed-code subject.
- No change to how spend values, amounts or budgets are calculated or displayed. Do not touch backend mappers or mocks beyond the Task 1 evidence rule.
- Keep live absent-marker logic (EPMCDME-16900), e.g. `TableWidget.tsx:282-286`, untouched.
- No task may leave a broken import. Task 4 deletes the `analyticsFormatters.ts` re-export line, so every consumer importing `readSpendQualification` or `SPEND_QUALIFICATION_FIELDS` through `@/utils/analyticsFormatters` is fixed or cleaned in the task that owns that file (see Import map).
- Prettier and eslint run automatically after edits. Do not re-run them. Run `npm ci` before trusting any gate.

## Import map (consumers of the re-export Task 4 deletes)

Every non-test file that imports `readSpendQualification` or `SPEND_QUALIFICATION_FIELDS` through `@/utils/analyticsFormatters`, and what to do with it:

- `settings/components/SpendingCard.tsx:51` (Task 2): the `readSpendQualification` import goes away with the spread at :109.
- `CostCenterBudgetRollupCard.tsx:30` (Task 2): the `readSpendQualification` import goes away with :104 and :270.
- `widgets/TableWidget.tsx:31` and `widgets/StackedBarChartWidget.tsx:35` (Task 3): the `readSpendQualification` import goes away with their usage.
- `leaderboard/LeaderboardSummaryMetrics.tsx:18-22` (Task 3): `SPEND_QUALIFICATION_FIELDS` is live, so import it from `@/utils/spendQualification`. The `formatSpendQualificationSuffix` and `readSpendQualification` imports go away.
- Direct importers of `@/utils/spendQualification` (not via the re-export): `types/entity/userProjectSpending.ts:17` loses its import in Task 2 with `getCategoryQualification`. `analyticsFormatters.ts:20` loses its import in Task 4.

## Evidence rule (type removal)

User decision: "If the interfaces are used, keep them; if not used, remove them as dead code." The architecture review only analysed the reader and its feeders, not the payload-type bases. So `SpendQualification`, `CategorySpendQualifications`, the `extends SpendQualification` bases and the typed `spend_*` fields are removed ONLY IF, once the suffix chain is gone, no remaining non-test code reads or relies on them. A raw-key read from an untyped `Record` (as in `TableWidget`) is live behaviour and stays.

## Test disposition (line numbers are today's; REMOVE = suffix/removed-code subject, KEEP = live behaviour)

Surviving fixtures drop the removed props and `spend_*` fields. Assertions stay.

- `TableWidget.spendQualification.test.tsx`: KEEP :68 (absent shows '-'), :76 (measured zero), :146 (no footer slot), :155 (flag-only footer shows marker), :168 (footered-but-unknown shows marker). REMOVE :83, :93, :103, :113, :130, :137. Rename the file to `TableWidget.absentFigures.test.tsx` (its helpers are local) and the describe to "TableWidget absent figures". Drop `MONEY_COLUMNS` entries or helpers that become unused.
- `MetricCard.spendQualification.test.tsx`: KEEP :39 (plain currency figure), :63 (absent marker), :77 (measured zero), :107 (value override, minus `spend_partial`). REMOVE :45, :51, :57, :69, :83, :100. Rename the file to `MetricCard.test.tsx` (it is MetricCard's only test file), describe "MetricCard", and drop the formatter import.
- `BarChartWidget.spendQualification.test.tsx`: KEEP :134 (unpriced row is a null bar with '-' tooltip). REMOVE :127, :141, :147, :153. Rename to `BarChartWidget.unpricedRows.test.tsx` and drop the `spend_*` fields from `ROWS`.
- `StackedBarChartWidget.absentSeries.test.tsx`: KEEP the whole "absent series values" describe (:121-157). REMOVE the "spend qualification" describe (:159-200) and its `partialRow` helper.
- `SpendingAmount.test.tsx`: KEEP :30-60 and :132 (threshold colour on a high spend, retitled to drop "partial", minus the qualification prop). REMOVE :62, :67, :82, :93, :104, :116 and :121. :121 minus its prop duplicates :35 ("renders zero spend rather than a dash"), and its only added value was "even when qualified".
- `BudgetSpendCell.test.tsx`: KEEP :30 (drop its two `queryByText(/at least|incomplete data/)` absence assertions), :45 (retitled "sums only the resolved parts, against every part's limit": platform 10 and cli 5 resolved, premium_models unknown with limit 25, expects `$15.00 / $175.00`; it sets no `spend_*` fields, so only the title and the stale comment change), :130 (all absent shows '-'), :144 (per-row amounts, drop `spend_*`), :164, :175. REMOVE :61, :86, :112. Re-check: each of those three asserts `$15.00 / $150.00` with all parts resolved, which :30 already covers. Their only distinct subject is combining `spend_partial`, `spend_missing_amount` and `spend_unavailable`, which is removed code.
- `ProjectBudgetsSection.test.tsx`: REMOVE :210 (partial category spend). KEEP :232, retitled "shows no retired lifetime figure", minus `spend_partial` and `spend_missing_amount`. Rename the describe at :203 to drop "spend qualification".
- `ProjectOverviewSection.test.tsx`: KEEP :118, retitled the same way, minus `spend_*`. Rename the describe at :117.
- `BudgetSpendMetrics.test.tsx`: REMOVE the "spend qualification" describe (:69-83), whose only case has a removed-prop subject. KEEP :36-67.
- `CostCenterBudgetRollupCard.test.tsx`: REMOVE :1086 (qualifies a partial total). KEEP everything else.
- `ProjectMembersSpending.test.tsx`: REMOVE :152 (qualifies the spend half). KEEP the others.
- `UserProjectSpendingTable.test.tsx`: REMOVE :94. KEEP :64, :75, :86, :118.
- `LeaderboardSummaryMetrics.test.tsx`: REMOVE :68 and :83. KEEP :45, :52, :62, :93 (annotation keys are not rendered as tiles, which is live), :112. The `buildSummaryMetrics` annotation keys stay because :93 uses them.
- `userProjectSpending.test.ts`: KEEP :34. KEEP :38, dropping the `getCategoryQualification` assertion and the `platform_spend_*` fixture fields. REMOVE :56. Keep the "first import" comment and ordering intact.
- `analyticsFormatters.test.ts`: KEEP the `formatMetricValue` (:31-97) and `humanizeAnalyticsLabel` (:227-239) describes. REMOVE the `readSpendQualification` (:99), `formatSpendQualificationSuffix` (:136), `SPEND_QUALIFICATION_FIELDS` (:173) and `formatQualifiedMetricValue` (:187) describes. The last one only wraps the already-covered `formatMetricValue` cases. Trim the now-unused imports (`Metric`, `ColumnType`, the removed symbols).

## Review Focus

- The leaderboard's `isSpendAnnotationKey` filter (`LeaderboardSummaryMetrics.tsx:49-54`) hides annotation tiles and needs `SPEND_QUALIFICATION_FIELDS`. It is live, so keep it, and keep its test :93.
- `TableWidget` unknown-total logic (`:282-286`) keeps coverage through the three footer cases that are kept.
- `BudgetSpendCell` total with a mix of known and unknown spends (unknown spend left out, its limit still counted) is covered only by the kept :45.
- `MetricCard`, `BarChartWidget` and `StackedBarChartWidget` render nothing extra once the dead `&&` blocks are removed (the string was always `''`).
- Surviving typed fixtures must drop removed fields so type-check passes, without changing assertions.

---

### Task 1: Classify every reader of the qualification flags

Test-first: no — read-only verification, no behaviour change.

**Files:** none edited.

- [ ] Grep non-test `src/` for `spend_unavailable|spend_partial|spend_missing_amount`, the `*_`-prefixed variants, `SPEND_QUALIFICATION_FIELDS`, `readSpendQualification`, `SpendQualification` and `CategorySpendQualifications`. Classify each hit as **suffix-chain** (removed in Tasks 2-4) or **live** (rendering a dash/absent marker, filtering keys, branching on a flag).
- [ ] Starting classification to verify, not to trust. Suffix-chain: `analyticsFormatters.ts` (`readCellSpendQualification`, chart/metric wrappers), `spendQualification.ts` (`readSpendQualification`), `SpendingCard.tsx:109`, `BudgetSpendCell.tsx` (`combineQualifications`), the `SpendingAmount`/`BudgetSpendMetrics`/`ProjectBudgetsSection` props, `CostCenterBudgetRollupCard.tsx:104,270`, `UsersManagementPage.tsx:402-404`, `ProjectsManagementFull.tsx:556-558`, `LeaderboardSummaryMetrics.tsx:66-68`, `StackedBarChartWidget.tsx:278-282`, `TableWidget.tsx:300-306`, `BarChartWidget.tsx:182-186`. Live: `TableWidget.tsx:282-286`, `LeaderboardSummaryMetrics.tsx:42-54`. Check `StackedBarChartWidget`, `BudgetSpendCell` and the leaderboard for further live uses.
- [ ] Record the table (hit, class, decision) in the task output. Task 5 consumes it.

### Task 2: Settings budget components and their tests

Test-first: no — deletion; kept tests must still pass.

**Files:** modify `ProjectBudgetsSection.tsx` (:31,41,62,72,131,165,222,483,494,552), `ProjectOverviewSection.tsx` (:27,128,175,466), `CostCenterBudgetRollupCard.tsx` (:30,104,270), `projectsManagement/components/UserBudgetsCell.tsx` (:10,14,73), `projectsManagement/components/BudgetSpendMetrics.tsx` (:19,20,36,50,62), `administration/components/BudgetSpendCell.tsx` (:19,21,26,39-66,86-87,125), `administration/components/SpendingAmount.tsx` (:19,20,26,33,40), `usersManagement/components/UserProjectSpendingTable.tsx` (:30,83), `settings/components/SpendingCard.tsx` (:50,51,109,228), `UsersManagementPage.tsx` (:400-404), `ProjectsManagementFull.tsx` (:556-558), `types/entity/userProjectSpending.ts` (`getCategoryQualification` :74-77 and its reader import at :17). Tests: the settings files in Test disposition.

- [ ] Remove each suffix call, keeping the surrounding text (`` `${formatCurrency(x)}${suffix}` `` becomes `formatCurrency(x)`). Remove the `spentQualification`, `unassignedSpendQualification`, `spendQualification` and `qualification` props and fields, `combineQualifications`, `getCategoryQualification`, the `SpendingCard` spread, the `qualifiedSpend`/`qualifiedTotalSpend` temporaries, the spend_* copies onto budget items, and the stale comments. `BudgetSpendCellItem` stops extending `SpendQualification` only if Task 1 allows.
- [ ] Clean the imports per the Import map: remove the `readSpendQualification` and `formatSpendQualificationSuffix` imports from `SpendingCard.tsx` and `CostCenterBudgetRollupCard.tsx`, and the `getCategoryQualification` imports from `UserBudgetsCell.tsx` and `UserProjectSpendingTable.tsx`.
- [ ] Apply the Test disposition to the settings test files listed there.
- [ ] Run the affected test files with `npx vitest run <paths>`. Expected: all pass, and the `Test Files` line shows no suite failing to import.

### Task 3: Analytics widgets, leaderboard and their tests

Test-first: no — deletion; MetricCard and chart output must stay identical.

**Files:** modify `MetricCard.tsx` (:19,35,41,59-67), `RatioWidget/RatioWidget.tsx` (:31,152), `TableWidget.tsx` (:29-31,222-227,300-306), `BarChartWidget.tsx` (:39-42,182-186,233-236,326-328), `StackedBarChartWidget.tsx` (:34,35,274-283,301-305), `leaderboard/LeaderboardSummaryMetrics.tsx` (:18-22,61-68). Tests: the analytics files in Test disposition, including the three renames.

- [ ] `MetricCard`: render `formatMetricValue(metric.value, metric.format)` only, and remove the dead `<span>` and its comments. `RatioWidget:152`: use `formatMetricValue(metric.value, metric.format)`. `TableWidget`: drop the suffix at :227 and the `qualificationSuffix` variable at :300-306. Keep :282-286 unchanged. `BarChartWidget`: remove `qualifications`, `chartQualification`, the tooltip suffix and the "Bars show spend" note. `StackedBarChartWidget`: remove the `chartQualification` memo and the note.
- [ ] `LeaderboardSummaryMetrics`: `formatCurrencyMetric` returns `formatSpend(typeof value === 'number' ? value : null)` and drops its `summaryMetrics` parameter. Keep `spendAnnotationPrefix` and `isSpendAnnotationKey`. Replace the import block at :18-22 with `import { SPEND_QUALIFICATION_FIELDS } from '@/utils/spendQualification'`, because Task 4 removes the `analyticsFormatters` re-export.
- [ ] Clean the imports per the Import map: remove `formatSpendQualificationSuffix`, `readCellSpendQualification`, `formatChartSpendQualificationSuffix`, `formatMetricQualification`, `formatQualifiedMetricValue` and `readSpendQualification` from `MetricCard`, `RatioWidget`, `TableWidget`, `BarChartWidget` and `StackedBarChartWidget` (keep `formatMetricValue` where used).
- [ ] Apply the Test disposition to the analytics test files listed there.
- [ ] Run the affected test files. Expected: pass.

### Task 4: Remove the formatter, wrappers and reader from utils

Test-first: no — all callers and re-export consumers are gone after Tasks 2-3.

**Files:** modify `src/utils/analyticsFormatters.ts` (:17,20,101-151), `src/utils/spendQualification.ts`, `src/utils/__tests__/analyticsFormatters.test.ts`.

- [ ] Delete `formatSpendQualificationSuffix`, `readCellSpendQualification`, `formatChartSpendQualificationSuffix`, `formatQualifiedMetricValue`, `formatMetricQualification`, the re-export line at :104 and its import at :20. In `spendQualification.ts` delete `readSpendQualification` and its `SpendQualification` type import. Keep `SPEND_QUALIFICATION_FIELDS` there, since the leaderboard imports it from this module (Task 3). Drop the unused `Metric`/`SpendQualification` imports in `analyticsFormatters.ts`.
- [ ] Grep `src/` for `from '@/utils/analyticsFormatters'` imports of any deleted symbol (tests included). Expected: none.
- [ ] Apply the Test disposition to `analyticsFormatters.test.ts`.
- [ ] Run `npx vitest run src/utils/__tests__/analyticsFormatters.test.ts`. Expected: pass.

### Task 5: Remove unused qualification types per the evidence rule

Test-first: no — type-only change, verified by type-check.

**Files:** modify `src/types/analytics.ts:135-162`, `budget.ts:16,57-61`, `costCenter.ts:16,30,44`, `project.ts:16,27,34,40`, `projectManagement.ts:16,72,92`, `userProjectSpending.ts:16,24-36,48`, and surviving typed test fixtures that type-check flags.

- [ ] For each declaration, apply the Task 1 table. With zero live readers, remove the `SpendQualification` interface, each `extends SpendQualification` base, `CategorySpendQualifications` and its doc comments. If a live reader remains for a specific field or interface, keep that declaration and note it in the task output. Do not touch the untyped `Record` comment at `analytics.ts:~430`.
- [ ] Run `npx tsc --noEmit`. Drop removed fields from any surviving typed fixture it flags, without changing assertions. Then run `npx eslint` on the touched files and confirm there are no unused imports or variables. Finally run `npx vitest run` on the files touched in Tasks 2-5. Expected: clean, and the kept tests all pass.

---

negative-constraints: honored. No new tests and no backend or mock changes (Global Constraints, Tasks 2-3). The data model changes only under the Task 1 evidence rule (Task 5). Calculation and display are unchanged (Review Focus). Live absent-marker behaviour and its tests are kept (Test disposition). No git operations (Global Constraints).

## Revision history

- rev 2: live-behaviour tests kept per user feedback; the three `*.spendQualification` test files renamed rather than deleted.
- rev 3: `SpendingAmount.test.tsx :121` moved to REMOVE (duplicates :35 once its qualification prop is gone). Added the Import map and import-cleanup steps in Tasks 2-4. The leaderboard now imports `SPEND_QUALIFICATION_FIELDS` from `@/utils/spendQualification`, which keeps the constant, so the earlier "move into the leaderboard file" option is dropped.
- rev 4: `BudgetSpendCell.test.tsx :45` moved to KEEP and retitled "sums only the resolved parts, against every part's limit" (a live mix of known and unknown spends, with no `spend_*` fixtures). :61, :86 and :112 were re-checked and stay REMOVE, because each asserts `$15.00 / $150.00` with all parts resolved, which :30 covers.
