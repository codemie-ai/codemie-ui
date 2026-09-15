# Backend API Contract — EPMCDME-10682 Schedulers

Full API surface required by all three implementation phases.

---

## Phase 1 — Schedulers List

### List schedulers

`GET /v1/schedulers`

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

When `lastRun` is `null`, the Last run column shows "Never run" and `schedule.nextRunAt` populates the Next run column.

### Toggle enabled state

`PATCH /v1/schedulers/{id}`

Request body:

```json
{ "isEnabled": true }
```

Response: `200` with the updated scheduler item (same shape as list item).

---

## Phase 2 — Run History

> Carried over from `docs/scheduler-runs-api-contract.md` in the prototype branch.
> The original contract required `schedulerId` on every call; that requirement is preserved here.

### List runs

`GET /v1/scheduler-runs`

Query parameters:

| Parameter | Type | Notes |
|---|---|---|
| `page` | number | Zero-based page index |
| `pageSize` | number | Requested page size |
| `search` | string | Execution ID, scheduler alias, resource ID/name |
| `status` | string | `completed`, `failed`, `running`, `cancelled` |
| `project` | string | Project ID or canonical project name |
| `resourceType` | string | `Assistant`, `Workflow`, or `Datasource` |
| `resourceId` | string | Resource ID |
| `schedulerId` | string | **Required** for the scheduler run history flow |
| `dateFrom` / `dateTo` | ISO-8601 | Inclusive started-at range |
| `sortBy` | string | `startedAt` |
| `sortDirection` | string | `asc` or `desc` |

Response:

```json
{
  "items": [
    {
      "id": "run-123",
      "scheduler": { "id": "sched-1", "name": "Daily Jira Report" },
      "resource": { "id": "asst-1", "name": "Jira Reporter", "type": "Assistant" },
      "project": { "id": "epm-cdme", "name": "epm-cdme" },
      "status": "failed",
      "trigger": "scheduled",
      "startedAt": "2026-09-07T09:00:00Z",
      "finishedAt": "2026-09-07T09:00:18Z",
      "durationMs": 18000,
      "executionId": "assistant-execution-123",
      "error": {
        "code": "AUTHENTICATION_EXPIRED",
        "message": "Authentication token expired",
        "details": "The Jira connection requires re-authentication.",
        "timestamp": "2026-09-07T09:00:17Z"
      }
    }
  ],
  "pagination": { "page": 0, "per_page": 10, "total": 1, "pages": 1 }
}
```

### Statistics

`GET /v1/scheduler-runs/stats`

Same filter parameters as the list endpoint, excluding `page` and `pageSize`. Stats must be calculated over the **complete** filtered result set, not the current page.

```json
{
  "total": 200,
  "completed": 170,
  "failed": 20,
  "running": 5,
  "cancelled": 5,
  "successRate": 89.47,
  "averageDurationMs": 28400
}
```

`successRate` = `completed / (completed + failed) * 100`. Running and cancelled runs are excluded from the denominator.

> **Resolved:** `GET /v1/scheduler-runs/stats` is implemented by the backend. Stats are pre-aggregated server-side via a single SQL aggregation query over the filtered result set — the frontend does not need to fetch the full run list and compute locally. Wire directly against this endpoint; the fallback store computation is not needed.

---

## Phase 3 — Run Details

### Get run details

`GET /v1/scheduler-runs/{runId}`

Response extends the list item with `schedulerConfig`, `input`, `result`, `logs`, `metrics`, and resource execution references:

```json
{
  "id": "run-123",
  "scheduler": { "id": "sched-1", "name": "Daily Jira Report" },
  "resource": { "id": "asst-1", "name": "Jira Reporter", "type": "Assistant" },
  "project": { "id": "epm-cdme", "name": "epm-cdme" },
  "status": "completed",
  "trigger": "scheduled",
  "startedAt": "2026-09-07T09:00:00Z",
  "finishedAt": "2026-09-07T09:00:18Z",
  "durationMs": 18000,
  "executionId": "assistant-execution-123",
  "schedulerConfig": {
    "cron": "0 9 * * 1-5",
    "humanReadableSchedule": "Weekdays, 09:00",
    "timezone": "Europe/Kiev (UTC+3)"
  },
  "input": { "initialPrompt": "Generate the Jira report." },
  "result": { "available": true, "content": "..." },
  "logs": [
    {
      "id": "log-1",
      "timestamp": "2026-09-07T09:00:01Z",
      "level": "info",
      "message": "Assistant started",
      "step": "execution"
    }
  ],
  "metrics": { "inputTokens": 1200, "outputTokens": 480, "cost": 0.0125 },
  "conversationId": "conversation-123",
  "resourceExecutionId": "wf-exec-123"
}
```

**Result section link resolution by resource type:**

| `resource.type` | Link target | Label |
|---|---|---|
| `Assistant` | `/chats/<conversationId>` | Open chat session |
| `Workflow` | `/workflows/<resource.id>/workflow-executions/<resourceExecutionId>` | Open workflow execution |
| `Datasource` | `/data-sources/<resource.id>` | Open datasource |

If `result.available === false`, show "Result not available" instead of a link.

### Paginated logs (optional — if logs grow large)

`GET /v1/scheduler-runs/{runId}/logs?page=0&pageSize=50`

Same pagination shape as other list endpoints. Use the inline `logs` array in the details response for now; switch to this endpoint when the backend indicates the inline payload is too large.
