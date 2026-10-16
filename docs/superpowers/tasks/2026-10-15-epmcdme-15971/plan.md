# Sync Default Model for Existing Assistants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The chat model selector and the assistant config form both display the project's *current* default model, matching newly created assistants, while explicit per-assistant/per-chat model choices stay untouched.

**Architecture:** Manual testing confirmed `ChatPromptLlmSelector` already fetches the live project default correctly on dropdown-open — it shows a "Default model updated" toast when it changes — but never applies that fetched value to what the dropdown actually displays; `projectDefaultModelId` (`ChatPromptLlmSelector.tsx:139`) is set but read nowhere except the toast comparison. Task 1 wires that already-fetched value into the displayed default. Task 2 is a separate surface (the assistant config form) and still follows the backend-resolved `effective_llm_model`/`effective_llm_model_source` pattern already proven correct in `AssistantDetailsSidebarSections.tsx:150-152`.

**Tech Stack:** React, TypeScript, Valtio, react-hook-form, Vitest + React Testing Library.

**Spec:** EPMCDME-15971 (requirements supplied inline; no spec.md for this flow).

## Acceptance criteria

- [ ] AC1: After the project's default models are updated, the model list in the chat with an existing assistant shows the updated default model.
- [ ] AC2: The default model displayed for existing assistants matches newly created assistants in the same project.
- [ ] AC3: The update applies without recreating the assistant.
- [ ] AC4: A model explicitly selected on an assistant's configuration, while still available in the project, is never changed.
- [ ] AC5: Newly created assistants keep showing the updated default correctly.

## Global Constraints

- Task 1 reuses the project-default value `ChatPromptLlmSelector` already fetches (`projectDefaultModelId`) — no new fetch, no new store state.
- Task 2 reuses `Assistant.effective_llm_model` / `effective_llm_model_source` only — no new client-side default-resolution mechanism, no new Valtio store state.
- `VirtualAssistantForm.tsx` and `CustomNodeForm.tsx` stay untouched — out of scope.
- Do not consolidate the two existing independent "refetch project default on dropdown open" implementations (`ChatPromptLlmSelector`, `VirtualAssistantForm`) — out of scope.
- Commit per task using the repository's existing convention.

## Review Focus

- A chat with an explicit per-chat model pick (`currentChat.llmModel` set to a specific, still-available model) must keep showing that model after a project default change, in both the trigger label and the "selected" check mark — AC4's intent extends to the chat selector even though it's phrased about assistant configuration.
- A brand-new chat/assistant must behave exactly as it does today — no regression in the AC5 path this plan is not supposed to touch.
- The router-default case (`defaultRouter` truthy, `ChatPromptLlmSelector.tsx:182-187`) must keep returning `null` for `defaultModel` — the project-default wiring must not override the "a router wins" rule.
- An assistant with `effective_llm_model_source === 'assistant'` (genuine explicit pick) must still show as selected in the assistant config form after a project default change — the easiest thing to regress while chasing AC1/AC2 there.
- A model that was explicit but is no longer available in the project must still hit the existing "unavailable model" reset path in `ChatPromptLlmSelector` (lines 198-216) unchanged.

---

### Task 1: Chat selector displays the already-fetched live project default

**Test-first: yes — a new test asserts the "Default"/recommended row reflects `projectDefaultModelId` once it has been fetched, even though `modelsToDisplay`'s own `isDefault` flag is still the old value; it fails today because `defaultModel` ignores `projectDefaultModelId` entirely.**

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx:184-187`
- Test: `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.liveDefault.test.tsx`

**Interfaces:**
- Consumes: the component's own existing `projectDefaultModelId` state (set at lines 164 and 280) and `modelsToDisplay` (lines 175-178) — no new inputs.
- Produces: no new exports; `defaultModel`'s resolution changes, nothing else in the component's public behavior.

- [ ] **Step 1: Write the failing test**

Render `ChatPromptLlmSelector` with `currentChat.llmModel` unset (null — "use default") and a `modelsToDisplay` list where model `old-default` has `isDefault: true` and model `new-default` has `isDefault: false`. Mock `projectsStore.getProject` to resolve `{ default_model: 'new-default' }`, matching the fetch the component already performs on mount (lines 159-170). Wait for that effect to resolve, then assert the trigger label and the "Default"/recommended row both show `new-default`'s label, not `old-default`'s. Add a second case: `currentChat.llmModel` explicitly set to `old-default` — assert it keeps showing `old-default` as selected (AC4), unaffected by the project default change.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.liveDefault.test.tsx`
Expected: FAIL — the first case shows `old-default` because `defaultModel` only reads `modelsToDisplay`'s stale `isDefault` flag.

