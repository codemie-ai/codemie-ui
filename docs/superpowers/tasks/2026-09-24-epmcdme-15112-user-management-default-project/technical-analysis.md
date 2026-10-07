# Technical Research

**Task**: user management default project admin permissions frontend
**Generated**: 2026-09-24
**Research path**: filesystem (codegraph unavailable)

---

## 1. Original Context

EPMCDME-15112 (Default Project in User Management UI) - sub-task of parent EPMCDME-15109, depends on EPMCDME-15110 (Default Project Foundation, done in backend repo D:\Projects\codemie: PUT/DELETE /v1/admin/users/{user_id}/projects/{project_name}/default endpoints gated admin-or-maintainer, is_default flag on user-project membership). Can run in parallel with EPMCDME-15111 (Budget Attribution, also done).

Context: User Management (Settings -> Administration -> Users, behind features:userManagement flag) shows a users list with a Projects cell listing each project as "name (admin|user)"; a user details panel with a per-user projects table (role selector, remove action) and an "Add project" dialog that always adds the user as a plain member; and bulk assign/unassign actions. The list is paginated and filterable by project. Role gating differs between layers: the backend's user-project endpoints accept administrator or maintainer, while the details panel currently allows project management for super admins only - the UI has to widen to match the backend. There is no notion of a user's default project in the product today. currentProject already exists on the frontend user entity but is never populated - a natural place to surface the default project. The default is marked inside the existing Projects cell of the users list; no new column is added.

Story: As a platform administrator in an organization where every project is a department with its own budget, I want to assign each user a default project in User Management and see it at a glance in the users list so that I can control which project budget pays for a multi-project user's spend without leaving the admin screens.

Acceptance Criteria: (1) admin/maintainer opens a user's details, views projects -> each project row shows whether it is the default, can set any project as default. (2) admin/maintainer uses the "add project" dialog -> can mark that project as default as part of the same action. (3) admin/maintainer views users list, user has default -> that project marked as default in the Projects cell. (4) user has no default -> no project marked as default in Projects cell. (5) user without manage-users permission (auditor/plain user) -> sees default markers but cannot change them.

Out of scope: backend storage/API/role-gating (EPMCDME-15110, done); billing attribution (EPMCDME-15111, done); separate "Default project" column (marked inside existing Projects cell); project admins setting default for their own project's members (only platform admins/maintainers); users setting their own default in profile; offering non-member projects as default candidates; bulk-setting defaults; per-chat/conversation project picker; showing users their billing project outside User Management.

---

## 2. Codebase Findings

### Existing Implementations

**Users list Projects cell** (AC3/AC4 surface):
- `src/pages/settings/administration/UsersManagementPage.tsx` — `customRenderColumns.projects` (lines 287-306) renders each project as a `BadgeItem` via `DetailsBadges` (`src/components/details/DetailsBadges.tsx`): `${p.name} (${p.is_project_admin ? 'admin' : 'user'})`. Single "Projects" column (`BASE_COLUMN_DEFINITIONS`, line 69) — confirmed no separate default column exists anywhere. `DetailsBadge` accepts an `icon` prop — the natural extension point to mark a badge as default, rather than appending more text to `value`. This is the ONLY place rendering `${name} (admin|user)` (no duplicate elsewhere).

**User details panel — per-user projects table** (AC1 surface):
- `src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx` — props `{ user, onProjectsChange?, canManageProjects? }` (default `true`, callers always pass explicit value). Uses `useOptimistic(user.projects)` (`src/hooks/useOptimistic.ts`) for optimistic add/remove/role-change with rollback. Columns: `project` (name), `admin` (role `Select`, editable only when `canManageProjects`), `actions` (Unassign button or `-`). Calls `userStore.addUserProjectAccess/updateUserProjectAccess/removeUserProjectAccess`. "Add Project" button + `AddProjectPopup` only rendered `{canManageProjects && ...}`.

**The exact "super-admins-only" gate** (AC1/AC5 surface, the widening the ticket calls for):
- `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx:324`: `<UserProjectsTable ... canManageProjects={isAdmin} />`. `isAdmin` computed at line 67 from `useSnapshot(userStore).user`; `isMaintainer` (line 68) is already computed in the SAME file and already used for sibling gates in the SAME component (`canManageBudgets = isBudgetManagementEnabled && (isAdmin || isMaintainer)` line 71, `canEditPlatformRoles` line 72). **The fix is a one-line change**: `canManageProjects={isAdmin || isMaintainer}` — this is the sole outlier in the file still using `isAdmin` alone; everything else already uses the `(isAdmin || isMaintainer)` idiom.

