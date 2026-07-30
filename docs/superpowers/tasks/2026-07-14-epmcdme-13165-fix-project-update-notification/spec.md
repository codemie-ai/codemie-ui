# Spec: Fix project update success notification — EPMCDME-13165

## Problem

When a project is updated, the success toast fails to name the project. Two surfaces are affected:

**Project details page** (`Profile > Settings > Project Management > <project>`) — the toast reads `Project undefined updated successfully`.

Root cause: `ProjectDetailsPage.tsx:111` interpolates `payload.name` into the toast string. `ProjectModal` deliberately sets `payload.name = undefined` whenever `project.user_count > 0` (the `isNameDisabled` guard), so any project with at least one user triggers the bug. The correct value — `updatedProject.name`, returned by `projectsStore.updateProject` two lines earlier — is already in scope and always a non-empty string.

A latent identical bug exists on line 121: the router redirect after a rename passes `payload.name` as the route param. That branch is unreachable when `isNameDisabled` is true, but the code is defensively wrong and must be corrected in the same change.

**Projects management list page** (`Profile > Settings > Project Management`) — editing a project from the list shows `Project updated successfully` with no name at all.

Root cause: `ProjectsManagementFull.tsx:392` uses a hardcoded string that never carried the project name. The same `updatedProject` value is available from the `projectsStore.updateProject` call on the line above.

## Solution

Interpolate `updatedProject.name` — the value returned by `projectsStore.updateProject` — into the toast on both surfaces. This is consistent with `ProjectDetailsPage.tsx:114–115`, which already uses `updatedProject.name` for display-name cache invalidation.

### Source change — `ProjectDetailsPage.tsx`

| Line | Before | After |
|------|--------|-------|
| 111 | `toaster.info(\`Project ${payload.name} updated successfully\`)` | `toaster.info(\`Project ${updatedProject.name} updated successfully\`)` |
| 121 | `params: { projectName: payload.name }` | `params: { projectName: updatedProject.name }` |

### Source change — `ProjectsManagementFull.tsx`

| Line | Before | After |
|------|--------|-------|
| 391 | `await projectsStore.updateProject(editingProject.id, data)` | `const updatedProject = await projectsStore.updateProject(editingProject.id, data)` |
| 392 | `toaster.info('Project updated successfully')` | `toaster.info(\`Project ${updatedProject.name} updated successfully\`)` |

No other files change.

### Regression test — `ProjectDetailsPage.test.tsx`

Add one test case to the existing `describe('ProjectDetailsPage')` block:

**Name**: `'shows the project name in the success toast when name is omitted from the payload (EPMCDME-13165)'`

**Setup**: reuse existing mocks (`toaster.info: vi.fn()`, `updateProject` mock returning `mockProject`).

**Action**: call `onSubmit` with `name: undefined` (simulating the `isNameDisabled=true` path that `ProjectModal` uses for projects with users).

**Assertion**: `toaster.info` was called with a string containing `mockProject.name` (`'Test Project'`).

### Regression test — `ProjectsManagementFull.editFlow.test.tsx`

Add one test case to the existing `describe('ProjectsManagementFull — edit save flow')` block:

**Name**: `'shows the project name in the success toast when name is omitted from the payload (EPMCDME-13165)'`

**Setup**: reuse existing mocks; import the mocked `toaster` and clear `toaster.info` in `beforeEach`.

**Action**: open the edit modal and call `onSubmit` with `name: undefined`.

**Assertion**: `toaster.info` was called with exactly `Project my-project updated successfully`.

## Acceptance criteria

- The success notification displays the actual updated project name on both the project details page and the projects list page.
- The notification never displays `undefined` or omits the name for valid project updates.
- The name in the notification matches the project being edited.
- Behaviour is consistent after page refresh and repeated updates.
- No regression for project creation, deletion, or other Project Management notifications.

## Out of scope

- `ProjectModal.tsx` — the `isNameDisabled` logic is correct by design.
- The `Project created successfully` toast on the list page — creation was not reported as defective.
- `projectDisplayNamesStore.invalidate(editingProject.id)` on the list page — cache-key semantics on rename are a separate concern.
- Store, API call, error path, or any other notification.
