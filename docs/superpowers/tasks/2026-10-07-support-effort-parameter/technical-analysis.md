# Technical Research

**Task**: model settings llm parameters temperature effort anthropic
**Generated**: 2026-10-07T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-13335 — Support Anthropic's effort parameter for newer models instead of deprecated temperature.

CodeMie should support Anthropic's newer adaptive-thinking configuration through the `effort`
parameter for relevant Anthropic models. Users should be able to configure effort levels instead
of relying only on `temperature`, which is deprecated or unsupported for newer model families and
can cause API errors.

Scope covers: Model settings UI, assistant/chat configuration forms, backend request mapping and
provider-specific parameter handling, validation for model/provider options, user guidance/help
text, and potentially model-capability detection (to show only applicable settings per model, or
show both temperature and effort with guidance when detection isn't feasible). Must warn when a
user selects a high-cost effort level (token consumption). Existing temperature-based models must
keep working without regression.

Known open risk: the ticket's original acceptance criteria (specific model names, specific effort
value list) are flagged as stale by a ticket comment, which asks to disregard them without giving a
replacement list. Research should focus on how model parameters currently flow through the UI and
API layer so a later spec stage can scope the actual value set.

---

## 2. Codebase Findings

### Existing Implementations

This repo (`codemie-ui`) is the frontend only; "backend request mapping and provider-specific
parameter handling" from the ticket scope lives in a separate backend service repo, out of this
codebase. No `effort`, `reasoning`, or `adaptive thinking` concept exists anywhere in `src/` today
for assistant/model LLM parameters — this is greenfield for this repo. (A same-named `reasoning`
field exists in `src/pages/settings/aws/agentCoreRuntimes/` but is an unrelated AWS Bedrock
AgentCore *import config* path-mapping feature, not an LLM sampling parameter.)

Temperature today, which is the direct analog for where `effort` would be wired in:

- `src/pages/assistants/utils/temperatureConstraints.ts` — single source of truth for
  per-model/per-provider temperature constraints. Exports `isClaudeOnAnthropicProvider`,
  `getTemperatureMax(modelValue)`, and `buildTemperatureRule()` (a Yup schema builder using
  `.when('llm_model_type', ...)`). Caps Claude at 1.0 when `ModelOption.provider` is one of
  `aws_bedrock`, `google_vertexai`, `vertex_ai-anthropic_models`; everything else gets 0-2. Falls
  back to a name-only regex match (`/claude/i`) when the model isn't yet in the `appInfoStore`
  (in-flight fetch / store miss).
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` — assistant create/edit form.
  Builds the Yup schema (`temperature: buildTemperatureRule()`, line ~141), seeds defaults from
  the loaded `Assistant` (line ~301-302), and before submit converts `''`/`null` to `undefined` or
  `Number(...)` (lines 340-346) before posting the `CreateAssistantDto`.
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx`
  — renders the "Extra configuration" accordion with the `llm_model_type` selector, Temperature and
  Top P `Input` fields side by side (lines 310-338). Recomputes `temperatureMax` via
  `getTemperatureMax(selectedModel)` on every `llm_model_type` change and re-triggers Yup validation
  (`useEffect` + `trigger('temperature')`).
- `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` — the workflow
  editor's equivalent form for a virtual-assistant node; duplicates the same
  `buildTemperatureRule()` + `getTemperatureMax()` + placeholder + submit-time coercion pattern
  (lines 51, 107, 133-135, 171-176, 238-242, 370-397).
- `src/pages/workflows/editor/configPanels/AssistantTab.tsx` (line ~220-221) — maps the virtual
  assistant form's `temperature` into the workflow node config (`model`, `temperature`).
- `src/types/entity/assistant.ts` — `Assistant`, `AssistantTemplate`, `CreateAssistantDto` all carry
  `temperature?`, `top_p?`, `frequency_penalty?`, `presence_penalty?` as flat optional numeric
  fields; no `effort` field exists.
- `src/store/utils/assistants.ts` — `transformAssistantToCreateDTO` copies `temperature` and
  `top_p` straight through onto the DTO sent to the backend (lines 86-87).
- `src/types/workflowEditor/configuration.ts` (line 35) — workflow node config also carries a flat
  `temperature?: number`.
- `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx`
  (line ~225) — read-only sidebar display of `assistant.temperature`.
- `src/pages/workflows/editor/utils/visualEditorFieldRegistry.ts` — a registry (`registerFields`,
  `isFieldSupported`, `isAdvancedConfigField`) that gates which config fields a node type exposes;
  `temperature` is already registered there as an advanced/assistant field. This is the pattern an
  `effort` field would need to join if the workflow editor is in scope.

### Architecture and Layers Affected

- **Form/validation layer**: `temperatureConstraints.ts` (pure utility + Yup schema builder),
  consumed by two independent form components (`AssistantForm`, `VirtualAssistantForm`).
- **Component layer**: `AssistantSetupSection.tsx` (assistant create/edit UI),
  `VirtualAssistantForm.tsx` (workflow editor UI), `LLMSelector.tsx` (shared model picker used by
  both, at
  `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx`).