**"Add project" dialog** (AC2 surface):
- `src/pages/settings/administration/usersManagement/components/popups/AddProjectPopup.tsx` — props `{ isOpen, onClose, onAdd: (projectName: string) => void }`. Plain `useState<string>` for `selectedProject`, single `ProjectSelector` (`multiple={false}`), no react-hook-form. Caller (`UserProjectsTable.handleAddProject`, line 128) always constructs `{ name: projectName, is_project_admin: false }` and calls `userStore.addUserProjectAccess(user.id, projectName, false)` — confirms "always adds as plain member" exactly. To extend: add a `useState<boolean>` for `setAsDefault` + a `Switch` (`src/components/form/Switch/Switch.tsx`, props `{ label, value, onChange, disabled?, id? }`) in the popup body; widen `onAdd` to `(projectName: string, setAsDefault: boolean) => void`; `handleAddProject` chains a `userStore.setDefaultProject(user.id, projectName)` call after `addUserProjectAccess` resolves, when the checkbox was checked.
- Richer template available if needed: `bulkPopups/AssignToProjectPopup.tsx` (react-hook-form + yup + `ProjectRoleSelector` via `Controller`) — out of scope (bulk), just a reference pattern.

**Frontend user entity — `currentProject`** (mentioned in ticket, confirmed a dead end):
- `src/types/entity/user.ts:36` — `User.currentProject?: string` declared but confirmed **unreferenced anywhere else in `src/`** (no reads/writes). Never set in `userStore.loadUser()` or `.getCurrentUser()` (`src/store/user.ts:132-196`), both of which build `User` field-by-field from `GET v1/user` and simply omit it. **Not the right extension point** — it's on the wrong entity (`User` = the current logged-in user; this ticket is about OTHER users' per-membership defaults, which belong on `UserAssignedProject`, not `User`).
- `UserAssignedProject` (same file, lines 18-22) — the actual per-membership shape used everywhere relevant (`UserListItem.projects`, `UserProjectsTable`, `AddProjectPopup`, the users-list Projects cell): `{ name: string, display_name?: string | null, is_project_admin: boolean }`. **Has no `is_default` field today — must be extended**: `is_default?: boolean`.

**API client / service layer** (backing all 3 UI surfaces):
- `src/store/user.ts` (Valtio `userStore`). Existing CRUD pattern to mirror exactly:
  ```ts
  addUserProjectAccess(userId, projectName, isProjectAdmin) {       // line 528
    return api.post(`v1/admin/users/${userId}/projects`,
      { project_name: projectName, is_project_admin: isProjectAdmin },
      { skipErrorHandling: true })
      .then(r => r.json()).then(() => toaster.info('Project access added successfully'))
      .catch(error => { toaster.error('Failed to add project access'); throw error })
  },
  ```
  (`updateUserProjectAccess` line 545, `removeUserProjectAccess` line 562 follow the identical shape.)
- New calls needed, same pattern, hitting EPMCDME-15110's endpoints:
  ```ts
  setDefaultProject(userId, projectName) {
    return api.put(`v1/admin/users/${userId}/projects/${encodeURIComponent(projectName)}/default`,
      undefined, { skipErrorHandling: true })
      .then(r => r.json()).then(() => toaster.info('Default project set successfully'))
      .catch(error => { toaster.error(error?.parsedError?.message || 'Failed to set default project'); throw error })
  },
  clearDefaultProject(userId, projectName) {
    return api.delete(`v1/admin/users/${userId}/projects/${encodeURIComponent(projectName)}/default`,
      undefined, { skipErrorHandling: true })
      .then(r => r.json()).then(() => toaster.info('Default project cleared successfully'))
      .catch(error => { toaster.error(error?.parsedError?.message || 'Failed to clear default project'); throw error })
  },
  ```
  Add both to the `UserStoreType` interface (near lines 98-103).
- `getUserById(userId)` (line 458) and `getUsers(...)` (line 416) already return `.projects[].is_default` from the backend (see below) — **no new GET call needed**, only the type needs to declare the field that's already arriving in every response.

### Architecture and Layers Affected

- **Presentation/component layer**: `UsersManagementPage.tsx` (Projects cell), `UserProjectsTable.tsx` (details table + gate), `AddProjectPopup.tsx` (dialog), `UserDetailsPopup.tsx` (gate wiring).
- **Type layer**: `src/types/entity/user.ts` (`UserAssignedProject.is_default`).
- **State/service layer**: `src/store/user.ts` (`userStore.setDefaultProject/clearDefaultProject`).
- No routing, no new pages, no backend changes (already done), no new feature flag.

### Integration Points

- `UsersManagementPage.tsx` → `UserDetailsPopup.tsx` → `UserProjectsTable.tsx` → `AddProjectPopup.tsx` (component tree).
- `UserProjectsTable.tsx` / `AddProjectPopup.tsx` (via `UserProjectsTable.handleAddProject`) → `store/user.ts` → backend `PUT/DELETE /v1/admin/users/{user_id}/projects/{project_name}/default` (EPMCDME-15110, already live).
- `UsersManagementPage.tsx` → `store/user.ts` (`getUsers`) → `components/details/DetailsBadges.tsx`.

