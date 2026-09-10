# Technical Research

**Task**: project management user search debounce input
**Generated**: 2026-09-09T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Bug EPMCDME-14056 — Project Management user search sends backend request on each typed letter.

In the Project Management member management flow, the Add User popup includes a searchable user selector that uses the `/users?search` backend request. Currently, each character typed into the user search field triggers a separate backend request. This creates unnecessary backend load and may reduce the responsiveness of the user search experience.

Acceptance Criteria:
- Typing in the Project Management user search field does not trigger a backend request for every single typed letter.
- Backend requests to `/users?search` are reduced while the user is actively typing.
- Search results are still updated correctly for the entered search value.
- The Add User flow continues to allow selecting a user and assigning the user to a project.
- No regression is introduced for the members table, role selection, or project assignment request.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/components/AddUserModal.tsx` — The popup component that is the direct bug site. Contains `handleUserSearch` (lines 71–98), a `useCallback` with no debounce logic. It calls `userStore.searchUsers(query, SEARCH_RESULTS_LIMIT)` immediately on every invocation. It is rendered by `ProjectMembersManager` and wired to `MultiSelect`'s `onFilter` prop.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` — Renders `<AddUserModal>` and handles `handleAddUserSubmit`, role change, unassign, import, and members table. The debounce gap is entirely within `AddUserModal`; this file is not changed by the fix.
- `src/components/form/MultiSelect/MultiSelect.tsx` — Wraps PrimeReact `MultiSelect`. Its internal `onFilter` handler (line 382) calls `onFilter?.(e.filter)` on every keystroke with no throttling. The debounce must be applied in the consumer (`AddUserModal`), not here.
- `src/store/user.ts` (`searchUsers` method, line 263) — Issues `GET v1/admin/users?search=<query>&per_page=<n>`. Called by `AddUserModal.handleUserSearch` without any intermediary.

### Architecture and Layers Affected

- **Page component layer** (`src/pages/settings/administration/components/AddUserModal.tsx`): the only file requiring a code change. `handleUserSearch` needs a debounce guard before it calls the store method.
- **Store layer** (`src/store/user.ts`, `searchUsers`): read-only for this fix. No store changes required.
- **Shared component layer** (`src/components/form/MultiSelect`): not changed. The `onFilter` callback contract is unchanged; the debounce is the consumer's responsibility.

### Integration Points

- `AddUserModal` → `MultiSelect.onFilter` → `handleUserSearch` → `userStore.searchUsers` → `GET v1/admin/users?search=`
- `AddUserModal` → `userStore.assignUserToProject` → `POST v1/projects/{name}/assignment` (unchanged path, must not regress)
- `ProjectMembersManager` → `AddUserModal` (passes `onSubmit` and `visible`; no changes needed here)

### Patterns and Conventions

Two established debounce patterns exist in this repo:

1. **`useRef`-based manual debounce** — used in `UserEmailAutocomplete.tsx` (the closest analogue: same `onFilter`-style callback, same `userStore.searchUsers` target, same 300 ms window). A `debounceRef = useRef<ReturnType<typeof setTimeout>>()` clears and resets on each call; a `useEffect` cleanup cancels on unmount.

2. **`lodash.debounce` + `useMemo`** — used in `ProjectSelector.tsx` (`PROJECT_SEARCH_DEBOUNCE_MS = 300`). Produces a stable debounced function reference; `useMemo` cleanup calls `.cancel()`.

