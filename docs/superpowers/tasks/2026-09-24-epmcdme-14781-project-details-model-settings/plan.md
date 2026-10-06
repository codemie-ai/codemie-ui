# Plan — EPMCDME-14781: Project-level model availability settings

Retroactive record of the plan executed. Written from the actual task breakdown used during
implementation (see the session's own task list), not authored via a separate
`superpowers:writing-plans` pass before coding started.

## Goal

Close every acceptance criterion in spec.md that MR !1917's existing (mocked, `localStorage`)
implementation did not meet, backed by a real backend contract, without discarding the MR's
existing budget/member-management work (explicit user direction).

## Approach

Backend-first: define the storage shape and API before touching any frontend consumer, so the
frontend work has a real contract to wire against instead of guessing at one.

### Phase 1 — Backend: storage and policy (commit `7476f850b`)

1. `ProjectModelSettings` domain model (`src/codemie/core/project_model_settings.py`): mode
   (all/allow_list/deny_list), model list, default model, `hide_premium_models`,
   `auto_routing_enabled`, `member_overrides` (narrowing-only per member).
2. `applications.model_settings` JSONB column + Alembic migration, NULL = defaults (no backfill
   needed — every existing project keeps today's "everything available" behavior).
3. `ProjectModelSettingsService`: `load`/`save`, `is_model_allowed` (the one place router
   candidate-visibility logic lives), `filter_chat_models`/`filter_router_options`,
   `resolve_runtime_model` (the fallback used at agent-construction time), `validate` (rejects
   unknown/router-listed models, empty allow-lists, an unavailable default).
4. `GET`/`PUT /v1/projects/{name}/model-settings`.
5. `GET /v1/llm_models?project=` filtering + effective-default marking.
6. Runtime guard wired into `AssistantService.build_agent` and
   `_load_and_configure_workflow_assistant`.
7. Save-time validation wired into assistant create/update.

### Phase 2 — Frontend: replace the mock, wire the contract (commit `1f045ba64`)

1. FE types + store (`projectModelSettings.ts`) for the new endpoints.
2. Rewrite `ProjectModelsSection.tsx` against the real API: allow/deny policy picker, default
   model, `hide_premium_models` switch, `auto_routing_enabled` switch with per-router
   availability. Drop the `localStorage` prototype and the hardcoded premium-label list.
3. Rewrite `ProjectMemberModelOverrideModal.tsx` to persist per-member overrides via the store
   instead of local component state that vanished on reload.
4. `appInfoStore` project-scoped model fetch (`getProjectLLMModels`) + `useProjectLLMModels` hook;
   wire it into every consumer found in technical-analysis.md (chat prompt/config selectors,
   `LLMSelector` via `AssistantFormContext`, workflow editor forms via an explicit `project` prop).
5. `Conversation.project` end-to-end (backend field → FE type → mapper) so chat's model list can
   be scoped to the conversation's own project.
6. Overview indicators (model availability, 30-day model usage, integrations count, routing
   impact) reusing existing analytics endpoints — no new backend surface needed for these.
7. IA fixes found while wiring the above: the Budgets tab route had been left redirecting to
   Overview; tab visibility didn't follow the viewer's actual permission; route ids were inline
   strings instead of the `src/constants/routes.ts` constants.

### Phase 3 — Review round 1 (code-review-final.json) and fix-up (commit `4367502fe` backend,
`8b4d81b11` frontend)

Full multi-lens review (see code-review-final.json) found 10 blocking findings — 2 access-control
gaps, 1 fallback-logic bug, 1 stale test, 6 UI correctness bugs. All fixed; each fix re-verified
individually (targeted test re-runs, a standalone scripted check of the fallback logic).

### Phase 4 — Cleanup round (commit `2faef9c2f`, backend test fix `461ca1ae4`)

The same review pass also surfaced 12 non-blocking cleanup/duplication findings, explicitly
deferred out of the blocking set per the review's own triage rule. On request, all 12 were
addressed: shared `spendPresentation.ts` and `UserBudgetsCell.tsx` extraction, shared budget-limit
validation, parallelized pagination in two places, a reverted dead `DropdownButton` divider
variant, `ProjectDetailsPage`'s duplicated fetch effect collapsed into one `loadProject` call, two
Tailwind arbitrary-value replacements where an exact scale equivalent existed (and an explicit
check — confirmed via the actual Tailwind default spacing key list — that the *other* similar
values do **not** have an equivalent and must stay as brackets), and an audit of `||`-vs-`??`
defaults across the diff (no actionable instance found). This round also fixed a regression it
surfaced: `LLMSelector`'s new `AssistantFormContext` dependency broke `ChatConfiguration.test.tsx`'s
narrow module mock.

### Phase 5 — Verification (code-review-check.json)

Full-tree `tsc --noEmit` and `eslint` (frontend), full `ruff check`/`format` (backend), the full
backend test files touching the changed routers/services (178 tests), and the full frontend unit
suite (~6224 tests) — see code-review-check.json for the exact pass/fail breakdown and the 5
pre-existing, unrelated failures identified and confirmed independent of this diff.

## Non-goals (carried from spec.md, plus one found during implementation)

- MCP project-level configuration, a durable "client" entity, changes to the LiteLLM/Switchyard
  routing algorithms themselves (see spec.md).
- A full extraction of `ProjectMembersManager.tsx` under the 300-line guide limit. It was already
  834 lines before this task touched it; the cleanup round extracted the one cleanly-separable
  piece (`UserBudgetsCell` + its two helpers, ~90 lines) without touching its stateful logic. A
  full compliant split is a larger, separately-scoped refactor and was not attempted here.
