# EPMCDME-15904 — Fix duplicated Recommended model in chat model dropdown

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development inline in the current session (per `sdlc-light`), task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The model marked "Recommended" in the assistant chat's model-selection dropdown must appear exactly once (as the Recommended row), never a second time as a plain row in the "Models" section.

**Architecture:** Pure presentation-layer fix in a single React component. The dropdown's `items` list is built by one `useMemo` in `ChatPromptLlmSelector.tsx`: it pushes a synthetic `OPTION_ID_RECOMMENDED` row for `defaultModel`, then unconditionally iterates `filteredSearchResults` (which still contains `defaultModel`) and pushes a second, plain row for the same model. The fix excludes `defaultModel.value` from that iteration whenever the Recommended row is actually being shown (`!search && defaultModel`), covering both the grouped (router-present) and non-grouped (flat) layout branches since they share this one loop.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library, Valtio (mocked stores in tests).

---

## File Structure

- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` (lines 236-254, the `items` memo) — the only production code change.
- Modify: `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` — add regression assertions that a `isDefault: true` model renders exactly once, in both layouts and under search.

---

## Task 1: Add failing regression tests for "recommended model renders exactly once"

**Files:**
- Test: `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`

The existing `beforeEach` (lines 668-679) already sets up:
```ts
mockAppInfoStore.llmModels = [
  { label: 'GPT-4', value: 'gpt-4', isDefault: true },
  { label: 'Claude-2', value: 'claude-2', isDefault: false },
] as ModelOption[]
mockAppInfoStore.llmRouters = routerFixture
```
`routerFixture` (defined above, includes `'smart-router'`) means `isGrouped` is `true` by default in this `describe` block; setting `mockAppInfoStore.llmRouters = []` in a test gives the flat/non-grouped layout.

- [ ] **Step 1: Write the failing test — grouped layout (router present) must not duplicate the recommended model**

Add this test directly after the existing test `'groups into Default, then Routers, then Models (recommended model first) once a router exists'` (after line 708, before the `'selecting a router option...'` test at line 710):

```tsx
  it('does not render the recommended model a second time as a plain row in Models (grouped layout)', () => {
    render(<ChatPromptLlmSelector />)

    expect(document.getElementById('chat-llm-selector-option-recommended')).not.toBeNull()
    expect(document.getElementById('chat-llm-selector-option-gpt-4')).toBeNull()
    expect(screen.getAllByRole('option', { name: /^GPT-4$/ })).toHaveLength(1)
    // The non-default model is unaffected and still renders.
    expect(document.getElementById('chat-llm-selector-option-claude-2')).not.toBeNull()
  })
```

- [ ] **Step 2: Write the failing test — flat layout (no routers) must not duplicate the recommended model**

Add this test directly after the existing test `'renders the old flat list — no Routers/Models headers — when there are no routers at all'` (after line 693):

```tsx
  it('does not render the recommended model a second time as a plain row in the flat layout', () => {
    mockAppInfoStore.llmRouters = []
    render(<ChatPromptLlmSelector />)

    expect(document.getElementById('chat-llm-selector-option-recommended')).not.toBeNull()
    expect(document.getElementById('chat-llm-selector-option-gpt-4')).toBeNull()
    expect(screen.getAllByRole('option', { name: /^GPT-4$/ })).toHaveLength(1)
    expect(document.getElementById('chat-llm-selector-option-claude-2')).not.toBeNull()
  })
```

- [ ] **Step 3: Write the failing test — searching for the recommended model's own name yields exactly one row (AC5)**

Add this test directly after the test added in Step 1 (so after the new `'does not render the recommended model a second time... (grouped layout)'` test):

```tsx
  it('returns exactly one row when searching for the recommended model by name (AC5)', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.change(input, { target: { value: 'GPT' } })

    expect(screen.getAllByRole('option', { name: /^GPT-4$/ })).toHaveLength(1)
    expect(document.getElementById('chat-llm-selector-option-recommended')).toBeNull()
    expect(document.getElementById('chat-llm-selector-option-gpt-4')).not.toBeNull()
  })
```

- [ ] **Step 4: Write the failing test — a third, non-default model is still shown once each (AC4)**

Add this test directly after the test added in Step 4's predecessor — i.e. after the test added in Step 3 above:

```tsx
  it('still shows every other model exactly once alongside the recommended model (AC4)', () => {
    mockAppInfoStore.llmModels = [
      { label: 'GPT-4', value: 'gpt-4', isDefault: true },
      { label: 'Claude-2', value: 'claude-2', isDefault: false },
      { label: 'Gemini-Pro', value: 'gemini-pro', isDefault: false },
    ] as ModelOption[]
    render(<ChatPromptLlmSelector />)

    expect(screen.getAllByRole('option', { name: /^GPT-4$/ })).toHaveLength(1)
    expect(screen.getAllByRole('option', { name: /^Claude-2$/ })).toHaveLength(1)
    expect(screen.getAllByRole('option', { name: /^Gemini-Pro$/ })).toHaveLength(1)
  })
