# Technical Research

**Task**: chat model selector, project-scoped LLM models, chatsStore, ChatConfigLlmSelector, ChatPromptLlmSelector, appInfoStore.getProjectLLMModels, projectModelFiltering utility
**Generated**: 2026-10-21
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15676: Fix missing router models from chat Configuration panel's LLM Model selector. chatsStore.getModelsForCurrentChat / chatsStore.filteredModels must include router models for project-scoped chats, consumed by ChatConfigLlmSelector.tsx (chat Configuration panel LLM Model selector) and ChatPromptLlmSelector.tsx (prompt-box inline model picker). Original plan (docs/superpowers/tasks/2026-10-15-fix-missing-routers-from-chat-config/plan.md, technical-analysis.md) was written against main before EPMCDME-15905 ('Show routing models on the project Models tab') merged on 2026-10-19. EPMCDME-15905 added chatsStore.filteredRouters, filteredModelsProjectId, and a requestId/isCurrentRequest race-guard to getModelsForCurrentChat, and gave src/utils/projectModelFiltering.ts's getFilteredModelsForProject a new caller (filteredRouters) — contradicting the original plan's premise that this utility was dead code with no other callers. Branch EPMCDME-15676-Fix-missing-routers-from-chat-config has just been rebased onto current main with this reconciled by hand: filteredModels for project chats now sources from appInfoStore.projectLlmModels/getProjectLLMModels (the project-scoped, member-override-aware pipeline) instead of the client-side allowed_models Set filter; filteredRouters is still derived via getFilteredModelsForProject(projectId, appInfoStore.llmRouters) for ChatPromptLlmSelector's router grouping (which needs the full LLMRouterOption shape — tiers, strategy — the project-scoped ModelOption shape doesn't carry); the race-guard and filteredModelsProjectId are preserved; projectModelFiltering.ts was restored (not deleted) since it still has a live caller. Need fresh technical-analysis.md reflecting this current main state, to re-validate the plan against it.

---

## 2. Codebase Findings

### Existing Implementations

`src/store/chats.ts:1058-1106` — `getModelsForCurrentChat()` on `chatsStore`, **already implements** the reconciled design described in Section 1 (verified by reading the current file, not the stale plan):

- `modelListsRequestId` (module-level counter, `chats.ts:170`) + per-call `requestId`/`isCurrentRequest()` closure guard against a late response from a superseded project overwriting state for the project the user has since navigated to or away from.
- `projectName = chatsStore.currentChat?.project` (the **name**, used as the `projectLlmModels` cache key) is distinct from `projectId = chatsStore.currentChat?.projectId` (used for the Set-filter calls and as the race-guard key and `filteredModelsProjectId` value) — both fields are read from `currentChat`, not one derived from the other.
- `appInfoStore.getLLMModels()` is called once up front only if `appInfoStore.llmModels` is empty.
- `Promise.all([...])` fetches `filteredModels` and `filteredRouters` together on purpose — a code comment (`chats.ts:1072-1081`) explains this is so the two lists commit atomically, avoiding a render window where one reflects the new project and the other still holds stale data:
  - `filteredModels`: `projectName ? (appInfoStore.projectLlmModels[projectName] ?? appInfoStore.getProjectLLMModels(projectName)) : getFilteredModelsForProject(projectId, appInfoStore.llmModels)` — project chats read/populate the project-scoped, backend-filtered, member-override-aware cache; non-project chats still go through the client-side Set filter (a no-op without `projectId`, confirmed in `projectModelFiltering.ts`).
  - `filteredRouters`: **always** `getFilteredModelsForProject(projectId, appInfoStore.llmRouters)`, regardless of project, used for `ChatPromptLlmSelector`'s separate "Routers" group.
- On success (gated by `isCurrentRequest()`): `chatsStore.filteredModels`, `chatsStore.filteredRouters`, and `chatsStore.filteredModelsProjectId` are all set together; the function still returns `filteredModels` alone (the `ChatConfigLlmSelector` consumption shape).
- Error path unchanged in structure: catch sets `chatsStore.error`, logs, toasts, rethrows; `finally` clears `loading` only if this is still the current request.

`src/store/appInfo.ts`:
- `getLLMModels(projectId?)` (`352-383`) fetches `v1/llm_models`, splits the response on `is_router` into `appInfoStore.llmModels` (via `mapLlmModel`, `158-171`) and `appInfoStore.llmRouters` (hand-built `LLMRouterOption` objects carrying `routerType`, `strategy`, `classifierModel`, `tiers` — fields `ModelOption` does not have).
- `getProjectLLMModels(projectName)` (`385-405`) is the project-scoped pipeline: calls `v1/llm_models?project_id=<projectName>`, maps every entry (models and routers alike) through the same `mapLlmModel` into a single flat `ModelOption[]` (routers flagged `isRouter: true` but losing `tiers`/`strategy`/`classifierModel`), caches it on `appInfoStore.projectLlmModels[projectName]`, and de-dupes concurrent calls for the same project via `projectLlmModelsInFlight` (a module-level `Map`). This is the backend's member-override-aware, already-filtered list — the premise the current `chats.ts` branch relies on for `filteredModels`.
- `invalidateProjectLLMModels(projectName)` (`407-409`) clears one or all cached project entries.

`src/utils/projectModelFiltering.ts` — `getFilteredModelsForProject(projectId, allModels)`: client-side `Set`-based filter against `project.allowed_models` (normalizing versioned model ids). Returns `allModels` unchanged when `projectId` is falsy or the project has no `allowed_models`; returns `[]` with a `console.warn` if the allow-list matches nothing. **Confirmed still present and still has a live caller** — both calls in `chats.ts:1086-1087` (the no-project `filteredModels` fallback, and the always-on `filteredRouters` branch). `grep` across `src` found no other production caller. The task's note that EPMCDME-15905 "gave this utility a new caller" is slightly imprecise: the new caller (`filteredRouters`) is in the very same `chats.ts` file as the other caller, not a different module — this utility now has two call sites rather than one, both inside `getModelsForCurrentChat`.

`src/utils/routerToModelOption.ts` — pure mapper `routerToModelOption(router: LLMRouterOption): ModelOption`, producing `{ value, label, isDefault, provider, isPremium, multimodal, supportsTools, isRouter: true }`. **Not used by `chats.ts`** in the current implementation — it is used by `src/hooks/useProjectLLMModels.ts:33` (for the global/no-project list) and directly inside `ChatPromptLlmSelector.tsx` (to map a project-default router into a `ModelOption`-shaped row, `defaultModel` memo).

`src/types/entity/configuration.ts`: `ModelOption` (`39-52`) is the flat shape every selector list ultimately renders (`isRouter?: boolean` distinguishes routers); `LLMRouterOption` (`67-79`) is the richer router-only shape (`tiers: RouterTiers` required, plus `routerType`, `strategy`, `classifierModel`) that only `appInfoStore.llmRouters` / `chatsStore.filteredRouters` carry.

### Architecture and Layers Affected

- **Store layer** — `chatsStore.getModelsForCurrentChat` (`src/store/chats.ts`) is the only method whose behavior this task is about; it depends on `appInfoStore` (`src/store/appInfo.ts`) for both the global and project-scoped model/router lists.
- **Utility layer** — `src/utils/projectModelFiltering.ts` (two internal callers, both in `chats.ts`) and `src/utils/routerToModelOption.ts` (used elsewhere, not inside `chats.ts`) are read, not changed by the current implementation.
- **Component layer** — `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` consumes `chatsStore.filteredModels` only (passed to the shared `LLMSelector` as its `filteredModels` prop, gated on `currentChat.projectId && filteredModels.length > 0`); `src/pages/chat/components/ChatPrompt*/ChatPromptLlmSelector.tsx` consumes both `chatsStore.filteredModels`, `chatsStore.filteredRouters`, and `chatsStore.filteredModelsProjectId` directly via `useSnapshot(chatsStore)`, plus `appInfoStore.llmModels`/`llmRouters` for the no-project case.
- **Shared selector** — `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` (`line 160-161`): `hasFilteredModels = filteredModels && filteredModels.length > 0; models = hasFilteredModels ? filteredModels : globalModels` — any non-empty `filteredModels` prop (as `ChatConfigLlmSelector` passes for project chats) bypasses `globalModels` (its own `useProjectLLMModels`-driven computation) entirely. This bypass point is unchanged by the current implementation and is the mechanism by which `ChatConfigLlmSelector`'s router visibility now rides on `chatsStore.filteredModels` already containing routers.

### Integration Points

- `chatsStore.getModelsForCurrentChat` → `appInfoStore.getLLMModels()` / `appInfoStore.getProjectLLMModels(projectName)` → `v1/llm_models` (optionally `?project_id=`) via `api.get` (`src/utils/api.ts`, not read in depth — unaffected by this task).
- `chatsStore.getModelsForCurrentChat` → `getFilteredModelsForProject` → `projectsStore.getProject(projectId, true)` → project's `allowed_models`.
- `ChatConfigLlmSelector` → `LLMSelector` (`filteredModels` prop only) → shared with assistant settings.
- `ChatPromptLlmSelector` → `chatsStore.{filteredModels,filteredRouters,filteredModelsProjectId}` + `appInfoStore.{llmModels,llmRouters}` directly (no `LLMSelector`), with its own project/no-project branching (`modelsToDisplay`/`routersToDisplay` memos) and its own default-model/default-router resolution logic, including a fallback through `routerToModelOption` for a project's default when that default is itself a router.
- `useProjectLLMModels.ts` is a parallel, independent consumer of `appInfoStore.{llmModels,llmRouters,projectLlmModels}` used by `LLMSelector`'s `globalModels` and by `ProjectModelsSection` elsewhere (per `code-review-check.json` in this run_dir) — not touched by `chats.ts`, but shares the same underlying `appInfoStore` state and the same `routerToModelOption` mapper.

### Patterns and Conventions

- Store methods in `chats.ts` follow `try { loading=true; error=null; ... } catch { error=...; console.error; toaster.error; throw } finally { loading=false }` — preserved in the current `getModelsForCurrentChat`, with the addition of the `isCurrentRequest()` gate wrapping every state write (including inside `finally`) so a stale request cannot resurrect `loading=false` after a newer request already set it, or vice versa.
- "Atomic" `Promise.all` plus a comment justifying it (race-safety) is an established pattern in this method now — relevant precedent if a future change needs to add a third parallel fetch here.
- Routers merged into a `ModelOption[]` list via `routerToModelOption` is the convention everywhere **except** `chats.ts`'s `filteredModels` path for project chats, which instead relies on the backend (`getProjectLLMModels`'s `mapLlmModel`) to already flag `isRouter` on a flat list — two different "models + routers in one list" code paths exist side by side (client-merged via `routerToModelOption`, vs. backend-merged via `mapLlmModel`), each missing the richer `LLMRouterOption` fields the other preserves.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — Valtio store conventions (per `AGENTS.md` routing table for "State" category); not re-read in full here since the store already follows its established patterns (direct proxy mutation, `try/catch/finally`, snapshot consumption in components).
- `.ai-run/guides/testing/testing-patterns.md` — confirms unit-project test file naming/co-location (`src/store/__tests__/chats.test.ts`, plain `.test.ts`, no `.integration.` infix); the file's existing `vi.mock` of `projectModelFiltering` and direct Valtio-proxy mutation in `beforeEach`/`afterEach` match this guide's documented convention.

