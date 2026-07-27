# Spec: Fix project update success notification — EPMCDME-13165

## Problem

When a project is updated in **Profile > Settings > Project Management**, the success toast reads `Project undefined updated successfully` instead of showing the project's name.

Root cause: `ProjectDetailsPage.tsx:111` interpolates `payload.name` into the toast string. `ProjectModal` deliberately sets `payload.name = undefined` whenever `project.user_count > 0` (the `isNameDisabled` guard), so any project with at least one user triggers the bug. The correct value — `updatedProject.name`, returned by `projectsStore.updateProject` two lines earlier — is already in scope and always a non-empty string.

A latent identical bug exists on line 121: the router redirect after a rename passes `payload.name` as the route param. That branch is unreachable when `isNameDisabled` is true, but the code is defensively wrong and must be corrected in the same change.

## Solution

Replace `payload.name` with `updatedProject.name` in both locations. This is consistent with lines 114–115, which already use `updatedProject.name` for display-name cache invalidation.

### Source change — `ProjectDetailsPage.tsx`

| Line | Before | After |
|------|--------|-------|
| 111 | `toaster.info(\`Project ${payload.name} updated successfully\`)` | `toaster.info(\`Project ${updatedProject.name} updated successfully\`)` |
| 121 | `params: { projectName: payload.name }` | `params: { projectName: updatedProject.name }` |

No other files change.

### Regression test — `ProjectDetailsPage.test.tsx`

Add one test case to the existing `describe('ProjectDetailsPage')` block:

**Name**: `'shows the project name in the success toast when name is omitted from the payload (EPMCDME-13165)'`

**Setup**: reuse existing mocks (`toaster.info: vi.fn()`, `updateProject` mock returning `mockProject`).

**Action**: call `onSubmit` with `name: undefined` (simulating the `isNameDisabled=true` path that `ProjectModal` uses for projects with users).

**Assertion**: `toaster.info` was called with a string containing `mockProject.name` (`'Test Project'`).

## Acceptance criteria

- The success notification displays the actual updated project name.
- The notification never displays `undefined` for valid project updates.
- The name in the notification matches the project being edited.
- Behaviour is consistent after page refresh and repeated updates.
- No regression for project creation, deletion, or other Project Management notifications.

## Out of scope

- `ProjectModal.tsx` — the `isNameDisabled` logic is correct by design.
- `ProjectsManagementFull.tsx:399` — uses a hardcoded string, unaffected.
- Store, API call, error path, or any other notification.
