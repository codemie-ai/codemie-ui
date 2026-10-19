# EPMCDME-16069 Bulk Override Limit Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Focusing a Hard/Soft limit input in the bulk override modal no longer clears the value, marks the field edited or shows non-negative errors. Mixed fields clear for typing as a display-only state.

**Architecture:** All production changes are in `BulkBudgetOverrideModal.tsx`. Non-mixed fields lose their focus handler. Mixed fields get a display-only "cleared for typing" state, which is set on focus and removed by a bubbling `onBlur` on the modal's content wrapper, matched by input id. An emptied Mixed field goes back to unedited.

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library, `@testing-library/user-event`.

**Spec:** `docs/superpowers/tasks/2026-10-19-epmcdme-16069-bulk-override-limit-inputs/spec.md`

Commit per task using the repository's existing convention (`EPMCDME-16069: <summary>`).

Paths below are relative to `src/pages/settings/administration/`.

## Global Constraints

- Production edits only in `components/projectsManagement/BulkBudgetOverrideModal.tsx`.
- Do not change `BudgetOverrideCategoryCard` props, `MemberAllocationOverrideModal`, `budgetNumber.ts`, `normalizeBudgetInput` or the `keyfilter /[^0-9.,]/g`.
- No change to the capacity or soft-over-hard rules or their messages. No store, API or type changes. No Save-gating redesign.
- The cleared-for-typing state must never feed `categoryDirty`, `validationByCategory`, `isDirty` or the `handleSubmit` payload.
- Error copy is verbatim: `Hard limit must be a non-negative number` and `Soft limit must be a non-negative number`.

## Review Focus

1. A user tabs from a cleared Mixed Hard field straight to a Mixed Soft field. Hard shows `Mixed` again and Soft clears (Task 2).
2. The user clicks Revert on an edited Mixed field. It shows `Mixed`, not an empty box (Task 2).
3. The user closes and reopens the modal after focusing a Mixed field. It opens showing `Mixed` (Task 2).
4. The user retypes the original value into a non-mixed field. There is no error, no Revert icon and Save stays disabled (Task 1).
5. The user clears a non-mixed field and then retypes a valid value. The error goes away and Save is enabled (Task 1).

---

### Task 1: Focus no longer edits non-mixed fields

**Files:**
- Modify: `components/projectsManagement/BulkBudgetOverrideModal.tsx:432-437`
- Create: `components/projectsManagement/__tests__/BulkBudgetOverrideModal.test.tsx`

**Interfaces:**
- Produces: the test file, plus a `renderModal({ maxValues, softValues })` helper. It renders a `platform` budget whose `member_allocations` carries one entry per user, built from the given arrays. Use `budgetAllocationLookup: null`, two users as `{ id, name } as UserListItem`, and a `ProjectBudget` fixture shaped like the one in `projectsManagement/components/__tests__/MemberAllocationOverrideModal.test.tsx` with enough capacity. Query inputs by label `Hard Limit ($)` / `Soft Limit ($)`, the button by name `Save Override`, and Revert by label `Revert`. Drive focus with `userEvent` (`click`, `tab`, `clear`, `type`), not `fireEvent.focus`.

Test-first: yes — clicking into an untouched non-mixed Hard limit input (value `10`) keeps `10`, shows no non-negative error and no Revert button, and leaves Save disabled. It fails today because focus clears the value.