### Architectural Decisions

- No formal ADR found. The design rationale now lives as inline comments at the point of decision: `chats.ts:1072-1081` explains both *why* the two fetches are parallelized (atomic commit) and *why* `filteredRouters` still uses the Set-filter while `filteredModels` does not (the project-scoped pipeline's flattened `ModelOption` shape can't carry `tiers`/`strategy` that `ChatPromptLlmSelector`'s router grouping needs). `src/store/__tests__/chats.test.ts:21-23` repeats the same rationale as a test-file comment, keeping it co-located with the behavior it protects.
- `code-review-check.json` in this run_dir records that two earlier findings on this branch (CR-001, CR-002, both about an interim "surface fetch failures instead of swallowing them" commit) were introduced and then reverted (commits `5ac822caf` → `c6535ed51`), and are confirmed moot against the current branch state — `useProjectLLMModels.ts` and `ProjectModelsSection.tsx` have zero diff against the merge-base. This is current-state evidence, not a live open finding.

### Derived Conventions

- A list that needs to show "models and routers together" is built one of two ways in this codebase: (a) client-side merge via `[...llmModels, ...llmRouters.map(routerToModelOption)]` (`useProjectLLMModels.ts`, mirrored ad hoc in `ChatPromptLlmSelector.tsx`'s default-router fallback), or (b) backend-side merge where the API response itself carries `is_router`/flattened fields consumed via `mapLlmModel` (`appInfoStore.getProjectLLMModels`). `chats.ts`'s current `getModelsForCurrentChat` deliberately picks (b) for `filteredModels` and keeps the Set-filter (not (a) or (b)) for `filteredRouters`.

---

## 4. Testing Landscape

### Existing Coverage

`src/store/__tests__/chats.test.ts`, `describe('chatsStore.getModelsForCurrentChat', ...)` (currently ~9 `it` blocks, read in full) already exercises the reconciled implementation:

- Mocks `getFilteredModelsForProject` via `vi.mock('../../utils/projectModelFiltering', ...)` and spies on `appInfoStore.getProjectLLMModels`.
- `beforeEach` seeds `appInfoStore.llmModels`, `appInfoStore.llmRouters`, resets `appInfoStore.projectLlmModels = {}`, and resets `chatsStore.filteredModels/filteredRouters/filteredModelsProjectId`.
- Covers: project chat sourcing `filteredModels` from `getProjectLLMModels` (asserting the call and the result shape, including a backend-merged `isRouter: true` entry); the project-model cache being reused without refetching; the no-project fallback going through the Set-filter instead; `filteredRouters` being filtered by the Set-filter for a project chat (independent assertion, separate from `filteredModels`); atomic-commit behavior (neither `filteredModels` nor `filteredRouters` updates until **both** parallel fetches resolve); the error path (rejects, sets `chatsStore.error`, logs); the race-guard keeping the previous `filteredModelsProjectId` until both new lists arrive for a project switch; an `it.each` test for "an older response for either project arriving after the current request completes" being ignored; and a test for "keeps loading true for the current project when an older request finishes first."
- This test file already reflects the current `chats.ts` implementation exactly — no stale assertions (e.g. no leftover `toHaveBeenCalledWith(projectId, mockModels)`-style assertion from the old plan's pre-EPMCDME-15905 design) were found.

`src/utils/__tests__/projectModelFiltering.test.ts` — present (restored, not deleted) and covers `getFilteredModelsForProject` directly: no-projectId passthrough, empty-string projectId, allowed_models filtering, no-restriction passthrough, empty-allowed-models passthrough, zero-match warning path, and an error path. Mocks `projectsStore.getProject`.

### Testing Framework and Patterns

- Vitest, `unit` project for both files (plain `.test.ts`, pure store/function tests, no RTL render).
- Mocking convention: `vi.mock('path', () => ({ fn: vi.fn() }))` + `vi.mocked(fn).mockResolvedValue/mockImplementation(...)`; Valtio proxy state reset via direct property assignment in `beforeEach`/`afterEach`, not through store actions.
- Race-condition tests use manually-resolved promises (`let resolveX!: (v) => void; new Promise((resolve) => { resolveX = resolve })`) plus `await Promise.resolve()` ticks to assert intermediate (pre-resolution) state — an established pattern in this file for the atomic-commit and race-guard assertions.

### Coverage Gaps

- No test in `chats.test.ts` or elsewhere exercises `ChatConfigLlmSelector.tsx` or `ChatPromptLlmSelector.tsx` directly consuming a `filteredModels`/`filteredRouters` pair that actually contains a router — the store-level tests confirm `chatsStore.filteredModels` can contain an `isRouter: true` entry, but no component/integration test confirms that entry renders and is selectable in the Configuration panel's `LLMSelector` (the original ticket's actual symptom: "No results found" when searching "router"). This is the gap closest to the acceptance criteria and is not closed by the current store-layer tests alone.
- No test covers `LLMSelector.tsx`'s `hasFilteredModels ? filteredModels : globalModels` branch specifically with a router-containing `filteredModels` array passed in from a project chat.

---

## 5. Configuration and Environment

### Environment Variables

None specific to this feature area. The behavior is driven entirely by data already fetched from `v1/llm_models` (and `v1/llm_models?project_id=`), not by env vars or build-time config.

### Configuration Files

Not applicable — no config file governs the model/router split or the project-scoped vs. global pipeline choice; it is driven by the `is_router` field in the API payload and by whether `currentChat.project`/`projectId` is set.

### Feature Flags and Deployment Concerns

None found or applicable.

---

## 6. Risk Indicators

- **Speculative**: the current `chats.ts` implementation already matches the reconciled design described in the task context (verified by direct reading, not inferred) — the remaining open question for re-validating the plan is whether the *acceptance criteria* (router models appear and are selectable in the chat Configuration panel) are actually met end-to-end, since no component/integration test currently exercises `ChatConfigLlmSelector` → `LLMSelector` with a router-containing `filteredModels` array.
- `getFilteredModelsForProject` now has two call sites in the same function (`chats.ts:1086-1087`) with different semantics — one is a no-op passthrough for the no-project case, the other is the only place that still Set-filters routers for a project chat. A future refactor touching one call site risks missing the other, since nothing in the function signature distinguishes "model list" from "router list" callers.
- `filteredRouters` (Set-filter path) and `filteredModels` (backend-merged path, for project chats) now use **two different filtering mechanisms** that could diverge: a router excluded from `appInfoStore.projectLlmModels[projectName]` by the backend's own logic (member override, etc.) is not necessarily excluded from `chatsStore.filteredRouters` by the client-side `allowed_models` Set filter, and vice versa. `ChatPromptLlmSelector.tsx` already has a comment acknowledging the related concern ("a project that disables a router must hide it here too, not just in the Models tab checklist") but this is about the Models tab, not about the two lists in `chats.ts` agreeing with each other.
- `projectModelFiltering.ts` and its test were deleted and restored twice on this branch during the rebase reconciliation (`82d5ce65f` delete → `ad010bdf4` restore) — the plan and acceptance criteria must now explicitly state that this file **stays** (it has a live caller), reversing the original plan's Task 2.
- The project-scoped `ModelOption` returned by `getProjectLLMModels`/`mapLlmModel` does not carry `tiers`/`strategy`/`classifierModel` for routers; any future consumer that needs those fields for a project-chat router (beyond `ChatPromptLlmSelector`, which already gets them from the separate `filteredRouters` list) would hit the same shape gap this design works around today.

---

## 7. Summary for Complexity Assessment

The code already on this branch (post-rebase-reconciliation) implements the design described in the task context: `chatsStore.getModelsForCurrentChat` (`src/store/chats.ts:1058-1106`) sources `filteredModels` for project chats from `appInfoStore.projectLlmModels`/`getProjectLLMModels` (backend-merged, member-override-aware, routers flagged `isRouter`), keeps the client-side Set filter (`getFilteredModelsForProject`) only for the no-project `filteredModels` fallback and for the always-computed `filteredRouters` (needed by `ChatPromptLlmSelector` for the richer `LLMRouterOption` shape), and preserves the `requestId`/`isCurrentRequest` race-guard and `filteredModelsProjectId` added by EPMCDME-15905. `src/utils/projectModelFiltering.ts` was restored rather than deleted, since it is still called twice from within `chats.ts` itself. This touches one store method, one utility (unchanged, re-confirmed live), and no component files.

Test coverage at the store layer is thorough and already matches this implementation — `src/store/__tests__/chats.test.ts`'s ~9 cases cover both branches, the atomic dual-fetch commit, the race-guard across project switches, and the error path, with no stale assertions found. `src/utils/__tests__/projectModelFiltering.test.ts` is similarly intact. The remaining gap is above the store layer: no test exercises `ChatConfigLlmSelector`/`LLMSelector` actually rendering and making selectable a router that arrives via `chatsStore.filteredModels`, which is the literal acceptance criterion ("router models appear when searching 'router' in the chat Configuration panel").

Risk is low-to-moderate, concentrated in two places: (1) re-validating that the already-implemented store behavior genuinely satisfies the UI-level acceptance criteria, since the verification gap is at the component level, not the store level; and (2) the two parallel "merge routers into a list" mechanisms (client Set-filter for `filteredRouters`, backend-merge for `filteredModels`) can drift apart in which routers they exclude for a given project, which the current implementation does not reconcile or test for.

---

## 8. External References

The task names `docs/superpowers/tasks/2026-10-15-fix-missing-routers-from-chat-config/plan.md` and `technical-analysis.md` (this same run_dir) as the original plan written against pre-EPMCDME-15905 main. Both resolved and were read in full.

- `plan.md` (as it currently exists on disk, unchanged since before this re-analysis): still describes the pre-reconciliation design — "Replace the body of `getModelsForCurrentChat`... with no project, merge `appInfoStore.llmModels` with `appInfoStore.llmRouters.map(routerToModelOption)`... with a project, read/populate `appInfoStore.projectLlmModels[projectName]`... This removes the only caller of `getFilteredModelsForProject`, which is deleted as dead code along with its test." This premise (deleting `projectModelFiltering.ts` as dead code) is now false: the current `chats.ts` has two live calls to `getFilteredModelsForProject`, and the file was restored on this branch. `plan.md`'s Task 1 code sample (the `routerToModelOption` merge for the no-project branch) also no longer matches current `chats.ts`, which uses `getFilteredModelsForProject(projectId, appInfoStore.llmModels)` for that branch instead. `plan.md` needs a full rewrite, not an incremental patch, before it can be trusted as an implementation guide.
- `technical-analysis.md` (the prior version, now overwritten by this file): correctly identified the original bug (chat Configuration panel's `filteredModels` omitting routers) and the `LLMSelector`'s `filteredModels`-bypasses-`globalModels` mechanism (still accurate), but its Section 2 code findings (`getFilteredModelsForProject(projectId, appInfoStore.llmModels)` being the sole caller, no `filteredRouters`/race-guard existing) describe pre-EPMCDME-15905 `chats.ts` and are now superseded by Section 2 above.
