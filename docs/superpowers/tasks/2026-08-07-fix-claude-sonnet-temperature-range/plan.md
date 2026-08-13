# Plan: EPMCDME-13882 — Constrain Temperature to 0–1 for Claude Models on Bedrock and Vertex

**Goal:** Enforce model-aware Temperature validation (0–1 for Claude on Bedrock/Vertex, 0–2 otherwise) in both `AssistantForm` and workflow-editor `VirtualAssistantForm`, with a shared helper, before requests reach the backend.

**Architecture:** Extend `ModelOption` to carry `provider`, add named validation constants, extract a shared `temperatureConstraints` helper that reads the Valtio `appInfoStore` lazily inside a `Yup.when('llm_model_type', ...)` callback, and consume the helper from both duplicate forms plus their render layers. Placeholder text updates reactively; tests query via `data-testid` so they no longer depend on the reactive placeholder value.

**Tech Stack:** React 18, TypeScript, Vite, react-hook-form, Yup, Valtio, Vitest, React Testing Library.

## Global Constraints

- Commit message format: `EPMCDME-13882: Capital-first sentence` (Tekton CI enforces regex).
- Branch: already on `EPMCDME-13882_fix-claude-sonnet-temperature-range`.
- Pre-commit runs lint + license headers + secrets + sonar — never `--no-verify`.
- Do NOT edit `mock-server/db.json` — it already includes a `provider` field on every entry (verified: `azure_openai`, `aws_bedrock`, `google_vertexai`).
- Do NOT change the backend API contract (Frontend ticket).
- Follow `.ai-run/guides/patterns/form-patterns.md` (Yup schema conventions) and `.ai-run/guides/development/constants-usage.md` (named constants).
- Every new `.ts` / `.tsx` file starts with the standard EPAM Apache 2.0 header — copy verbatim from `src/types/entity/configuration.ts:1-15`.

## Yup + Valtio Access Pattern (referenced by later tasks)

The shared helper `getTemperatureMax(modelValue)` reads `appInfoStore.llmModels` at call time. The Yup schema definition executes once at module load, but `Yup.when(...)`'s callback runs at *validation* time — every time the form validates the temperature field. Reading the Valtio store proxy from inside that callback is safe: by the time a user submits, `appInfoStore.getLLMModels()` has resolved (both forms live under app routes that fire the fetch on mount). The helper's file header documents this rationale. This is the ONLY place schema code touches a store in this codebase; do not repeat the pattern elsewhere without the same justification.

---

## Task 1: Extend `ModelOption` with optional `provider` field

**Test-first: no — pure type addition; behavior verified by Task 4's helper tests that construct `ModelOption` values.**

**Files:**
- Modify: `src/types/entity/configuration.ts:34-38`

**Interfaces:**
- Consumes: none
- Produces: `ModelOption.provider?: string`

- [ ] **Step 1: Change the interface**

Before:
```typescript
export interface ModelOption {
  value: string
  label: string
  isDefault: boolean
}
```
After:
```typescript
export interface ModelOption {
  value: string
  label: string
  isDefault: boolean
  provider?: string
}
```

- [ ] **Step 2: Verify types still compile**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors — optional field is backward-compatible).

- [ ] **Step 3: Commit**

```bash
git add src/types/entity/configuration.ts
git commit -m "EPMCDME-13882: Add optional provider field to ModelOption"
```

---

## Task 2: Propagate `provider` in `appInfoStore.getLLMModels`

**Test-first: no — data-plumbing change; Task 4's helper unit tests fail without this propagation because the store lookup returns models with no `provider`.**

**Files:**
- Modify: `src/store/appInfo.ts:256-271`

**Interfaces:**
- Consumes: `ModelOption.provider` (Task 1)
- Produces: `appInfoStore.llmModels[i].provider` populated from `data[i].provider`

- [ ] **Step 1: Add the mapping line**

Before (lines 261-265):
```typescript
appInfoStore.llmModels = data.map((model: any) => ({
  value: model.base_name,
  label: model.label,
  isDefault: model.default,
}))
```
After:
```typescript
appInfoStore.llmModels = data.map((model: any) => ({
  value: model.base_name,
  label: model.label,
  isDefault: model.default,
  provider: model.provider,
}))
```

