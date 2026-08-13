# Technical Research

**Task**: extra configuration temperature claude sonnet llm-model bedrock vertex
**Generated**: 2026-08-07T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

# EPMCDME-13882: Extra configuration: invalid temperature range allowed for Bedrock and Vertex Claude Sonnet models

## Summary
The CodeMie Extra configuration UI allows users to set the Temperature value in the range {0-2} for Bedrock and Vertex Claude Sonnet models. Claude Sonnet models support temperature values only in the range {0-1}. When a user sets Temperature to {2.0}, the model request fails with a {400} BadRequest error from the provider.

## Preconditions
- User has access to CodeMie.
- Extra configuration is available in the UI.
- A Claude Sonnet model is selected in the LLM model field, for example:
  - Bedrock Claude Sonnet 5
  - Vertex Claude Sonnet 4.6
- Temperature can be configured in the Extra configuration section.

## Steps to Reproduce
1. Open CodeMie.
2. Open the Extra configuration section.
3. Select {Bedrock Claude Sonnet 5} as the LLM model.
4. Set Temperature to {2.0} or use the UI range that allows {0-2}.
5. Run the request; observe the provider 400 error.
6. Repeat with {Vertex Claude Sonnet 4.6}; observe the provider 400 error.

## Expected Result
- For Bedrock and Vertex Claude Sonnet models, the Temperature field allows only values in the range {0-1}.
- The UI does not allow saving or submitting unsupported temperature values for the selected model.
- If the user enters an invalid value manually, the UI displays a clear validation message before the request is sent.
- Requests with valid temperature values are processed without provider-side validation errors.

## Actual Result
- The UI displays/allows Temperature range {0-2} for Claude Sonnet models.
- Setting Temperature to {2.0} causes the request to fail with {400} BadRequest errors.

Observed Bedrock error:
```
Error code: 400 - {'error': {'message': 'litellm.BadRequestError: BedrockException - {"message":"1 validation error detected: Value \'2.0\' at \'inferenceConfig.temperature\' failed to satisfy constraint: Member must have value less than or equal to 1"} ... Received Model Group=claude-sonnet-5 ...', 'code': '400'}}
```

Observed Vertex error:
```
Error code: 400 - {'error': {'message': 'litellm.BadRequestError: Vertex_aiException BadRequestError - ... "message":"temperature: range: 0..1" ... Received Model Group=claude-sonnet-4-6-vertex ...', 'code': '400'}}
```

## Acceptance Criteria
- Temperature validation is model-specific for Claude Sonnet models.
- For Bedrock Claude Sonnet models, allowed Temperature range is {0-1}.
- For Vertex Claude Sonnet models, allowed Temperature range is {0-1}.
- The UI no longer displays {0-2} as the allowed range for Claude Sonnet models.
- Users cannot submit Temperature values greater than {1} for Claude Sonnet models.
- If an invalid Temperature value is entered manually, the UI displays a clear validation message before request execution.
- Valid Temperature values {0}, values between {0} and {1}, and {1} are accepted.
- Regression validation confirms that non-Claude models keep their correct supported Temperature ranges.
- Provider-side {400} errors caused by unsupported Claude Sonnet Temperature values are prevented by UI validation.

Labels on the ticket: Frontend, codemie_core, AI/Run.

---

## 2. Codebase Findings

### Existing Implementations

**Primary form — Assistant setup:**
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/AssistantForm.tsx` — main assistant form; contains the Yup schema with the static `.max(2, 'Temperature must be at most 2')` rule at lines 131–134; uses `yupResolver` + `react-hook-form`
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx` — renders the "Extra configuration" accordion; temperature `<Input>` with hardcoded `placeholder="0-2"` at line 294; error fed from `fieldState.error?.message`
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — dropdown for model selection; reads `appInfoStore.llmModels` (a `ModelOption[]`); stores selected model as `llm_model_type` (the `base_name` string) in form state; no model-capability awareness

