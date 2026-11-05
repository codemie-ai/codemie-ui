# Technical Research

**Task**: money spent suffix budget
**Generated**: 2026-11-05
**Research path**: codegraph

---

## 1. Original Context

Review Jira EPMCDME-16900 and implement the fix. Basically when money spent pending or money spent unavailable flags returns true, we should not show any moneySpent left to formatMoneySpentSuffix and should display ABSENT_VALUE_MARKER with suffix. (Related prior commit: "EPMCDME-16846: Hide spend qualification suffix".) Locate formatMoneySpentSuffix, ABSENT_VALUE_MARKER, the pending/unavailable money-spent flags and all call sites.

---

## 2. Codebase Findings

### Existing Implementations

Purpose A: render a record's money spent, qualified by "pending" / "unavailable" flags.

- `formatMoneySpentSuffix({pending, unavailable})` - `src/utils/currency.ts:41`. Returns `' (awaiting final cost)'` if pending, else `' (final cost unavailable)'` if unavailable, else `''`. Takes only the flags, never the amount. Pending wins when both are set.
- `ABSENT_VALUE_MARKER = '-'` - `src/utils/analyticsFormatters.ts:33`. Also used by `formatMetricValue` (:70) and `SchedulerRunDetailsPage.tsx`. It is exported from `analyticsFormatters.ts` and not from `currency.ts`.
- Three renderers call `formatMoneySpentSuffix`. They differ in what they do with the amount:
  - `formatRecordMoneySpent` - `src/utils/analyticsFormatters.ts:52-61`. Used by `DataSourceDetails.tsx:814` (`dataSource.tokens_usage`) and `WorkflowExecutionInfoPopup.tsx:110` (`execution.tokens_usage`).
    - Rule today: `money_spent == null`, or `money_spent === 0` with pending/unavailable set, renders `-<suffix>`. Anything else renders `$<n.toFixed(4)><suffix>`. A pending or unavailable flag with a non-zero amount therefore still shows the amount.
    - Its doc comment says this: a flagged zero is the backend `SettledMoney` placeholder, and an unflagged zero is a real zero.
  - `ChatHeader.tsx:169-184`, inline in the `DataOverlayButton<ChatMetrics>` render callback. Flags are `data.money_spent_pending` and `data.money_spent_unavailable`.
    - Rule today: `total_money_spent == null` renders `-<suffix>`. Otherwise it renders `$<n.toFixed(4)><suffix>`. A flagged non-null amount is shown, and so is a flagged zero (`$0.0000 (awaiting final cost)`).
  - `formatRunCost` - `src/pages/schedulers/SchedulerRunDetailsPage.tsx:59-66`, a local function. Flags are `metrics.moneySpentPending` and `metrics.moneySpentUnavailable` (camelCase).
    - Rule today: `cost == null` renders `-<suffix>`. Otherwise it renders `$<cost.toFixed(4)><suffix>`. A flagged amount is shown.
- Flag fields (types):
  - `money_spent_pending` and `money_spent_unavailable` in `src/types/entity/conversation.ts:273-274` (`ChatMetrics`, with `total_money_spent: number` at :269).
  - The same pair in `src/types/entity/workflow.ts:86-87` and `src/types/entity/dataSource.ts:292-293`.
  - `moneySpentPending` and `moneySpentUnavailable` in `src/store/schedulerRuns.ts:50-51` (`cost: number | null`).
  - The local `RecordMoneySpent` interface at `analyticsFormatters.ts:40-44`.
- Other reader of a flag: `src/pages/workflows/details/hooks/useWorkflowData.ts:62` reads `tokens_usage.money_spent_pending` to keep polling a finished execution (`MAX_COST_SETTLEMENT_POLLS`). It does not render. Its input is unchanged by a display-only change.

Purpose B: the other "spend qualification" suffix family, which the prior commit EPMCDME-16846 touched.

- `formatSpendQualificationSuffix` - `analyticsFormatters.ts:116`. It now returns `''` unconditionally (`_qualification` unused). This is consistent with "Hide spend qualification suffix".
- It is separate from `formatMoneySpentSuffix`: different inputs (`spend_partial`, `spend_unavailable`, `spend_missing_amount`, read by `src/utils/spendQualification.ts`).
- Callers: `LeaderboardSummaryMetrics.tsx:66`, `UserBudgetsCell.tsx:73`, `ProjectBudgetsSection.tsx:222`, `formatChartSpendQualificationSuffix`, `formatQualifiedMetricValue` and `formatMetricQualification` (all in `analyticsFormatters.ts`).
- This family has no connection to the `money_spent_*` flags, and the file is not named in the task.

Other touched code
- `src/utils/currency.ts` also holds `formatCurrency`, `formatSpend` (null renders `-`) and `formatCliAnalyticsCost`. Only `formatMoneySpentSuffix` is in scope.
- "budget" in `feature_area` matched only the unrelated budget-management module (`types/entity/budget.ts`, `projectBudget.ts`, `store/budgets.ts`, `BudgetModal.tsx`, `ProjectBudgetsSection.tsx`, `UserBudgetsCell.tsx`). It has no `money_spent_*` usage.