- [ ] **Step 1: Write the failing tests** in `describe('BulkBudgetOverrideModal — non-mixed fields')`:
  - AC1 / AC2: focusing Hard (`[10,10]`) and then Soft (`[5,5]`) keeps `10` and `5`. Neither error appears, `Revert` is absent and Save stays disabled.
  - AC3: `clear` + `type('20')` in Hard shows no Hard error and enables Save. The same holds for Soft with `3`.
  - AC4: for each of `''`, `.` and `1.2.3` in Hard, the `Hard limit must be a non-negative number` error shows and Save is disabled. Repeat for Soft.
  - Review Focus 4: retyping `10` gives no error, no Revert and Save disabled.
  - Review Focus 5: `clear` shows the error. Then typing `15` clears the error and enables Save.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/settings/administration/components/projectsManagement/__tests__/BulkBudgetOverrideModal.test.tsx`. Expected: the AC1/AC2 tests FAIL because the value becomes `''`.
- [ ] **Step 3:** In the modal, make `onMaxFocus` / `onSoftFocus` act only when `maxMixed` / `softMixed` is true. Keep today's mixed behaviour unchanged for now, because Task 2 replaces it.
- [ ] **Step 4:** Re-run the command. Expected: all PASS.

### Task 2: Mixed fields clear for typing without being edited

**Files:**
- Modify: `components/projectsManagement/BulkBudgetOverrideModal.tsx` (state near :151, the reset effect :270-277, the content wrapper :380, the card props :404-439)
- Test: `components/projectsManagement/__tests__/BulkBudgetOverrideModal.test.tsx`

**Interfaces:**
- Consumes: `renderModal` from Task 1.
- Produces: modal-local state `clearedMixed: Partial<Record<\`${BudgetCategory}-${'max' | 'soft'}\`, true>>`. The name is internal and no other task uses it.

Test-first: yes — clicking into a Mixed Hard field (`[10,20]`) shows `''`, with no error, no Revert and Save disabled. Tabbing away shows `Mixed` again. It fails today because focus sets `maxDirty` and raises the non-negative error.

- [ ] **Step 1: Write the failing tests** in `describe('BulkBudgetOverrideModal — mixed fields')`:
  - AC5: focus clears the display to `''` with no error, no Revert and Save unchanged (disabled). `tab` away shows `Mixed`.
  - Typing `7` makes the field edited: Revert appears, Save is enabled and there is no error.
  - AC6: type `7` and then `clear`. There is no error, no Revert and Save is disabled. After `tab` away it shows `Mixed`. Then edit Soft to a valid value and click Save. `onSubmit` is called with payloads whose `allocated_max_budget` equals each user's own current value (`10` and `20`).
  - Review Focus 1: focus Mixed Hard, then `tab` to Mixed Soft. Hard shows `Mixed` and Soft shows `''`.
  - Review Focus 2: type `7`, then click `Revert`. The field shows `Mixed`.
  - Review Focus 3: focus a Mixed field, `rerender` with `visible={false}` and then `visible={true}`. It shows `Mixed`.
- [ ] **Step 2:** Run the Task 1 command. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** in the modal:
  - Add the `clearedMixed` state and reset it to `{}` in the `visible` effect.
  - `getFieldDisplayValue` returns `''` when the field is not dirty but is mixed and cleared.
  - Mixed focus sets the cleared key and does not call `updateCategory`.
  - In `onMaxChange` / `onSoftChange`, a mixed field receiving `''` calls `revertField(field)` instead of `updateCategory`. The cleared key stays, so the box stays empty while focused.
  - Add `onBlur` to the `<div className="space-y-4">` wrapper. It matches `event.target.id` against `/^bulk-(platform|cli|premium_models)-(max|soft)$/` and deletes that key.
- [ ] **Step 4:** Re-run. Expected: all PASS, including the Task 1 tests.

### Task 3: Unit tests for `getNonNegativeLimitErrors`

**Files:**
- Modify: `projectsManagement/components/__tests__/budgetNumber.test.ts` (import from `../../../components/projectsManagement/budgetNumber`, the same as the existing import)

Test-first: no — this pins an existing, unchanged helper (`(0,0)` → `{}`, `(5,3)` → `{}`, `(-1,2)` → max message only, `(2,-0.5)` → soft message only, `(null,null)` → both messages verbatim). The tests pass on the first run.

- [ ] **Step 1:** Add the `describe('getNonNegativeLimitErrors')` cases above and run `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/budgetNumber.test.ts`. Expected: PASS.
