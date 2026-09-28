# Technical Research

**Task**: analytics users filter email dropdown administration width
**Generated**: 2026-08-12T11:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix analytics page Users filter to search by email (EPMCDME-14070): the dropdown shows 'No results found' when searching by email even though the backend returns matching users. Display user items with name on top and email below (smaller, dimmed). Also fix administration filter dropdown width to 320px for Users/Activity-events filters (EPMCDME-14078): Budget, Project, Domain, Event type, Entity type dropdowns in settings/administration pages need 320px width. UI repo: codemie-ui-next, backend repo: codemie.

---

## 2. Codebase Findings

### Existing Implementations

**Backend — `codemie` repo:**
- `src/codemie/rest_api/routers/analytics.py` — `/v1/analytics/users` GET endpoint; accepts `search` param; delegates to `AnalyticsService.get_users_list`
- `src/codemie/rest_api/models/analytics.py` — `UserListItem` model (line 144): currently `id: str`, `name: str` only — **no `email` field**; `UsersListResponse` wraps it
- `src/codemie/service/analytics/handlers/user_handler.py` — `get_users_list` (line 63); super-admin (PG) path returns `{"id": u.id, "name": u.name or u.username}` — **email not included**; ES path returns `{"id": bucket["key"]["user_id"], "name": bucket["key"]["user_name"]}` (also no email)
- `src/codemie/repository/user_repository.py` — `aquery_active_users` (line 632): ILIKE search on `email`, `username`, `name`; returns full `UserDB` objects which DO have `.email` — **the data is available, just not forwarded**

**Frontend — `codemie-ui-next` repo:**
- `src/pages/analytics/components/AnalyticsUserFilter.tsx` — analytics Users filter MultiSelect; accepts `userOptions: Array<{ label: string; value: string }>`; no `renderOption` prop passed → falls back to `defaultRenderOption` (renders label string only); no custom item template showing name + email
- `src/pages/analytics/components/AnalyticsFilters.tsx` — parent; fetches user options via `userStore.getAnalyticsUsers`; `isAdminPgSearch` gates server-side search; uses `currentUser.email` as initial search term but options have no email field to match against
- `src/store/user.ts` — `getAnalyticsUsers` (line 214): calls `GET v1/analytics/users`, maps result via `formatUserOptions`; no email preserved
- `src/utils/user.ts` — `formatUserOptions(users)`: groups by ID, calls `createdBy()` for label, produces `{ label: string; value: string }` — **no email field**
- `src/utils/helpers.ts` — `createdBy(user, fallbackToId)`: resolves `name || username || user_id || id`; email is not in the chain
- `src/components/form/MultiSelect/MultiSelect.tsx` — wrapper around PrimeReact MultiSelect; accepts optional `renderOption` prop used as `itemTemplate`; if absent falls back to `defaultRenderOption` (label-only `<p>`)

**Frontend — Administration dropdown widths (EPMCDME-14078):**
- `src/pages/settings/administration/ActivityEventsPage.tsx` — filter containers use `w-44` (Domain, Entity type) and `w-52` (Event type) Tailwind classes
- `src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx` — Budget and Project filter containers use `w-48`
- `src/pages/settings/administration/BudgetsManagementPage.tsx` — Category filter uses `w-56`

### Architecture and Layers Affected

| Layer | Component | Change needed |
|---|---|---|
| API response model | `analytics.py` `UserListItem` | Add `email: str \| None` |
| Service handler | `user_handler.py` `get_users_list` | Include `email` in PG path response dict |
| UI store | `store/user.ts` `getAnalyticsUsers` | Thread `email` through to options |
| UI utility | `utils/user.ts` `formatUserOptions` | Include `email` in option shape |
| UI component | `AnalyticsUserFilter.tsx` | Pass `renderOption` with name+email layout |
| UI component | `ActivityEventsPage.tsx` | Change width classes to `w-80` |
| UI component | `UsersManagementFilters.tsx` | Change width classes to `w-80` |

### Integration Points

- `AnalyticsFilters.tsx` → `AnalyticsUserFilter.tsx` (props: `userOptions`, `isAdmin`, `onSearchChange`)
- `AnalyticsFilters.tsx` → `userStore.getAnalyticsUsers` (Valtio store)
- `userStore.getAnalyticsUsers` → `GET /v1/analytics/users` (backend API)
- `analytics.py` router → `AnalyticsService` → `UserHandler.get_users_list`
- `UserHandler.get_users_list` → `user_repository.aquery_active_users` (PG, admin) or `MetricsElasticRepository` (ES)
- `AnalyticsUserFilter.tsx` → `MultiSelect` wrapper → PrimeReact MultiSelect

### Patterns and Conventions

