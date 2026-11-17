# Support Anthropic's `effort` Parameter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the UI show and submit a per-model `effort` level instead of `temperature`,
driven entirely by backend-sourced model capability — zero frontend hardcoding of models/values.

**Architecture:** New `ModelOption.effortLevels`/`temperatureSupported` fields populated in
`mapLlmModel` from the backend's `features.effort`/`features.temperature`. A new
`effortConstraints.ts` util (mirrors `temperatureConstraints.ts`) resolves levels, builds the Yup
rule, and flags warning-tier levels. Both independently-maintained forms (`AssistantForm`,
`VirtualAssistantForm`) grow an Effort field with the same visibility rule; DTOs/types/transform
carry `effort` through exactly like `temperature`; a workflow-editor save-path site
(`AssistantTab.tsx`) that whitelists fields independently of the form gets `effort` added too.

**Tech Stack:** React 18, TypeScript, react-hook-form + Yup, Valtio, Vitest (unit/integration).

**Spec:** `docs/superpowers/tasks/2026-10-07-support-effort-parameter/spec.md`

Commit per task using the repository's existing convention.

## Global Constraints

- No frontend-hardcoded model-name → effort-value table; levels always come from
  `ModelOption.effortLevels` at runtime (spec Non-goals).
- No backend work in this plan: `features.effort`/`features.temperature` emission and the
  Anthropic/Bedrock request mapping are owned by a separate repo and are consumed as given.
- Fallback when `effortLevels` is absent/empty is Temperature-only, unchanged from today — zero
  regression for every model until backend adds the fields.
- Warning fires only for the fixed `['xhigh', 'max']` constant, never positionally from a model's
  own `effortLevels` order.
- No merging `AssistantForm`/`VirtualAssistantForm`; no blocking confirmation modal; no change to
  existing `temperature`/`top_p` validation ranges.

## Review Focus

- A saved temperature on an effort-capable model must stay visible and submitted until an effort is
  selected; typing then clearing the temperature input (`''`) must not make the field vanish. (Task 6, 7)
- Switching `llm_model_type` resets `temperature`, `top_p` and `effort`; re-selecting the same model
  must not reset them. (Task 6, 7)
- Selecting a warning level (`xhigh`/`max`) then switching to a model whose levels don't include it
  must not leave the warning message stuck on screen. (Task 6, 7)
- Empty-string/`null` `effort` on submit must become `undefined`, never `''`, matching the
  `temperature` coercion precedent — a stray `''` would reach the backend as a value. (Task 4, 7)
- The `AssistantTab.tsx` save path must not silently drop `effort` the way it would if only
  `VirtualAssistantForm.tsx` were touched — this is the spec's explicitly called-out regression.
  (Task 8)

---

### Task 1: `ModelOption` capability fields + `mapLlmModel` mapping

**Files:**
- Modify: `src/types/entity/configuration.ts:39-53` (`ModelOption`)
- Modify: `src/store/appInfo.ts:158-171` (`mapLlmModel`)
- Test: `src/store/__tests__/appInfo.test.ts`

**Interfaces:**
- Produces: `ModelOption.effortLevels?: string[]`, `ModelOption.temperatureSupported?: boolean`.

Test-first: yes — add a case to the existing `appInfoStore.getLLMModels` describe block asserting
that a raw model with `features: { effort: ['low', 'high'], temperature: false }` maps to
`effortLevels: ['low', 'high']`, `temperatureSupported: false`, and that a model with no `features`
key maps both to `undefined`.

- [ ] **Step 1:** Add the failing assertions to `appInfo.test.ts` (new `features.effort`/
  `features.temperature` fixture entries, expect them on the mapped `ModelOption`).
- [ ] **Step 2:** Run `npx vitest run --project unit src/store/__tests__/appInfo.test.ts` — expect
  FAIL (fields undefined/missing on the mapped object).
