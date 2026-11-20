# User-Level Model Override — Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three test-coverage gaps the technical analysis found for EPMCDME-15082's frontend slice (AC1 single-user override, AC2 bulk override) on the already-functionally-complete WIP branch, without touching UI wiring unless a new failing test proves a defect.

**Architecture:** No new production code is expected. Three new/extended test files exercise the existing `ProjectMembersManager` → `projectModelOverridesStore` persistence path, the store's five methods in isolation, and `ProjectMembersBulkActions`'s "Override models" visibility gating. Only fix implementation code if a written test fails against currently-correct-looking logic.

**Tech Stack:** Vitest + React Testing Library (`unit` project), Valtio stores, existing repo mocking conventions (`vi.mock('@/utils/api', ...)`, `vi.mock('@/utils/toaster', ...)`, direct store-method stubbing via `store.method = vi.fn()`).

**Spec:** `spec.md` in this directory (aligned with the Jira ticket); research in `docs/superpowers/tasks/2026-10-07-epmcdme-15082/technical-analysis.md`.

## Acceptance criteria

Restated and scoped to this repo's slice (frontend only; ACs 3-6 are backend runtime-resolution concerns and out of scope):

- [ ] AC1 — When a project admin sets a model access override for a single user (via that user's row-action "Override models" entry), the override is persisted via `projectModelOverridesStore.setUserModelOverride` with the correct `project_name`/payload (`user_id`, `allowed_models`, `default_model`), proven by a test that drives the real UI entry point and asserts the store call.
- [ ] AC2 — When a project admin applies a model access override to a bulk-selected group of users (via `ProjectMembersBulkActions`'s "Override models" item), the same override is persisted for every selected user via `projectModelOverridesStore.batchUserModelOverrides` with `operation: 'grant'` and the correct `user_ids`/payload, proven by a test that drives the real UI entry point and asserts the store call.

## Global Constraints

- No new UI wiring: implementation code changes only if a written test fails and proves a defect in already-shipped logic.
- No whole-suite lint/build/test gate, code-review, or manual/browser-verification task — the calling flow owns those stages.
- Do not touch `ProjectModelsSection.tsx`, `projectModelConfiguration.ts`, or any platform/project-tier model configuration code — out of scope per the ticket.
- Commit per task using the repository's existing convention (ticket-prefixed commit message, per `.ai-run/guides/standards/git-workflow.md`).
- New test files follow the repo's existing mocking conventions exactly: mock `@/utils/api` and `@/utils/toaster` directly for store-level tests (see `src/store/__tests__/projectModelSettings.test.ts`); mock stores directly on the Valtio proxy object for component/integration tests (see `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersModelFilter.test.tsx`).

## Review Focus

- A bulk "grant" that silently drops a user from `user_ids` (e.g. stale `selectedUsers` closure) — Task 1's bulk test asserts the exact `user_ids` array, not just that the mock was called.
- `getUserModelOverride`'s 404 branch swallowing a *non*-404 error (e.g. a 500) instead of rethrowing/toasting — Task 2 asserts both branches, not just the 404 one.
- The `silent` flag's default (`false`) still toasting on error for `setUserModelOverride`/`deleteUserModelOverride`/`batchUserModelOverrides` — Task 2 asserts the non-silent default alongside the silent-suppression case, not only the suppression case.
- `ProjectMembersBulkActions` returning `null` outright when `canManageProject` is false — easy to miss if a test only toggles the flag and never the permission prop — Task 3 asserts both axes independently (2x2, not a single combined case).
- The single-user "clear all overrides" path (`deleteUserModelOverride`) and the bulk "clear all" path (`batchUserModelOverrides` with `operation: 'revoke'`) are a different branch from the "grant" path in the same `onApply` handler — Task 1 includes one assertion per branch pair (grant single, grant bulk) since those are what AC1/AC2 require; the revoke paths are pre-existing-covered-by-symmetry and not required by AC1/AC2, so they are explicitly out of this plan's scope (not duplicated into Task 1).

---

### Task 1: AC1/AC2 persistence integration tests on `ProjectMembersManager`

**Files:**
- Create: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersModelOverridePersistence.test.tsx`
- Test: same file (this task is test-only)

**Interfaces:**
- Consumes: `ProjectMembersManager` (`project`, `isUserModelOverrideEnabled` props — same shape as `ProjectMembersModelFilter.test.tsx`'s `mockProject`/`buildUser` helpers, which this task may copy or import if exported; if not exported, duplicate the small helpers locally rather than refactoring the existing test file), `projectModelOverridesStore.setUserModelOverride(projectName: string, payload: { user_id: string; allowed_models: string[]; default_model: string | null }, silent?: boolean)`, `projectModelOverridesStore.batchUserModelOverrides(projectName: string, payload: { operation: 'grant' | 'revoke'; user_ids: string[]; allowed_models?: string[]; default_model?: string | null }, silent?: boolean)`.
- Produces: nothing consumed by later tasks (independent test file).

- [ ] **Step 1: Write the failing single-user test**

In the new file, mock `userStore.getUsers`, `appInfoStore.getLLMModels`, `projectModelOverridesStore.listUserModelOverrides` (resolve `[]`), and stub `projectModelOverridesStore.setUserModelOverride = vi.fn().mockResolvedValue({})`. Render `<ProjectMembersManager project={mockProject} isUserModelOverrideEnabled />`. Open the row-action menu for one user, click "Override models", interact with the mocked `ModelConfigurationTable` (or the real modal controls — whichever the modal renders; check `ProjectMemberModelOverrideModal.test.tsx` for how it toggles a model) to produce at least one explicit override, then click the modal's apply/save control. Assert:
```ts
expect(projectModelOverridesStore.setUserModelOverride).toHaveBeenCalledWith(
  'Test Project',
  expect.objectContaining({ user_id: 'u-1', allowed_models: expect.any(Array) }),
  true
)
```

- [ ] **Step 2: Run test to verify it fails (or passes, confirming already-correct wiring)**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersModelOverridePersistence.test.tsx`
Expected: test runs and reports a real pass/fail — if the assertion fails, inspect whether the UI flow description above matches the actual modal controls before concluding there's a product defect.

- [ ] **Step 3: Write the failing bulk test in the same file**

Render the same `ProjectMembersManager` with two users seeded via `userStore.getUsers`. Select both users (checkbox selection — see how `ProjectMembersBulkActions` receives `selectedUsers`; drive selection through whatever table-row checkbox control the existing manager renders). Open "Bulk Actions" → "Override models", interact with the modal, apply. Assert:
```ts
expect(projectModelOverridesStore.batchUserModelOverrides).toHaveBeenCalledWith(
  'Test Project',
  expect.objectContaining({ operation: 'grant', user_ids: ['u-1', 'u-2'], allowed_models: expect.any(Array) }),
  true
)
```

- [ ] **Step 4: Run test to verify it fails/passes**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersModelOverridePersistence.test.tsx`
Expected: real pass/fail reported for both tests.

- [ ] **Step 5: Fix only if a test fails and proves a defect**

If either assertion fails because the production code's branch logic is wrong (not because the test drove the UI incorrectly), fix the minimal line in `ProjectMembersManager.tsx`'s `onApply` handler (~lines 1006-1060) and re-run. If the failure is a test-authoring mismatch (wrong selector, wrong mock), fix the test instead — do not alter production code for a test-side mistake.

- [ ] **Step 6: Run full test file once more to confirm green**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersModelOverridePersistence.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

Test-first: yes — failing assertions written in Steps 1 and 3 before any fix.

---

### Task 2: Store-level unit tests for `projectModelOverrides.ts`

**Files:**
- Create: `src/store/__tests__/projectModelOverrides.test.ts`
- Test: same file

**Interfaces:**
- Consumes: `projectModelOverridesStore` (`listUserModelOverrides`, `getUserModelOverride`, `setUserModelOverride`, `deleteUserModelOverride`, `batchUserModelOverrides`), mocked `api.get`/`api.post`/`api.delete`, mocked `toaster.error`. Follow `src/store/__tests__/projectModelSettings.test.ts`'s exact mocking shape (`vi.mock('@/utils/api', ...)`, `vi.mock('@/utils/toaster', ...)`, a `respond(body)` helper returning `{ json: () => Promise.resolve(body) }`).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write failing happy-path tests for all five methods**

One `it` per method asserting the correct `api.get`/`api.post`/`api.delete` URL (including `/batch` for `batchUserModelOverrides`) and that the resolved value is returned, e.g.:
```ts
it('lists overrides for a project', async () => {
  mockGet.mockResolvedValue(respond([{ id: 'ov-1' }]))
  const result = await projectModelOverridesStore.listUserModelOverrides('Test Project')
  expect(mockGet).toHaveBeenCalledWith('v1/projects/Test Project/user-model-overrides', { skipErrorHandling: true })
  expect(result).toEqual([{ id: 'ov-1' }])
})
```

- [ ] **Step 2: Write failing test for the 404-as-null branch**

```ts
it('returns null when getUserModelOverride 404s', async () => {
  mockGet.mockRejectedValue({ status: 404 })
  const result = await projectModelOverridesStore.getUserModelOverride('Test Project', 'u-1')
  expect(result).toBeNull()
  expect(mockToastError).not.toHaveBeenCalled()
})
```
Add a sibling test asserting a non-404 error (e.g. `{ status: 500, message: 'boom' }`) rethrows and calls `toaster.error`.

- [ ] **Step 3: Write failing tests for the `silent` suppression path**

For `setUserModelOverride`, `deleteUserModelOverride`, and `batchUserModelOverrides`: one test per method asserting `toaster.error` is called when the method rejects and `silent` is omitted/`false`, and a sibling test per method asserting `toaster.error` is NOT called when `silent` is `true` (error still rethrown in both cases — assert via `await expect(...).rejects.toThrow()` or equivalent).

- [ ] **Step 4: Run tests to verify fail/pass status**

Run: `npx vitest run --project unit src/store/__tests__/projectModelOverrides.test.ts`
Expected: real pass/fail reported for every case written above.

- [ ] **Step 5: Fix only if a test fails and proves a defect**

If a test fails because `src/store/projectModelOverrides.ts` has a real bug (wrong URL, wrong silent check, wrong 404 comparison), fix the minimal line and re-run. Otherwise fix the test.

- [ ] **Step 6: Run full file once more to confirm green**

Run: `npx vitest run --project unit src/store/__tests__/projectModelOverrides.test.ts`
Expected: PASS, all cases.

- [ ] **Step 7: Commit**

Test-first: yes — failing assertions for all five methods, the 404 branch, and the silent-suppression branches written before any fix.

---

### Task 3: Visibility/gating tests for `ProjectMembersBulkActions`'s "Override models" item

**Files:**
- Create: `src/pages/settings/administration/components/projectsManagement/__tests__/ProjectMembersBulkActionsModelOverride.test.tsx`
- Test: same file

**Interfaces:**
- Consumes: `ProjectMembersBulkActions` props (`projectName`, `selectedUsers`, `currentUserId`, `canManageProject`, `isProjectAdmin`, `canManageBudgets`, `onClearSelection`, `refresh`, `onOverrideModels`, `isUserModelOverrideEnabled`, `budgets`, `budgetAllocationLookup`) — render directly, no need to go through `ProjectMembersManager`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write failing flag-gating tests**

```ts
it('shows "Override models" when isUserModelOverrideEnabled is true', () => {
  render(<ProjectMembersBulkActions {...baseProps} isUserModelOverrideEnabled canManageProject />)
  fireEvent.click(screen.getByText('Bulk Actions'))
  expect(screen.getByText('Override models')).toBeInTheDocument()
})

it('hides "Override models" when isUserModelOverrideEnabled is false', () => {
  render(<ProjectMembersBulkActions {...baseProps} isUserModelOverrideEnabled={false} canManageProject />)
  fireEvent.click(screen.getByText('Bulk Actions'))
  expect(screen.queryByText('Override models')).not.toBeInTheDocument()
})
```
`baseProps` supplies `selectedUsers: [oneUser]`, `onOverrideModels: vi.fn()`, and the other required props with minimal valid values (mirror what `ProjectMembersModelFilter.test.tsx` / other bulk-action tests already use for `BulkActions`/`NavigationMore` rendering).

- [ ] **Step 2: Write failing `canManageProject` gating tests**

```ts
it('renders nothing when canManageProject is false', () => {
  const { container } = render(<ProjectMembersBulkActions {...baseProps} canManageProject={false} isUserModelOverrideEnabled />)
  expect(container).toBeEmptyDOMElement()
})

it('renders the bulk actions bar when canManageProject is true', () => {
  render(<ProjectMembersBulkActions {...baseProps} canManageProject isUserModelOverrideEnabled />)
  expect(screen.getByText('Bulk Actions')).toBeInTheDocument()
})
```

- [ ] **Step 3: Write failing click-through test**

```ts
it('invokes onOverrideModels when "Override models" is clicked', () => {
  const onOverrideModels = vi.fn()
  render(<ProjectMembersBulkActions {...baseProps} canManageProject isUserModelOverrideEnabled onOverrideModels={onOverrideModels} />)
  fireEvent.click(screen.getByText('Bulk Actions'))
  fireEvent.click(screen.getByText('Override models'))
  expect(onOverrideModels).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 4: Run tests to verify fail/pass status**

Run: `npx vitest run --project unit src/pages/settings/administration/components/projectsManagement/__tests__/ProjectMembersBulkActionsModelOverride.test.tsx`
Expected: real pass/fail for all five cases.

- [ ] **Step 5: Fix only if a test fails and proves a defect**

If a case fails because `ProjectMembersBulkActions.tsx`'s gating logic (lines ~135-143, ~154-156) is actually wrong, fix the minimal line and re-run. Otherwise fix the test (e.g. selector mismatch against `NavigationMore`'s rendered DOM).

- [ ] **Step 6: Run full file once more to confirm green**

Run: `npx vitest run --project unit src/pages/settings/administration/components/projectsManagement/__tests__/ProjectMembersBulkActionsModelOverride.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

Test-first: yes — failing assertions for flag-gating (2 cases), permission-gating (2 cases), and the click-through case written before any fix.

---

## Self-Review Notes

- **Spec coverage:** AC1 → Task 1's single-user test; AC2 → Task 1's bulk test. The three concrete gaps from the technical analysis map 1:1 to Tasks 1-3. No other AC in scope for this repo.
- **Negative constraints:** confirmed no task touches `ProjectModelsSection.tsx`, `projectModelConfiguration.ts`, or platform/project-tier config (Global Constraints line 3); confirmed no task adds a whole-suite lint/build/test, code-review, or browser-verification step — every task ends at its own file-scoped `vitest run`, which is test-authoring verification, not a quality gate the calling flow would otherwise own.
- **Out-of-scope ACs 3-6:** no task touches runtime model-resolution logic; this plan is UI-persistence-test-only.
