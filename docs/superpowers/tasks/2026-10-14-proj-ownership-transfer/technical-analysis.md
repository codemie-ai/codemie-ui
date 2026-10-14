# Technical Research

**Task**: project administration settings ownership members
**Generated**: 2026-10-14
**Research path**: filesystem

---

## 1. Original Context

Frontend handoff — Project ownership transfer (EPMCDME-15951). Backend endpoint ready: PUT /v1/projects/{projectName}/ownership, body { user_id }, response { name, created_by, message }, 404 on no-permission/project-not-found/user-not-active, same authorization as existing project-mutation endpoints. Need to: (1) add a 'Change ownership' action to the three-dot/kebab menu on each project row at /settings/administration/projects, (2) open a modal with a dropdown to search the FULL platform user directory (not restricted to existing project members) to pick the new owner, (3) display the current owner in that modal, (4) on success, invalidate/refetch the project list and/or project members list so the new owner shows up as a member immediately, (5) do NOT remove the previous owner from the project — only ownership (created_by) changes.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` — the list page rendered at `/settings/administration/projects` (routed via `src/router.tsx` path `/settings/administration/projects`, component `ProjectsManagementPage` → wraps this). Builds the per-row kebab menu in `customRenderColumns.actions` (lines ~497-551) using `NavigationMore` with a `NavigationItem[]` array (`View`, `Edit`, `Delete` today, gated by `canManageProject(item)` and `isUserManagementEnabled`). This is the file the "Change ownership" menu entry belongs in.
- `canManageProject` (same file, ~243-255) — existing authorization check: super admin, or project admin of that project (`currentUser.applications` + `applicationsAdmin`). Reused by Edit/Delete; the task says ownership transfer uses "same authorization as existing project-mutation endpoints," which matches this check's intent.
- `src/store/projects.ts` — `projectsStore` (valtio proxy). Has `updateProject`, `createProject`, `deleteProject`, `assignUserToProject`, `updateUserProjectAssignment`, `removeUserFromProject`, `bulkAssignUsersToProject`, `getProject`, `indexProjects`, `searchProjects`. No `transferOwnership`/`updateOwnership` method exists yet — this is new. Existing methods follow a strict pattern: `this.loading = true; this.error = null; try { api.<verb>(url, body, { skipErrorHandling: true }); const result = await response.json(); ...; } catch { ...; throw error } finally { this.loading = false }`. `updateProject` (line 255) is the closest analogue — `api.patch('v1/projects/${id}', {...}, { skipErrorHandling: true })` and merges the returned project back into `this.projects` by matching `id`.
- `src/store/user.ts` — `userStore.searchUsers(query, perPage = 10)` (line 264) calls `GET v1/admin/users?search=...&per_page=...` with `skipErrorHandling: true`, sorts by name. This is the **full platform user directory search** — not scoped to any project — matching requirement (2) exactly.
- `src/components/UserSelector/UserSelector.tsx` — a `MultiSelect`-based multi-user search dropdown wired to `userStore.searchUsers`; used only in `ActivityEventsPage.tsx`. It is multi-select, not directly reusable for a single-owner picker without adaptation.
- `src/pages/settings/administration/components/AddUserModal.tsx` — the closer pattern match: a `Popup` containing a `MultiSelect ... singleValue={true}` wired to `userStore.searchUsers`, with debounced search (`useDebouncedApply`, 500ms), request-id guarding against stale responses, and a `role` `Select`. This is the template for the new ownership-transfer modal's user picker (minus the role select).
- `src/pages/settings/administration/components/projectsManagement/ChangeProjectRolePopup.tsx` — another `Popup` + `react-hook-form` + `yup` example scoped to already-selected project members (not full directory) — useful for the Popup/form shape but not the search behavior.
- `src/types/entity/project.ts` — `Project` interface already has `created_by?: string | null` (line 52) and `id`/`name`. The list payload from `indexProjects` therefore can carry `created_by` (an id), but there is no `created_by` display name/email on the `Project` type — only the raw id.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` — the Members tab (`/settings/administration/projects/:projectName/members`) computes `const isCreator = user.id === project.created_by` (line 757) to decide whether "Unassign" is hidden for the owner — i.e. the members table already treats `created_by` as a live signal and will reflect a new owner once the member/project data refetches. It receives `project: ProjectDetail` and `onMembersChanged` as props from `ProjectDetailsPage.tsx`.
- `src/pages/settings/administration/ProjectDetailsPage.tsx` — `loadProject` (line ~134) calls `projectsStore.getProject(projectName, true)` and is passed to `ProjectMembersManager` as `onMembersChanged={loadProject}` (line ~289), the refetch hook used after member-list-affecting actions (add user, import, role change, remove).
- `ProjectsManagementFull.tsx` already defines `refreshProjects` (line ~404), which re-runs `loadProjects` with current page/search/sort — the equivalent list-page refetch hook, already used after `updateProject`/`createProject`/`deleteProject`.