**Backend cross-reference (read-only confirmation, EPMCDME-15110 already done)**:
- `src/codemie/rest_api/routers/user_management_router.py`: `set_default_project` (line 355) and `clear_default_project` (line 372), both gated `Depends(admin_access_only)` — and `admin_access_only` (`security/authentication.py:180`) actually checks `is_admin_or_maintainer` despite the name and several stale "SuperAdmin only" docstrings elsewhere in the same router (lines 294, 311, 331, 347). **This is the authoritative confirmation of the ticket's premise**: the backend is already admin-or-maintainer for all of add/update/remove/set-default/clear-default; only the frontend needs to widen from super-admin-only.
- `src/codemie/rest_api/models/user_management.py`: `ProjectInfo` (line 253) and `AdminUserProject` (line 317) both already have `is_default: bool = False`, backing both `GET /v1/admin/users/{id}` and `GET /v1/admin/users` (list). **The flag is already in every response the frontend consumes today** — this ticket is a pure read/declare/render/wire task on the frontend, no new backend call needed beyond the two new PUT/DELETE.
- DB-level "at most one default per user" is enforced by a partial unique index (`bf3cb9db22b7` migration) — the frontend does not need to defensively clear other rows; the backend's `set_default_project` does that atomically.

### Patterns and Conventions

- Permission gates are local `const` booleans per component, derived from `useSnapshot(userStore).user`, combined with `||` — never a shared helper/hook. The `(isAdmin || isMaintainer)` idiom recurs 8+ times across the codebase (`pages/settings/tabs.tsx:131,143`, `SettingsLayout.tsx:44`, `UsersManagementPage.tsx:84-86`, `UserDetailsPopup.tsx:71-72`, `ProjectDetailsPage.tsx:101`, `BudgetsManagementPage.tsx:112`, `AnalyticsFilters.tsx:55`) — `UserDetailsPopup.tsx:324`'s `canManageProjects={isAdmin}` is the sole outlier still using `isAdmin` alone.
- Valtio store methods always follow: `api.<verb>(url, body?, { skipErrorHandling: true }).then(r => r.json()).then(success-toast).catch(error-toast-then-rethrow)`.
- List/table cell customization goes through a `customRenderColumns` map keyed by column `key`, not per-row components.
- Optimistic UI updates for row-level project mutations go through `useOptimistic` with rollback on error.
- Popups are simple controlled `{isOpen, onClose, onX}` components wrapping the shared `Popup` component — `AddProjectPopup` uses raw `useState` (simple case); more complex popups (`AssignToProjectPopup`) use react-hook-form + yup.
- Feature flag: `FEATURE_FLAGS.USER_MANAGEMENT = 'features:userManagement'` (`src/constants/featureFlags.ts:21`) already gates the whole Users Management tab — no new flag needed, ships inside the existing gated surface.

---

## 3. Documentation Findings

### Guides and Architecture Docs

Per this repo's own `AGENTS.md` task-routing table, directly relevant guides (not all read in full during filesystem research — load before implementing): `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/patterns/form-patterns.md`, `.ai-run/guides/patterns/modal-patterns.md`, `.ai-run/guides/development/api-integration.md`. `.ai-run/guides/testing/testing-patterns.md` was read in full (see Section 4).

### Architectural Decisions

No ADR files found specific to this feature on the frontend side. Backend migration files (`bf3cb9db22b7`, `d2c276d4390e`) carry inline design rationale for the `is_default` semantics the frontend now consumes (informational only, backend is out of scope/done).

### Derived Conventions

