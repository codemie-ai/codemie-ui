# Technical Research

**Task**: schedulers integrations creation routes navigation
**Generated**: 2026-09-15T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Implement a scheduler creation view similar to the Integrations creation view. 

The ticket is EPMCDME-15019. Requirements:
- Add routes /schedulers/project/new and /schedulers/user/new
- Reuse the integration creation UI but hide the integration field (always set to "scheduler")
- Title should be "New User Scheduler" or "New Project Scheduler" depending on route
- Logic should be similar to the Integrations view
- The current branch already has a Schedulers section with user/project type switch (EPMCDME-15020), cron input field (EPMCDME-14805), and a feature flag for Schedulers navigation (EPMCDME-15013)

---

## 2. Codebase Findings

### Existing Implementations

**Integration creation pages (direct model to follow):**
- `src/pages/integrations/NewProjectIntegrationPage.tsx` — project-scoped creation page using `projectSettingsStore.createProjectSetting()`, renders `SettingsForm` with `settingType="project"`, `hideActions={true}`. Title: "New Project Integration". Back navigates to `/integrations`.
- `src/pages/integrations/NewUserIntegrationPage.tsx` — user-scoped creation page using `userSettingsStore.createUserSetting()`, renders `SettingsForm` with no explicit `settingType` (defaults to `"user"`), `hideActions={true}`. Accepts `credentialType` and `project` from query params. Title: "New User Integration". Back navigates to `/integrations`.

**Shared SettingsForm component:**
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` — forwardRef component with a `SettingsFormRef` interface (`submit`, `validate`). Key props relevant to the task:
  - `credentialType?: string` — pre-selects and can lock the credential type (set to `"scheduler"` to fix it)
  - `disableType?: boolean` — disables the credential type dropdown (should be `true` to hide/freeze it to "scheduler")
  - `settingType?: 'user' | 'project'` — controls which integrations appear; also controls the "Global Integration" toggle visibility
  - `hideActions?: boolean` — hides inline form buttons (parent page provides its own)
  - `onCredentialValuesChange` / `onCredentialTypeChange` — callbacks for the parent page to react to form state
  - The Credential Type `Autocomplete` field (line 637) is the integration picker — it should be hidden for the scheduler creation view

**Scheduler store:**
- `src/store/schedulers.ts` — Valtio store with `Scheduler`, `SchedulerResource`, `SchedulerSchedule` types. Has `fetchSchedulers`, `toggleScheduler`, `deleteScheduler` methods. No `createScheduler` method is present yet — creation currently routes through `projectSettingsStore` / `userSettingsStore` (the Edit action in `SchedulersPage.tsx` also navigates to `/integrations/user/edit` with `credential_type: 'Scheduler'`).

**Schedulers list page:**
- `src/pages/schedulers/SchedulersPage.tsx` — renders a table with user/project type switch. The "Edit" action navigates to `/integrations/user/edit?credential_type=Scheduler`. The list page uses `schedulerType` (`IntegrationOption.USER | IntegrationOption.PROJECT`).

**Route definitions (`src/router.tsx`):**
- Integration routes (lines 260–279): `/integrations/user/new`, `/integrations/user/edit`, `/integrations/project/new`, `/integrations/project/edit`
- Scheduler routes (lines 305–321): `schedulers`, `schedulers/:schedulerId/runs`, `schedulers/:schedulerId/runs/:runId` — no creation routes exist yet

**Route constants (`src/constants/routes.ts`):**
- `SCHEDULERS = 'schedulers'` exists (line 47); `INTEGRATIONS` is also defined

**settingsUIConfig:**
- `src/utils/settingsUIConfig.ts` line 825: `scheduler` credential type is already defined with fields including `schedule` and a cron field

**Navigation:**
- `src/components/Navigation/Navigation.tsx` (line 137): scheduler navigation item routes to `schedulers`. Feature-flagged by `features:schedulersView` (from `Navigation.test.tsx` lines 213, 222).

### Architecture and Layers Affected

- **Routing layer** (`src/router.tsx`): Two new route entries needed for `schedulers/project/new` and `schedulers/user/new`
- **Page layer** (`src/pages/schedulers/`): Two new page components — `NewProjectSchedulerPage.tsx` and `NewUserSchedulerPage.tsx`
- **Constants layer** (`src/constants/routes.ts`): May need new route name constants (e.g. `SCHEDULERS_USER_NEW`, `SCHEDULERS_PROJECT_NEW`) for `navigateBack` targets
- **Store layer**: No store changes required for creation — creation goes through `projectSettingsStore.createProjectSetting` / `userSettingsStore.createUserSetting` (same as integrations)

### Integration Points

- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` — reused directly, with `credentialType="scheduler"` and `disableType={true}` to lock the integration field
- `src/store/projectSettings.ts` — `createProjectSetting()` method for project scheduler creation
- `src/store/userSettings.ts` — `createUserSetting()` method for user scheduler creation
- `src/constants/routes.ts` — `SCHEDULERS` constant already available for `navigateBack`
- `src/utils/helpers.ts` — `navigateBack()` utility used by integration pages

### Patterns and Conventions

