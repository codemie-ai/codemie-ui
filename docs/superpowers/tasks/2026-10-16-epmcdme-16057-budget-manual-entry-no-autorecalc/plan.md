# EPMCDME-16057 Typed Budget Values Without Auto-Recalc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A typed Hard Limit changes only its own category and no Soft Limit. An unbalanced total shows an under/over warning and blocks submit.

**Architecture:** Changes are limited to `UnifiedProjectBudgetModal.tsx`. Remove the peer cascade and upper clamps from `onHardInputChange`, stop the soft-rescale effect reacting to typed edits, and split the `sumPctError` message into below/above variants. The drag bar, store and backend stay unchanged.

**Tech Stack:** React 18, TypeScript, Vitest + RTL + `userEvent` (unit project).

**Spec:** `docs/superpowers/tasks/2026-10-16-epmcdme-16057-budget-manual-entry-no-autorecalc/spec.md`

Commit per task using the repository's existing convention (`EPMCDME-16057: <summary>`).

## Global Constraints

- Source paths are relative to `src/pages/settings/administration/components/`.
- The only automatic correction kept is the 16015 Platform minimum: `PLATFORM_MIN_PCT` = 0.01. Platform 0/empty reverts through `strictPositive`. Legacy Platform-0 groups are preserved.
- Do not touch `populateFromGroup`, `handleDefaultDistribution`, Total Budget rescaling, `UnifiedBudgetDragBar.tsx` or the store.
- The out-of-balance condition stays `|Σ round2(pct) − 100| > 0.5`. Styling stays `text-xs text-failed-secondary`.

## Review Focus

- Committing the same value again must not rescale softs. Pinned by the AC5 test in Task 1, which re-types the current CLI value.
- Typing above the old `100 − peer` cap is kept, not clamped. Pinned in Task 1: Premium 2000 stays 2000.
- A drag from an over-100% state rebalances. Pinned in Task 2.
- A sub-$1 difference is formatted like the inputs (`toFixed(2)`). This only occurs at tiny totals. It follows from the formatter rule in Task 2, so no separate test.
- Platform sub-minimum while unbalanced. Covered by the rewritten 16015 cases in Task 1.

---

### Task 1: Typed Hard Limit changes only its own category

**Files:**
- Modify: `UnifiedProjectBudgetModal.tsx:347-372` (`onHardInputChange`) and `:675-677` (`clamp`: delete it if no longer referenced)
- Modify: `__tests__/UnifiedProjectBudgetModal.platformMin.test.tsx:193-262`
- Create: `__tests__/UnifiedProjectBudgetModal.typedEdits.test.tsx`

**Interfaces:**
- Produces: the test harness in `typedEdits.test.tsx`. Copy the mocks and the `Wrapper`, `renderPopulated`, `dragHandle`, `enter` and `save` helpers from `platformMin.test.tsx:1-149`, with two differences:
  - The `Popup` mock forwards `submitDisabled` as `disabled` on the submit button.
  - The default plan has total 1000, hards 300/600/100 and softs **200/400/50**.

  Task 2 reuses this file.

**Test-first:** yes. After typing CLI 0, Premium still shows 100 (today it becomes 700). After re-typing a Hard, the Soft Limits are unchanged.

- [ ] **Step 1: Write failing tests in `typedEdits.test.tsx`**
  - AC1 (`it.each`): Platform 500 leaves CLI 600 and Premium 100. CLI 200 leaves Platform 300 and Premium 100. Premium 400 leaves Platform 300 and CLI 600. Assert with `toHaveValue`.
  - AC2: CLI `0` leaves Platform 300 and Premium 100. Premium `0` leaves Platform 300 and CLI 600.
  - No cap: Premium `2000` shows 2000. CLI stays 600 and Platform stays 300.
  - AC5:
    - Premium `200` keeps Premium soft at 50 (today it is rescaled to 100). The other softs stay 200 and 400.
    - CLI `300` keeps CLI soft at 400, and `Exceeds hard limit` is visible.
    - Re-entering CLI `600` keeps all softs unchanged.
- [ ] **Step 2: Run** `npx vitest run --project unit src/pages/settings/administration/components/__tests__/UnifiedProjectBudgetModal.typedEdits.test.tsx`. Expected: AC1, AC2, no-cap and AC5 FAIL.
- [ ] **Step 3: Rewrite `onHardInputChange`**
  - Compute `nextPct` from the typed value:
    - Platform: `round2(Math.max(requestedPct, PLATFORM_MIN_PCT))`
    - CLI and Premium: `round2(Math.max(0, requestedPct))`
  - Before `setPcts`, set `prevHardsRef.current = { ...prevHardsRef.current, [cat]: totalBudget * nextPct / 100 }`. The `[totalBudget, pcts]` effect's no-op guard (`:320`) then skips every category, so a typed edit rescales no soft. The drag, Total and Reset paths are untouched.
  - Then call `setPcts(prev => ({ ...prev, [cat]: nextPct }))`.
  - Replace the cascade comment at `:351-355` with one line stating that typed edits change only their own category and no soft.
- [ ] **Step 4: Rewrite the four cascade-dependent `platformMin` cases** so each one balances the total before `save()`:
  - sub-minimum Platform `0.04`: also type CLI `900`
  - `$1` Platform: also type CLI `899`
  - CLI `0`: also type Premium `700`
  - Premium empty: also type CLI `700`

  Keep the existing assertions.
- [ ] **Step 5: Run** both test files. Expected: all PASS.

### Task 2: Under/over distribution warning and drag rebalance

**Files:**
- Modify: `UnifiedProjectBudgetModal.tsx:206-207` (sum), `:638-643` (message)
- Test: `__tests__/UnifiedProjectBudgetModal.typedEdits.test.tsx`

**Interfaces:**
- Consumes: the Task 1 harness.

**Test-first:** yes. CLI `0` shows the "$600 below … (40%)" text and the Update Budget button is disabled. Today the text is "Distribution must sum to 100%".

- [ ] **Step 1: Write failing tests**
  - AC4 under: CLI `0` shows the exact text `Category limits are $600 below the Total Budget (40%). Adjust the values to total 100%.`, and `Update Budget` is disabled.
  - AC4 over: CLI `700` shows the exact text `Category limits are $100 above the Total Budget (110%). Adjust the values to total 100%.`, and `Update Budget` is disabled.
  - AC3:
    - Type Premium `300` (120%, the "above" text shows).
    - Call `dragHandle(301, 401)`.
    - Assert `queryByText(/Category limits are/)` is null.
    - Call `save()`. Assert the payload pcts sum to 100 within 0.5.
- [ ] **Step 2: Run** the file. Expected: AC4 FAIL on text. AC3 may already pass, because the drag maths are unchanged.
- [ ] **Step 3: Implement the two message variants**
  - Extract `const pctSum = round2(p) + round2(c) + round2(pm)` and derive `sumPctError` from it.
  - Compute `diffAmount = Math.abs(pctSum - 100) / 100 * totalBudget`. Format it like the Hard inputs: `Math.round`, or `toFixed(2)` when below 1.
  - Render `below` when `pctSum < 100` and `above` otherwise, using the spec's copy verbatim. `<sum>` is `Math.round(pctSum)`.
  - Leave the submit gating at `:386` and `:483` as is.
- [ ] **Step 4: Run** the file and `platformMin.test.tsx`. Expected: all PASS.
