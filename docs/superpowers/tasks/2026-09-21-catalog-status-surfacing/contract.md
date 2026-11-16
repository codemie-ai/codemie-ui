# API contract — platform model management (APPROVED)

**Status**: APPROVED at the backend `spec.approved` gate on 2026-09-21. Safe to spec against.
**Source of truth**: `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie/docs/superpowers/tasks/2026-09-21-status-persistence-api/spec.md`
— read that for exact request/response payload shapes. This file is the decision summary.
**Backend slice**: `status-persistence-api` · BE sub-task **EPMCDME-15080** (parent EPMCDME-15077)
**This slice**: `catalog-status-surfacing` — `/help/models` and other model-list consumers, read-only.

---

## 1. Status enum — wire values

```
"enabled" | "disabled" | "deprecated"
```

Lowercase noun-form. Matches the existing string-enum convention in the backend's `llm_config.py`.
Switch on these exact strings.

## 2. Model identity key

**`base_name`** — not `deployment_name`. This is how a model is identified platform-wide. Read-only
for this slice, but relevant if you key React lists or test fixtures on it.

## 3. Public catalog payload — your read path

`GET /v1/llm_models` (and its sibling endpoints: `/v1/llm_models/image_generation`,
`/v1/embeddings_models`, `/v1/default_models`) gain a new **`status`** field per model, alongside the
existing `enabled` boolean.

`enabled` is unchanged and still **provider-sourced** — it is not the admin status. Do not conflate
the two, and do not repurpose existing `enabled` checks to mean "admin enabled".

## 4. The three states, precisely

| State | In your payload? | Selectable for new work? | Existing entities referencing it |
|---|---|---|---|
| `enabled` | yes | yes | keep working |
| `deprecated` | **yes** — carries `status: "deprecated"` | **no** | keep working, unchanged |
| `disabled` | **no** — absent entirely | no | keep working, unchanged |

## 5. What you render

Per EPMCDME-15079's acceptance criterion:

> "Given a regular user views the model catalog or selection dropdowns, when a model has been set to
> 'Deprecated' by an admin, then that model displays a visual flag or badge indicating it is
> deprecated and it cannot be selected for new work."

So:
- **Badge deprecated models in place** — they arrive in the payload precisely so they can be shown
  and marked, rather than silently vanishing.
- **Render them non-selectable** in selection dropdowns (the `LLMSelector` family), not merely
  labelled.
- The backend independently enforces this on the write path via
  `LLMService.assert_model_selectable()`, which raises for a deprecated `base_name`. Your greying-out
  is the UX layer over that rule — consistent with this project's existing "backend authorization is
  defense-in-depth; UI authorization is UX-focused" precedent.

## 6. Things that will NOT appear

`disabled` models are absent from the default (`include_all=false`) payload entirely. **In practice
the `status` field you receive on the normal catalog request will only ever read `"enabled"` or
`"deprecated"`.** You do not need a UI state for `disabled` on `/help/models` — but do not crash on
it, since `include_all=true` callers can receive it.

## 7. Defaults

A model with no persisted status row defaults to `enabled`. The feature is purely additive — until an
admin acts, every model reads `status: "enabled"` and nothing about today's rendering changes.

---

## What this means for the `catalog-status-surfacing` slice

- Read `status` from the existing `GET /v1/llm_models` response; **no new endpoint and no admin call
  is needed**. `appInfoStore.getLLMModels()` remains your data source.
- This slice is **read-only**. Add no mutation, no admin affordance — `/help/models` is open to all
  authenticated users. Status setting belongs to the sibling `admin-ui` slice.
- Add the badge to `ModelsCatalogPage.tsx` **and** to the selection-dropdown consumers; the
  acceptance criterion names both surfaces, so the catalog page alone does not satisfy it.
- **Existing consumer tests assert on payload shape** and are affected by the new field:
  `ModelsCatalogPage.test.tsx`, `LLMSelector.test.tsx`, `ChatConfigLlmSelector.test.tsx`,
  `ChatPromptLlmSelector.test.tsx`. Update fixtures to carry `status`.
- Because the default payload never contains `disabled`, do not build filtering UI for it.

## Coordination with the sibling FE slice

`admin-ui` runs on branch `EPMCDME-15077_model-management_FE` in the main `../codemie-ui` checkout.
The two FE branches merge into that one before a single FE MR.

**This slice owns the shared-helper extraction** — factoring out the `PROVIDER_LABELS` /
cost-formatting logic currently duplicated between `ModelsCatalogPage.tsx` and the unmerged
`AvailableModelsSection.tsx`. The `admin-ui` slice builds a model table too and will want the same
helpers, so keep the extracted module cleanly importable and expect it to be consumed from the admin
page after the merge. This is the most likely merge-conflict point between the two branches.

## Note on this worktree

`../codemie-ui-catalog-status` is a temporary git worktree with **no local dev server** and no
`node_modules` until you run `npm ci`. Lint and Vitest need the install; the dev server is not set
up here. If Stage 7 offers browser feature verification, answer **skip** — live verification happens
in the main `codemie-ui` checkout after the two FE branches merge, against a real backend.
