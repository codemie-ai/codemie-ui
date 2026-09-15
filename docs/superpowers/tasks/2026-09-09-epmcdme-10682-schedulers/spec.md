# Spec — EPMCDME-10682: Schedulers Page (3 Phases)

Ticket: https://jiraeu.epam.com/browse/EPMCDME-10682  
Branch: `EPMCDME-10682_schedulers-view`

---

## Overview

Add a dedicated **Schedulers** top-level page to the left navigation, positioned after Data Sources and before AI Katas. The feature is delivered in three independent phases, each buildable and shippable on its own:

1. **Phase 1 — Schedulers View**: the paginated list of all schedulers with filters, status, and row actions.
2. **Phase 2 — Scheduler View (Run History)**: the run history for one scheduler with stats accordion, filters, and pagination.
3. **Phase 3 — Run View (Run Details)**: the single-run detail page with overview, input, result, and logs sections.

All three phases use real backend data; no mock data from the prototype is carried forward.

---

## Phase 1 — Schedulers View

### Goal

Replace the prototype's demo-mode scheduler list (embedded in Integrations) with a standalone top-level page at `/schedulers` wired to a real `GET /v1/schedulers` API.

### User-visible behaviour

- **Nav item**: "Schedulers" appears in the left navigation after Data Sources, before AI Katas. Uses `history.svg` icon (`IconType.SCHEDULER`).
- **Route**: `/#/schedulers` — a flat route, not nested under `/integrations`.
- **Page**: `SchedulersPage` renders a sidebar-based layout (Filters panel in sidebar, table in main area).
- **Table columns**: Name (link → Run History), Resource (name + type label), Project, Schedule (cron description), Last run (status badge + timestamp), Next run (date + time), Status badge (Enabled / Disabled), Actions menu.
- **Actions menu** per row: Enable (if disabled) / Disable (if enabled), View details (→ Run History), Edit (→ existing edit integration route), Delete (confirmation modal, out of scope per ticket — show disabled state).
- **Filters** in sidebar: Resource Type radio (All / Workflow / Assistant / Datasource), Project multiselect, Resource multiselect (populated from current page results), Status radio (All / Enabled / Disabled), Last Run Status radio (All / Completed / Failed / Running / Never run).
- **Pagination**: standard Table pagination with per-page options.
- **Empty/error states**: empty state message when no schedulers; error state on fetch failure.

### What this phase does NOT include

- Run History or Run Details pages (Phases 2–3).
- Creating or editing scheduler configurations.
- Deleting a scheduler (modal flow is out of scope per ticket).
- Enable/Disable action (included in actions menu as a visible but deferred interaction — if the backend endpoint is not ready, disable the menu item with a tooltip).

### Backend contract — Phase 1

#### List schedulers

```
GET /v1/schedulers
```

Query parameters:

| Parameter | Type | Notes |
|---|---|---|
| `page` | number | Zero-based page index |
| `pageSize` | number | Requested page size |
| `search` | string | Scheduler name or resource name |
| `resourceType` | string | `Assistant`, `Workflow`, or `Datasource` |
| `projectId` | string | Project ID |
| `resourceId` | string | Resource ID |
| `status` | string | `enabled` or `disabled` |
| `lastRunStatus` | string | `completed`, `failed`, `running`, `never` |

Response:

```json
{
  "items": [
    {
      "id": "sched-1",
      "name": "Daily Jira Report",
      "resource": { "id": "asst-1", "name": "Jira Reporter", "type": "Assistant" },
      "project": { "id": "epm-cdme", "name": "epm-cdme" },
      "schedule": {
        "cron": "0 9 * * 1-5",
        "description": "Weekdays at 09:00",
        "timezone": "Europe/Kiev",
        "nextRunAt": "2026-09-10T06:00:00Z"
      },
      "isEnabled": true,
      "lastRun": {
        "id": "run-999",
        "status": "completed",
        "startedAt": "2026-09-09T06:00:01Z"
      }
    }
  ],
  "pagination": { "page": 0, "per_page": 10, "total": 42, "pages": 5 }
}
```

