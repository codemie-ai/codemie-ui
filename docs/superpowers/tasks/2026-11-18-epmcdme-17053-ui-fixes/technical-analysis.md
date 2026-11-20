# Technical Research

**Task**: users management user-type dropdown service_account
**Generated**: 2026-11-18
**Research path**: codegraph

---

## 1. Original Context

Jira EPMCDME-17053 (Bug) "User Management: service account cannot be created as service_account user type, and a project without users is created for it". Scope for THIS run: UI only (Frontend) — Acceptance Criteria 1-3. Backend work (project auto-creation, user_type persistence in backend) and AC 4-6 are OUT of scope.

Description: In Settings → Administration → Users management → User Details, for a service account (example service-account-servicenow_full@epam.com) the User Type dropdown is empty and the `service_account` option is missing (only Regular and External User are listed).

Expected: dropdown shows the current type of the service account; `service_account` is available as an option, can be selected and saved.

Acceptance Criteria in scope:
1. The User Type dropdown displays the saved `user_type` of a service account.
2. `service_account` is available in the User Type dropdown and can be selected and saved.
3. The saved `service_account` type persists after page reload.

Affected area per ticket: Frontend: Users management → User Details → User Type dropdown (option list and display of the current value).

---

## 2. Codebase Findings

### Existing Implementations

Purpose A: an admin sees and changes a user's type in User Details.
- `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx` — the popup, rendered by `UsersManagementPage` (3 call sites).
  - `:38-41` `USER_TYPE_OPTIONS` is a local constant with two entries: `Regular` (`USER_TYPES.regular`) and `External User` (`USER_TYPES.external`).
  - `:54` `userType` state, initial `'regular'`, typed `UserType`.
  - `:95` `setUserType(details.user_type)`, the value from `userStore.getUserById`, copied without validation.
  - `:152-165` `handleUserTypeChange`: sets state optimistically, calls `userStore.updateUser(userId, { user_type })`, then `refreshAfterSave()`. On error it reverts to the previous type.
  - `:270-279` Admins (`currentUser.isAdmin`) get `<Select value={userType} options={USER_TYPE_OPTIONS} className="w-40">`. Non-admins get a read-only `DetailsProperty` showing `user.user_type` with CSS `capitalize`, so a `service_account` value shows as-is.
