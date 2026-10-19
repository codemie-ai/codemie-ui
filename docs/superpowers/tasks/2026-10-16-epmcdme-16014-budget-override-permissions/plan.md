# EPMCDME-16014 Bulk Budget Override Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let project admins (and maintainers) bulk-override member budgets in Project Details -> Members, under the same single permission check as the per-row "Override budgets" action; keep "Reset budget usage" maintainer-only in both row and bulk flows (backend 403s project admins); cover all of it with tests.

**Architecture:** The bulk feature already exists; the bug is permission wiring. One `canManageBudgets` derived in `ProjectMembersManager` governs override (row item, bulk prop, single-row modal); one stricter `canResetBudgets = canManageBudgets && isMaintainer` governs both reset entry points. `ProjectMembersBulkActions` refreshes the `budgets` prop after bulk override and bulk reset via one shared helper. No backend or store changes.

**Tech Stack:** React 18, TypeScript, Valtio (`projectBudgetsStore`), Vitest + React Testing Library.

**Spec:** none (requirements inline); research in `technical-analysis.md` (same directory).

Commit per task using the repository's existing convention (ticket key EPMCDME-16014, see `.ai-run/guides/standards/git-workflow.md`).

## Acceptance criteria

- A project admin sees the selection column and can select multiple members in the Members tab.
- "Override budgets" appears in Bulk Actions for project admins and maintainers, exactly when the row-level "Override budgets" item is available.
- Submitting the bulk override, or resetting usage from the bulk override modal, applies to every selected member and the Budget Allocations column then shows updated values (budgets refetched).
- Users who are neither project admin, platform admin nor maintainer get no bulk override (and no row override).
- Row and bulk override share one permission flag; no second override-permission expression remains on the page.
- "Reset usage" is offered only to maintainers, in both the single-row modal and the bulk modal; project admins can override but never see Reset (backend returns 403 on `POST /v1/admin/users/{id}/budgets/reset` for them).
- Unit tests cover the role matrix, the reset restriction, the budgets-refresh behaviour and the refreshBudgets wiring.

## Global Constraints

- Do not change backend, `ProjectDetailsPage.tsx`, or `projectBudgetsStore`.
- Selection column and bulk bar stay gated by `canManageProject` (unrelated bulk actions such as unassign are not exposed to anyone new).
- Do not run prettier/eslint manually (PostToolUse hook does it). Tests were requested explicitly by the user for this branch (Tasks 3-4); follow `.ai-run/guides/testing/testing-patterns.md`.

## Review Focus

- Platform admin who administers the project but is not a maintainer: previously had row override, must keep it (hence `canManageProject`, not local `isProjectAdmin`, which excludes admins).
- Platform admin + maintainer: previously had bulk override, must keep it.
- Plain project member / project admin of ANOTHER project / user without `budgets` prop: no row item, no bulk item, bulk bar absent.
- Project admin (non-maintainer) opens the row modal or bulk modal: override works, no "Reset usage" control, no reset popup reachable.
- Bulk override or bulk reset where the budgets refetch fails: popup still closes, selection still cleared, no unhandled rejection.
- Change Role / Unassign flows must NOT trigger a budgets refetch (they keep plain `closePopup(true)`).
- Maintainer who is neither admin nor project admin still gets no bulk bar (selection tied to `canManageProject`); known limitation, unchanged.

---

### Task 1: ProjectMembersBulkActions refreshes budgets after bulk override and bulk reset — DONE (commits 6d13deea1; CR-001 fix a0608a068)

**Files:**
- Modify: `src/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions.tsx`

**Interfaces:**
- Produces: optional prop `onBudgetsChanged?: () => void | Promise<void>`; internal `finishBudgetAction: () => Promise<void>` helper (awaits `onBudgetsChanged` in try/finally, then `closePopup(true)`), used by the bulk override `onSubmit` and `BulkResetBudgetsPopup` `onSave` only.

