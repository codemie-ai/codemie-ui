# Technical Research

**Task**: project members, users management, navigation filter
**Generated**: 2026-11-10
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16613
Project Members: Details opens Users management without the selected user filter

Summary
Project Members: Details opens Users management without the selected user filter.

Description
When someone clicks Details for a member on the Project Management page, Users management opens without carrying over that member's identity. The user must search for the member again, interrupting the workflow and losing context. The provided screenshots illustrate the unfiltered Users management page and the manually searched view of a user.

Preconditions
The user can access Project Management and Users management.
A project has at least one member.
Steps to Reproduce
Open the Project Management page.
Open a project's Members tab.
Click Details for a member.
Check the search field and results on the Users page.
Expected Result
Users management opens with the selected member's name prefilled in the search field, and the user list is filtered to that member.

Actual Result
Users management opens without a filter for the selected member.

Affected Areas
Project Management: Members tab and member Details action.
Users management navigation and search/filter state.
Acceptance Criteria
Clicking Details for a member opens Users management with that member's name prefilled in the search field.
The displayed user list is filtered to the selected member.
The selected user context is preserved through navigation and does not depend on a previous Users page search.
Existing Users management access permissions remain unchanged.

---

## 2. Codebase Findings

### Existing Implementations

**Purpose: navigate from a project-scoped member row to Users management, pre-filtered**

- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:787-799` — the bug site. The "Details" `NavigationMenuItem` (in the per-row kebab menu built at `:772-833`) has only `onClick: () => { if (isUserManagementEnabled()) router.push({ name: 'administration-users' }) else toaster.info(...) }`. No `query`/`params` are passed, so no filter survives the navigation. Gated by `hidden: !hasUsersTabAccess` (`:311`, `canAccessUsersTab(currentUser)`).
- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:528-539` (`buildUsersLink`) — **the precedent for this exact purpose, already shipped**, one level up (Projects list, not Members tab). Builds an `<a href>` via `router.resolve({ name: 'administration-users', query: { projects: [project.name] } })` and returns `path?searchParamsString`. Gated by the same `hasUsersTabAccess` check (`:526`). Consumed by the users-count badge render in that file.
- `src/utils/getAnalyticsMemberLink.ts:32-54` — a second, closely analogous precedent for carrying a *user* (not just a project) into another admin page via query string: builds `router.resolve({ name: ANALYTICS, query: { tab, projects: projectName, users: userId, ... } })` and returns `fullPath?searchParamsString`. Consumed as the `href` of the "View analytics" `NavigationMenuItem` built right next to "Details" in `ProjectMembersManager.tsx:778-785`.
- `src/pages/settings/administration/usersManagement/hooks/useUsersManagementFilters.ts:26-30,34-47` — reads the URL into the Users management filter state via `getFilters(FILTER_ENTITY.USERS_MANAGEMENT, USERS_FILTER_KEYS)`, where `USERS_FILTER_KEYS = { simple: ['search', 'platform_role'], boolean: ['is_active'], multiple: ['projects', 'budgets'] }`. URL values take priority over `localStorage` (`src/utils/filters.ts:89-132`, "Priority: URL filters > storage filters"). This is the mechanism that already makes `buildUsersLink`'s `?projects=...` work, and it already recognizes a `search` query param as a simple string filter.
- `src/pages/settings/administration/UsersManagementPage.tsx:94` (`useUsersManagementFilters()`) → `:500-505` passes `filters={effectiveFilters}` into `UsersManagementFilters`, and `src/pages/settings/administration/usersManagement/components/UsersManagementFilters.tsx:76-120` renders the search `<input>` bound to `localFilters.search` with a 500ms debounce before calling `applyFilters`/`onFilterChange`. So a `search` value seeded from the URL on mount is what would show up "prefilled in the search field."
- `src/store/user.ts:420-444` (`userStore.getUsers`) — consumes `filters.search` by appending it as the `search` query param to the `v1/admin/users` request (`:431-432`); this is the server-side filter that narrows "the user list" per the acceptance criteria.
- "None found" for a dedicated "navigate to user" helper keyed by user id/email rather than name — searched `grep -rn "administration-users"` (6 call sites total, listed below) and `grep -rn "UserListItem" src/pages/settings/administration/projectsManagement`; no existing code resolves a member row to a Users-management filter by id, only by project name (`buildUsersLink`) or by user id for Analytics (`getAnalyticsMemberLink`), not Users management.

### Decisions Already in the Code

