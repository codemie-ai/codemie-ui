# Platform Hard Limit > 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Create/Update Budget popup (`UnifiedProjectBudgetModal`), the Platform Hard Limit can no longer reach $0 via typing, clearing or slider drag. Legacy Platform-0 groups still render untouched.

**Architecture:** `BudgetAmountInput` gets an opt-in strict-positive blur check, which `BudgetCategoryTable` turns on for the Platform hard input only. The modal gets a constant `PLATFORM_MIN_PCT = 0.01`. It feeds the constant to the existing `platformMinPct` slider clamp and uses it as the lower bound of the Platform branch in `onHardInputChange`.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library (`unit` project). Run a single file with `npx vitest run --project unit <path>`.

**Spec:** `docs/superpowers/tasks/2026-10-15-epmcdme-16015-frontend/spec.md` (acceptance criteria 1-8 are referenced as AC1..AC8)

Commit per task using the repository's existing convention (ticket key EPMCDME-16015).

## Global Constraints

- `PLATFORM_MIN_PCT = 0.01` (percent), a constant that does not depend on Total Budget. There is no dollar minimum.
- The native `min` attribute on `BudgetAmountInput` stays `0`.
- Accepted limitation: a tiny positive Platform amount may display as "$0" (`Math.round`). Do not assert against it, and do not "fix" it.
- Do not change `ProjectBudgetModal.tsx`, the store, the payload shape, the types, `populateFromGroup`, or `UnifiedBudgetDragBar.tsx`.
- Add no new validation message, inline error, or submit gating (`softErrors`, `sumPctError` and `submitDisabled` stay as they are).
- CLI Hard, Premium Hard and all Soft inputs keep a 0 floor.

## Review Focus

