# EPMCDME-14495 Datasource Alias Recovery Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Keep the datasource Name (alias) empty on create until the user enters it, while retaining integration-only alias generation.

**Architecture:** The create form already initializes `name` as an empty string. Remove only the datasource form effect that generates a name from `indexType` and its `generateDefaultAlias` import. Pin the empty-name behavior in the datasource integration test; leave manual-name tracking, unsaved-change logic, other fields, and integration form code unchanged.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library.

**Requirements source:** Root `task.md` and this run's `technical-analysis.md`. The prior task's plan and code-review brief are reference context; the current checkout and requested requirements determine the work.

## Global Constraints

- Build the EPMCDME-14495 change set in a separate clean worktree based on the agreed MR target (`origin/main` per the repository workflow); do not implement in or alter the existing user worktree.
- The MR code/test allow-list is `DataSourceForm.tsx`, `DataSourceCreatePage.integration.test.tsx`, and only the Windows portability fixes explicitly enumerated in the supplied MR summary.
- Treat the MR summary's Windows portability items as a strict allow-list. The existing test helpers `requestUrl` (normalizes string, URL, and Request fetch inputs) and `suppressUnhandledRejection` (temporarily suppresses and restores `unhandledRejection` listeners) may be included only if they are explicitly listed there. If the summary is unavailable or ambiguous, stop and ask rather than infer additional allowed changes.
- Exclude all assistant-selector and multiselect changes, including `AssistantSelector.tsx`, `AssistantMultiSelectField.tsx`, their tests, and any unrelated changes bundled in existing EPMCDME-14495 commits (including A2UI manifest and modal-surface test changes).
- Keep `.env`, `package-lock.json`, `vite.config.ts`, root `task.md`, and other existing local or untracked files—including task-run artifacts—out of the MR diff and untouched in the original worktree.
- Never delete, reset, unstage, stash, rebase, overwrite, or otherwise alter existing user changes. If any cleanup or operation that could affect them appears necessary, stop and request explicit user confirmation first; prefer isolation over cleanup.
- Do not change integration alias generation, datasource fields, manual-name tracking, or unsaved-change behavior.
- Run `npm ci` in the isolated worktree before trusting test results; do not commit, push, or open an MR unless separately requested.

## Acceptance criteria

- Name stays empty after create-form initialization and after selecting Confluence.
- Manually entered names, datasource fields, and unsaved-change behavior remain unchanged.
- Integration alias generation remains intact.

## Review Focus

- Untouched form: Name remains empty and navigating away does not show the unsaved-changes popup; pin this in Task 2.
- Type change: selecting Confluence leaves Name empty; pin this in Task 2.
- Manual naming and dirty-form behavior: retain the existing coverage and run it with the datasource integration test in Task 3.
- Other datasource fields: keep their logic outside the removed name-generation effect and run the existing datasource integration test in Task 3.
- Integration alias generation: leave integration code untouched and run its existing autofill test in Task 3.
- Change-set scope: the final MR diff contains only the two approved datasource files and summary-listed Windows portability hunks; verify this in Task 4.

---

### Task 1: Isolate the ticket change set without disturbing user changes

**Files:**
- No repository source files; create/use an isolated worktree under `C:\tmp`.

**Interfaces:**
- Consumes: The approved MR target (`origin/main`) and the EPMCDME-14495 implementation/test scope in this plan.
- Produces: A clean ticket-only worktree; the original branch, index, working tree, and untracked files remain unchanged.

- [ ] **Step 1: Record the original worktree state read-only.** Inspect `git status --short --untracked-files=all`, staged and unstaged diffs, and the current branch. Treat `.env`, `package-lock.json`, `vite.config.ts`, root `task.md`, task-run artifacts, and assistant-selector/multiselect changes as pre-existing content to preserve—not cleanup targets.
- [ ] **Step 2: Confirm the clean base and destination are available.** Verify `origin/main` is the MR target and that `C:\tmp\EPMCDME-14495-datasource-alias-recovery` and branch `EPMCDME-14495_datasource-alias-recovery-clean` do not already exist. If the target or destination conflicts, stop and ask before choosing another base or path; never remove an existing worktree or branch.
- [ ] **Step 3: Create a separate worktree from the clean MR target.** Use `git worktree add -b EPMCDME-14495_datasource-alias-recovery-clean C:\tmp\EPMCDME-14495-datasource-alias-recovery origin/main`. Do not cherry-pick the existing mixed commits, copy unrelated changes, rebase, or modify the original checkout.
- [ ] **Step 4: Verify the isolated worktree starts clean.** Confirm its branch is the new ticket branch and it has no unrelated staged, unstaged, or untracked content before proceeding. If it is not clean, stop; do not clean/reset it.