**Workflow editor duplicate:**
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` — independent copy of the assistant form for the workflow editor canvas; contains an identical static `.max(2)` Yup rule at lines 99–103 and the same `placeholder="0-2"` at line 345

**Data layer:**
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/store/appInfo.ts` — Valtio proxy store; `getLLMModels()` at lines 261–264 fetches `GET v1/llm_models` and strips the API response to three fields only: `{ value: model.base_name, label: model.label, isDefault: model.default }`; the `provider` and `features` fields from the API are discarded here
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/types/entity/configuration.ts` — defines `ModelOption` interface: `{ value: string; label: string; isDefault: boolean }`; no `provider` or capability fields
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/constants/validation.ts` — houses `VALIDATION_MESSAGES` and `VALIDATION_CONSTRAINTS` constants; temperature limit constants do not yet exist here

**Mock server (API shape reference):**
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/mock-server/db.json` — JSON fixture for `GET /v1/llm_models`; shows the full API response shape including `provider: "aws_bedrock"` / `"google_vertexai"` and `features: { temperature: true }` (boolean only — no `temperature_max` field); six Claude Sonnet variants present across Bedrock and Vertex providers

### Architecture and Layers Affected

| Layer | Component | Role in this fix |
|---|---|---|
| Types | `src/types/entity/configuration.ts` → `ModelOption` | Must add `provider?: string` field |
| Store | `src/store/appInfo.ts` → `getLLMModels()` | Must propagate `provider` from API response |
| Constants | `src/constants/validation.ts` | Must add named temperature-max constants (standard and Claude Sonnet) |
| Schema/Validation | `AssistantForm.tsx` Yup schema, `VirtualAssistantForm.tsx` Yup schema | Must change static `.max(2)` to `Yup.when('llm_model_type', ...)` conditional |
| UI/Render | `AssistantSetupSection.tsx` temperature `<Input>`, `VirtualAssistantForm.tsx` temperature `<Input>` | Must make `placeholder` and any displayed range text conditional on selected model |
| Tests | `NewAssistantPage.integration.test.tsx` | Must update existing test (asserts old message + old placeholder) and add Claude Sonnet–specific test cases |

### Integration Points

**Internal module dependencies:**
- `AssistantForm.tsx` → `AssistantSetupSection.tsx` (renders Extra config accordion section)
- `AssistantSetupSection.tsx` → `LLMSelector.tsx` (model dropdown)
- `LLMSelector.tsx` → `appInfoStore` via `useSnapshot(appInfoStore)` (reads `llmModels`)
- `appInfoStore` → `GET v1/llm_models` (fetches model list at app load)
- Yup schema → `yupResolver` → `react-hook-form` `useForm` (validation flow in both `AssistantForm.tsx` and `VirtualAssistantForm.tsx`)

**API contract gap:**
- The `GET v1/llm_models` response currently has `features.temperature: boolean` but no `temperature_max` or equivalent field. Identifying Claude Sonnet by frontend string matching on `base_name` is possible (all Claude Sonnet `base_name` values contain `"claude"` and `"sonnet"`) but requires relying on naming conventions. Propagating `provider` through `ModelOption` enables a more robust check: `provider === "aws_bedrock" || provider === "google_vertexai"` AND `base_name` contains `"claude"` + `"sonnet"`.

### Patterns and Conventions

- **Yup static schema + `yupResolver`**: Both affected forms define a `Yup.object().shape({...})` at module scope (not inside the component). The guide in `form-patterns.md` mandates that the schema live in a dedicated `formSchema.ts` file alongside the form component. The established pattern for conditional field validation is `Yup.when('siblingField', (value, schema) => ...)` — an existing example exists in `useEditPopupForm.ts`.
- **`Yup.when()` for cross-field rules**: Since `llm_model_type` is already a sibling field in both schemas, no restructuring is needed — `.when('llm_model_type', (modelValue, schema) => ...)` on the `temperature` field is the correct approach.
- **Valtio snapshot pattern**: Form components read model list via `useSnapshot(appInfoStore).llmModels`; after extending `ModelOption` to include `provider`, the schema's `Yup.when` callback can call `appInfoStore.llmModels.find(m => m.value === llmModelType)?.provider` or the form can pass it via Yup context.
- **Named constants for validation limits**: The `constants-usage.md` guide requires that numeric validation limits be extracted to `src/constants/validation.ts` with names like `VALIDATION_RULES.TEMPERATURE.MAX_STANDARD` (2) and `VALIDATION_RULES.TEMPERATURE.MAX_CLAUDE_SONNET` (1). Magic numbers in schemas are not permitted.
- **Inline error display**: Errors surface via the `error` prop on `<Input>`, populated from `fieldState.error?.message`. No separate `<FormMessage>` component is used. For raw spans the guide specifies `className="text-text-error text-sm"` with `role="alert"`.
- **No i18n**: The project has no react-i18next or translation files. All validation messages are plain English strings; new messages should be added to the `VALIDATION_MESSAGES` constant object in `src/constants/validation.ts`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/.ai-run/guides/patterns/form-patterns.md` — canonical guide for form validation; mandates separate `formSchema.ts`, `Yup.when()` for conditional fields, `fieldState.error?.message` wired to Input's `error` prop; directly governs how this fix must be structured
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/.ai-run/guides/development/error-handling-patterns.md` — covers inline form validation error display; shows `<span role="alert" className="text-text-error text-sm">{errors.field.message}</span>` pattern; specifies that validation lives in Yup schema, not component state
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/.ai-run/guides/development/constants-usage.md` — mandates that validation constraints be declared in `src/constants/validationRules.ts` (or `validation.ts`) as named exports; temperature max values must follow this pattern
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/.ai-run/guides/quality-gates.md` — lists mandatory pre-MR gates: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`

