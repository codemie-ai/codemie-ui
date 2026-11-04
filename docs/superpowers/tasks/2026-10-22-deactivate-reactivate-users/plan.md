# Deactivate and Reactivate Users (EPMCDME-13928) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Super admins and maintainers can deactivate/reactivate users from User Management, with status column and filter; pickers and project members show only active users.

**Architecture:** Two new Valtio store methods; a tri-state `is_active` filter flowing through the existing filters stack; role- and self-gated row menu items using `ConfirmationModal`; `is_active: true` added to picker and project-member queries.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL (`unit` and `integration` projects).

**Spec:** none (inline requirements); analysis in `technical-analysis.md`.

## Global Constraints

- Commit per task using the repository's existing convention: `EPMCDME-13928: Capital sentence`. Stage only the task's files by name; never `.codemie/codemie-cli.config.json`. Do not push, no MR.
- Do not extend `mock-server/`. No tests beyond those below.
- Run `npm ci` before trusting gates. Gates run individually, never chained: `npm run lint`, `npm run typecheck`, `npm run test:unit:slnt`, `npm run test:integration:slnt`. Prettier/eslint run by hook on `src` edits.
- Store calls: `api.delete(url, undefined, { skipErrorHandling: true })` / matching `api.post`. Errors: `toaster.error(error?.parsedError?.message || fallback)`.
- New files carry the Apache licence header.

## Acceptance criteria

1. Users list shows deactivated users by default with a "Deactivated" label.
2. Status filter offers All/Active/Deactivated and survives a reload.
3. Super admin/maintainer can deactivate an active and reactivate a deactivated user, each behind confirmation; row updates after success.
4. Backend errors are shown as toast and nothing changes on screen.
5. Auditors/non-admins never see the actions; nobody can deactivate themselves.
6. User pickers and project members list never show deactivated users.

## Review Focus

- Status "Deactivated" (`false`) is the only filter set: must not be dropped by `cleanObject`, persistence, restore, Clear All visibility, or select-all `effectiveFilters`.
- "All" must send no `is_active` key at all (not `null`).
- Maintainer who is also the row user: no Deactivate on own row (compare `userStore.user.userId` to row `id`); Reactivate is never self.
- 409/404 on reactivate: toast, list unchanged, modal closes.
- Existing tests asserting `searchUsers` request URL/args keep passing.

---

### Task 1: Store methods and active-only picker search

**Files:**
- Modify: `src/store/user.ts` (type block :60-100; `searchUsers` :266)
- Test: `src/store/__tests__/user.test.ts` (create if absent; follow existing store test style)

**Interfaces:**
- Produces: `userStore.deactivateUser(id: string): Promise<{ message: string }>`, `userStore.reactivateUser(id: string): Promise<UserListItem>` (use the existing detail type if one exists); both rethrow errors.

- [ ] Test-first: yes — failing tests: `deactivateUser` calls `api.delete('v1/admin/users/u1', undefined, { skipErrorHandling: true })`; `reactivateUser` calls `api.post('v1/admin/users/u1/reactivate', ...)` with skipErrorHandling; both propagate rejection; `searchUsers('ali', 10)` GET carries `filters` JSON `{"is_active":true}` alongside `search` and `per_page`.
- [ ] Implement methods and the `searchUsers` filters param; declare them in the type block. Run `npx vitest run --project unit src/store/__tests__/user.test.ts`; expect PASS.
- [ ] Commit.

