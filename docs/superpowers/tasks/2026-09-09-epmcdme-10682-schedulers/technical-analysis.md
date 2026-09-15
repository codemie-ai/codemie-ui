# Technical Analysis — EPMCDME-10682 Schedulers View

## Task Context

Build a dedicated Schedulers top-level page (after Data Sources, before AI Katas in the left nav) with three views: (1) Schedulers list, (2) Run History for a scheduler, (3) Run Details for a single run. The story is decomposed into three implementation phases.

---

## Codebase Findings

### Prototype Branch

A complete UI prototype exists in `EPMCDME-10682_scheduler-ux-run-history`. Key files:
- `src/pages/integrations/components/Schedulers/Schedulers.tsx` — full scheduler list table with filters, columns, actions (uses mock data via `schedulerDemoData.ts`)
- `src/pages/integrations/components/SchedulerRuns/SchedulerRunHistoryPage.tsx` — run history page with stats accordion, filters, pagination
- `src/pages/integrations/components/SchedulerRuns/SchedulerRunDetailsPage.tsx` — run details single-page layout
- `src/services/schedulerRuns/types.ts` — full TypeScript type definitions already written
- `src/services/schedulerRuns/index.ts` — service factory (`getSchedulerRunsService`)
- `src/services/schedulerRuns/schedulerRunsMockService.ts` — mock data for dev mode
- `docs/scheduler-runs-api-contract.md` — API contract for run history endpoints

**Important:** The prototype places Schedulers inside `src/pages/integrations/`. The ticket explicitly requires a **standalone top-level page** at `/schedulers`, not inside Integrations.

### Navigation & Routing

Navigation items defined in `src/components/Navigation/Navigation.tsx`. Current order (relevant section):
```
Integrations (line ~115)
Data Sources (line ~119)
AI Katas (line ~124)
```
The Schedulers nav item must go between Data Sources and AI Katas.

`IconType` enum in `src/components/Navigation/constants.ts` — no SCHEDULER type yet; `history.svg` and `run.svg` are available icons; a suitable icon will be `history.svg` or a new `SCHEDULER` enum entry using an existing icon.

Router in `src/router.tsx` uses domain-specific route arrays. Scheduler routes go in a new `schedulerRoutes: RouteObject[]` array, then spread into the root route. Prototype placed them under `integrations/schedulers/*` — the real paths should be `/schedulers` and `/schedulers/:schedulerId/runs` and `/schedulers/:schedulerId/runs/:runId`.

Route IDs are constants in `src/constants/routes.ts` — need to add `SCHEDULERS`, `SCHEDULER_RUNS`, `SCHEDULER_RUN_DETAILS`.

### Existing Patterns

**Stores:** Schedulers in the prototype fetch from `projectSettingsStore` / `userSettingsStore` with `type: ['Scheduler']`. The AC requires server-side filtering and pagination — for Phase 1 we need either a dedicated schedulers store or a new endpoint. The existing settings store filters by `credential_type` client-side; for production we need a `GET /v1/schedulers` endpoint.

**Tables:** `src/components/Table` with `ColumnDefinition[]` and `customRenderColumns`. Used by `Schedulers.tsx` — 8 columns (Name, Resource, Project, Schedule, Last run, Next run, Status, Actions).

**Filters:** `src/components/Filters` + `useTableFilters` hook. The prototype already wires these correctly.

**StatusBadge:** `src/components/StatusBadge` with `StatusEnum` — used for run status and scheduler enabled/disabled.

**NavigationMore:** `src/components/NavigationMore` — used for row action menus. The prototype has 3 actions (View runs / Edit / Delete). The ticket adds Enable/Disable toggle as a 4th action.

**PageLayout / Sidebar:** Run History uses `PageLayout` + `Sidebar` for the filter panel.

**Details view pattern:** `src/components/details/DetailsProperty` — used in Run Details for label/value pairs. The prototype uses a custom `InfoItem` component instead of `DetailsProperty`; the production version should use the standard `DetailsProperty`.

**Analytics widgets:** `MetricsGrid` and `AnalyticsWidget` from `src/pages/analytics/components/` — used in Run History for the stats accordion.

**CronValidator:** `src/utils/cronValidator.ts` provides `getCronDescription` and `getNextCronRun` — used in Schedulers list for Schedule column and Next run column.

### API Contract (already drafted in prototype)

Run History endpoints (`docs/scheduler-runs-api-contract.md`):
- `GET /v1/scheduler-runs` — paginated run list with filters
- `GET /v1/scheduler-runs/{runId}` — single run details
- `GET /v1/scheduler-runs/stats` — aggregate stats

Schedulers list endpoint — **not yet drafted**. Needs `GET /v1/schedulers` with pagination + filters (resourceType, project, resource, status, lastRunStatus). The response shape must include `last_run_status`, `last_run_label`, `schedule`, `schedule_description`, `resource_id`, `resource_type`, `is_enabled`, `next_run`.

---

## Risk Indicators

- **Prototype uses demo data gated by `import.meta.env.DEV`** — all mock branches must be stripped and replaced with real API calls.
- **`schedulerDemoData.ts` contains mock data** — must not be carried into the new top-level page.
- **Stats pre-aggregation is an open question** — ticket says "to be resolved during development." Phase 2 must clarify this with backend before wiring stats.
- **`Enable/Disable` action** — requires a `PATCH /v1/schedulers/{id}` or `PUT /v1/integrations/{id}` endpoint; the existing `projectSettingsStore` / `userSettingsStore` may already support this via `updateProjectSetting` / `updateUserSetting`.
- **Prototype router paths** use `integrations/schedulers/*` — must be changed to `/schedulers*` in production.
- **`DetailsProperty` vs custom `InfoItem`** — prototype uses a custom component; production should use the standard shared component.
