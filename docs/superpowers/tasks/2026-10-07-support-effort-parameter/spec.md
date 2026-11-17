# Spec: Support Anthropic's `effort` parameter (EPMCDME-13335)

## Context

`temperature` is deprecated/rejected on Anthropic's newest Claude model generation, which instead
takes a discrete `effort` level (`low`/`medium`/`high`/`xhigh`/`max`, set varies by model
generation and will keep changing as Anthropic ships new models). On the prior Claude generation
both parameters are accepted together, but product requirements make them mutually exclusive in the
UI (see Design); on older/non-Claude models only `temperature` applies. The
ticket's original model/value list is stale (per ticket comment) and is intentionally not pinned
here — see Decisions.

This repo is frontend-only. The code that actually sends `effort` to Anthropic lives in a separate
backend repository and is out of reach — see Non-goals.

## Design

**Model capability becomes backend-sourced, not hardcoded.** Add two optional fields to
`ModelOption` (`src/types/entity/configuration.ts`): `effortLevels?: string[]` (the ordered values
this model accepts; absent/empty = unknown) and `temperatureSupported?: boolean` (absent = unknown,
treated as `true`). `mapLlmModel` (`src/store/appInfo.ts:158`) reads these from the backend's
nested `features` object on the raw model payload — `model.features?.effort` →
`ModelOption.effortLevels`, `model.features?.temperature` → `ModelOption.temperatureSupported` —
mirroring the existing `model.features?.tools ?? model.supports_tools` pattern already in that
function; malformed or missing data degrades to "unknown," never throws. This is the cross-repo
dependency: today only 5 named backend models populate `features.effort` (3 Bedrock-hosted Claude
models plus `claude-sonnet-5`/`claude-opus-4-7`); every other model has it absent — the normal
case, not an edge case — and falls into the Temperature-only fallback below.

**Visibility rule**, computed once per `llm_model_type` change, mirroring the existing
`getTemperatureMax` recompute in `AssistantSetupSection.tsx`:
- `effortLevels` non-empty → show Effort; Temperature/Top P are hidden, except that an entity with a
  saved temperature on a `temperatureSupported !== false` model keeps Temperature/Top P visible
  and in use until the user selects an effort.
- `effortLevels` empty/absent, `temperatureSupported !== false` → show Temperature/Top P only
  (today's behavior, unchanged — this is the path every existing model takes until backend ships
  the new fields).

**Mutual exclusivity**: selecting an effort clears `temperature` and `top_p`, so the payload carries
effort only. Changing the model resets `temperature`, `top_p` and `effort`, and the fields shown are
derived from the new model's capabilities. Re-selecting the current model is a no-op.

**New module** `src/pages/assistants/utils/effortConstraints.ts`, same shape as
`temperatureConstraints.ts`: `getEffortLevels(modelValue): string[]` (reads `appInfoStore`, `[]` on
miss), `buildEffortRule()` (Yup `.when('llm_model_type', ...)`, validates membership in the
resolved levels when non-empty, otherwise no-op), and `isWarningEffortLevel(level)` checking
membership in a new `VALIDATION_CONSTRAINTS.EFFORT_WARNING_LEVELS` constant (`['xhigh', 'max']`) in
`src/constants/validation.ts`. The warning check is against this fixed constant, not positionally
against the model's own level list — see Non-goals.

**UI**: Effort renders as a `Dropdown`/`Select` of the resolved `effortLevels`, placed beside
Temperature/Top P in both forms' "Extra configuration" accordion (`AssistantSetupSection.tsx`
~line 310; `VirtualAssistantForm.tsx` equivalent block). Selecting a warning-tier value shows a
non-blocking inline message under the dropdown ("Higher effort increases model thinking and may
significantly increase token usage."). No confirmation modal — see Decisions.

**DTO/type plumbing**, each mirroring the existing `temperature` field exactly: `effort?: string`
added to `Assistant`, `AssistantTemplate`, `CreateAssistantDto` (`src/types/entity/assistant.ts`)
and to the workflow node config (`src/types/workflowEditor/configuration.ts:35`).
`transformAssistantToCreateDTO` (`src/store/utils/assistants.ts:86-87`) copies `effort` through.
Both forms' existing submit-time coercion (`AssistantForm.tsx:340-346`,
`VirtualAssistantForm.tsx:370-397`) gets the same empty-string/`null` → `undefined` handling for
`effort`.

**Clearing on update**: the backend keeps a stored value when its key is omitted from the
`PUT v1/assistants/{id}` body. `assistantsStore.updateAssistant` therefore sends `temperature`,
`effort` and `top_p` as explicit `null` when they are unset, so switching to effort (or away from
it) really removes the old value; `CreateAssistantDto` types these as `| null`. Create and the
workflow-editor node config keep omitting unset keys (the node config is replaced as a whole).

**Workflow editor**: register `effort` in `visualEditorFieldRegistry.ts` alongside `temperature`'s
existing registration, or it silently won't appear even once `VirtualAssistantForm.tsx` is updated.

**Workflow-editor save path — a distinct third site from the two above**: `AssistantTab.tsx`'s save
handler (~lines 212-238) does not persist whatever `VirtualAssistantForm.tsx` holds in its own
component state directly. After calling `virtualAssistantFormRef.current.getValues()`, it manually
whitelists fields into `finalAssistantConfig` — the object literal actually written into the
workflow node's `AssistantConfiguration`. `temperature` is explicitly copied there
(`temperature: virtualAssistantValues.temperature`); `effort` must be added the same way
(`effort: virtualAssistantValues.effort`), or a value that validates and renders correctly inside
`VirtualAssistantForm` is silently dropped the moment the node saves, with no error. This is
separate from the `visualEditorFieldRegistry.ts` registration above (which controls whether the
field appears at all) and from `VirtualAssistantForm.tsx`'s own submit-time coercion in the
DTO/type-plumbing paragraph (which governs that component's internal state, not what
`AssistantTab.tsx` later copies out of it).

