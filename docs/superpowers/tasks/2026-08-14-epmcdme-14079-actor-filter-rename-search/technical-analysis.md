# Technical Research

**Task**: activity-events actor filter administration settings
**Generated**: 2026-08-14T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

On the settings/administration/activity-events page, the Actor ID filter has two problems: (1) it is labeled 'Actor ID' but actor IDs are not visible in the table — users only see actor name and email; (2) searching by visible actor name or email returns 'No data available' because search only works by the hidden actor ID. The fix requires: rename the filter label from 'Actor ID' to 'Actor', update placeholder text to 'Filter by actor', allow input by actor name or email, and resolve the entered name/email to the actor ID on the application side before sending the request to the backend.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/ActivityEventsPage.tsx` — route-level page; owns all filter state; renders the Actor ID `<Input>` at lines 308–313 with `label="Actor ID"` and `placeholder="Filter by user ID"`; passes `actorId` string state directly to `actor_id` query param in `listEvents()`
- `src/store/activityEvents.ts` — Valtio proxy store; `listEvents()` passes `params.actor_id` verbatim to `GET v1/admin/activity-events?actor_id=<value>`; `loadFilterOptions()` fetches `v1/admin/activity-events/filter-options` (returns domains/event_types/entity_types only — no actors list)
- `src/types/entity/activityEvent.ts` — `ActivityEvent` has `actor_id`, `actor_email`, `actor_name` fields; `ActivityEventFilterOptions` has no actors array; `ActivityEventListParams.actor_id` is `string | null`
- `src/pages/settings/administration/components/activityEventsFilters.ts` — pure helpers `computeFilteredOptions` and `revalidateSelections`; no actor-related logic
- `src/store/user.ts` — `searchUsers(query, perPage?)` calls `GET v1/admin/users?search=<query>&per_page=<n>` (admin-only endpoint); returns `UserListItem[]` sorted by name — **this is the exact resolution API needed**
- `src/types/entity/user.ts` — `UserListItem { id, name, email, ... }` — `id` is the actor UUID the backend expects

### Prior-Art Patterns

- `src/pages/settings/administration/components/AddUserModal.tsx` — closest prior art: uses `userStore.searchUsers()` with a `MultiSelect` + `onFilter` for type-ahead user search, resolves to user `id`, labels result as `${user.name} (${user.email})`
- `src/pages/analytics/components/AnalyticsUserFilter.tsx` — second prior art: search-driven MultiSelect with sticky selected options, resolves display label to backend ID
- `src/hooks/useDebounceApply.ts` — `useDebouncedApply(value, delay, apply)` — debounce utility used by filters elsewhere
- `src/components/form/MultiSelect/MultiSelect.tsx` — PrimeReact MultiSelect wrapper; supports `onFilter` (server-driven search), `loading` prop, `singleValue` for single-select mode, `filterPlaceholder`
- `src/components/form/Input/Input.tsx` — current component used for Actor ID field (to be replaced)

### Architecture and Layers Affected

- **Page layer**: `ActivityEventsPage.tsx` — replace `<Input>` with `<MultiSelect singleValue>`, add local `actorOptions` + `actorLoading` state, wire `onFilter` debounce → `userStore.searchUsers`, resolve selected option `.id` → `actorId` state
- **Store layer**: `activityEventsStore.ts` — no change needed; `actor_id` param semantics stay the same (UUID string)
- **Store layer**: `userStore.ts` — no change needed; `searchUsers()` already exists
- **Type layer**: `activityEvent.ts` — no change needed to `ActivityEventListParams`

### Integration Points

- `GET v1/admin/activity-events?actor_id=<uuid>` — backend query; receives resolved UUID, unchanged
- `GET v1/admin/users?search=<query>&per_page=<n>` — user resolution endpoint; already used by `userStore.searchUsers()`

### Patterns and Conventions

- Valtio proxy stores: async methods called from components via `store.method()`; `useSnapshot` for reactive reads
- Filter state managed with `useState` inside the page component
- API calls only inside store methods (architecture mandate)
- MultiSelect with `onFilter` + debounce + `singleValue` for server-search actor fields (AddUserModal pattern)
- Option label: `${user.name} (${user.email})`; option value: `user.id`

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — Component → Store → API; API calls must not be in components
- `.ai-run/guides/development/api-integration.md` — custom fetch wrapper only; `api.get(url, { params })`, `skipErrorHandling: true` for admin endpoints
- `.ai-run/guides/patterns/custom-hooks.md` — debounced search → dedicated hook if logic grows; otherwise inline debounce with `useDebouncedApply`
- `.ai-run/guides/testing/testing-patterns.md` — unit: `*.test.tsx`, integration: `*.integration.test.tsx`; co-located in `__tests__/`

### Architectural Decisions

- API calls inside Valtio store methods only — the name→ID resolution call uses `userStore.searchUsers()` (already a store method), satisfying this constraint

### Derived Conventions

- Loading state for async search managed locally in the page component (consistent with AddUserModal)
- Selected actor stored as resolved UUID in `actorId` state; display label constructed from `UserListItem.name` + `UserListItem.email`
- Debounce delay: match existing filter patterns (300–500 ms)

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx` — tests only `computeFilteredOptions` and `revalidateSelections` pure helpers; does NOT test the actor filter input or any page-level component
- `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` — integration test for ActivityEvents table pagination only; covers page navigation, not filter interactions

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library
- Two workspace projects: `unit` (`*.test.tsx`) and `integration` (`*.integration.test.tsx`)
- API mocking: `requestRegistry.set('GET:<url>', { factory: () => makeJsonResponse(...) })`
- Helpers: `renderPage(route)`, `screen`, `fireEvent` from RTL
- `describe.each` for table configs; `vi.mock` for feature flags

