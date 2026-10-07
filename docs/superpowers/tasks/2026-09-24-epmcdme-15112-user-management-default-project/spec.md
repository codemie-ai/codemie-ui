# EPMCDME-15112 — Default Project in User Management UI: Spec

## Story

As a platform administrator in an organization where every project is a department with its own budget, I want to assign each user a default project in User Management and see it at a glance in the users list, so that I can control which project budget pays for a multi-project user's spend without leaving the admin screens.

Depends on EPMCDME-15110 (Default Project Foundation — done, backend repo `D:\Projects\codemie`): `PUT/DELETE /v1/admin/users/{user_id}/projects/{project_name}/default` endpoints gated admin-or-maintainer, `is_default` boolean already present on every `UserAssignedProject`-shaped response the frontend consumes today. Can run in parallel with EPMCDME-15111 (Budget Attribution — done, separate concern: which budget is actually charged, not this ticket's job).

## Acceptance Criteria

1. Admin/maintainer opens a user's details, views that user's projects -> each project row shows whether it is the default, and they can set any of the user's projects as the default.
2. Admin/maintainer adds a user to a project via the "add project" dialog -> can mark that project as the user's default as part of the same action.
3. Admin/maintainer views the users list, a user has a default project -> that project is marked as the default in the user's Projects cell.
4. A user has no default project -> no project in that user's Projects cell is marked as default.
5. A user without permission to manage users (auditor) -> can see default project markers but cannot change them.

## Out of Scope

- Storage, API, and role gating for the default project (EPMCDME-15110, already done).
- Everything about which budget is actually charged (EPMCDME-15111, already done).
- A separate "Default project" column in the users list — the default is marked inside the existing Projects cell.
- Letting project admins set the default project for members of their own project — only platform administrators and maintainers can.
- Letting users set their own default project in their profile.
- Offering projects the user is not a member of as default candidates.
- Bulk-setting the default project for many users at once.
- Letting a user pick the billing project per chat or per conversation in the UI.
- Showing users which project their usage is charged to outside User Management.
- Widening Users Management tab visibility beyond today's `isAdmin || isMaintainer || isAuditor` gate (see Resolved Decisions below — a genuinely plain user cannot reach this screen today, and that stays unchanged).

## Resolved Decisions

- **AC5's "auditor or a plain user"**: today's tab-visibility gate (`isAdmin || isMaintainer || isAuditor`) means a genuinely plain regular user cannot reach User Management at all. The concrete, reachable read-only case is the **auditor** role. Tab-visibility gating is untouched — AC5 is satisfied by disabling the default-toggle control (not hiding it) for any viewer where `canManageProjects` is `false`, of which auditor is the only reachable example today.
- **Default-swap visual update**: when an admin sets a new default on project B while project A was previously default, the projects table updates both rows in a single optimistic client-side update (project A's marker turns off, project B's turns on) rather than waiting for a server round-trip or re-fetch. Rolls back both rows together if the API call fails, using the existing `useOptimistic` hook's normal single-`state`-object update shape (a functional updater over the whole `projects` array needs no per-row special-casing).

## Root Cause / Current State (confirmed via codebase research)

- Users list Projects cell renders `${p.name} (${p.is_project_admin ? 'admin' : 'user'})` via `DetailsBadges`/`BadgeItem`/`DetailsBadge` (`src/pages/settings/administration/UsersManagementPage.tsx:287-306`, `src/components/details/DetailsBadges.tsx`). Single "Projects" column — no separate default column exists anywhere.
- User details projects table (`src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx`) is gated by `canManageProjects` (default `true`, callers always pass explicit value), used for the role-`Select`, "Add Project" button, and Unassign action.
- **The exact super-admin-only gate**: `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx:324` — `canManageProjects={isAdmin}`. This is the sole place in this file still using `isAdmin` alone; every sibling gate in the same file already uses `(isAdmin || isMaintainer)` (lines 71-72), and the same idiom recurs 8+ times across the codebase.
- "Add project" dialog (`.../popups/AddProjectPopup.tsx`) always adds the user as a plain member: `onAdd: (projectName: string) => void`, caller (`UserProjectsTable.handleAddProject`, line 128) always does `is_project_admin: false` then `userStore.addUserProjectAccess(user.id, projectName, false)`.
- `UserAssignedProject` (`src/types/entity/user.ts:18-22`) — `{ name, display_name?, is_project_admin }` — has no `is_default` field today, despite the backend already sending it in every `GET /v1/admin/users` and `GET /v1/admin/users/{id}` response (`ProjectInfo`/`AdminUserProject` backend models both already have `is_default: bool`).
- `userStore` (`src/store/user.ts`) has `addUserProjectAccess`/`updateUserProjectAccess`/`removeUserProjectAccess` (lines 528, 545, 562) all following the same shape: `api.<verb>(url, body?, { skipErrorHandling: true }).then(r => r.json()).then(success-toast).catch(error-toast-then-rethrow)`. No `setDefaultProject`/`clearDefaultProject` methods exist yet.

## Design

### Components

1. **Type** — `src/types/entity/user.ts`, `UserAssignedProject`: add `is_default?: boolean`.

2. **Store** — `src/store/user.ts`, add two methods following the exact existing shape:
   ```ts
   setDefaultProject(userId: string, projectName: string) {
     return api.put(`v1/admin/users/${userId}/projects/${encodeURIComponent(projectName)}/default`,
       undefined, { skipErrorHandling: true })
       .then(r => r.json())
       .then(() => toaster.info('Default project set successfully'))
       .catch(error => { toaster.error(error?.parsedError?.message || 'Failed to set default project'); throw error })
   },
   clearDefaultProject(userId: string, projectName: string) {
     return api.delete(`v1/admin/users/${userId}/projects/${encodeURIComponent(projectName)}/default`,
       undefined, { skipErrorHandling: true })
       .then(r => r.json())
       .then(() => toaster.info('Default project cleared successfully'))
       .catch(error => { toaster.error(error?.parsedError?.message || 'Failed to clear default project'); throw error })
   },
   ```
   Add both signatures to `UserStoreType`.

3. **`UserProjectsTable.tsx`** — add a "Default" column with a clickable marker/toggle per row, `disabled` (not hidden) when `!canManageProjects` (covers AC5). On click of a non-default row: one `useOptimistic` update whose functional updater maps the *entire* current `projects` array — the clicked row's `is_default` becomes `true`, every other row's becomes `false` — wrapped around the async call: `setDefaultProject(user.id, project.name)`. Clicking the *already*-default row is a no-op (no clear-via-click; there is no AC requiring "unset without replacing"). Rollback is automatic via the existing hook's error path if the API call throws.

4. **`AddProjectPopup.tsx`** — add a `Switch` (`src/components/form/Switch/Switch.tsx`) labeled "Set as default" with local `useState<boolean>`. Widen `onAdd: (projectName: string, setAsDefault: boolean) => void`.

5. **`UserProjectsTable.handleAddProject`** — after `addUserProjectAccess` resolves, if `setAsDefault` is `true`, sequentially await `setDefaultProject(user.id, projectName)` (two awaited calls, not one atomic one — matches the existing add-then-role-update pattern already used elsewhere in this file for similar two-step flows).

6. **`UserDetailsPopup.tsx:324`** — one-line gate widen: `canManageProjects={isAdmin || isMaintainer}`.

7. **`UsersManagementPage.tsx` `customRenderColumns.projects`** — when `p.is_default`, pass an `icon` to that project's `BadgeItem` (e.g. a small star/checkmark glyph already available in the icon set used elsewhere in this file — confirmed at implementation time). Existing `${name} (admin|user)` text format is unchanged; the marker is purely additive via the icon slot `DetailsBadge` already supports.

### Data Flow

`getUsers`/`getUserById` already return `is_default` per project (no fetch changes needed) → rendered as a badge icon (users list) and a toggle (details table) → user action calls one of the 2 new store methods → backend enforces "at most one default per user" atomically (DB partial unique index, EPMCDME-15110) → the optimistic client-side update (step 3 above) mirrors what the backend will confirm, so no visible flicker on success and a clean rollback on failure.

### Error Handling

Failed set-default calls roll back via the existing `useOptimistic` hook's error path (restores the prior `is_default` state across all rows in one step, since the updater covers the whole array) plus the existing `toaster.error` pattern already used by every other mutation in this file. No new error-handling pattern introduced.

### Testing

- New `UserProjectsTable.test.tsx` (currently no test file exists): default-toggle renders per row from `is_default`; toggle disabled when `canManageProjects=false` (auditor case, AC5); clicking a non-default row calls `setDefaultProject` and flips both the old and new row's marker; clicking the already-default row is a no-op; API failure rolls back the flip. Mock-store pattern mirrors `UserDetailsPopup.auditor.test.tsx`.
- New `AddProjectPopup.test.tsx` (currently no test file exists): "Set as default" switch renders unchecked by default; checking it and submitting calls `onAdd(projectName, true)`. `Switch` mock mirrors `CreateUserPopup.test.tsx`'s stub shape.
- Extend `UsersManagementSpending.integration.test.tsx`'s project fixtures with `is_default: true/false` and assert the Projects-cell badge marker renders only for the default project (AC3/AC4).
- `UserDetailsPopup.tsx`'s existing gate-widening change is covered indirectly by the new `UserProjectsTable.test.tsx` (which exercises `canManageProjects` directly) rather than a `UserDetailsPopup`-level test, since that file already stubs `UserProjectsTable` to `() => null`.

## Acceptance Criteria → Design Mapping

| AC | Covered by |
|---|---|
| 1 | `UserProjectsTable.tsx` default column/toggle |
| 2 | `AddProjectPopup.tsx` switch + `handleAddProject` chaining |
| 3 | `UsersManagementPage.tsx` Projects-cell icon marker |
| 4 | Same icon marker — absent when `is_default` is falsy |
| 5 | `UserDetailsPopup.tsx` gate widen (`isAdmin \|\| isMaintainer`) + toggle `disabled` (not hidden) when `!canManageProjects` |

## Post-analysis corrections (2026-09-25)

Details in `post-analysis-fixes.md`: add-with-default resyncs on partial failure; users-list marker has an accessible name; `clearDefaultProject` store method removed (no AC uses it).
