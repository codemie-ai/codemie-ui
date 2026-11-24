# Technical Research

**Task**: assistant-form workflow-editor yaml-schema feature-flags
**Generated**: 2026-10-12
**Research path**: filesystem

---

## 1. Original Context

Task: UI for Headroom context compression (EPMCDME-15645). CodeMie UI repo. Backend half implemented elsewhere. Add UI to configure Headroom for assistants and for workflows / workflow nodes. Do not change backend code. If a detail disagrees with the backend OpenAPI schema, trust the schema and report it.

Headroom compresses messages sent to the LLM on each model call to cut tokens. Fail-open pre-model hook. Nothing configured by default.

Backend: (1) assistants get optional `headroom_config` (JSONB). (2) Workflow YAML has optional top-level `headroom` block and each `assistants[]` entry accepts `headroom`; workflow-level block returned by workflow DETAIL endpoint as `headroom_config` (not in list). (3) Effective config per field: node > workflow > assistant > off. (4) Two gates: server HEADROOM_ENABLED and customer flag `features:headroom`; UI sees only the second.

Assistant API: `"headroom_config": {"enabled": true, "compress_user_messages": true, "compress_tool_outputs": true, "strategy": "balanced"}`. Absent/null = not configured. On update an ABSENT field leaves stored value unchanged (send enabled:false to turn off). Defaults when object exists: enabled=false, compress_user_messages=true, compress_tool_outputs=true, strategy="balanced". strategy in lossless|balanced|aggressive else HTTP 422. Not versioned.

Workflow YAML: all four keys OPTIONAL (unset = inherit). Unknown keys rejected by backend schema (`execution_config_schema.yaml`, `$defs/HeadroomOverride`); find UI equivalent schema/validation/autocomplete.

Semantics: per-field first non-null of node, workflow, assistant; enabled defaults false; node enabled:false beats workflow true. Known limitation: sub-assistants under a workflow node do not inherit overrides (mention in help text). Not compressed: structured-output calls, AIToolsAgent, Bedrock, remote A2A assistants.

To build: (1) Assistant form section "Context compression (Headroom)", flag-gated: toggle "Enable context compression", checkbox "Compress user input", checkbox "Compress tool outputs", select "Strategy" with per-strategy help; sub-controls disabled while off; load from GET; send whole object on save; omit from payload only if never touched and assistant had none. (2) Workflow editor (flag-gated): YAML schema/validation + autocompletion for `headroom` at workflow level and under assistants[]; if form mode exists add workflow-level and per-node panels with tri-state controls. (3) Show effective value where cheap. (4) Surface 422 on headroom_config.strategy and YAML schema errors next to field. (5) Types HeadroomStrategy, HeadroomConfig (4 required), HeadroomOverride (4 optional); add to assistant request/response and workflow detail types. (6) Tests for form and any YAML helper.

(Full original text abbreviated only in the trailing "Research focus" paragraph: where assistant form/types/store/payload live; `features:*` flags; workflow editor; detail types; 422 surfacing; test patterns; read guides; do not modify source.)

---

## 2. Codebase Findings

### Existing Implementations
Stack: React 18/TS/Vite, Valtio, react-hook-form + Yup, PrimeReact, Ace editor, js-yaml.