### Coverage Gaps

- No tests for the actor filter input rendering
- No tests for user search behavior (typing → debounce → `searchUsers` → options display)
- No tests for name/email → ID resolution and `actor_id` param sent to backend
- New tests required: at minimum one unit test for the resolved-value behavior and one integration test for the full filter→API flow

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` (frontend) — backend base URL used by all `api.get/post` calls
- `ENABLE_USER_MANAGEMENT` (backend) — boolean flag that gates the entire `/v1/admin/users` endpoint family; if `false`, `GET /v1/admin/users` returns HTTP 400; the actor search feature silently fails if this flag is off

### Configuration Files

- `src/utils/api.ts` — API client; all requests go through this wrapper
- `.env` — runtime environment variables

### Feature Flags and Deployment Concerns

- `ENABLE_USER_MANAGEMENT` backend flag must be `true` for actor search to work; if it is off, the MultiSelect search will receive a 400 and show no results — the UI should handle this gracefully (empty list, no crash)
- No frontend feature flags found for activity-events or actor filter

---

## 6. Risk Indicators

- **No actor options from filter-options endpoint**: `ActivityEventFilterOptions` has no actors array; the replacement component must be purely server-search-driven with no pre-populated options
- **Test gap**: `ActivityEventsPage.test.tsx` does not test the page component at all; the actor filter change has zero existing test coverage — new tests are required
- **State semantics change**: `actorId` state shifts from "raw user input string" to "resolved user UUID"; any downstream code that reads `actorId` as display text will break (review all uses in the page)
- **Debounce timing**: `userStore.searchUsers` fires on every `onFilter` call; must debounce to avoid hammering `v1/admin/users` on each keystroke
- **Single-select vs. multi-select UX**: ticket says "filter by actor" (singular), so `singleValue` mode is correct; confirm the MultiSelect wrapper supports clearing a single selected value
- **`ENABLE_USER_MANAGEMENT` flag**: if this backend flag is `false`, `GET /v1/admin/users` returns HTTP 400 — the UI must handle this gracefully (show empty results, not crash)
- **Backend `actor_id` is strict UUID equality**: `GET /v1/admin/activity-events?actor_id=` does exact string match — partial search is not supported; the name/email → UUID resolution must be complete before the events query fires
- **Deactivated users**: `GET /v1/admin/users?search=` returns both active and inactive users by default; the frontend should decide whether to surface or filter out deactivated accounts in the dropdown options
- **No backend changes required**: the `GET /v1/admin/users?search=` endpoint already searches email + username + name via ILIKE; this is a frontend-only change

---

## 7. Summary for Complexity Assessment

The task touches one route-level page (`ActivityEventsPage.tsx`) and requires replacing a simple `<Input>` component with a server-search-driven `<MultiSelect singleValue>` that calls `userStore.searchUsers()` on filter input and resolves the selected option's `.id` before passing it to `activityEventsStore.listEvents()`. No store changes are needed — both `activityEventsStore` and `userStore` already expose the required methods. The pattern is established in `AddUserModal.tsx` (within the same administration directory) and `AnalyticsUserFilter.tsx`, making this a follow-the-existing-pattern change rather than novel architecture.

The primary complexity comes from wiring the debounced search, loading state, and single-value resolution correctly inside the page component, and from writing tests where none currently exist. The `ActivityEventsPage.test.tsx` file does not test the page component itself — it only tests pure filter helpers — so new unit and integration tests must be written from scratch for the actor filter interaction.

Risk is low-to-medium: the change surface is narrow (one page component, label/placeholder strings, state type shift), all required APIs already exist, and two prior-art implementations in the same codebase serve as direct templates. The main risk is the state semantics change (`actorId` from raw string to resolved UUID) and ensuring the debounce and loading states are correctly managed to avoid UX regressions.