- Custom item templates in MultiSelect are supplied via `renderOption` prop on the wrapper component (not PrimeReact's `itemTemplate` directly)
- `formatUserOptions` is the canonical user option shape builder; any new fields on the option object need to flow through it
- `createdBy()` in `helpers.ts` is used for the display label; email is a separate field, not part of the label string
- Tailwind `w-80` = 320px (80 × 4px) — consistent with existing pattern of fixed-width filter containers
- Feature flag `useUserManagementEnabled()` + `isAdminPgSearch` gate server-side search path

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `codemie-ui-next/.ai-run/guides/styling/styling-guide.md` — Tailwind width conventions; `w-80` is the correct class for 320px
- `codemie-ui-next/.ai-run/guides/` — architecture, components, development, patterns, standards, styling, testing subdirs present

### Architectural Decisions

- Prior spec: `docs/superpowers/specs/2026-05-28-analytics-users-filter-race-condition-design.md` — confirms `getAnalyticsUsers` / `AnalyticsFilters.tsx` architecture; `userStore.getAnalyticsUsers()` is the single data entry point for user options

### Derived Conventions

- Option objects in filter components carry `{ label: string; value: string }`. For the email fix the shape must be extended to `{ label: string; value: string; email?: string }` — this is additive and backward-compatible.
- Administration filter container widths are set as Tailwind classes directly on the wrapper `<div>` — no shared width constant or CSS variable.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx` — covers Me checkbox behavior, add/remove current user, enable/disable across option refresh cycles; uses `@testing-library/react` + Vitest; **no tests for email search or email item template**
- `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx` — integration tests for AnalyticsFilters; **no email search coverage**
- `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx` — covers ActivityEventsPage; **no width assertions**

### Testing Framework and Patterns

- Frontend: Vitest + `@testing-library/react`; `vi.hoisted` + `vi.mock` for store mocking; `render/rerender` with `waitFor` for async state
- Backend: pytest; standard FastAPI test client patterns

### Coverage Gaps

- No test for email-based search result display in `AnalyticsUserFilter`
- No test for custom item template (name on top, email below)
- No test for `formatUserOptions` preserving email field
- No backend unit test verifying `UserListItem` includes email
- No width assertions in administration page tests

---

## 5. Configuration and Environment

### Environment Variables

- `ENABLE_USER_MANAGEMENT` — backend config; gates the super-admin PG path in `UserHandler.get_users_list`; gates `isAdminSearch` in `AnalyticsFilters.tsx` via `useUserManagementEnabled()` hook
- `VITE_API_BASE_URL` — UI env; API base URL

### Configuration Files

- `codemie/.env.example` — backend env vars template
- `codemie-ui-next/.env` — UI env (API base URL)

### Feature Flags and Deployment Concerns

- `useUserManagementEnabled()` — React hook; when false, admin falls back to client-side filter (no server-side email search). Email display in item template should work regardless of this flag.
- `isAdminPgSearch` — `isAdminSearch && !hasSelectedProjects`; when a project filter is selected, server-side search is disabled entirely. Email must also display correctly in this client-side path.
- No deployment concerns — purely a data shape change (additive: `email` optional field) and CSS class changes.

---

## 6. Risk Indicators

- **Backend ES path has no email**: `aquery_active_users` is the PG path and has email. The ES aggregation path in `user_handler.py` uses `MetricsElasticRepository` which aggregates `user_id` and `user_name` buckets — no email field available. This means email display will only work for admin (PG path) users. Non-admin or ES-backed instances will have `email: null` in options. The render template must handle missing email gracefully.
- **Option shape extension**: `formatUserOptions` returns `{ label: string; value: string }`. Changing this to include `email?: string` is additive, but call sites that spread or destructure options must not break. The MultiSelect wrapper accepts `any[]` for options so no TypeScript breakage expected, but type definitions need updating.
- **MultiSelect client-side filter**: When `isAdmin=false` (no `onFilter` callback), PrimeReact MultiSelect filters by `label` string. If email is not in the label, searching by email in client-side mode won't filter results. The ticket says "search by email" — clarify if this is admin-only (server-side) or must also work client-side. If client-side, `filterBy` prop on MultiSelect must include an email field, or email must be included in the label.
- **Width changes affect layout**: Changing `w-44`/`w-48`/`w-52` to `w-80` widens containers significantly (from 176–208px to 320px). If the filter bar has limited horizontal space this may cause wrapping. No flex/grid container constraints were found but should be verified visually.
- **`BudgetsManagementPage.tsx` scope**: The ticket explicitly names Budget, Project, Domain, Event type, Entity type dropdowns. `BudgetsManagementPage.tsx` has a Category filter at `w-56` — this may or may not be in scope; confirm against the ticket screenshots.

---

## 7. Summary for Complexity Assessment

This task spans two repos and two distinct bugs. **EPMCDME-14070** is a multi-layer data flow fix: the backend `UserListItem` Pydantic model must gain an `email` field; `user_handler.py` must populate it from the `UserDB.email` field already returned by `aquery_active_users`; the frontend store utility `formatUserOptions` must thread the email through; and `AnalyticsUserFilter.tsx` must render a two-line item template (name primary, email secondary with `text-xs` dimmed styling) using the existing `renderOption` prop on the `MultiSelect` wrapper. The change is additive — no existing API consumers break since `email` is a new optional field. The ES path will return `null` email and the template must handle that gracefully.

**EPMCDME-14078** is a pure CSS change: swap Tailwind width utility classes from `w-44`/`w-48`/`w-52` to `w-80` on five filter container elements across two administration pages (`ActivityEventsPage.tsx` and `UsersManagementFilters.tsx`). No logic changes required. The risk is visual layout overflow if the filter bar is constrained; this should be verified in the browser.

Test coverage gaps exist for both fixes: there are no tests for email display in the item template, no test for email-preserved option shapes, and no width assertions in the administration page tests. TDD for the email path (unit tests for `formatUserOptions` with email, and a render test for the item template) is straightforward. Width changes are typically verified visually rather than by unit tests, though a snapshot or style attribute check could be added.