- `src/components/form/Select/Select.tsx` — wrapper over PrimeReact `Dropdown`. A `value` that is not in `options` is shown only when `allowCustom` is set (`:193`: `allowCustom && value not in options`). `UserDetailsPopup` does not set `allowCustom`, so a service account's value matches no option and the control renders empty. Verified in code, not in a browser.
- `src/constants/user.ts:23-26` — `USER_TYPES = { regular, external } as const`. Its only consumer is `UserDetailsPopup.tsx:28,39-40`.
- `src/types/entity/user.ts:51` — `type UserType = 'regular' | 'external'`. Used by:
  - `UserListItem.user_type` (`:62`) and `UserUpdatePayload.user_type` (`:72`);
  - `src/store/user.ts:28,84` (the `getUsers` filter's `user_type`);
  - `UserDetailsPopup.tsx:35,54,152,275`.
- `src/store/user.ts:515-527` `updateUser`: `PUT v1/admin/users/{id}` with the payload as given. It shows the toast "User updated successfully" and, on failure, the toast "Failed to update user" and rethrows. No client-side validation of `user_type`.
- `getUserById` is `userStore.getUserById` (`src/store/user.ts`, typed `Promise<UserListItem>`). It is the source of the value after reload (AC 3). The UI keeps no local copy: the value is read from the API each time the popup opens.

Purpose B: the user type is shown elsewhere in the admin area.
- `src/pages/settings/administration/UsersManagementPage.tsx:81,344-346` — the "User Type" table column renders `item.user_type` in a `capitalize` span. There is no option list, so no change is needed to display `service_account`, but it renders as "Service_account".
- `src/store/user.ts:453` — `getUsers` sends `filters.user_type` to the API. The users-management filter UI does not use it: `UsersManagementFilters` (`usersManagement/constants.ts:18-24`) has no `user_type`, and `USERS_FILTER_KEYS` (`useUsersManagementFilters.ts:32-36`) has none either. The key exists only in the global `knownFilterKeys` (`src/utils/filters.ts:64`).

Purpose C: the logged-in user's own type gates behaviour (sibling use of the same field, not the admin dropdown).
- `src/constants/index.ts:31` `USER_TYPE_EXTERNAL = 'external'` (duplicates `USER_TYPES.external`), consumed by `src/utils/settings.ts:206`. `src/types/entity/user.ts:33` types `User.user_type` as plain `string`, and `src/store/user.ts:152,189` copy `apiUser.user_type` unchanged.
- Other tests and fixtures use `'INTERNAL'`, `'internal'` and `'regular'` as `user_type` values. These are fixtures only, and nothing in `src` branches on them.

Other touched code: none found outside the files above.

### Decisions Already in the Code
- The option list is local to the popup (`UserDetailsPopup.tsx:38`), not derived from `USER_TYPES` or `UserType`. The alternative would be one shared list. Reason: none found.
- `UserType` is a closed two-value union, so the popup state, the payload and the `getUsers` filter all share it. `e.value as UserType` (`:275`) is a cast, not a check.
- `User.user_type` (the logged-in user) is `string` while `UserListItem.user_type` is `UserType`. Two typings of one backend field.
- Convention: constant objects `as const` in `src/constants/*` with types derived by hand elsewhere. `USER_TYPES` is not used to derive `UserType`.
- Convention for admin edits in this popup: optimistic state, then store call, then `refreshAfterSave()`, with revert on error (type at `:152-165`, role flags at `:213-224`).
- The ticket's `service_account` is a snake_case wire value. Existing labels are human text ("External User") over lowercase values. No existing label for the service-account type was found (grep for `service_account` in `src` finds only unrelated `settingsUIConfig.ts` NTLM fields).

### Task Statements Checked Against the Code
- "only Regular and External User are listed" — holds (`UserDetailsPopup.tsx:38-41`).
- "User Type dropdown is empty for a service account" — consistent with the code: `Select` without `allowCustom` shows nothing for a value not in `options` (`Select.tsx:193`, `UserDetailsPopup.tsx:274-277`). Unverified at runtime; there is no mock data or recorded API sample with `user_type: service_account` (`mock-server/db.json` has none).
- "AC3: saved `service_account` persists after reload" — the UI holds no persistence: `updateUser` is a plain `PUT` and the popup re-reads via `getUserById`. Whether the backend accepts and returns the value is unverified (outside this repository, backend is out of scope for this run).
- AC1-AC2 keep a mechanism in place: `UserType = 'regular' | 'external'` and `USER_TYPES`. Consumers are under "Consumers of Changed Contracts".

### Consumers of Changed Contracts
Searched `UserType`, `USER_TYPES`, `user_type` and `USER_TYPE_OPTIONS` across `src`.
- `UserType` (`src/types/entity/user.ts:51`), consumers:
  - `UserListItem` (`:62`), `UserUpdatePayload` (`:72`);
  - `src/store/user.ts:28,84` (`getUsers` filter);
  - `UserDetailsPopup.tsx:35,54,152,275`.
- `UserListItem` has 64 callers (codegraph blast radius), including `UsersManagementPage`, `UsersManagementBulkActions`, `AssignToProjectPopup`, `ChangeProjectRolePopup`, `UnassignFromProjectConfirmationPopup`, `ProjectMemberModelOverrideModal` and `UserProjectsTable`. All read `user_type` as a string or ignore it. No code branches on its value.
- `USER_TYPES` (`src/constants/user.ts`): only `UserDetailsPopup.tsx:39-40`.
- `User.user_type` (logged-in user): `src/utils/settings.ts:206`. It compares against `'external'` and does not use `UserType`.
- Mocks and fixtures in tests are typed loosely (`'INTERNAL'`, `'regular'`).

### Architecture and Layers Affected
- Page and popup (`src/pages/settings/administration/usersManagement/components/popups/`), shared types (`src/types/entity/user.ts`), constants (`src/constants/user.ts`), and the `userStore` API layer (`src/store/user.ts`, no change visible). The form control is `src/components/form/Select/Select.tsx`.

### Integration Points
- `PUT v1/admin/users/{id}` (update) and `GET` user by id via `userStore.getUserById`. No client-side shape check on either. Backend: out of scope.

### Patterns and Conventions
- Valtio store + local component state in the popup; PrimeReact `Dropdown` wrapped by `Select`; options as `FilterOption[]` (`src/types/filters`). Guides: `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/components/component-patterns.md`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (architecture, components, state-management, form-patterns, testing). They were not read in full. Conventions here come from the code.

### Architectural Decisions
None found for the user-type list.

### Derived Conventions
See "Patterns and Conventions" and "Decisions Already in the Code".

---

## 4. Testing Landscape

### Existing Coverage
- `usersManagement/components/popups/__tests__/UserDetailsPopup.{auditor,projectsGate,refreshInPlace,refreshFailure,saveDuringRefresh,identityId}.test.tsx` — six suites that open the popup. Each has only a `user_type: 'regular'` fixture (one occurrence per file). None asserts the User Type dropdown, its options or `updateUser({ user_type })`.
- `src/store/__tests__/user.test.ts`, `user.createUser.test.ts` and `user.bulkActions.test.ts` cover store calls. They use `user_type: 'regular'` fixtures, with no `updateUser` user_type assertion.
- `src/pages/settings/administration/__tests__/UsersManagementStatus.integration.test.tsx` and similar page tests use `'INTERNAL'` fixtures.

### Testing Framework and Patterns
Vitest and React Testing Library (`vite.config.ts` `test.projects`). Component suites mock `userStore` (see the popup tests). Per AGENTS.md, tests are written or run only when explicitly requested.

### Coverage Gaps
- The dropdown's option list, the display of a non-listed value, and `handleUserTypeChange` have no tests.

---

## 5. Configuration and Environment

### Environment Variables
None found for this area.

### Configuration Files
None relevant. `mock-server/db.json` has no user records with a `user_type`.

### Feature Flags and Deployment Concerns
None. `useBudgetManagementEnabled` in the popup concerns budgets only.

---

## 6. Risk Indicators

- `UserType`, `USER_TYPES` and `USER_TYPE_OPTIONS` keep the existing two-value list in place (`src/types/entity/user.ts:51`, `src/constants/user.ts:23`, `UserDetailsPopup.tsx:38`). Consumers are listed in Section 2.
- `Select` shows nothing for a value outside `options` unless `allowCustom` is set (`Select.tsx:193`). Any other unknown backend `user_type` would also render an empty dropdown.
- Non-admin view prints the raw value (`UserDetailsPopup.tsx:283`) and the list column does the same (`UsersManagementPage.tsx:345`). With `capitalize`, `service_account` appears as "Service_account".
- `UserType` is also the type of the `getUsers` filter (`store/user.ts:84`) and the `updateUser` payload. Widening it reaches both.
- No tests cover the dropdown. Existing popup suites use only a `regular` fixture.
- The backend contract (does `PUT v1/admin/users/{id}` accept `service_account`, does GET return it) is unverified from this repository (AC3 depends on it).
- Speculative: the label text for the new option is not defined anywhere in the ticket or code.

---

## 7. Summary for Complexity Assessment

The task touches one UI flow, the User Details popup under Users management. It covers three small facts-layer artefacts: the local option list (`UserDetailsPopup.tsx:38-41`), the `UserType` union (`src/types/entity/user.ts:51`) and `USER_TYPES` (`src/constants/user.ts`). The store call (`updateUser`, `getUserById`) passes the value through with no client-side validation. The 64 `UserListItem` consumers read `user_type` only as a string. No code branches on its value, so the shared type has no consumer that needs a behavioural change.

Technical novelty is low: the pattern (optimistic update, store call, refresh, revert on error) already exists in the popup. The empty-dropdown symptom matches `Select` behaviour for a value outside `options` without `allowCustom`.

Test posture is thin. Six popup suites exist but none exercises the User Type control, and the only fixture value is `regular`. The main unknown is outside this repository: whether the backend already returns and accepts `service_account` (AC3). Backend work is out of scope for this run.

---

## 8. External References

None named by the task.