Do NOT touch `getImageGenerationModels` (out of scope).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/appInfo.ts
git commit -m "EPMCDME-13882: Propagate provider through llm_models store mapping"
```

---

## Task 3: Add temperature validation constants and messages

**Test-first: no — constants only; consumed by Task 4's helper and its tests.**

**Files:**
- Modify: `src/constants/validation.ts:29-52`

**Interfaces:**
- Consumes: none
- Produces:
  - `VALIDATION_CONSTRAINTS.TEMPERATURE_MIN: 0`
  - `VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_STANDARD: 2`
  - `VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_CLAUDE: 1`
  - `VALIDATION_MESSAGES.TEMPERATURE_MIN: string`
  - `VALIDATION_MESSAGES.TEMPERATURE_MAX_STANDARD: string`
  - `VALIDATION_MESSAGES.TEMPERATURE_MAX_CLAUDE: string`
  - `VALIDATION_MESSAGES.TEMPERATURE_TYPE: string`

- [ ] **Step 1: Extend `VALIDATION_CONSTRAINTS`**

Add these three keys (place at the end of the object, before the closing brace on line 35):
```typescript
  TEMPERATURE_MIN: 0,
  TEMPERATURE_MAX_STANDARD: 2,
  TEMPERATURE_MAX_CLAUDE: 1,
```

- [ ] **Step 2: Extend `VALIDATION_MESSAGES`**

Add these four keys (place at the end of the object, before the closing brace on line 52):
```typescript
  TEMPERATURE_MIN: `Temperature must be at least ${VALIDATION_CONSTRAINTS.TEMPERATURE_MIN}`,
  TEMPERATURE_MAX_STANDARD: `Temperature must be between ${VALIDATION_CONSTRAINTS.TEMPERATURE_MIN} and ${VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_STANDARD}`,
  TEMPERATURE_MAX_CLAUDE: `Temperature must be between ${VALIDATION_CONSTRAINTS.TEMPERATURE_MIN} and ${VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_CLAUDE} for Claude models`,
  TEMPERATURE_TYPE: 'Temperature must be a number',
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/constants/validation.ts
git commit -m "EPMCDME-13882: Add temperature validation constants and messages"
```

---

## Task 4: Create shared `temperatureConstraints` helper (with unit tests)

**Test-first: yes — unit tests for `isClaudeOnAnthropicProvider`, `getTemperatureMax`, and `buildTemperatureRule` fail because the file does not exist yet.**

**Files:**
- Create: `src/pages/assistants/utils/temperatureConstraints.ts`
- Create: `src/pages/assistants/utils/__tests__/temperatureConstraints.test.ts`

**Interfaces:**
- Consumes: `ModelOption.provider` (Task 1), `appInfoStore.llmModels` populated with provider (Task 2), `VALIDATION_CONSTRAINTS.TEMPERATURE_*` + `VALIDATION_MESSAGES.TEMPERATURE_*` (Task 3).
- Produces:
  - `isClaudeOnAnthropicProvider(model: ModelOption | undefined): boolean`
  - `getTemperatureMax(modelValue: string | undefined): number`
  - `buildTemperatureRule(): Yup.NumberSchema`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/assistants/utils/__tests__/temperatureConstraints.test.ts` (paste EPAM header first, then the test body below):

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import * as Yup from 'yup'

import { appInfoStore } from '@/store'
import { ModelOption } from '@/types/entity/configuration'

import {
  isClaudeOnAnthropicProvider,
  getTemperatureMax,
  buildTemperatureRule,
} from '../temperatureConstraints'

const model = (over: Partial<ModelOption>): ModelOption => ({
  value: 'model-value',
  label: 'Model Label',
  isDefault: false,
  ...over,
})

