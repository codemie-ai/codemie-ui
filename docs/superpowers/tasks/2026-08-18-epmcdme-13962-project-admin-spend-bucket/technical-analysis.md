# Technical Research

**Task**: budget project-admin spend-bucket distribution
**Generated**: 2026-08-18T00:00:00.000Z
**Research path**: filesystem

---

## 1. Original Context

Allow project admins to change spend bucket distribution. Project admins should be able to view and modify the spend bucket (budget category) distribution percentages for budget groups in projects they administer. Currently only maintainers (isMaintainer) can manage budgets; project admins (applicationsAdmin / isProjectAdmin) can only view. The fix is primarily in ProjectDetailsPage.tsx where canManageBudgets is gated on isMaintainer only, and in ProjectBudgetsSection.tsx which controls the manage/view mode.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/ProjectDetailsPage.tsx` — **Primary fix site.** Derives all role booleans (`isAdmin`, `isMaintainer`, `isAuditor`, `isProjectAdmin`) at lines 59–62 from `useSnapshot(userStore).user`. Defines `canManageBudgets = isBudgetManagementEnabled && isMaintainer` (line 64) — this is the gating expression that must include `|| isProjectAdmin`. `canViewBudgets` already includes `isProjectAdmin` (lines 65–68). `budgetMode` is derived from `canManageBudgets`.
- `src/pages/settings/administration/projectsManagement/ProjectBudgetsSection.tsx` — Receives `mode: 'manage' | 'view'` prop; renders `DropdownButton` (Edit/Create Budget, Reset, Rebalance, Delete) and `ConfirmationModal`s only when `isManageMode`. No change needed here — the `mode` prop already drives the correct behaviour.
- `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx` — Renders individual budget cards; `mode` prop controls whether management actions appear. No change needed.
- `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx` — Full create/edit modal with drag-bar distribution (`PctMap`), category table, duration selector. Called from `ProjectBudgetsSection` when user opens Edit/Create Budget.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` — Receives `budgets` and `onBudgetsChanged` from parent only when `canManageBudgets`. No change needed.
- `src/store/projectBudgets.ts` — Valtio proxy store; `updateProjectBudgetGroup(groupId, payload)` calls `PUT v1/admin/project-budget-groups/{group_id}` — currently `maintainer_access_only` in the backend. The backend will need a matching change to accept project-admin requests; the frontend fix should be made in anticipation of that.
- `src/types/entity/user.ts` — `User.applicationsAdmin: string[]` — array of project names the current user administers. `isProjectAdmin` is derived via `currentUser?.applicationsAdmin?.includes(project?.name ?? '')`.
- `src/hooks/useFeatureFlags.ts` — `useBudgetManagementEnabled()` — gates all budget UI; must be `true` for any budget management to activate.
- `src/pages/settings/administration/BudgetsManagementPage.tsx` — Separate global budgets page; also gates `canManageBudgets = isMaintainer` (line 110). This ticket is scoped to `ProjectDetailsPage`; `BudgetsManagementPage` is a different surface.

### Architecture and Layers Affected

| Layer | Component |
|---|---|
| Page | `ProjectDetailsPage` — role derivation + flag combination |
| Section | `ProjectBudgetsSection` — mode-gated budget panel (no change) |
| Card | `ProjectBudgetCard` — individual budget card (no change) |
| Modal | `UnifiedProjectBudgetModal` — create/edit dialog (no change) |
| Store | `projectBudgetsStore` — API calls (no change; backend gate is separate) |
| Types | `User.applicationsAdmin` (already present) |

### Integration Points

- `projectBudgetsStore.updateProjectBudgetGroup` → `PUT v1/admin/project-budget-groups/{id}` — currently `maintainer_access_only` in backend; the frontend fix is decoupled from backend gate change.
- `userStore` / `useSnapshot(userStore).user` — source of `applicationsAdmin`; populated from backend `/v1/users/me`.
- `useBudgetManagementEnabled()` — feature flag that gates the entire budget panel; project-admin path must still respect this flag.

### Patterns and Conventions

- Role booleans derived at page-component top from `useSnapshot(userStore).user`.
- `canManage*` flag = `featureFlagEnabled && roleCheck`; passed as `mode: 'manage' | 'view'` to section components.
- `isProjectAdmin` computed via `currentUser?.applicationsAdmin?.includes(project?.name ?? '')` — this exact form is already used at line 62.
- Personal project exclusion: `canManageProject = !isPersonalProject && (isAdmin || isProjectAdmin)` — the same exclusion must apply to `canManageBudgets` for project admins (they should not manage budgets in a personal project they happen to admin).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — Valtio store patterns; `useSnapshot` usage.
- `.ai-run/guides/testing/testing-patterns.md` — AAA unit test pattern, `vi.mock` placement, async `act`, mocking `useFeatureFlags`.
- `AGENTS.md` — task routing: component-patterns + state-management guides are P0 for this task.

### Architectural Decisions

- Auditor role was added view-only in EPMCDME-10930 — the established pattern is to widen `canViewBudgets` first, then separately widen `canManageBudgets` only when the role should have write access.
- `BudgetsManagementPage` uses the same `canManageBudgets = isMaintainer` pattern but is scoped to global (platform-level) budgets. That page is intentionally not widened here — project admins manage project-level budgets only.

