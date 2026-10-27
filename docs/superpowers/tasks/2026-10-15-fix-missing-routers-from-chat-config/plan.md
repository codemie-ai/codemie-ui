# Fix Missing Router Models From Chat Configuration Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make router models appear, consistently, in the chat Configuration panel's LLM Model selector, by sourcing `chatsStore.filteredModels` from the same backend-driven, project-scoped pipeline (`appInfoStore.projectLlmModels` / `getProjectLLMModels`) that assistant settings already uses, instead of client-side filtering that cannot express router availability.

**Architecture:** Replace the body of `chatsStore.getModelsForCurrentChat()` (`src/store/chats.ts`) to branch on `chatsStore.currentChat?.project` (the project **name**, not `projectId`): with no project, merge `appInfoStore.llmModels` with `appInfoStore.llmRouters.map(routerToModelOption)` (mirrors `useProjectLLMModels.ts:33-36`); with a project, read/populate `appInfoStore.projectLlmModels[projectName]` via `appInfoStore.getProjectLLMModels(projectName)`, which already returns models and routers merged and backend-flagged `isRouter: true`. This removes the only caller of `getFilteredModelsForProject`, which is deleted as dead code along with its test.

**Tech Stack:** TypeScript, Valtio store, Vitest (unit project).

**Commit per task using the repository's existing convention.**

## Global Constraints

- Only `src/store/chats.ts` + `src/store/__tests__/chats.test.ts` (Task 1), and `src/utils/projectModelFiltering.ts` + `src/utils/__tests__/projectModelFiltering.test.ts` deletion (Task 2) are in scope.
- No changes to `LLMSelector.tsx`, `ChatConfigLlmSelector.tsx`, or `ChatPromptLlmSelector.tsx` — out of scope, confirmed shape-agnostic / a separately-flagged pre-existing gap.
- Key off `currentChat.project` (name), never `currentChat.projectId`.

## Acceptance criteria

- [ ] Router models (e.g. Claude Router Standard v1, Claude Router Premium v1, GPT Router Standard v1) appear when searching "router" in the chat Configuration panel's General > LLM Model selector.
- [ ] The router models selectable there are consistent with those available in assistant settings and the chat bottom-panel selector.
- [ ] Selecting an available router model from the right-side panel works as expected.

---

### Task 1: Source `getModelsForCurrentChat` from the project-scoped model pipeline

**Files:**
- Modify: `src/store/chats.ts` (imports near top; `getModelsForCurrentChat`, lines 1053-1074)
- Test: `src/store/__tests__/chats.test.ts` (rewrite the `chatsStore.getModelsForCurrentChat` describe block, lines 1-128)

**Interfaces:**
- Consumes: `appInfoStore.llmModels: ModelOption[]`, `appInfoStore.llmRouters: LLMRouterOption[]`, `appInfoStore.projectLlmModels: Record<string, ModelOption[]>`, `appInfoStore.getLLMModels(): Promise<ModelOption[]>`, `appInfoStore.getProjectLLMModels(projectName: string): Promise<ModelOption[]>` (all `src/store/appInfo.ts`), `routerToModelOption(router: LLMRouterOption): ModelOption` (`src/utils/routerToModelOption.ts`).
- Produces: `chatsStore.filteredModels: ModelOption[]` — unchanged type, still consumed as-is by `ChatConfigLlmSelector.tsx`.

Test-first: yes — rewrite the describe block's tests to fail against the current (pre-fix) implementation before touching `chats.ts`.

