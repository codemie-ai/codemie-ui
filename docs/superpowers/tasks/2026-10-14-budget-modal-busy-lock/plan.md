# Budget Modal Busy Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While a budget save is in flight, the Update/Create Budget dialog cannot be dismissed, shows progress, locks every control, and shows a reassurance hint after 5 s.

**Architecture:** Add `busy`/`busyHint` to the shared `Popup` (one `handleHide` guard over Cancel, X, Escape and backdrop). Add a `disabled` prop to `UnifiedBudgetDragBar`. `UnifiedProjectBudgetModal` passes `busy={submitting}`, switches the label, wraps fields in `<fieldset disabled>` and passes `disabled` explicitly to the non-native controls.

**Tech Stack:** React 18, TypeScript, PrimeReact 10.9.5, Tailwind, Vitest + RTL (`unit` project).

**Requirements source:** `docs/superpowers/plans/2026-10-14-budget-modal-busy-lock.md` (the "source plan"). Its test and code blocks are referenced below by line range and are authoritative unless this plan overrides them. Corrections come from `technical-analysis.md` § 6.

**Revised 2026-10-19 — accessible reassurance (RUN-2):** Apply `aria-busy` to Popup's content container; was: the dialog root. Keep the default footer's persistent status output inside the dialog but outside the busy content. A busy ancestor permits screen readers to defer announcements until saving finishes. The live region exists empty before the delay; only its text appears after five seconds. Dismissal locking, loading state and the timer are unchanged. This revision overrides the corresponding root-busy and conditional-region instructions in the original source plan.

## Acceptance criteria

- [ ] `Popup` has `busy?: boolean` (default `false`) and `busyHint?: ReactNode`. `Popup.tsx` exports `BUSY_HINT_DELAY_MS = 5000`.
- [ ] While `busy`:
  - Cancel, X, Escape (with and without `hideClose`) and backdrop never call `onHide`.
  - Cancel is disabled, X is `aria-disabled`, submit is `isLoading`, and the content container is `aria-busy="true"`. The dialog root is not marked busy.
  - Focus moves into the dialog content.
  - When `busyHint` is supplied, an empty status live region stays mounted in the default footer, inside the dialog but outside any busy ancestor. Its text appears only after 5000 ms and clears when busy ends.
- [ ] Every existing `Popup` caller behaves as today.
- [ ] While saving, the budget modal shows `Updating…` (edit) or `Creating…` (create) and the hint `Large projects can take a little longer to save.`
- [ ] Every modal control is disabled while saving. Native fields are disabled by `<fieldset disabled>`. The Reset Period `Select`, both `Checkbox`es and `UnifiedBudgetDragBar` get explicit `disabled` props.
- [ ] A failed save unlocks the dialog with values kept, and a second submit fires the save again.
- [ ] A double submit sends one request.
- [ ] No new dependencies.

## Global Constraints

- The branch `EPMCDME-14996_lock-budget-dialog` already exists; do not create one. Commit per task using the repository's existing convention, `EPMCDME-14996: Capital sentence`.
- Run `npm ci` before trusting any test or type-check result. Run commands individually, never chained with `&&`.
- Formatting is automatic (PostToolUse hook).
- Every new `.ts`/`.tsx` file starts with the EPAM Apache-2.0 licence header.
- `UnifiedBudgetDragBar.disabled` defaults to `false`, so its other usages are unchanged.

## Review Focus

- **Ref reset after a chargeback failure:** if `submittingRef` is not reset in the chargeback `catch`, a retry silently does nothing. Covered by Task 3, "retries after a failed chargeback save".
- **Double submit vs RHF async validation:** wait with `findByRole`. Covered by Task 3.
- **Default footer wrapper:** the class changes to `flex w-full items-center justify-end gap-4` for **every** Popup caller. It must stay visually equivalent, and the existing Popup tests must pass unchanged (Task 1).
- **Checkbox styling:** inside a disabled fieldset a checkbox loses input but keeps its enabled styling unless it gets `disabled`. Covered by Task 3's styling assertion.

