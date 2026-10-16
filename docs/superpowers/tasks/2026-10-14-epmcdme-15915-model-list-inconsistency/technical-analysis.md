# Technical Research

**Task**: chat configuration project models
**Generated**: 2026-10-14
**Research path**: jcodemunch

---

## 1. Original Context

sdlc-light EPMCDME-15915: sidebar New chat config model dropdown matches chat dropdown; models across all memberships; each once; selection preserved.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatSidebar/ChatSidebar.tsx` renders the sidebar New Chat button. It calls `chatsStore.startNewChat('', '', false)` without a project argument and routes to `new-chat`.
- `src/store/chats.ts` `startNewChat` calls `GET v1/conversations/new` with only optional assistant/folder/workflow query parameters; transforms the returned template into `currentChat`, gives it `id = ''`, and stores `newChatParams`. It does not explicitly supply a project. Thus the client initiates a project-less new chat; any project context must come from the backend-created template or another state-setting path, not the button arguments.
- `src/pages/chat/ChatPage.tsx` uses `currentChat` to render the prompt and configuration panel. It fetches `getModelsForCurrentChat()` only when `currentChat.projectId` is truthy. New Chat configuration therefore may run with an empty chat ID and no project ID; code does not guarantee a project context for that flow.
- `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` passes current chat project ID, selected `llmModel`, and nonempty `chatsStore.filteredModels` to `LLMSelector`. The shared selector gives a nonempty `filteredModels` precedence over its own project-hook result.
- `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` uses `chatsStore.filteredModels` when current chat has project ID and global `appInfoStore.llmModels` otherwise. Its list implementation is separate from the sidebar's shared `LLMSelector`.
- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` uses `useProjectLLMModels(scopedProject)`, and without project context that hook returns the global model catalog plus routers. Explicit nonempty `filteredModels` overrides it.
- `src/hooks/useProjectLLMModels.ts` queries `appInfoStore.getProjectLLMModels(projectName)` for one project, and returns an empty list while that project list is not cached.
- `src/store/appInfo.ts` project query is `GET v1/llm_models?project_id=<project>`; the global query is `GET v1/llm_models`. Both are API lists, but only the former applies a specified project.
- `src/store/chats.ts` `getModelsForCurrentChat` calls `getFilteredModelsForProject(projectId, appInfoStore.llmModels)`; `src/utils/projectModelFiltering.ts` filters against one project's `allowed_models`.

### Architecture and Layers Affected

- Sidebar New Chat entry (`ChatSidebar`) and the project-less new-chat template creation path (`chatsStore.startNewChat`).
- Chat UI list sources (`ChatConfigLlmSelector` / shared `LLMSelector` and `ChatPromptLlmSelector`).
- Client global/project model catalogs (`appInfoStore`, `useProjectLLMModels`) and project-filtered chat list (`chatsStore`, `projectModelFiltering`).
- Backend model endpoint and service determine global versus single-project availability semantics; existing frontend evidence alone cannot establish whether global results equal a union of the user's memberships.

### Integration Points

- ChatPrompt and ChatConfig selectors are rendered from `ChatPage` against the same `currentChat` and selected model field. The New Chat button creates an empty-ID template without an explicit project, so project-only lookup cannot itself fulfill the stated all-memberships requirement for this state.
- Global catalog `GET /v1/llm_models` calls `LLMService.get_allowed_chat_models(user, project=None)` and appends router options. Backend `get_project_from_id` returns `None` when `project_id` is absent.
- Backend `LLMService.get_allowed_models(user)` sources the authenticated user's applicable model catalog; for project narrowing `_filter_models_by_project` filters to one project's `allowed_models`. Bare endpoint therefore represents user-accessible global models before any one-project narrowing. It does not explicitly compute the union of project membership overrides; whether user model resolution already incorporates all applicable membership entitlements requires care and is not proven by endpoint code alone.

### Patterns and Conventions

