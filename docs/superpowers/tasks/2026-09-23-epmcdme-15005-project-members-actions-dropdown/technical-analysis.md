# Technical Research

**Task**: project members list analytics tab filters project user preselection navigation deep-link url query params
**Generated**: 2026-09-15
**Research path**: filesystem

---

## 1. Original Context

Project manager/admin wants a member link/button in each entry of the Project members list that navigates the user to the Analytics tab with the corresponding set of filters preselected: project preselection, user preselection, and everything else needed so the manager or admin can see the analytics for that specific project member.

---

## 2. Codebase Findings

### Existing Implementations

**Source side: Project members list**

- `src/pages/settings/administration/ProjectDetailsPage.tsx`: route `projects-management-detail` (`/settings/administration/projects/:projectName`). It reads `projectName` from `useVueRouter().params`. For non-personal projects it renders `<ProjectMembersManager project={project} ... />` (lines 317-327). Role flags: `isAdmin`, `isMaintainer`, `isAuditor`, `isProjectAdmin = currentUser.applicationsAdmin.includes(project.name)` (line 99).
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` (774 lines) owns the "Project members" table.
  - Rows are `UserListItem[]`, fetched with `userStore.getUsers({ filters: { projects: [project.name], search, platform_role } })` (lines 277-293).
  - `getColumnDefinitions(canManage, showBudgets)` (lines 131-197) builds these columns: `select` (only if canManage), `user`, `role`, `budgets` (only if budgets exist), `actions` (only if canManage). The column widths are hard-coded Tailwind percentages that depend on those two flags.
  - Cells are rendered by `customRenderColumns` (lines 524-617):
    - `user`: avatar, `user.name`, `user.email`
    - `role`: a `Select`
    - `budgets`: `UserBudgetsCell`
    - `actions`: an "Unassign" `Button` wrapped in a `div` that calls `stopPropagation`
  - Permissions: `isAdmin = currentUser.isAdmin`, `isProjectAdmin = !isAdmin && applicationsAdmin.includes(project.name)`, `canManageProject = isAdmin || isProjectAdmin` (lines 247-250).
  - The component already calls analytics: `analyticsStore.fetchProjectMemberSpending(project.name)` (line 362).
- `src/pages/settings/administration/projectsManagement/ProjectMembersFilters.tsx`: search and role filter for the members table. It is local state and does not touch the URL.
- `src/types/entity/user.ts:52` defines `UserListItem` with `id`, `name | null`, `username`, `email`, `projects: UserAssignedProject[]` (each has `is_project_admin`), and other fields.

**Target side: Analytics page**

- `src/router.tsx:596-605` defines the route `id: ANALYTICS` (`'analytics'`) at path `analytics`, wrapped in `<FeatureGuard featureFlag={FEATURE_FLAGS.ENTERPRISE_EDITION}>`. The router is `createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })` (`src/router.tsx:716`).
- `src/constants/routes.ts:50` has `ANALYTICS = 'analytics'` and `:65` has `PROJECTS_MANAGEMENT_DETAIL`.
- `src/pages/analytics/AnalyticsPage.tsx`:
  - The active tab comes from `useSearchParams().get('tab') ?? AnalyticsDashboard.insights` (line 60).
  - Filters come from `useAnalyticsFilters()` (line 56).
  - The sidebar `<AnalyticsFilters>` is hidden when the tab is `leaderboard` (line 128).
  - Tab gating:
    - CLI Analytics: `(isAdmin || isProjectAdmin) && 'features:cliAnalytics'`, where `isProjectAdmin = user.projects.some(p => p.is_project_admin)`.
    - Adoption: admin or auditor.
    - Leaderboard: admin or auditor, plus `aiChampionsLeaderboard`.
    - Custom dashboards: `feature:dashboardCustomization`.
- `src/types/analytics.ts`:
  - `AnalyticsDashboard` enum (line 21): `insights`, `cliInsights`, `leaderboard`, `adoption`, `cliAnalytics`.
  - `TimePeriod` enum (line 33): `last_hour` … `last_year`.
  - `AnalyticsQueryParams` (line 77): `time_period?`, `start_date?` (ISO 8601), `end_date?`, `users?: string[]` (commented "Array of user emails"), `projects?: string[]` (project names).
- `src/pages/analytics/constants.ts`: `DEFAULT_FILTERS = { time_period: TimePeriod.LAST_HOUR }` and `TIME_PERIOD_OPTIONS`.
- `src/pages/analytics/hooks/useAnalyticsFilters.ts`:
  - Initial state is `useState(getFilters(FILTER_ENTITY.ANALYTICS))`, so the URL and storage are read once, at mount.
  - `handleFilterChange` calls `cleanObject`, then `setFilters(...)`, which writes both the URL and localStorage. An all-empty change resets to `DEFAULT_FILTERS`.
  - It exposes only `time_period`, `start_date`, `end_date`, `users`, `projects`.
- `src/utils/filters.ts`:
  - `knownFilterKeys.simple` includes `time_period`, `start_date`, `end_date`. `multiple` includes `users` and `projects`.
  - `getFilters` returns `{}` when `userStore.user?.userId` is absent. Otherwise it merges **per key**, with a URL value winning over the localStorage value (`filters_analytics`, per-user key).
  - `getFiltersFromUrl` reads `window.location.search` and uses `getAll` for multiple keys, so repeated `?users=a&users=b` is expected.
  - `updateUrlWithFilters` keeps only `tab` from the current URL, then appends the filters via `replace({ query })`.
- `src/pages/analytics/components/AnalyticsFilters.tsx`:
  - Keeps `localFilters` synced from props. Changes are debounced by 2000 ms (leading and trailing).
  - `ProjectSelector multiple` sets `projects`. `AnalyticsUserFilter` sets `users`.
  - User options come from `userStore.getAnalyticsUsers(userListFilters)`, where the filters are time, date and projects without users.
  - `isAdminPgSearch = (isAdmin || isAuditor) && userManagementEnabled && !hasSelectedProjects`. In that mode no list is loaded until a search runs, and the seed search term is the current user's email.
  - The "Clear all" button shows when `hasNonDefaultFilters` is true.
- `src/pages/analytics/components/AnalyticsUserFilter.tsx`:
  - `displayValue` filters the selected `value` down to ids present in the loaded options or the "sticky" options (lines 139-142). Ids not in the options are not shown in the MultiSelect.
  - The "Me" checkbox matches an option `value` against `currentUser.userId`, `username`, or `name` (lines 62-69).
- `src/pages/analytics/components/AnalyticsDashboard.tsx`:
  - `handleTabChange` calls `setSearchParams({ tab: tabId })` (line 94). This replaces the whole query string with only `tab`.
  - Tabs receive `filters` as a prop.
  - The adoption overview uses only `filters.projects`.
- `src/pages/analytics/components/cli-analytics/hooks/params.ts`: `buildCliAnalyticsParams` joins `users` and `projects` with commas for the CLI analytics API.

**User identifier used by the analytics `users` filter (inconsistent in current code)**

- `src/utils/user.ts:57` `formatUserOptions`: an option's `value` is the `id` field returned by `GET v1/analytics/users` (`src/store/user.ts:223-236`). Test fixtures use values like `'user-123'`.
- `src/store/analytics.ts:490-499` `fetchUserProjectSpending(userEmail)` sends `{ users: [userEmail] }`. It is called from `UserProjectSpendingTable.tsx:106`.
- `src/pages/analytics/components/cli-analytics/views/UsersView.tsx:197` builds `sessionFilters: { ...filters, users: [row.user_id] }`.
- `src/types/analytics.ts:82` comments `users` as emails.

**Existing links between pages, and the router API**

- `src/hooks/useVueRouter.ts`: `router.resolve({ name, params, query })` returns `{ href, fullPath, path, searchParamsString }`, and `router.push({ name, params, query })` navigates. `createSearchParamsString` writes array values as repeated keys.
- `src/pages/settings/administration/usersManagement/components/UserProjectSpendingTable.tsx:59-71` has `ProjectLinkCell`: `router.resolve({ name: PROJECTS_MANAGEMENT_DETAIL, params })` → `<Link to={href} className="text-text-primary ... hover:underline">`. This is an existing link from an admin table cell to another admin page.
- `src/pages/analytics/AnalyticsPage.tsx:85` and `ProjectDetailsPage.tsx:131` use `router.push({ name, params })` for navigation.
- `src/pages/workflows/utils/getWorkflowLink.tsx:22` builds `?tab=` URLs.
- No code outside `src/pages/analytics/` navigates to the Analytics route with a query string. The only external entry is the sidebar navigation (`src/components/Navigation/Navigation.tsx:130-137`), with no query.

### Architecture and Layers Affected

- **Page / UI component layer, settings administration**: `ProjectMembersManager.tsx` (column definitions and `customRenderColumns`), rendered by `ProjectDetailsPage.tsx`.
- **Routing / navigation layer**: `src/router.tsx` (the `ANALYTICS` route and its `FeatureGuard`), `src/constants/routes.ts`, `src/hooks/useVueRouter.ts` (`resolve`/`push` with `query`).
- **Analytics filter state layer**: `src/pages/analytics/hooks/useAnalyticsFilters.ts` and `src/utils/filters.ts` (URL plus per-user localStorage).
- **Analytics UI layer**: `AnalyticsPage.tsx` (reads `tab`), `AnalyticsFilters.tsx`, `AnalyticsUserFilter.tsx`, `AnalyticsDashboard.tsx` (rewrites the query on tab change).
- **Store / API layer, read paths only**: `userStore.getUsers` (members), `userStore.getAnalyticsUsers` (`v1/analytics/users`, user-filter options), `userStore.getProjects` (via `ProjectSelector`), `analyticsStore.fetchProjectMemberSpending`.

### Integration Points

- `ProjectMembersManager` → `userStore.getUsers` (`v1/users`-style paginated list), `analyticsStore.fetchProjectMemberSpending` (`v1/analytics/project-member-spending`-type tabular metric), `projectBudgetsStore`.
- `AnalyticsFilters` → `userStore.getAnalyticsUsers` → `GET v1/analytics/users` (params: time_period, start_date, end_date, projects, optional search; `queryParamArrayHandling: 'compact'`).
- `ProjectSelector` (`src/components/ProjectSelector/ProjectSelector.tsx:67-69`) → `userStore.getProjects(search, adminOnly=false)`. Options are `{ label: formatProjectLabel(project), value: project.name }`.
- Analytics tabs (`InsightsTab`, `CLIInsightsTab`, `CliAnalyticsTab`, `AIAdoptionTab`, `CustomDashboard`) → `analyticsStore` / `cliAnalyticsStore`. Each receives `filters: AnalyticsQueryParams`.
- Dependency direction: `pages/settings/administration/projectsManagement` → `store/analytics` already exists. There is no import from `pages/settings` into `pages/analytics` or the reverse. Both import from `@/constants/routes`, `@/hooks/useVueRouter`, and `@/types`.

### Patterns and Conventions

- Route references go through route-ID constants (`@/constants/routes`) and `useVueRouter().resolve/push({ name, params, query })`, not raw strings.
- Links from table cells use `Link` from `react-router` with an `href` from `router.resolve(...).fullPath` (`ProjectLinkCell`).
- Table columns use `ColumnDefinition` with `DefinitionTypes.Custom`, rendered through the `customRenderColumns` map keyed by column `key`. Cells with interactive elements call `stopPropagation` on click and keydown.
- Analytics filter state lives in the URL query plus localStorage via `getFilters`/`setFilters`, keyed by `FILTER_ENTITY.ANALYTICS`, with array params as repeated keys.
- Role checks happen inside components with `useSnapshot(userStore)` (`isAdmin`, `applicationsAdmin`, `user.projects[].is_project_admin`). Whole features are gated by `FeatureGuard` / `isEnterpriseEdition()`.
- Buttons use `@/components/Button` with `ButtonSize` / `ButtonType`. Tooltips use `data-tooltip-id="react-tooltip"` and `data-tooltip-content`.
- Every source file starts with the Apache 2.0 license header (enforced by `npm run license-headers:check`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `AGENTS.md` / `CLAUDE.md`: guide index, and critical rules (tests only when asked, gates run individually, a prettier/eslint PostToolUse hook).
- `.ai-run/guides/architecture/routing-patterns.md`: route IDs in `src/constants/routes.ts`, `Link`/`useNavigate`, and query params through `useSearchParams` (react-router), or the custom `@/hooks/useSearchParams` for persistent list filters. **It is stale on the router type.** It says `createHashRouter` ("all paths live inside `#/`"), but `src/router.tsx:716` uses `createBrowserRouter` with a `basename`. Its line references (`src/router.tsx:517`, `:567` `isEnterpriseEdition() ? analyticsRoutes : []`) also no longer match. Analytics routes are now spread unconditionally and gated by `FeatureGuard`.
- `.ai-run/guides/architecture/architecture.md:160`: convention of a feature-scoped `get<Feature>Link.ts` URL builder in `utils/`.
- `.ai-run/guides/development/security-patterns.md` § "Navigation built from untrusted input": a string from `window.location`, a query parameter, or an API response is not a path. Strip leading `/` and `\` before putting it into a URL. The precedent is `src/utils/redirectHashRoutes.ts`.
- `.ai-run/guides/components/component-patterns.md:175`: buttons and links need visible text or an `aria-label`.
- `.ai-run/guides/testing/testing-patterns.md`: Vitest with two projects (`unit`: `*.test.tsx`; `integration`: `*.integration.test.tsx`). `SettingsLayout` and `useVueRouter` are mocked globally in `setupTests.tsx`.
- Prior analytics-filter work docs:
  - `docs/superpowers/plans/2026-05-28-analytics-users-filter-race-condition.md`
  - `docs/superpowers/plans/2026-06-02-analytics-me-filter-persistence.md`
  - `docs/tasks/2026-06-11-hide-me-checkbox-analytics/{spec,plan}.md`
  - `docs/superpowers/plans/2026-08-13-epmcdme-14071-user-project-spending.md` (introduced the user↔project spending link table)

### Architectural Decisions

- Filter precedence is recorded in code (`src/utils/filters.ts`, `getFilters` docstring): "Priority: URL filters > storage filters", merged per key.
- `updateUrlWithFilters` always preserves `tab`, and `clearUrlFilters` keeps `PRESERVED_PARAMS = ['tab']`.
- Admin user search in analytics is server-side (EPMCDME-10930 auditor, EPMCDME-12721 keep selected users on project change, both in `AnalyticsFilters.test.tsx`). Admins get no user list until they search unless a project is selected.
- `AnalyticsUserFilter.tsx:137-138` comment: "Only show IDs that have a known option — prevents null labels for users whose options haven't been loaded in this session yet."
- Budget and chargeback access rules are recorded as `resolveBudgetsAccess` in `ProjectDetailsPage.tsx:67-79`.
- No TODO / HACK / NOTE / FIXME markers in `AnalyticsPage.tsx`, `AnalyticsFilters.tsx`, `hooks/useAnalyticsFilters.ts`, `utils/filters.ts`, `ProjectMembersManager.tsx`, or `ProjectDetailsPage.tsx`.
- `CHANGELOG.md` has no entries mentioning analytics or project members.

### Derived Conventions

- The URL contract the Analytics page reads today is `/analytics?tab=<AnalyticsDashboard|dashboardId>&projects=<name>&users=<id>&time_period=<TimePeriod>&start_date=<ISO>&end_date=<ISO>`, with repeated keys for arrays. It is parsed at mount by `getFiltersFromUrl`.
- A project in analytics filters is identified by `project.name`, not `display_name`, both in `ProjectSelector` option values and in `fetchProjectMemberSpending`.
- Links between admin pages use `router.resolve` + `<Link>` (`ProjectLinkCell`). Actions inside the page use `router.push`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx`: page-level unit test. It mocks `ProjectMembersManager` (asserting props via `projectMembersManagerMock`), `ProjectBudgetsSection`, `useVueRouter` (`push`, `params`), `SettingsLayout`, `useFeatureFlags`, and `userStore`.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx`: renders the real `ProjectMembersManager`, spies on `userStore.getUsers` and `analyticsStore.fetchProjectMemberSpending`, and covers only the budgets/spending column. It imports `@/test-utils/integration` first, but its filename matches the `unit` project pattern.
- `src/pages/analytics/__tests__/AnalyticsPage.test.tsx`: Edit Dashboard visibility per tab and the CLI Analytics gate (admin, project admin, flag). It mocks `useSearchParams`, `useAnalyticsFilters` (returns `{}` filters), `AnalyticsFilters`, and `AnalyticsDashboard`.
- `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx`: user-load race and abort handling, auditor server-side search, admin search (2+ characters), keeping selected users on project change (EPMCDME-12721), and clearing the search.
- `src/pages/analytics/components/__tests__/AnalyticsUserFilter.test.tsx`: Me checkbox behaviour against the options list.
- `src/utils/__tests__/filters.test.ts`: `getChangedKeys`, `getInitialAssistantFilters`, `checkEmptyFilters`, `createEmptyFilters` only.
- `src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx`: user-project spending flow. It has no assertions on `ProjectLinkCell` hrefs.

### Testing Framework and Patterns

- Vitest (guide states 1.6.1) + React Testing Library + jsdom. The workspace is `vitest.workspace.ts`, with `unit` (setup `src/setupTests` + `src/setupTests.unit`) and `integration` (custom env `vitest-env-integration.ts`, 30 s timeout).
- Global mocks in `src/setupTests.tsx`: `SettingsLayout`, `@/hooks/useVueRouter` (→ `src/hooks/__mocks__/useVueRouter.ts`), `NavigationPinnedSection`, `toaster`.
- In `src/hooks/__mocks__/useVueRouter.ts`, `resolve` returns `path || '/' + name` and **ignores `query` and `params`**. `push` and `replace` are `vi.fn()`.
- `src/test-utils/integration.tsx`: `mockAPI(method, url, data, statusOrParams)` registry, a `createMemoryRouter(routes)` render helper, and a re-exported `navigate` spy.
- Common patterns: `vi.hoisted` store mocks, `vi.mock('valtio', ... useSnapshot: store => store)`, `vi.spyOn(store, method).mockResolvedValue(...)`, and ticket IDs in `describe`/`it` names.

### Coverage Gaps

- `ProjectMembersManager` column composition (`getColumnDefinitions`), the `user`/`role`/`actions` cells, and role gating (`canManageProject`, `isProjectAdmin`) have no tests. Only the budgets column is covered.
- `useAnalyticsFilters` has no test, including initial state from URL versus localStorage.
- `getFilters`, `getFiltersFromUrl`, `setFilters`, and `updateUrlWithFilters` in `src/utils/filters.ts` have no tests.
- `AnalyticsPage` tests mock `useAnalyticsFilters`, so nothing tests the path from URL to sidebar filter values.
- `AnalyticsDashboard.handleTabChange` (query replacement) has no test.
- `AnalyticsUserFilter` has no test for a preselected `value` whose id is absent from the options (`displayValue` filtering).

---

## 5. Configuration and Environment

### Environment Variables

- `import.meta.env.BASE_URL`: router `basename` (`src/router.tsx:716`). It also prefixes `useVueRouter().resolve(...).href` via `getRootPath()`.
- No env vars are specific to project members or analytics filters. `VITE_API_URL` / `window._env_.VITE_API_URL` (`src/utils/api.ts:143`) is the API base for all calls.

### Configuration Files

- `src/constants/featureFlags.ts`: `ENTERPRISE_EDITION: 'features:enterpriseEdition'`.
- `src/constants/routes.ts`: route IDs (`ANALYTICS`, `PROJECTS_MANAGEMENT_DETAIL`).
- `src/pages/analytics/constants.ts`: `DEFAULT_FILTERS`, `TIME_PERIOD_OPTIONS`.
- `src/utils/filters.ts`: `knownFilterKeys` (the URL schema) and the `FILTER_ENTITY.ANALYTICS = 'analytics'` storage key.
- `src/utils/storage.ts`: per-user `localStorage` compound keys (`put`, `getObject`, `remove`).

### Feature Flags and Deployment Concerns

- `features:enterpriseEdition`: gates the `/analytics` route (`FeatureGuard`, `src/router.tsx:601`) and the sidebar Analytics item (`isEnterpriseEdition()`, `Navigation.tsx:131`). The project details page and members list are not behind this flag.
- `features:cliAnalytics`: the CLI Analytics tab, for admin or project admin.
- `aiChampionsLeaderboard`: the Leaderboard tab, for admin or auditor. That tab hides the filter sidebar.
- `feature:dashboardCustomization`: custom dashboard tabs.
- `features:costCenters`, `features:projectChargeback`, and budget management flags affect `ProjectDetailsPage` / `ProjectMembersManager` layout (the budgets column changes column widths).
- User-management flag (`useUserManagementEnabled`): switches analytics user search to server-side for admins and auditors.
- No deployment manifest, Dockerfile, nginx, or secrets changes reference these areas. The app is served from a prebuilt `dist/`.

---

## 6. Risk Indicators

- **The user identifier for the analytics `users` filter is inconsistent in current code.** Option values are `id` from `v1/analytics/users` (`src/utils/user.ts:57`). `fetchUserProjectSpending` sends an email (`src/store/analytics.ts:495`). CLI `UsersView` sends `row.user_id` (`UsersView.tsx:197`). The type comment says emails. `AnalyticsUserFilter` matches against `userId`, `username`, or `name`. The members table row has `UserListItem.id`, `email`, and `username`. Speculative: the identifier the link puts in `users` has to be confirmed against the backend, or against a live `v1/analytics/users` response, before spec.
- **Stored filters bleed into the preselected link.** `getFilters` (`src/utils/filters.ts`) merges URL and localStorage per key, so any key the link omits (`time_period`, `start_date`, `end_date`, or a stale `users`/`projects`) comes from the viewer's last analytics session. Stored `start_date`/`end_date` can coexist with a URL `time_period`. Speculative: "everything else needed" in the ticket likely means deciding every filter key explicitly, including the time window.
- **Preselected user may be invisible in the sidebar.** `AnalyticsUserFilter.displayValue` (lines 139-142) drops ids not among the options loaded from `v1/analytics/users`, which are filtered by time window and project. A member with no activity in the window is still sent to the API but shows no chip. The default window is `last_hour`.
- **The query string is lost on tab switch.** `AnalyticsDashboard.handleTabChange` calls `setSearchParams({ tab })`, which removes `projects`/`users` from the URL. The in-memory state and localStorage keep them, so a shared or bookmarked URL no longer matches what is on screen.
- **Filters are read once, at mount, and need the user to be loaded.** `useAnalyticsFilters` uses a `useState` initializer. `getFilters` returns `{}` when `userStore.user?.userId` is unset. Not verified whether `App` guarantees the user is loaded before `AnalyticsPage` mounts on a hard load or new tab.
- **Role and tab visibility do not line up.** The members list treats admin or `applicationsAdmin`-project-admin as manager. Analytics tabs gate differently: CLI Analytics is admin or any project admin plus a flag, Adoption and Leaderboard are admin or auditor, and the Leaderboard tab has no filter sidebar. Maintainers and auditors see the members list without the `actions` column. Whether the backend lets a project admin query another user's analytics cannot be verified from this repository. Speculative: which target tab and which roles see the control are spec decisions.
- **Enterprise-edition mismatch.** `/analytics` sits behind `FeatureGuard(ENTERPRISE_EDITION)` but the members list does not, so a link on a non-EE deployment lands on the guard.
- **Column layout is fragile.** `getColumnDefinitions` in `ProjectMembersManager.tsx:131-197` hard-codes width percentages for four flag combinations (`canManage` × `showBudgets`), and the `actions` column exists only when `canManageProject`.
- **The routing guide is stale.** `.ai-run/guides/architecture/routing-patterns.md` describes `createHashRouter` and old line numbers, while `src/router.tsx:716` uses `createBrowserRouter`. Following its "hash quirk" advice would mislead.
- **The test mock hides query strings.** The global `useVueRouter` mock's `resolve` ignores `query` and `params` (`src/hooks/__mocks__/useVueRouter.ts`), so href assertions that include a query need a local override. There is no existing test of filter parsing from the URL (`getFilters`, `useAnalyticsFilters`).
- **Security.** Project names and user identifiers go into a query string. Per `security-patterns.md`, values from query params are not paths. Route-ID based `resolve` with `query` encodes them through `URLSearchParams`.

---

## 7. Summary for Complexity Assessment

The task spans two areas that are not connected today. The source is the Project members table in `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx`, rendered by `ProjectDetailsPage.tsx`. The target is the Analytics page (`src/pages/analytics/AnalyticsPage.tsx`), which reads `?tab=` and filter query params through `useAnalyticsFilters` → `src/utils/filters.ts`. The layers touched are a settings-administration UI component (table column and cell rendering), routing and navigation (`ANALYTICS` route ID, `useVueRouter.resolve/push` with `query`), and possibly the analytics filter state layer (`useAnalyticsFilters`, `AnalyticsFilters`, `AnalyticsUserFilter`, `AnalyticsDashboard`). No backend, store, or config files need to change to express a URL the Analytics page already parses (`projects`, `users`, `time_period`, `start_date`, `end_date`, `tab`). The smallest change surface is one or two components. Behavioural gaps on the Analytics side could widen it to four to six files.

The work is not technically novel. A table cell linking to another admin page already exists (`ProjectLinkCell` in `UserProjectSpendingTable.tsx`), and URL-driven filters are an established mechanism. The complexity is in several quiet interactions with existing filter behaviour:
- the analytics `users` identifier is inconsistent across call sites (analytics-user `id` vs email vs `user_id`);
- per-key merging with per-user localStorage lets stale time or date filters leak into a "preselected" view;
- the user MultiSelect hides preselected ids that are missing from the options for the current time window, and the default window is last hour;
- tab switching removes filter params from the URL;
- role gates differ between the members list (admin or project admin via `applicationsAdmin`) and the Analytics tabs (CLI Analytics, Adoption, Leaderboard), and `/analytics` is gated by enterprise edition while the members list is not.

Tests exist for the Analytics sidebar filters (race, auditor, admin search), `AnalyticsPage` tab gating, `ProjectDetailsPage` props, and the members budgets column. Untested: `ProjectMembersManager` column composition and role gating, `useAnalyticsFilters`, `getFilters`/`getFiltersFromUrl`/`updateUrlWithFilters`, and query replacement on tab change. The global `useVueRouter` test mock ignores `query`. The main risk factors are the unresolved user-identifier contract, which may need backend confirmation, and the stored-filter merge, which decides whether "everything else needed" is honoured reliably.

---

## 8. External References

None named by the task.
