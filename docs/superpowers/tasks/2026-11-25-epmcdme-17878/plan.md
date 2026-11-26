# Bulk Override Models — Disable Row Context Menu During Multi-Select — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disable the row-level "⋮" context menu's "Override models" item while more than one user is selected, so it can no longer silently apply a single-user override when the admin meant a bulk one.

**Architecture:** One-file UI fix in `ProjectMembersManager.tsx`: add a `disabled` flag to the existing "Override models" `NavigationMenuItem` based on `selected.length > 1`, and add `selected` to the `useMemo` dependency array that builds it so the item re-evaluates on every selection change. No store, type, or API change; the dropdown bulk path is untouched.

**Tech Stack:** React, TypeScript, Vitest + React Testing Library.

**Spec:** Requirements are inline (ticket EPMCDME-17878); no spec document. Technical analysis: `docs/superpowers/tasks/2026-11-25-epmcdme-17878/technical-analysis.md`.

**Commits:** per task, following the repository's existing commit convention (ticket key in the subject).

## Acceptance criteria

- [ ] AC1: A bulk model override applied via the dropdown to several selected users is saved for every selected user (already working — no change to this path).
- [ ] AC2: While more than one user is selected, the "Override models" row context menu item is disabled.
- [ ] AC3: After a bulk dropdown action, each selected user shows the same model override (already covered by existing tests — no change).
- [ ] AC4: Users who are not selected are not changed by a bulk action (already covered by existing tests — no change).
- [ ] AC5: Single-user model override via the row context menu keeps working when zero or one user is selected.

## Global Constraints

- Do not modify the bulk dropdown path (`ProjectMembersBulkActions.tsx`, `onOverrideModels` → `openModelOverrides(selected)` at `ProjectMembersManager.tsx:1094`, or `persistModelOverrides`/`batchUserModelOverrides`).
- Scope is the "Override models" row item only — do not add selection-awareness to "Override budgets" or "Unassign from Project".
- No store/type/API changes.

## Review Focus

- Disabled item must still be `hidden` when `!isUserModelOverrideEnabled` (don't regress the existing hidden gate while adding disabled).
- The guard must key off `selected.length > 1`, not "any selection" — zero selected and exactly one selected must both leave the item enabled (AC5).
- The `useMemo` dependency array must pick up `selected` or the item will show a stale disabled state after the selection changes without an unrelated prop changing.
- The row's own user must stay clickable via `openModelOverrides([user])` for the single/none-selected case — don't swap it for `selected`.

---

### Task 1: Disable "Override models" row menu item during multi-select

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:984-989` (the "Override models" `NavigationMenuItem`) and `:1011-1031` (its `useMemo` dependency array)
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersModelOverridePersistence.test.tsx`

**Interfaces:**
- Consumes: `NavigationMenuItem.disabled?: boolean` (`src/components/NavigationMore/NavigationMore.tsx:51`, already renders `disabled:opacity-50 disabled:cursor-not-allowed` and blocks `onClick`); `selected: UserListItem[]` (table selection, `ProjectMembersManager.tsx:551`, already in scope in the `actions` closure).
- Produces: nothing new — behavior-only change to an existing menu item.

**Test-first: yes — new test "disables the row context menu's Override models item while multiple users are selected, and keeps it enabled for zero or one" in `ProjectMembersModelOverridePersistence.test.tsx`.**

- [ ] **Step 1: Write the failing tests**

In `ProjectMembersModelOverridePersistence.test.tsx`, add a test using the file's existing `twoUsers()`/`getRowCheckboxes`/`openUserRowMenu` helpers:
  - Render with two users, select both checkboxes, open the row menu for one row, and assert the "Override models" `<button>`/menu item is disabled (e.g. `toHaveAttribute('disabled')` or `toBeDisabled()`) and that clicking it does not open the modal (`screen.queryByTestId('model-override-modal')` stays absent).
  - Reuse `openOverrideModalForRow('Custom User')` unmodified to assert the existing zero/one-selected case still opens the modal (this pins AC5; it should already pass and must keep passing).

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npm test -- ProjectMembersModelOverridePersistence` (or the project's vitest invocation for a single file)
Expected: FAIL — the new multi-select assertion fails because the item is not yet disabled.

- [ ] **Step 3: Implement the guard**

In `ProjectMembersManager.tsx`, add `disabled: selected.length > 1` to the "Override models" item object (alongside its existing `hidden: !isUserModelOverrideEnabled`, `:984-989`), and add `selected` to the enclosing `useMemo`'s dependency array (`:1011-1031`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- ProjectMembersModelOverridePersistence`
Expected: PASS, including every pre-existing test in the file (single-user row-menu override, bulk dropdown override, reset-to-project-settings cases).

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersModelOverridePersistence.test.tsx
git commit -m "EPMCDME-17878: disable row context menu's Override models during multi-select"
```

---

## Self-Review

1. **Spec coverage:** AC1/AC3/AC4 are already satisfied by the existing dropdown path and existing tests — no task touches them, as required. AC2 and AC5 are both covered by Task 1's single test (one asserts disabled-during-multi-select, the other pins the untouched single/zero-selected behavior).
2. **Step scan:** Each step is one unambiguous action; Step 3 names the exact object literal addition and dependency-array addition, no code block needed since it's a one-line change to an existing object literal.
3. **Type consistency:** `disabled` is the existing `NavigationItem.disabled?: boolean` field; no new types introduced.
4. **Review Focus:** all four items map to assertions inside Task 1's test (hidden-vs-disabled independence, boundary at >1 vs ≤1, memo staleness via the dependency-array change, and the untouched `openModelOverrides([user])` call for the row's own user).
5. **Proportion:** single task, no code blocks beyond prose description of a one-line change; plan is well under the 8 KB ceiling.

negative-constraints:
- "must not be changed" (bulk dropdown path) → honored: Task 1 touches only the row-menu item object and its memo deps; no edit to `ProjectMembersBulkActions.tsx` or `openModelOverrides`/`persistModelOverrides`.
- "disabled (not removed)" → honored: uses `disabled`, not `hidden`, for the multi-select case.
- "do not regress... for that case" (AC5, zero/one selected) → honored: the test re-asserts the existing single-row-menu-open path keeps passing; the guard condition (`> 1`) leaves 0 and 1 unaffected.
- Non-goal "generalizing... to the row menu's other actions" → honored: no task touches "Override budgets" or "Unassign from Project".