- Project-aware model lists should only be used when a specific project context is available; the current New Chat entry provides none explicitly.
- The shared selector already defaults to global model options without project context; however, `ChatConfigLlmSelector` can override those options with stale/nonempty `chatsStore.filteredModels`. Removing or avoiding that override in a project-less new chat lets the shared selector use the global API catalog but only addresses acceptance if that global catalog is shown to contain all membership models.
- If models are composed from multiple lists, deduplicate on the stable model value/deployment identity, not display label; keep selection bound to the model value.
- `ChatPromptLlmSelector.tsx` is an EPMCDME-15906 overlap surface: that ticket's plan modifies only this component and its test for project-scoped premium-router visibility. Avoid this source/test boundary for 15915 if possible, or coordinate to retain its planned `visibleRouters` behavior.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` entries were returned by the indexed tree. No relevant domain architecture guide was identified in the retrieved docs listing.

### Architectural Decisions

No relevant ADR was identified in the retrieved sources. Existing code/comments distinguish global catalogs from a project-specific model list and intentionally apply project `allowed_models` narrowing.

### Derived Conventions

The New Chat path starts a template with no explicit project. The common configuration selector should use the global list in this state rather than reuse a previous chat's project-filtered list. This repairs the frontend source mismatch, but does not itself prove that the global endpoint meets the multi-membership contract. Confirm endpoint results for the demo user and project memberships before concluding no backend work is needed.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx` covers current-chat/null rendering, project ID wiring and basic retained model rendering; it does not prove options parity, membership aggregation, deduplication, or selection after choosing a model.
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.projectModels.test.tsx` covers allowed project models, a now-hidden model reset once, and waiting for the project list before evaluating selection.
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` covers the prompt dropdown, option rendering and interactions.
- `src/hooks/__tests__/useProjectLLMModels.test.ts` covers no-project platform-list return, router inclusion, project loading/cache behavior.
- `src/store/__tests__/appInfo.projectLlmModels.test.ts` and `src/store/__tests__/appInfo.test.ts` cover project/global API calls and mapping.
- Backend `tests/codemie/rest_api/routers/test_llm_models.py` exercises bare endpoint output using a mocked service; it does not test cross-membership union behavior. Backend project availability coverage is in `tests/codemie/rest_api/routers/test_project_model_availability.py`.

### Testing Framework and Patterns

Frontend: Vitest 5.0.2 with React Testing Library, mocked Valtio stores/API. Backend: FastAPI route tests with `TestClient`/pytest and a mocked `llm_service`. Focused tests should assert exact options, unique stable model identities and selected value across both selectors, plus the project-less New Chat state.

### Coverage Gaps

No inspected test establishes that the bare endpoint includes the union of `demo.multi`'s project memberships or that overlapping model values occur once. No current selector test proves the required New Chat dropdown parity or selected-model persistence across both surfaces.

---

## 5. Configuration and Environment

### Environment Variables

No task-specific environment variable was found in the explored frontend implementation. The supplied local demo is already seeded.

### Configuration Files

Backend `/v1/llm_models` uses the authenticated user and optional `project_id`. With project ID it applies that project's allowed models; without it, it resolves the user's available global model catalog and adds allowed routers. Frontend project-scoped model options cache by project name in `appInfoStore.projectLlmModels`.

### Feature Flags and Deployment Concerns

Backend `LLMService.get_allowed_chat_models` applies project narrowing only when project is passed (subject to the `projectModelOverride` feature flag); `None` project returns the user's global model catalog. No backend fact found here says the route aggregates all project-membership `allowed_models`. Demo data from `/Users/gokhan_ozdemir/codemie-dev/demo-data-for-15906-15915.md` is seeded; do not rerun its seed script. It states `demo.multi` is member of `demo-15915-alpha` and `demo-15915-beta`; alpha permits three OpenAI models, beta permits Haiku, Sonnet 4.5 and gpt-4.1-mini, with gpt-4.1-mini overlapping. It does not report the 15915 API responses.

---

## 6. Risk Indicators