See "Patterns and Conventions" above — all derived from code, no dedicated ADR.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.auditor.test.tsx` — unit test, direct template for role-flag-driven conditional rendering/disabling (exactly the shape AC5's "read-only for auditor" needs). Note: this file stubs `UserProjectsTable` to `() => null`, so it does NOT exercise the widened gate itself — a new dedicated test is needed for that.
- `src/pages/settings/administration/usersManagement/components/popups/__tests__/CreateUserPopup.test.tsx` — unit test, shows the exact `vi.mock('@/components/form/Switch', ...)` stub shape (fake `data-testid="switch-<id>"` checkbox) — direct template for testing `AddProjectPopup`'s new "set as default" `Switch`.
- `src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx` — integration test with a `projects: [{ name: 'project-6', is_project_admin: false }]` fixture — needs `is_default` added once the type changes; template for asserting Projects-cell badge rendering.
- `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` — integration pagination pattern for the same table.

### Testing Framework and Patterns

Vitest 1.6.1 + React Testing Library + `@testing-library/user-event`. Two vitest workspace "projects": `unit` (`*.test.tsx`, mocks `@/utils/api` and `useSnapshot` automatically via `setupTests.unit.ts`) and `integration` (`*.integration.test.tsx`, real Valtio reactivity, `mockAPI`/`renderPage`/`navigate` helpers from `@/test-utils/integration`). Conventions: `vi.hoisted()` for mock store objects referenced inside `vi.mock()` factories; module-level `vi.mock()` only (never inside `describe`/`it`); AAA structure; role-based queries preferred (`getByRole`/`findByRole`), `getByTestId` as last resort for stubbed components. Full authoritative reference: `.ai-run/guides/testing/testing-patterns.md` (has the exact `mockAPI` matching-rule table and DO/DON'T table) — load verbatim before writing tests.

### Coverage Gaps

- No existing test file for `UserProjectsTable.tsx` at all — the `canManageProjects` prop (including the widened gate and the new default-column rendering/interaction) is currently untested at the component level.
- No existing test file for `AddProjectPopup.tsx` at all — greenfield for the new "set as default" checkbox.
- No test anywhere currently exercises `is_default`/default-project rendering (confirmed via grep — only the dead `currentProject` declaration and unrelated `isDefault`-named hits in LLM "default model" selector code, a different feature entirely).

---

## 5. Configuration and Environment

### Environment Variables

None specific to this feature found.

### Configuration Files

None beyond the feature flag constant (`src/constants/featureFlags.ts`).

### Feature Flags and Deployment Concerns

`features:userManagement` (existing) already gates the whole surface via `useUserManagementEnabled()` (`src/hooks/useFeatureFlags.ts:92`) and `getNavigationTabs()` (`pages/settings/tabs.tsx:117-152`, tab shown to `isAdmin || isMaintainer || isAuditor`). No new flag needed. Purely a UI change consuming already-deployed backend endpoints.

---

## 6. Risk Indicators

- **AC5 wording ambiguity**: the ticket says "a user without permission to manage users (for example an auditor or a plain user)" — but today's tab-visibility gate (`isAdmin || isMaintainer || isAuditor`) means a genuinely plain regular user cannot reach the Users Management screen at all. The concrete, reachable read-only case today is the **auditor** role (visible tab, `canManageProjects=false`). This needs a decision at spec time: is "plain user" in the AC just loose wording for "non-admin/maintainer", or does it imply a reachability change out of this ticket's scope? Recommend treating "auditor" as the concrete AC5 case and not touching tab-visibility gating (out of scope per ticket's own list — it doesn't mention tab visibility).
- **`UserAssignedProject.is_default` type gap**: currently absent from the frontend type despite the backend already sending it — a type-only change with no API-shape risk, but must be added consistently everywhere `UserAssignedProject` is constructed/mocked (test fixtures too).
- **No existing tests for the two components most central to this ticket** (`UserProjectsTable.tsx`, `AddProjectPopup.tsx`) — all new coverage is greenfield, higher care needed to get the mock shapes right (per the `UserDetailsPopup.auditor.test.tsx` / `CreateUserPopup.test.tsx` templates).
- **Optimistic-update rollback interacts with the new default-toggle**: `UserProjectsTable` already uses `useOptimistic` for add/remove/role-change; setting/clearing a default should follow the same optimistic-then-rollback-on-error shape for consistency, but doing so needs care since "set default" also implicitly un-defaults whichever OTHER row was previously default (a two-row visual update, not a one-row one) — worth an explicit design decision on whether the UI eagerly flips the old default row locally or waits for a re-fetch.
- **`DetailsBadges`/`DetailsBadge` icon prop** is confirmed to exist but its exact rendering (size, tooltip behavior) wasn't fully read in this research pass — a quick read at plan time before deciding icon vs. text-suffix for the marker.

---

## 7. Summary for Complexity Assessment

This is a self-contained frontend-only ticket touching 4 files in one feature area (Users Management admin screens): a one-line permission-gate widen (`UserDetailsPopup.tsx`), a type addition (`user.ts`), two new store methods following an exact existing pattern (`store/user.ts`), and three component changes (Projects-cell badge marker, projects-table default toggle, add-dialog default checkbox). No backend work, no new API shape to design (the field already arrives in every response), no new routing, no new feature flag. All three UI touch points already exist and follow strong, consistent, well-documented local patterns (badge rendering, Valtio CRUD, controlled popups) — technical novelty is low.

The main real risk is test coverage: the two most central components (`UserProjectsTable.tsx`, `AddProjectPopup.tsx`) have zero existing tests, so all new coverage is greenfield rather than extension, and the optimistic-update rollback shape for a "moves the default from one row to another" mutation needs a deliberate design decision rather than a mechanical copy of the existing single-row add/remove/role-change pattern. AC5's wording carries a minor requirements-clarity ambiguity (auditor vs. literal "plain user") that should be resolved at spec/brainstorming time, not guessed at during implementation.