### Architecture and Layers Affected

- **Page/UI layer**: `ProjectsManagementFull.tsx` (kebab menu entry, new modal state, submit handler) under `src/pages/settings/administration/projectsManagement/`.
- **Component layer**: a new modal component (likely `src/pages/settings/administration/projectsManagement/` or `components/projectsManagement/`), following the `Popup` + `MultiSelect singleValue` + `userStore.searchUsers` pattern from `AddUserModal.tsx`.
- **Store layer**: `src/store/projects.ts` (`projectsStore`) needs a new method to call the ownership endpoint; `src/store/user.ts` (`userStore.searchUsers`) is reused as-is for the directory search.
- **Types layer**: `src/types/entity/project.ts` (`Project`) and `src/types/entity/projectManagement.ts` (`ProjectDetail`) already carry `created_by`.
- No router, API-layer (`src/utils/api.ts`), or backend changes are implicated — only frontend store/UI.

### Integration Points

- `src/utils/api.ts` is the single HTTP wrapper (`api.get/post/patch/put/delete`), used by every store method above; any new call follows the same `skipErrorHandling: true` + `response.json()` convention as `updateProject`.
- `userStore.searchUsers` → `GET v1/admin/users` is the only existing full-directory search; no project-membership filtering happens there, consistent with requirement (2).
- `ProjectMembersManager.tsx`'s `isCreator` check and the Members tab's member list are the natural place the new owner should "show up as a member" per requirement (4) — but note the backend contract only changes `created_by`; whether the new owner is already an assignable project member or needs a separate membership record is outside what the UI payload (`{ name, created_by, message }`) describes.
- `ProjectsManagementFull.tsx`'s `refreshProjects()` is the list-level refetch hook; `ProjectDetailsPage.tsx`'s `loadProject()` is the detail/members-level refetch hook. Since the task's action lives on the list page, only `refreshProjects()` is directly reachable from this file; refreshing the Members tab from the list page would require either navigating there or there being no live Members-tab instance to refresh (it's a different route).

### Patterns and Conventions

- Kebab/overflow menu: `NavigationMore` component with a `NavigationItem[]` (`title`, `icon`, `onClick`, optional `disabled`/`tooltip`), gated by capability checks (`canManageProject`, `isUserManagementEnabled`), per `ProjectsManagementFull.tsx`.
- Modals: `Popup` component (header, `onSubmit`, `submitText`, `submitDisabled`, `withBorderBottom`) wrapping a `<form>`, per `AddUserModal.tsx` and `ChangeProjectRolePopup.tsx`.
- Single-select searchable user dropdown: `MultiSelect` with `singleValue={true}`, `onFilter` triggering a debounced (`useDebouncedApply`) call to `userStore.searchUsers`, with a `requestIdRef` guard against stale async responses — exact shape in `AddUserModal.tsx` lines 59-130.
- Store methods: `loading`/`error` state, `skipErrorHandling: true` on mutating calls, `await response.json()`, update in-memory `this.projects` array by id after success (see `updateProject`).
- Error surfacing: `toaster.error(error?.parsedError?.message || error?.message || '<fallback>')` at the component layer (see `handleModalSubmit` in `ProjectsManagementFull.tsx`), with console logging the raw error.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — "Component → Store → API. Never skip layers," mandates `loading`/`error` on every async store method, `await response.json()` (not `.data`), `??` over `||`, and `debouncedFn.cancel()` cleanup in `useEffect`.
- `.ai-run/guides/patterns/modal-patterns.md`, `.ai-run/guides/components/component-patterns.md` — exist but not read in depth; the in-repo `Popup`/`MultiSelect` usages above are the concrete precedent and are consistent with the guide's "Component → Store → API" rule (modal calls a store method, not `api.*` directly).
- `.ai-run/guides/development/api-integration.md` — documents `skipErrorHandling: true` for calls that need custom error handling at the call site (used throughout `projects.ts`).

