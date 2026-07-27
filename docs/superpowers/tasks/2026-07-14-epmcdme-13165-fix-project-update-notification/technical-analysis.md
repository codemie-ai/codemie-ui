# Technical Research

**Task**: project-management settings notification success-message
**Generated**: 2026-07-14T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-13165 — Project Management: project update success message shows 'Project undefined updated successfully'. When a project is updated in the Project Management section (Profile > Settings > Project Management), the success notification displays 'Project undefined updated successfully' instead of showing the actual project name. The variable passed to the notification message is resolving as 'undefined' instead of the project name string. Acceptance criteria: the success notification displays the actual updated project name, does not show 'undefined', matches the project being edited, and is consistent after page refresh and repeated updates.

---

## 2. Codebase Findings

### Existing Implementations

- `/Users/kyrylo_korotych/codemie-ui/src/pages/settings/administration/ProjectDetailsPage.tsx`
  — The detail/edit page for a single project. Contains `handleSaveProject` (line 98), which calls `projectsStore.updateProject` and then fires the toast. **Line 111 is the exact location of the bug**: `toaster.info(\`Project ${payload.name} updated successfully\`)`.

- `/Users/kyrylo_korotych/codemie-ui/src/pages/settings/administration/projectsManagement/ProjectModal.tsx`
  — The edit form rendered inside `ProjectDetailsPage`. Line 75: `const isNameDisabled = (project?.user_count ?? 0) > 0`. Line 137: `name: isNameDisabled ? undefined : data.name`. When any user is assigned to the project (the normal production state), `name` is set to `undefined` in the submitted payload.

- `/Users/kyrylo_korotych/codemie-ui/src/store/projects.ts`
  — Valtio proxy store. `updateProject(id, data)` calls `PATCH v1/projects/:id`, maps `id = result.name`, and returns the full `Project` object. The return value is captured in `ProjectDetailsPage` as `const updatedProject = await projectsStore.updateProject(...)` (line 102). `updatedProject.name` is always a string.

- `/Users/kyrylo_korotych/codemie-ui/src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx`
  — The project list/table view. Line 399: `toaster.info('Project updated successfully')` — hardcoded without interpolation, so **not affected by this bug**.

- `/Users/kyrylo_korotych/codemie-ui/src/types/entity/project.ts`
  — `Project` interface. Key fields: `id: string`, `name: string` (always present), `display_name?: string | null` (optional human-readable label). There is no `projectName` field.

### Architecture and Layers Affected

- **UI / Page layer** — `ProjectDetailsPage.tsx`: contains the buggy toast call and the `handleSaveProject` handler. This is the only layer that needs to change.
- **UI / Modal/Form layer** — `ProjectModal.tsx`: intentionally omits `name` from the payload when the project has users. This behavior is correct by design; the bug is in the consumer of the payload.
- **State / Store layer** — `projectsStore` (Valtio): returns a complete `Project` from the API; already provides the correct name via `updatedProject.name`. No store changes required.

### Integration Points

- `projectsStore.updateProject` → `PATCH v1/projects/:id` — returns `Project` with `name: string` guaranteed.
- `projectDisplayNamesStore.invalidate` — called immediately after the toast; uses `project.name` and `updatedProject.name` correctly (lines 114–115), showing the correct pattern is already in use two lines below the bug.
- `userStore.getCurrentUser` — called after update to refresh user context.
- `toaster` utility (`/Users/kyrylo_korotych/codemie-ui/src/utils/toaster`) — simple info/error wrapper; already mocked in the test suite.

### Patterns and Conventions

- Toaster is imported as a default import (`import toaster from '@/utils/toaster'`) and called as `toaster.info(...)` / `toaster.error(...)`.
- The `ProjectFormData` type has `name?: string` (optional). Consumers must not interpolate it directly into strings without a fallback.
- The correct source for the project name after an update is `updatedProject.name` (API response, always `string`) or `project.name` (pre-update component state, always `string`).
- The codebase uses **Valtio** (`proxy` + `useSnapshot`) for store state management — no Redux, no React Query.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The `.ai-run/guides/` directory contains guides for the backend repository. This is a React/TypeScript frontend codebase (`codemie-ui`); the guides cover backend patterns (FastAPI, SQLModel, LangChain) and do not directly describe frontend notification or form-submission conventions.

### Architectural Decisions

No ADR or inline `DECISION:` marker was found for the toast notification pattern in the settings pages. The pattern in use — calling `toaster.info(...)` in a `try/catch` after an async store action — is consistent across the settings administration pages.

### Derived Conventions

