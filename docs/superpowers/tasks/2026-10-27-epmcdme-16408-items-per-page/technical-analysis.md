# Technical Research

**Task**: project members pagination
**Generated**: 2026-10-27
**Research path**: codegraph

---

## 1. Original Context

task_context: EPMCDME-16408 (Bug) — Project Members: selected items-per-page value resets to 10 after a member action.
Description: On Settings > Administration > Projects management > a project > Members tab, selecting "Show: 20 items" and then performing a member action (e.g. Unassign from Project) resets the selection to the default 10. Expected: list updates while Show: 20 remains selected.
Acceptance criteria: 1) After a member is unassigned, the selected items-per-page value remains unchanged. 2) Refreshed member list and pagination reflect both the completed action and the selected page size. 3) Other supported member actions that refresh the list (e.g. bulk budget override, role change, assign) do not unexpectedly reset the page size.
Related: EPMCDME-16410 (Members pagination selector disappears when page size exceeds member count) touches same table/selector — note overlap, do not fix.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — parent. Holds `project`, `loading`, `budgets` state. `loadProject` (l.131) does `setLoading(true)` -> `projectsStore.getProject(name, true)` -> `setProject`. At l.224 `if (loading) return <SettingsLayout ... <Spinner/>>` early-returns, so the whole tab tree is unmounted while loading. It passes `onMembersChanged={loadProject}` (l.281) to `ProjectMembersManager`, and `onProjectChanged={loadProject}` to budgets/overview sections.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` — the Members tab. Page size lives in LOCAL state: `useState({page:0, per_page:10, total:0})` (l.264). `fetchUsers(page, perPage)` (l.383) calls `userStore.getUsers` and does `setPagination(result.pagination)`. `perPageRef` mirrors `pagination.per_page`. `loadUsers` (l.464) fetches page 0 with `perPageRef.current`, runs in an effect on mount / when `fetchUsers` identity changes (filters, project.name, etc.).
  - `handlePageChange(page, newPerPage?)` (l.550) uses `newPerPage ?? pagination.per_page`.
  - `reloadUsers` (l.566) refetches current page/per_page (used by assign `handleAddUserSubmit` l.635 and `handleImportSuccess` l.655).
  - `refreshFromFirstPage` (l.579) = `handlePageChange(0)` then `onMembersChanged?.()`; passed as `refresh` to `ProjectMembersBulkActions` (l.907, `onSuccess={onMembersChanged}`) and ResetBudgetPopup `onSave` (l.1039).
  - `confirmDelete` (unassign, l.618) and `confirmRoleChange` (l.593): `handlePageChange(0)` then `await onMembersChanged?.()`.
  - `refreshBudgets` (l.660) / `handleOverrideMember` (l.666): reload budgets via `onBudgetsChanged` (parent `setBudgets`) - no parent `loadProject`, no remount.
  - Pagination rendered at l.960: `users.length > 0 && <Pagination perPage={pagination.per_page} perPageOptions={DECIMAL_PAGINATION_OPTIONS} setPage={handlePageChange} .../>`.
- `src/components/Pagination/Pagination.tsx` — has its own `currentPerPage` state synced from `perPage` prop; `handlePerPageChange` calls `setPage(0, newPerPage)`. Returns `null` when `totalPages <= 1` (the EPMCDME-16410 overlap: selector disappears with it).
- `src/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions.tsx` — bulk change role / unassign / override budgets / reset budgets; props `refresh`, `onSuccess`, `onBudgetsChanged`.
- `src/store/user.ts` — `getUsers({page, perPage, filters})`, `unassignUserFromProject`, `updateUserProjectRole`, `assignUserToProject`.

### Observed behaviour (code reading, not run)
Unassign/role-change/bulk actions that call `onMembersChanged` (= `ProjectDetailsPage.loadProject`) flip parent `loading` true, which unmounts `ProjectMembersManager` (spinner branch). On `setProject`, it remounts with fresh state `per_page: 10`. This is consistent with the reported symptom. Actions that do not call `onMembersChanged` (budget override via `refreshBudgets`) keep the mounted state. Assign (`handleAddUserSubmit`) and import call `reloadUsers` first, then `onMembersChanged`, so they also hit the same remount.

### Architecture and Layers Affected
Page container (`ProjectDetailsPage`) -> feature component (`ProjectMembersManager`) -> shared `Pagination` / `Table` components -> Valtio `userStore` -> `api`.

### Integration Points
`ProjectMembersManager` <-> `ProjectDetailsPage` (`onMembersChanged`, `budgets`, `onBudgetsChanged`); `ProjectMembersBulkActions` (`refresh`, `onSuccess`); `ResetBudgetPopup`; `useTableSelection`.

### Patterns and Conventions
Local `useState` pagination with `per_page` snake_case in this component (other lists use `useTableFilters` or store `pagination.perPage`, e.g. `ProjectsManagementFull` writes `projectsStore.pagination.perPage`). Callbacks use refs (`perPageRef`) to avoid effect re-runs.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (state-management.md, component-patterns.md, testing-patterns.md, etc.); not read in depth for this analysis. Task routing: State -> `.ai-run/guides/patterns/state-management.md`; Testing (only if asked) -> `testing/testing-patterns.md`.

### Architectural Decisions
None found beyond inline comments (e.g. refs to avoid double-fetch in ProjectMembersManager l.527).

### Derived Conventions
Parent `loadProject` is the shared refresh used by Overview, Budgets and Members tabs.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — covers ProjectDetailsPage and, via it, ProjectMembersManager/Filters.
- `projectsManagement/__tests__/ProjectMembersNoSortParams.test.tsx`, `ProjectMembersBudgetPermissions.test.tsx`, `ProjectMembersSpending.test.tsx`, `ProjectMembersTableScroll.test.tsx`, `ProjectMembersViewAnalytics.integration.test.tsx`.
- `components/projectsManagement/__tests__/ProjectMembersBulkActions.test.tsx`, `BulkBudgetOverrideModal.test.tsx`.
- `src/pages/integrations/__tests__/ProjectSettingsPagination.integration.test.tsx` — per-page reload pattern with `mockAPI`/`renderPage` (reference pattern for an integration test).

### Testing Framework and Patterns
Vitest + React Testing Library, projects `unit` and `integration` (`vite.config.ts`); integration helpers `renderPage`, `mockAPI` from `@/test-utils/integration`. Unit tests mock valtio `useSnapshot`/stores via `vi.mock`.

### Coverage Gaps
No test found asserting per-page persistence after unassign/role change/assign/bulk action in the Members tab.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
`DECIMAL_PAGINATION_OPTIONS` / `DEFAULT_PAGINATION_OPTIONS` in `@/constants` (options for the selector).

### Feature Flags and Deployment Concerns
`useBudgetManagementEnabled`, `PROJECT_MODEL_OVERRIDE` flags gate budgets/models tabs; `isModelsConfigEnabled` is forced `false` for members. No deployment concerns.

---

## 6. Risk Indicators

- `ProjectDetailsPage.loadProject` toggling `loading` unmounts the Members tab (l.224); the same function is used by Overview and Budgets tabs, so any change to its loading behaviour affects them.
- Speculative: fixes could be (a) not unmounting on background refresh, or (b) lifting/persisting `per_page` outside the component; each has different blast radius and test needs.
- Local pagination state also holds `page`; filters, selection and scroll state in the manager are lost on the same remount (likely same root cause; verify whether filters also reset).
- Overlap with EPMCDME-16410: `Pagination` returns null when `totalPages <= 1`, and Members renders it only when `users.length > 0`; do not change here.
- Acceptance criterion 3 spans several paths (`refreshFromFirstPage`, `reloadUsers`, `confirmDelete`, `confirmRoleChange`, `handleAddUserSubmit`, `handleImportSuccess`, ResetBudgetPopup); `handlePageChange(0)` after unassign also resets the page to 0 (acceptable per criteria, only size is required).
- No existing regression test for page-size persistence.

---

## 7. Summary for Complexity Assessment

The bug is confined to the admin Project Details area: `ProjectDetailsPage.tsx` and `ProjectMembersManager.tsx`, with `Pagination.tsx` as an unchanged shared dependency. Page size is held in local `useState` (default 10) in `ProjectMembersManager`. Member actions that call `onMembersChanged` trigger the parent `loadProject`, which sets `loading` and replaces the page with a spinner, unmounting the manager and discarding its state. This is a likely root cause from code reading and has not been executed.

Technical novelty is low (existing React state/lifecycle pattern, no new dependencies, no API or config changes found). The change surface looks like 1-2 source files plus a test, though the shared `loadProject` is used by other tabs so regression care is needed.

Test posture: related component tests exist (ProjectDetailsPage, bulk actions, members suites) and an integration pattern for per-page exists, but nothing covers page-size persistence after actions. Main risks are side effects on Overview/Budgets tabs and overlap with EPMCDME-16410.

---

## 8. External References

None named by the task.