- [x] **Step 1: Add the prop and one shared helper** as above. Change Role / Unassign keep plain `closePopup(true)`.

Test-first: no — tests only on explicit user request at the time; retrofitted in Task 4 (c).

### Task 2: One `canManageBudgets` in ProjectMembersManager — DONE (commit 4f32588e7)

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx`

**Interfaces:**
- Produces: `const canManageBudgets = showBudgets && (!!currentUser?.isMaintainer || canManageProject)` (L309) used for the row item, bulk prop and single-row modal render; `onBudgetsChanged={refreshBudgets}` passed to `ProjectMembersBulkActions`.

- [x] **Step 1: Flag derived once and used everywhere override permission is needed**; stale backend comment replaced.

Test-first: no — retrofitted in Task 4 (a), (d).

### Task 3: Restrict "Reset budget usage" to maintainers

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:309` (derive), `:996-1020` (single-row modal `onResetUsage` and reset popup render), `:890-905` (bulk props)
- Modify: `src/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions.tsx:37-70` (props), `:74-96` (`validateBulkAction`), `:240` (`onResetUsage`), `:247` (reset popup gate)
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersBudgetPermissions.test.tsx` (new; extended in Task 4)

**Interfaces:**
- Produces: `const canResetBudgets: boolean` in `ProjectMembersManager`; new required prop `canResetBudgets: boolean` on `ProjectMembersBulkActionsProps`.
- Consumes: `canManageBudgets` (Task 2). Both modals already hide the "Reset usage" button when `onResetUsage` is undefined (`MemberAllocationOverrideModal.tsx:287`, `BulkBudgetOverrideModal.tsx:347`), so no modal changes are needed.

- [ ] **Step 1: Write the failing test.** In the new file, render `ProjectMembersManager` (follow `ProjectMembersSpending.test.tsx`: set `userStore.user` directly, mock `userStore.getUsers`/`analyticsStore.fetchProjectMemberSpending`, pass a non-empty `budgets` prop). Test `project admin who is not a maintainer opens the row Override budgets modal and sees no Reset usage button`, and its counterpart `maintainer sees Reset usage in the row modal`. Run `npx vitest run --project unit <that file>`; expected: the project-admin test FAILS (button present).
- [ ] **Step 2: Derive and apply one flag.** In `ProjectMembersManager` add `const canResetBudgets = canManageBudgets && !!currentUser?.isMaintainer` next to `canManageBudgets` (same predicate as `resolveBudgetsAccess` 'full'). Single-row modal: `onResetUsage={canResetBudgets ? <existing handler> : undefined}`; pass `canResetBudgets={canResetBudgets}` to `ProjectMembersBulkActions`. In `ProjectMembersBulkActions`: `validateBulkAction` checks `resetBudgets` against `canResetBudgets` (override stays on `canManageBudgets`); bulk modal `onResetUsage={canResetBudgets ? <existing handler> : undefined}`; gate the `BulkResetBudgetsPopup` render on `canResetBudgets`. There is no bulk menu item for reset (it is reached only from the bulk modal), so nothing to hide in the menu. No new permission expression beyond these two flags.
- [ ] **Step 3: Verify.** Run the same command; expected: PASS. Add the bulk counterpart (`project admin sees no Reset usage in the bulk modal; maintainer does`) in Task 4 (b).

Test-first: yes — `project admin (non-maintainer, budgets loaded) opens the row Override budgets modal and the Reset usage button is absent` fails before the change (button rendered) and passes after.

### Task 4: Test coverage for everything changed on this branch (retrofit)

Retrofit: Tasks 1-2 were implemented without tests; the user has now explicitly asked for tests, which lifts the "tests only on explicit request" rule. For EACH test below, prove it can fail: temporarily revert the relevant source line (e.g. `canManageBudgets` derivation, `finishBudgetAction`'s try/finally, the `onBudgetsChanged={refreshBudgets}` prop, the `canResetBudgets` gates), confirm RED, then restore and confirm GREEN. Load `.ai-run/guides/testing/testing-patterns.md` first and follow neighbouring tests (`ProjectMembersSpending.test.tsx` sets `userStore.user` directly; `ProjectDetailsPage.test.tsx`).

**Files:**
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersBudgetPermissions.test.tsx` (created in Task 3; extend) — (a), (b), (d)
- Test: `src/pages/settings/administration/components/projectsManagement/__tests__/ProjectMembersBulkActions.test.tsx` (new, beside `ChangeOwnershipModal.test.tsx`) — (b bulk), (c)

