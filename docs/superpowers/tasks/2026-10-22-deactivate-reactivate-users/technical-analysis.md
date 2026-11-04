# Technical Research

**Task**: users management administration deactivate reactivate
**Generated**: 2026-10-22
**Research path**: filesystem

---

## 1. Original Context

# EPMCDME-13928 Deactivate and reactivate users from User Management
Platform admins can't deactivate/reactivate a user from the UI. The list doesn't show who is deactivated, and user pickers elsewhere would offer deactivated users once the backend lists them.

Backend contract (ready): DELETE v1/admin/users/{id} deactivates (returns {"message":...}, or 403 with message for last super admin). POST v1/admin/users/{id}/reactivate returns user detail, 409 "User is already active" or 404. Both allowed for super admins and maintainers only. GET v1/admin/users now returns deactivated users by default; filters JSON param narrows with is_active true/false. UserListItem already has is_active (src/types/entity/user.ts:61); getUsers forwards filters.is_active (src/store/user.ts:449). Store calls use api.delete(url, undefined, { skipErrorHandling: true }) and matching api.post.

Page: src/pages/settings/administration/UsersManagementPage.tsx: BASE_COLUMN_DEFINITIONS ~:70, currentUser with isAdmin/isMaintainer/isAuditor ~:85, row menu NavigationMore ~:343 (View details, Assign budgets, Reset budget). Filters: usersManagement/components/UsersManagementFilters.tsx, usersManagement/hooks/useUsersManagementFilters.ts, FILTER_INITIAL_STATE in usersManagement/constants.ts. Reuse: src/components/ConfirmationModal (visible,onCancel,onConfirm,confirmText), src/components/StatusBadge, usersManagement/components/UserProjectsTable.tsx (confirm-then-refresh pattern).
Other screens must only see active users: userStore.searchUsers (src/store/user.ts:266; used by UserEmailAutocomplete, UserSelector, AddUserModal, ChangeOwnershipModal) sends no filters today; ProjectMembersManager (src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx ~:360, getBaseUserFilters).

