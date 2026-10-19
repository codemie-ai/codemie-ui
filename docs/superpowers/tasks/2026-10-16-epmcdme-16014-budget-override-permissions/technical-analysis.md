# Technical Research

**Task**: project members budgets override ProjectMembersManager bulk
**Generated**: 2026-10-16
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-16014 (Bug): "Add bulk budget override for project admins in Project Details -> Members tab". Project admins must be able to select multiple members in the Members tab and apply a budget override to all selected in one action; updated allocations displayed; non-project-admins cannot use bulk override.
User requirements: Review the ticket and implement it. Make sure we do not have duplicated logic for budget management on the same page — bulk override and single (per-row) override should fall to the same permission check, and both should support project admin AND maintainer to edit those budgets. Suggested condition from the ticket: align bulk override with the row "Override budgets" action (hidden: !showBudgets) and the same audience as the `budgets` prop: `canManageBudgets={showBudgets && (isMaintainer || isProjectAdmin)}` in ProjectMembersManager. `isProjectAdmin` and `showBudgets` already exist in ProjectMembersManager; optionally use `isUserProjectAdmin(currentUser, project.name)` from src/utils/user.ts for consistency. Idea: maintainer or project admin of this project, and budgets loaded.

---

## 2. Codebase Findings

### Existing Implementations
Bulk override UI already exists; the defect is in the permission wiring, not a missing feature.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` (1036 lines) — Members tab. Owns selection (`useTableSelection`), row actions, single-row `MemberAllocationOverrideModal`, and renders `ProjectMembersBulkActions`.
  - L301-308: `isAdmin = currentUser.isAdmin`; `isProjectAdmin = !isAdmin && applicationsAdmin.includes(project.name)` (note: false for platform admins); `canManageProject = isAdmin || isProjectAdmin`; `showBudgets = !!budgets?.length`. No `isMaintainer` local exists; the code reads `currentUser?.isMaintainer` inline.
  - L784-792: row menu item "Override budgets", `hidden: !showBudgets`. Comment says overrides are "maintainer-only on the backend; the page passes `budgets` only to maintainers".
  - L890-904: bulk bar rendered when `canManageProject`, with `canManageBudgets={canManageProject && !!currentUser?.isMaintainer}`, `budgets={budgets ?? []}`, `budgetAllocationLookup`.
  - L995-1013: single-row `MemberAllocationOverrideModal`, rendered only `showBudgets && budgets`.
  - L657-686 `handleOverrideMember`: sequential `overrideMemberAllocation`/`clearMemberOverride` (silent), toasts, then `refreshBudgets()` which calls `onBudgetsChanged` (L651-655).
- `src/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions.tsx` (249 lines) — bulk menu (Change Role, "Override budgets" if `canManageBudgets`, Override models, Unassign). `validateBulkAction` (L74-95) toasts "You do not have permission" for `overrideBudgets`/`resetBudgets` when `!canManageBudgets`. Renders `BulkBudgetOverrideModal` and `BulkBudgetOverrideModal`-adjacent `BulkResetBudgetsPopup` only when `canManageBudgets`. `onSubmit` (L199-227) loops sequential `projectBudgetsStore.overrideMemberAllocation(..., silent=true)`, aggregates per-user success/failure toasts, then `closePopup(true)` which runs `refresh()` (= `refreshFromFirstPage`: reloads users + `onMembersChanged`), `onClearSelection`, `onSuccess`. It does NOT call `onBudgetsChanged`/`refreshBudgets`, so the `budgets` prop (source of `budgetAllocationLookup` and the Budget Allocations column) is not refetched after a bulk override; only users and the project are reloaded.
- `src/pages/settings/administration/components/projectsManagement/BulkBudgetOverrideModal.tsx` (457 lines) — multi-user override form per category (Mixed values, capacity/soft<=hard validation), uses `BudgetOverrideCategoryCard`, `budgetNumber.ts`.
- `src/pages/settings/administration/projectsManagement/components/MemberAllocationOverrideModal.tsx` — single-row modal (same card components).
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — owner of `budgets` state. L104-112 `isAdmin`, `isMaintainer`, `isProjectAdmin = applicationsAdmin.includes(project.name)` (true for admins that also administer the project); `canViewBudgets`. L154-170 loads budgets for the Members tab when `canViewBudgets`. L287-296 passes `budgets={isMaintainer || isProjectAdmin ? budgets : undefined}` and `onBudgetsChanged={isMaintainer || isProjectAdmin ? setBudgets : undefined}`. L75-87 `resolveBudgetsAccess`: maintainer -> 'full', admin/project admin -> 'distribution', else 'view' (used by Overview and Budgets tab, EPMCDME-13962).
- `src/store/projectBudgets.ts` — `listProjectBudgets`, `overrideMemberAllocation(budgetId, userId, payload, silent?)`, `clearMemberOverride`. Payload `MemberAllocationOverridePayload` in `src/types/entity/projectBudget.ts`.
- `src/utils/user.ts` L19 `isUserProjectAdmin(user, project?, checkAny=false)` — returns true for `user.isAdmin`, else `applicationsAdmin.includes(project)`. Used by `IntegrationSelector` and `src/utils/settings.ts`. Differs from the local `isProjectAdmin` in ProjectMembersManager (which excludes admins).

### Architecture and Layers Affected
Page (`ProjectDetailsPage`) -> feature manager component (`ProjectMembersManager`) -> action bar component (`ProjectMembersBulkActions`) -> modals -> Valtio store (`projectBudgetsStore`) -> `api`. Permission is currently computed in three places: ProjectDetailsPage (what `budgets` is passed), ProjectMembersManager (`showBudgets` for row; `canManageProject && isMaintainer` for bulk), and ProjectMembersBulkActions (`validateBulkAction`, menu item and modal gating, all from the `canManageBudgets` prop).

### Integration Points
- ProjectMembersManager props: `budgets`, `onBudgetsChanged`, `onMembersChanged`, `isModelsConfigEnabled`.
- `userStore.user` fields: `isAdmin`, `isMaintainer`, `applicationsAdmin`.
- Backend PATCH member-allocation endpoint authorization is not visible from this repo; the code comment asserts maintainer-only on the backend (unverified).

### Patterns and Conventions
- Menu items via `NavigationMore` with `hidden` flag; toasts via `@/utils/toaster`.
- Sequential override calls with `silent=true` because the backend rebalances after each request.
- Row and bulk flows each have their own submit handler (`handleOverrideMember` vs inline `onSubmit` in BulkActions) with different post-save refresh behaviour.

---

## 3. Documentation Findings

### Guides and Architecture Docs
Relevant: `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/testing/testing-patterns.md`, `.ai-run/guides/development/code-organization.md`. No guide documents the project-budget permission model.

### Architectural Decisions
Inline comments only: ProjectDetailsPage L113-116 (maintainers full control, admins/project admins "distribution" tier, EPMCDME-13962, `resolveBudgetsAccess` is "the single source" for that tier); ProjectMembersManager L789-790 (maintainer-only backend comment, now contradicted by the `budgets` prop being passed to project admins).

### Derived Conventions
Test-writing only on explicit user request (AGENTS.md). Hook runs prettier/eslint on edit; do not re-run.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx` — renders `ProjectMembersManager` with `userStore.user = { userId: 'admin-1', isAdmin: true }`, mocked `userStore.getUsers`, `analyticsStore.fetchProjectMemberSpending`; Budget Allocations column.
- `.../__tests__/ProjectMembersViewAnalytics.integration.test.tsx` — View analytics link in the same component.
- `.../projectsManagement/components/__tests__/MemberAllocationOverrideModal.test.tsx` — single-row modal.
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`, `.../__tests__/ProjectBudgetsSection.test.tsx`.

### Testing Framework and Patterns
Vitest + React Testing Library; `unit` (`*.test.tsx`, `useSnapshot` and `api` mocked in `setupTests.unit.ts`) and `integration` projects; `SettingsLayout`/`useVueRouter` globally mocked. Tests set `userStore.user` directly.

### Coverage Gaps
No tests for `ProjectMembersBulkActions`, `BulkBudgetOverrideModal`, or permission gating (bulk vs row) in `ProjectMembersManager`; codegraph reports no tests within 3 hops of either bulk component. No test covers a project admin / maintainer role matrix.

---

## 5. Configuration and Environment

### Environment Variables
None specific to this feature.

### Configuration Files
None specific.

### Feature Flags and Deployment Concerns
`useBudgetManagementEnabled` gates `canViewBudgets` in ProjectDetailsPage (budgets are not loaded when off). `FEATURE_FLAGS.PROJECT_MODEL_OVERRIDE` passed as false to the Members tab (models override hidden).

---

## 6. Risk Indicators

- Current mismatch (fact): bulk gate is `canManageProject && isMaintainer`, row gate is `showBudgets` (budgets present only for maintainers or project admins). A project admin who is not a maintainer sees row "Override budgets" but not the bulk one. This is the reported bug.
- Current mismatch (fact): ProjectMembersManager's `isProjectAdmin` excludes platform admins (`!isAdmin &&`), whereas ProjectDetailsPage's and `isUserProjectAdmin` include them. Reusing the wrong one changes who sees the bulk action; admins are inside `canManageProject` but not `isProjectAdmin`.
- Current gap (fact): a maintainer who is neither admin nor project admin has `canManageProject = false`, so the bulk bar and selection column are not rendered even if `canManageBudgets` were true. Whether this case occurs depends on whether maintainers always carry `isAdmin` (CreateUserPopup forces `is_admin` on when maintainer is set, but the user type allows `isMaintainer` without `isAdmin`).
- Current gap (fact): bulk submit does not refresh the `budgets` prop (no `onBudgetsChanged`/`refreshBudgets`), so the Budget Allocations column may show stale allocations after a bulk override, conflicting with "updated allocations displayed". Row flow does refresh.
- Duplicate logic (fact): two submit handlers and permission checks (`validateBulkAction`, menu gating, modal gating) duplicated inside BulkActions on top of the page-level conditions.
- Backend authorization unverified: comment at ProjectMembersManager L789-790 says maintainer-only on the backend; if the endpoint rejects project admins, bulk and row override would both fail for them (the row path already exposes the action to project admins).
- Speculative: a single `canManageBudgets` boolean derived once in ProjectMembersManager and used for the row item, bulk prop and modal render would remove the duplication; the choice of `isUserProjectAdmin` vs local `isProjectAdmin` is a design decision.
- No existing tests on the touched components; regression risk on role matrix is unguarded.

---

## 7. Summary for Complexity Assessment

The change is confined to the Project Details Members tab: `ProjectMembersManager.tsx` (permission derivation at L301-308, row item at L784-792, bulk prop at L896) and `ProjectMembersBulkActions.tsx` (permission validation and modal submit). `ProjectDetailsPage.tsx` is the upstream source of the `budgets` prop and is probably read-only for this task. The bulk override feature (menu item, `BulkBudgetOverrideModal`, sequential store calls) already exists; the observable bug is that it is gated by `isMaintainer` while the row action is gated by `showBudgets`, which is populated for maintainers and project admins. Expect a small file surface (about 2 source files, plus optional tests).

Technical novelty is low: no new store methods, API endpoints, or config. The subtleties are role semantics (`isProjectAdmin` excludes admins locally, includes them in the page and in `isUserProjectAdmin`; maintainers without admin or project-admin flags cannot reach the bulk bar) and post-bulk refresh of the `budgets` prop.

Test posture is weak for this area: neighbouring tests exist for the manager's spending column and the single-row modal, but nothing covers bulk actions, `BulkBudgetOverrideModal`, or permission gating. Key risks are the unverified backend authorization for project admins, the role-definition mismatch, and stale allocations after bulk submit.

---

## 8. External References

None named by the task.