### Task 2: Project members only see active users

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:359-370`
- Test: `projectsManagement/__tests__/ProjectMembersActiveOnly.test.tsx` (new, modelled on the existing `ProjectMembers*.test.tsx`)

All three `getUsers` calls (:373, :383, :393) already derive their filters from `getBaseUserFilters`, so one change covers them.

- [ ] Test-first: yes — failing test: initial load, paging fetch (>1 page) and the select-all fetch each call `userStore.getUsers` with `filters` containing `is_active: true`.
- [ ] Add `is_active: true` to the object returned by `getBaseUserFilters`. Run the new file plus existing `ProjectMembers*` tests; expect PASS.
- [ ] Commit.

### Task 3: Status filter (All/Active/Deactivated)

**Files:**
- Modify: `usersManagement/constants.ts` (add `is_active: boolean | null` to `UsersManagementFilters` and `FILTER_INITIAL_STATE` as `null`), `usersManagement/hooks/useUsersManagementFilters.ts`, `usersManagement/components/UsersManagementFilters.tsx` (all under `src/pages/settings/administration/`)
- Test: `usersManagement/hooks/__tests__/useUsersManagementFilters.test.ts`, `usersManagement/components/__tests__/UsersManagementFilters.test.tsx` (new)

**Interfaces:**
- Produces: filter key `is_active` (`true` | `false` | `null`); UI Select with options All (`'all'` sentinel -> `null`), Active (true), Deactivated (false), applied immediately via `onFilterChange`.

- [ ] Test-first: yes — failing tests: hook persists `{is_active:false}` via `setFilters` and restores it on mount (not dropped by `cleanObject`/merge); `null` resets/stays absent; Clear All visible when `is_active` is `false` (`checkEmptyFilters` false) and hidden when `null`; component renders the three options, choosing Deactivated emits `is_active:false`, choosing All emits `null`.
- [ ] Implement. Validate a restored `is_active` is boolean or null, else fall back to `null`. Do not change `checkEmptyFilters`/`cleanObject` unless a test proves they drop `false`.
- [ ] Run both test files; expect PASS.
- [ ] Commit.

### Task 4: Status column, row actions, confirmation

**Files:**
- Modify: `src/pages/settings/administration/UsersManagementPage.tsx` (`BASE_COLUMN_DEFINITIONS` ~:70; `customRenderColumns` incl. `actions` ~:343 and its deps; role flags ~:85)
- Test: `src/pages/settings/administration/__tests__/UsersManagementPage.userStatus.test.tsx` (new, unit style of `UsersManagementPage.createUserButton.test.tsx`)

**Interfaces:**
- Consumes: Task 1 store methods; Task 3 `is_active` filter (flows via the existing `effectiveFilters` spread, including `onFetchAll`; confirm it).

- [ ] Test-first: yes — failing tests: (a) `is_active:false` row shows "Deactivated" `StatusBadge`, active row shows none (nothing, to keep the table uncluttered); adjust column widths so the total stays within the existing budget; (b) admin/maintainer sees "Deactivate user" on an active row and "Reactivate user" on a deactivated row; (c) auditor and plain user see neither; (d) own row (store `user.userId` === row `id`) has no "Deactivate user"; (e) clicking opens `ConfirmationModal` naming the user, confirm calls `deactivateUser`/`reactivateUser` with row id, then refreshes via `refresh()` and calls `toaster.info` success; cancel calls nothing; (f) rejection with `parsedError.message` calls `toaster.error` with that message and does not refresh.
- [ ] Implement: pending-action state `{ user, action }` (pattern of `UserProjectsTable.tsx` confirm flow); menu items gated on `isAdmin || isMaintainer` (not budget flag, not auditor); close modal in `finally`. Run the new file plus existing UsersManagement* tests; expect PASS.
- [ ] Commit.

### Task 5: Integration tests per criterion

**Files:**
- Test: `src/pages/settings/administration/__tests__/UsersManagementStatus.integration.test.tsx` (new; follow `UsersManagementSpending.integration.test.tsx` with `mockAPI`/`renderPage`, no mock-server changes)

- [ ] Test-first: no — Tasks 1-4 deliver the behavior; these tests pin it end to end. Cover: (1) default load sends no `is_active` and shows a "Deactivated" badge; (2) choose Deactivated -> request filters `is_active:false`, remount page restores the selection from localStorage; Active -> `true`; All -> absent; (3) deactivate flow: confirm -> DELETE called -> list re-fetched -> row reflects state, toast shown; reactivate flow via POST; (4) DELETE 403 "last super admin" message toasted, list not re-fetched; (5) auditor sees no actions, own row has no Deactivate; (6) picker request (`UserSelector` or `searchUsers`) sends `{"is_active":true}`. Run `npm run test:integration:slnt` for the file only via `npx vitest run --project integration <path>`; expect PASS.
- [ ] Commit.

### Task 6: Mutation check and full gates

**Files:** none committed (mutations reverted). Record results in the task output.

- [ ] Test-first: no — verification of the new tests. For each mechanism, remove it, rerun the owning test file, record "mechanism removed -> test that failed", then revert (`git diff` shows only the intended Task 1-5 state; do not use `git checkout` on unrelated files, run `git status` first): (1) `is_active` filter in `searchUsers` (Task 1/5 criterion 6); (2) `is_active: true` in `getBaseUserFilters` (criterion 6); (3) persist/restore of `is_active` in the filters hook (criterion 2); (4) "Deactivated" badge render (criterion 1); (5) `isAdmin || isMaintainer` gate (criterion 5); (6) self-row exclusion (criterion 5); (7) refresh after confirm and confirm modal (criterion 3); (8) error toast / no-refresh-on-error (criterion 4). Any mutation that leaves tests green means a test is weak: strengthen it, then repeat.
- [ ] Run `npm ci`, then individually: `npm run lint`, `npm run typecheck`, `npm run test:unit:slnt`, `npm run test:integration:slnt`; quote the `Test Files` line of each test run; fix regressions (e.g. tests asserting old `searchUsers` URL).
- [ ] Commit only if gate fixes were needed, staging by name.