describe('isClaudeOnAnthropicProvider', () => {
  it.each<[string, ModelOption | undefined, boolean]>([
    ['undefined model', undefined, false],
    ['gpt-4o on azure_openai', model({ value: 'gpt-4o', provider: 'azure_openai' }), false],
    ['gpt-4o on aws_bedrock (defensive)', model({ value: 'gpt-4o', provider: 'aws_bedrock' }), false],
    ['claude-3-5-sonnet on aws_bedrock', model({ value: 'claude-3-5-sonnet', provider: 'aws_bedrock' }), true],
    ['claude-4-opus on aws_bedrock', model({ value: 'claude-4-opus', provider: 'aws_bedrock' }), true],
    ['claude-sonnet-v2-vertex on google_vertexai', model({ value: 'claude-sonnet-v2-vertex', provider: 'google_vertexai' }), true],
    ['claude-3-5-sonnet on azure_openai (wrong provider)', model({ value: 'claude-3-5-sonnet', provider: 'azure_openai' }), false],
    ['claude on aws_bedrock with no provider field', model({ value: 'claude-3-5-sonnet' }), false],
    ['case-insensitive CLAUDE-4-OPUS on aws_bedrock', model({ value: 'CLAUDE-4-OPUS', provider: 'aws_bedrock' }), true],
  ])('%s → %s', (_desc, input, expected) => {
    expect(isClaudeOnAnthropicProvider(input)).toBe(expected)
  })
})

describe('getTemperatureMax', () => {
  beforeEach(() => {
    appInfoStore.llmModels = [
      model({ value: 'claude-3-5-sonnet', provider: 'aws_bedrock', label: 'Bedrock Claude 3.5 Sonnet' }),
      model({ value: 'claude-sonnet-v2-vertex', provider: 'google_vertexai', label: 'Vertex Claude Sonnet v2' }),
      model({ value: 'gpt-4o-2024-08-06', provider: 'azure_openai', label: 'GPT-4o' }),
    ]
  })

  it('returns 1 for a Claude Bedrock model', () => {
    expect(getTemperatureMax('claude-3-5-sonnet')).toBe(1)
  })

  it('returns 1 for a Claude Vertex model', () => {
    expect(getTemperatureMax('claude-sonnet-v2-vertex')).toBe(1)
  })

  it('returns 2 for a non-Claude model', () => {
    expect(getTemperatureMax('gpt-4o-2024-08-06')).toBe(2)
  })

  it('returns 2 (safe default) for an unknown model value', () => {
    expect(getTemperatureMax('does-not-exist')).toBe(2)
  })

  it('returns 2 for undefined model value', () => {
    expect(getTemperatureMax(undefined)).toBe(2)
  })
})

describe('buildTemperatureRule', () => {
  beforeEach(() => {
    appInfoStore.llmModels = [
      model({ value: 'claude-3-5-sonnet', provider: 'aws_bedrock', label: 'Bedrock Claude 3.5 Sonnet' }),
      model({ value: 'gpt-4o-2024-08-06', provider: 'azure_openai', label: 'GPT-4o' }),
    ]
  })

  const wrap = () =>
    Yup.object({
      llm_model_type: Yup.string(),
      temperature: buildTemperatureRule(),
    })

  it('accepts 0.5 for any selected model', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', temperature: 0.5 })
    ).resolves.toBeDefined()
    await expect(
      wrap().validate({ llm_model_type: 'claude-3-5-sonnet', temperature: 0.5 })
    ).resolves.toBeDefined()
  })

  it('accepts boundary 1.0 for Claude', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'claude-3-5-sonnet', temperature: 1 })
    ).resolves.toBeDefined()
  })

  it('rejects 1.5 for Claude with the Claude-specific message', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'claude-3-5-sonnet', temperature: 1.5 })
    ).rejects.toThrow(/between 0 and 1 for Claude models/)
  })

  it('accepts 1.5 for a non-Claude model', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', temperature: 1.5 })
    ).resolves.toBeDefined()
  })

  it('rejects 2.5 for a non-Claude model with the standard message', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', temperature: 2.5 })
    ).rejects.toThrow(/between 0 and 2/)
  })

  it('rejects negative values with the min message', async () => {
    await expect(
      wrap().validate({ llm_model_type: 'gpt-4o-2024-08-06', temperature: -0.1 })
    ).rejects.toThrow(/at least 0/)
  })
})
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npx vitest run src/pages/assistants/utils/__tests__/temperatureConstraints.test.ts`
Expected: FAIL with `Failed to resolve import "../temperatureConstraints"`.

- [ ] **Step 3: Implement the helper**

Create `src/pages/assistants/utils/temperatureConstraints.ts` (paste EPAM header first, then):

```typescript
import * as Yup from 'yup'