- [ ] **Step 3: Resolve `defaultModel` from `projectDefaultModelId` first**

In `ChatPromptLlmSelector.tsx:184-187`, when `projectDefaultModelId` is set, look it up in `modelsToDisplay` by `value` and return that match as `defaultModel` before falling back to today's `modelsToDisplay.find((m) => m.isDefault) ?? modelsToDisplay[0] ?? null`. Keep the existing `if (defaultRouter) return null` guard first and add `projectDefaultModelId` to the `useMemo` dependency array. Do not touch `selectedModel` (lines 189-196) — it already only applies when `currentChat.llmModel` is explicitly set, which is the AC4 path and must stay as-is.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.liveDefault.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Commit per the repository's existing convention (ticket-prefixed subject, per `.ai-run/guides/standards/git-workflow.md`).

---

### Task 2: Assistant form seeds the live default instead of a stale stored value

**Test-first: yes — `resolveInitialLlmModelType.test.ts` fails because `resolveInitialLlmModelType` does not exist yet.**

**Files:**
- Create: `src/pages/assistants/utils/resolveInitialLlmModelType.ts`
- Test: `src/pages/assistants/utils/__tests__/resolveInitialLlmModelType.test.ts`
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:296`

**Interfaces:**
- Produces: `resolveInitialLlmModelType(assistant: Pick<Assistant, 'llm_model_type' | 'effective_llm_model_source'> | undefined | null): string` — returns `''` when `effective_llm_model_source === 'project_default'`, otherwise `assistant?.llm_model_type ?? ''`.
- Consumes (Task 2 only): the `Assistant` type fields named above; no change to `LLMSelector.tsx`, which already resolves its own live default from `useProjectLLMModels` (lines 174-178) once the form stops overriding it.

```typescript
export const resolveInitialLlmModelType = (
  assistant?: Pick<Assistant, 'llm_model_type' | 'effective_llm_model_source'> | null
): string => {
  if (assistant?.effective_llm_model_source === 'project_default') return ''
  return assistant?.llm_model_type ?? ''
}
```

- [ ] **Step 1: Write the failing test**

In `resolveInitialLlmModelType.test.ts`, assert: (a) `effective_llm_model_source: 'project_default'` with any `llm_model_type` returns `''`; (b) `effective_llm_model_source: 'assistant'` with `llm_model_type: 'gpt-4o'` returns `'gpt-4o'`; (c) `undefined`/no `effective_llm_model_source` with `llm_model_type: 'gpt-4o'` returns `'gpt-4o'` (unsaved-assistant/today's behavior); (d) `undefined` assistant returns `''`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/assistants/utils/__tests__/resolveInitialLlmModelType.test.ts`
Expected: FAIL with "resolveInitialLlmModelType is not defined/not a function"

- [ ] **Step 3: Implement `resolveInitialLlmModelType` in `src/pages/assistants/utils/resolveInitialLlmModelType.ts`**

Exact body given above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/assistants/utils/__tests__/resolveInitialLlmModelType.test.ts`
Expected: PASS

- [ ] **Step 5: Wire it into the form and commit**

In `AssistantForm.tsx:296`, replace `llm_model_type: assistant?.llm_model_type ?? ''` with `llm_model_type: resolveInitialLlmModelType(assistant)`, importing it from `../../utils/resolveInitialLlmModelType` (matching the existing `compareFormData` import style at line 75). Commit per the repository's existing convention.

---

## Negative-constraints pass

- AC4 ("explicitly selected models... not changed"): Task 1 Step 3 touches only `defaultModel`, never `selectedModel`, so an explicit `currentChat.llmModel` keeps resolving exactly as today (asserted by Task 1's second test case). Task 2's helper branches on `effective_llm_model_source === 'assistant'` to leave the stored/explicit value untouched (asserted by Task 2's case (b)).
- "No new fetch / no new store state" (Task 1) and "no new client-side resolution path / no new store state" (Task 2, resolved-design non-goal): Task 1 reuses the component's existing `projectDefaultModelId` state and existing fetch — zero new state or network calls. Task 2 adds a pure function with no state. Neither introduces a Valtio store or a new backend contract.
- "VirtualAssistantForm.tsx / CustomNodeForm.tsx untouched" (resolved-design non-goal): no task modifies either file.
- "Do not consolidate the two refetch-on-dropdown-open implementations" (resolved-design non-goal): Task 1 leaves `ChatPromptLlmSelector`'s existing `handleDropdownOpen` (lines 267-284) and `VirtualAssistantForm`'s equivalent untouched and independent — it only adds a consumer of the value `handleDropdownOpen` already produces.
- negative-constraints: all stated constraints above are honored; none were found unaddressed.