### Architectural Decisions

- No ADRs found specific to ownership. The inline comment at `ProjectsManagementFull.tsx` line 94-95 ("EPMCDME-14866: integrations no longer block deletion...") shows the convention of citing a ticket number in comments for backend-contract-driven UI logic changes — a precedent to follow if ownership transfer needs a similar note (e.g. why the previous owner is deliberately not removed).

### Derived Conventions

- Ticket-numbered inline comments explain backend-contract-driven conditionals (see above).
- New project-row actions are added to the `menuItems` array inside `customRenderColumns.actions`, gated by the same `canManageProject` check used for Edit/Delete.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx`, `.deleteEligibility.test.tsx`, `.initialLoad.test.tsx`, `.search.test.tsx`, `.pagination.integration.test.tsx`, `.test.tsx` — cover the kebab menu, edit modal, delete confirmation, and list loading/search/pagination for this exact file. `editFlow.test.tsx` mocks `@/components/Table` to render `customRenderColumns.actions(item)` directly per row and mocks `useVueRouter`/`useFeatureFlags`/`SettingsLayout` — this is the harness a new "Change ownership" test would plug into.
- `src/pages/settings/administration/components/__tests__/AddUserModal.test.tsx` — covers the `MultiSelect singleValue` + `userStore.searchUsers` pattern directly, a template for testing the new ownership-picker modal.
- No test file or source file anywhere in the repo currently references "ownership" (`grep -rn "ownership" src` returned nothing) — this is a greenfield addition with zero existing coverage.

### Testing Framework and Patterns

- Vitest + React Testing Library, two projects (`unit`, `integration`), per `package.json` scripts and `AGENTS.md`.
- Pattern: `vi.mock` the router hook, feature-flag hooks, `SettingsLayout`, and `Table` (to directly invoke `customRenderColumns`), then `fireEvent`/`act` to drive menu clicks and modal interactions; `vi.spyOn` or module mock on the store (`projectsStore`, `userStore`) to assert calls and simulate responses/errors; `toaster` assertions for success/error paths.

### Coverage Gaps

- No tests exist for any ownership-transfer behavior (menu item visibility, modal open/search/select, submit success/404 handling, list/members refetch) — all net-new.
- No store-level tests found for `projects.ts` in isolation checked here (test files found are page-level); a new `transferOwnership`-style method would need its own unit coverage or page-level coverage through `ProjectsManagementFull`.

---

## 5. Configuration and Environment

### Environment Variables

- None found specific to ownership or project management; the feature flags in use here (`features:userAbilityToCreateProject`, `features:costCenters`) are read via `useFeatureFlag`/`useUserManagementEnabled`/`useBudgetManagementEnabled` hooks, not raw env vars, and are unrelated to this task.

### Configuration Files

- None specific to this feature. The project list reads `v1/projects` and related sub-resources off the single `api.ts` HTTP layer; no config file governs the ownership domain.

### Feature Flags and Deployment Concerns

- `isUserManagementEnabled` gates whether the "View" menu item (and the Members tab generally) is shown; a "Change ownership" action in the kebab menu would plausibly follow the same `canManageProject` gate used for Edit/Delete, independent of this flag, since ownership transfer is a project-mutation action rather than a user-management-tab feature. (This gating choice is a design decision, not something the code currently dictates — see Risk Indicators.)

---

## 6. Risk Indicators

- Speculative: The new owner "showing up as a member immediately" (requirement 4) may require more than refetching `projectsStore` — if the backend's `PUT .../ownership` response (`{ name, created_by, message }`) does not itself create/update a membership record, the Members tab's list (fetched separately, likely via `userStore`'s project-user endpoints) might not include the new owner at all until a separate assignment call happens. This document only confirms what endpoints and refetch hooks exist, not whether ownership transfer alone guarantees membership — that is a design/backend-coordination question, not something resolvable from this codebase alone.
- No existing `created_by` → display name/email resolution was found on `Project` or `ProjectDetail` — only the raw user id is present on those types. Showing "the current owner" in the modal (requirement 3) with a human-readable name likely needs either an extra lookup (e.g. matching against the already-fetched Members list, or a `userStore` lookup by id) since `ProjectsManagementFull.tsx`'s list rows do not currently resolve `created_by` to a user object anywhere in this file.
- `ProjectsManagementFull.tsx` is the list page; the Members tab (where `isCreator` is checked) lives on a different route/component (`ProjectDetailsPage.tsx` → `ProjectMembersManager.tsx`) with its own data-fetch lifecycle. There is no shared store subscription between them beyond `projectsStore`/`userStore`, so "invalidate/refetch the project list and/or project members list" (requirement 4) is two independently-triggered refreshes with no single existing hook that does both — `refreshProjects()` only refreshes the list page's own in-memory `projects` array.
- Zero existing test coverage for ownership anywhere in the repo — all new behavior (menu item, modal, store method, success/404 handling, refetch) needs tests written from scratch, raising the testing surface for this change beyond what a typical additive feature in this area would need.
- The 404-for-no-permission/not-found/user-not-active backend contract is unusual (all three cases collapse to 404) — the UI's error handling will need a generic fallback message rather than distinguishing cases, since the response shape (`{ name, created_by, message }`) suggests `message` may carry the specific reason on error paths too; this needs confirming against the actual error response shape, which is not visible from the frontend code alone.

---

## 7. Summary for Complexity Assessment

This task touches three layers: the page/UI layer (`ProjectsManagementFull.tsx`, adding a kebab-menu entry and new modal state), a new modal component (following the well-established `AddUserModal.tsx` Popup + `MultiSelect singleValue` + `userStore.searchUsers` pattern), and the store layer (`projects.ts`, needing one new method to call `PUT v1/projects/{projectName}/ownership`, mirroring `updateProject`'s shape). No router, API-wrapper, or type-system changes beyond possibly extending `Project`/`ProjectDetail` usage are required, since `created_by` already exists on both types.

Technical novelty is low: the full-platform-user-search dropdown, the Popup modal pattern, and the store-mutation-with-refetch pattern all have direct, recent precedent in this exact directory (`AddUserModal.tsx`, `ChangeProjectRolePopup.tsx`, `updateProject`). The main open questions are not "how do I build this" but two coordination details this document can't resolve from code alone: how the current owner's display name is resolved for the modal (no existing id→name lookup on the list page), and whether the Members tab needs an explicit extra refetch mechanism since it lives on a separate route from the kebab menu that triggers the action.

Test coverage posture is a real gap: nothing in the codebase references "ownership," so every behavior (menu visibility, modal interactions, success/404 paths, refetch side effects) needs new tests, but the harness for writing them (mocked `Table`, mocked router/feature-flags, store mocks, `toaster` assertions) is already established in `ProjectsManagementFull.*.test.tsx` and `AddUserModal.test.tsx`. Overall risk is low-to-moderate: well-trodden UI patterns, a backend contract already defined, but a couple of cross-page refetch and owner-display-name details that need an explicit design decision before implementation.

---

## 8. External References

None named by the task. The task's "Backend endpoint ready: PUT /v1/projects/{projectName}/ownership..." describes the contract inline rather than pointing at an external file, repo, or guide, so there was no path or URL to resolve.