Requirements: Status column (Deactivated StatusBadge; Active label or nothing). Filter status All (default, sends no is_active)/Active (true)/Deactivated (false), saved and restored like other filters. Row menu "Deactivate user" (active) / "Reactivate user" (deactivated) opens ConfirmationModal naming the user; on confirm call store, refresh list, success toast; on error show backend message as toast, list unchanged. Menu items only for super admins and maintainers; auditors/others never; nobody gets Deactivate on own row. searchUsers sends filters {"is_active": true}; ProjectMembersManager base filters add is_active: true.
Acceptance: 1 list shows deactivated by default with label; 2 status filter works and survives reload; 3 admin/maintainer can deactivate/reactivate behind confirmation, row updates; 4 backend errors shown, nothing changes; 5 auditors/non-admins never see actions, no self-deactivation; 6 pickers and project members never show deactivated users. Tests: unit + integration cover every criterion. Out of scope: backend, bulk, user details popup, mock server.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/UsersManagementPage.tsx` — page. `BASE_COLUMN_DEFINITIONS` (~:70-80) built with `createCustomColumn(key,label,width)`; widths are percentages (4,14,16,7,7,7,14,16,3 = 94% plus the select column). `customRenderColumns` useMemo holds per-column renderers; `actions` renderer (~:343) builds `NavigationMore` items (View details; Assign budgets + Reset budget gated by `canManageBudgets`, which also requires the budget feature flag). The memo deps are `[canManageBudgets, handleOpenDetailsPopup, handleOpenBudgetModal, setResetBudgetUser]`. `isAdmin`/`isMaintainer`/`isAuditor` come from `useSnapshot(userStore).user`. `refresh()` reloads the current page with `effectiveFilters`; `refreshFromFirstPage()` also exists. `effectiveFilters` memo spreads `filters` and overrides budgets / platform_role. The existing `ResetBudget` confirm state is `resetBudgetUser`.
- `src/store/user.ts` — `userStore` (Valtio). `getUsers` (~:420-460) builds the `filters` JSON and already forwards `is_active` when `!= null`; the type at :85 already has `is_active?: boolean | null`. `searchUsers(query, perPage)` (:266) sends only `search` and `per_page` (no filters). No deactivate/reactivate methods exist. Current user is stored as `userStore.user` with `userId` (not `id`), `isAdmin`, `isMaintainer`, `isAuditor`, `email`, `username` (:140-152, :180-190). Self-detection must compare `userId` against the row `id`.
- `src/types/entity/user.ts:61` — `UserListItem.is_active: boolean`.
- Filters: `usersManagement/constants.ts` (`UsersManagementFilters` interface: search, projects, budgets, platform_role; `FILTER_INITIAL_STATE`); `usersManagement/hooks/useUsersManagementFilters.ts` (loads via `getFilters(FILTER_ENTITY.USERS_MANAGEMENT)`, validates saved `platform_role`, merges with initial state key by key, `handleFilterChange` runs `cleanObject`, treats null/''/empty array as reset, persists with `setFilters`); `usersManagement/components/UsersManagementFilters.tsx` (local state, `Select` for Platform Role with 'all' sentinel mapped to null, `checkEmptyFilters(filters)` governs Clear All).
- Reusable UI: `src/components/ConfirmationModal` (props header, message, confirmText, confirmButtonType, visible, onCancel, onConfirm, hideIcon, confirmDisabled); `src/components/StatusBadge` (`status: StatusType` of not_started|in_progress|pending|error|warning|success, optional `text`); `toaster` from `@/utils/toaster`. `UserProjectsTable.tsx` confirm pattern: state holds pending item, modal `visible={!!pending}`, `confirmX` async handler with `toaster.info`/`toaster.error(error?.parsedError?.message || 'fallback')`.
- `searchUsers` consumers: `src/components/UserEmailAutocomplete/UserEmailAutocomplete.tsx:81`, `src/components/UserSelector/UserSelector.tsx:85`, `src/pages/settings/administration/components/AddUserModal.tsx:86`, `.../components/projectsManagement/ChangeOwnershipModal.tsx:105`.
- `userStore.getUsers` callers: `UsersManagementPage.tsx:129` (select-all `onFetchAll`) and `:191` (`loadUsers`); `ProjectMembersManager.tsx:373,383,393`. `getBaseUserFilters` (~:360) returns `{projects:[project.name], search, platform_role}` and feeds `fetchAllMatchingUsers`; line ~393 is another `getUsers` call (not inspected in detail whether it uses `getBaseUserFilters`).
- Similar "Status" column precedent: `MCPManagementPage.tsx:63` + `utils/columnRenderers.tsx:78` (`is_active` rendered as Active/Inactive text).
- Delete precedent for store: `store/projects.ts:402` uses `api.delete(...)` with options; `api.delete(url, body?, options?)` at `utils/api.ts:165`. HttpError carries `parsedError` (api.ts:99, 186).

### Architecture and Layers Affected
- Store layer: `src/store/user.ts` (new deactivate/reactivate methods, `searchUsers` filter param, `userStore` type declaration block at :60-100).
- Page/UI layer: `UsersManagementPage.tsx` (column, row menu, confirm modal, handlers), `UsersManagementFilters.tsx` (status select).
- Filter state layer: `constants.ts`, `useUsersManagementFilters.ts`, persistence via `@/utils/filters`.
- Consumer components of `searchUsers` (no code change implied if the filter is added inside the store): UserEmailAutocomplete, UserSelector, AddUserModal, ChangeOwnershipModal.
- Project members: `ProjectMembersManager.tsx`.

### Integration Points
- Backend `v1/admin/users` (GET, filters JSON), `DELETE v1/admin/users/{id}`, `POST v1/admin/users/{id}/reactivate` through the single `api` layer (`src/utils/api.ts`).
- `FILTER_ENTITY.USERS_MANAGEMENT = 'users_management'` in `src/utils/filters.ts:43` (localStorage persistence).
- `mock-server/` (db.json, routes.json) exists but is out of scope per the task.

### Patterns and Conventions
- Valtio store object with methods; API calls use `skipErrorHandling: true` and re-throw after logging; callers present toasts.
- Table columns: `DefinitionTypes.Custom` + `customRenderColumns` map keyed by column key.
- Select filter pattern with 'all' sentinel mapped to null/undefined and applied immediately via `onFilterChange`.
- Files carry the Apache licence header; Prettier/ESLint run automatically via hook in Claude Code.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (README.md, project.md, quality-gates.md, plus architecture/, components/, development/, patterns/, styling/, testing/, security/, standards/, integration/, onboarding/). Relevant: `patterns/state-management.md`, `development/api-integration.md`, `development/error-handling-patterns.md`, `components/component-patterns.md`, `patterns/modal-patterns.md`, `testing/testing-patterns.md`, `standards/git-workflow.md`. I read the head of testing-patterns.md only; the others were not read in this pass.

### Architectural Decisions
No ADRs located for this area. AGENTS.md rule: tests are written only when explicitly requested (the ticket requests them); no commit without ticket key (EPMCDME-13928 is the branch ticket).

### Derived Conventions
Error toast: `toaster.error(error?.parsedError?.message || fallback)`. Confirm modals use `hideIcon` and `ButtonType.DELETE`/`PRIMARY`.

---

## 4. Testing Landscape

### Existing Coverage
- Page: `src/pages/settings/administration/__tests__/UsersManagementPage.createUserButton.test.tsx`, `UsersManagementDefaultProject.integration.test.tsx`, `UsersManagementSpending.integration.test.tsx`.
- `usersManagement/components/__tests__/` (UserProjectsTable x3, UserProjectSpendingTable) and `components/popups/__tests__/` (UserDetailsPopup variants, CreateUserPopup, AddProjectPopup).
- Searchers: `src/components/UserEmailAutocomplete/__tests__/UserEmailAutocomplete.test.tsx` (mocks `userStore.searchUsers`, asserts `toHaveBeenCalledWith('ali', 10)`), `components/__tests__/AddUserModal.test.tsx`, `components/projectsManagement/__tests__/ChangeOwnershipModal.test.tsx` (both mock `searchUsers`).
- Project members: `projectsManagement/__tests__/ProjectMembers*.test.tsx` (Ordering, Spending, BudgetPermissions, TableScroll, ViewAnalytics.integration, BulkActions).

### Testing Framework and Patterns
Vitest + React Testing Library, projects `unit` and `integration`. Integration tests use `mockAPI` and `renderPage` from `@/test-utils/integration`, with fixture users (e.g. `maintainerUser` with `is_admin`, `is_maintainer`) and `appInfoStore`. Unit tests mock stores via `vi.mock('@/store/user', ...)`.

### Coverage Gaps
- No tests for the filters hook `useUsersManagementFilters` or `UsersManagementFilters` (none found by name).
- No tests for `userStore.getUsers`/`searchUsers` request shape located; none for deactivate/reactivate (not yet existing).
- No existing test asserts `getBaseUserFilters` output in ProjectMembersManager.
- Existing tests asserting exact `searchUsers` call args or the `v1/admin/users` URL may be affected by new filter params (UserSelector has no test found).

---

## 5. Configuration and Environment

### Environment Variables
None specific to this feature area (`import.meta.env.VITE_*` / `window._env_` not used by the users management code).

### Configuration Files
`vite.config.ts` (test projects, `CI_COVERAGE_TEST_TIMEOUT_MS`, worker cap). Filter persistence is browser localStorage via `src/utils/filters.ts`.

### Feature Flags and Deployment Concerns
Budget feature flag (`useBudgetManagementEnabled`) governs budget menu items only; deactivation menu items are specified as role gated, not flag gated. No deployment changes identified.

---

## 6. Risk Indicators

- Speculative: `useUsersManagementFilters` reset logic treats `null` as reset and `cleanObject` strips empty values; a boolean/tri-state `is_active` filter needs care since `typeof value === 'boolean'` returns "not reset" in the `every` check (a `false` value, "Deactivated", is the sole non-empty filter and must not be dropped by `cleanObject`, and must persist and restore). Verify `cleanObject` behaviour with `false`.
- Speculative: `checkEmptyFilters` governs the "Clear All" button; a new status field would need to be understood by it.
- Speculative: current user identity is `userStore.user.userId`, while list rows use `id`; self-row detection must use the right fields. Email/username may be fallbacks.
- Speculative: `customRenderColumns` memo deps and `BASE_COLUMN_DEFINITIONS` percentage widths (already ~94% plus select) make adding a Status column a layout risk; UsersManagementSpending/DefaultProject integration tests may assert on columns.
- Speculative: adding `is_active: true` to `searchUsers` changes the request URL; tests mocking `api.get` with specific URLs could break. The select-all flow (`UsersManagementPage.tsx:129`) must carry the status filter consistently (it takes `effectiveFilters`; confirm).
- ProjectMembersManager has multiple `getUsers` call sites (:373, :383, :393); not all verified to share `getBaseUserFilters`.
- Backend error shapes: 403 last super admin message, 409 already active, 404; relies on `parsedError.message`; the DELETE response body is `{message}` not user detail.
- The page file is large; a pending modal state plus handlers raises its complexity. Working tree has an unrelated modified `.codemie/codemie-cli.config.json`.

---

## 7. Summary for Complexity Assessment

The change spans the store layer (two new methods plus a filter on `searchUsers`), one large page component (`UsersManagementPage.tsx`: new column, role- and self-gated row menu items, confirmation modal, refresh and toasts), the filters stack (constants, hook, filters component), and one filter tweak in `ProjectMembersManager.tsx`. Roughly 6 to 8 source files change; no new dependencies, routes, config or migrations. The backend contract is ready, and `UserListItem.is_active` and `getUsers`'s `is_active` forwarding already exist, so no type or API-layer scaffolding is needed.

Technical novelty is low: every piece has a local precedent (confirm-then-refresh in `UserProjectsTable`, a Select filter with an 'all' sentinel, `StatusBadge`, `skipErrorHandling` store calls). The one subtle area is the tri-state boolean filter passing through the existing persist and reset logic, which was built for strings and arrays.

Test posture is mixed: the page and searchers have existing unit and integration tests with reusable fixtures (`mockAPI`, `renderPage`), but the filters hook, filters component and store request shape are untested. The ticket requires unit plus integration tests for all six acceptance criteria, which is a sizeable share of the effort. Key risks are listed in Section 6.

---

## 8. External References

None named by the task