import { VALIDATION_CONSTRAINTS, VALIDATION_MESSAGES } from '@/constants/validation'
import { appInfoStore } from '@/store'
import { ModelOption } from '@/types/entity/configuration'

/**
 * Temperature constraints helper — single source of truth for the model-conditional temperature max.
 *
 * Anthropic Claude models on AWS Bedrock and Google Vertex cap temperature at 1.0
 * per the Anthropic API contract. All other providers currently accept 0-2.
 *
 * `Yup.when(...)`'s callback runs at VALIDATION time, not schema-definition time, so
 * reading `appInfoStore.llmModels` from inside `buildTemperatureRule` below is safe:
 * both consumer forms live under app routes that fire `getLLMModels()` on mount, so
 * the store is populated by the time any user-triggered validation runs. This is
 * the only place schema code touches a store in this codebase — do not repeat this
 * pattern elsewhere without the same justification.
 */

const CLAUDE_TEMPERATURE_PROVIDERS = new Set(['aws_bedrock', 'google_vertexai'])

export function isClaudeOnAnthropicProvider(model: ModelOption | undefined): boolean {
  if (!model?.provider) return false
  if (!CLAUDE_TEMPERATURE_PROVIDERS.has(model.provider)) return false
  return model.value.toLowerCase().includes('claude')
}

export function getTemperatureMax(modelValue: string | undefined): number {
  if (!modelValue) return VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_STANDARD
  const model = appInfoStore.llmModels.find((m) => m.value === modelValue)
  return isClaudeOnAnthropicProvider(model)
    ? VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_CLAUDE
    : VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_STANDARD
}

