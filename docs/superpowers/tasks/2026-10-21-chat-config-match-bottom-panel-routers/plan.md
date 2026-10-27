# Chat Config LLM Selector: Include Router Models — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make router models appear and be selectable in the chat Configuration panel's LLM Model selector (`ChatConfigLlmSelector`), consistent with the bottom-panel selector and assistant settings (EPMCDME-15676).

**Architecture:** Revert `chatsStore.getModelsForCurrentChat`'s `filteredModels` source for project chats from the backend `getProjectLLMModels` pipeline back to the client-side `getFilteredModelsForProject` Set filter (matching main post-EPMCDME-15905), so `filteredModels` and `filteredRouters` are both derived by the same mechanism. Then fix `ChatConfigLlmSelector` to merge `chatsStore.filteredRouters` (flattened via `routerToModelOption`) into the list it passes to `LLMSelector`, exactly as `ChatPromptLlmSelector` already does — including the same project-staleness gate `ChatPromptLlmSelector` already uses, so a project switch never leaks the previous project's models/routers into the Configuration panel.

**Tech Stack:** React 18, TypeScript, Valtio store, Vitest + React Testing Library (`unit` and `integration` projects).

**Commits:** One commit per task, following this repo's existing commit convention (ticket prefix + message). No commit commands are prescribed here — use the convention already present in `git log`.

## Global Constraints

- Do not touch `ChatPromptLlmSelector.tsx` or `LLMSelector.tsx`.
- Do not touch `src/store/appInfo.ts` (`getProjectLLMModels` stays, used by `useProjectLLMModels.ts`).
- Do not touch `src/utils/projectModelFiltering.ts` or its test — already correct, already has live callers.
- Do not add a lint/build/whole-suite/browser-verification/review/commit task — the calling flow runs those.

## Acceptance criteria