**Interfaces:**
- Consumes: `canManageBudgets`, `canResetBudgets`, `onBudgetsChanged` / `finishBudgetAction` from Tasks 1-3.

- [ ] **Step 1: (a) Role matrix in `ProjectMembersManager`.** Parameterised over: maintainer; project admin of this project (`applicationsAdmin` includes `project.name`); project admin of another project; regular user; platform admin non-maintainer (with `applicationsAdmin` including this project, mirroring the page passing `budgets`). Per role assert the row "Override budgets" menu item and the bulk "Override budgets" menu item (select a row first) give the SAME visible/hidden result. Add `budgets` empty/undefined (`showBudgets=false`) -> both hidden for every role.
- [ ] **Step 2: (b) Reset restriction.** Row modal and bulk modal: maintainer sees "Reset usage"; project admin does not (row part exists from Task 3; add the bulk part here).
- [ ] **Step 3: (c) `ProjectMembersBulkActions` in isolation** (mock `projectBudgetsStore.overrideMemberAllocation`; mock child modals only if the real ones are too heavy, per testing guide). Assert: `onBudgetsChanged` called once after bulk override submit (including when one `overrideMemberAllocation` rejects); called after `BulkResetBudgetsPopup` `onSave`; when `onBudgetsChanged` rejects, `refresh` and `onClearSelection` are still called and the test finishes with no unhandled rejection; Change Role and Unassign saves call `refresh`/`onClearSelection` but NOT `onBudgetsChanged`.
- [ ] **Step 4: (d) Manager wiring.** In the Manager test, after a bulk override submit assert `projectBudgetsStore.listProjectBudgets` is called with the project name and the `onBudgetsChanged` prop of the manager receives the refetched list (proves `refreshBudgets` is what the bulk bar gets).
- [ ] **Step 5: Run** `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersBudgetPermissions.test.tsx src/pages/settings/administration/components/projectsManagement/__tests__/ProjectMembersBulkActions.test.tsx` (run `npm ci` first per AGENTS.md if the install is stale); quote the `Test Files` line. Then run the neighbouring `ProjectMembersSpending.test.tsx` to confirm no regression.

Test-first: no — retrofit of already-implemented behaviour (Tasks 1-2) plus extension of Task 3's tests; each test's ability to fail is proven by the revert-and-restore step instead of by writing it before the code.

---

## Self-review notes

- negative-constraints: "no duplicated logic" -> Task 2 (single override flag), Task 1 (one shared `finishBudgetAction`), Task 3 (one `canResetBudgets`, derived once, consumed by both modals; no second expression); "do not change backend" -> no task touches it (project-admin reset 403 is the reason for Task 3; override authorization for project admins remains unverified, flag in handoff); "not expose unrelated bulk actions" -> selection/bar gate untouched; "non-project-admins cannot use bulk override" -> flag requires `showBudgets` plus maintainer/`canManageProject`, `validateBulkAction` still rejects otherwise; "project admins must not reset" -> Task 3 hides the control in both modals and gates `validateBulkAction` and the popup render.
- Coverage: AC1 existing `canManageProject` selection; AC2/AC4/AC5 Task 2; AC3 Task 1; AC6 Task 3; AC7 Task 4.