- [ ] **Step 3:** Add `effortLevels?: string[]` and `temperatureSupported?: boolean` to
  `ModelOption`; in `mapLlmModel` add `effortLevels: model.features?.effort,` and
  `temperatureSupported: model.features?.temperature,` next to the existing `supportsTools` line.
- [ ] **Step 4:** Re-run the same command — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 2: `effortConstraints.ts` util

**Files:**
- Create: `src/pages/assistants/utils/effortConstraints.ts`
- Modify: `src/constants/validation.ts` (add `EFFORT_WARNING_LEVELS` + an `EFFORT_INVALID` message)
- Test: `src/pages/assistants/utils/__tests__/effortConstraints.test.ts`

**Interfaces:**
- Consumes: `appInfoStore.llmModels` (Task 1's `ModelOption.effortLevels`).
- Produces: `getEffortLevels(modelValue: string | undefined): string[]`,
  `buildEffortRule(): Yup.StringSchema`, `isWarningEffortLevel(level: string | undefined): boolean`.

Test-first: yes — mirror `temperatureConstraints.test.ts`'s structure: `getEffortLevels` returns
`[]` on store miss and on a model with no `effortLevels`, and the model's own list when present;
`buildEffortRule()` accepts a level in the resolved list and rejects one outside it (only when the
list is non-empty — no-op otherwise); `isWarningEffortLevel('xhigh')`/`'max'` → `true`, any other
string (including a level the model doesn't offer) → `false`.

- [ ] **Step 1:** Write `effortConstraints.test.ts` with the cases above against not-yet-existing
  exports — expect import/compile failure.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/assistants/utils/__tests__/effortConstraints.test.ts` — expect FAIL.
- [ ] **Step 3:** In `validation.ts`, add `EFFORT_WARNING_LEVELS: ['xhigh', 'max']` to
  `VALIDATION_CONSTRAINTS` and `EFFORT_INVALID: 'Effort is not supported for this model'` to
  `VALIDATION_MESSAGES`. Create `effortConstraints.ts`:

```typescript
import * as Yup from 'yup'

import { VALIDATION_CONSTRAINTS, VALIDATION_MESSAGES } from '@/constants/validation'
import { appInfoStore } from '@/store/appInfo'

export function getEffortLevels(modelValue: string | undefined): string[] {
  if (!modelValue) return []
  return appInfoStore.llmModels.find((m) => m.value === modelValue)?.effortLevels ?? []
}

export function buildEffortRule(): Yup.StringSchema {
  return Yup.string().when('llm_model_type', (values: unknown[], schema: Yup.StringSchema) => {
    const levels = getEffortLevels(values[0] as string | undefined)
    return levels.length ? schema.oneOf([...levels, undefined], VALIDATION_MESSAGES.EFFORT_INVALID) : schema
  })
}

export function isWarningEffortLevel(level: string | undefined): boolean {
  return !!level && (VALIDATION_CONSTRAINTS.EFFORT_WARNING_LEVELS as string[]).includes(level)
}
```
- [ ] **Step 4:** Re-run the test command — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 3: DTO/type plumbing for `effort`

**Files:**
- Modify: `src/types/entity/assistant.ts` (`Assistant:103`, `AssistantTemplate:209`,
  `CreateAssistantDto:471` — add `effort?: string` next to each `temperature?`)
- Modify: `src/types/workflowEditor/configuration.ts:35` (`AssistantConfiguration` — add
  `effort?: string` next to `temperature?`)
- Modify: `src/store/utils/assistants.ts:86-87` (`transformAssistantToCreateDTO` — add
  `effort: assistant.effort,` next to `temperature: assistant.temperature,`)
- Test: `src/store/utils/__tests__/assistants.test.ts`
- Modify: `src/store/assistants.ts` (`updateAssistant` — send `temperature`, `effort` and `top_p` as
  explicit `null` when unset; the backend keeps a stored value when the key is omitted) and widen
  `CreateAssistantDto`'s `temperature`/`effort`/`top_p` to `| null`
- Test: `src/store/__tests__/assistants.test.ts` (`updateAssistant` sends nulls for unset fields and
  passes set values through)

**Interfaces:**
- Produces: `effort?: string` on `Assistant`, `AssistantTemplate`, `CreateAssistantDto`,
  `AssistantConfiguration` — read by Tasks 4-8.

Test-first: yes — add a case to the `transformAssistantToCreateDTO` describe block asserting that
`assistant.effort = 'high'` reaches `dto.effort === 'high'`, and that an assistant with no `effort`
produces `dto.effort === undefined`.

- [ ] **Step 1:** Add the two assertions to `assistants.test.ts` — expect FAIL (`effort` not on the
  type/not copied).
- [ ] **Step 2:** Run `npx vitest run --project unit src/store/utils/__tests__/assistants.test.ts` — expect FAIL.
- [ ] **Step 3:** Make the four type/transform edits listed above.
- [ ] **Step 4:** Re-run — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 4: `AssistantForm.tsx` — schema, defaults, submit coercion

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:141` (schema — add
  `effort: buildEffortRule(),` next to `temperature: buildTemperatureRule(),`; import
  `buildEffortRule` from `@/pages/assistants/utils/effortConstraints`)
- Modify: same file `:301` (defaults — add `effort: assistant?.effort ?? undefined,`)
- Modify: same file `:340-346` (submit coercion — add: if `preparedValues.effort` is `null`/`''`
  delete it, else leave the string as-is; no `Number()` cast, unlike `temperature`/`top_p`)
- Test: `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx`

**Interfaces:**
- Consumes: `buildEffortRule` (Task 2), `Assistant.effort` (Task 3).

Test-first: yes — extend the existing temperature integration suite (~line 1208) with a case: for a
model whose `effortLevels` includes `'high'` (mock `appInfoStore.llmModels`), selecting `high` and
submitting reaches the POST body as `effort: 'high'`; for the default/no-`effortLevels` model,
`effort` is absent from the POST body.

- [ ] **Step 1:** Add the two cases to `NewAssistantPage.integration.test.tsx` — expect FAIL
  (no Effort field to interact with yet).
- [ ] **Step 2:** Run `npx vitest run --project integration src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` — expect FAIL.
- [ ] **Step 3:** Make the three `AssistantForm.tsx` edits listed above. (The Effort field itself is
  rendered in Task 6 — these are schema/defaults/submit only; this test will still fail until
  Task 6 adds the UI. Proceed to Task 6 before re-running.)
- [ ] **Step 4:** Commit (schema/defaults/coercion only; test goes green at the end of Task 6).

---

### Task 5: `VirtualAssistantForm.tsx` — types, schema, defaults, `getValues` coercion, registry

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx:72-75`
  (`registerFields` array — add `'effort'`)
- Modify: same file `:77-86` (`VirtualAssistantFormValues` — add `effort?: string`)
- Modify: same file `:104-129` (`virtualAssistantValidationSchema` — add
  `effort: buildEffortRule().optional(),`; import `buildEffortRule`)
- Modify: same file `:131-140` (`getDefaultValues` — add `effort: config?.effort,`)
- Modify: same file `:232-245` (`getValues` in `useImperativeHandle` — add: if `values.effort` is
  falsy/empty-string, `delete values.effort`; no numeric coercion, mirrors the `temperature` block
  immediately above it)
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts`

**Interfaces:**
- Consumes: `buildEffortRule` (Task 2), `AssistantConfiguration.effort` (Task 3).
- Produces: `VirtualAssistantFormValues.effort?: string`, read by Task 8.

Test-first: yes — extend the schema test with: a model with `effortLevels` validates an in-list
`effort` value and rejects one outside it; a model with no `effortLevels` accepts `effort` absent
(no-op schema branch, matching `getEffortLevels` returning `[]`).

- [ ] **Step 1:** Add the two cases to `VirtualAssistantForm.schema.test.ts` — expect FAIL (`effort`
  not in the schema).
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts` — expect FAIL.
- [ ] **Step 3:** Make the five edits listed above.
- [ ] **Step 4:** Re-run — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 6: Effort UI in both forms (visibility rule + warning)

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx:73-81,310-338`
- Modify: `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx:171-173,388-401`

**Interfaces:**
- Consumes: `getEffortLevels`, `isWarningEffortLevel` (Task 2); `ModelOption.temperatureSupported`
  (Task 1); `VirtualAssistantFormValues.effort` (Task 5); `AssistantFormSchema`'s `effort` field
  (Task 4).

In both files: compute `effortLevels = getEffortLevels(selectedModel)` and
`temperatureSupported = appInfoStore.llmModels.find((m) => m.value === selectedModel)?.temperatureSupported !== false`
alongside the existing `temperatureMax` line; add `trigger('effort')` to the existing
`useEffect([selectedModel, trigger])` that already re-triggers `temperature`. Render: the existing
Temperature **and** Top P inputs only when
`temperatureSupported && (effortLevels.length === 0 || temperature != null)` (both hide together —
an effort-capable model replaces them, unless a saved temperature is still set); an Effort `Dropdown` (reuse
the project's existing dropdown/select form component used elsewhere for enum fields) listing
`effortLevels`, rendered only when `effortLevels.length > 0`, placed next to Temperature/Top P;
when the selected Effort value is a warning level
(`isWarningEffortLevel`), an inline message beneath the dropdown ("Higher effort increases model
thinking and may significantly increase token usage.") — no modal, no `window.confirm`. When
`selectedModel` changes to a different model, reset `temperature`, `top_p` and `effort` to
`undefined` so no stale selection or stuck warning survives the switch. Selecting an effort also
clears `temperature` and `top_p`.

Test-first: yes — this closes the two integration/schema tests left red at the end of Tasks 4-5,
plus two new cases in `NewAssistantPage.integration.test.tsx`: selecting `'xhigh'` shows the warning
text and selecting `'low'` does not; an effort-capable model shows Effort only; switching models
resets the selected effort (and its warning) and a model with no `effortLevels` shows Temperature/Top P
instead of Effort. `VirtualAssistantForm.integration.test.tsx` also covers a saved temperature
staying visible until an effort is selected.

- [ ] **Step 1:** Add the warning-text and visibility-switch assertions to
  `NewAssistantPage.integration.test.tsx`.
- [ ] **Step 2:** Run both integration suites named in Tasks 4 and this task — expect FAIL (no
  Effort UI yet).
- [ ] **Step 3:** Implement the UI changes described above in both files.
- [ ] **Step 4:** Re-run `npx vitest run --project integration src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` and
  `npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts` — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 7: `visualEditorFieldRegistry.test.ts` coverage for `effort`

**Files:**
- Modify: `src/pages/workflows/editor/utils/__tests__/visualEditorFieldRegistry.test.ts`

**Interfaces:**
- Consumes: the `registerFields([..., 'effort'], NodeTypes.ASSISTANT)` call added in Task 5.

Test-first: yes — add `expect(isFieldSupported('effort', NodeTypes.ASSISTANT)).toBe(true)` and a
negative case for an unrelated node type, mirroring the existing `temperature` assertions.

- [ ] **Step 1:** Add the assertions — expect PASS already (Task 5 registered `'effort'`); if the
  suite was run before Task 5 this step would FAIL, confirming the test is meaningful.
- [ ] **Step 2:** Run `npx vitest run --project unit src/pages/workflows/editor/utils/__tests__/visualEditorFieldRegistry.test.ts` — expect PASS.
- [ ] **Step 3:** Commit.

---

### Task 8: `AssistantTab.tsx` save-path fix

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/AssistantTab.tsx:210-238`
- Test: colocated test for `AssistantTab.tsx` if one exists, else a new
  `src/pages/workflows/editor/configPanels/__tests__/AssistantTab.test.tsx` covering only the save
  path (do not write a full component test if an existing one already drives this save handler —
  extend it instead; check `git ls-files` for an existing `AssistantTab*.test.tsx` before creating).

**Interfaces:**
- Consumes: `virtualAssistantValues.effort` (Task 5's `VirtualAssistantForm.getValues()`).

This is a distinct site from Task 5's internal form coercion and Task 5's `registerFields` call:
`finalAssistantConfig` at line 218 is the object literal actually persisted into the workflow
node's `AssistantConfiguration`, built by hand-picking fields off `virtualAssistantValues` — it does
not spread the form's state. `temperature` is explicitly copied at line 221
(`temperature: virtualAssistantValues.temperature`). Add `effort: virtualAssistantValues.effort,`
on the next line. Nothing else in this object literal changes.

Test-first: yes — a test that fills the virtual-assistant form's `effort` to a valid value, triggers
the save handler, and asserts the `onConfigChange` call's `actors.assistants[0].effort` equals that
value — proving it reaches the persisted config and not just the form's own state.

- [ ] **Step 1:** Write the save-path test — expect FAIL (`effort` absent from
  `finalAssistantConfig`, so the assertion on the `onConfigChange` payload fails).
- [ ] **Step 2:** Run the test file — expect FAIL.
- [ ] **Step 3:** Add the one line (`effort: virtualAssistantValues.effort,`) at
  `AssistantTab.tsx:222` (immediately after the `temperature` line).
- [ ] **Step 4:** Re-run — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 9: Read-only `effort` display in assistant details sidebar

**Files:**
- Modify: `src/pages/assistants/components/AssistantDetails/components/AssistantDetailsSidebarSections.tsx:225-241`
- Test: colocated test for this component if one exists, else cover via
  `NewAssistantPage.integration.test.tsx`'s existing sidebar-rendering coverage — check
  `git ls-files 'src/pages/assistants/components/AssistantDetails/**/__tests__/**'` first.

**Interfaces:**
- Consumes: `Assistant.effort` (Task 3).

Test-first: yes — a test asserting that an assistant with `effort: 'high'` renders an "Effort" label
and value `'high'` in the CONFIGURATION section, and that an assistant with no `effort` renders no
such line.

- [ ] **Step 1:** Write the two assertions — expect FAIL (no Effort line rendered).
- [ ] **Step 2:** Run the relevant test file — expect FAIL.
- [ ] **Step 3:** Add, immediately after the Top P block (line 241):

```tsx
{assistant.effort && (
  <div className="flex flex-row items-center gap-2">
    <p className="text-sm text-text-quaternary">Effort</p>
    <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-sm leading-5">
      {assistant.effort}
    </div>
  </div>
)}
```
- [ ] **Step 4:** Re-run — expect PASS.
- [ ] **Step 5:** Commit.

---

## Negative-Constraint Pass

- No backend request-mapping or `features.effort`/`features.temperature` emission work anywhere in
  this plan — Task 1 only *consumes* those fields; no task touches a backend repo or mocks server
  logic beyond test fixtures. **Honored by: all tasks (none touch backend).**
- No hardcoded frontend model-name → effort-value table — Task 2's `getEffortLevels` reads
  `ModelOption.effortLevels` at runtime only; no model name ever appears in `effortConstraints.ts`.
  **Honored by: Task 2.**
- No merging `AssistantForm`/`VirtualAssistantForm` — Tasks 4-6 edit each independently; no task
  extracts a shared form component. **Honored by: Tasks 4, 5, 6.**
- No blocking confirmation modal for high-effort selection — Task 6 specifies an inline message,
  explicitly rules out `window.confirm`/a modal. **Honored by: Task 6.**
- No change to `temperature`/`top_p` validation ranges — Tasks 4-6 only add `effort` alongside the
  existing `buildTemperatureRule()` calls; none are edited. **Honored by: Tasks 4, 5, 6.**
- No positional/generic "top of the list" warning logic — Task 2's `isWarningEffortLevel` checks the
  fixed `EFFORT_WARNING_LEVELS` constant, never `effortLevels[effortLevels.length - 1]` or similar.
  **Honored by: Task 2.**