### Decisions Already in the Code

- Convention: absent figure renders as `-` plus suffix, never `$0`.
  - Shown at `ChatHeader.tsx:178-183`, `SchedulerRunDetailsPage.tsx:57-58`, `analyticsFormatters.ts:46-50`, `currency.ts:31-36`.
  - Reason in code: EPMCDME-15204, "absent is not zero".
- Pending and unavailable are mutually exclusive by contract (`currency.ts:38-40`, `schedulerRuns.ts:47-48`, `conversation.ts:272`). Pending takes priority in the formatter if both are set.
- A flagged zero is treated as a placeholder (`SettledMoney` backend rule, `analyticsFormatters.ts:46-50`). A flagged non-zero amount is deliberately shown as "settled subtotal" (`conversation.ts:272`, `schedulerRuns.ts:48`: "a non-null cost is only the settled subtotal"). This is the behavior the task would change.
- The three renderers do not share one function. `ChatHeader` and `formatRunCost` duplicate the `null` -> `-` rule inline, and only `formatRecordMoneySpent` implements the flagged-zero rule.
- The suffix function takes only flags, so "no amount left to the suffix function" already holds structurally.

### Task Statements Checked Against the Code

- "when pending or unavailable flags return true, we should not show any moneySpent ... display ABSENT_VALUE_MARKER with suffix":
  - Contradicted for non-zero amounts in all three renderers. They show `$x.xxxx (awaiting final cost)` and `$x.xxxx (final cost unavailable)`.
  - Holds only for null amounts everywhere, and for flagged zero in `formatRecordMoneySpent`.
  - `ChatHeader` shows `$0.0000 (...)` for a flagged zero.
  - This keeps three existing mechanisms in place (see Section 6): `formatRecordMoneySpent`, `ChatHeader` inline, `formatRunCost`.
- "Related prior commit EPMCDME-16846 Hide spend qualification suffix":
  - Holds in effect. `formatSpendQualificationSuffix` returns `''` (`analyticsFormatters.ts:116`).
  - That commit touched the spend-qualification family, not `formatMoneySpentSuffix`.
- "formatMoneySpentSuffix ... call sites": holds. There are exactly 3 production call sites: `analyticsFormatters.ts:56`, `ChatHeader.tsx:169`, `SchedulerRunDetailsPage.tsx:61`.
- The Jira ticket text itself is not in reach. The wording above is the only specification available (unverified beyond `task_context`).

### Consumers of Changed Contracts

If the rendered output for flagged records changes, these consumers and tests depend on the current output:

- `formatRecordMoneySpent` -> `DataSourceDetails.tsx:814`, `WorkflowExecutionInfoPopup.tsx:110`.
- `ChatHeader.tsx` 'Money spent' row (no other consumer of `ChatMetrics.total_money_spent` outside tests).
- `SchedulerRunDetailsPage.tsx` 'Cost' row, via `formatRunCost` (local to the file).
- `formatMoneySpentSuffix` signature (flags only) is used by all three. Nothing else in `src` references it.
- Tests asserting a flagged non-zero amount shown with the suffix (these encode the current behavior):
  - `ChatHeader/__tests__/ChatHeader.test.tsx:409-437` - `$1.5000 (awaiting final cost)`, `$1.5000 (final cost unavailable)`.
  - `workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx:262-293` - `$1.2345 (awaiting final cost)`, `$1.2345 (final cost unavailable)`.
  - `dataSources/components/__tests__/DataSourceDetails.test.tsx:214-243` - `$0.5000 (awaiting final cost)`, `$0.5000 (final cost unavailable)`.
- Tests already consistent with the task:
  - `WorkflowExecutionInfoPopup.test.tsx:190-233` (null and flagged zero -> `- (...)`).
  - `DataSourceDetails.test.tsx:254-278` (flagged zero).
  - `SchedulerRunDetailsPage.integration.test.tsx:159-168` (null cost + pending -> `- (awaiting final cost)`).
- The scheduler test has no case for a non-null cost with a flag.
- `useWorkflowData.test.ts` covers the polling flag only.

### Architecture and Layers Affected

- Utils layer: `src/utils/currency.ts`, `src/utils/analyticsFormatters.ts`.
- Page components: chat (`ChatHeader`), schedulers (`SchedulerRunDetailsPage`), workflows (`WorkflowExecutionInfoPopup`), dataSources (`DataSourceDetails`).
- Types and store (flag definitions only): `types/entity/{conversation,workflow,dataSource}.ts`, `store/schedulerRuns.ts`.

### Integration Points

- `analyticsFormatters.ts` imports `formatMoneySpentSuffix` and `formatCurrency` from `@/utils/currency`. `currency.ts` has no imports, and `ABSENT_VALUE_MARKER` lives in `analyticsFormatters.ts`.
- `ChatHeader.tsx` and `SchedulerRunDetailsPage.tsx` import `formatMoneySpentSuffix` from `@/utils/currency`.
- `SchedulerRunDetailsPage.tsx` uses `ABSENT_VALUE_MARKER`. `ChatHeader.tsx` uses a literal `-`.
- `analyticsFormatters.ts` pulls in `@/utils/helpers` (-> `@/router`). `currency.ts` stays a leaf.