- **Convention**: cross-page admin navigation that must carry filter state builds the target via `router.resolve({ name, query })` and either (a) assigns the result as the `href` of a `NavigationMenuItem` (`getAnalyticsMemberLink` usage at `ProjectMembersManager.tsx:782`), or (b) returns it from a `buildXLink`-style helper used as an `<a href>` (`ProjectsManagementFull.tsx:528-539`). The Details item is the only sibling menu item in the same file still using bare `onClick: () => router.push(...)` with no query — it is the outlier, not the pattern.
- **Convention**: filter keys that should prefill Users management are declared once in `USERS_FILTER_KEYS` (`useUsersManagementFilters.ts:26-30`) and consumed by `getFiltersFromUrl` (`src/utils/filters.ts:139-167`). `search` is `simple` (single `URLSearchParams.get`), `projects` is `multiple` (`URLSearchParams.getAll`). Any new query key must be added to one of these three arrays or `getFiltersFromUrl` silently drops it.
- **Decision — already resolved for project-scoped filtering, not reusable as-is for a single member**: EPMCDME-15637 (`docs/superpowers/tasks/EPMCDME-15637/implementation-plan.md`) describes an intent to standardize the frontend filter key to singular `project` (mapped to API `projects` at the store layer). That rename is **not** reflected in the current code: `UsersManagementFilters` (`src/pages/settings/administration/usersManagement/constants.ts:18-28`) still declares `projects: string[]`, and `USERS_FILTER_KEYS.multiple` still lists `'projects'`. `buildUsersLink` (current code) also still sends `projects`, plural. The implementation-plan doc is stale relative to the shipped code; treat the current `constants.ts`/`useUsersManagementFilters.ts` as the source of truth, not that doc.
- **Data already stored, but not in the shape "match one member" needs**: `getFilters`/`getFiltersFromUrl` filter *collections* (`search` substring match against name/email/username server-side, `projects` as an array of project names). There is no exact "this one user id" filter key read by Users management — `search` is the closest fit and is exactly what the acceptance criteria asks for ("name prefilled in the search field"), but it narrows by substring match, not identity; two members who share a display name would both appear.

### Task Statements Checked Against the Code

- "Users management opens with the selected member's name prefilled in the search field, and the user list is filtered to that member" — **holds as a mechanism, not yet wired for this entry point**: `UsersManagementFilters.tsx` already renders `search` from `filters.search` (`:120`), `useUsersManagementFilters` already seeds `filters.search` from the URL's `search` key (`USERS_FILTER_KEYS.simple`), and `userStore.getUsers` already sends it to the backend (`store/user.ts:431-432`). What's missing is purely the caller side: `ProjectMembersManager.tsx:791-797` never puts `search` (or any query) on the `router.push`.
- "The selected user context is preserved through navigation and does not depend on a previous Users page search" — **keeps an existing mechanism in place, same one the "holds" bullet above names**: URL filters already take priority over `localStorage`-persisted filters (`src/utils/filters.ts:120-127`, "Priority: URL filters > storage filters"), so a `search` query param set by the Details link already overrides whatever was previously typed/persisted for `FILTER_ENTITY.USERS_MANAGEMENT`, for any caller of this mechanism (`buildUsersLink`, `UsersManagementFilters` itself, and any future Details link).
- "Existing Users management access permissions remain unchanged" — **holds**: the Details item is already gated by `hidden: !hasUsersTabAccess` (`canAccessUsersTab(currentUser)`, `ProjectMembersManager.tsx:311,798`), independent of query params; passing a `search`/`projects` query does not touch `UsersManagementPage.tsx`'s own `isAdmin`/`canViewBudgets`/`canManageBudgets` gates (`:95-101`), which are unaffected by URL content.

### Consumers of Changed Contracts

- Everything that reads `USERS_FILTER_KEYS` / the `search` and `projects` URL params for `FILTER_ENTITY.USERS_MANAGEMENT`: `useUsersManagementFilters.ts` (sole reader), `UsersManagementFilters.tsx` (sole renderer of `filters.search`), `UsersManagementPage.tsx` (sole consumer of the hook). Adding a `search=<member name>` query param on navigation does not add a new reader — it feeds the existing one. No code treats an incoming `search` value as anything other than a user-editable string, so a name containing characters that collide with debounce/clear logic is already handled the same way manual typing is.
- `router.push({ name: 'administration-users' })` at `ProjectMembersManager.tsx:793` — searched `grep -rn "administration-users"` project-wide: the only other call sites are `ProjectsManagementFull.tsx:533` (`buildUsersLink`, href-based, unaffected) and the route id declaration (`router.tsx:607`, `constants/routes.ts:74`, `constants/pageTitles.ts:104`). No other code calls `router.push` to this route name, so changing this one call site's arguments has no other in-repo consumer to break.
- `NavigationMenuItem.onClick` vs `.href` (`src/components/NavigationMore/NavigationMore.tsx:42-43,228,245`) — both are supported on the same menu item type; the existing "View analytics" item on the same row already uses `href` (built by `getAnalyticsMemberLink`) while "Details" uses `onClick`. Either shape is a supported, already-exercised consumer path in this component; no missing capability here.

