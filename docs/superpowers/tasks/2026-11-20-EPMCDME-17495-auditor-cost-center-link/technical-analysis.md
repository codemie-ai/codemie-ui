# Technical Research

**Task**: cost-centers auditor permissions projects-management
**Generated**: 2026-11-20
**Research path**: filesystem

---

## 1. Original Context

Ticket: EPMCDME-17495 — project-count redirect on the Cost Centers page should also work for the auditor role, same as for admin/maintainer.

Background (EPMCDME-15632, already merged, MR !2300):
- Cost Centers page (src/pages/settings/administration/CostCentersManagementPage.tsx) renders the Projects count as ResourceCounterBadge. It links to Project Management filtered by cost_center_ids only when the viewer is allowed. Otherwise a plain count (empty link string = no link).
- The gate is currently inline in TWO places:
    1. CostCentersManagementPage.tsx: const canLinkToFilteredProjects = !!(currentUser?.isAdmin || currentUser?.isMaintainer)
    2. projectsManagement/ProjectsManagementFull.tsx: const canFilterByCostCenter = isCostCentersEnabled && !!(currentUser?.isAdmin || currentUser?.isMaintainer)
- Both must allow auditors, or an auditor gets a link to a page where the cost-center filter is hidden. Restoring one shared helper in src/utils/permissions.ts is justified (rule is in two places). Check how isAuditor is exposed on the user store.
- Backend previously returned 403 on GET /v1/admin/cost-centers for auditors; since fixed (auditor can read cost centers; see commit 6f72b878e EPMCDME-17380).

FIRST CHECK (report prominently in the analysis): confirm from the backend source that an auditor can use the cost_center_ids filter on the projects-list endpoint used by Project Management. If the backend rejects it (role guard / 403 / ignores param), say so clearly.

Tests in scope: src/pages/settings/administration/__tests__/CostCentersManagementPage.test.tsx (mocks Table to render customRenderColumns.project_count(item), sets userStore.user in beforeEach; old "plain count for auditor" test must flip to "link for auditor"; add a plain-user case), src/utils/__tests__/permissions.test.ts, and ProjectsManagementFull filter visibility for auditor (find existing tests for it). Keep module-level ProjectCountCell / renderProjectCountColumn shape (Sonar S6478).

NOTE: working tree clean, HEAD == origin/main. Do not touch git state.

---

## FIRST CHECK RESULT: backend ACCEPTS cost_center_ids for auditors

Backend repo `/Users/akobir_bahronov/Development/epam/runway/codemie-dev/codemie`:
- `src/codemie/rest_api/routers/projects/crud.py:~263` — list endpoint declares `cost_center_ids: list[UUID] | None` Query param; only guard is `user: User = Depends(authenticate)` (no role guard / 403). Blank values dropped by `_drop_blank_query_values`.
- Same handler passes `is_admin=user.is_admin or getattr(user, "is_auditor", False)` into `_list_projects_sync` (crud.py:~87-103), so auditors get the admin (all non-deleted projects) view.
- `src/codemie/repository/application_repository.py:148-153,413,432` — `_apply_cost_center_filter` is applied to both count and data statements unconditionally (independent of `is_admin`). Param is honored, not ignored.
- Caveat: commit `6f72b878e` is not resolvable in the backend checkout (unknown revision locally); the cost-centers GET auditor fix was not verified by commit. Not needed for the projects-list check.

---

## 2. Codebase Findings

