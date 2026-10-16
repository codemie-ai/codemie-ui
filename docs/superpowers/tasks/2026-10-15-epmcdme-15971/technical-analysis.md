# Technical Research

**Task**: assistant chat default model project settings
**Generated**: 2026-10-15T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15971 (Sub-Bug): Assistant chat — after the project's default models are updated, existing assistants still show the old default model in the model list.

Description: After a project administrator updates the default models in the project settings, the model list in the chat with an existing assistant still shows the old default model. A newly created assistant displays the updated default model correctly, so behavior is inconsistent between new and existing assistants.

Preconditions:
- A project with at least one existing assistant is available.
- The user has permission to change the default models in the project settings.
- The user has access to the assistant chat.

Steps to Reproduce:
1. Open the project settings and note the current default model.
2. Update the default models in the project settings and save.
3. Open a chat with an existing assistant of this project.
4. Open the model selection list in the chat and check which default model is displayed.
5. Create a new assistant in the same project and check the default model in its model list.

Expected Result: After the default models are updated, the chat with an existing assistant shows the updated default model, same as for a newly created assistant.

Actual Result: The chat with an existing assistant still shows the old default model; a newly created assistant shows the updated default model correctly.

Affected Areas: Assistant chat model selection list; Project settings default models; Existing assistants' resolution of the default model; Project-level model availability logic (related: EPMCDME-14349).

Acceptance Criteria:
1. After the project's default models are updated, the model list in the chat with an existing assistant shows the updated default model.
2. The default model displayed for existing assistants is the same as for newly created assistants in the same project.
3. The update is applied without the need to recreate the assistant.
4. Models explicitly selected in an assistant's configuration that are still available in the project are not changed.
5. Newly created assistants continue to display the updated default model correctly.

---

## 2. Codebase Findings

### Existing Implementations