**Read-only display**: `AssistantDetailsSidebarSections.tsx` (~line 225) gains an "Effort" line,
shown only when `assistant.effort` is set.

## Acceptance Criteria

- `ModelOption` carries optional `effortLevels: string[]` and `temperatureSupported: boolean`,
  populated unknown-safely in `mapLlmModel`.
- `effortConstraints.ts` exports `getEffortLevels`, `buildEffortRule`, `isWarningEffortLevel`,
  tested the same way as `temperatureConstraints.test.ts`.
- `AssistantForm`/`AssistantSetupSection` render Effort as a dropdown of the selected model's
  levels; hidden when the model reports none.
- Model with `effortLevels` → Effort shown, Temperature/Top P hidden. Model without
  `effortLevels` but with temperature support → Temperature/Top P shown.
- An existing entity with a saved temperature on an effort-capable model still shows and submits
  that temperature, until the user selects an effort, which clears `temperature` and `top_p`.
- Changing the model resets `temperature`, `top_p` and `effort` in both forms.
- `VirtualAssistantForm` replicates the same visibility and field behavior independently, and
  `effort` is registered in `visualEditorFieldRegistry.ts`.
- Effort set in the workflow-editor virtual-assistant form survives `AssistantTab.tsx`'s save path
  into the persisted `AssistantConfiguration`: `finalAssistantConfig` includes
  `effort: virtualAssistantValues.effort` (mirroring the existing `temperature` line), not just
  validated/rendered inside `VirtualAssistantForm`'s own state.
- Selecting `xhigh` or `max` shows the inline token-usage warning; no other level does.
- `effort?: string` is added to `Assistant`, `AssistantTemplate`, `CreateAssistantDto`, and the
  workflow node config type; `transformAssistantToCreateDTO` and both forms' submit coercion carry
  it through like `temperature`.
- `AssistantDetailsSidebarSections.tsx` shows `effort` read-only when present.
- `assistantsStore.updateAssistant` sends `temperature`, `effort` and `top_p` as explicit `null` when
  unset, so a cleared value is removed on the backend rather than kept; `CreateAssistantDto` allows
  `| null` for them.
- Every existing model (no backend `effortLevels`/`temperatureSupported` yet) renders and submits
  as today, except that the update request now carries explicit `null`s for unset
  `temperature`/`effort`/`top_p`.
- Unit tests for `effortConstraints.ts` mirror `temperatureConstraints.test.ts`; integration tests
  extend `NewAssistantPage.integration.test.tsx` and `VirtualAssistantForm.schema.test.ts` for the
  three visibility branches and the warning; `visualEditorFieldRegistry.test.ts` covers the new
  registration.

## Non-goals

- Backend request-mapping of `effort` into Anthropic's `output_config.effort` — separate repo,
  cannot be implemented or verified end-to-end from here.
- Backend emitting the new `effortLevels`/`temperatureSupported` model-list fields — assumed as a
  dependency, not implemented by this spec.
- A hardcoded frontend table of model names/providers → effort values — rejected by design because
  the ticket's own history shows this goes stale within months; capability is backend-sourced.
- Deduplicating or merging `AssistantForm` and `VirtualAssistantForm` into one component.
- A blocking confirmation dialog for high-effort selection — the warning is inline and
  non-blocking.
- Any change to `temperature`/`top_p` validation ranges for models that keep using them.
- Generic "warn on the top entries of whatever list the model reports" logic — the warning checks
  a fixed literal set (`xhigh`, `max`); a future model with a differently-named top tier needs a
  manual constant update.

## Decisions

- Model/provider capability detection via new backend-sourced `ModelOption` fields, over a
  hardcoded frontend model-name table — the ticket's own stale AC is the direct evidence a
  hardcoded list goes stale fast.
- Fallback default is Temperature-only (Effort hidden) when `effortLevels` is absent, exactly
  matching today's behavior — zero visible change for a model until backend explicitly declares its
  effort levels. This degrade-to-current-behavior default is safer than speculatively showing both
  fields, and keeps this repo's work independently functional and testable.
- Warning is a non-blocking inline message, over a blocking confirmation modal — ticket says "warn,"
  not "block," and no existing confirm-dialog pattern exists here to extend.
- Warning triggers on a fixed `['xhigh', 'max']` constant, over deriving "top tier" positionally
  from each model's own level list — simpler, and avoids guessing semantics of an arbitrary future
  list ordering.
- New shared `effortConstraints.ts` module consumed independently by both forms, over merging the
  two forms — mirrors the existing `temperatureConstraints.ts` pattern without expanding scope into
  an unrelated refactor.
- Effort value set itself (`low`/`medium`/`high`/`xhigh`/`max`) is not pinned as a frontend enum;
  the frontend renders whatever `effortLevels` the backend reports per model.

## Open Risks

- Until the backend adds `features.effort` for a given model, that model stays on the
  Temperature-only fallback (today's behavior, unchanged) — safe, but the "show Effort" value of
  this ticket is only visible today for the 5 backend models that currently populate
  `features.effort` (3 Bedrock-hosted Claude models plus `claude-sonnet-5`/`claude-opus-4-7`), and
  won't extend to other models until the backend adds more.
- This repo cannot verify that `effort` actually reaches Anthropic's API — that mapping is owned by
  a separate backend repository.
- The warning constant (`xhigh`/`max`) is a point-in-time choice; it does not automatically track
  future Anthropic effort-tier naming changes.
