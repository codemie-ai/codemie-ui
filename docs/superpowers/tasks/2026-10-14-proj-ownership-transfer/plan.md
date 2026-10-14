# Project Ownership Transfer (EPMCDME-15951) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Change ownership" action to each project row's kebab menu on `/settings/administration/projects` that opens a modal to transfer `created_by` to a different platform user via `PUT v1/projects/{projectName}/ownership`.

**Architecture:** New `ChangeOwnershipModal.tsx` (Popup + MultiSelect singleValue, following `AddUserModal.tsx`) resolves the current owner's name via `userStore.getUserById` and searches the full directory via `userStore.searchUsers`. A new `projectsStore.transferOwnership(projectName, userId)` method (mirroring `updateProject`) calls the endpoint. `ProjectsManagementFull.tsx` wires menu item → modal → store call → `refreshProjects()`.

**Tech Stack:** React, TypeScript, Valtio, react-hook-form, Vitest + RTL (existing patterns only, no new deps).

**Spec:** No spec file — requirements are the inline ticket text EPMCDME-15951 (see task dispatch). Technical analysis: `docs/superpowers/tasks/2026-10-14-proj-ownership-transfer/technical-analysis.md`.

## Acceptance criteria

- [ ] A "Change ownership" entry appears in the kebab menu for a project row only when the viewer passes the same `canManageProject` gate as Edit/Delete.
- [ ] Clicking it opens a modal showing the current owner's resolved display name (via `userStore.getUserById(project.created_by)`), with a fallback shown if that lookup fails.
- [ ] The modal's new-owner picker is a single-select search over the full platform user directory (`userStore.searchUsers`), not filtered to existing project members.
- [ ] Confirm is disabled until a new owner is selected, and disabled with inline validation if the selected user is the current owner.
- [ ] Confirm calls `PUT v1/projects/{projectName}/ownership` with `{ user_id }` via a new `projectsStore` method, using the repo's existing error-handling/toast conventions (no new 404-shape parsing).
- [ ] On success, the modal closes, a success toast shows, and the projects list re-fetches so the row's owner reflects the change without a full page reload.
- [ ] No membership rows besides `created_by` are touched; no bulk transfer; no pending/accept step — the transfer is immediate.
- [ ] Cross-route Members-tab refresh is not implemented with new plumbing; the plan documents that it picks up the change on its own next fetch.

## Global Constraints

- Do not remove the previous owner or touch membership rows beyond what `{ name, created_by, message }` implies.
- No bulk transfer, no pending/accept flow — transfer is immediate on confirm.
- The new-owner search must query the full platform directory (`userStore.searchUsers`), never filtered to project members.
- No new client-side 404-shape parsing — reuse the existing `error?.parsedError?.message || error?.message || <fallback>` pattern already used in `handleModalSubmit`/`confirmDelete`.
- No cross-route cache invalidation between the list page and `ProjectMembersManager` — the Members tab lives on a separate route (`ProjectDetailsPage.tsx`) with its own `loadProject` fetch lifecycle and no shared store with the list page beyond `projectsStore`/`userStore`; it will pick up the new owner on its own next fetch (route entry re-runs `loadProject`). Document this, do not build new plumbing for it.
- Commits follow the repository's existing convention (ticket-prefixed messages); no commit commands are specified per task.

---

### Task 1: `projectsStore.transferOwnership` store method

**Files:**
- Modify: `src/store/projects.ts` — add method after `updateProject` (around line 297), and add its signature to the store's type/interface alongside `updateProject`.
- Test: `src/store/__tests__/projects.transferOwnership.test.tsx` (new)

**Interfaces:**
- Produces: `projectsStore.transferOwnership(projectName: string, userId: string): Promise<Project>` — calls `api.put(\`v1/projects/${encodeURIComponent(projectName)}/ownership\`, { user_id: userId }, { skipErrorHandling: true })`, awaits `response.json()`, finds the project in `this.projects` by `id === projectName` and replaces `created_by` with the response's `created_by` (merge like `updateProject` does, keeping `id: result.name`), returns the updated project. On error: `console.error('Projects Store Error (transferOwnership):', error); throw error`. Sets `this.loading`/`this.error` per the existing convention.