### Architectural Decisions

- No ADR files exist in the repository. The `docs/` directory contains only `superpowers/` and `tasks/` subfolders.
- The key architectural gap documented through code archaeology: `ModelOption` was intentionally stripped to three fields (`value`, `label`, `isDefault`) when the store was built. No prior decision record explains why `provider` and `features` were excluded. This omission is the root cause of the bug — the form has no way to know a model's temperature ceiling.

### Derived Conventions

- Conditional Yup validation based on a sibling field's value uses `.when('fieldName', (value, schema) => ...)` — established precedent in `useEditPopupForm.ts`
- Temperature numeric limits are currently magic numbers (`.max(2)`); the fix must move them to named constants in `src/constants/validation.ts`
- Placeholder text displaying the valid range (e.g., `"0-2"`) is hardcoded in the render component; the fix must make this reactive to the selected model, either via a computed variable or a prop passed down from the form
- New validation message strings follow the `VALIDATION_MESSAGES` constant pattern (plain English, no translation keys)
- The `ModelOption` type extension must be backward-compatible (`provider?: string` optional field) to avoid breaking any code that constructs `ModelOption` objects directly (e.g., in tests)

---

## 4. Testing Landscape

### Existing Coverage

- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` — two temperature-related integration tests:
  - Line ~1160: `"includes temperature and top_p in POST body from Extra Configuration"` — submits value `0.7`, verifies it appears in the POST body; uses `llm_model_type: ''` (no model selected)
  - Line ~1193: `"shows validation errors for temperature out of range"` — enters value `5`, expects the message `"Temperature must be at most 2"`; also queries by `getByPlaceholderText('0-2')`. **Both assertions will break** when the fix is applied.
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/pages/workflows/editor/utils/__tests__/visualEditorFieldRegistry.test.ts` — references `temperature` as a field key in `registerFields()` calls; no validation logic tested

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 with two workspace projects — `unit` (jsdom, Valtio mocked) and `integration` (jsdom, real Valtio + mocked `fetch` via `global.fetch`)
- **Dependencies**: @testing-library/react 16.3.0, @testing-library/user-event 14.6.1, @testing-library/jest-dom 6.6.3
- **Fixture factory**: inline `createAssistantFixture(overrides = {})` returns a plain assistant object with spread overrides including `llm_model_type`; this is the entry point for injecting a Claude Sonnet model value in new tests
- **`mockAPI` helper**: `mockAPI('GET', url, data, status?)` registers fake fetch responses keyed by URL; the test can override the `GET v1/llm_models` response to return a fixture with a Claude Sonnet model (including `provider`) for model-conditional tests
- **`renderPage` helper**: `renderPage('/assistants/new')` from `src/test-utils/integration.tsx` renders the full router; tests then interact via userEvent
- **Interaction pattern**: `user.click(screen.getByRole('button', { name: /Extra configuration/i }))` opens the accordion; temperature input found via `screen.getByPlaceholderText('0-2')` — this query string will need updating after the fix