When `lastRun` is null, the "Last run" column shows "Never run" and `schedule.nextRunAt` is shown in the Next run column.

#### Toggle enabled state

```
PATCH /v1/schedulers/{id}
Body: { "isEnabled": true | false }
Response: 200 with the updated scheduler item (same shape as list item)
```

### File changes

| File | Change |
|---|---|
| `src/constants/routes.ts` | Add `SCHEDULERS = 'schedulers'` constant |
| `src/components/Navigation/constants.ts` | Add `SCHEDULER = 'scheduler'` to `IconType` enum |
| `src/components/Navigation/NavigationSection/NavigationLink.tsx` | Map `IconType.SCHEDULER` → `history.svg` |
| `src/components/Navigation/Navigation.tsx` | Insert Schedulers nav item between Data Sources and AI Katas |
| `src/router.tsx` | Add `schedulerRoutes` array; spread into root route |
| `src/pages/schedulers/SchedulersPage.tsx` | New page component (moved + refactored from prototype's `Schedulers.tsx`) |
| `src/store/schedulers.ts` | New Valtio store: `fetchSchedulers(query)`, `toggleScheduler(id, enabled)` |
| `src/utils/api.ts` | (no change — use the existing `api` helper) |

---

## Phase 2 — Scheduler View (Run History)

### Goal

Wire the Run History page for a specific scheduler to `GET /v1/scheduler-runs` and `GET /v1/scheduler-runs/stats`, replacing prototype mock data.

### User-visible behaviour

- **Route**: `/#/schedulers/:schedulerId/runs` — navigated to from the "View details" action or the scheduler name link.
- **Page header**: scheduler name + breadcrumb "Schedulers → {Name}".
- **Stats accordion**: collapsed by default; expands to show `MetricsGrid` with tiles: Total runs, Completed, Failed, Running, Cancelled, Success rate (color-coded), Average duration. Stats are fetched from `GET /v1/scheduler-runs/stats` with the same `schedulerId` filter.
- **Filters** (sidebar): Status checkboxes (All / Completed / Failed / Running / Cancelled), Date Range radio (All time / Last 24 h / Last 7 days / Last 30 days / Custom range — custom reveals a date picker).
- **Run table columns**: Status badge, Started, Duration, Trigger (Scheduled / Manual), Execution ID, Actions (View button → Run Details).
- **Pagination**: standard Table pagination.
- **Empty/error states**: empty state with message "No runs yet" when list is empty; error state on fetch failure.

### Backend contract — Phase 2

Reuses `docs/scheduler-runs-api-contract.md` (already merged from prototype). Key endpoints:

#### List runs

```
GET /v1/scheduler-runs?schedulerId=<id>&page=0&pageSize=10&status=failed&dateFrom=ISO&dateTo=ISO
```

Response (see existing contract for full shape):

```json
{
  "items": [ { "id": "run-123", "status": "failed", "startedAt": "...", "durationMs": 18000, ... } ],
  "pagination": { "page": 0, "per_page": 10, "total": 1, "pages": 1 }
}
```

#### Stats

```
GET /v1/scheduler-runs/stats?schedulerId=<id>&dateFrom=ISO&dateTo=ISO
```

```json
{
  "total": 200, "completed": 170, "failed": 20, "running": 5, "cancelled": 5,
  "successRate": 89.47,
  "averageDurationMs": 28400
}
```

**Open question (from ticket):** Are stats pre-aggregated by the backend or computed on the frontend from the full run list? Resolve with backend before wiring. If the backend provides `GET /v1/scheduler-runs/stats`, use that; otherwise compute from the unfiltered run list.

### File changes

| File | Change |
|---|---|
| `src/router.tsx` | Add `{ id: 'scheduler-runs', path: '/schedulers/:schedulerId/runs', Component: SchedulerRunHistoryPage }` |
| `src/pages/schedulers/SchedulerRunHistoryPage.tsx` | Move + refactor from prototype, replace mock service with real API |
| `src/store/schedulerRuns.ts` | New Valtio store: `fetchRuns(query)`, `fetchStats(query)` |
| `src/services/schedulerRuns/index.ts` | Replace mock adapter with real HTTP adapter |

---

## Phase 3 — Run View (Run Details)

### Goal

Wire the Run Details page to `GET /v1/scheduler-runs/{runId}`, replacing prototype mock data. Use standard `DetailsProperty` for all label/value pairs.

### User-visible behaviour

- **Route**: `/#/schedulers/:schedulerId/runs/:runId` — navigated to from the run table View button.
- **Layout**: single-page (no tabs), breadcrumb "Schedulers → {Scheduler name} → Run {Execution ID}".
- **Overview section**: Status badge, Scheduler name, Resource name, Resource type, Project, Trigger, Started, Finished, Duration, Execution ID, Schedule expression, Timezone, Input tokens, Output tokens, Cost.
- **Input section**: present for Assistant and Workflow scheduler types only; shows the `initialPrompt` / payload used for that run. Hidden for Datasource schedulers.
- **Result section**: always shown.
  - Assistant: link to `/chats/<conversationId>` labelled "Open chat session".
  - Workflow: link to `/workflows/<resourceId>/workflow-executions/<resourceExecutionId>` labelled "Open workflow execution".
  - Datasource: link to `/data-sources/<resourceId>` labelled "Open datasource".
  - If `result.available === false`: "Result not available" message.
- **Logs section**: chronological list of log entries, each showing timestamp, level badge, message, and step/source label.
- **Back button**: returns to Run History page (preserving query params).

### Backend contract — Phase 3

Reuses `GET /v1/scheduler-runs/{runId}` from `docs/scheduler-runs-api-contract.md`.

```json
{
  "id": "run-123",
  "scheduler": { "id": "sched-1", "name": "Daily Jira Report" },
  "resource": { "id": "asst-1", "name": "Jira Reporter", "type": "Assistant" },
  "project": { "id": "epm-cdme", "name": "epm-cdme" },
  "status": "completed",
  "trigger": "scheduled",
  "startedAt": "2026-09-09T06:00:01Z",
  "finishedAt": "2026-09-09T06:00:19Z",
  "durationMs": 18000,
  "executionId": "exec-abc",
  "schedulerConfig": { "cron": "0 9 * * 1-5", "humanReadableSchedule": "Weekdays at 09:00", "timezone": "Europe/Kiev (UTC+3)" },
  "input": { "initialPrompt": "Generate the Jira report." },
  "result": { "available": true, "content": "..." },
  "logs": [
    { "id": "log-1", "timestamp": "2026-09-09T06:00:01Z", "level": "info", "message": "Assistant started", "step": "execution" }
  ],
  "metrics": { "inputTokens": 1200, "outputTokens": 480, "cost": 0.0125 },
  "conversationId": "conv-xyz",
  "resourceExecutionId": "wf-exec-123"
}
```

### File changes

| File | Change |
|---|---|
| `src/router.tsx` | Add `{ id: 'scheduler-run-details', path: '/schedulers/:schedulerId/runs/:runId', Component: SchedulerRunDetailsPage }` |
| `src/pages/schedulers/SchedulerRunDetailsPage.tsx` | Move + refactor from prototype; use `DetailsProperty`; wire to real API |

---

## Shared changes (applied in Phase 1, used by all phases)

| File | Change |
|---|---|
| `src/services/schedulerRuns/types.ts` | Carry over from prototype — types are already correct; add `Datasource` to `SchedulerResourceType` |
| `src/services/schedulerRuns/index.ts` | Replace mock-or-real factory with a single real HTTP adapter |
| `src/pages/schedulers/` | New directory; all three page components live here |

---

## Constraints

- No mock data in production code. Demo data files (`schedulerDemoData.ts`, `schedulerRunsMockService.ts`) stay in prototype branch only.
- All filtering and pagination is server-side.
- `DetailsProperty` (not a custom `InfoItem`) for label/value pairs in Phase 3.
- `Enable/Disable` toggle in Phase 1 depends on `PATCH /v1/schedulers/{id}` — if not yet available, show the menu item as disabled.
- `Datasource` resource type was not in the prototype's type union — add it to `SchedulerResourceType`.