The `useDebouncedApply` hook (`src/hooks/useDebounceApply.ts`) is value-watching (effect-based) and suited to filter state variables, not to callback-invoked search handlers. It is not the right tool here.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` — covers layer boundaries; confirms page components own their interaction logic including debouncing.
- `.ai-run/guides/development/api-integration.md` — covers backend call patterns; no debounce policy stated.
- `.ai-run/guides/components/component-patterns.md` — component construction conventions.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest + React Testing Library; two workspace projects (`unit`, `integration`); `vi.useFakeTimers` + `vi.advanceTimersByTimeAsync` is the established pattern for timer-based tests.

### Architectural Decisions

No ADR or inline decision marker (ADR:, DECISION:) found for debounce strategy. The two existing patterns are consistent: 300 ms is the standard delay across `ProjectSelector` and `UserEmailAutocomplete`.

### Derived Conventions

- Debounce delay: **300 ms** (consistent across both existing search debounce implementations).
- Debounce ownership: the **consumer component** (not the shared `MultiSelect`) holds the debounce ref and clears it on unmount.
- The `useRef` pattern from `UserEmailAutocomplete` is the closest precedent and should be followed for `AddUserModal`, since both deal with a callback-style `onFilter` prop from `MultiSelect` calling `userStore.searchUsers`.
- A cleanup `useEffect` that calls `clearTimeout(debounceRef.current)` on unmount is expected alongside the ref pattern.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/UserEmailAutocomplete/__tests__/UserEmailAutocomplete.test.tsx` — unit tests for the debounce pattern in the analogous component. Tests cover: debounce suppresses rapid calls, single call fires after delay, stale request guard, loading state.
- `src/components/ProjectSelector/__tests__/ProjectSelector.test.tsx` — includes a dedicated test: `'debounces search input instead of calling getProjects on every keystroke'` (line 172). Uses `vi.useFakeTimers` / `advanceTimersByTimeAsync`.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.editFlow.test.tsx` — tests the wider projects management edit flow; mocks `useDebouncedApply` globally. Does not cover `AddUserModal`.
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — references `searchUsers` mock but does not test the debounce behaviour.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 + React Testing Library.
- **Timer control**: `vi.useFakeTimers({ shouldAdvanceTime: true })` + `vi.advanceTimersByTimeAsync(ms)` — used in `ProjectSelector.test.tsx` and `UserEmailAutocomplete.test.tsx`.
- **Store mocking**: `vi.mock('@/store/user', () => ({ userStore: { searchUsers: vi.fn() } }))` — the standard approach in unit tests.
- **Test placement**: `__tests__/` directory co-located with the source file.

### Coverage Gaps

- `AddUserModal.tsx` has **no test file** at all. The debounce behaviour added by this fix, as well as the existing form submit and user selection flows, are untested.
- A new `__tests__/AddUserModal.test.tsx` is the natural location for unit tests covering the debounce requirement.

---

## 5. Configuration and Environment

### Environment Variables

No env vars specific to this feature. The HTTP call in `userStore.searchUsers` uses the shared `api` utility, which reads `window._env_.REACT_APP_BACKEND_URL` / `import.meta.env.VITE_BACKEND_URL` — unchanged by this fix.

### Configuration Files

No feature flags or config toggles govern user search or debounce behaviour in this domain.

### Feature Flags and Deployment Concerns

No feature flags involved. No deployment-side changes required — the fix is purely in component logic.

---

## 6. Risk Indicators

- **No existing test file for `AddUserModal.tsx`**: the fix adds debounce logic to a component with zero test coverage. The debounce behaviour and the unchanged submit flow both need new tests to prevent silent regression.
- **`MultiSelect.onFilter` fires on every keystroke without any internal throttle**: if the debounce ref is not cleared on the component's modal `onHide` / reset path, stale search results could land after the modal is dismissed. The `resetFormState` callback already clears `userOptions` and `selectedUserId`; the debounce timer should also be cancelled there.
- **The `useCallback` dependency array on `handleUserSearch`**: if a `debounceRef` approach is used, the ref itself does not need to appear in deps (it is stable), but `runSearch` (if extracted) must be stable via its own `useCallback` to avoid unnecessary debounce function re-creation.
- **Request-order safety**: `UserEmailAutocomplete` guards against stale responses using a `requestIdRef` counter. `AddUserModal` currently has no such guard. A slow network response from an earlier keystroke could overwrite results from a later, faster one. This is a pre-existing gap but becomes more visible once debounce is added and rapid typing is the expected scenario.
- **`lodash` is already a direct dependency** (`@types/lodash` in `dependencies`, `lodash` used in `ProjectSelector`): using `lodash.debounce` is allowed; using the `useRef` pattern avoids importing lodash and is consistent with `UserEmailAutocomplete`.

---

## 7. Summary for Complexity Assessment

The change touches a single component — `AddUserModal.tsx` — at the `handleUserSearch` callback. No store, no API layer, no router, and no shared component changes are required. The architectural layer affected is the page component layer only. The fix is a mechanical application of an established pattern already present twice in the repo (`UserEmailAutocomplete` for the `useRef` approach, `ProjectSelector` for the `lodash.debounce` approach), both at 300 ms. File change surface is one file plus a new test file.

The primary technical consideration beyond the debounce itself is cancelling the pending timer in the modal's `resetFormState` path to avoid stale results landing after the modal is closed or reset. A secondary hardening step is adding a request-id guard (already present in `UserEmailAutocomplete`) to protect against out-of-order network responses; this is not strictly required by the acceptance criteria but reduces the risk surface.

Test coverage is the highest-effort part of the task: `AddUserModal.tsx` has no tests at all. A new unit test file must cover at minimum the debounce suppression under rapid typing, a single call after the debounce window, and the unchanged submit path. The `ProjectSelector` debounce test (`vi.useFakeTimers` + `vi.advanceTimersByTimeAsync`) is the direct template to follow. Overall complexity is low-to-medium: one logic change, one new test file, one known pattern to replicate.

---

## 8. External References

None named by the task.