- `src/types/entity/assistant.ts:111` — `Assistant.llm_model_type: string`, the model id persisted on the assistant record (empty string when the assistant has no explicit model, i.e. "use default").
- `src/types/entity/assistant.ts:138-139` — `Assistant.effective_llm_model?: string | null` and `Assistant.effective_llm_model_source?: 'assistant' | 'project_default' | null`. These two fields exist on the `Assistant` type but a codegraph search for `effective_llm_model` found **no reads of them anywhere outside the type declaration** — no component, store, or test consumes them. They look like a backend-computed resolution (added for/around EPMCDME-14349) that the frontend does not yet use.
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:296` — the assistant edit/create form seeds `llm_model_type: assistant?.llm_model_type ?? ''`. A brand-new assistant starts from `''`; an existing assistant starts from whatever was persisted on it.
- `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — the model dropdown used inside the assistant form (create/edit). Resolves its option list via `useProjectLLMModels(scopedProject)` (project-scoped, reactive to store invalidation) but takes its *selected value* directly from the form's `llm_model_type`/`value` prop — it does not independently resolve "default" when a value is already set.
- `src/hooks/useProjectLLMModels.ts` — `projectLlmModels[projectName]` cache in `appInfoStore`; fetched once per project name and re-fetched only when `appInfoStore.invalidateProjectLLMModels(projectName)` is called.
- `src/store/projectModelSettings.ts:87-111` (`saveSettings`) — on save, calls `appInfoStore.invalidateProjectLLMModels(projectName)`, which is what lets *newly opened* model pickers for that project see the updated default/catalog.
- `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — the model selector inside an open chat. Model selection state is `currentChat.llmModel: string | null`; `null` means "use the assistant/project default" and is labelled `ASSISTANT_DEFAULT_LABEL = 'Default'`. It separately fetches `projectsStore.getProject(currentChat.projectId)` on mount and again in `handleDropdownOpen` to refresh `projectDefaultModelId`, and even shows a toaster if the default has changed since initial load (`VirtualAssistantForm.tsx` has the identical refetch-and-notify pattern for the workflow assistant config panel).
- `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx:179-208` — fetches the project default on load and again on dropdown-open (`fetchDefaultModel`, `handleLLMDropdownOpen`), notifying the user when the default changed. This is the same "live project default" pattern that `ChatPromptLlmSelector` implements, but it operates on the *virtual assistant's own model field*, not on `Assistant.llm_model_type`.
- `src/pages/settings/administration/projectsManagement/components/ProjectMemberModelOverrideModal.tsx:50-56` (`getProjectDefault`) — resolves a project's effective default by first honoring `settings.default_model` if it's in the member's available model list, otherwise falling back to `models.find(isDefault)`.

### Architecture and Layers Affected

- **State layer**: Valtio stores — `appInfoStore` (model catalog + per-project cache + `invalidateProjectLLMModels`), `projectModelSettingsStore` (reads/writes project model settings, triggers cache invalidation), `chatsStore` (per-chat `llmModel` field), `assistantsStore` (assistant CRUD, does not appear to special-case `llm_model_type` resolution).
- **Hooks layer**: `useProjectLLMModels` — the single place that turns the project cache into the `ModelOption[]` list consumed by both the assistant form's `LLMSelector` and (indirectly, via `chatsStore.getModelsForCurrentChat`) the chat's model list.
- **Component layer**: `LLMSelector` (assistant form), `ChatPromptLlmSelector` (chat), `DefaultModelsSelector`/`ProjectModelsSection` (project settings admin UI).
- **Type layer**: `Assistant` interface in `src/types/entity/assistant.ts` carries both the legacy `llm_model_type` field and the apparently newer, currently-unused `effective_llm_model`/`effective_llm_model_source` pair.

### Integration Points

- `GET v1/projects/:projectName` — returns project detail including `default_model`; polled ad hoc by `ChatPromptLlmSelector`, `VirtualAssistantForm`, and `projectModelFiltering.ts`.
- `GET v1/projects/:projectName` (same endpoint, different store) — `src/store/projectModelSettings.ts` `fetchSettings`/`saveSettings` against `v1/projects/:projectName` and `v1/projects/:projectName/allowed-models`.
- `v1/llm_models?project_id=` — `src/store/llmModels.ts` `getProjectEnabledModels`, a second/older model-catalog path that is separate from `appInfoStore.projectLlmModels`.
- Assistant CRUD endpoints (via `assistantsStore`) persist `llm_model_type` on save; no code path observed that re-derives/clears it when project defaults change.

### Patterns and Conventions

- Per-project model lists are cached in a Valtio proxy (`appInfoStore.projectLlmModels`) and must be explicitly invalidated (`invalidateProjectLLMModels`) for consumers using `useSnapshot` to see fresh data — this is the documented, intentional pattern (see `.ai-run/guides/patterns/state-management.md`) rather than a bug in itself.
- Two different components (`ChatPromptLlmSelector`, `VirtualAssistantForm`) already implement an identical "re-fetch the project default on dropdown-open and toast if it changed" convention — a precedent the fix for existing-assistant chats could reuse or should be reconciled with.
- `null`/`''` is the codebase's convention for "no explicit override — use the default," used both in `Conversation.llmModel` and in the assistant form's `llm_model_type` seed value. Acceptance criterion 4 implies the same convention should extend to "whether the assistant's stored model was itself a bare default or an explicit choice," which is exactly what the unused `effective_llm_model_source` field seems designed to answer.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — Valtio store and cache-invalidation conventions (not read in full for this pass; relevant to any store-level fix).
- `.ai-run/guides/development/api-integration.md` — single HTTP layer conventions for any new/changed project or assistant endpoint consumption.
- No guide specifically documents assistant/project default-model resolution; this appears to be an area where behavior must be derived from code (see Section 2) rather than from a written spec.

### Architectural Decisions

- No ADR or inline comment found explaining why `Assistant.effective_llm_model` / `effective_llm_model_source` were added or why the frontend does not yet consume them. The ticket's "related: EPMCDME-14349" is the most likely origin of these fields.

### Derived Conventions

- The "does the catalog/list need to be live-refreshed" problem has two independent, duplicated ad hoc solutions already in the codebase (`ChatPromptLlmSelector`, `VirtualAssistantForm`), both re-fetching `projectsStore.getProject` rather than relying on a push/invalidation signal the way `appInfoStore.projectLlmModels` does for the model catalog.

---

## 4. Testing Landscape

### Existing Coverage

- `src/hooks/__tests__/useProjectLLMModels.test.ts` — covers the project-scoped model cache/fetch hook.
- `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.test.tsx`, `LLMSelector.projectModels.test.tsx`, `LLMSelector.premiumLayout.test.tsx` — cover the assistant-form model selector's option rendering, project scoping, and premium layout; no test observed asserting default-model resolution against a changed project setting.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectModelsSection.test.tsx` — covers saving project model settings and the `invalidateProjectLLMModels` call.
- `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectMemberModelOverrideModal.test.tsx`, `__tests__/projectModelConfiguration.test.ts` — cover `getProjectDefault`/`settingsToSelection`/`isModelAvailable`.
- `src/store/__tests__/projectModelSettings.test.ts` — store-level save/fetch coverage.

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`, `integration`) per `AGENTS.md`/`package.json`.

### Coverage Gaps

- No test found for `ChatPromptLlmSelector`'s "Default" option resolving to the *current* project default after a settings change for an **existing** assistant/chat — i.e., no regression test exists for the exact bug reported here.
- No test exercises `Assistant.effective_llm_model` / `effective_llm_model_source` at all (consistent with these fields being unused in product code).
- No test found asserting that an assistant's *explicitly* chosen model (acceptance criterion 4) survives a project default-model change while an *implicit* default does not — this distinction has no current test harness to anchor against.

---

## 5. Configuration and Environment

### Environment Variables

None specific to this feature found; model lists and defaults are server-driven, not env-configured.

### Configuration Files

- No project-specific config file governs this feature; all state is server data fetched via `v1/projects/:projectName` and `v1/llm_models`, cached client-side in Valtio stores described in Section 2.

### Feature Flags and Deployment Concerns

None found gating this feature area in the explored code.

---

## 6. Risk Indicators

- `Assistant.effective_llm_model` / `effective_llm_model_source` exist on the type but have zero consumers found in the codebase — Speculative: this looks like the intended mechanism to distinguish "explicit assistant model" from "project default," and the fix may need to start consuming it rather than inventing a new resolution path; this needs confirming against the actual backend contract before committing to it.
- Acceptance criterion 4 ("explicitly selected models... are not changed") requires distinguishing an explicit user choice from an inherited default. The current client-side model (`llm_model_type: string`, empty string = default) cannot express this distinction once a value is non-empty — Speculative: that distinction may have to come from the backend (`effective_llm_model_source`) rather than be re-derived purely in the frontend.
- Two independent, slightly different "refetch project default on dropdown open and toast" implementations already exist (`ChatPromptLlmSelector`, `VirtualAssistantForm`) — a third, divergent implementation for this fix would add to that duplication; worth checking if a shared hook should be extracted instead.
- `appInfoStore.projectLlmModels` cache invalidation is driven only by `ProjectModelsSection`'s own save flow calling `invalidateProjectLLMModels`; no cross-tab/other-session invalidation path was found, so a second open tab/session would not see the change until it independently reloads.
- No existing regression test covers the reported symptom (existing assistant chat showing a stale default) — any fix needs new test coverage in this area (the gap is explicitly out of scope to close here; it's a fact about current coverage, not a prescription).

---

## 7. Summary for Complexity Assessment

The task touches two Valtio-store layers (`appInfoStore`'s per-project model cache and `projectModelSettingsStore`) and two UI surfaces (`ChatPromptLlmSelector` in the open chat and `LLMSelector`/`AssistantForm` for assistant configuration), all under `src/pages/chat`, `src/pages/assistants`, and `src/store`. The project-settings side already invalidates its model-catalog cache on save and several components already implement a "refetch project default on open" pattern, so the live-refresh *mechanism* is proven and precedented in the codebase — the gap is specifically in how an *existing* assistant's persisted `llm_model_type` is read and reconciled against the current project default inside the chat's model selector.

The main technical ambiguity is the unused `effective_llm_model` / `effective_llm_model_source` fields on the `Assistant` type: they appear purpose-built for exactly this distinction (assistant-level explicit choice vs. project-default inheritance) but have no frontend consumer today, and no documentation or ADR explains their intended use. Resolving whether the fix should start consuming these fields (likely a smaller, more backend-trusting change) versus re-deriving the distinction client-side (more state-management work, higher risk of diverging from acceptance criterion 4) is the key design decision for the planning stage, not something this research can settle from the frontend code alone.

Test coverage for the specific regression is currently absent on both the resolution logic and the selector UI, so whatever approach is chosen will need new tests in `ChatPromptLlmSelector`/`LLMSelector`/`useProjectLLMModels` test suites. No external documents or files were named in the ticket to consult further.

---

## 8. External References

None named by the task.