- [ ] **Step 1: Rewrite `src/store/__tests__/chats.test.ts`**

  Remove the `vi.mock('../../utils/projectModelFiltering', ...)` block (lines 18, 23-26) and its import — the module is being deleted in Task 2 and `chats.ts` will no longer import it.

  Replace the `describe('chatsStore.getModelsForCurrentChat', ...)` body with:

  ```ts
  describe('chatsStore.getModelsForCurrentChat', () => {
    const mockModels = [
      { value: 'gpt-4', label: 'GPT-4', isPremium: true },
      { value: 'gpt-3.5', label: 'GPT-3.5', isPremium: false },
    ]
    const mockRouters = [
      { value: 'claude-router-standard-v1', label: 'Claude Router Standard v1', provider: 'anthropic' },
    ]
    const mockProjectModels = [
      { value: 'gpt-4', label: 'GPT-4', isPremium: true },
      { value: 'claude-router-premium-v1', label: 'Claude Router Premium v1', isRouter: true },
    ]

    beforeEach(() => {
      vi.clearAllMocks()
      chatsStore.currentChat = null
      chatsStore.filteredModels = []
      appInfoStore.llmModels = mockModels as any
      appInfoStore.llmRouters = mockRouters as any
      appInfoStore.projectLlmModels = {}
      vi.spyOn(appInfoStore, 'getLLMModels').mockResolvedValue(mockModels as any)
      vi.spyOn(appInfoStore, 'getProjectLLMModels').mockImplementation(async (name: string) => {
        appInfoStore.projectLlmModels[name] = mockProjectModels as any
        return mockProjectModels as any
      })
    })

    afterEach(() => {
      chatsStore.currentChat = null
      chatsStore.filteredModels = []
      appInfoStore.projectLlmModels = {}
    })

    it('merges llmModels and router-mapped llmRouters when the chat has no project', async () => {
      chatsStore.currentChat = { id: '1', llmModel: 'gpt-4' } as any

      const result = await chatsStore.getModelsForCurrentChat()

      expect(result).toEqual([
        ...mockModels,
        { value: 'claude-router-standard-v1', label: 'Claude Router Standard v1', provider: 'anthropic', isRouter: true },
      ])
      expect(chatsStore.filteredModels).toEqual(result)
    })

    it('returns appInfoStore.projectLlmModels[project] unmodified when the chat has a project', async () => {
      appInfoStore.projectLlmModels['zoo'] = mockProjectModels as any
      chatsStore.currentChat = { id: '2', project: 'zoo', llmModel: 'gpt-4' } as any

      const result = await chatsStore.getModelsForCurrentChat()

      expect(result).toEqual(mockProjectModels)
      expect(appInfoStore.getProjectLLMModels).not.toHaveBeenCalled()
    })

    it('fetches project models via getProjectLLMModels when not yet cached', async () => {
      chatsStore.currentChat = { id: '3', project: 'zoo', llmModel: 'gpt-4' } as any

      const result = await chatsStore.getModelsForCurrentChat()

      expect(appInfoStore.getProjectLLMModels).toHaveBeenCalledWith('zoo')
      expect(result).toEqual(mockProjectModels)
    })

    it('handles errors gracefully', async () => {
      chatsStore.currentChat = { id: '4', project: 'zoo', llmModel: 'gpt-4' } as any
      vi.mocked(appInfoStore.getProjectLLMModels).mockRejectedValue(new Error('Network error'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(chatsStore.getModelsForCurrentChat()).rejects.toThrow('Network error')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(chatsStore.error).toBe('Network error')
      consoleErrorSpy.mockRestore()
    })
  })
  ```

- [ ] **Step 2: Run the tests and confirm they fail**

  Run: `npx vitest run --project unit src/store/__tests__/chats.test.ts`
  Expected: FAIL — `appInfoStore.getProjectLLMModels` is not yet called by `getModelsForCurrentChat`, and `currentChat.project` is not yet read, so the no-project/project-branch assertions mismatch against the current `getFilteredModelsForProject`-based implementation.