Assistant side (closest analogue is `hedging_config`, a flag-gated accordion):
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` (954 lines): Yup schema (hedging_config at ~l.160), defaults in useForm (`hedging_config: assistant?.hedging_config ?? null`, ~l.308), flag via `useRequestHedgingEnabled()` (l.224), gated `<Accordion title="Request Hedging">` with `<Controller name="hedging_config">` at ~l.893-918, errors read from `errors.hedging_config`.
- `.../AssistantForm/components/HedgingConfig.tsx`: field component; reusable inputs in `@/components/form/` (Switch, Select, Input, InfoBox). Other sections: `FormSection.tsx`, `FormAccordion/`.
- `src/types/entity/assistant.ts`: `HedgingConfig` l.38; `hedging_config?` on Assistant (l.135) and create/update DTO (l.482).
- `src/store/utils/assistants.ts` l.~97: `transformAssistantToCreateDTO` maps `hedging_config: assistant.hedging_config ?? null` (payload building; update DTO built nearby/in `src/store/assistants.ts` `updateAssistant` l.859).
- `src/store/assistants.ts` `createAssistant` l.763: catches error and returns `{error: error.message, ...}`; no per-field error mapping.

Workflow side:
- `src/types/entity/workflow.ts`: `Workflow` interface (l.32) has `yaml_config`, ... and `[key: string]: any` index signature; no `headroom_config` yet.
- `src/pages/workflows/components/workflowSchema.ts`: this is the Yup form schema for workflow metadata + `yaml_config` string; NOT a YAML schema. No JSON-schema for workflow YAML found in UI.
- YAML editing: `src/pages/workflows/editor/configPanels/YamlPanel.tsx` (Ace via `@/components/AceEditor/AceEditor`; `jsYaml` parse validation, tab check, `jumpToLine`), `YamlExpandedModal.tsx`; also `src/components/form/YamlEditor/YamlEditor.tsx` and `details/configuration/WorkflowExecutionConfigYaml.tsx`. Grep found no custom Ace completer/annotation code in `src/components/AceEditor`.
- Form mode exists: visual canvas editor `src/pages/workflows/editor/` (`WorkflowEditor.tsx`, `ConfigPanel.tsx`, `IssuesPanel.tsx`) with per-node tabs in `configPanels/` (`AssistantTab.tsx`, `AdvancedConfigTab.tsx`, `GeneralConfigTab.tsx`, ...). State in `src/hooks/useWorkflowEditor.ts`; actions in `src/utils/workflowEditor/actions/` (e.g. `config/updateAdvancedConfig.ts`).
- Serialization: `src/utils/workflowEditor/serialization/{serializer.ts,deserializer/deserializer.ts,types.ts}`. Serializer destructures `{states, assistants, tools, custom_nodes, ...rest}` so unknown top-level keys (e.g. `headroom`) pass through `rest`; `AssistantConfiguration` type (types.ts ~l.51) would need checking whether unknown per-assistant keys survive deserialize/serialize round trip (not verified).
- `src/store/workflows.ts`: `getWorkflow` l.241 (detail), `createWorkflow` l.341 / `updateWorkflow` l.350 accept `errorFormat`.

### Architecture and Layers Affected
Types (`src/types/entity`), store/payload transform (`src/store/assistants.ts`, `store/utils/assistants.ts`), form component/page (assistants), feature-flag constants/hooks, workflow editor (YAML panel, serializer, node config panels), tests.

### Integration Points
- Flags: `src/constants/featureFlags.ts` (`FEATURE_FLAGS`, e.g. `REQUEST_HEDGING: 'features:requestHedging'`), `src/hooks/useFeatureFlags.ts` (`useFeatureFlag(name)` returns `[isEnabled, isLoaded]`; per-flag wrapper hooks like `useRequestHedgingEnabled`), `src/utils/featureFlags.ts` (non-React `isFeatureEnabled`, wrappers like `isRequestHedgingEnabled`). Backed by `appInfoStore` configs. `features:headroom` not present yet.
- API: `src/utils/api.ts` single HTTP layer; error body shape `{error:{message, details?, help?}}` with `parsedError`; `skipErrorHandling` option.

### Patterns and Conventions
Flag constant + hook wrapper + util wrapper triple; Controller-wrapped field components receiving value/onChange and error strings; Accordion for optional sections; Apache license header on all files.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (patterns/form-patterns.md, state-management.md, modal-patterns.md, accessibility-patterns.md; testing/testing-patterns.md; architecture/; development/api-integration.md, error-handling-patterns.md). AGENTS.md says load the P0 guide per category (State/Forms/Testing). I did not read guide bodies in full; downstream stages should read form-patterns.md and testing-patterns.md. AGENTS.md: write tests only when explicitly requested (this task requests them); no git ops unless asked; do not add dependencies without asking.

### Architectural Decisions
None found for Headroom. No ADR/CHANGELOG hit checked beyond file listing.

### Derived Conventions
Follow the hedging implementation as template.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/assistants/components/AssistantForm/components/__tests__/` (LLMSelector*, FormGenAIPopup tests). No test of `AssistantForm.tsx` itself found under `AssistantForm/__tests__` (dir absent).
- `src/store/utils/__tests__/assistants.test.ts` covers payload transform (includes hedging).
- Hedging details tests: `AssistantDetails/components/__tests__/RequestHedgingDetails.test.tsx`.
- Workflow: `workflows/components/__tests__/workflowSchema.test.ts`, `WorkflowYamlHeaderActions.test.tsx`, `editor/__tests__/ConfigPanel.test.tsx`, `configPanels/__tests__/YamlPanel.test.tsx`; `src/utils/workflowEditor/**/__tests__`.