- A sub-dollar positive entry (`0.04` on a $1,000 total, which is 0.004%) is accepted and raised to `0.01`, not reverted. Pinned in Task 2, case 3.
- `-0` and an empty string are rejected when the flag is on. Pinned in Task 1.
- Clearing the CLI hard input still commits 0, as it does today (flag off). Pinned in Task 1 (flag off) and Task 2, case 7.
- A legacy group with Premium 100% and Platform 0: dragging handle 1 does not throw, and Platform stays 0 (the drag bar's `clamp` returns `hi` when `lo > hi`). Pinned in Task 2, case 6.
- Distribution-only mode shares the submit path and must behave identically. Pinned in Task 2, case 9.

---

### Task 1: Strict-positive flag on `BudgetAmountInput`

**Files:**
- Modify: `src/pages/settings/administration/components/BudgetAmountInput.tsx:18-30,75`
- Test: `src/pages/settings/administration/components/__tests__/BudgetAmountInput.test.tsx`

**Interfaces:**
- Produces: `BudgetAmountInputProps.strictPositive?: boolean` (default `false`)

Test-first: yes — with `strictPositive` set, typing `0`, `-5` or `-0`, or clearing the field, then blurring, does not call `onCommit`, and the field shows the previous `value` again. Typing `0.4` calls `onCommit(0.4)`. Without the flag, typing `0` or clearing calls `onCommit(0)`.

- [ ] Write the tests (`userEvent.clear`/`type`, then `tab` to blur), run them, and confirm the strict cases fail.
- [ ] Add `strictPositive = false` to the props. In the blur check at L75, commit when `Number.isFinite(n) && (strictPositive ? n > 0 : n >= 0)`. Leave the native `min={0}` at L57 alone.
- [ ] Run the tests and confirm they pass.

### Task 2: Platform minimum in the popup (slider, typed value, table flag)

**Files:**
- Modify: `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx:56-57` (constant), `:345-370` (`onHardInputChange`), `:631` (drag bar prop)
- Modify: `src/pages/settings/administration/components/BudgetCategoryTable.tsx:64-67`
- Test: `src/pages/settings/administration/components/__tests__/UnifiedProjectBudgetModal.platformMin.test.tsx`

**Interfaces:**
- Consumes: `BudgetAmountInputProps.strictPositive` (Task 1)
- Produces: the module-level `const PLATFORM_MIN_PCT = 0.01` in the modal (not exported)

Test-first: yes — with the real drag bar and category table, dragging handle 1 to the far left of a $1,000 group and saving sends `categories.platform.pct === 0.01`. Today `platformMinPct={0}`, so it sends `0`.

- [ ] Create the test file. Copy the mocks, `activePlan`, `makeProject`, `Wrapper` and `renderPopulated` from `UnifiedProjectBudgetModal.chargeback.test.tsx:27-127`, but **do not** mock `../UnifiedBudgetDragBar` or `../BudgetCategoryTable` (drop L65-66).
  - Unless a case says otherwise, set every `soft_budget` in the fixture to `0`, so the existing soft-exceeds-hard gate cannot block a save.
  - Drag helper: `vi.spyOn(slider, 'getBoundingClientRect')` returns `{ left: 0, width: 1002, top: 0, height: 48 }`. Then `fireEvent.mouseDown(slider, { clientX: startX })` (default `301`, which is near handle 1 at 30%), `fireEvent.mouseMove(window, { clientX: -500 })`, `fireEvent.mouseUp(window)`.
  - The payload is `updateProjectBudgetGroup.mock.calls[0][1]`.

  Cases:
  1. Drag to the far left, then Update Budget: `platform.pct === 0.01` (AC2, AC7).
  2. Type `0`, then `-5`, then clear "Platform hard limit", blurring after each: the field shows `300` each time, and the saved pct is `30` (AC1).
  3. Type `0.04` into Platform hard and blur: the saved `platform.pct` is `0.01`, raised from 0.004 (AC1, AC7).
  4. Type `1` into Platform hard: the saved `platform.pct` is `0.1`.
  5. Legacy group (`platform.max_budget: 0`, cli 900, premium 100): the popup renders, Platform hard shows `0`, and saving unchanged sends `platform.pct: 0` (AC4, AC5).
  6. Legacy group with premium `max_budget: 1000` (platform 0, cli 0): drag with `startX: 0`, so handle 1 is picked. The drag does not throw, and the saved `platform.pct` is `0`.
  7. Set CLI hard, Premium hard and all three soft inputs to `0`, or clear them: the save still calls `updateProjectBudgetGroup` (AC6).
  8. Reset to Default: the saved `platform.pct` is `30`. Change Total Budget ($) to `10`: the saved pct is still `30` (AC3).
  9. With `distributionOnly`, repeat cases 1, 2 and 3 (AC8).
- [ ] Run the tests and confirm cases 1, 2, 3 and 9 fail.
- [ ] Add `const PLATFORM_MIN_PCT = 0.01` next to `DEFAULT_PCTS` (L56), with a one-line comment: it is the smallest share `round2` keeps above 0.
- [ ] In `onHardInputChange`, change the Platform clamp lower bound at L357 from `0` to `PLATFORM_MIN_PCT`. Leave the CLI and Premium branches unchanged.
- [ ] At L631, pass `platformMinPct={PLATFORM_MIN_PCT}` to `UnifiedBudgetDragBar`.
- [ ] In `BudgetCategoryTable`, pass `strictPositive={cat === 'platform'}` to the hard-limit `BudgetAmountInput` only. Leave the soft inputs alone.
- [ ] Do not touch `handleDefaultDistribution`, `populateFromGroup`, the soft-scaling effect, the submit gating or the payload build.
- [ ] Run the tests, then `UnifiedProjectBudgetModal.chargeback.test.tsx`, and confirm both pass.

---

## Negative-constraint pass

- No new message, inline error or submit gating: neither task adds an error prop. Task 2 leaves `softErrors`, `sumPctError` and `submitDisabled` as they are.
- No minimum on CLI, Premium or Soft: the flag is on only for the Platform hard input (Task 2). Task 1's flag-off test and Task 2 case 7 pin it.
- No migration of legacy groups on load or on Total Budget change: `populateFromGroup` stays untouched and no effect is added. Cases 5 and 8 pin it.
- No re-raising when Total Budget is lowered: the minimum is a constant and nothing reacts to `totalBudget`. Case 8 pins it.
- No client-side gate for legacy saves: case 5 pins that `pct: 0` is still sent.
- No Total-Budget-derived or dollar minimum: `PLATFORM_MIN_PCT` is a constant, and the native `min` stays `0`.
- No changes to `ProjectBudgetModal.tsx`, the store, the payload, the types or the backend: no task touches them.