---

### Task 1: `busy` lock in the shared `Popup`

**Files:** Modify `src/components/Popup/Popup.tsx`. Test `src/components/Popup/__tests__/Popup.test.tsx`.

**Produces:** `PopupProps.busy?: boolean`, `PopupProps.busyHint?: ReactNode`, `export const BUSY_HINT_DELAY_MS = 5000`.

Test-first: yes — the `Popup — busy` block fails because the props don't exist yet. It covers: content-only aria-busy and the loading submit; Cancel, X, Escape, `hideClose` Escape and backdrop ignored while busy; Cancel restored after busy ends; focus moving to the content; the persistent footer status outside busy ancestors and its delayed text, with no flash when busy ends early.

- [ ] **Step 1:** Append the `Popup — busy` block from source plan lines 67–164. Add `act` to the `@testing-library/react` import and `afterEach` to the `vitest` import. Import `BUSY_HINT_DELAY_MS` from `'../Popup'`.
- [ ] **Step 2:** Run `npx vitest run --project unit src/components/Popup/__tests__/Popup.test.tsx`. Expected: the new tests FAIL. "closes on a backdrop click when idle" PASSES; it is the control test for the mask selector.
- [ ] **Step 3:** Implement source plan items 1–9 (lines 175–269):
  - Add `useCallback` and `useState` to the React import.
  - Add the constant and the two props.
  - Add `handleHide` right after `useFocusTrap` (~l.93). Use it in place of `onHide` in the Escape effect (l.99–109), on Cancel, and on `<Dialog onHide>` (l.195).
  - Add the focus effect and the `showBusyHint` timer after `dialogRef` (l.111).
  - Replace the default footer (l.171–184) with: the hint, Cancel `disabled={busy}`, submit `isLoading={busy}`.
  - Add `pt.content['aria-busy']` and a `pt.closeButton` entry. Do not mark the dialog root busy: the footer status must remain outside the busy subtree.
- [ ] **Step 4:** Re-run the Step 2 command. Expected: the whole file PASSES. Then run `npm run typecheck`. Expected: exit 0.

### Task 2: `disabled` prop on `UnifiedBudgetDragBar`

**Files:** Modify `src/pages/settings/administration/components/UnifiedBudgetDragBar.tsx`. Create `src/pages/settings/administration/components/__tests__/UnifiedBudgetDragBar.test.tsx`.

**Produces:** `UnifiedBudgetDragBarProps.disabled?: boolean`, default `false`.

Test-first: yes — on a `disabled` bar, mouse-down on the slider still calls `onDragStart`, and the slider has no `aria-disabled`.

