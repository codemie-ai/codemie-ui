# Technical Research

**Task**: formatSpendQualificationSuffix spend qualification suffix CLI analytics
**Generated**: 2026-11-06
**Research path**: codegraph

---

## 1. Original Context

Follow-up of EPMCDME-16846. Remove the formatSpendQualificationSuffix function completely, together with all code that calls it, dead code related to it, and the related tests.

---

## 2. Codebase Findings

### Existing Implementations

Purpose: render a qualifier (partial / unavailable / missing amount) after a money figure.
- `src/utils/analyticsFormatters.ts:106` `formatSpendQualificationSuffix = (_qualification) => ''` is already a no-op stub. It always returns an empty string and ignores its argument. Every call site therefore appends nothing today.
- Wrappers in the same file:
  - `formatChartSpendQualificationSuffix` (:129) is used by `BarChartWidget.tsx:186` and `StackedBarChartWidget.tsx:278`.
  - `formatMetricQualification` (:150) is used by `MetricCard.tsx:41`. MetricCard renders it in a `<span>` that is never shown, because the string is empty (lines 59-67).
  - `formatQualifiedMetricValue` (:146) is used by `RatioWidget.tsx` (3 callers) and `analyticsFormatters.test.ts`.
  - `readCellSpendQualification` (:114), used by `TableWidget.tsx`.
- Direct callers of `formatSpendQualificationSuffix` (src):
  - `TableWidget.tsx:227,300`
  - `BarChartWidget.tsx:233`
  - `SpendingCard.tsx:228`
  - `LeaderboardSummaryMetrics.tsx:66` (inside `formatCurrencyMetric`, plus helper `spendAnnotationPrefix` :42 and the key filter at :52)
  - `ProjectBudgetsSection.tsx:131,222,552`
  - `ProjectOverviewSection.tsx:128,175,466`
  - `SpendingAmount.tsx:40` (prop `qualification`; its only caller is `UserProjectSpendingTable.tsx`)
  - `CostCenterBudgetRollupCard.tsx:270`
  - `UserBudgetsCell.tsx:73` (via `getCategoryQualification`)
  - `BudgetSpendMetrics.tsx:62` (prop `spendQualification`)
  - `BudgetSpendCell.tsx:87,125` (via `combineQualifications`)
- Leaf module `src/utils/spendQualification.ts` holds `SPEND_QUALIFICATION_FIELDS` and `readSpendQualification`. They are re-exported from `analyticsFormatters.ts:104`. `readSpendQualification` is also used by `types/entity/userProjectSpending.ts` and `SpendingCard.tsx:109`.
- The `SpendQualification` interface (`src/types/analytics.ts:147`) is extended by `Metric` (:153).

Other touched code, candidates for dead-code review: `combineQualifications`, `getCategoryQualification`, `spentQualification` and `unassignedSpendQualification` (ProjectBudgetsSection), `spendQualification` props, and the `spend_*` fields the Metric type carries. The grep counted 73 occurrences across 18 files of qualification-related names. The ABSENT marker and `formatMoneySpent` pending/unavailable handling is a separate mechanism (`utils/currency`, `formatRecordMoneySpent`) and is not named by the task.

### Decisions Already in the Code
- The stub was left in place with an unused `_qualification` parameter, so call sites and plumbing were kept after the suffix text was dropped (EPMCDME-16846 presumably). The reason is not recorded in code.
- Comment in `analyticsFormatters.ts:101-104` says the leaf module exists to avoid a `@/utils/helpers` -> `@/router` dependency for `types/entity/userProjectSpending`.

### Task Statements Checked Against the Code
- "Remove the function": holds, it exists at `analyticsFormatters.ts:106` with about 29 callers.
- "all code that calls it": holds, 14 source files plus 2 test files (listed above).
- "dead code related to it": unverified, because the boundary is not defined. The wrappers (`formatChartSpendQualificationSuffix`, `formatMetricQualification`) become dead. The readers, `SpendQualification` type and qualification props/helpers become candidates, and their other consumers are listed below.
- Keeping in place: `readSpendQualification` and the type are still used by `userProjectSpending.ts` and `SpendingCard.tsx:109`.