### Coverage Gaps

1. **No test for model-conditional temperature max** — no test selects a Bedrock or Vertex Claude Sonnet model and then validates that temperature > 1 is rejected (the core bug scenario)
2. **No test that temperature 1.5 is rejected for Claude Sonnet but accepted for OpenAI models** — regression case required by acceptance criteria
3. **No temperature test for `EditAssistantPage`** — the Extra configuration accordion is never opened or submitted in any edit-flow test
4. **No temperature test for `VirtualAssistantForm`** (workflow editor) — the parallel form with the same bug has zero test coverage
5. **No assertion on placeholder text being model-conditional** — after the fix, the placeholder should read `"0-1"` when a Claude Sonnet model is selected; not currently tested

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — backend base URL; at runtime resolved from `window._env_.VITE_API_URL` with `import.meta.env.VITE_API_URL` as fallback (defined in `src/utils/api.ts` line ~126); defaults to `/api` in `.env`
- `VITE_ENV` — mode string; value `"local"` triggers injection of a `user-id` dev-auth header; no model-provider-specific env vars exist

### Configuration Files

- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/config.js` — runtime env injection script; overrides `VITE_API_URL`, `VITE_ENV`, `VITE_APP_VERSION` via `window._env_`; no model configuration
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/.env` — local dev defaults; `VITE_API_URL=/api`; no LLM model constants
- `/Users/Evgenii_Kurdakov/Desktop/projects/codemie-dev/codemie-ui/src/constants/validation.ts` — the canonical home for `VALIDATION_MESSAGES` and `VALIDATION_CONSTRAINTS`; temperature-related constants must be added here
- No model-specific constants exist anywhere in `src/constants/` for temperature ranges

### Feature Flags and Deployment Concerns

- No feature flags or runtime toggles exist for LLM model configuration in this codebase.
- No deployment manifest changes are required for this fix — it is a pure UI-layer change.
- The mock server at `/mock-server/db.json` may need updating to add `"temperature_max": 1` to the `features` object for Claude Sonnet models if a `temperature_max` API field approach is chosen for the fix. This is optional if the string-pattern approach is used instead.

---

## 6. Risk Indicators