- **Required semantic check:** Bare `GET /v1/llm_models` calls user-level `get_allowed_chat_models(project=None)`, not a loop over each project membership. It returns the user's service-provided available models and router options; backend project filtering only narrows to a single explicit project's `allowed_models`. The contract's all-memberships union is not proven by these implementation details. Verify actual endpoint output for `demo.multi` before defining the final smallest change; if it is missing membership-provided models, a client global-list tweak is insufficient.
- New Chat button calls `startNewChat('', '', false)`; API template request has no project ID. It leads to `new-chat` with an empty ID. It does not establish an active membership project. `currentChat.projectId`-conditional logic alone will therefore use the nonproject/global path in this specific flow (unless backend template returns a project, which needs runtime/API confirmation).
- `ChatConfigLlmSelector` passes nonempty `chatsStore.filteredModels` unconditionally; this can override the shared selector's no-project global list and leak a prior project list into New Chat. The minimal UI-level correction, conditional on acceptance of global catalog semantics, is to pass `filteredModels` only when the current chat has a project ID; otherwise let `LLMSelector` use its project-less hook result. If global endpoint is not a membership union, the necessary real membership-aware source still needs to be identified/implemented.
- `ChatPromptLlmSelector.tsx` is an overlap with EPMCDME-15906. The plan in `/Users/gokhan_ozdemir/.herdr/worktrees/codemie-ui/epmcdme-15906-incorrect-listting-to-premium-models/docs/superpowers/tasks/2026-10-14-epmcdme-15906-incorrect-listing-premium-models/plan.md` explicitly changes only this component and `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` to derive/use `visibleRouters`; avoid these files in 15915 if possible and do not undo that behavior.
- Demo runtime reproduction is planned, not performed. At `localhost:5175`, sign in as `demo.multi@codemie.ai` (password `DemoPass!2026`), record bare `/v1/llm_models` response and compare model identities to both membership-specific responses (alpha and beta). Open sidebar New Chat and compare its config dropdown with the prompt dropdown; expect all membership models and one gpt-4.1-mini, select a model and verify it remains selected when closing/reopening and moving between dropdowns. Use `demo.single@codemie.ai` on alpha as contrast. Avoid reseeding and repeated logins due rate limiting.
- No source code has been modified. No tests, gates or browser checks were run.

---

## 7. Summary for Complexity Assessment

New Chat is created from the sidebar without an explicit project ID: the frontend calls `startNewChat('', '', false)` and requests a conversation template without `project_id`. Its configuration selector can thus have no project scope, while the chat prompt uses the global list in that state. The concrete UI mismatch is that `ChatConfigLlmSelector` always supplies `chatsStore.filteredModels` when nonempty, overriding the shared selector's project-less global hook and potentially carrying project-specific results into this New Chat state. The smallest frontend correction, if global data is sufficient, is to pass filtered models only for an active project; its tests should cover the empty-ID project-less New Chat and preserve selected `llmModel`.

However, backend semantics do not yet prove the acceptance criterion: bare `/v1/llm_models` calls user-level model resolution with `project=None`, rather than explicitly unioning every membership's `allowed_models`; each project-scoped call narrows against one project. Consequently, using the global list is not a justified complete fix until runtime data confirms that it includes all membership-specific models once. The seeded multi-membership account enables this comparison. If global results fail it, implement or identify a true membership-union source before finalizing the narrow UI change. EPMCDME-15906 overlaps only the prompt-selector component and test; keep 15915 source edits out of those files if possible.

---

## 8. External References

- `/Users/gokhan_ozdemir/codemie-dev/demo-data-for-15906-15915.md` — resolved and read. Users `demo.multi@codemie.ai` and `demo.single@codemie.ai` share password `DemoPass!2026`. `demo.multi` belongs to alpha (three OpenAI models) and beta (Haiku, Sonnet 4.5, gpt-4.1-mini); gpt-4.1-mini overlaps. The notes warn not to rerun seed script and that logins are rate-limited. The listed API check applies only to 15906 projects/router premium flags; it does not answer the 15915 global union question.
- `/Users/gokhan_ozdemir/.herdr/worktrees/codemie-ui/epmcdme-15906-incorrect-listting-to-premium-models/docs/superpowers/tasks/2026-10-14-epmcdme-15906-incorrect-listing-premium-models/plan.md` — resolved and read. 15906 plan limits source/test changes to `ChatPromptLlmSelector.tsx` and `ChatPromptLlmSelector.test.tsx`, requires the project's premium-router `visibleRouters` behavior, and does not change the backend endpoint, appInfoStore, chatsStore, or project filtering.
