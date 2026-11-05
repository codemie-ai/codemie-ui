# EPMCDME-16900 Flagged money spent renders absent marker - Implementation Plan

**Goal:** When `money_spent_pending` or `money_spent_unavailable` is true, never render the amount; render `ABSENT_VALUE_MARKER` + `formatMoneySpentSuffix` output (`- (awaiting final cost)` / `- (final cost unavailable)`) whether the amount is null, zero or non-zero.

**Approach:** One shared leaf helper in `src/utils/currency.ts` decides amount-vs-marker; the three renderers delegate to it. `ChatHeader.test.tsx` mocks `useVueRouter`, so `ChatHeader.tsx` must not import `analyticsFormatters` (it pulls `@/utils/helpers` -> router). Hence `ABSENT_VALUE_MARKER` is defined once in the `@/constants` barrel (`src/constants/index.ts`, a leaf with no router chain, per `constants-usage.md` "single source in `src/constants/`" / "import from `@/constants` barrel"), and every importer — `currency.ts`, `analyticsFormatters.ts`, components and tests — imports it from there. No re-export. `formatMoneySpentSuffix` is module-private to `currency.ts`; `formatMoneySpent` is the only public entry point.

Commit per task using the repository's existing convention. Do not run whole-suite gates here; the calling flow owns them.

## Task 1: Shared helper and `formatRecordMoneySpent`

**Files:** `src/utils/currency.ts`, `src/utils/analyticsFormatters.ts:33,52-61`, tests `src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx:262-293`, `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx:214-243`

Test-first: yes — the pending/unavailable non-zero cases (`$1.2345 (...)` in WorkflowExecutionInfoPopup, `$0.5000 (...)` in DataSourceDetails) must expect `` `${ABSENT_VALUE_MARKER} (awaiting final cost)` `` / `` `${ABSENT_VALUE_MARKER} (final cost unavailable)` `` and fail until the helper is wired in.

- [ ] Edit the four assertions (WorkflowExecutionInfoPopup lines 275, 292; DataSourceDetails lines 225, 242) to the new text. Run those two files; confirm they fail.
- [ ] Move the `ABSENT_VALUE_MARKER = '-'` definition (with its doc comment) from `analyticsFormatters.ts` into `src/constants/index.ts`. In `currency.ts` import it from `@/constants`, use it in `formatSpend` instead of the literal `'-'`, make `formatMoneySpentSuffix` non-exported, and add below it:

```ts
/** Flagged (pending/unavailable) money never shows an amount; an absent amount is not zero. */
export const formatMoneySpent = (
  amount: number | null | undefined,
  flags: { pending?: boolean | null; unavailable?: boolean | null }
): string => {
  const suffix = formatMoneySpentSuffix(flags)
  return amount == null || flags.pending || flags.unavailable
    ? `${ABSENT_VALUE_MARKER}${suffix}`
    : `$${amount.toFixed(4)}`
}
```

- [ ] In `analyticsFormatters.ts` import `ABSENT_VALUE_MARKER` from `@/constants` and `formatMoneySpent` from `@/utils/currency` (no re-export of the marker), repoint every other `ABSENT_VALUE_MARKER` importer (`SpendingCard`, `TableWidget`, `StackedBarChartWidget` and their tests) to `@/constants`, and reduce `formatRecordMoneySpent` to one call to `formatMoneySpent(usage?.money_spent, { pending, unavailable })`. Drop the now-unused `formatMoneySpentSuffix` import and the placeholder-zero branch; rewrite its doc comment to the new rule (flagged hides the amount; unflagged zero still renders `$0.0000`).
- [ ] Update the comment above `formatMoneySpentSuffix` (`currency.ts:38-40`) so it no longer says the figure is a settled subtotal that is shown.
- [ ] Run both test files; confirm they pass, including the existing null and flagged-zero cases.

## Task 2: ChatHeader usage-details row

**Files:** `src/pages/chat/components/ChatHeader/ChatHeader.tsx:33,169-184`, test `src/pages/chat/components/ChatHeader/__tests__/ChatHeader.test.tsx:409-437`

Test-first: yes — with `total_money_spent: 1.5` and pending (or unavailable) set, the row must read `- (awaiting final cost)` (`- (final cost unavailable)`); currently renders `$1.5000 (...)`.

- [ ] Change the expectations at lines 420 and 435 to the new text. Run the file; confirm failure.
- [ ] In `ChatHeader.tsx` replace the local `moneySpentSuffix` and the ternary for `'Money spent'` with `formatMoneySpent(data.total_money_spent, { pending: data.money_spent_pending, unavailable: data.money_spent_unavailable })`, importing from `@/utils/currency` (swap the `formatMoneySpentSuffix` import). Keep the absent-not-zero comment, trimmed to point at the helper. Do not import `analyticsFormatters`.
- [ ] Run the file; confirm it passes.

## Task 3: Scheduler run `formatRunCost`

**Files:** `src/pages/schedulers/SchedulerRunDetailsPage.tsx:35-36,57-66`, test `src/pages/schedulers/__tests__/SchedulerRunDetailsPage.integration.test.tsx:159-168`

Test-first: yes — add one case next to the pending test: a run with non-null `cost` (e.g. 0.25) and `moneySpentPending: true` expects the `Cost` row to be `- (awaiting final cost)`; fails today with `$0.2500 (awaiting final cost)`. Reuse that test's existing fixture and `findValueOf` helper; no new suite.

- [ ] Add the case; run the file; confirm it fails.
- [ ] Make `formatRunCost` return `formatMoneySpent(metrics.cost, { pending: metrics.moneySpentPending, unavailable: metrics.moneySpentUnavailable })` with import from `@/utils/currency`; remove the unused `formatMoneySpentSuffix` import, and the `ABSENT_VALUE_MARKER` import if no longer used elsewhere in the file. Update its comment.
- [ ] Update the "only the settled subtotal" comments at `src/store/schedulerRuns.ts:47-48` and `src/types/entity/conversation.ts:272` to say flagged records render the absent marker. Comment-only.
- [ ] Run the file; confirm it passes.

## Self-review

- negative-constraints: (1) flagged amount must NOT show for null, zero or non-zero — honored by `formatMoneySpent` (Tasks 1-3, all three renderers); (2) no large new test suites — one added case (Task 3), others are edits; (3) no literal `-` where practical — `ABSENT_VALUE_MARKER` used everywhere, `ChatHeader` no longer has a literal; (4) avoid router import chain in ChatHeader — marker lives in the leaf `@/constants` barrel, `ChatHeader` never imports `analyticsFormatters`; (5) no git/commit or whole-suite gate tasks — none.
- Unchanged: `formatSpendQualificationSuffix` family, `useWorkflowData.ts` polling, `formatMoneySpentSuffix` signature (now module-private).
- Unflagged zero still renders `$0.0000` (a real zero); unflagged null renders `-`.
