# Fix Project Update Success Notification — EPMCDME-13165 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the project update success toast showing "Project undefined updated successfully" by replacing `payload.name` with `updatedProject.name` in `ProjectDetailsPage.tsx`, and add a regression test.

**Architecture:** Single-file source fix (2 lines changed in `handleSaveProject`) plus one regression test added to the existing test file. The fix uses `updatedProject` — already returned by `projectsStore.updateProject` two lines above the bug — which always carries `name: string` from the API response.

**Tech Stack:** React, TypeScript, Valtio (state store), Vitest + React Testing Library

## Global Constraints

- Only `ProjectDetailsPage.tsx` and its test file change — no other files.
- Commit message format: `EPMCDME-13165: Capital sentence` (no period, first word capitalised).
- Pre-commit hooks run automatically: lint-staged, license headers, secrets check, sonar-local. Never use `--no-verify`.

---

### Task 1: Regression test + source fix for undefined project name in toast

**Files:**
- Modify: `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` (add one `it` block after line 188)
- Modify: `src/pages/settings/administration/ProjectDetailsPage.tsx:111,121`

**Test-first: yes** — write a test that calls `onSubmit` with `name: undefined` and asserts `toaster.info` receives the project name string. This test will fail because line 111 currently interpolates `payload.name` (which is `undefined`), producing `"Project undefined updated successfully"`.

**Interfaces:**
- Consumes: existing `mockProject` fixture (`name: 'Test Project'`), existing `toaster` mock (`info: vi.fn()`), existing `projectModalMock` to extract `onSubmit`.
- Produces: nothing consumed by other tasks — this is the only task.

- [ ] **Step 1: Write the failing regression test**

  Open `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`.

  Add the following `it` block immediately after the last existing test (after line 187, inside the `describe('ProjectDetailsPage')` block):

  ```typescript
  it('shows the project name in the success toast when name is omitted from the payload (EPMCDME-13165)', async () => {
    const { default: toaster } = await import('@/utils/toaster')

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(projectModalMock).toHaveBeenCalled()
    })

    const { onSubmit } = projectModalMock.mock.calls[0][0]
    await act(async () => {
      await onSubmit({
        name: undefined,
        display_name: 'New Display Name',
        description: 'Project description',
        cost_center_id: 'cc-1',
        enforce_member_spend_limits: true,
      })
    })

    expect(toaster.info).toHaveBeenCalledWith(
      expect.stringContaining('Test Project'),
    )
  })
  ```

  Note: `toaster` is already mocked via `vi.mock('@/utils/toaster', ...)` in the `beforeEach` block. The dynamic import retrieves the mocked instance. All other mocks (`projectsStore.updateProject` → returns `mockProject` with `name: 'Test Project'`) are already set up in `beforeEach`.

- [ ] **Step 2: Run the test to verify it fails (RED)**

  ```bash
  npm run test -- --reporter=verbose --testPathPattern="ProjectDetailsPage.test"
  ```

  Expected: the new test **FAILS** with output similar to:
  ```
  AssertionError: expected "spy" to have been called with arguments: StringContaining "Test Project"
  Received: "Project undefined updated successfully"
  ```

  All pre-existing tests should still pass.

- [ ] **Step 3: Fix the source — replace `payload.name` with `updatedProject.name`**

  Open `src/pages/settings/administration/ProjectDetailsPage.tsx`.

  **Change line 111** — toast message:
  ```typescript
  // Before
  toaster.info(`Project ${payload.name} updated successfully`)

  // After
  toaster.info(`Project ${updatedProject.name} updated successfully`)
  ```

  **Change line 121** — router redirect param:
  ```typescript
  // Before
  params: { projectName: payload.name },

  // After
  params: { projectName: updatedProject.name },
  ```

  No other lines in this file change.

- [ ] **Step 4: Run the full test file to verify all tests pass (GREEN)**

  ```bash
  npm run test -- --reporter=verbose --testPathPattern="ProjectDetailsPage.test"
  ```

  Expected: **all tests PASS**, including the new regression test. Output should show:
  ```
  ✓ renders ProjectMembersManager with the loaded project
  ✓ refreshes project details through onMembersChanged callback
  ✓ renders project member budget tracking status
  ✓ forwards the edited display_name to updateProject and refreshes stale caches on save
  ✓ forwards clear_display_name to updateProject when the form requests clearing (EPMCDME-13486)
  ✓ shows the project name in the success toast when name is omitted from the payload (EPMCDME-13165)
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/settings/administration/ProjectDetailsPage.tsx
  git add src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx
  git commit -m "EPMCDME-13165: Fix project update notification showing undefined project name"
  ```