- [ ] **Step 1:** Create the test file.
  - Render `pcts={{ platform: 30, cli: 60, premium_models: 10 }} totalBudget={1000} platformMinPct={0}` with `onChange` and `onDragStart` mocks.
  - Query `getByRole('slider', { name: 'Budget allocation slider' })`. `ResizeObserver` is polyfilled in `src/setupTests.tsx`.
  - Control test: `fireEvent.mouseDown(slider, { clientX: 10 })` calls `onDragStart` once.
  - Disabled test: send `mouseDown`, then `fireEvent.mouseMove(window, { clientX: 50 })`, then `touchStart` with `touches: [{ clientX: 10 }]`. `onDragStart` and `onChange` are never called. The slider has `aria-disabled="true"` and `tabIndex` `-1`.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/settings/administration/components/__tests__/UnifiedBudgetDragBar.test.tsx`. Expected: the disabled test FAILS and the control test PASSES.
- [ ] **Step 3:** Implement:
  - Add the prop (l.24–31) and destructure it as `disabled = false` (l.87–94).
  - `handleBarMouseDown` (l.233–239) and `handleBarTouchStart` (l.241–249) return early when `disabled`. Add `disabled` to their deps.
  - On the slider div (l.335–352), set `aria-disabled={disabled || undefined}` and `tabIndex={disabled ? -1 : 0}`. When disabled, use `cursor-not-allowed opacity-50` in place of `cursor-col-resize`.
- [ ] **Step 4:** Re-run Step 2. Expected: PASS.

### Task 3: Lock the budget modal while saving

**Files:**
- Modify `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx`.
- Create `src/pages/settings/administration/components/__tests__/UnifiedProjectBudgetModal.busy.test.tsx`.
- Modify `src/pages/settings/administration/components/__tests__/UnifiedProjectBudgetModal.chargeback.test.tsx`.

**Consumes:** `PopupProps.busy` and `PopupProps.busyHint` (Task 1), `UnifiedBudgetDragBarProps.disabled` (Task 2).

Test-first: yes — with a deferred budget save pending, the busy tests fail. The content is not `aria-busy`, there is no `Updating…` label, the fields and the Reset Period, checkbox and drag-bar controls stay enabled, and a double submit sends two requests. The chargeback retry test is a regression guard for the ref reset; it passes before and after.

- [ ] **Step 1:** Create the busy test file from source plan lines 306–464, with these overrides:
  - `useBudgetSoftLimitEmailEnabled: () => [true, true]`, so the checkboxes are enabled when idle.
  - The DragBar mock becomes `default: ({ disabled }: any) => <div data-testid="dragbar" data-disabled={String(Boolean(disabled))} />`.
  - "locks the dialog…" also asserts three things:
    - `document.getElementById('budget_duration')` has the class `p-disabled`. PrimeReact puts the `id` and `p-disabled` on the Dropdown root.
    - `getByText('Send email notifications')` has the class `cursor-not-allowed`.
    - `getByTestId('dragbar')` has `data-disabled="true"`.
  - "unlocks with values kept…" asserts the opposite of all three.
  - In the double-submit test, `await screen.findByRole('button', { name: 'Updating…' })` after the first click and before the second.

  In the chargeback test file, add `it('retries after a failed chargeback save')`, modelled on l.254–270:
  - `updateProject.mockRejectedValueOnce(new Error('save failed'))`.
  - Click Update Budget and wait for `/could not save chargeback settings/i`.
  - Click Update Budget again, then `await waitFor(() => expect(updateProject).toHaveBeenCalledTimes(2))`.
- [ ] **Step 2:** Run each file on its own with `npx vitest run --project unit <path>`. Expected: the busy tests FAIL, and the retry test PASSES.
- [ ] **Step 3:** Implement source plan Task 2 Step 3 (lines 478–532):
  - Add the `submittingRef` guard in `onFormSubmit` (~l.383). Reset it next to **both** `setSubmitting(false)` calls: the chargeback `catch` (~l.407) and the `finally` (~l.459).
  - Change the `<Popup>` props (l.475–485): `submitDisabled={dataLoading || hasSoftError || sumPctError}`, `busy={submitting}`, and `busyHint`.
  - Add `idleLabel`, `busyLabel` and `submitLabel` after `isEditMode` (l.467).
  - Wrap the form contents in `<fieldset disabled={submitting} className="m-0 min-w-0 space-y-4 border-0 p-0">`, and remove `space-y-4` from the `<form>`.

  Then disable the non-native controls explicitly:
  - The Reset Period `Select` (l.511–519) gets `disabled={submitting}`.
  - The first Checkbox (l.596) gets `disabled={submitting || !isEmailEnabled}`.
  - The second Checkbox (l.613) gets `disabled={submitting || !isEmailEnabled || !sendEmailEnabled}`.
  - `UnifiedBudgetDragBar` (l.628–635) gets `disabled={submitting}`.
- [ ] **Step 4:** Re-run both files. Expected: all PASS, including every existing chargeback test.