- [ ] **Step 3: Implement the fix in `src/store/chats.ts`**

  Add the import alongside the other `@/utils/...` imports:

  ```ts
  import { routerToModelOption } from '@/utils/routerToModelOption'
  ```

  Remove the existing `import { getFilteredModelsForProject } from '@/utils/projectModelFiltering'` line.

  Replace lines 1053-1074 (`getModelsForCurrentChat`) with:

  ```ts
  async getModelsForCurrentChat() {
    try {
      chatsStore.loading = true
      chatsStore.error = null
      const projectName = chatsStore.currentChat?.project

      if (!projectName) {
        if (!appInfoStore.llmModels.length) await appInfoStore.getLLMModels()
        chatsStore.filteredModels = [
          ...appInfoStore.llmModels,
          ...appInfoStore.llmRouters.map(routerToModelOption),
        ]
        return chatsStore.filteredModels
      }

      if (!appInfoStore.projectLlmModels[projectName]) {
        await appInfoStore.getProjectLLMModels(projectName)
      }
      chatsStore.filteredModels = appInfoStore.projectLlmModels[projectName] ?? []
      return chatsStore.filteredModels
    } catch (error) {
      chatsStore.error = error instanceof Error ? error.message : 'Failed to filter models'
      console.error('Error filtering models for chat:', error)
      toaster.error(chatsStore.error)
      throw error
    } finally {
      chatsStore.loading = false
    }
  },
  ```

- [ ] **Step 4: Run the tests and confirm they pass**

  Run: `npx vitest run --project unit src/store/__tests__/chats.test.ts`
  Expected: PASS — all four tests green.

- [ ] **Step 5: Commit**

  Commit `src/store/chats.ts` and `src/store/__tests__/chats.test.ts` together, per the repository's existing commit convention.

---

### Task 2: Delete the now-dead `projectModelFiltering` utility

**Files:**
- Delete: `src/utils/projectModelFiltering.ts`
- Delete: `src/utils/__tests__/projectModelFiltering.test.ts`

**Interfaces:**
- Consumes: nothing (Task 1 already removed the only production import).
- Produces: nothing — pure removal; no other task depends on this file existing.

Test-first: no — this is a deletion-only task with no new behavior to drive with a failing test. Verification is a grep for remaining references plus Task 1's already-passing suite (which no longer imports this module) and a type-check.

- [ ] **Step 1: Confirm no remaining references**

  Run: `grep -rn "projectModelFiltering" src`
  Expected: no output (Task 1 already removed the import from `src/store/chats.ts`; the only other prior references were this file and its own test).

- [ ] **Step 2: Delete the files**

  Delete `src/utils/projectModelFiltering.ts` and `src/utils/__tests__/projectModelFiltering.test.ts`.

- [ ] **Step 3: Verify the build still type-checks and the unit suite passes**

  Run: `npx vitest run --project unit src/store/__tests__/chats.test.ts`
  Expected: PASS (unchanged from Task 1 — confirms the deletion broke nothing).
  Run: `npx tsc --noEmit` (or the project's configured type-check script)
  Expected: no errors referencing the deleted file.

- [ ] **Step 4: Commit**

  Commit the two deletions together, per the repository's existing commit convention.

---

## Negative-constraint pass

- "Routers are never listed in `allowed_models`; `getFilteredModelsForProject`'s Set-membership check cannot express router availability" — honored: Task 1 removes that call path entirely for the project-scoped branch, replacing it with `appInfoStore.projectLlmModels`, which carries backend-computed availability.
- "The fix MUST key off `currentChat.project`, not `currentChat.projectId`" — honored: Task 1's implementation and every test fixture use `project`; no fixture or code path reads `projectId`.
- "Do NOT re-derive [project-scoped routers] via `routerToModelOption`" — honored: the project branch returns `appInfoStore.projectLlmModels[projectName]` unmodified; `routerToModelOption` is only applied in the no-project branch, mirroring `useProjectLLMModels.ts`.
- "Do not touch `ChatPromptLlmSelector.tsx`, `LLMSelector.tsx`, or `ChatConfigLlmSelector.tsx`" — honored: no task's Files list names them.
- "No tasks for whole-suite quality gates, browser verification, code review, or a standalone commit task" — honored: each task's own steps run only the file(s) it touches; commit is the last step of each task, not a separate task.
- negative-constraints: all addressed above; none left unaddressed.