### Architecture and Layers Affected

- **Component layer**: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` — the Details menu item's `onClick`/`href` construction (`:787-799`) and its `useMemo` dependency array (`:835-855`, currently missing `router`'s resolve usage pattern the analytics item already needs — `router` is already a dependency at `:845`).
- **Utility layer**: a `getUsersMemberLink`-style helper analogous to `src/utils/getAnalyticsMemberLink.ts` would live in `src/utils/`, if the fix follows that precedent rather than inlining `router.resolve`/`router.push` in the component.
- **Routing layer**: no router/route-definition change — `administration-users` (`router.tsx:607`, `src/constants/routes.ts:74`) already exists and already accepts arbitrary query params (query is resolved generically by `useVueRouter`'s `resolve`/`navigate`, `src/hooks/useVueRouter.tsx:125-176`).
- **State layer**: no Valtio store change — filter seeding/persistence already flows through `src/utils/filters.ts` (`getFilters`/`setFilters`/`getFiltersFromUrl`), not a store.

### Integration Points

- Internal: `ProjectMembersManager` (Members tab) → React Router navigation (`useVueRouter`) → `UsersManagementPage` → `useUsersManagementFilters` → `src/utils/filters.ts` → `userStore.getUsers` → backend `GET v1/admin/users?search=...`. No external service integration beyond the existing `v1/admin/users` endpoint, which already accepts `search` (`store/user.ts:431-432`).

### Patterns and Conventions

- Build the destination with `router.resolve({ name, query })`, not a hand-built path string (both precedents, `getAnalyticsMemberLink.ts` and `buildUsersLink`, do this).
- Prefer a small named helper function for the link/query shape when the same shape could plausibly be reused or unit-tested in isolation (`getAnalyticsMemberLink` is exported and directly unit-testable; `buildUsersLink` is inline and only indirectly tested through `ProjectsManagementFull` tests).
- `NavigationMenuItem.hidden`/`disabled` carry the permission gate; the gate should not move into the link-building helper itself (both precedents keep the `hasUsersTabAccess`/`budgetsLoaded` checks on the menu-item object, not inside the href builder).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/routing-patterns.md` and `.ai-run/guides/patterns/state-management.md` are the P0/P1 guides for this task category per `AGENTS.md`'s Task Routing table (Routing / State rows) — not read in full here since the in-repo precedents (`getAnalyticsMemberLink`, `buildUsersLink`, `useUsersManagementFilters`) already demonstrate the concrete pattern end-to-end for this exact cross-page-filter scenario.

### Architectural Decisions

- `docs/superpowers/tasks/EPMCDME-15637/implementation-plan.md` records a prior decision to add project-scoped Users-management navigation from Projects Management (the `buildUsersLink` precedent) and an intent to rename `projects`→`project` that was not carried into the current `constants.ts`/`useUsersManagementFilters.ts` — see "Decisions Already in the Code" above.
- `docs/superpowers/tasks/2026-10-20-epmcdme-15687/technical-analysis.md` documents that the Projects Management "Full" page (where `buildUsersLink` lives) is itself gated by `isUserManagementEnabled` via `ProjectsManagementPage.tsx:28`, consistent with `ProjectMembersManager`'s own `isUserManagementEnabled()` check at the Details `onClick`.

### Derived Conventions