### Task 2: Pin empty datasource Name behavior in integration tests

**Files:**
- Modify: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Interfaces:**
- Consumes: Existing `waitForFormReady` and `selectConfluenceType` helpers.
- Produces: Regression assertions for an initially empty Name and a Name that stays empty after selecting Confluence.

**Test-first:** Change and add the user-visible assertions in the isolated worktree before changing the form, then confirm they fail against the current auto-generation behavior.

- [ ] **Step 1: Preserve only the summary-listed Windows portability fixes.** Keep the existing `requestUrl` and `suppressUnhandledRejection` helpers and their uses only when each corresponds to an item explicitly listed in the supplied MR summary. Do not add other platform workarounds.
- [ ] **Step 2: Update the untouched-form guard test.** After `waitForFormReady()`, assert `expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')` instead of waiting for a generated value. Keep the navigation and no-unsaved-changes assertions.
- [ ] **Step 3: Add a focused Confluence type-change test.** Render `/data-sources/create`, await `waitForFormReady()`, confirm Name is initially empty, select Confluence with `selectConfluenceType(user)`, then assert Name is still empty.

```tsx
it('keeps datasource Name empty after selecting Confluence', async () => {
  const user = userEvent.setup()
  renderPage('/data-sources/create')
  await waitForFormReady()

  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
  await selectConfluenceType(user)
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
  )
})
```

- [ ] **Step 4: Reinstall dependencies in the isolated worktree before treating test output as evidence.** Run `npm ci`.
- [ ] **Step 5: Run the focused integration file to establish the red baseline.**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

Expected: FAIL on the empty-Name assertions while datasource alias generation remains enabled.

### Task 3: Remove datasource-only automatic alias generation

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx`
- Test: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Interfaces:**
- Consumes: The failing empty-Name regression assertions from Task 2.
- Produces: A create form whose Name remains empty until manual entry.

**Test-first:** Use Task 2's failing initial-value and Confluence-selection assertions as the red baseline before removing the generation behavior.

- [ ] **Step 1: Remove the `generateDefaultAlias` import and only the `useEffect` that derives and writes a default Name from `indexType`.** Keep the other `useEffect` hooks and the React `useEffect` import, which remain in use.
- [ ] **Step 2: Preserve `nameManuallyEdited`, its Name input handler, the unsaved-changes comparator, and all unrelated form-field logic.** Do not change integration form code or the existing Windows test-compatibility helpers.
- [ ] **Step 3: Re-run the focused datasource integration file.**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

Expected: PASS, including the initial empty Name, post-Confluence empty Name, untouched navigation, manual editing, and existing datasource-field assertions.

- [ ] **Step 4: Verify the existing integration alias behavior remains covered.**

Run: `npm run test:unit -- src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.autoFill.test.tsx`

Expected: PASS; integration alias generation remains unchanged.

### Task 4: Audit and hand off only the approved EPMCDME-14495 diff

**Files:**
- Review only: the isolated worktree diff; do not change files in the original worktree.

**Interfaces:**
- Consumes: The isolated branch from Task 1 and the implementation/tests from Tasks 2–3.
- Produces: A reviewed MR diff limited to the approved datasource implementation, its focused integration tests, and the explicitly summary-listed Windows portability fixes.

- [ ] **Step 1: Inspect the complete isolated change set.** Review `git status --short --untracked-files=all`, `git diff --name-only origin/main`, `git diff --cached --name-only`, and the full diff. Do not stage or commit as part of this audit.
- [ ] **Step 2: Enforce the file-and-hunk allow-list.** Permit only `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` and `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`; within the test file permit only the empty-Name guard update, the Confluence regression test, and Windows portability hunks explicitly listed in the supplied MR summary (`requestUrl` normalization and `suppressUnhandledRejection` handling only if listed there).
- [ ] **Step 3: Confirm exclusions.** Verify no assistant-selector/multiselect implementation or tests, A2UI manifest or modal-surface test changes, `.env`, `package-lock.json`, `vite.config.ts`, root `task.md`, task-run artifacts, or other unrelated paths/hunks appear in the isolated MR diff.
- [ ] **Step 4: Stop safely on any scope violation.** If unrelated content appears or the MR-summary allow-list cannot be verified, do not delete, reset, unstage, stash, rebase, or overwrite anything. Keep the original worktree untouched and ask the user how to proceed before any destructive cleanup.
- [ ] **Step 5: Present the isolated diff for handoff.** Report the final allow-listed paths and summarize the excluded unrelated changes; do not commit, push, or open an MR unless separately requested.