- New page files follow the pattern `New{Scope}{Domain}Page.tsx` (e.g., `NewProjectIntegrationPage.tsx`)
- Pages use `useVueRouter()` from `@/hooks/useVueRouter` for navigation
- Creation pages use `<Sidebar>` + `<PageLayout showBack limitWidth>` layout
- `SettingsForm` is always rendered with `ref={formRef}`, `hideActions={true}`, with a Save button in `PageLayout`'s `rightContent` calling `formRef.current?.submit()`
- `navigateBack(ROUTE_CONSTANT)` is the standard back navigation pattern
- Both `OAuthTestAction` and `TestIntegration` are rendered conditionally in the right header — for scheduler creation these will likely be irrelevant but following the same pattern is low-risk
- Routes use `id` + `path` + `Component` shape; scheduler routes are in a `schedulerRoutes: RouteObject[]` array

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/routing-patterns.md` — governs how routes are defined and added
- `.ai-run/guides/components/component-patterns.md` — governs page component construction
- `.ai-run/guides/architecture/architecture.md` — places pages under `src/pages/` by product area

### Architectural Decisions

- Scheduler creation currently reuses the integrations edit route (`/integrations/user/edit?credential_type=Scheduler`) — this ticket introduces dedicated creation routes within the `schedulers` route group, following the same pattern as integrations
- The `scheduler` credential type already exists in `settingsUIConfig.ts`, meaning `SettingsForm` already renders its fields natively. No new credential type registration is needed.

### Derived Conventions

- Page components use named exports for the component and `export default` at the bottom
- License header (Apache 2.0) is prepended to every source file
- Post-save navigation for user integrations calls `navigateBack(ROUTE)`, for project integrations calls `router.push({ name: 'integrations' })` followed by a `setTimeout` refresh — the scheduler equivalent should navigate back to `schedulers`

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx` — covers the list page
- `src/pages/integrations/__tests__/IntegrationsPage.integration.test.tsx` — covers integration list
- No test files exist for `NewProjectIntegrationPage` or `NewUserIntegrationPage` specifically — the creation flow is not directly unit-tested

### Testing Framework and Patterns

- Vitest with React Testing Library, two projects: `unit` and `integration`
- Integration tests use `src/test-utils/integration.tsx` utilities
- Mocking via `vi.mock()`, fixtures via inline objects

### Coverage Gaps

- No existing tests for integration creation page components; same gap will exist for scheduler creation pages unless explicitly added
- No test for the new scheduler routes in the router

---

## 5. Configuration and Environment

### Environment Variables

- `window._env_` / `import.meta.env.VITE_*` — standard config access; no scheduler-specific env vars identified

### Configuration Files

- `src/utils/settingsUIConfig.ts` — contains the `scheduler` credential type definition with fields (schedule, cron). Already present on the branch.

### Feature Flags and Deployment Concerns

- `features:schedulersView` — controls Schedulers navigation visibility (EPMCDME-15013, already on branch). The creation routes should respect this flag (if the nav item is hidden, the creation routes would be unreachable via UI, but direct URL access is not gated).
- No additional feature flag needed for the creation routes themselves; the task description does not mention one.

---

## 6. Risk Indicators

- `SettingsForm` Credential Type `Autocomplete` field (line 637) — the task says to "hide" it. The `disableType` prop only disables the dropdown, not hides it. To truly hide it, a new prop `hideType?: boolean` would need to be added to `SettingsFormProps`, or the parent can pass `credentialType="scheduler"` with `disableType={true}` to achieve lock-in (visually still shows the locked field). Clarify whether "hide" means visually hidden or just non-editable.
- The `SettingsForm` also has a Credential Type section titled "Credential Type" in the Autocomplete label — fully hiding it may require a small addition to the component interface (low-complexity prop addition).
- No `createScheduler` method in `schedulersStore` — creation goes through `projectSettingsStore`/`userSettingsStore` as the underlying integration mechanism. This is consistent with how the Edit action in `SchedulersPage` works (using `credential_type: 'Scheduler'`), so this is expected behavior, not a gap.
- Post-save `setTimeout` in `NewProjectIntegrationPage` (line 57) refreshes the integration list — the scheduler creation equivalent should refresh `schedulersStore` instead. Verify the store has a `fetchSchedulers` method (it does, per the store file).
- The `useDeprecationRedirect` hook is called in integration creation pages — it checks `query.credentialType` for a deprecated type and redirects. This hook is integration-specific and should NOT be included in scheduler creation pages.
- The `OAuthTestAction` and `TestIntegration` buttons in the page header are rendered conditionally — for scheduler creation, `credentialType` will always be `"scheduler"`, which is not in `getTestableCredentialTypes()`, so these buttons will never appear. This is fine but the code will still import and call those functions unnecessarily. This is an acceptable pattern (follows the integration page template exactly).

---

## 7. Summary for Complexity Assessment

The task requires adding two new page components (`NewProjectSchedulerPage`, `NewUserSchedulerPage`) and two new route entries in `schedulerRoutes` in `src/router.tsx`. The pages are near-copies of `NewProjectIntegrationPage` and `NewUserIntegrationPage`, differing only in: (1) title text, (2) `credentialType="scheduler"` passed to `SettingsForm`, (3) back navigation pointing to `SCHEDULERS` instead of `INTEGRATIONS`, and (4) post-save store refresh calling `schedulersStore.fetchSchedulers()` instead of `projectSettingsStore.fetchProjectSettings()`. Estimated file surface: 4 files modified/created (2 new page files, 1 router change, possibly 1 route constants change).

The task follows established patterns exactly — the integration page structure is mature and well-understood. The only design decision is whether to add a `hideType` prop to `SettingsForm` (to visually remove the Credential Type dropdown) or to accept it as a locked/disabled field. This is a minor interface extension if needed. No new stores, API endpoints, or architectural patterns are introduced.

Test coverage for the new creation pages does not exist (matching the pattern of integration creation pages which also have no tests). The affected area (`src/pages/integrations/components/SettingsForm/`) has reasonable coverage for its own logic. The new pages themselves are thin orchestration layers that would need integration tests to validate the full create flow, but none are required by the ticket scope.
