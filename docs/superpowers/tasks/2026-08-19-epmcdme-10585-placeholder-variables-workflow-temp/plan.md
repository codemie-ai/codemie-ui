# EPMCDME-10585 Placeholder Variables — Frontend Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** Create-from-template uses `required_variables` + `POST …/materialize`; drop all client-side placeholder extract/substitute and Save leftover guards. No save-time placeholder validation.

**Architecture:** Dialog collects values; backend materializes seed; form merge; normal `POST /workflows` on Save.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

**Spec:** `docs/superpowers/tasks/2026-08-19-epmcdme-10585-placeholder-variables-workflow-temp/spec.md` (2026-09-14).  
**Backend contract:** codemie task `…/placeholder-variables-backend/spec.md` (same revision).

## Global Constraints

- Feature never shipped — delete obsolete helpers/tests; no `raw_yaml` fallback path.
- Popup still **Apply** → form only (no immediate create).
- Do not reintroduce leftover-token checks on Save.
- Parallel with BE branch; mock materialize until BE is available locally if needed.

## Frozen handoff

| Item | Contract |
|------|----------|
| `GET /v1/workflows/prebuilt/{slug}` | `required_variables: string[]`; no `raw_yaml` |
| `POST /v1/workflows/prebuilt/{slug}/materialize` | `{ variables }` → `{ yaml_config, description?, start_hint? }` |
| Errors | `missing_placeholder_variables`, `materialization_failed` |
| `POST /v1/workflows` | no `unresolved_placeholder` |
| Example slug | `template-placeholder-variables-example` |

---

### Task 1: Types + store materialize client

- [ ] Add `required_variables?: string[]` on workflow template type; remove `raw_yaml` if unused.
- [ ] Add store method: POST materialize by slug with `variables` map; return seed type.
- [ ] Unit/integration test for store method (mock fetch) if that is the project norm.

---

### Task 2: Drop client placeholder helpers from create path

- [ ] Remove usage of extract / substitute / build-from-substituted from `NewWorkflowPage`.
- [ ] Delete those helpers from utils if nothing else imports them; delete matching helper tests.
- [ ] Remove Save haystack / leftover-token guard.
- [ ] Remove or update `unresolved_placeholder` backendErrorHandler test if create no longer expects it.

---

### Task 3: Rewrite create-from-template fetch + Apply

- [ ] Fetch by slug; if `required_variables?.length` → pending metadata + open popup with that list.
- [ ] Else → `setTemplate({ …data, name: '' })` from GET (no materialize).
- [ ] Apply → call materialize → merge `{ …pending, …seed, name: '' }`; close popup; clear loading.
- [ ] On materialize error → show message; keep popup + values; loading false.
- [ ] Cancel behaviour unchanged (back / workflows list).

---

### Task 4: Popup behaviour

- [ ] Keep reset when placeholders / visibility change.
- [ ] Wire Apply to parent submit that performs materialize (no local substitute).
- [ ] Surface missing/materialization errors from parent or map API errors in popup.

---

### Task 5: Page / popup tests

- [ ] Non-empty `required_variables` opens popup; Apply calls materialize with values; form gets seed fields.
- [ ] Empty `required_variables` skips popup and does not call materialize.
- [ ] Submit path does not scan for `${input:` before create.
- [ ] Popup reset test still passes under new props source (`required_variables`).

---

### Task 6: Verify

- [ ] Manual or harness: template with slots → dialog → form → create.
- [ ] Template without slots → form directly.
- [ ] Focused vitest for touched files green.

---

## Done when

- Spec acceptance / user stories for FE are met.
- No client substitution or Save-time placeholder validation remains on create-from-template.
- FE matches frozen backend handoff table.