- **Store layer**: `src/store/appInfo.ts` — holds `llmModels: ModelOption[]`, populated by
  `getLLMModels(projectId?)` (line 352) via `mapLlmModel` (line 158); this is the only place model
  metadata (provider, premium, cost, multimodal, supportsTools, etc.) is read from the backend.
- **DTO/transform layer**: `src/types/entity/assistant.ts`, `src/store/utils/assistants.ts`
  (`transformAssistantToCreateDTO`) — the seam where frontend form fields become the request body
  sent to the backend.
- **Read-only display layer**: `AssistantDetailsSidebarSections.tsx`.
- **Workflow-editor field registry**: `visualEditorFieldRegistry.ts`, decides which fields a given
  node type/entity type exposes in the visual editor.

### Integration Points

- `appInfoStore.llmModels` (`ModelOption[]`, `src/types/entity/configuration.ts`) is the only
  per-model capability surface the frontend has: `value`, `provider`, `isPremium`, `isRouter`,
  `multimodal`, `supportsImageGeneration`, `supportsTools`, `defaultForCategories`, `cost`. There is
  **no** existing flag for "supports effort/reasoning" or "deprecated temperature" — any
  model-capability detection for this ticket would need a new field here, sourced from the backend
  model-list API response (`getLLMModels`).
- The backend request/response contract itself (the actual API schema accepting `effort`) is not
  in this repository; `src/utils/api.ts` is the single HTTP layer but no request shape for
  assistant creation/update beyond the DTOs above was found.
- `src/pages/help/ModelsCatalog/ModelsCatalogPage.tsx` reads `cost`/`isPremium` off `ModelOption` to
  render per-model pricing and a `PremiumModelBadge`/cost-highlight pattern
  (`src/components/PremiumModelBadge.tsx`) — this is the existing analog for "warn about cost" UI,
  though it is informational display, not a submit-time warning/confirmation.

### Patterns and Conventions

- Per-model/provider rule tables matched by provider-set + name regex, with a safe numeric default
  (`TEMPERATURE_RULES` / `DEFAULT_RULE` in `temperatureConstraints.ts`) — the established pattern for
  provider-specific parameter limits.
- Yup `.when('llm_model_type', ...)` cross-field validation that reads a Valtio store synchronously
  at validation time (comment at `temperatureConstraints.ts:81-82` explains why this is safe).
- Constants/messages centralized in `src/constants/validation.ts`
  (`VALIDATION_CONSTRAINTS.TEMPERATURE_*`, `VALIDATION_MESSAGES.TEMPERATURE_*`).
- Submit-time coercion of empty-string/`null` form values to `undefined`/`Number(...)` is repeated
  independently in both `AssistantForm.tsx` and `VirtualAssistantForm.tsx` rather than shared.
- `react-hook-form` `Controller` + `useWatch` to react to `llm_model_type` changes and recompute
  derived UI (placeholder text, validation ceiling).

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide under `.ai-run/guides/` is dedicated to LLM/model parameters specifically; the closest
general guides are `.ai-run/guides/patterns/state-management.md` (Valtio store + hooks + forms
conventions) and `.ai-run/guides/development/api-integration.md` (backend call conventions). Neither
was found to mention `temperature`, `effort`, or model-capability flags by name.

### Architectural Decisions

No ADR or recorded decision for temperature/model-parameter handling was found. The design intent
for the existing per-provider cap is captured only as an inline comment in
`temperatureConstraints.ts` (lines 32-37), explaining the three Claude provider strings and why
Azure-hosted Claude (`azure_openai`) is excluded from the cap.

### Derived Conventions

- New per-model/provider business rules belong in a small, isolated utils module next to the form
  that needs them (`pages/assistants/utils/`), exporting a predicate, a value-resolver, and a Yup
  schema builder — mirroring `temperatureConstraints.ts`.