### Existing Implementations
Purpose: decide who may follow the cost-center -> filtered projects link / see the filter.
- `src/pages/settings/administration/CostCentersManagementPage.tsx:103-104` — `canManageCostCenters = !!(isAdmin || isMaintainer)` (comment: auditors read-only, backend 403s writes); `canLinkToFilteredProjects = canManageCostCenters` (alias). `buildProjectsLink` (~176-186) returns `''` when not allowed, else resolves route `projects-management` with `query.cost_center_ids`. `canManageCostCenters` is also used at ~211, 243, 248, 254 for create/edit/delete actions — must stay admin/maintainer only. Module-level `ProjectCountCell` / `renderProjectCountColumn` (~95-97) take `projectsLink`.
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:242-247` — `canFilterByCostCenter = isCostCentersEnabled (useFeatureFlag(FEATURE_FLAG_COST_CENTERS)) && !!(isAdmin || isMaintainer)`. Drives: `activeCostCenterIds` (empty when not allowed, so URL ids ignored), the effect/refetch ref (~406-432), and rendering of the filter (~750). Note cost-center column visibility uses only the flag (~275).
- `src/utils/permissions.ts` — only exports `canAccessUsersTab(user)` = `isAdmin || isMaintainer || isAuditor`. Natural home for a new shared helper (pattern: `(user: User | null | undefined): boolean`).
- User store: `src/store/user.ts:150,187` maps `is_auditor` -> `isAuditor: apiUser.is_auditor ?? false`; type `src/types/entity/user.ts:31` `isAuditor?: boolean`. Accessible as `currentUser?.isAuditor` (via `useSnapshot(userStore)`).
- Other consumers of the filter: `projectsManagement/components/CostCenterFilter` (calls cost-centers list; backend now allows auditors per task).

### Decisions Already in the Code
- Auditor = read-only platform role; `canAccessUsersTab` already includes auditors; `store/user.ts:364` treats admin/auditor alike for reads.
- Page gate `canManageCostCenters` is for write actions; link gating was aliased to it (the coupling to remove).

### Task Statements Checked Against the Code
- "Gate inline in two places": holds (CostCentersManagementPage.tsx:103-104; ProjectsManagementFull.tsx:243-244).
- "isAuditor exposed on user store": holds (`user.ts:150`).
- "Backend allows auditor cost_center_ids filter": holds (see First Check).
- "Backend auditor can read cost centers (6f72b878e)": unverified here (commit not found in local backend checkout).

### Consumers of Changed Contracts
Searched `canFilterByCostCenter`, `canLinkToFilteredProjects`, `canManageCostCenters`, `isMaintainer` under projectsManagement: gate used only in the two files above. Changing the link/filter gate must not alter `canManageCostCenters` (write actions). `ProjectModal.tsx` / `ProjectMembersManager.tsx` use isMaintainer for unrelated purposes.

### Architecture and Layers Affected
UI page components + utils (permissions helper). No store/API changes.

### Integration Points
Router `projects-management` with query `cost_center_ids`; projects list API `cost_center_ids` param; feature flag `FEATURE_FLAG_COST_CENTERS`.

### Patterns and Conventions
Permission helpers as pure functions in `src/utils/permissions.ts` with tests in `src/utils/__tests__/permissions.test.ts`; module-level cell components for Sonar S6478.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (AGENTS.md routes); not read in depth for this small task. Relevant: state-management, testing-patterns, quality-gates.

### Architectural Decisions
None found beyond the inline comment on auditor read-only access.

### Derived Conventions
Helper style from `canAccessUsersTab`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/__tests__/CostCentersManagementPage.test.tsx` — `beforeEach` sets admin (line ~101); maintainer test (~136) expects link; test at ~147 "renders a plain count without a link when the viewer cannot filter by cost center" uses `{isAdmin:false,isAuditor:true}` and asserts no link — this is the one that flips.
- `src/utils/__tests__/permissions.test.ts` — covers `canAccessUsersTab` only (null/undefined, plain, admin, maintainer, auditor, project admin); has `baseUser` fixture.
- `projectsManagement/__tests__/ProjectsManagementFull.initialLoad.test.tsx:~189-203` — `describe('cost-center filter access')` with `it.each` of admin(true), maintainer(true), plain user(false); asserts `cost-center-filter` testid. Add auditor row `[{platform_role:'auditor', isAuditor:true}, true]` here.
- `ProjectsManagementFull.costCenterHeader.test.tsx` sets admin only.

### Testing Framework and Patterns
Vitest + Testing Library; `userStore.user = {...} as never` direct assignment; Table mocked in the page test.

### Coverage Gaps
No test for a new helper yet; no auditor case for the filter visibility.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None.

### Feature Flags and Deployment Concerns
`FEATURE_FLAG_COST_CENTERS` gates the filter in ProjectsManagementFull (the Cost Centers page itself is not flag-gated in the lines read).

---

## 6. Risk Indicators

- Speculative: if the shared helper replaced `canManageCostCenters` too, auditors would gain write actions in the cost-center page (create/edit/delete at CostCentersManagementPage.tsx:211-254); backend 403s those.
- Speculative: updating only one of the two gates yields a link to a page without the filter (ProjectsManagementFull also clears URL `cost_center_ids` when not allowed).
- Flag `FEATURE_FLAG_COST_CENTERS` still gates the Projects-side filter; helper must not swallow it.
- Backend commit 6f72b878e not verifiable locally; auditor read of GET cost-centers (feeds `CostCenterFilter`) relies on the task's statement.
- Existing auditor "plain count" test encodes the old behaviour and must change.

---

## 7. Summary for Complexity Assessment

Small frontend-only change: two inline gates (CostCentersManagementPage.tsx:103-104, ProjectsManagementFull.tsx:243-244) plus `src/utils/permissions.ts`, which already hosts an analogous admin/maintainer/auditor helper. `isAuditor` is already mapped on the user store. Backend verified: the projects-list endpoint accepts and applies `cost_center_ids` for auditors (no role guard; auditors get admin-scope list).

Test posture is good: existing page test (one assertion flips), permissions unit tests (pattern ready), and an `it.each` visibility table in ProjectsManagementFull.initialLoad.test.tsx to extend. Main risk is keeping write-action gating (`canManageCostCenters`) separate from the link gate.

---

## 8. External References

None named by the task beyond the backend repo (resolved: `/Users/akobir_bahronov/Development/epam/runway/codemie-dev/codemie`, read for the First Check; findings above). Commit 6f72b878e: unresolved in local backend checkout.
