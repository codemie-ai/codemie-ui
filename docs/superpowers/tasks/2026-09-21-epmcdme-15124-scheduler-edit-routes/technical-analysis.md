# Technical Research

**Task**: routing schedulers integrations edit
**Generated**: 2026-09-21
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15124 — Add separate URL routing for scheduler edit pages. Currently the scheduler edit action navigates to /integrations/<project|user>/edit. We need dedicated routes /schedulers/user/edit and /schedulers/project/edit that render the same view/component as the existing integration edit pages.

---

## 2. Codebase Findings

### Existing Implementations

- `src/router.tsx` — defines `integrationRoutes` and `schedulerRoutes` arrays, spread into the root route's `children`.
  - `id: 'edit-user-integration'`, `path: '/integrations/user/edit'`, `Component: EditUserIntegrationPage`
  - `id: 'edit-project-integration'`, `path: '/integrations/project/edit'`, `Component: EditProjectIntegrationPage`
  - No scheduler edit routes exist yet. Existing scheduler routes: `schedulers`, `schedulers/project/new`, `schedulers/user/new`, `schedulers/:schedulerId/runs`, `schedulers/:schedulerId/runs/:runId`.

- `src/pages/integrations/EditUserIntegrationPage.tsx` — reads query params `project_name`, `credential_type`, `alias` via `useVueRouter`. Calls `userSettingsStore.findUserSetting()`. On success/cancel calls `navigateBack(INTEGRATIONS)`.

- `src/pages/integrations/EditProjectIntegrationPage.tsx` — same pattern; uses `projectSettingsStore.findProjectSetting()`. On success/cancel calls `navigateBack(INTEGRATIONS)`.

- `src/pages/schedulers/SchedulersPage.tsx` (lines 208–218) — Edit action navigates with `router.push({ path: schedulerType === IntegrationOption.PROJECT ? '/integrations/project/edit' : '/integrations/user/edit', query: { project_name, credential_type: 'Scheduler', alias } })`. This is the single callsite that needs updating.

### Architecture and Layers Affected

- **Routing layer** (`src/router.tsx`): add two new route objects to `schedulerRoutes`.
- **Page/View layer** (`src/pages/integrations/`): the two existing edit pages will be reused directly — they accept no props, read everything from query params. Optionally thin wrapper pages could be created under `src/pages/schedulers/` if the `navigateBack` destination should differ.
- **Navigation callsite** (`src/pages/schedulers/SchedulersPage.tsx` line 211–212): update the two path strings.

### Integration Points

- `useVueRouter` hook — used by both edit pages and SchedulersPage for navigation and reading query params.
- `userSettingsStore` / `projectSettingsStore` — Valtio stores called by the edit pages; no change needed.
- `navigateBack(INTEGRATIONS)` in both edit pages — after save or cancel, the user is sent to `/integrations`. For a dedicated scheduler edit route, the back-navigation target should arguably be `SCHEDULERS`. This is a behavioural decision the task description does not resolve.

### Patterns and Conventions

- Route arrays are declared as `const xyzRoutes: RouteObject[]` in `src/router.tsx` and spread into the root's `children`.
- Route IDs follow kebab-case: `edit-user-integration`, `scheduler-project-new`.
- Absolute paths (`/integrations/user/edit`) used for integration edit routes; relative paths (`schedulers/project/new`) used for scheduler creation routes. Both styles work since all are under the root `/` route.
- Query params carry state between pages; no path params on edit routes.
- No `loader`, `FeatureGuard`, or auth wrappers on the integration edit routes or scheduler routes — they are plain `{ id, path, Component }` objects.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/routing-patterns.md` — project routing guide (not read in detail here; relevant for implementation).
- `.ai-run/guides/architecture/architecture.md` — architecture overview.

### Architectural Decisions

No ADRs specifically for this pattern were found. Routing conventions are derivable from existing route array structure.

### Derived Conventions

- Route objects: `{ id: string, path: string, Component: ComponentType }` — no extra wrapper needed.
- Route IDs for the new routes should follow: `scheduler-edit-user` and `scheduler-edit-project` (mirroring `scheduler-user-new` / `scheduler-project-new`).
- Absolute path style (used by integration edit routes) is appropriate for the new scheduler edit routes: `/schedulers/user/edit` and `/schedulers/project/edit`.

---

## 4. Testing Landscape

### Existing Coverage

No test files found covering `EditUserIntegrationPage`, `EditProjectIntegrationPage`, or `SchedulersPage` navigation logic in `src/pages/schedulers/__tests__/` or `src/pages/integrations/__tests__/`.

### Testing Framework and Patterns

Vitest with React Testing Library. Two workspaces: `unit` and `integration`.

### Coverage Gaps

- The navigation logic in `SchedulersPage.tsx` (the `router.push` callsite) is not covered by tests.
- New routes will have no tests unless explicitly added.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to routing for this task.

### Configuration Files

`src/constants/routes.ts` — exports `INTEGRATIONS = 'integrations'` and `SCHEDULERS = 'schedulers'`. No new constants are strictly required; the new path strings can be inline or a constant `SCHEDULER_EDIT_USER`/`SCHEDULER_EDIT_PROJECT` can be added following the existing pattern.

### Feature Flags and Deployment Concerns

`FEATURE_FLAGS.SCHEDULERS_VIEW` exists but is not applied as a route guard in `schedulerRoutes` — it is used in navigation/UI elsewhere. No flag gate needed for the new routes.

---

## 6. Risk Indicators

- **Back-navigation target mismatch**: both edit pages call `navigateBack(INTEGRATIONS)` on save/cancel. When reached from `/schedulers/*/edit`, users will land on `/integrations` instead of `/schedulers`. Requires either: (a) creating thin scheduler-specific wrapper pages that call `navigateBack(SCHEDULERS)`, or (b) making the back-navigation target dynamic (e.g. passed via query param). The task description says "render the same view/component" which implies reuse, but the back-navigation UX may break.
- **Single callsite to update** (`SchedulersPage.tsx` lines 211–212) — low risk, straightforward string change.
- **No test coverage** for the navigation callsite or the edit pages — any regression would be caught only manually.
- **Route ID naming**: must be unique across the entire router; verify no collision with existing IDs.

---

## 7. Summary for Complexity Assessment

The task touches two layers: the routing layer (`src/router.tsx`) and one navigation callsite (`src/pages/schedulers/SchedulersPage.tsx`). The file change surface is small — at minimum two new route objects in `schedulerRoutes` and two updated path strings in `SchedulersPage.tsx`. The existing `EditUserIntegrationPage` and `EditProjectIntegrationPage` can be reused verbatim since they are stateless page components driven entirely by query params.

The primary technical risk is the `navigateBack(INTEGRATIONS)` call embedded in both edit pages. If the task intends the new scheduler edit routes to navigate back to `/schedulers` on completion, thin wrapper pages under `src/pages/schedulers/` will be needed — adding two more files. This is the key decision that determines whether the change is a 2-file or 4-file edit.

The affected area has no automated test coverage, so no tests need to be updated, but regression is manual-only. The overall pattern is well-established in the codebase and introduces no new architectural concepts.