### Patterns and Conventions

- Formatters are pure functions in `src/utils`, with doc comments naming the ticket or backend rule. Money for single records uses `toFixed(4)`.
- Tests are colocated in `__tests__/` and use Vitest + React Testing Library.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists. Relevant: `development/code-organization.md`, `testing/testing-patterns.md`, `quality-gates.md`. They were not read in detail. Conventions below come from code. No guide mentions the money-spent suffix.

### Architectural Decisions
Inline comments only (`currency.ts:38-40`, `analyticsFormatters.ts:46-50`, `conversation.ts:272`, `schedulerRuns.ts:47-48`). No ADR found.

### Derived Conventions
See Section 2 "Decisions Already in the Code".

---

## 4. Testing Landscape

### Existing Coverage
- ChatHeader: `ChatHeader.test.tsx:395-437`.
- WorkflowExecutionInfoPopup: `WorkflowExecutionInfoPopup.test.tsx` (11 references).
- DataSourceDetails: `DataSourceDetails.test.tsx` (7 references).
- Scheduler run: `SchedulerRunDetailsPage.integration.test.tsx:139-168`.
- Polling flag: `useWorkflowData.test.ts`.
- `src/utils/__tests__/analyticsFormatters.test.ts` covers the spend-qualification family and has no `formatRecordMoneySpent` test.

### Testing Framework and Patterns
Vitest with React Testing Library, `unit` and `integration` projects. Page-level render assertions on exact text, with API mocks via `mockAPI` (scheduler) and store mocks (ChatHeader). Per `AGENTS.md`, write or run tests only when the user explicitly asks.

### Coverage Gaps
- No direct unit test for `formatMoneySpentSuffix` and none for `formatRecordMoneySpent` in `src/utils/__tests__`.
- No scheduler test for non-null cost + flag.
- No ChatHeader test for a flagged zero.

---

## 5. Configuration and Environment

### Environment Variables
None found relevant (searched `money spent suffix budget config env`).

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
None found. The pending and unavailable flags are backend response fields, not UI feature flags.

---

## 6. Risk Indicators

- Existing mechanism kept in place (see Section 2, "Task Statements Checked Against the Code"): three separate renderers (`formatRecordMoneySpent`, `ChatHeader.tsx:181-184`, `formatRunCost`) each decide independently whether to show the amount. The suffix function cannot hide an amount, since it never receives one.
- `ChatHeader` and `formatRunCost` do not apply the flagged-zero rule. `formatRecordMoneySpent` does. All three differ on flagged non-zero amounts versus the task wording.
- Nine existing assertions (three files, listed in "Consumers of Changed Contracts") encode the current flagged non-zero rendering.
- Both `ChatHeader` and `formatRunCost` use the sentence-level rule "null -> `-`", which duplicates `formatRecordMoneySpent`.
- `ABSENT_VALUE_MARKER` is exported only from `analyticsFormatters.ts` (heavier import chain). `currency.ts` is a dependency-free leaf. `ChatHeader.tsx` uses a literal `-`.
- Speculative: the Jira text was not available. Whether "unavailable" should hide a settled subtotal is not stated beyond the task wording, and the code comments (`conversation.ts:272`, `schedulerRuns.ts:48`) describe that subtotal as meaningful.
- Speculative: `formatSpendQualificationSuffix` (returns `''`) is a different family. It could be mistaken for the target because of the "suffix" name and the prior-commit hint.

---

## 7. Summary for Complexity Assessment

The suffix is produced by `formatMoneySpentSuffix` (`src/utils/currency.ts:41`), which receives only the two flags. The amount is decided in three places: `formatRecordMoneySpent` (`analyticsFormatters.ts:52`, serving data source details and the workflow execution popup), the `ChatHeader` usage-details row (`ChatHeader.tsx:181`) and `formatRunCost` in the scheduler run page (`SchedulerRunDetailsPage.tsx:59`). Today a null amount renders `-<suffix>` everywhere. A flagged zero renders `-<suffix>` only in `formatRecordMoneySpent`. A flagged non-zero amount renders `$x.xxxx<suffix>` in all three. The task wording contradicts the latter.

Code surface: 3 production files (plus `currency.ts` if the logic is consolidated), four page components affected. No type, store or config changes are evidenced by the code. Novelty is low: pure string formatting with an established "absent marker" convention. `formatSpendQualificationSuffix` is a separate, already-silenced family.

Test posture: all three renderers have page-level tests, and nine assertions across `ChatHeader.test.tsx`, `WorkflowExecutionInfoPopup.test.tsx` and `DataSourceDetails.test.tsx` pin the current flagged non-zero output. There are no direct unit tests of the formatters. Main risks: the three duplicated renderers diverging, the code comments describing the flagged figure as a meaningful settled subtotal, and the missing ticket text.

---

## 8. External References

None named by the task. The Jira ticket EPMCDME-16900 was referenced by key only, with no path or URL. It is not readable from the repository, so the wording in `task_context` is the only specification.
