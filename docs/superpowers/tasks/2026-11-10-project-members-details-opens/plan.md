# EPMCDME-16613 Project Members "Details" Opens Filtered Users Management — Implementation Plan

**Goal:** The Members-tab "Details" action opens Users management with the member's name seeded as the `search` URL filter.

**Architecture:** One call-site change in `ProjectMembersManager.tsx`; the existing URL-to-filter pipeline (`useUsersManagementFilters` -> `getFilters`, URL over storage) already does the rest. No router, store or backend change. Filter keys come from the current `usersManagement/constants.ts` and `useUsersManagementFilters.ts` (`search` is a `simple` key), not the stale EPMCDME-15637 plan.

Commit per task using the repository's existing convention. Ticket key: EPMCDME-16613.

## Acceptance criteria

- Clicking Details on a member row navigates to `administration-users` with query `search=<member name>`.
- Users management shows that name in the Search input on first render (no 500ms wait) and requests `v1/admin/users` with it.
- The URL value overrides any previously persisted Users-page search.
- Details stays hidden without `canAccessUsersTab`; with user management disabled it still shows the info toast and does not navigate.

## Task 1: Pass the member name in the Details navigation

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:791-797`
- Create: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersDetails.integration.test.tsx`

**Test-first: yes — clicking Details asserts `push` was called with `{ name: 'administration-users', query: { search: 'Jane Doe' } }`; fails today because `push` receives no query.**

- [ ] Create the test from the template `ProjectMembersViewAnalytics.integration.test.tsx` (same imports, `mockProject`, `buildUser`, `usersResponse`, `beforeEach` store setup). Differences: hoist one shared `push = vi.fn()` with `vi.hoisted` and return it from the `useVueRouter` mock (the template creates a fresh `vi.fn()` per call, so it cannot be asserted); mock `@/utils/featureFlags` so `isUserManagementEnabled` is controllable. Cases:
  - admin clicks the `Details` menuitem -> `push` called with `{ name: 'administration-users', query: { search: 'Jane Doe' } }`.
  - `userStore.user = { userId: 'x', isAdmin: false }` -> no `Details` menuitem (gating unchanged).
  - `isUserManagementEnabled` returns false -> click shows `toaster.info('Users Management is unavailable in this environment')` and `push` is not called.
- [ ] Run the new file with `npx vitest run --project integration <path>`; confirm the first case fails.
- [ ] In the Details `onClick` (`:793`), change the `router.push` argument to `{ name: 'administration-users', query: { search: user.name } }`. `user` is already in scope in the `actions` renderer; `router` is already a `useMemo` dependency (`:845`). Leave `hidden: !hasUsersTabAccess` and the feature-flag/toast branch untouched.
- [ ] Re-run the new file and the existing `ProjectMembersViewAnalytics.integration.test.tsx`; both pass.

## Task 2: Pin the verified mount-time prefill of the Search input

**Files:**
- Modify: `src/pages/settings/administration/usersManagement/components/__tests__/UsersManagementFilters.test.tsx` (append one `describe`)

**Test-first: no — characterization of existing behavior, so it passes before and after; it guards the acceptance criterion that a URL-seeded `search` shows immediately.**

Verified by reading, not assumed: `UsersManagementFilters.tsx:66` initializes `localFilters` with `useState(filters)`, and `:120` binds the Input to `localFilters.search`, so the value renders on first paint. `useDebouncedApply` (`src/hooks/useDebounceApply.ts:20-25`) seeds `previousValueRef` with the initial value and returns early when unchanged, so no debounce fires and `onFilterChange` is not called on mount. `useUsersManagementFilters.ts:49` reads the URL once at mount, and `UsersManagementPage.tsx:233` loads users from `effectiveFilters` without waiting on the input.

- [ ] Using the existing `renderFilters` helper, add a test rendering with `{ ...FILTER_INITIAL_STATE, search: 'Jane Doe' }`. Assert `screen.getByLabelText('Search')` has value `Jane Doe` synchronously after render, and that `onFilterChange` has not been called (use fake timers and advance 600ms to confirm no deferred apply).
- [ ] Run that file with `npx vitest run --project unit <path>`; it passes.

## Negative-constraint pass

- No router/store/backend change: only the `ProjectMembersManager.tsx` call site changes (Task 1); Task 2 is test-only.
- Do not depend on a previous Users-page search: the query comes from the URL, which `getFilters` prefers over storage; Task 1 sends it from the row.
- Do not follow the stale EPMCDME-15637 plan: only the `search` key, which exists in `USERS_FILTER_KEYS.simple`.
- Access gating unchanged: Task 1 keeps `hidden: !hasUsersTabAccess` and the feature-flag branch, and tests both.
- Do not write tests beyond this plan's scope: both test tasks are explicitly in the plan.
