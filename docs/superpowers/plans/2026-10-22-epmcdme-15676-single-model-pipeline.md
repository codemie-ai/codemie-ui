# EPMCDME-15676: Single Model-List Pipeline for ChatConfigLlmSelector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the two-pipeline hazard in the Chat Configuration panel's LLM selector so a project chat's model/router list always comes from `chatsStore`'s client-side Set-filter pipeline, never from `LLMSelector`'s internal backend-driven `useProjectLLMModels` pipeline, during a project switch or while the fetch is still in flight.

**Architecture:** `LLMSelector.tsx`'s `hasFilteredModels` check currently treats an empty `filteredModels` array the same as "no override — use your own `useProjectLLMModels` fallback." Since `filteredModels` has exactly one caller in the whole codebase (`ChatConfigLlmSelector`), we tighten that contract to distinguish "no override" (`undefined`) from "authoritative override, currently empty" (`[]`), and update `ChatConfigLlmSelector` to pass `[]` instead of `undefined` whenever there's a project chat but the Set-filtered lists are stale. This mirrors `ChatPromptLlmSelector`'s already-established invariant ("never fall back to global model list for project chats") exactly.

**Tech Stack:** React 18, TypeScript 5, Valtio, Vitest + React Testing Library (`unit` and `integration` projects).

## Global Constraints

- Ticket key `EPMCDME-15676` must appear in every commit message (per `.ai-run/guides/standards/git-workflow.md`).
- Reinstall from the lock file before trusting any test or type-check result (do not skip `npm ci` if dependencies might be stale — not needed here since no manifest changes, but gates must still be run individually, never chained with `&&`).
- `filteredModels` prop on `LLMSelector` has exactly one consumer in the codebase today (`ChatConfigLlmSelector`) — verified by `grep -rn "filteredModels=" src --include="*.tsx"`. This plan's safety argument for tightening that prop's contract depends on this remaining true; Task 1's first step re-verifies it.
- A `PostToolUse` hook already runs prettier + `eslint --fix` after any edit under `src/` in Claude Code — do not re-run them manually.
- Follow TDD: write the failing test first, watch it fail for the right reason, then write the minimal code to pass it.

---

