# BE Contract — Marketplace Gate Dry-Run Endpoint

**Ticket:** EPMCDME-14999  
**Date:** 2026-09-18  
**Author:** Yevhen Slyva  
**Scope:** New endpoint — no changes to existing publish/unpublish routes

---

## Overview

When a user edits an **APPROVED** or **PENDING_REVIEW** assistant and clicks Save, the FE needs to
validate the *unsaved form values* against the deterministic marketplace gates **before** writing
anything to the database. This lets the user choose:

- **Keep editing** — discard changes, assistant stays untouched in the DB.
- **Save & Unpublish** — persist the changes and remove the assistant from the marketplace queue.

The existing `POST /v1/assistants/{id}/marketplace/publish` runs gates against the
*already-persisted* version and has side-effects (queues for review). A new, side-effect-free
endpoint is needed that accepts the form payload and returns only the gate result.

---

## New Endpoint

```
POST /v1/assistants/{id}/marketplace/publish/gate-check
```

| Property    | Value |
|-------------|-------|
| Method      | `POST` |
| Auth        | Standard bearer token — same as all other assistant endpoints |
| Side effects | **None.** Must not persist, publish, queue, or change `marketplace_status` |
| Rate limit  | Same bucket as other assistant mutation endpoints |

> The path mirrors the existing hierarchy:
> - `…/publish/validate` — validates sub-assistants, credentials, prompt variables
> - `…/publish/gate-check` — runs deterministic quality gates against unsaved values ← **new**
> - `…/publish` — full publish with side-effects (unchanged)

---

## Request Body

Same shape as `PUT /v1/assistants/{id}` (`CreateAssistantDto`). The `categories` field is
additionally required because gate checks may include category-dependent rules.

```json
{
  "categories": ["string"],

  "name": "string",
  "description": "string",
  "system_prompt": "string",

  "llm_model_type": "string",
  "is_react": false,
  "agent_mode": "string",
  "plan_prompt": "string",
  "temperature": 0.7,
  "top_p": 1.0,
  "toolkits": [],
  "mcp_servers": [],
  "assistant_ids": [],
  "conversation_starters": [],
  "prompt_variables": [],
  "guardrail_assignments": [],
  "smart_tool_selection_enabled": false,
  "hedging_config": null,
  "interactive_enabled": false,
  "skill_ids": [],
  "tool_permissions": {}
}
```

> **`categories` is required.** If omitted, return `422` with
> `{"error": {"message": "categories is required for gate evaluation"}}`.
> The FE passes the assistant's current saved categories.

---

## Response Contract

### `200` — All gates pass

```json
{
  "passed": true,
  "gate_findings": []
}
```

### `422` — One or more gates fail

Identical structure to the existing `POST …/publish` gate-failure response so the FE can reuse
`PublishGateFindingsModal` without any mapping.

```json
{
  "error": {
    "message": "Assistant cannot be published: system_prompt_length: System prompt is 21 chars, minimum is 200.; substance: …",
    "help": "Fix each rule listed in details.gate_findings and publish again.",
    "details": {
      "assistant_id": "uuid",
      "requires_confirmation": false,
      "failed_rules": ["system_prompt_length", "substance"],
      "gate_findings": [
        {
          "rule": "system_prompt_length",
          "severity": "CRITICAL",
          "message": "System prompt is 21 chars, minimum is 200.",
          "detail": { "length": 21, "min": 200 }
        },
        {
          "rule": "substance",
          "severity": "CRITICAL",
          "message": "System prompt lacks meaningful instructions.",
          "detail": {}
        }
      ]
    }
  }
}
```

### `404` — Assistant not found

```json
{ "error": { "message": "Assistant not found" } }
```

### `403` — Not the owner / insufficient permissions

```json
{ "error": { "message": "You do not have permission to check this assistant" } }
```

---

## Gates to Evaluate

Run the same deterministic gate set as `POST …/publish`, but evaluated against the **request body
values**, not the persisted assistant:

| Gate | What it checks | Severity |
|------|----------------|----------|
| `system_prompt_length` | System prompt ≥ minimum chars | CRITICAL |
| `substance` | System prompt contains meaningful instructions | CRITICAL |
| `name_length` | Name ≥ minimum chars | CRITICAL |
| `description_length` | Description ≥ minimum chars | CRITICAL |
| *(any other existing gates)* | Same rules as publish | CRITICAL |

> **LLM-based gates** (e.g. `substance`): if the gate normally calls an LLM, confirm with the
> platform team whether it should run against the request body value or be skipped with a `WARN`
> finding. Only deterministic CRITICAL gates are strictly required here.

> **Do not run** the advisory quality-validation LLM review (the one surfaced via
> `quality_validation` in the publish response). That review is separate, slower, and
> user-confirmable — it is not a hard gate.

---

## FE Integration Flow (after endpoint is available)

1. User edits an APPROVED/PENDING_REVIEW assistant and clicks **Save**.
2. FE shows "Saving this edit will unpublish your assistant…" confirmation modal.
3. User confirms → FE calls `POST …/gate-check` with current form values + saved categories.
   Spinner shown: "Validating your Assistant configuration…".
4. **`200` (pass)** → FE calls `PUT /v1/assistants/{id}` to save, then `POST …/publish` to
   requeue. Shows "Submitted for review" modal on success.
5. **`422` (fail)** → FE shows `PublishGateFindingsModal` with two buttons:
   - **Keep editing** — close modal, no DB write, assistant unchanged.
   - **Save & Unpublish** — call `PUT /v1/assistants/{id}` to save, then `POST …/unpublish`,
     navigate back.

> Because the gate-check is side-effect-free, "Keep editing" requires **zero additional API
> calls** — the DB was never touched.

---

## Out of Scope

- No changes to `POST …/publish`, `PUT /v1/assistants/{id}`, or `POST …/unpublish`.
- No advisory quality-validation LLM review in this endpoint.
- No sub-assistant settings — parent assistant content gates only.
- No `force_publish` or `ignore_recommendations` flags.