### Testing Framework and Patterns
Vitest + React Testing Library; projects `unit` and `integration` (vite.config.ts `test.projects`); tests colocated in `__tests__`.

### Coverage Gaps
AssistantForm has no direct form test (flag-hidden / payload-shape tests for the new section would be novel: need a component-level test of the new field component, likely easier than the 954-line form). No existing YAML schema helper to extend.

---

## 5. Configuration and Environment

### Environment Variables
None relevant; flags come from customer config (`appInfoStore.configs`), not env.

### Configuration Files
`src/constants/featureFlags.ts` holds flag ids. Runtime config via `window._env_` / config.js is public.

### Feature Flags and Deployment Concerns
`features:headroom` absent from `FEATURE_FLAGS`. No deployment changes observed.

---

## 6. Risk Indicators

- No workflow YAML JSON-schema, validator or Ace autocompleter exists in the UI (YamlPanel only does js-yaml syntax/tab checks). Requirement 2 (schema validation + autocomplete) is greenfield; Speculative: needs a hand-written validator helper and Ace completer, and possibly a new dependency (needs approval per AGENTS.md).
- Ace completer wiring lives in `@/components/AceEditor/AceEditor` (not inspected in depth); Speculative: may need a new prop.
- Round-trip of per-assistant `headroom` key through visual-editor deserializer/serializer unverified; risk of silently dropping the block on canvas save. Top-level key likely survives via `...rest`.
- `Workflow` type has index signature, so `headroom_config` typing will not error but is untyped today.
- 422 surfacing: `createAssistant` collapses errors to a message string; no field-level mapping exists. Surfacing `headroom_config.strategy` next to the field requires new parsing (error body shape for 422 not verified; trust backend OpenAPI).
- "Omit when untouched and none stored" semantics interact with `?? null` defaults used for hedging in `transformAssistantToCreateDTO` (sends null today) - Speculative: null vs absent differs on update per spec.
- AssistantForm is large with no form-level test.
- OpenAPI schema not available in this repo; discrepancies cannot be checked here.

---

## 7. Summary for Complexity Assessment

The assistant half is a well-trodden path: `hedging_config` provides a near-exact template across types (`types/entity/assistant.ts`), form defaults/Yup/Accordion (`AssistantForm.tsx`), payload transform (`store/utils/assistants.ts`) and flag plumbing (`featureFlags.ts` constants, hook, util). Expect roughly 6-8 files touched there plus a new field component and its test. Payload semantics (absent vs null, touched tracking) are the subtle part.

The workflow half is heavier. A visual canvas editor with per-node config tabs exists (so workflow-level and per-node panels are required), but there is no YAML schema validation or autocompletion infrastructure; YamlPanel only checks syntax. Serializer round-tripping of the new keys must be confirmed. Effective-value display requires combining assistant, workflow and node values across stores.

Test posture: Vitest/RTL conventions and store-transform tests are in place; AssistantForm lacks a direct test and there is no YAML-helper precedent. Main risks: greenfield YAML validation/autocomplete, possible dependency addition, 422 field mapping, and serializer pass-through. Overall medium-to-large.

---

## 8. External References

None named by the task (the backend schema file `execution_config_schema.yaml` and the OpenAPI schema are backend artifacts not present in this repo; not read).
