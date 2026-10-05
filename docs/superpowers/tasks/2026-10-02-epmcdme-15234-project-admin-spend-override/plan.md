# EPMCDME-15234 Project Admin Spend Override Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Commit per task using the repository's existing convention.

**Goal:** Project Admins of a project get the per-member "Budget Allocations" column and its override modal on that project's details page, the same as maintainers.

**Architecture:** This is a page-layer change only. `ProjectDetailsPage` already passes `budgets` / `onBudgetsChanged` to its children only for maintainers. Widen that gate to `isMaintainer || isProjectAdmin`, which is the same predicate as backend `_can_manage_project_budget_members`. Children, store and modal already have no role logic.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL (`unit` project).

**Requirements:** inline (ticket EPMCDME-15234). Research: `technical-analysis.md` in this directory.

## Acceptance criteria

- [ ] On a shared project's details page, a Project Admin of that project sees the per-member budget allocation column and can open, save and clear an override (backend PATCH/DELETE).
- [ ] The override is shown as a normal action: same column and modal as maintainers, with no error-path UI.
- [ ] Maintainers keep the column and override exactly as before.
- [ ] Users who are not maintainers and not Project Admin of this project (regular members, Project Admins of another project, super admins who are not maintainers) do not get the column or override.
- [ ] The UI gate equals the backend check `is_maintainer or is_application_admin(project)`.
- [ ] Access works after a refresh or re-login, including when the current user resolves after the project has loaded.
- [ ] Budget-section visibility and `access` levels (`resolveBudgetsAccess`) are unchanged for every role.

## Global Constraints

- Change only `src/pages/settings/administration/ProjectDetailsPage.tsx` and its test file.
- Do not change `resolveBudgetsAccess` or the `budgetsAccess` / `access` prop.
- Decided assumptions:
  - (a) A super admin who is not a maintainer is NOT added to the gate, because the backend would return 403. Maintainers are always `is_admin`, so they cover "Admin" in the ticket.
  - (b) A Project Admin may override their own allocation. No restriction is added.
  - (c) The pre-existing `store/projectBudgets.ts` issues are out of scope: DELETE options are passed as the body, and the `overrideMemberAllocation` return type is wrong.

## Review Focus

- The current user loads after the project: the gate must recompute and `ProjectBudgetsSection` must re-run `loadBudgets`, which it does when the `onBudgetsChanged` identity changes. This is pinned in Task 1.
- A Project Admin of a different project must not get the props. Pinned in Task 1.
- A non-maintainer super admin must not get the props (assumption a). Pinned in Task 1.
- A personal project: `ProjectMembersManager` is not rendered, so nothing changes.

---

### Task 1: Gate member budgets on maintainer OR project admin

**Files:**
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx:92-102` (role flags), `:298`, `:312-313`
- Test: `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx:360-497` (the EPMCDME-13962 describe block)

**Test-first: yes — a project admin of "Test Project" receives a function `onBudgetsChanged` on `ProjectBudgetsSection` and an array `budgets` plus a function `onBudgetsChanged` on `ProjectMembersManager`. Today both are `undefined`, so the test fails.**

- [ ] **Step 1: Write failing tests.** Add a nested `describe('member budget override props (EPMCDME-15234)')` inside the 13962 block. It reuses that block's `beforeEach`, where the flag is on and `getProject` resolves `mockProject`. Add a helper that reads the last call props: `projectMembersManagerMock.mock.calls.at(-1)[0]` and the same for `projectBudgetsSectionMock`. Cases:
  - Project admin (`applicationsAdmin: ['Test Project']`): members `budgets` is an array, both `onBudgetsChanged` are functions.
  - Maintainer: same as project admin. This is a regression guard.
  - Regular user: members `budgets` and `onBudgetsChanged` are `undefined`.
  - Project admin of `'Other Project'`: members `budgets` and `onBudgetsChanged` are `undefined`.
  - Super admin who is not a maintainer (`isAdmin: true`): members props are `undefined`, and the section's `onBudgetsChanged` is `undefined` while `access` is still `'distribution'`.
  - Late user: start with `mockUserStore.user = null` and `const { rerender } = render(...)`. Wait for `getProject`, then assert the members `onBudgetsChanged` is `undefined`. Set `user` to a project admin, call `rerender(<ProjectDetailsPage />)`, then `waitFor` the last-call props on both mocks to be functions or an array as in the first case.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run --project unit src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`. Expected: the project-admin and late-user cases FAIL; the other cases pass.
- [ ] **Step 3: Implement.** After `isProjectAdmin` (L96), add `const canSeeMemberBudgets = isMaintainer || isProjectAdmin`. Replace `isMaintainer` with `canSeeMemberBudgets` in the three ternaries: `ProjectBudgetsSection` `onBudgetsChanged` (L298), and `ProjectMembersManager` `budgets` and `onBudgetsChanged` (L312-313). Leave everything else as is.
- [ ] **Step 4: Re-run the same command.** Expected: the whole file PASSes, including the existing `access` cases.

---

## Negative-constraint pass

- "Do not change resolveBudgetsAccess / budgetsAccess prop": Task 1 Step 3 touches only the three ternaries. The existing `access` tests are asserted unchanged in Step 4.
- "No other files change except tests": Task 1 modifies one source file and one test file.
- "Users without the required role cannot override": the regular user, other-project admin and non-maintainer super admin cases in Step 1.
- "Super admins are NOT added to the gate": the predicate omits `isAdmin`, and a Step 1 case pins it.
- "Store issues out of scope": no task touches `src/store/projectBudgets.ts`.
- "Not an error workaround": the change reuses the existing column and modal. No error-path UI is added.
- No self-override restriction is added, which matches assumption (b).