- The `isNameDisabled` flag intentionally omits `name` from the patch payload when a project has users (to prevent inadvertent renames). This means `payload.name` is architecturally optional and must never be assumed to be set.
- Line 114–115 of `ProjectDetailsPage.tsx` already use `project.name` and `updatedProject.name` correctly for cache invalidation — the same pattern should be applied to the toast on line 111.
- The router redirect on line 121 also uses `payload.name` (`params: { projectName: payload.name }`). This path is only reachable when `updatedProject.name !== project.name`, which is impossible when `isNameDisabled` is true (name cannot change). It is a latent bug that is not currently triggered but should be corrected for safety.

---

## 4. Testing Landscape

### Existing Coverage

- `/Users/kyrylo_korotych/codemie-ui/src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`
  — Vitest + React Testing Library. Tests: renders members manager, `onMembersChanged` callback, spend limits status, `updateProject` called with correct display_name (EPMCDME-13486 regression test). **No test asserts the content of the success toast.** The mock project has `user_count: 3`, which means all update tests call `onSubmit` with `name: 'Test Project'` (a real value), bypassing the bug condition.

- `/Users/kyrylo_korotych/codemie-ui/src/pages/settings/administration/projectsManagement/__tests__/ProjectModal.test.tsx`
  — Vitest + React Testing Library + userEvent. Tests form rendering and submission for `ProjectModal`. Does not test the toast message (that is in the parent page).

### Testing Framework and Patterns

- **Framework**: Vitest with `@testing-library/react`.
- **Mocking**: `vi.mock(...)` for store modules and utility modules. `toaster` is mocked as `{ info: vi.fn(), error: vi.fn() }`.
- **Fixtures**: `mockProject` constant defined inline in test files.
- **Pattern for async actions**: `act(async () => { await callback() })` wrapping store interactions.

### Coverage Gaps

1. No test asserts that `toaster.info` is called with the correct project name string after a successful update.
2. No test covers the case where `payload.name` is `undefined` (i.e., `isNameDisabled = true`, `user_count > 0`) and verifies the toast still shows a meaningful name. This is the exact scenario that produces the bug in production.
3. A new regression test should be added to `ProjectDetailsPage.test.tsx` asserting: when `onSubmit` is called with `name: undefined` (simulating the disabled-name path), `toaster.info` is called with a string containing `mockProject.name`.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables govern the project update notification behavior. The feature is always active.

### Configuration Files

No per-environment configuration affects this code path.

### Feature Flags and Deployment Concerns

- `features:costCenters` feature flag is used in `ProjectModal` to show/hide cost center fields. It does not affect the name field or the toast.
- No deployment concern. The fix is a one-line change in a single component file.

---

## 6. Risk Indicators

- **Primary bug** — `ProjectDetailsPage.tsx` line 111: `payload.name` is `undefined` whenever `project.user_count > 0` (any project with assigned users). The fix is to use `updatedProject.name` (returned by the store, always a string) or `payload.name ?? project.name` as fallback.

- **Latent secondary bug** — `ProjectDetailsPage.tsx` line 121: router redirect after rename also uses `payload.name` as the route param. This branch is unreachable when `isNameDisabled` is true (because the name cannot change), but the code is defensively incorrect. Should be corrected to `updatedProject.name`.

- **Missing regression test** — `ProjectDetailsPage.test.tsx` does not assert toast content and does not test the `name: undefined` submission path. Without a test, this bug could re-emerge silently.

- **Existing tests do not surface the bug** — The `mockProject` in the test has `user_count: 3`, but the test calls `onSubmit({ name: 'Test Project', ... })` manually, bypassing `ProjectModal`'s `isNameDisabled` logic. The test suite passes while the bug is present in production.

- **`ProjectFormData.name` is typed optional (`name?: string`)** — Any interpolation of `payload.name` into a string anywhere in the codebase should be treated as potentially `undefined`.

---

## 7. Summary for Complexity Assessment

This is a narrow, single-file bug fix confined entirely to the UI/Page layer. The root cause is on one line (`ProjectDetailsPage.tsx:111`): `payload.name` is interpolated into the success toast, but `payload.name` is deliberately set to `undefined` by `ProjectModal` when the project has one or more users (`isNameDisabled = true`). The correct value — `updatedProject.name`, returned by `projectsStore.updateProject` two lines above — is already available in scope and always a non-empty string. The fix requires changing one expression in one file. A secondary latent issue exists on line 121 (router param after rename), which should be corrected in the same commit.

The affected area is well-understood and follows established patterns. No new patterns, new dependencies, or schema changes are required. The Valtio store, the toaster utility, and the `Project` type are all stable. The component already uses `updatedProject.name` correctly for cache invalidation on lines 114–115, making the fix consistent with the surrounding code.

Test coverage for the exact bug scenario is absent: the existing test for `handleSaveProject` passes a real `name` string, which does not exercise the `undefined` path. A regression test asserting the correct toast content when `payload.name` is `undefined` should accompany the fix. Both the source fix and the test addition are low-risk, low-complexity changes.
