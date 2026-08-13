# Spec: EPMCDME-13882 — Constrain Temperature to 0–1 for Claude Models on Bedrock and Vertex

**Ticket**: [EPMCDME-13882](https://jiraeu.epam.com/browse/EPMCDME-13882)
**Repo**: `codemie-ui` (Vite / React / TypeScript SPA)
**Branch**: `EPMCDME-13882_fix-claude-sonnet-temperature-range`
**Base**: `main`
**Type**: Bug — Major
**Labels**: Frontend, codemie_core, AI/Run

---

## Problem

The Extra configuration UI on both the Assistant creation/edit form AND the workflow-editor's Virtual Assistant node form allows Temperature values in the range 0–2 regardless of the selected LLM model. Anthropic Claude models on AWS Bedrock and Google Vertex cap Temperature at 1.0. Submitting 1.01–2.0 with a Claude model produces a provider-side HTTP 400, wasting a request round-trip and giving the user an opaque backend error.

**Root cause**: two independent duplicate Yup schemas each hardcode `.max(2, 'Temperature must be at most 2')`. The frontend's `ModelOption` type carries no provider or capability metadata — the store discards `provider` from the `GET /v1/llm_models` response — so the schema has no signal to vary its rule by model.

## Scope Decision (highlighted)

The ticket AC names **"Claude Sonnet"** specifically. This spec deliberately **widens the cap to ALL Claude models** (any `base_name` containing `"claude"`) on `provider ∈ {aws_bedrock, google_vertexai}`.

**Rationale**: Anthropic caps every Claude family (Sonnet, Opus, Haiku) at temperature 1.0 per their API contract. Capping only Sonnet leaves an identical 400 waiting for Opus/Haiku the next time someone uses them. Widening now is one line of code and zero extra risk.

**This deviation from the literal ticket text is intentional and MUST be called out in the MR description.**

## Goals

- The Temperature input in both forms accepts only 0–1 when a Claude model on Bedrock or Vertex is selected.
- Non-Claude models keep the current 0–2 range (regression-verified).
- Invalid values are rejected in the UI with a clear message BEFORE the backend request is fired.
- Placeholder text updates reactively to match the current model's allowed range.
- No backend API contract change.

## Non-Goals

- Adding a `temperature_max` field to the backend `GET /v1/llm_models` response (would require a backend MR — separate ticket if wanted).
- i18n / translation of the new validation message (project has no i18n infrastructure).
- Temperature-related test coverage on `EditAssistantPage` beyond the direct fix (separate ticket).
- Refactoring the two duplicated Assistant/VirtualAssistant forms into one shared component.

## Design

Six coordinated layers, one shared helper.

### Layer 1 — Types

**File**: `src/types/entity/configuration.ts`

Extend `ModelOption` with an optional `provider?: string`. Optional keeps every existing constructor of `ModelOption` (fixtures, tests, older callers) source-compatible.

### Layer 2 — Store

**File**: `src/store/appInfo.ts`

`getLLMModels()` currently maps API responses to `{ value, label, isDefault }`. Also map `provider: model.provider`.

### Layer 3 — Constants

**File**: `src/constants/validation.ts`

Add to `VALIDATION_RULES`:

- `TEMPERATURE.MIN = 0`
- `TEMPERATURE.MAX_STANDARD = 2`
- `TEMPERATURE.MAX_CLAUDE = 1`

Add to `VALIDATION_MESSAGES`:

- `TEMPERATURE.MIN` — `"Temperature must be at least 0"`
- `TEMPERATURE.MAX_STANDARD` — `"Temperature must be between 0 and 2"`
- `TEMPERATURE.MAX_CLAUDE` — `"Temperature must be between 0 and 1 for Claude models"`

### Layer 4 — Shared helper (new)

**File**: `src/pages/assistants/utils/temperatureConstraints.ts`

Public API:

- `isClaudeOnAnthropicProvider(model: ModelOption | undefined): boolean` — pure predicate; true when `provider ∈ {aws_bedrock, google_vertexai}` AND `value` contains `"claude"` (case-insensitive). Note: `ModelOption.value` is set to `model.base_name` at ingestion (`appInfoStore.getLLMModels`), so the check runs against `base_name` semantically.
- `getTemperatureMax(modelValue: string | undefined): number` — looks up the model in `appInfoStore.llmModels`, returns `MAX_CLAUDE` or `MAX_STANDARD`.
- `buildTemperatureRule(): Yup.NumberSchema` — returns the Yup fragment `.number().min(TEMPERATURE.MIN, MIN_MSG).when('llm_model_type', ([modelValue], schema) => schema.max(getTemperatureMax(modelValue), ...msg))`.

**Notes**: helper reads the Valtio store lazily inside the Yup callback — evaluation happens at validation time, not schema definition time. Documented in the file header comment.

### Layer 5 — Schemas

**Files**:
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx`
- `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx`

Replace the inline `.max(2, ...)` fragment with a call to `buildTemperatureRule()`. Schemas otherwise unchanged.

### Layer 6 — Render

**Files**:
- `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx`
- `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` (the render half of the second file)

Replace hardcoded `placeholder="0-2"` with a computed value derived from `getTemperatureMax(watch('llm_model_type'))`. Read `watch('llm_model_type')` via react-hook-form's existing `control` (or `useFormContext`). Placeholder becomes `` `${MIN}-${temperatureMax}` ``.

Add a stable `data-testid="assistant-temperature-input"` (and equivalent `data-testid="virtual-assistant-temperature-input"` for the workflow-editor form) so integration tests can query the input without depending on the reactive placeholder text.

## Data Flow

1. App loads → `appInfoStore.getLLMModels()` hits `GET /v1/llm_models` → maps `provider` alongside `value/label/isDefault` → store now knows each model's provider.
2. User selects a model in `LLMSelector` → `llm_model_type` form field updates → react-hook-form triggers dependent re-renders.
3. Render component recomputes `temperatureMax` → placeholder text updates.
4. User types a temperature → Yup schema fires → `.when('llm_model_type', ...)` reads store → returns 1 or 2 → `.max(...)` validates → error surfaces via `fieldState.error.message`.

## Error Handling

- Empty / unresolvable `llm_model_type` → `getTemperatureMax` returns `MAX_STANDARD` (safe default, matches current behavior).
- Store not yet loaded → same default; no crash.
- Invalid values → inline validation message, no request fired.

## Acceptance Criteria

- For any Claude model on Bedrock or Vertex, Temperature range is 0–1.
- The UI rejects values > 1 for those models with the `"Temperature must be between 0 and 1 for Claude models"` message.
- Non-Claude models on any provider still accept 0–2.
- Placeholder text reflects the current model's range (`"0-1"` for Claude, `"0-2"` otherwise).
- Boundary values `0`, `0 < x < 1`, and `1` are accepted for Claude; `0`, `0 < x < 2`, and `2` are accepted for non-Claude.
- No provider-side 400 errors are generated for Claude models due to unsupported Temperature values.

## Test Plan

Framework: **Vitest** (unit + integration workspaces already configured).

### Unit tests (new file)

**Path**: `src/pages/assistants/utils/__tests__/temperatureConstraints.test.ts`

- `isClaudeOnAnthropicProvider` — table-driven:
  - Claude on Bedrock → `true`
  - Claude on Vertex → `true`
  - GPT-4 on Bedrock → `false`
  - `undefined` model → `false`
  - Case variants (`"CLAUDE"`, `"claude-sonnet-5"`) → `true`
- `getTemperatureMax`:
  - Claude Sonnet Bedrock → `1`
  - Claude Opus Vertex → `1`
  - GPT-4 OpenAI → `2`
  - unknown model value → `2` (safe default)
  - `undefined` → `2`
- `buildTemperatureRule`:
  - returns a Yup `NumberSchema`
  - validates 0.5 for any model
  - rejects 1.5 for a Claude model with the new message
  - accepts 1.5 for a non-Claude model

### Integration tests

**File**: `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx`

- **Update** the existing `"shows validation errors for temperature out of range"` test — change assertion to the new message and replace the `getByPlaceholderText('0-2')` query with an `aria-label` or `data-testid` lookup.
- **Add**: Claude Sonnet Bedrock selected → enter `1.5` → new message shown.
- **Add**: Claude Sonnet Vertex selected → enter `1.5` → new message shown.
- **Add**: OpenAI GPT-4 selected → enter `1.5` → no error (regression).
- **Add**: Claude Sonnet, enter `1.0` → accepted (boundary).

**File (new if absent)**: `src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.test.tsx`

- Two-scenario minimum: Claude rejects `1.5`; non-Claude accepts `1.5`.

### Mock fixture

**File**: `mock-server/db.json` — Extend the `GET /v1/llm_models` entries to include a `provider` field on at least: one Claude Sonnet Bedrock, one Claude Sonnet Vertex, one non-Claude (OpenAI). Existing fixtures without `provider` keep working because the type field is optional.

## Rollout

- One MR, squash-merge into `main`.
- MR title: `EPMCDME-13882: Constrain temperature to 0-1 for Claude models on Bedrock and Vertex`.
- MR description MUST include:
  1. Full `npm run test-harness` console log (repo standard, enforced by gitbud compliance bot).
  2. Explicit note that the fix widens the ticket cap from "Claude Sonnet" to "all Claude models on Bedrock/Vertex" with the Anthropic-API-cap justification.
  3. Before/after UI screenshots of the Extra configuration section showing the new validation message and the updated placeholder.

## Out of Scope / Future

- Backend `temperature_max` field on `GET /v1/llm_models` (more robust; would let the frontend drop pattern-matching altogether).
- Extending model-aware capability checks to other fields (`top_p`, `max_tokens`) that also have per-model constraints.
- Consolidating `AssistantForm` and `VirtualAssistantForm` into a single shared component.