### Consumers of Changed Contracts
- `formatQualifiedMetricValue` -> `RatioWidget.tsx`.
- `formatMetricQualification` -> `MetricCard.tsx`.
- `formatChartSpendQualificationSuffix` -> `BarChartWidget`, `StackedBarChartWidget`.
- `readCellSpendQualification` -> `TableWidget`.
- `SpendingAmount` -> `UserProjectSpendingTable.tsx` (no tests found).
- Tests that touch the function:
  - `src/utils/__tests__/analyticsFormatters.test.ts` (import at :24, describe block :136-170+, other references in the 20 occurrences).
  - `src/pages/analytics/components/widgets/__tests__/MetricCard.spendQualification.test.tsx` (:21, :74).
  - `BudgetSpendMetrics.test.tsx` and `types/entity/__tests__/userProjectSpending.test.ts` reference qualification names.
- Not found: any use under `cli-analytics/` (`format.ts` only uses `formatMetricValue`). CLI analytics in `feature_area` does not call the function.

### Architecture and Layers Affected
Utils (`src/utils`), types (`src/types/analytics.ts`), analytics widgets and leaderboard (`src/pages/analytics`), settings/administration budget components (`src/pages/settings`).

### Integration Points
Backend analytics rows and budget rows carry the `spend_*` fields. They are read via `readSpendQualification`.

### Patterns and Conventions
Valtio stores and function components. Prettier and eslint run automatically after edits.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (testing-patterns.md, refactoring-patterns.md, code-organization.md). No guide mentions the suffix.

### Architectural Decisions
None found beyond the inline comments.

### Derived Conventions
Qualification logic is centralised in `analyticsFormatters.ts` and `spendQualification.ts`.

---

## 4. Testing Landscape

### Existing Coverage
Tests listed under Consumers of Changed Contracts. Vitest with React Testing Library; projects `unit` and `integration`.

### Testing Framework and Patterns
See `.ai-run/guides/testing/testing-patterns.md`.

### Coverage Gaps
`SpendingAmount` has no tests found.

---

## 5. Configuration and Environment

No env vars, config files or feature flags relate to this. `.codemie/codemie-cli.config.json` is modified in the working tree and is unrelated.

---

## 6. Risk Indicators

- Scope of "dead code related to it" is ambiguous. The qualification reader, type and props are shared with `SpendingCard.tsx:109` and `userProjectSpending.ts`.
- Wide surface: 14 source files plus tests. Many mix the suffix into template strings (e.g. `ProjectOverviewSection.tsx:466`, `TableWidget.tsx:227`), so each edit needs care.
- `MetricCard` and chart widgets carry qualification DOM/JSX and layout classes (`-mr-3 block ...`) that are only reachable through the stub.
- `analyticsFormatters.test.ts` has many cases that exercise the stub; removal must leave tests for the remaining functions intact.
- Speculative: removing the type fields from `Metric` could affect API mappers and mocks outside the grep above (not exhaustively checked).
- The `cli-analytics` keyword in the task matches no caller; the call sites are in other areas.

---

## 7. Summary for Complexity Assessment

`formatSpendQualificationSuffix` is already a stub returning an empty string, with about 29 call sites across 14 source files in utils, analytics widgets, leaderboard and settings/administration budget components, and 2 directly dependent test files. The change is mostly mechanical deletion, but it spreads across many files and edits template strings and JSX.

Related dead code is the wrapper functions (chart suffix, metric qualification, qualified metric value, cell reader), qualification props and helpers in budget components, and unreachable JSX in MetricCard. The shared reader and type are still used elsewhere, so their removal is a scoping decision. There is no technical novelty. Test coverage exists for the formatters and MetricCard, but not for `SpendingAmount`. The main risk is scope ambiguity and missed leftovers.

---

## 8. External References

None named by the task.
