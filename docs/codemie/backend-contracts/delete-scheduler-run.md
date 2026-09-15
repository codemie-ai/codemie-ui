# Backend Contract: DELETE /v1/scheduler-runs/:runId

## Endpoint

`DELETE /v1/scheduler-runs/{runId}`

## Description

Deletes a single scheduler run record by its ID. Does not cancel an in-progress run — only deletes the historical record.

## Path Parameters

| Parameter | Type   | Required | Description                 |
|-----------|--------|----------|-----------------------------|
| runId     | string | Yes      | UUID of the run to delete   |

## Authorization

Same auth as existing scheduler-runs endpoints (Bearer token, same RBAC scope).

## Response

### Success

**Status:** `204 No Content`

Body: empty

### Errors

| Status | Code          | Description                                        |
|--------|---------------|----------------------------------------------------|
| 404    | `NOT_FOUND`   | Run with given `runId` does not exist              |
| 403    | `FORBIDDEN`   | Caller lacks permission to delete runs             |
| 409    | `CONFLICT`    | Cannot delete a run with status `running`          |

Error body:

```json
{
  "code": "NOT_FOUND",
  "message": "Scheduler run not found"
}
```

## Notes

- Deleting a run does not affect the scheduler itself or any other runs.
- A run with status `running` must not be deleted (return 409).
- Ticket: EPMCDME-10682
