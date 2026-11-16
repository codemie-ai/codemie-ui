# API contract — platform model management (APPROVED)

**Status**: APPROVED at the backend `spec.approved` gate on 2026-09-21. Safe to spec against.
**Source of truth**: `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie/docs/superpowers/tasks/2026-09-21-status-persistence-api/spec.md`
— read that for exact request/response payload shapes. This file is the decision summary.
**Backend slice**: `status-persistence-api` · BE sub-task **EPMCDME-15080** (parent EPMCDME-15077)
**This slice**: `admin-ui` — the model-management admin page.

---

## 1. Status enum — wire values

```
"enabled" | "disabled" | "deprecated"
```

Lowercase noun-form. Matches the existing string-enum convention in the backend's `llm_config.py`
(`ModelCategory`, `ModelType`, `LLMProvider`). Switch on these exact strings.

## 2. Model identity key

**`base_name`** — not `deployment_name`, not a composite. This is the value you send when setting
status, and the key status rows are stored against. It is the identity the backend already uses for
every admin-facing model reference (retirement, `default_for_categories`, switchyard).

## 3. Admin endpoints

All `admin_access_only`, under the `/v1/admin/...` prefix, following the existing
`retire` / `retire/bulk` pair in `admin.py` and its `BaseResponse` / `BaseResponseWithData`
conventions.

| Purpose | Method + path |
|---|---|
| Read status for all models | `GET /v1/admin/llm/status` |
| Set status for one model | `PUT /v1/admin/llm/{base_name}/status` |
| Set status for many | `POST /v1/admin/llm/status/bulk` |

Bulk exists specifically so a table with checkboxes can set many at once — use it rather than looping
the single endpoint.

## 4. Public catalog payload

`GET /v1/llm_models` (and its sibling endpoints) gain a new **`status`** field per model, alongside
the existing `enabled` boolean. `enabled` is unchanged and still provider-sourced — do **not** treat
it as the admin status.

## 5. The three states, precisely

| State | In read lists? | Selectable for new work? | Existing entities referencing it |
|---|---|---|---|
| `enabled` | yes | yes | keep working |
| `deprecated` | **yes** — carries `status: "deprecated"` | **no** | keep working, unchanged |
| `disabled` | **no** — absent entirely | no | keep working, unchanged |

`deprecated` deliberately stays **in** the lists so it can be badged in place — this is what
EPMCDME-15079's acceptance criterion requires. The backend enforces non-selectability on the write
path via `LLMService.assert_model_selectable()`, which raises for a deprecated `base_name`. Your
greying-out is the UX layer over that backend rule, not the only defence.

## 6. `include_all=true`

Bypasses the `disabled` narrowing (and `forbidden_for_web`). The admin status-management endpoints
behave as `include_all=true` internally.

## 7. Merge rule and defaults

- Admin status is a **separate** persisted field; the provider's `enabled` is never overwritten.
- Effective availability = `enabled AND status != disabled`. Admin status can only **narrow**
  provider availability, never widen it — an admin cannot force-enable a model the provider itself
  reports as `enabled=false`.
- A model with **no persisted row defaults to `enabled`**. The feature is purely additive: nothing
  changes for models no admin has touched.
- A status row for a model that disappears from the provider catalog is kept, not deleted.

---

## What this means for the `admin-ui` slice

- **You must pass `include_all=true`** to see `disabled` models. With the default
  (`include_all=false`) they are absent from the payload entirely, so an admin page built on the
  default request would be unable to show — or un-disable — anything already disabled. This is the
  single most important line in this document for your slice.
- Read the list, then set with `PUT .../{base_name}/status` for a row action and
  `POST .../status/bulk` for multi-select.
- Send `base_name` as the identifier, never `deployment_name`.
- Expect three states in the UI, and note `enabled` (provider) is a *different* field from `status`
  (admin) — a model can be `status: "enabled"` yet unavailable because the provider disabled it.
  Consider surfacing that distinction rather than conflating the two.

## Coordination with the sibling FE slice

`catalog-status-surfacing` runs on branch `EPMCDME-15077_model-management_FE_catalog` in the
worktree `../codemie-ui-catalog-status`, and owns extracting the shared
`PROVIDER_LABELS` / cost-formatting helpers. The two FE branches merge into this one before a single
FE MR. If you need those helpers, either import from the module that slice creates or duplicate
temporarily and reconcile at merge — do not create a competing extraction.