Test-first: yes — write a test asserting `transferOwnership('proj-a', 'user-123')` calls `api.put` with the exact URL/body, updates `this.projects[i].created_by`, and that a thrown/rejected `api.put` propagates (store doesn't swallow it) before writing the method.

- [ ] Step 1: Write failing tests in `projects.transferOwnership.test.tsx`: (a) success path — mock `api.put` to resolve with `{ name: 'proj-a', created_by: 'user-123', message: 'ok' }`, seed `projectsStore.projects` with an entry `{ id: 'proj-a', name: 'proj-a', created_by: 'old-user' }`, call `transferOwnership`, assert the call args and that `projectsStore.projects[0].created_by === 'user-123'`; (b) error path — mock `api.put` to reject, assert the call rejects and `projectsStore.projects[0].created_by` is unchanged.
- [ ] Step 2: Run `npx vitest run --project unit src/store/__tests__/projects.transferOwnership.test.tsx` — expect FAIL (`transferOwnership is not a function`).
- [ ] Step 3: Implement `transferOwnership` in `src/store/projects.ts` as specified above.
- [ ] Step 4: Run the same test command — expect PASS.

---

### Task 2: `ChangeOwnershipModal` component

**Files:**
- Create: `src/pages/settings/administration/components/projectsManagement/ChangeOwnershipModal.tsx`
- Test: `src/pages/settings/administration/components/projectsManagement/__tests__/ChangeOwnershipModal.test.tsx` (new)

**Interfaces:**
- Consumes: `userStore.getUserById(userId: string): Promise<UserListItem>`, `userStore.searchUsers(query, perPage): Promise<UserListItem[]>` (both existing, `src/store/user.ts:459` and `:264`). `Popup` (`src/components/Popup`), `MultiSelect` (`src/components/form/MultiSelect`), `useDebouncedApply` (`src/hooks/useDebounceApply`) — same imports as `AddUserModal.tsx`.
- Produces: `interface ChangeOwnershipModalProps { visible: boolean; onHide: () => void; currentOwnerId: string | null | undefined; onSubmit: (newOwnerId: string) => Promise<void> }`, default export `ChangeOwnershipModal`.

Behavior: on `visible` becoming true, fetch `userStore.getUserById(currentOwnerId)` into local state to render "Current owner: {name} ({email})"; on fetch failure, render "Current owner: Unknown (id: {currentOwnerId})" instead of blocking the modal. Below it, a `MultiSelect singleValue` wired to `userStore.searchUsers` exactly as in `AddUserModal.tsx:81-130` (debounced, request-id guarded) — no project-membership filtering. Local validation: if the selected user id equals `currentOwnerId`, show inline error "This user is already the project owner" under the select and keep Confirm disabled; Confirm (`submitDisabled`) is also disabled while no user is selected or while submitting. `handleFormSubmit` calls `onSubmit(selectedUserId)` then resets local state (mirroring `AddUserModal`'s `resetFormState`).

Test-first: yes — modal does not exist yet, so every assertion below starts failing.

- [ ] Step 1: Write failing tests in `ChangeOwnershipModal.test.tsx`: (a) renders current owner name once `userStore.getUserById` resolves; (b) renders a fallback string when `getUserById` rejects; (c) Confirm button is disabled with no selection; (d) selecting a user via the mocked `MultiSelect`/`onFilter` → `userStore.searchUsers` flow enables Confirm and calls `onSubmit` with the selected id on submit; (e) selecting the same id as `currentOwnerId` shows the inline "already the project owner" message and keeps Confirm disabled. Mock `@/store/user` and `@/components/form/MultiSelect` the same way `AddUserModal.test.tsx` does.
- [ ] Step 2: Run `npx vitest run --project unit src/pages/settings/administration/components/projectsManagement/__tests__/ChangeOwnershipModal.test.tsx` — expect FAIL (module not found).
- [ ] Step 3: Implement `ChangeOwnershipModal.tsx` per the behavior above, copying the `Popup`/`MultiSelect`/debounce wiring structure from `AddUserModal.tsx:52-199` and adapting the current-owner fetch and same-owner guard.
- [ ] Step 4: Run the same test command — expect PASS.

---

### Task 3: Wire the "Change ownership" menu item and submit flow into `ProjectsManagementFull.tsx`

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` — import `ChangeOwnershipModal`; add `const [transferringProject, setTransferringProject] = useState<Project | null>(null)` near the other modal-state declarations (alongside `editingProject`/`deletingProject`); add `handleChangeOwnership(project)` (sets `transferringProject`) alongside `handleEditProject`/`handleDeleteProject` (`:385-392`); add a `menuItems.push({ title: 'Change ownership', onClick: () => handleChangeOwnership(item) })` inside the existing `if (canManage) { ... }` block (`:511-538`), after the `Edit` push and before the `Delete` push; add `handleConfirmOwnershipTransfer(newOwnerId: string)` next to `handleModalSubmit` (`:434-461`) that calls `await projectsStore.transferOwnership(transferringProject.id, newOwnerId)`, shows `toaster.info(result.message || 'Ownership transferred successfully')`, clears `transferringProject`, and calls `refreshProjects()`; on error, same `error?.parsedError?.message || error?.message || 'Failed to transfer ownership'` toast pattern as `handleModalSubmit`'s catch; render `<ChangeOwnershipModal visible={!!transferringProject} currentOwnerId={transferringProject?.created_by} onHide={() => setTransferringProject(null)} onSubmit={handleConfirmOwnershipTransfer} />` next to the existing `<ProjectModal .../>`/`<ConfirmationModal .../>` renders.
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.ownershipTransfer.test.tsx` (new, modeled on `ProjectsManagementFull.editFlow.test.tsx`)

**Interfaces:**
- Consumes: `ChangeOwnershipModal` (Task 2), `projectsStore.transferOwnership` (Task 1).

Test-first: yes — the menu item, state, and handler don't exist yet.

- [ ] Step 1: Write failing tests in `ProjectsManagementFull.ownershipTransfer.test.tsx`, reusing the mock setup from `editFlow.test.tsx` (`:16-90`: mocked router/feature-flags/`SettingsLayout`/`Table`/`NavigationMore`) plus a mock of `ChangeOwnershipModal` capturing its props: (a) "Change ownership" appears in the menu for a project where `canManageProject` is true, and is absent when false; (b) clicking it renders `ChangeOwnershipModal` with `visible=true` and `currentOwnerId` equal to that row's `created_by`; (c) invoking the captured `onSubmit` calls `projectsStore.transferOwnership(project.id, newOwnerId)`, shows a success toast, closes the modal (`visible` becomes false on next render), and triggers a projects reload (assert `projectsStore.indexProjects` — the function `loadProjects` delegates to — is called again); (d) a rejected `transferOwnership` call shows an error toast and leaves the modal open.
- [ ] Step 2: Run `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.ownershipTransfer.test.tsx` — expect FAIL ("Change ownership" not found / modal not rendered).
- [ ] Step 3: Implement the wiring described above in `ProjectsManagementFull.tsx`.
- [ ] Step 4: Run the same test command — expect PASS.

---

## Notes carried from requirements (non-tasks)

- Members-tab refresh: `ProjectMembersManager`/`ProjectDetailsPage.tsx` is a separate route with its own `loadProject` fetch; this plan does not add cross-route invalidation. The new owner (and the project-admin membership the backend auto-grants) appears there on the Members tab's own next fetch (route entry/navigation), consistent with the "no new plumbing" constraint.
- No task removes the previous owner, alters other membership rows, or adds a pending/accept step — the modal performs a single immediate PUT on confirm.
