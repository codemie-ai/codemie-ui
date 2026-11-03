# Remove "Reset budget usage" from member override popups Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans, task by task.

**Goal:** Neither the per-member nor the bulk Budget Override popup offers "Reset budget usage".
**Architecture:** Delete the optional `onResetUsage` path: stop passing it from callers, then drop it from the modals. UI layer only.
**Spec:** `docs/superpowers/tasks/2026-10-30-epmcdme-16610/spec.md`
Commit per task using the repository's existing convention.

Base dir: `src/pages/settings/administration/projectsManagement/`

## Task 1: Stop wiring reset from ProjectMembersManager

**Files:**
- Modify: `ProjectMembersManager.tsx` (import line 50; state line 280; `onResetUsage` prop ~1022-1030; `<ResetBudgetPopup>` ~1034-1040)
- Modify: `__tests__/ProjectMembersBudgetPermissions.test.tsx` (~185-202)

Test-first: yes — the maintainer test in "Reset usage in the row Override budgets modal" is changed to assert `queryByRole('button', { name: /Reset budget usage/ })` is absent after `openRowOverrideModal()`; it fails until the prop is no longer passed.

- [ ] Update that test (keep the non-maintainer case; leave the bulk mock "Reset budget usage (bulk)" at ~39-42 and ~259-268 untouched). Run `npx vitest run --project integration` on this file (or `unit` if it lives there); expect FAIL.
- [ ] Remove the `onResetUsage` prop passed to `MemberAllocationOverrideModal`, the `resetBudgetUser` state, the `<ResetBudgetPopup>` render and its now-unused import. Keep `canResetBudgets` (line 317, used by bulk actions at ~905). Rerun the file; expect PASS.

## Task 2: Remove `onResetUsage` from MemberAllocationOverrideModal

**Files:**
- Modify: `components/MemberAllocationOverrideModal.tsx` (prop type line 45, destructure line 75, footer ~287-300)
- Test: `components/__tests__/MemberAllocationOverrideModal.test.tsx`

Test-first: yes — add a test rendering the modal with no props related to reset and asserting no "Reset budget usage" button, while Cancel and Save Override are present (Cancel/Save callbacks still fire).

- [ ] Add the test; it passes trivially without the prop, so confirm instead that TypeScript rejects `onResetUsage` after the change (`npx tsc --noEmit` on the project).
- [ ] Remove the prop, the conditional Reset button and the `<span />` spacer. If the footer wrapper's `justify-between` is left with only the Cancel/Save `div`, change it so Cancel/Save stay right-aligned (e.g. `justify-end`). Do not touch `BulkBudgetOverrideModal`.

## Task 3: Remove `onResetUsage` from BulkBudgetOverrideModal and its bulk-actions wiring

**Files:**
- Modify: `components/projectsManagement/BulkBudgetOverrideModal.tsx` (prop type line 46, destructure ~154, footer button ~370-378 and `<span />` spacer)
- Modify: `components/projectsManagement/ProjectMembersBulkActions.tsx` (stop passing `onResetUsage` ~250-257; remove dead reset wiring: `BulkResetBudgetsPopup` import line 24 and render ~261-269, `resetCategories` state line 76 and its reset in `closePopup` ~125, `'resetBudgets'` in `ActivePopup` line 35 and its clause in `validateBulkAction` ~83, `canResetBudgets` prop at 44/65/83/102/261)
- Modify: `ProjectMembersManager.tsx` (drop `canResetBudgets={canResetBudgets}` at line 903 and the now-unused `const canResetBudgets` at line 315; `canManageBudgets` stays)
- Test: `components/projectsManagement/__tests__/` bulk modal test if present; `__tests__/ProjectMembersBulkActions.test.tsx`; `__tests__/ProjectMembersBudgetPermissions.test.tsx`

Test-first: yes — in `ProjectMembersBulkActions.test.tsx` the `BulkBudgetOverrideModal` mock is changed to assert it receives no `onResetUsage` prop (and exposes no `open-reset`/`save-reset` controls), and `ProjectMembersBudgetPermissions.test.tsx` asserts no "Reset budget usage" button appears in the bulk modal; both fail until the prop is no longer passed.

- [ ] Update tests first: in `ProjectMembersBulkActions.test.tsx` remove the `BulkResetBudgetsPopup` mock with `open-reset`/`save-reset`, the test "refreshes budgets after the bulk reset popup saves", the "reset restriction" describe and `canResetBudgets` from render props; add the no-`onResetUsage` assertion. In `ProjectMembersBudgetPermissions.test.tsx` replace the bulk mock's reset button (~39-42) and its describe (~246-270) with an absence assertion. Run both files; expect FAIL.
- [ ] Remove the prop and footer button from `BulkBudgetOverrideModal` (keep Cancel/Save in the `flex gap-3` group; replace the `justify-between` wrapper with `justify-end`). Delete the dead wiring in `ProjectMembersBulkActions` and `ProjectMembersManager` listed above; keep `finishBudgetAction` (used by the override submit). Rerun both files and `npx tsc --noEmit`; expect PASS with no unused imports, state or props.

## Negative constraints
- `BulkResetBudgetsPopup` and `ResetBudgetPopup` components, `UsersManagementBulkActions` and the Users-page Reset Budgets menu item, stores, API, `canManageBudgets` permission logic, new entry points, copy and layout (beyond footer alignment): untouched. Task 1-2 delete only the single-member path; Task 3 deletes only the bulk-modal path and wiring made dead by it (only the `BulkResetBudgetsPopup` import/render inside `ProjectMembersBulkActions`, not the component).
