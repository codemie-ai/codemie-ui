# Plan — EPMCDME-10682: Schedulers Page (3 Phases)

Each phase is independently shippable. Complete Phase 1 before starting Phase 2; Phase 2 before Phase 3.

---

## Phase 1 — Schedulers View

### Task 1.1 — Add route constants and nav icon
Test-first: yes — unit test that `SCHEDULERS` constant equals `'schedulers'`; test that `IconType.SCHEDULER` is mapped to the history SVG in `NavigationLink`.

Files:
- `src/constants/routes.ts` — add `SCHEDULERS = 'schedulers'`
- `src/components/Navigation/constants.ts` — add `SCHEDULER = 'scheduler'` to `IconType`
- `src/components/Navigation/NavigationSection/NavigationLink.tsx` — map `IconType.SCHEDULER` → `history.svg`

### Task 1.2 — Add Schedulers nav item to Navigation
Test-first: yes — update `SidebarNavigation.test.tsx` (or Navigation test) to assert Schedulers appears between Data Sources and AI Katas.

Files:
- `src/components/Navigation/Navigation.tsx` — insert Schedulers item between Data Sources and AI Katas using `router.resolve({ name: SCHEDULERS })`

### Task 1.3 — Create schedulers Valtio store
Test-first: yes — unit test that `fetchSchedulers` calls `GET /v1/schedulers` with the right query params and populates the store; test `toggleScheduler` calls `PATCH /v1/schedulers/{id}`.

Files:
- `src/store/schedulers.ts` — new Valtio store with `schedulers`, `pagination`, `fetchSchedulers(query)`, `toggleScheduler(id, enabled)`

### Task 1.4 — Create SchedulersPage component
Test-first: yes — integration test that renders the page, shows table rows from mocked `GET /v1/schedulers` response, and filters work.

Files:
- `src/pages/schedulers/SchedulersPage.tsx` — new page component based on prototype's `Schedulers.tsx` but:
  - Remove all demo-mode guards and `schedulerDemoData` imports
  - Use `schedulersStore` instead of `projectSettingsStore`/`userSettingsStore`
  - Use standard `Scheduler` type (not `Setting`)
  - All 4 resource type filter options (All / Workflow / Assistant / Datasource)
  - Actions menu: Enable/Disable toggle + View details + Edit + Delete (disabled per out-of-scope)
  - Name cell navigates to `/#/schedulers/:id/runs`

### Task 1.5 — Add scheduler routes to router
Test-first: no — routing config; verify manually.

Files:
- `src/router.tsx` — add `schedulerRoutes` array with `{ id: 'schedulers', path: 'schedulers', Component: SchedulersPage }` (Phase 2 and 3 routes added in their respective phases); spread into root route

---

## Phase 2 — Scheduler View (Run History)

### Task 2.1 — Create schedulerRuns Valtio store
Test-first: yes — unit test `fetchRuns` calls `GET /v1/scheduler-runs?schedulerId=<id>` with correct params; test `fetchStats` calls `GET /v1/scheduler-runs/stats`.

Files:
- `src/store/schedulerRuns.ts` — new Valtio store with `runs`, `pagination`, `stats`, `fetchRuns(query)`, `fetchStats(query)`

### Task 2.2 — Replace mock scheduler runs service with real HTTP adapter
Test-first: yes — unit test that `getSchedulerRunsService()` returns a service that calls the real API (mock `api.get`).

Files:
- `src/services/schedulerRuns/index.ts` — remove mock/real conditional; export a single real HTTP adapter
- `src/services/schedulerRuns/types.ts` — add `'Datasource'` to `SchedulerResourceType`

### Task 2.3 — Create SchedulerRunHistoryPage component
Test-first: yes — integration test that: renders stats accordion collapsed by default; expands to show metrics; table rows render from mocked `GET /v1/scheduler-runs` response; status filter updates the query; date range filter works.

Files:
- `src/pages/schedulers/SchedulerRunHistoryPage.tsx` — move + refactor from `src/pages/integrations/components/SchedulerRuns/SchedulerRunHistoryPage.tsx`:
  - Remove all mock service imports
  - Use `schedulerRunsStore`
  - Use `DetailsProperty` pattern (or existing stats grid) for stats
  - Breadcrumb: Schedulers → {scheduler name}

