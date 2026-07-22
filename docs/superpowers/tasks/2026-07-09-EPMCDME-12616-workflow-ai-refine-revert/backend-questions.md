# Backend Questions — EPMCDME-12616 POST v1/workflows/refine

## 1. Request payload

The frontend plans to send:
```json
{ "id": "<workflow_id>", "yaml_config": "<current yaml>", "refine_prompt": "<optional user prompt>" }
```
- Is `id` required, or just `yaml_config`?
- Does the endpoint need any other fields (e.g. `project`, `mode`)?

**Backend answer:**

`id` belongs in the URL path, not the body. The endpoint is:

```
POST /v1/workflows/{workflow_id}/refine
```

Request body:
```json
{
  "yaml_config": "<current yaml>",         // required
  "refine_prompt": "<optional instruction>", // optional
  "llm_model": "gpt-4o",                   // optional, uses default if omitted
  "project": "my-project"                  // optional, used for LiteLLM budget context
}
```

`mode` is not needed — it's resolved from the stored workflow.

---

## 2. Response shape

The frontend assumes:
```json
{ "yaml_config": "<new complete yaml>", "summary": "<optional human-readable explanation>" }
```
- Is the response a full replacement YAML or a diff/patch?
- Is `summary` present? Any other fields the UI should render?

**Backend answer:**

Full replacement YAML, no diff/patch:
```json
{
  "yaml_config": "<complete revised yaml>"
}
```

No `summary` field in the initial implementation. If you need a human-readable explanation of what changed, let us know and we can add it — it would be a second structured-output field from the LLM. Flagging it as a follow-up scope item for now.

---

## 3. Error response shape

What does the response body look like on failure?
- What is the field name — `detail`, `message`, `error`?
- Are there distinct error codes for quota-exceeded, invalid YAML, etc.?

**Backend answer:**

All errors use the same envelope shape:
```json
{
  "error": {
    "message": "Brief human-readable description",
    "details": "More context, e.g. the specific YAML parse error",
    "help": "Actionable suggestion, e.g. 'Try again with a different model'"
  }
}
```

HTTP status codes:
| Status | Cause |
|---|---|
| `400` | LLM returned invalid/unparseable YAML |
| `400` | No history available (revert endpoint only) |
| `403` | User lacks WRITE permission on the workflow |
| `404` | Workflow not found |
| `429` | LLM quota / rate limit exceeded (raised by LiteLLM middleware) |
| `500` | Unexpected AI chain error |

The field to read is `error.message` for the user-facing string. `error.details` and `error.help` are optional supplementary fields.

---

## 4. Synchronous or async?

- Does the endpoint block until AI is done and return the result directly?
- Or does it return a job ID that the frontend must poll?

**Backend answer:**

Synchronous — blocks and returns the result directly. This matches the existing `POST /v1/assistants/refine` and `POST /v1/skills/refine` behavior. No polling needed.

---

## 5. Typical latency

- Rough expected response time? Determines whether to show a spinner with a timeout warning or a simple loading state.

**Backend answer:**

Expect **5–20 seconds** depending on model and workflow YAML size. Comparable to the assistant/skill refine endpoints in production.

Recommendation: show a spinner from the moment the request is sent. If you want to add a "this is taking longer than expected" message, trigger it at ~15 seconds. A hard client-side timeout of 60 seconds is a safe ceiling.

---

## 6. Feature flag config item name

- The frontend will gate the UI on a config item from `v1/config`.
- We plan to use `workflowAIRefine` — confirm the exact string the backend will set.

**Backend answer:**

Confirmed: `workflowAIRefine`. The backend will register it as component ID `features:workflowAIRefine` in the customer config. The `GET /v1/config` response will include it when enabled:

```json
{ "id": "features:workflowAIRefine", "settings": { "enabled": true } }
```

Use `customer_config.is_feature_enabled("workflowAIRefine")` on the backend side (already the established pattern). The feature defaults to **enabled** if the component is absent from the config (consistent with how all other feature flags work in this codebase). We'll add a note to the deployment docs.