- [ ] AC1: Router models available to the user/assistant appear when searching "router" in the chat Configuration panel's General > LLM Model selector.
- [ ] AC2: The routers selectable in that panel match those in assistant settings and the chat bottom-panel selector.
- [ ] AC3: Selecting an available router model from the Configuration panel works (updates the chat's `llmModel`).

---

### Task 1: Revert `chatsStore.getModelsForCurrentChat` to the Set-filter source for `filteredModels`

**Files:**
- Modify: `src/store/chats.ts:1058-1106`
- Modify: `src/store/__tests__/chats.test.ts` (whole file — mocks and assertions rewritten)

**Interfaces:**
- Consumes: `getFilteredModelsForProject(projectId, allModels)` (`src/utils/projectModelFiltering.ts`, unchanged signature); `appInfoStore.llmModels`, `appInfoStore.llmRouters`, `appInfoStore.getLLMModels()` (unchanged).
- Produces: `chatsStore.filteredModels: ModelOption[]`, `chatsStore.filteredRouters: LLMRouterOption[]`, `chatsStore.filteredModelsProjectId: string | null` — same fields/types Task 2 and Task 3 read. `getModelsForCurrentChat()` still returns `filteredModels`.

Test-first: yes — rewrite `src/store/__tests__/chats.test.ts` first so it fails against the current (backend-pipeline) implementation, then make it pass by editing `chats.ts`.

- [ ] **Step 1: Rewrite the test file's expectations**

In `src/store/__tests__/chats.test.ts`, keep the existing `vi.mock('../../utils/projectModelFiltering', ...)` and the `mockModels`/`mockRouters` fixtures, but drop `mockProjectModels` and the `appInfoStore.getProjectLLMModels` spy as the source of `filteredModels` assertions (the spy itself can stay mocked-but-unused only if another test still needs it; otherwise remove it). Update:
- The "sources filteredModels..." test to assert `getFilteredModelsForProject` was called with `(projectId, appInfoStore.llmModels)` and that `chatsStore.filteredModels` equals whatever `getFilteredModelsForProject` resolved to for that call — not `getProjectLLMModels`.
- The "returns the project cache without refetching" test: delete it — there is no project-model cache in the reverted design (`appInfoStore.projectLlmModels` is no longer read by this function).
- The "falls back to the Set-filtered global model list for a chat without a project" test: keep as-is, it already exercises the Set-filter path.
- The "also filters routers..." test: keep as-is (filteredRouters is unchanged).
- The atomic-commit, error-path, race-guard, and "ignores an older response"/"keeps loading true" tests: keep the same structure, but change every `vi.mocked(appInfoStore.getProjectLLMModels).mockImplementation/mockReturnValueOnce(...)` to `vi.mocked(getFilteredModelsForProject).mockImplementationOnce/mockReturnValueOnce(...)` for the *first* call in the `Promise.all` (the `filteredModels` fetch for a project chat), since both `filteredModels` and `filteredRouters` are now the same mocked function — distinguish the two calls by call order or by asserting `toHaveBeenNthCalledWith`.

- [ ] **Step 2: Run the test file and confirm it fails against current `chats.ts`**

Run: `npx vitest run --project unit src/store/__tests__/chats.test.ts`
Expected: FAIL — assertions expect `getFilteredModelsForProject` to be called for the project-chat `filteredModels` branch, but current code calls `appInfoStore.getProjectLLMModels` instead.

- [ ] **Step 3: Revert the implementation**

In `src/store/chats.ts:1082-1088`, replace the `filteredModels` branch of the `Promise.all` array:

```ts
const [filteredModels, filteredRouters] = await Promise.all([
  getFilteredModelsForProject(projectId, appInfoStore.llmModels),
  getFilteredModelsForProject(projectId, appInfoStore.llmRouters),
])
```

Remove the now-unused `projectName` local (`chats.ts:1068`) and the inline comment block (`chats.ts:1072-1081`) that justified the backend pipeline; replace it with a one-line comment: "Fetched together so the two lists always commit atomically." Leave everything else in the function (the `requestId`/`isCurrentRequest` guard, the `chatsStore.filteredModels/filteredRouters/filteredModelsProjectId` assignment, the error/finally blocks) unchanged.

- [ ] **Step 4: Run the test file and confirm it passes**

Run: `npx vitest run --project unit src/store/__tests__/chats.test.ts`
Expected: PASS — all cases green.

---

### Task 2: Merge `filteredRouters` into `ChatConfigLlmSelector`'s `filteredModels` prop, gated against a stale project

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx:17-49`
- Test: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx`

**Interfaces:**
- Consumes: `chatsStore.filteredModels: ModelOption[]`, `chatsStore.filteredRouters: LLMRouterOption[]`, `chatsStore.filteredModelsProjectId: string | null` (all produced by Task 1); `routerToModelOption(router: LLMRouterOption): ModelOption` (`src/utils/routerToModelOption.ts`, existing, unchanged).
- Produces: the `filteredModels` prop passed to `LLMSelector` now includes router rows, but only once `chatsStore.filteredModelsProjectId` matches the current chat's `projectId` — consumed read-only by `LLMSelector.tsx` (untouched).

Test-first: yes — add a router row to the unit test's mocked store state and assert `LLMSelector` receives it merged in; add a second test asserting the merge is withheld while `filteredModelsProjectId` still names the previous project.

- [ ] **Step 1: Add the failing assertions**

In `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx`, add `filteredRouters: [] as { label: string; value: string; isDefault?: boolean; isRouter?: boolean }[]` and `filteredModelsProjectId: null as string | null` to `mockChatsStore` (both are currently missing — `filteredRouters` reads as `undefined`, which would throw on `.map`, and `filteredModelsProjectId` is needed for the new staleness gate). Set `mockChatsStore.filteredModelsProjectId = 'project-123'` (matching `mockChat.projectId`) in the existing `beforeEach`. Add two new tests:

```tsx
it('merges filteredRouters into the filteredModels passed to LLMSelector', () => {
  mockChatsStore.currentChat = mockChat
  mockChatsStore.filteredModelsProjectId = 'project-123'
  mockChatsStore.filteredModels = [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }]
  mockChatsStore.filteredRouters = [{ label: 'Smart Router', value: 'smart-router', isDefault: false }]

  render(<ChatConfigLlmSelector />)

  expect(screen.getByText('Smart Router')).toBeInTheDocument()
})

it('withholds filteredModels/filteredRouters while they still belong to the previous project', () => {
  mockChatsStore.currentChat = mockChat
  mockChatsStore.filteredModelsProjectId = 'previous-project'
  mockChatsStore.filteredModels = [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }]
  mockChatsStore.filteredRouters = [{ label: 'Smart Router', value: 'smart-router', isDefault: false }]

  render(<ChatConfigLlmSelector />)

  expect(screen.queryByText('Smart Router')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run them and confirm both fail**

Run: `npx vitest run --project unit src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx`
Expected: FAIL on both new tests — the first because `ChatConfigLlmSelector` never passes `filteredRouters` into `LLMSelector` yet; the second passes vacuously today (no merge exists at all) but must be re-checked after Step 3 to confirm it still passes once the merge is gated.

- [ ] **Step 3: Implement the merge with the staleness gate**

In `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx`, add the import `import { routerToModelOption } from '@/utils/routerToModelOption'`, destructure `filteredRouters` and `filteredModelsProjectId` alongside `filteredModels` from `useSnapshot(chatsStore)` (line 23), add a `hasCurrentProjectModels = !currentChat?.projectId || filteredModelsProjectId === currentChat.projectId` check (mirroring `ChatPromptLlmSelector.tsx:198`), and change the `filteredModels` prop (line 47-49) to:

```tsx
filteredModels={
  currentChat.projectId &&
  hasCurrentProjectModels &&
  (filteredModels.length > 0 || filteredRouters.length > 0)
    ? [...filteredModels, ...filteredRouters.map(routerToModelOption)]
    : undefined
}
```

- [ ] **Step 4: Run the test file and confirm it passes**

Run: `npx vitest run --project unit src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx`
Expected: PASS — all cases including both new ones green.

---

### Task 3: Integration coverage — routers render, are selectable, survive a project switch, and don't regress the no-project case

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx`

**Interfaces:**
- Consumes: `chatsStore.filteredModels`, `chatsStore.filteredRouters`, `chatsStore.filteredModelsProjectId`, `chatsStore.currentChat` (real store, not mocked — this file is a true integration test); the file's existing `renderChatSelectors()`, `openConfiguration()`, `optionNames()` helpers (unchanged).
- Produces: nothing new — this is the closing test coverage for AC1/AC2/AC3, read by no other task.

Test-first: yes — every test below fails until Task 1 and Task 2 (including the staleness gate) land. Write and run them after Tasks 1-2 are in place; each one should fail if either task's change were reverted.

- [ ] **Step 1: Add the baseline router test**

In `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx`, add `chatsStore.filteredRouters = []` and `chatsStore.filteredModelsProjectId = null` to the existing `beforeEach` reset block (alongside the existing `chatsStore.filteredModels = []` reset), so the new fixtures below don't leak into the other tests. Then add, inside the existing `describe('ChatConfigLlmSelector model availability', ...)` block:

```tsx
it('includes a router in the Configuration panel and makes it selectable', async () => {
  const user = userEvent.setup()
  mockAPI('GET', 'v1/llm_models', globalCatalog)
  await appInfoStore.getLLMModels()
  chatsStore.currentChat = {
    id: 'router-chat',
    llmModel: null,
    project: 'demo-router-project',
    projectId: 'demo-router-project',
    assistantIds: [],
    assistantData: [],
    history: [],
  }
  chatsStore.filteredModels = [{ value: 'gpt-4o', label: 'GPT-4o' }]
  chatsStore.filteredRouters = [
    { value: 'router-beta', label: 'Router Beta', isDefault: false, tiers: {} as any },
  ]
  chatsStore.filteredModelsProjectId = 'demo-router-project'

  renderChatSelectors()
  openConfiguration()

  expect(screen.getByRole('option', { name: 'Router Beta' })).toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'Router Beta' }))
  await waitFor(() => expect(chatsStore.currentChat?.llmModel).toBe('router-beta'))
})
```

- [ ] **Step 2: Add the multi-router and premium-router cases**

Add two more `it` blocks in the same `describe` block:

```tsx
it('shows multiple routers at once in the Configuration panel', () => {
  mockAPI('GET', 'v1/llm_models', globalCatalog)
  chatsStore.currentChat = {
    id: 'multi-router-chat',
    llmModel: null,
    project: 'demo-router-project',
    projectId: 'demo-router-project',
    assistantIds: [],
    assistantData: [],
    history: [],
  }
  chatsStore.filteredModels = [{ value: 'gpt-4o', label: 'GPT-4o' }]
  chatsStore.filteredRouters = [
    { value: 'router-beta', label: 'Router Beta', isDefault: false, tiers: {} as any },
    { value: 'router-gamma', label: 'Router Gamma', isDefault: false, tiers: {} as any },
  ]
  chatsStore.filteredModelsProjectId = 'demo-router-project'

  renderChatSelectors()
  openConfiguration()

  expect(screen.getByRole('option', { name: 'Router Beta' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Router Gamma' })).toBeInTheDocument()
})

it('renders a premium router with its premium marker in the Configuration panel', () => {
  mockAPI('GET', 'v1/llm_models', globalCatalog)
  chatsStore.currentChat = {
    id: 'premium-router-chat',
    llmModel: null,
    project: 'demo-router-project',
    projectId: 'demo-router-project',
    assistantIds: [],
    assistantData: [],
    history: [],
  }
  chatsStore.filteredModels = [{ value: 'gpt-4o', label: 'GPT-4o' }]
  chatsStore.filteredRouters = [
    {
      value: 'router-premium',
      label: 'Router Premium',
      isDefault: false,
      isPremium: true,
      tiers: {} as any,
    },
  ]
  chatsStore.filteredModelsProjectId = 'demo-router-project'

  renderChatSelectors()
  openConfiguration()

  const option = screen.getByRole('option', { name: 'Router Premium' })
  expect(option).toBeInTheDocument()
  expect(option.textContent).toContain('Premium')
})
```

- [ ] **Step 3: Add the mid-switch staleness regression test**

Mirroring the existing store-level pattern in `src/store/__tests__/chats.test.ts`'s `it('keeps the previous project identity until both new lists arrive', ...)`, add:

```tsx
it('hides the previous project models and routers while the new project list is still loading', () => {
  mockAPI('GET', 'v1/llm_models', globalCatalog)
  chatsStore.filteredModels = [{ value: 'old-model', label: 'Old Model' }]
  chatsStore.filteredRouters = [
    { value: 'old-router', label: 'Old Router', isDefault: false, tiers: {} as any },
  ]
  chatsStore.filteredModelsProjectId = 'previous-project'
  chatsStore.currentChat = {
    id: 'switching-chat',
    llmModel: null,
    project: 'next-project',
    projectId: 'next-project',
    assistantIds: [],
    assistantData: [],
    history: [],
  }

  renderChatSelectors()
  openConfiguration()

  expect(screen.queryByRole('option', { name: 'Old Model' })).not.toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Old Router' })).not.toBeInTheDocument()
})
```

- [ ] **Step 4: Add the no-project (global) regression case**

```tsx
it('still shows routers for a project-less chat via the global list', async () => {
  mockAPI('GET', 'v1/llm_models', globalCatalog)
  appInfoStore.llmRouters = [
    { value: 'global-router', label: 'Global Router', isDefault: false, tiers: {} as any },
  ]
  await appInfoStore.getLLMModels()
  chatsStore.currentChat = {
    id: 'global-chat',
    llmModel: null,
    project: null,
    projectId: undefined,
    assistantIds: [],
    assistantData: [],
    history: [],
  }
  chatsStore.isNewChat = true

  renderChatSelectors()
  openConfiguration()

  expect(screen.getByRole('option', { name: 'Global Router' })).toBeInTheDocument()
})
```

- [ ] **Step 5: Run the full integration file**

Run: `npx vitest run --project integration src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx`
Expected (before Tasks 1-2, if run standalone): FAIL on the router-presence and multi/premium-router assertions, since `ChatConfigLlmSelector` doesn't yet merge `filteredRouters`; the staleness test would also fail without Task 2's gate (it would show "Old Model"/"Old Router").
Expected (after Tasks 1-2): PASS on every test in this file, including all pre-existing ones (the added `beforeEach` resets and new tests don't touch the other fixtures).

---

## Negative-constraint pass

- "No member-override feature work": Task 1 removes the only code on this branch that touched `appInfoStore.projectLlmModels`/`getProjectLLMModels` inside `chats.ts`; `appInfo.ts` itself (where `getProjectLLMModels` is defined) is never edited by any task. No task introduces override logic.
- "Do not touch `ChatPromptLlmSelector.tsx` / `LLMSelector.tsx`": neither file appears in any task's Files list. Task 2 reads `ChatPromptLlmSelector.tsx:198`'s existing pattern only as a reference for the gate it adds to `ChatConfigLlmSelector`; it does not modify `ChatPromptLlmSelector.tsx`.
- "Do not touch `appInfo.ts` / `projectModelFiltering.ts` (+ its test)": neither file appears in any task's Files list; Task 1 only changes call arguments inside `chats.ts`, not the utilities themselves.
- "AC2 must hold by construction, not by two independently-filtered lists agreeing by coincidence": Task 1 makes `filteredModels` and `filteredRouters` both derive from the same `getFilteredModelsForProject` utility; Task 2 makes `ChatConfigLlmSelector` read the exact same three store fields (`filteredModels`, `filteredRouters`, `filteredModelsProjectId`) that `ChatPromptLlmSelector` already reads, gated the same way. No task gives the two selectors separate filtering or staleness mechanisms.
- "A project switch must not let the Configuration panel show or let the user select a stale project's models or routers": Task 2 adds the `hasCurrentProjectModels` gate (mirroring `ChatPromptLlmSelector.tsx:198`) before building the merged list; Task 3 Step 3 adds a dedicated regression test asserting neither a stale model nor a stale router renders as a selectable option mid-switch.
- "Out of scope: bottom-panel vs. Configuration-panel grouping/ordering (grouped section vs. inline badge)": no task changes how routers are visually grouped — Task 2 only changes which rows are present and when, not how they're rendered (`LLMSelector`'s existing `isRouter` badge rendering, untouched, handles presentation).
- "No whole-suite gate / browser verification / review / commit task": none of the three tasks is any of those; each task's own Test-first line is the only test execution it specifies.