### Task 2.4 — Add Run History route to router
Test-first: no — routing config; verify manually.

Files:
- `src/router.tsx` — add `{ id: 'scheduler-runs', path: '/schedulers/:schedulerId/runs', Component: SchedulerRunHistoryPage }` to `schedulerRoutes`

### Task 2.5 — Replace View button with kebab actions menu in Run History table
Test-first: no — UI surface; verify manually.

Files:
- `src/pages/schedulers/SchedulerRunHistoryPage.tsx` — replace the `Button` in the Actions column with `NavigationMore` (3-dot kebab menu) containing two items:
  - "View run" → `router.push(/schedulers/${schedulerId}/runs/${run.id})`
  - "Delete run" → sets `runToDelete` state → shows `ConfirmationModal`
- `src/store/schedulerRuns.ts` — add `deleteRun(runId: string): Promise<void>` that calls `api.delete('/v1/scheduler-runs/${runId}')`
- `docs/codemie/backend-contracts/delete-scheduler-run.md` — backend contract for `DELETE /v1/scheduler-runs/{runId}`:
  - 204 No Content on success
  - 404 if run not found
  - 403 if not authorized
  - 409 Conflict if run status is `running` (UI shows: "Cannot delete a run that is still in progress.")

Error handling in `handleDeleteConfirm`:
```typescript
} catch (err) {
  if (err instanceof HttpError && err.response.status === 409) {
    toaster.error('Cannot delete a run that is still in progress.')
  } else {
    toaster.error('Failed to delete run')
  }
}
```

### Task 2.6 — Fetch filter options independently of pagination in SchedulersPage
Test-first: yes — unit test that `fetchFilterOptions` calls `GET /v1/schedulers/filter-options` and populates `filterOptions` in the store.

Files:
- `src/store/schedulers.ts` — add `filterOptions`, `fetchFilterOptions(query)` calling `GET /v1/schedulers/filter-options`
- `src/pages/schedulers/SchedulersPage.tsx` — call `fetchFilterOptions` on mount and on filter change; populate Resource and Project multiselects from store

---

## Phase 3 — Run View (Run Details)

### Task 3.1 — Create SchedulerRunDetailsPage component
Test-first: yes — integration test that renders Overview, Input (for Assistant/Workflow, hidden for Datasource), Result (with correct link by resource type), and Logs sections from mocked `GET /v1/scheduler-runs/{runId}`.

Files:
- `src/pages/schedulers/SchedulerRunDetailsPage.tsx` — move + refactor from `src/pages/integrations/components/SchedulerRuns/SchedulerRunDetailsPage.tsx`:
  - Replace custom `InfoItem` with shared `DetailsProperty`
  - Input section: render only for `resource.type !== 'Datasource'`
  - Result section: build contextual link by resource type
  - Logs section: timestamp + level badge + message + step label
  - Back button preserves `schedulerId` query param

### Task 3.2 — Add Run Details route to router
Test-first: no — routing config; verify manually.

Files:
- `src/router.tsx` — add `{ id: 'scheduler-run-details', path: '/schedulers/:schedulerId/runs/:runId', Component: SchedulerRunDetailsPage }` to `schedulerRoutes`

---

## Cleanup (after all phases)

- Remove prototype scheduler files from `src/pages/integrations/components/Schedulers/` and `src/pages/integrations/components/SchedulerRuns/` if they were merged — they should not exist in the production branch.
- Remove `src/services/schedulerRuns/schedulerRunsMockService.ts` — the mock service is only for the prototype branch.

---

## Notes

- The `Enable/Disable` action in Phase 1 requires `PATCH /v1/schedulers/{id}`. If the backend is not ready by the time Phase 1 ships, disable that menu item with a tooltip "Coming soon" and implement the toggle when the endpoint is available.
- The stats open question (pre-aggregated vs computed) must be resolved before Task 2.3. If the backend does not expose `GET /v1/scheduler-runs/stats`, compute stats from the full (unfiltered) run list in the store.
- All page components under `src/pages/schedulers/` follow the standard FC structure from `.ai-run/guides/components/component-patterns.md`.
