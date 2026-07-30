# Fix Project Update Success Notification — EPMCDME-13165 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the project update success toast on both surfaces that show it — replace `payload.name` with `updatedProject.name` in `ProjectDetailsPage.tsx`, replace the nameless hardcoded string in `ProjectsManagementFull.tsx` — and add a regression test for each.

**Architecture:** Two single-file source fixes plus one regression test per file. Both fixes use `updatedProject` — already returned by `projectsStore.updateProject` on the line above each toast — which always carries `name: string` from the API response.

**Tech Stack:** React, TypeScript, Valtio (state store), Vitest + React Testing Library

## Global Constraints

- Only `ProjectDetailsPage.tsx`, `ProjectsManagementFull.tsx`, and their test files change — no other files.
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
- Produces: nothing consumed by other tasks.

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

---

### Task 2: Regression test + source fix for the nameless toast on the projects list page

Raised by QA after Task 1 shipped: the details page toast was correct, but editing a project from the projects list still showed `Project updated successfully` with no name.

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx` (add one `it` block at the end of the existing `describe`)
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:391,392`

**Test-first: yes** — write a test that opens the edit modal and calls `onSubmit` with `name: undefined`, asserting `toaster.info` receives `Project my-project updated successfully`. This test will fail because line 392 currently passes a hardcoded `'Project updated successfully'`.

**Interfaces:**
- Consumes: existing `mockProject` fixture (`name: 'my-project'`), the existing `vi.mock('@/utils/toaster')` mock, existing `projectModalMock` to extract `onSubmit`.
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Write the failing regression test**

  Open `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx`.

  Import the mocked toaster alongside the existing store imports:

  ```typescript
  import toaster from '@/utils/toaster'
  ```

  Clear it in `beforeEach` next to the other mock resets:

  ```typescript
  vi.mocked(toaster.info).mockClear()
  ```

  Add the following `it` block at the end of the `describe('ProjectsManagementFull — edit save flow')` block:

  ```typescript
  it('shows the project name in the success toast when name is omitted from the payload (EPMCDME-13165)', async () => {
    render(<ProjectsManagementFull />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    const { onSubmit } = projectModalMock.mock.calls.at(-1)[0]
    await act(async () => {
      await onSubmit({
        name: undefined,
        display_name: 'New Display Name',
        description: 'desc',
        cost_center_id: '',
        enforce_member_spend_limits: false,
      })
    })

    expect(toaster.info).toHaveBeenCalledWith(`Project ${mockProject.name} updated successfully`)
  })
  ```

- [ ] **Step 2: Run the test to verify it fails (RED)**

  ```bash
  npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx
  ```

  Expected: the new test **FAILS** with:
  ```
  - "Project my-project updated successfully"
  + "Project updated successfully"
  ```

  All pre-existing tests should still pass.

- [ ] **Step 3: Fix the source — capture and interpolate `updatedProject.name`**

  Open `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx`.

  **Change lines 391–392** inside the `isEdit` branch of `handleModalSubmit`:
  ```typescript
  // Before
  await projectsStore.updateProject(editingProject.id, data)
  toaster.info('Project updated successfully')

  // After
  const updatedProject = await projectsStore.updateProject(editingProject.id, data)
  toaster.info(`Project ${updatedProject.name} updated successfully`)
  ```

  No other lines in this file change — in particular, leave `projectDisplayNamesStore.invalidate(editingProject.id)` and the creation branch untouched.

- [ ] **Step 4: Run the gates to verify GREEN**

  ```bash
  npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/
  npm run typecheck
  npm run test:unit
  npm run test:integration
  ```

  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx
  git add src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx
  git commit -m "EPMCDME-13165: Show project name in Projects management update toast"
  ```