export function buildTemperatureRule(): Yup.NumberSchema {
  return Yup.number()
    .min(VALIDATION_CONSTRAINTS.TEMPERATURE_MIN, VALIDATION_MESSAGES.TEMPERATURE_MIN)
    .when('llm_model_type', ([modelValue]: [string | undefined], schema: Yup.NumberSchema) => {
      const max = getTemperatureMax(modelValue)
      const message =
        max === VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_CLAUDE
          ? VALIDATION_MESSAGES.TEMPERATURE_MAX_CLAUDE
          : VALIDATION_MESSAGES.TEMPERATURE_MAX_STANDARD
      return schema.max(max, message)
    })
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError(VALIDATION_MESSAGES.TEMPERATURE_TYPE)
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npx vitest run src/pages/assistants/utils/__tests__/temperatureConstraints.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/pages/assistants/utils/temperatureConstraints.ts src/pages/assistants/utils/__tests__/temperatureConstraints.test.ts
git commit -m "EPMCDME-13882: Add shared temperature constraints helper for Claude models"
```

---

## Task 5: Swap `AssistantForm` schema to use `buildTemperatureRule`

**Test-first: no — schema swap only; behavior is covered by Task 4's helper unit tests (contract) and by Task 9's integration tests (form-level end-to-end). Adding a per-form integration test here would duplicate Task 9.**

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:30-31,131-135`

**Interfaces:**
- Consumes: `buildTemperatureRule` from Task 4
- Produces: `AssistantForm` schema respects model-conditional temperature max

- [ ] **Step 1: Add the import**

Add to the existing imports block (near the other `@/pages/assistants/...` imports, alphabetical order — around line 45-50):
```typescript
import { buildTemperatureRule } from '@/pages/assistants/utils/temperatureConstraints'
```

- [ ] **Step 2: Replace the inline rule**

At lines 131-135, replace:
```typescript
temperature: Yup.number()
  .min(0, 'Temperature must be at least 0')
  .max(2, 'Temperature must be at most 2')
  .transform((value, originalValue) => (originalValue === '' ? undefined : value))
  .typeError('Temperature must be a number'),
```
with:
```typescript
temperature: buildTemperatureRule(),
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/assistants/components/AssistantForm/AssistantForm.tsx
git commit -m "EPMCDME-13882: Use temperatureConstraints helper in AssistantForm schema"
```

---

## Task 6: Swap `VirtualAssistantForm` schema and add a workflow-editor integration test

**Test-first: yes — new test `src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.test.tsx` fails because the schema is still `.max(2)` for Claude.**

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` (import + schema, lines 30-40 and 99-104)
- Create: `src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.test.tsx`

**Interfaces:**
- Consumes: `buildTemperatureRule` from Task 4
- Produces: `VirtualAssistantForm` schema respects model-conditional temperature max; new test file establishes coverage for this form's temperature validation

- [ ] **Step 1: Write the failing test**

Create the test file. Follow the existing integration-test pattern used by other workflow-editor tests (search `src/pages/workflows/**/*.test.tsx` for a working example of how `VirtualAssistantForm` gets rendered in isolation — it needs a react-hook-form `FormProvider` wrapper because it uses `useFormContext`). At minimum, cover:
- `appInfoStore.llmModels` seeded with one Claude Bedrock model and one non-Claude model
- Render the form with `llm_model_type: 'claude-3-5-sonnet'`, type `1.5` into the temperature input queried by `data-testid="virtual-assistant-temperature-input"` (added in Task 8), assert the message `Temperature must be between 0 and 1 for Claude models` appears
- Same render with `llm_model_type: 'gpt-4o-2024-08-06'` and temperature `1.5` → no error message

If the workflow-editor form is only exercised in existing tests via a parent panel component, mirror that setup here rather than building a bespoke render.

- [ ] **Step 2: Run the test to verify RED**

Run: `npx vitest run src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.test.tsx`
Expected: FAIL — either the assertion about the Claude message (schema still allows 1.5), or (before Task 8 lands) `unable to find element by data-testid`. If it's the latter, complete Task 8 before rerunning; the test file itself is committed with this task.

- [ ] **Step 3: Change the schema**

Add import near the other imports at the top:
```typescript
import { buildTemperatureRule } from '@/pages/assistants/utils/temperatureConstraints'
```
Replace lines 99-104:
```typescript
temperature: Yup.number()
  .min(0, 'Temperature must be at least 0')
  .max(2, 'Temperature must be at most 2')
  .transform((value, originalValue) => (originalValue === '' ? undefined : value))
  .typeError('Temperature must be a number')
  .optional(),
```
with:
```typescript
temperature: buildTemperatureRule().optional(),
```

- [ ] **Step 4: Run the test to verify GREEN**

Run: `npx vitest run src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.test.tsx
git commit -m "EPMCDME-13882: Use temperatureConstraints helper in VirtualAssistantForm and cover it"
```

---

## Task 7: Model-aware placeholder + `data-testid` in `AssistantSetupSection`

**Test-first: no — visual/DOM affordance change; verified end-to-end by Task 9's updated integration tests.**

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx:288-300` (plus imports)

**Interfaces:**
- Consumes: `getTemperatureMax` from Task 4; `VALIDATION_CONSTRAINTS.TEMPERATURE_MIN` from Task 3
- Produces: temperature input renders `placeholder={``${MIN}-${max}``}` reactively; input carries `data-testid="assistant-temperature-input"`

- [ ] **Step 1: Add imports**

At the top of the file, alongside existing imports:
```typescript
import { useWatch } from 'react-hook-form'

import { VALIDATION_CONSTRAINTS } from '@/constants/validation'
import { getTemperatureMax } from '@/pages/assistants/utils/temperatureConstraints'
```
(If `useWatch` from `react-hook-form` is already imported in this file, extend the existing import rather than adding a new line.)

- [ ] **Step 2: Compute the placeholder inside the component body**

Where the component reads `control` (this file uses `<Controller>` which requires `control` — locate the existing `control` variable at the top of the component's body), add:
```typescript
const selectedModel = useWatch({ control, name: 'llm_model_type' }) as string | undefined
const temperatureMax = getTemperatureMax(selectedModel)
const temperaturePlaceholder = `${VALIDATION_CONSTRAINTS.TEMPERATURE_MIN}-${temperatureMax}`
```

- [ ] **Step 3: Update the temperature Input JSX**

At lines 288-300, replace:
```tsx
<Controller
  name="temperature"
  control={control}
  render={({ field, fieldState }) => (
    <Input
      label="Temperature"
      placeholder="0-2"
      rootClass="w-24"
      error={fieldState.error?.message}
      {...field}
    />
  )}
/>
```
with:
```tsx
<Controller
  name="temperature"
  control={control}
  render={({ field, fieldState }) => (
    <Input
      label="Temperature"
      placeholder={temperaturePlaceholder}
      rootClass="w-24"
      error={fieldState.error?.message}
      data-testid="assistant-temperature-input"
      {...field}
    />
  )}
/>
```
Do NOT touch the neighboring `top_p` Input — its `placeholder="0-1"` stays static.

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx
git commit -m "EPMCDME-13882: Make Assistant temperature placeholder model-aware and add data-testid"
```

---

## Task 8: Model-aware placeholder + `data-testid` in `VirtualAssistantForm` render

**Test-first: no — paired render change; verified by Task 6's integration test.**

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx:339-351` (plus imports)

**Interfaces:**
- Consumes: `getTemperatureMax` (Task 4), `VALIDATION_CONSTRAINTS.TEMPERATURE_MIN` (Task 3)
- Produces: workflow-editor temperature input placeholder is model-aware; input carries `data-testid="virtual-assistant-temperature-input"`

- [ ] **Step 1: Add imports (if not already present from Task 6)**

```typescript
import { useWatch } from 'react-hook-form'

import { VALIDATION_CONSTRAINTS } from '@/constants/validation'
import { getTemperatureMax } from '@/pages/assistants/utils/temperatureConstraints'
```

- [ ] **Step 2: Compute placeholder in the component body**

Same three lines as Task 7, adjacent to where `control` is destructured/created:
```typescript
const selectedModel = useWatch({ control, name: 'llm_model_type' }) as string | undefined
const temperatureMax = getTemperatureMax(selectedModel)
const temperaturePlaceholder = `${VALIDATION_CONSTRAINTS.TEMPERATURE_MIN}-${temperatureMax}`
```

- [ ] **Step 3: Update the temperature Input JSX**

At lines 339-351, replace `placeholder="0-2"` with `placeholder={temperaturePlaceholder}` and add `data-testid="virtual-assistant-temperature-input"` to the `<Input>`. Leave the surrounding `FieldController` and other Input props untouched.

- [ ] **Step 4: Verify types + lint + re-run Task 6's test**

Run: `npx tsc --noEmit && npm run lint && npx vitest run src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx
git commit -m "EPMCDME-13882: Make VirtualAssistant temperature placeholder model-aware and add data-testid"
```

---

## Task 9: Repair and extend `NewAssistantPage` integration tests

**Test-first: yes — after Task 7, the existing tests at `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx:1177` and `:1206,1208` break because they query the temperature input by `getByPlaceholderText('0-2')` and the placeholder is now dynamic. The new Claude Bedrock/Vertex/regression/boundary cases also fail because they don't exist yet. Run tests first to see the failures, then update.**

**Files:**
- Modify: `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx:1160-1214`

**Interfaces:**
- Consumes: `data-testid="assistant-temperature-input"` (Task 7); model-conditional schema (Task 5); shared helper (Task 4)
- Produces: integration coverage for Claude Bedrock reject, Claude Vertex reject, non-Claude regression accept, Claude boundary accept

- [ ] **Step 1: Establish RED**

Run: `npx vitest run src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx -t "Extra Configuration"`
Expected: FAIL — two tests fail on `Unable to find an element with the placeholder text of: 0-2` (once Task 7 landed) and/or on the outdated error assertion.

- [ ] **Step 2: Update the existing "temperature and top_p in POST body" test (line 1160-1191)**

Replace:
```typescript
await user.type(screen.getByPlaceholderText('0-2'), '0.7')
await user.type(screen.getByPlaceholderText('0-1'), '0.9')
```
with:
```typescript
await user.type(screen.getByTestId('assistant-temperature-input'), '0.7')
await user.type(screen.getByPlaceholderText('0-1'), '0.9')
```
The `top_p` input keeps its `placeholder="0-1"` (unchanged). The temperature input query moves to `data-testid`.

- [ ] **Step 3: Update the existing "shows validation errors for temperature out of range" test (line 1193-1214)**

Replace the query and the assertion:
```typescript
await waitFor(() => {
  expect(screen.getByTestId('assistant-temperature-input')).toBeInTheDocument()
})
await user.type(screen.getByTestId('assistant-temperature-input'), '5')
await user.click(screen.getByPlaceholderText('Name*'))

await waitFor(() => {
  expect(screen.getByText('Temperature must be between 0 and 2')).toBeInTheDocument()
})
```
Rationale: no model is selected in this test, so `getTemperatureMax` returns the standard max of 2 and the new standard message applies.

- [ ] **Step 4: Add the four new scenarios**

Insert immediately before the closing `})` of the `Extra Configuration` describe (currently line 1215). Use the existing `mockAPI('GET', 'v1/llm_models', <fixture>)` + `renderPage('/assistants/new')` + `user.click(...)` idiom used elsewhere in this file. Each scenario:

1. Seeds `v1/llm_models` with an appropriate fixture (Claude Bedrock, Claude Vertex, or an OpenAI-only fixture — reuse the `provider` shapes exactly as they appear in `mock-server/db.json`).
2. Opens the LLM model dropdown and picks the seeded model. Search for existing dropdown-selection helpers in this file; if none exist, click the LLMSelector trigger and click the option by its `label`.
3. Opens `Extra configuration`.
4. Types the target temperature value into `screen.getByTestId('assistant-temperature-input')`.
5. Blurs by clicking `screen.getByPlaceholderText('Name*')` (matches the existing tests' pattern).
6. Asserts on the message (`getByText`) or its absence (`queryByText(...) === null` inside `waitFor`).

Test cases:
- `"rejects temperature 1.5 for Claude Sonnet on Bedrock"` — Claude Bedrock fixture, type `1.5`, assert `Temperature must be between 0 and 1 for Claude models`.
- `"rejects temperature 1.5 for Claude Sonnet on Vertex"` — Claude Vertex fixture (`provider: 'google_vertexai'`), type `1.5`, same assertion.
- `"accepts temperature 1.5 for a non-Claude model (regression)"` — OpenAI-only fixture, type `1.5`, assert `queryByText(/Temperature must be/)` returns `null` after a short `waitFor` window.
- `"accepts temperature boundary 1.0 for Claude Sonnet"` — Claude Bedrock fixture, type `1`, same absence-assertion.

- [ ] **Step 5: Run all Extra Configuration tests to verify GREEN**

Run: `npx vitest run src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx -t "Extra Configuration"`
Expected: all PASS (original two, updated; four new).

- [ ] **Step 6: Commit**

```bash
git add src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx
git commit -m "EPMCDME-13882: Update and extend integration tests for model-aware temperature validation"
```

---

## Task 10: Full validation and test-harness capture

**Test-first: no — aggregate validation gate before MR handoff.**

**Files:** none modified — this task is a validation checkpoint.

**Interfaces:**
- Consumes: all prior tasks
- Produces: captured `npm run test-harness` console log (required verbatim in the MR description)

- [ ] **Step 1: Run each gate in order**

```
npm run lint
npx tsc --noEmit
npm run test:unit
npm run test:integration
npm run test-harness
```
If any step fails, fix the underlying issue and re-run *that* step; then continue from the next. Do not `--no-verify`, do not skip.

- [ ] **Step 2: Capture the test-harness log**

Save the full console output of `npm run test-harness` — it must appear verbatim in the MR description (per repo policy in `.ai-run/guides/standards/git-workflow.md`).

- [ ] **Step 3: Confirm no working-tree drift beyond the plan's files**

Run: `git status --porcelain`
Expected: only the files this plan touched (plus the pre-existing `config.js` local dev override, which stays uncommitted).

- [ ] **Step 4: No commit here** — this task ends when all commands pass and the harness log is captured.

---

## Post-Implementation Notes

- **MR title**: `EPMCDME-13882: Constrain temperature to 0-1 for Claude models on Bedrock and Vertex`
- **MR description** MUST include:
  1. Full `npm run test-harness` console log inside a `<details>` block (compliance bot enforces).
  2. Explicit note about the deliberate scope-widening: the ticket AC names "Claude Sonnet" but this fix caps ALL Claude models on Bedrock and Vertex, because Anthropic's API caps every Claude family at 1.0 — capping only Sonnet leaves the same 400 waiting for Opus and Haiku.
  3. Before/after UI screenshots of the Extra configuration section: showing the new "0-1" placeholder when a Claude model is selected, the new validation message, and the unchanged "0-2" placeholder for OpenAI models.
- **Lifecycle adapter emissions** (`artifact_published` for `plan.md`, `record_complexity_score` actual after Stage 8) are handled outside this plan by the `sdlc-standard` skill. Do not add adapter calls to task steps.
