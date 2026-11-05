# EPMCDME-16846 Hide spend qualification suffix — Implementation Plan

**Goal:** `formatSpendQualificationSuffix` returns `''` unconditionally. The fix is temporary: add no new tests, only update existing tests that assert the removed wording. All call sites, `formatChartSpendQualificationSuffix`, `combineQualifications`, qualification fields and the leaderboard annotation-key list stay untouched (story D2, Out of Scope).

**Conventions:** Commit per task using the repository's existing convention (ticket key required). Follow `.ai-run/guides/testing/testing-patterns.md`. Run `npm ci` before trusting results; run only the touched test files per task.

**Negative constraints:** call sites not removed; helper, combine logic, fields and annotation keys kept (only the formatter is edited in source); leaderboard key list not edited; unflagged figures unchanged (formatter already returned `''` for them; their assertions are kept); no new tests added. Honored, no task violates any.

---

### Task 1 — Switch off the formatter and update its existing tests

**Files:** `src/utils/analyticsFormatters.ts:116-127`, `src/utils/__tests__/analyticsFormatters.test.ts:136-205`

Test-first: no — temporary fix, only existing tests updated.

- [ ] Replace the body of `formatSpendQualificationSuffix` with `return ''`. Drop the `formatCurrency` import only if lint flags it unused.
- [ ] In the existing `analyticsFormatters.test.ts` cases (suffix, chart variant, `formatQualifiedMetricValue`, `formatMetricQualification`), change expectations from the old wording to `''` / the bare figure. Do not add cases.

### Task 2 — Update existing widget and settings tests that assert the old wording

**Files (existing tests only):**
- `src/pages/analytics/components/widgets/__tests__/`: `TableWidget.spendQualification.test.tsx` (:90,101,111,144), `BarChartWidget.spendQualification.test.tsx` (:130,145), `StackedBarChartWidget.absentSeries.test.tsx` (:181,193), `MetricCard.spendQualification.test.tsx` (:47,53,103)
- `src/pages/settings/**/__tests__/`: `UserProjectSpendingTable.test.tsx:114`, `CostCenterBudgetRollupCard.test.tsx:1096`, `ProjectBudgetsSection.test.tsx:229,249`, `ProjectMembersSpending.test.tsx:170`, `ProjectOverviewSection.test.tsx:146`, `BudgetSpendMetrics.test.tsx:81`, `BudgetSpendCell.test.tsx:59,86,113,118,170`, `SpendingAmount.test.tsx:91,104,136,147`

Test-first: no — temporary fix, only existing tests updated.

- [ ] Change each assertion on "(at least; … unattributed)", "(incomplete data)" or "Bars show spend…" to expect the bare figure with no suffix or note (positive `getByText` becomes `queryByText` null where the text is gone). Keep unflagged-figure and threshold-colour assertions as they are. Add no new tests.
- [ ] Minimally adjust stale comments that quote the removed wording (`MetricCard.tsx:56`, `SpendingAmount.tsx:34`); no logic edits.
- [ ] Finally `grep -rn "at least\|incomplete data\|Bars show spend" src` and update any remaining existing test hit.