- See "Patterns and Conventions" above — derived directly from the two existing cross-page-filter-link implementations in this codebase, not from a guide.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx` — tests the sibling "View analytics" menu item's href shape by mocking `useVueRouter`'s `resolve` to encode `query` into a `?`-delimited string and asserting on it (`:39-60`). This is the directly reusable test pattern for a "Details" href/query assertion.
- No existing test exercises the "Details" menu item's `onClick`/navigation at all — `grep -i "Details"` across `src/pages/settings/administration/projectsManagement/__tests__/*` returns no hits tied to this menu item (only unrelated matches in `ProjectMembersPerPageRefresh.integration.test.tsx`, which is about an unrelated per-page bug).
- `src/pages/settings/administration/usersManagement/hooks/__tests__/useUsersManagementFilters.test.ts` exists and covers the filter hook itself (URL-priority-over-storage behavior), which the fix would rely on but not change.

### Testing Framework and Patterns

- Vitest + React Testing Library, two projects (`unit`, `integration`), per `AGENTS.md`/`.ai-run/guides/testing/testing-patterns.md`. Integration tests for this directory mock `@/hooks/useVueRouter` module-level (`vi.mock('@/hooks/useVueRouter', ...)`) to make `resolve`/`push` assertable, and mock `@/utils/toaster` to silence/observe toasts.

### Coverage Gaps

- The Details action itself (`ProjectMembersManager.tsx:787-799`) has zero existing test coverage — any fix here is new coverage, not a regression risk to existing tests, but also means there's no existing assertion to anchor a diff against; a new test following the `ProjectMembersViewAnalytics.integration.test.tsx` pattern would be the natural anchor.

---

## 5. Configuration and Environment

### Environment Variables

- None specific to this feature. `isUserManagementEnabled()` (`src/utils/featureFlags.ts:81`) reads from the generic feature-flag config described by `.ai-run/guides/development/api-integration.md`/the app's runtime `window._env_`/`import.meta.env` layers (per `AGENTS.md` "Configuration reaches the app twice"); not re-read in detail since this task does not change flag wiring.

### Configuration Files

- None specific; no `config/`, `.env`, or deployment manifest touches `search`/`projects` filter keys — they are pure frontend URL/localStorage state (`src/utils/filters.ts`).

### Feature Flags and Deployment Concerns

- `isUserManagementEnabled()` already gates the entire Details action's navigation branch (`ProjectMembersManager.tsx:792`) and the Projects Management "Full" page that hosts `buildUsersLink` (per `2026-10-20-epmcdme-15687/technical-analysis.md`). No new flag is implied by this task.

---

## 6. Risk Indicators

- The fix's natural shape (seed `search`/`projects` query params on the "Details" navigation) is an existing mechanism used for a different entry point (`buildUsersLink` in `ProjectsManagementFull.tsx:528-539`, `getAnalyticsMemberLink.ts`) — reusing/extending it is low-novelty, but see "Decisions Already in the Code" / `projects` vs `project` key drift: a plan doc (EPMCDME-15637) describes a rename that never shipped, so copying from that doc instead of the current `constants.ts` would reintroduce a dropped filter key.
- `search` matches by substring server-side (`store/user.ts:431-432`); if two project members share a name or one name is a substring of another's, "filtered to that member" will show more than one row. The ticket's acceptance criteria say "filtered to that member" (singular) but the only wired mechanism is a text search, not an id-exact filter — nothing in the code resolves a member row to an exact-match Users-management filter today.
- Zero existing test coverage for the "Details" menu item (see Coverage Gaps) — any change here needs new tests, there's nothing to extend.
- The `UsersManagementFilters` search input debounces 500ms before calling `applyFilters` (`UsersManagementFilters.tsx:76`); confirm (not verified here) that the *initial* render value from `useUsersManagementFilters`'s URL-seeded `filters.search` reaches `localFilters` without needing that debounce to fire, i.e. that mount-time prefill is immediate rather than debounce-delayed — this file's internal effect wiring was not traced beyond its read of `filters.search`.
- `UserListItem` member objects already carry `user.id`, `user.name`, `user.email` (used throughout `ProjectMembersManager.tsx`'s render, e.g. `:719-722`), so the data needed for either a `search=name` or a hypothetical `users=id` query param already exists in scope at the Details `onClick` — this is a fact about what's reachable, not a recommendation on which field to use.

---

## 7. Summary for Complexity Assessment

This task touches a single existing bug site — the "Details" `NavigationMenuItem.onClick` in `ProjectMembersManager.tsx:787-799`, which currently calls `router.push({ name: 'administration-users' })` with no query. Every supporting mechanism the fix needs already exists and is already exercised by sibling code in the same file and the same directory: `router.resolve({ name, query })` to build a filtered link (`getAnalyticsMemberLink.ts`, used one menu item above this one at `:782`), a second independent precedent for the exact "project → Users management" filter shape (`ProjectsManagementFull.tsx:528-539`'s `buildUsersLink`), and a filter-seeding pipeline (`useUsersManagementFilters.ts` → `src/utils/filters.ts` → `UsersManagementFilters.tsx` → `userStore.getUsers`) that already treats URL `search`/`projects` params as higher priority than persisted state. No router, store, or backend change is implied by anything found.

The main technical risk is not novelty but precision: the only wired "filter to that member" mechanism is a substring `search` match, not an exact-identity filter, so edge cases (duplicate/overlapping names) are a property of the existing search endpoint, not something this change can avoid without extending the contract. A secondary risk is documentation drift — a prior plan (EPMCDME-15637) describes a `projects`→`project` key rename that the shipped code does not reflect; using that doc instead of current `constants.ts`/`useUsersManagementFilters.ts` as the filter-key source would silently break the fix.

Test coverage for this exact action is currently zero, but a directly analogous integration test already exists for the sibling "View analytics" link (`ProjectMembersViewAnalytics.integration.test.tsx`) and is a ready template for mocking `useVueRouter` and asserting on the resolved href/query shape. Overall: one small, well-precedented component change plus new tests; low integration surface, low architectural novelty.

---

## 8. External References

None named by the task.