### Task 1: Tighten `LLMSelector`'s `filteredModels` contract to honor an explicit empty array

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:158-161`
- Test: `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx`

**Interfaces:**
- Consumes: `LLMSelectorProps.filteredModels?: ModelOption[]` (existing prop, unchanged shape).
- Produces: `LLMSelector`'s internal `models: SelectableModel[]` now equals `filteredModels` whenever that prop is not `undefined` (including `[]`), and falls back to `globalModels` (from `useProjectLLMModels`) only when the prop is `undefined`. This is the contract Task 2 (`ChatConfigLlmSelector`) relies on.

- [ ] **Step 1: Re-verify `filteredModels` has exactly one consumer**

Run: `grep -rn "filteredModels=" src --include="*.tsx" | grep -v __tests__`

Expected output: exactly one line, `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx:67:        filteredModels={mergedFilteredModels}` (line number may differ slightly). If more than one call site shows up, STOP and re-scope this task — tightening the contract would then affect other callers too and needs a wider review.

- [ ] **Step 2: Write the failing test**

Open `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx`. Add a new `describe` block after the `describe('LLMSelector — routers', ...)` block (i.e. after its closing `})`, before `describe('LLMSelector workflow model selection', ...)`):

```tsx
// filteredModels has exactly one caller in the codebase (ChatConfigLlmSelector) and its
// contract is: undefined means "no override, use your own project/global list"; an explicit
// array — including an empty one — is an authoritative answer the caller already resolved
// and must be shown as-is, never silently replaced by useProjectLLMModels' own fetch.
describe('LLMSelector — filteredModels override contract', () => {
  beforeEach(() => {
    mockAppInfoStore.llmModels = [
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
      { label: 'Claude Opus 4.1', value: 'claude-opus-4-1', isDefault: false },
    ]
    mockAppInfoStore.llmRouters = []
  })

  afterEach(() => {
    mockAppInfoStore.llmRouters = []
  })

  it('falls back to the project/global list when filteredModels is undefined', () => {
    const { container } = render(<LLMSelector value={undefined} onChange={vi.fn()} allowEmpty />)
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
  })

  it('shows no model options when filteredModels is explicitly empty, without falling back', () => {
    const { container } = render(
      <LLMSelector value={undefined} onChange={vi.fn()} allowEmpty filteredModels={[]} />
    )
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude Opus 4.1')).not.toBeInTheDocument()
  })

  it('shows the explicit list, not the global list, when filteredModels has entries', () => {
    const { container } = render(
      <LLMSelector
        value={undefined}
        onChange={vi.fn()}
        allowEmpty
        filteredModels={[{ label: 'Scoped Model', value: 'scoped-model', isDefault: false }]}
      />
    )
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.getByText('Scoped Model')).toBeInTheDocument()
    expect(screen.queryByText('GPT-4o')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the new tests to verify the second one fails**

Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx -t "filteredModels override contract"`

Expected: the first and third tests (`falls back...`, `shows the explicit list...`) PASS already (current code happens to satisfy them — `filteredModels` undefined falls back correctly, and a non-empty `filteredModels` is already honored). The second test, `shows no model options when filteredModels is explicitly empty, without falling back`, FAILS with `GPT-4o` found in the document — because today's `hasFilteredModels = filteredModels && filteredModels.length > 0` treats `[]` as falsy and falls back to `globalModels` (which here is `llmModels` via `useProjectLLMModels(null)` since no `project`/`projectId` prop was passed).

- [ ] **Step 4: Fix the implementation**

In `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx`, replace:

```ts
    // Explicit filteredModels (e.g. passed down from chat) win over the project-scoped list.
    // Checked by length because an empty array is truthy but should fall back while loading.
    const hasFilteredModels = filteredModels && filteredModels.length > 0
    const models = hasFilteredModels ? (filteredModels as SelectableModel[]) : globalModels
```

with:

```ts
    // Explicit filteredModels (passed down from ChatConfigLlmSelector, its one caller) wins
    // over the project-scoped list whenever the caller gives an opinion at all. undefined means
    // "no override, use your own project/global list"; an empty array is the caller's own
    // authoritative "nothing available right now" and must not be replaced by a second,
    // independent fetch — see docs/superpowers/plans/2026-10-22-epmcdme-15676-single-model-pipeline.md.
    const hasFilteredModels = filteredModels !== undefined
    const models = hasFilteredModels ? (filteredModels as SelectableModel[]) : globalModels
```

- [ ] **Step 5: Run the tests again to verify all three pass**

Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx -t "filteredModels override contract"`

Expected: `Tests  3 passed (3)`.

- [ ] **Step 6: Run the full LLMSelector unit test suite to check for regressions**

Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.defaultDedup.test.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.projectModels.test.tsx`

Expected: all test files report `passed`, 0 failed. (These files never pass `filteredModels` themselves — only `ChatConfigLlmSelector` does — so this step confirms the contract change has no blast radius beyond the one caller.)

- [ ] **Step 7: Commit**

```bash
git add src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx
git commit -m "EPMCDME-15676: Honor an explicit empty filteredModels list in LLMSelector

filteredModels has exactly one caller (ChatConfigLlmSelector). Treating an
empty array the same as 'no override' forced that caller into a second,
independent model pipeline (useProjectLLMModels) during a project switch.
Distinguish undefined (no override) from an explicit [] (authoritative,
currently empty) so the caller's own answer is never silently replaced."
```

---

### Task 2: Make `ChatConfigLlmSelector` pass an explicit empty list instead of `undefined` while stale

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx:47-55`
- Test: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx`

**Interfaces:**
- Consumes: `LLMSelector`'s tightened contract from Task 1 (`filteredModels={[]}` now renders zero model options instead of falling back).
- Produces: `mergedFilteredModels: ModelOption[] | undefined` — `undefined` only when `currentChat.projectId` is falsy (no project at all); `[]` when there's a project but `hasCurrentProjectModels` is false (stale/loading); the merged `[...filteredModels, ...filteredRouters.map(routerToModelOption)]` otherwise. This is the exact shape `ChatPromptLlmSelector.tsx:202-205`'s `modelsToDisplay` already uses for the project case.

- [ ] **Step 1: Write the failing test**

Open `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx`. The existing test `'withholds filteredModels/filteredRouters while they still belong to the previous project'` (around line 192) already asserts the user-visible symptom (`Smart Router` must not appear) but doesn't pin down *why* — today it passes because `LLMSelector` falls back to an *empty* `useProjectLLMModels` result in the test's mock setup, which happens to look identical to "no fallback occurred at all." Add a new test right after it that pins the actual prop value, so a regression back to the old pipeline-swap behavio

r is caught even if some other mocked list happens to be non-empty:

```tsx
  it('passes an explicit empty list — not undefined — to LLMSelector while the project gate is stale', () => {
    mockChatsStore.currentChat = mockChat
    mockChatsStore.filteredModelsProjectId = 'previous-project'
    mockChatsStore.filteredModels = [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }]
    mockChatsStore.filteredRouters = [
      { label: 'Smart Router', value: 'smart-router', isDefault: false },
    ]
    // If ChatConfigLlmSelector fell back to undefined here, LLMSelector would read from
    // useProjectLLMModels instead — seed that pipeline with data so a regression back to
    // the old "swap pipelines while stale" behavior would make this option reappear.
    mockAppInfoStore.projectLlmModels = {
      'project-123': [{ label: 'Backend Pipeline Model', value: 'backend-model' }],
    }

    const { container } = render(<ChatConfigLlmSelector />)
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.queryByText('Smart Router')).not.toBeInTheDocument()
    expect(screen.queryByText('Backend Pipeline Model')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the test to verify it fails for the right reason**

Run: `npx vitest run --project unit src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx -t "passes an explicit empty list"`

Expected: FAIL — `screen.queryByText('Backend Pipeline Model')` is found in the document, because today's `mergedFilteredModels` is `undefined` while stale, so `LLMSelector` falls back to `useProjectLLMModels('project-123')`, which (via the mocked `appInfoStore.projectLlmModels`) returns `Backend Pipeline Model`.

- [ ] **Step 3: Fix the implementation**

In `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx`, replace the `mergedFilteredModels` block:

```ts
  // Keyed on the Valtio snapshot arrays so LLMSelector only sees a new identity when the
  // underlying lists actually change, not on every render — it feeds options memo and the
  // validation effect in LLMSelector, both keyed on this reference.
  const mergedFilteredModels = useMemo(() => {
    const hasProjectLists =
      currentChat?.projectId &&
      hasCurrentProjectModels &&
      (filteredModels.length > 0 || filteredRouters.length > 0)
    return hasProjectLists
      ? [...filteredModels, ...filteredRouters.map(routerToModelOption)]
      : undefined
  }, [currentChat?.projectId, hasCurrentProjectModels, filteredModels, filteredRouters])
```

with:

```ts
  // Mirrors ChatPromptLlmSelector's modelsToDisplay/routersToDisplay exactly: a project chat
  // has ONE data source, the Set-filter pipeline below, for its whole lifecycle. undefined is
  // reserved for "no project at all" (LLMSelector then uses its own unscoped/global list, same
  // as the no-project case everywhere else). While there IS a project but the gate is stale —
  // mid-switch, or the fetch hasn't resolved yet — this returns [], never undefined, so
  // LLMSelector's filteredModels contract (Task 1) treats it as an authoritative "nothing yet"
  // instead of falling back to its own independent useProjectLLMModels fetch.
  const mergedFilteredModels = useMemo(() => {
    if (!currentChat?.projectId) return undefined
    if (!hasCurrentProjectModels) return []
    return [...filteredModels, ...filteredRouters.map(routerToModelOption)]
  }, [currentChat?.projectId, hasCurrentProjectModels, filteredModels, filteredRouters])
```

- [ ] **Step 4: Run the test again to verify it passes**

Run: `npx vitest run --project unit src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx -t "passes an explicit empty list"`

Expected: `Tests  1 passed (1)`.

- [ ] **Step 5: Run the full `ChatConfigLlmSelector` unit test file to check for regressions**

Run: `npx vitest run --project unit src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx`

Expected: `Tests  11 passed (11)` (the 9 pre-existing tests plus this task's new one — the 2 added across Task 2 so far is 1; recount after running, but 0 failed is the requirement either way).

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx
git commit -m "EPMCDME-15676: Never fall back to the backend model pipeline while stale

mergedFilteredModels now returns [] (not undefined) whenever there is a
project but filteredModelsProjectId hasn't caught up yet, matching
ChatPromptLlmSelector's existing 'never fall back to global model list for
project chats' invariant. undefined is now reserved for the no-project
case only, so LLMSelector's own useProjectLLMModels fetch (a second,
independently-filtered pipeline) never substitutes for chatsStore's
Set-filtered lists during a project switch."
```

---

### Task 3: Fix the integration test that was unknowingly asserting against the backend pipeline

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx:223-245`

**Interfaces:**
- Consumes: Task 2's fixed `mergedFilteredModels` behavior.
- Produces: no new interface — this task only corrects a test fixture so it exercises the pipeline it claims to.

**Context:** The test `'keeps project chats restricted to the scoped model response when loaded'` sets `chatsStore.filteredModels` directly from `appInfoStore.projectLlmModels['demo-15915-beta']` but never sets `chatsStore.filteredModelsProjectId`. Before Task 2's fix, `hasCurrentProjectModels` was therefore always `false` for this test, `mergedFilteredModels` was always `undefined`, and `LLMSelector` fell back to `useProjectLLMModels('demo-15915-beta')` — which happened to return the same data because the test had separately warmed `appInfoStore.projectLlmModels` via `getProjectLLMModels`. The test passed, but it was asserting against the backend pipeline it wasn't supposed to be testing, not against `chatsStore.filteredModels` (the Set-filter pipeline the test name and the surrounding tests in this file are about). After Task 2, this test will actually FAIL, because `mergedFilteredModels` now correctly returns `[]` (not the backend list) while `filteredModelsProjectId` is unset — proving the bug this plan fixes was real.

- [ ] **Step 1: Run the integration suite to confirm this test now fails after Tasks 1–2**

Run: `npx vitest run --project integration src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx -t "keeps project chats restricted to the scoped model response when loaded"`

Expected: FAIL. The assertion `expect(screen.getByRole('option', { name: 'Beta Only' })).toBeInTheDocument()` throws because no such option is rendered — `mergedFilteredModels` is `[]` since `filteredModelsProjectId` was never set to `'demo-15915-beta'`.

- [ ] **Step 2: Fix the test fixture**

In `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx`, locate:

```ts
    mockAPI('GET', 'v1/projects/demo-15915-beta', project('demo-15915-beta', ['beta-only']))
    chatsStore.filteredModels = appInfoStore.projectLlmModels['demo-15915-beta']

    renderChatSelectors()
```

and change it to:

```ts
    mockAPI('GET', 'v1/projects/demo-15915-beta', project('demo-15915-beta', ['beta-only']))
    // Exercise the Set-filter pipeline directly (the one chatsStore.getModelsForCurrentChat
    // actually populates) rather than only the backend pipeline's already-mapped data —
    // filteredModelsProjectId must match for the gate (hasCurrentProjectModels) to pass.
    chatsStore.filteredModels = appInfoStore.projectLlmModels['demo-15915-beta']
    chatsStore.filteredModelsProjectId = 'demo-15915-beta'

    renderChatSelectors()
```

- [ ] **Step 3: Run the test again to verify it passes**

Run: `npx vitest run --project integration src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx -t "keeps project chats restricted to the scoped model response when loaded"`

Expected: `Tests  1 passed (1)`.

- [ ] **Step 4: Run the full integration test file to check for regressions**

Run: `npx vitest run --project integration src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx`

Expected: all tests in the file pass, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx
git commit -m "EPMCDME-15676: Fix integration test asserting against the wrong model pipeline

'keeps project chats restricted to the scoped model response when loaded'
never set filteredModelsProjectId, so it was unknowingly passing via
LLMSelector's useProjectLLMModels fallback rather than via
chatsStore.filteredModels, the pipeline it names and claims to test. Set
filteredModelsProjectId so the gate (hasCurrentProjectModels) is satisfied
and the test exercises the pipeline it is named after."
```

---

### Task 4: Full regression pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit project**

Run: `npx vitest run --project unit`

Expected: `Test Files  720 passed (720)` or higher (new tests added in Tasks 1–2 add to the count), 0 failed.

- [ ] **Step 2: Run the full integration project**

Run: `npx vitest run --project integration`

Expected: all test files passed, 0 failed.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors referencing `LLMSelector.tsx` or `ChatConfigLlmSelector.tsx`.

- [ ] **Step 4: Lint the three touched source files**

Run: `npx eslint src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx`

Expected: no output, exit code 0. (Claude Code's `PostToolUse` hook already ran prettier/eslint --fix after each edit — this step is the human-visible confirmation for a reviewer or CI-equivalent run, not a re-run of the autofixer.)

No commit for this task — it is verification only, already covered by the three commits in Tasks 1–3.