```

- [ ] **Step 5: Run the new tests to verify they fail against the current (buggy) implementation**

Run: `npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`
Expected: FAIL — the four new tests fail. The grouped/flat "does not render... a second time" tests fail because `document.getElementById('chat-llm-selector-option-gpt-4')` is **not** null (the bug: `screen.getAllByRole('option', { name: /^GPT-4$/ })` has length 2). The other two tests pass already (the bug only affects the no-search state), which is expected and consistent with the technical analysis — they still assert useful regression coverage once the fix lands.

- [ ] **Step 6: Commit the failing tests**

```bash
git add src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx
git commit -m "EPMCDME-15904: add regression tests for duplicated recommended model row"
```

---

## Task 2: Fix the duplicate row by excluding the recommended model from the generic Models loop

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx:236-254`

- [ ] **Step 1: Implement the fix**

Replace the `items` memo (currently lines 236-254):

```tsx
  const items = useMemo<ComboboxItem<LlmValue>[]>(() => {
    const list: ComboboxItem<LlmValue>[] = []
    if (!search) {
      list.push({ id: OPTION_ID_DEFAULT, value: ASSISTANT_DEFAULT_VALUE })
      if (!isGrouped && defaultModel) {
        list.push({ id: OPTION_ID_RECOMMENDED, value: defaultModel.value })
      }
    }
    filteredRouters.forEach((r) => {
      list.push({ id: optionIdForRouter(r.value), value: r.value })
    })
    if (isGrouped && !search && defaultModel) {
      list.push({ id: OPTION_ID_RECOMMENDED, value: defaultModel.value })
    }
    filteredSearchResults.forEach((m) => {
      list.push({ id: optionIdForModel(m.value), value: m.value })
    })
    return list
  }, [search, defaultModel, filteredRouters, filteredSearchResults, isGrouped])
```

with:

```tsx
  const items = useMemo<ComboboxItem<LlmValue>[]>(() => {
    const list: ComboboxItem<LlmValue>[] = []
    const recommendedShown = !search && !!defaultModel
    if (!search) {
      list.push({ id: OPTION_ID_DEFAULT, value: ASSISTANT_DEFAULT_VALUE })
      if (!isGrouped && defaultModel) {
        list.push({ id: OPTION_ID_RECOMMENDED, value: defaultModel.value })
      }
    }
    filteredRouters.forEach((r) => {
      list.push({ id: optionIdForRouter(r.value), value: r.value })
    })
    if (isGrouped && !search && defaultModel) {
      list.push({ id: OPTION_ID_RECOMMENDED, value: defaultModel.value })
    }
    filteredSearchResults.forEach((m) => {
      // The recommended model already has its own row above; don't repeat it here.
      if (recommendedShown && m.value === defaultModel?.value) return
      list.push({ id: optionIdForModel(m.value), value: m.value })
    })
    return list
  }, [search, defaultModel, filteredRouters, filteredSearchResults, isGrouped])
```

This single change covers both layout branches (`isGrouped` true/false) because both feed the same trailing `filteredSearchResults.forEach` loop, and it is a no-op while `search` is non-empty (matching the existing search-gated behavior, so AC5 continues to hold exactly as the technical analysis predicted).

- [ ] **Step 2: Run the full test file to verify everything passes**

Run: `npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`
Expected: PASS — all tests, including the four added in Task 1 and the pre-existing tests (lines 685-778), pass. In particular `'keeps the Models header on the first model row'` (line 770) must still pass: with no router default and no concrete `isDefault` model in that nested `describe`, `defaultModel` is `null` there, so the exclusion never triggers and `gpt-4` remains the first row.

- [ ] **Step 3: Run the two related test files to confirm no regression in adjacent coverage**

Run: `npx vitest run --project unit src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.tooltipStranding.test.tsx src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.projectModels.test.tsx`
Expected: PASS — these cover tooltip positioning and project-filtered model lists respectively; neither depends on the removed duplicate row, so both should be unaffected.

- [ ] **Step 4: Commit the fix**

```bash
git add src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx
git commit -m "EPMCDME-15904: exclude recommended model from the generic Models list to stop duplication"
```

---

## Self-Review

**Spec coverage:**
- AC1 (recommended model shown only once) — Task 2 fix + Task 1 Steps 1–2 tests.
- AC2 (keeps Recommended label) — unchanged; the `OPTION_ID_RECOMMENDED` push and its `renderOption` branch (lines 371-379) are untouched by the fix.
- AC3 (not repeated as plain row in Models) — same fix/tests as AC1.
- AC4 (all other models still shown once each) — Task 1 Step 4 test.
- AC5 (search does not return duplicates) — Task 1 Step 3 test; confirmed as already-passing behavior preserved by the `!search` guard in the fix.

**Placeholder scan:** No TBD/TODO/"handle appropriately" language; every step has literal code and literal commands with expected output.

**Type consistency:** `defaultModel` is `ModelOption | null` throughout (unchanged declaration at line 184); `m.value` / `defaultModel?.value` are both `string` (the `LlmValue` type backing `ComboboxItem<LlmValue>`), matching existing usage in the file (e.g. line 192, 241, 248). No new types or signatures introduced.