- Any model-capability flag needed for conditional UI should be added to `ModelOption`
  (`src/types/entity/configuration.ts`) and populated in `mapLlmModel` (`src/store/appInfo.ts`),
  the single mapping point from backend model-list payload to frontend model type.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/assistants/utils/__tests__/temperatureConstraints.test.ts` — unit tests for
  `isClaudeOnAnthropicProvider`, `getTemperatureMax`, `buildTemperatureRule` across provider/model
  combinations, store-miss fallback, and Yup validation accept/reject cases.
- `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` (lines ~1208-1430) —
  integration tests driving the real form: temperature+top_p reach the POST body, out-of-range
  rejection, Claude-specific caps on Bedrock/Vertex/`vertex_ai-anthropic_models`, non-Claude
  regression, and the 1.0 boundary — via `data-testid="assistant-temperature-input"`.
- `src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts`
  — schema-level temperature validation for the workflow editor form.
- `src/pages/workflows/editor/utils/__tests__/visualEditorFieldRegistry.test.ts` — registry
  behavior for which fields are supported per node/entity type, including `temperature`.

### Testing Framework and Patterns

Vitest with two projects, `unit` and `integration` (`vite.config.ts` `test.projects`), React
Testing Library for integration tests (`user.type`, `screen.getByTestId`), `vi.mock('@/store/appInfo', ...)`
to control `appInfoStore.llmModels` in unit tests.

### Coverage Gaps

- No existing test exercises model-capability-driven conditional field display (no such feature
  exists yet to test).
- No existing test or UI exercises a cost/consumption warning on a form-field value — this is new
  ground; `PremiumModelBadge`/`ModelsCatalogPage` cost display is informational only, not a
  submit-time or on-change warning.
- `AssistantDetailsSidebarSections.tsx` (read-only display of temperature) has no dedicated test
  found for the temperature line.

---

## 5. Configuration and Environment

### Environment Variables

None found specific to temperature/effort/model parameters. General runtime config reaches the app
via `import.meta.env.VITE_*` (build-time) and `window._env_`/`config.js` (run-time), per
`AGENTS.md`; no feature-area-specific env var was found.

### Configuration Files

No dedicated config file for model parameter rules; `TEMPERATURE_RULES` is hardcoded in
`temperatureConstraints.ts` rather than loaded from configuration.

### Feature Flags and Deployment Concerns

No feature flag gates the temperature UI today. No Dockerfile or CI config references
`temperature`/`effort`/model parameters.

---

## 6. Risk Indicators

- **Stale/missing acceptance criteria**: the ticket's own comment says to disregard the original
  model-name and effort-value list without supplying a replacement — the actual value set
  (e.g. `low`/`medium`/`high`, or `none`) and the list of qualifying models/providers cannot be
  derived from this codebase and must come from product/spec decision, not from research.
- Speculative: whichever model-capability detection approach is chosen, it will likely require a
  new field on `ModelOption` (`src/types/entity/configuration.ts`) and a corresponding backend
  model-list payload field, since no such flag exists today — this is a cross-repo dependency this
  frontend alone cannot satisfy.
- Speculative: because the backend DTO/request mapping lives outside this repository, any UI work
  here is blocked on (or must be sequenced with) a corresponding backend change to accept and map
  an `effort` parameter — this repo cannot verify end-to-end behavior alone.
- The temperature constraint logic is duplicated between `AssistantForm.tsx` and
  `VirtualAssistantForm.tsx` (two independent Yup schemas, two independent submit-time coercions);
  adding `effort` in parallel to both without a shared field pattern doubles the surface and the
  risk of the two forms drifting.
- No existing pattern in this repo for a submit-time or on-change "cost/consumption" warning
  dialog — the closest analog (`PremiumModelBadge`, `ModelsCatalogPage` cost column) is passive
  display only, so the "warn on high-cost effort" requirement is new UI, not an extension of an
  existing one.
- The workflow editor's `visualEditorFieldRegistry.ts` gates which fields appear per node type;
  forgetting to register a new `effort` field there would silently exclude it from the workflow
  editor even if `VirtualAssistantForm.tsx` is updated.
- Three different provider strings already represent "Claude" (`aws_bedrock`, `google_vertexai`,
  `vertex_ai-anthropic_models`), plus `azure_openai` Claude that is intentionally excluded from the
  temperature cap — any effort-vs-temperature model detection must account for the same provider
  fragmentation or risk missing a Claude surface.

---

## 7. Summary for Complexity Assessment

This task touches the form/validation layer (`temperatureConstraints.ts` and its two consumer
forms, `AssistantForm.tsx` and `VirtualAssistantForm.tsx`), the shared model-metadata store
(`appInfoStore.llmModels` / `ModelOption`), the DTO/transform layer that ships form values to the
backend (`CreateAssistantDto`, `transformAssistantToCreateDTO`), and the read-only assistant detail
view. A workflow-editor field registry (`visualEditorFieldRegistry.ts`) also governs whether a new
field like `effort` surfaces there at all. The change surface is moderate in file count (five to
eight files) but duplicated across two independently-maintained forms, so touching one without the
other is an easy regression to introduce.

Technical novelty is high: no `effort`/`reasoning`/adaptive-thinking concept exists anywhere in
this frontend today, no model-capability flag for it exists on `ModelOption`, and the "warn on
high-cost effort" requirement has no existing UI pattern to extend (cost display today is passive,
not a warning). The provider-string fragmentation already present for Claude temperature capping
(three provider strings plus one deliberately-excluded one) signals that any effort/model detection
logic will face the same multi-provider complexity.

Test coverage for the temperature analog is solid (unit + integration + schema + registry tests),
giving a template to replicate, but there is zero existing coverage for the two genuinely new
behaviors this ticket needs: conditional field display by model capability, and a cost-based
warning. The largest risk, however, is non-technical: the ticket's acceptance criteria (which
models, which effort values) are explicitly flagged stale with no replacement given, and the actual
request-mapping work happens in a backend repository outside this codebase's reach — both must be
resolved or scoped before implementation, not discovered by further filesystem research here.

---

## 8. External References

None named by the task. The task_context references "a ticket comment" flagging stale acceptance
criteria, but gives no path, URL, or ticket-system identifier to open — this is a known gap to carry
forward to spec/plan, not something resolvable by filesystem research.