- **API response has no `temperature_max` field** — `GET v1/llm_models` returns `features.temperature: boolean` only. Two fix strategies exist: (a) frontend-only string-pattern match on `base_name` (fragile if naming conventions change), or (b) propagate `provider` through `ModelOption` and use a lookup to determine max. A third option — adding `temperature_max` to the backend API response — is more robust but crosses the Frontend ticket boundary. The frontend-only approach using `provider` + `base_name` pattern is the lowest-risk in-scope option.
- **`provider` field is discarded at ingestion** — `appInfoStore.getLLMModels()` explicitly strips the API response to 3 fields. Adding `provider` to `ModelOption` is a type-contract change that affects every consumer of `appInfoStore.llmModels`. The type change is backward-compatible (optional field), but every test that constructs a `ModelOption` directly may need updating.
- **Schema is defined at module scope (static)** — the Yup schema in `AssistantForm.tsx` is not recreated on render. `Yup.when()` works correctly with static schemas (it evaluates lazily at validation time), but accessing `appInfoStore` from inside a Yup `.when()` callback introduces a side-effect into the schema. The cleaner alternative is Yup's context option (`context: { maxTemperature }` passed to `useForm`'s resolver options) — this keeps the schema pure and testable. The guides do not prescribe either approach explicitly; the `Yup.when()` pattern seen in `useEditPopupForm.ts` is the closest precedent.
- **Duplicate schemas in two independent files** — `AssistantForm.tsx` and `VirtualAssistantForm.tsx` each have their own full Yup schema. Both must be updated; if one is missed, the bug remains in that form. There is no shared schema utility.
- **Existing test will break** — `NewAssistantPage.integration.test.tsx:~1193` asserts `screen.getByText('Temperature must be at most 2')` and uses `getByPlaceholderText('0-2')`. Both assertions target the old values and must be updated as part of the fix.
- **`getByPlaceholderText('0-2')` used as the primary query selector** — if placeholder becomes conditional, the test query strategy must change (e.g., find by `aria-label` or a `data-testid`).
- **No prior model-specific UI behavior exists** — this fix introduces the first instance of UI behavior that varies based on the selected LLM model. There is no established pattern to follow; the implementation will set the precedent for future model-capability-aware UI.
- **Acceptance criteria require regression validation for non-Claude models** — this needs an explicit test asserting that selecting a non-Claude model leaves temperature max at 2. This test does not currently exist.
- **No i18n** — validation messages are plain strings. No translation infrastructure to wire up; new messages go directly into the Yup schema (via the constants file). Low risk but worth noting if i18n is planned.

---

## 7. Summary for Complexity Assessment

This task requires changes across five distinct layers — Types, Store, Constants, Schema/Validation, and UI/Render — plus test updates, all to introduce the first instance of per-model conditional UI behavior in this codebase. The file change surface is 6–8 source files plus 1–2 test files: `src/types/entity/configuration.ts`, `src/store/appInfo.ts`, `src/constants/validation.ts`, `AssistantForm.tsx` (or a new `formSchema.ts`), `AssistantSetupSection.tsx`, `VirtualAssistantForm.tsx`, and `NewAssistantPage.integration.test.tsx` (update + new cases). The changes are individually small but tightly coupled — the type change in `ModelOption` must propagate correctly through the store, schema, and render layers or the validation silently falls back to the wrong maximum.

Technically, this fix introduces a novel pattern (per-model schema conditional) that no existing code demonstrates end-to-end. The closest precedent is `Yup.when()` in `useEditPopupForm.ts`, but that does not involve reading from the Valtio store inside the schema callback. The implementer must choose between using `Yup.when()` (which requires accessing `appInfoStore` as a side-effect in the schema callback) or using Yup's `context` option (cleaner, more testable, but slightly more wiring in `useForm`). The `form-patterns.md` guide's mandate to keep the schema in a separate `formSchema.ts` further complicates the store-access approach. Overall this is novel-pattern territory without a complete in-codebase precedent.

Test coverage for the affected area is thin and specifically broken for this scenario: the existing "out of range" test asserts the old `max(2)` behavior and will fail immediately when the fix is applied. The fix must update that test and add five new test scenarios to satisfy the acceptance criteria (Claude Sonnet Bedrock max=1, Claude Sonnet Vertex max=1, non-Claude model max=2 regression, boundary value 1.0 accepted, boundary value 1.01 rejected). The workflow editor form (`VirtualAssistantForm`) has zero temperature test coverage and will need at least one new integration test. Given the cross-layer scope, the novel pattern introduction, and the test debt that must be paid alongside the fix, this should be scored as medium-high complexity.