### Derived Conventions

- Section components are stateless with respect to permissions; they receive a `mode` prop and react accordingly — the permission decision stays at the page level.
- `isProjectAdmin` is always computed relative to the currently-loaded `project.name`; it must be checked after `project` is loaded (already the case since it's derived inline after `project` is set in state).

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — renders, save/edit flows, display_name forwarding. Does NOT test budget mode or project-admin budget access.
- `src/pages/settings/administration/__tests__/BudgetsManagementPage.auditor.test.tsx` — auditor role on a different page.
- `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectBudgetCard.test.tsx` — premium_models link only.
- `src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx` — `canManageBudgets` with feature flag + maintainer, no project-admin scenario.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library; two projects: `unit` (`*.test.tsx`) and `integration` (`*.integration.test.tsx`).
- `vi.mock()` at module level; `vi.hoisted()` for store mocks.
- `beforeEach` resets via `vi.clearAllMocks()` / store reset.
- `useSnapshot` mocked to return the store directly in unit tests.
- `useFeatureFlags` mocked via `vi.mock('@/hooks/useFeatureFlags', ...)`.
- Global fetch mock in `setupTests.tsx`.

### Coverage Gaps

- No test for `canManageBudgets` being `true` when user is project-admin on `ProjectDetailsPage`.
- No test for `budgetMode === 'manage'` flowing to `ProjectBudgetsSection` for project-admin.
- No test for `onBudgetsChanged` / `budgets` props flowing to `ProjectMembersManager` for project-admin.
- No test for personal-project exclusion of budget manage mode for project-admin.
- No test for the negative case: project-admin of a *different* project cannot manage this project's budgets.
- `ProjectBudgetsSection` has no test file at all.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_*` build-time vars baked into bundle; `window._env_` runtime config — neither directly governs budget-management feature flag.

### Configuration Files

- `src/constants/featureFlags.ts` — defines `FEATURE_FLAGS.BUDGET_MANAGEMENT` key.
- `src/hooks/useFeatureFlags.ts` — `useBudgetManagementEnabled()` reads flag from backend-served `appInfoStore` configs.

### Feature Flags and Deployment Concerns

- `features:budgetManagement` — gates all budget UI including the project-admin path. Must remain respected.
- `features:costCenters` — unrelated; shown in the project info grid.
- No deployment concern beyond the backend `maintainer_access_only` gate on `PUT v1/admin/project-budget-groups/{id}` — the frontend change is safe to ship before the backend widens access; the button will appear but the API call will return 403 until the backend is updated.

---

## 6. Risk Indicators

- **Backend gate mismatch**: `PUT v1/admin/project-budget-groups/{id}` is `maintainer_access_only`; project admins will receive a 403 until the backend is updated. The frontend change is forward-compatible but end-to-end functionality requires a coordinated backend change.
- **Personal-project guard**: `isProjectAdmin` is computed from `applicationsAdmin` which could theoretically include a personal project name. The fix must apply the same `!isPersonalProject` guard already used for `canManageProject`.
- **`project` nullability**: `isProjectAdmin` must be computed after `project` is loaded; it already uses optional chaining (`project?.name ?? ''`) but null-safety must be preserved in the updated expression.
- **No existing tests** for project-admin budget access path — new tests are required to prevent regression.
- **`ProjectBudgetsSection` has zero test coverage** — the `mode` prop behaviour is untested; any future change to that component could silently break the project-admin path.
- **Requirements clarity**: Ticket does not specify whether project admins should also be able to Reset, Rebalance, or Delete budget groups (currently all exposed in manage mode). These actions are gated by the same `mode` prop — widening to 'manage' exposes all of them.

---

## 7. Summary for Complexity Assessment

The change surface is small and well-defined: the primary fix is a single boolean expression change in `ProjectDetailsPage.tsx` (line 64), widening `canManageBudgets` from `isMaintainer`-only to `isMaintainer || (isProjectAdmin && !isPersonalProject)`. The `!isPersonalProject` guard is required for consistency with `canManageProject`. No changes are needed in `ProjectBudgetsSection`, `UnifiedProjectBudgetModal`, `ProjectBudgetCard`, or the store — the existing `mode` prop mechanism already handles the downstream presentation correctly.

The technical novelty is low; the pattern (role boolean → canManage* flag → mode prop) is established and used throughout the page. The main implementation risk is the backend `maintainer_access_only` gate on the group update endpoint, which will return 403 for project admins until a backend change ships. The frontend change is safe to deploy ahead of the backend; the UI will appear but save operations will fail with an error toast. Coordination between frontend and backend tickets is the primary delivery risk.

Test coverage is the main quality gap. No existing test covers the project-admin budget access path; new unit tests for `ProjectDetailsPage` are required covering: project-admin can manage (non-personal project, flag on), personal-project exclusion, negative case (different-project admin cannot manage), and auditor/regular-user cannot manage. The integration tests for `UsersManagementSpending` and the auditor role serve as templates.
