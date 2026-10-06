# Technical Research

**Task**: chat models project restrictions dropdown filtering
**Generated**: 2026-09-20T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

On the chat page (`http://localhost:5173/chats`), the "Select LLM model for this conversation" dropdown currently displays all available models in the system. Update it to:
1. Identify the currently active project (specifically the "zoo" project)
2. Fetch or filter the list to show only models explicitly allowed for that project
3. Handle missing project or no restrictions gracefully

Key requirements:
- Locate the component responsible for the model selection dropdown on the chat page
- Integrate project's model permission check/filter (look at how project configurations or allowed models are fetched elsewhere)
- Ensure validation when selecting a model or starting a conversation

---

## 2. Codebase Findings

### Existing Implementations

**Chat page model selector components:**
- `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — Main model dropdown on chat prompt (lines 134–240). Currently filters by search and renders all models from `appInfoStore.llmModels` without project filtering.
- `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx` — Configuration panel model selector (lines 22–48). Wraps `LLMSelector` component from assistants feature, also uses `appInfoStore` without project context.
- `src/components/PremiumModelBadge/PremiumModelBadge.tsx` — Marks premium models in dropdowns (currently used in selectors).

**Project-scoped model configuration (settings page):**
- `src/pages/settings/administration/projectsManagement/ProjectModelsSection.tsx` — Admin page for configuring allowed models per project (lines 22–90). Fetches backend config via `getProjectModelConfigurationFromBackend(projectName)` and stores state in local variables.
- `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx` — Component displaying model selection table with enable/disable toggles and default model radio. Calls `projectsStore.updateAllowedModels(projectName, allowedModels, defaultModel)` (line 141).
- `src/pages/settings/administration/projectsManagement/components/ModelConfigurationTable.tsx` — Renders the table UI for model selection in project settings.

**Conversation and project context:**
- `src/types/entity/conversation.ts` — `Conversation` interface includes `projectId?: string` field (line 223).
- `src/store/chats.ts` — `chatsStore` manages `currentChat` which is of type `Conversation` (lines 79–85).
- `src/pages/chat/ChatPage.tsx` — Main chat page accesses `currentChat` via `useSnapshot(chatsStore)` (line 74).

**Backend integration:**
- `src/store/projects.ts` — `projectsStore.updateAllowedModels(projectName, allowedModels, defaultModel)` method (lines 80–84) calls backend API.
- `src/pages/settings/administration/projectsManagement/components/projectModelConfiguration/index.ts` — Exports `getProjectModelConfigurationFromBackend(projectName)` which fetches project's allowed model IDs from backend.

### Architecture and Layers Affected

**Presentation Layer** (`src/pages/chat/`, `src/components/`):
- `ChatPromptLlmSelector.tsx` — Renders the dropdown with search and model list
- `ChatConfigLlmSelector.tsx` — Configuration sidebar model selector
- Both currently read from `appInfoStore.llmModels` without filtering

**State Layer** (`src/store/`):
- `chatsStore` — Holds `currentChat: Conversation` which includes `projectId` field
- `appInfoStore` — Provides `llmModels` array (all available models) via `getLLMModels()` method
- `projectsStore` — Provides project details and model configuration methods

**Integration Layer** (`src/utils/api.ts`):
- Models fetched via `GET /v1/llm_models?include_all=false` (used in `AvailableModelsSection`)
- Project details likely fetched via `GET /v1/projects/{projectName}` or similar
- Backend enforces model restrictions via project configuration

**Types**:
- `Conversation` (line 223) — includes optional `projectId?: string`
- `Project` (project.ts) — project entity; used in settings
- `ModelOption` (referenced in ProjectModelsSection) — model with label, value, isPremium fields

### Integration Points

1. **Chat page to project context**: `currentChat.projectId` is available in `ChatPage.tsx` via `useSnapshot(chatsStore)`
2. **Model list source**: `appInfoStore.llmModels` (from `getLLMModels()` store method)
3. **Project model config**: Backend stores `enabledModelIds` and `defaultModelId` per project; fetched via `getProjectModelConfigurationFromBackend(projectName)`
4. **Chat creation/update**: `chatsStore.updateChat(chatId, { llmModel })` (ChatConfigLlmSelector line 26)
5. **Model validation**: Currently no validation that selected model is allowed for the project

### Patterns and Conventions

**Store method pattern** (from state-management.md):
- Async methods set `this.loading = true`, `this.error = null`, then `finally { this.loading = false }`
- API responses parsed with `await response.json()` (never `.data`)
- Errors displayed via `toaster.error(msg)`

**Component snapshot pattern**:
- Components use `const { field } = useSnapshot(store)` to read state
- Components call `store.method()` to trigger actions
- Never mutate snapshot directly

**Project-scoped configuration pattern** (observed in settings):
- Project name is the identifier
- Configuration fetched backend-side and returned with model lists
- UI displays restricted list with checkboxes and radio for default

**Model display pattern**:
- Models include `label`, `value` (ID), `isPremium`, `isDefault` properties
- Premium models show badge or meta line in dropdown

---

## 3. Documentation Findings

### Guides and Architecture Docs

Found and consulted:
- `.ai-run/guides/architecture/architecture.md` — Confirms three-layer architecture (Component → Store → API); forbids direct API calls in components
- `.ai-run/guides/patterns/state-management.md` — Defines Valtio store pattern; every async method requires loading/error/finally pattern
- `.ai-run/guides/development/api-integration.md` — Specifies `.json()` parsing, store-only API calls, error handling via toaster

**No dedicated guide found** for project-scoped filtering or model restrictions logic.

### Architectural Decisions

**From architecture.md:**
- Data flow: Component → Store method → API call → `.json()` parse → store state update
- Stores are Valtio proxies; components observe via `useSnapshot`
- All HTTP calls in store methods only; never in components
- Error handling via `toaster.error()` in store catch blocks

**From settings implementation** (ProjectModelsSection):
- Project-scoped configuration uses project name as key
- Backend returns enabled model IDs; frontend maps to full model objects
- Default model stored separately; must be in enabled set

### Derived Conventions

1. **Project context retrieval**: Use `currentChat.projectId` from the chat snapshot
2. **Model filtering**: Filter `appInfoStore.llmModels` array by checking if model ID is in project's enabled list
3. **Fallback behavior**: If no project or no restrictions, show all models (graceful degradation)
4. **Store method for filtering**: Add a computed getter or method to `chatsStore` or create utility function
5. **Error state**: If project config fetch fails, show all models and log warning (don't break chat)

---

## 4. Testing Landscape

### Existing Coverage

**Unit tests for model-related components:**
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPremiumModelTip.test.tsx` — Tests premium model warning display
- `src/pages/settings/administration/projectsManagement/__tests__/AvailableModelsSection.test.tsx` — Tests project model section UI and save flow
- `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.test.tsx` — Tests configuration panel selector

**Integration tests:**
- `src/store/__tests__/chatGeneration.test.ts` — Tests chat generation store (model handling within chat requests)
- Chat history and message tests reference model selection indirectly

**Test framework:**
- Vitest with React Testing Library
- Two projects: `unit` and `integration` (vitest.workspace.ts)

### Testing Framework and Patterns

**Patterns observed in existing tests:**
- Components mocked with `useSnapshot` returning snapshot object
- Store methods called directly in store tests
- API responses mocked via fetch mock or MSW
- Loading and error states tested separately

**Fixture patterns:**
- Mock `Conversation` objects with required fields
- Mock `llmModels` array with test models
- Mock `projectsStore` with project details

**Test utilities:**
- Custom render functions wrapping components with providers
- Factory functions for creating test data (e.g., `makeChat()`)

### Coverage Gaps

**Currently untested:**
- Project-scoped model filtering logic in chat dropdown (feature not yet implemented)
- Validation that selected model is allowed for project
- Conversation API returning `projectId` field
- Backend model restriction enforcement on chat creation/update
- Graceful fallback when project config missing or fetch fails

---

## 5. Configuration and Environment

### Environment Variables

**Build-time config** (in `import.meta.env.VITE_*`):
- `VITE_API_URL` — Base URL for backend API
- `VITE_SUFFIX` — Optional URL suffix (e.g., `/app`)

**Runtime config** (`window._env_` from `config.js`):
- None specific to model restrictions (not secret config)

Models are fetched dynamically from backend at runtime via:
- `GET /v1/llm_models?include_all=false` — List of all available models
- Backend endpoint (inferred) — Project model configuration

### Configuration Files

**Project model config storage:**
- Backend database stores per-project:
  - `enabledModelIds: string[]` — Array of allowed model IDs
  - `defaultModelId?: string` — Default model for project

**Frontend config:**
- No static configuration files for model restrictions
- Dynamic config fetched from backend on demand

### Feature Flags and Deployment Concerns

**No feature flag** dedicated to project model restrictions (feature is already implemented in settings; this task extends it to chat page).

**Deployment considerations:**
- Model restriction must be consistent between chat page and conversation API
- Backend must validate model against project restrictions on conversation create/update
- Admin must configure allowed models in project settings before users can see them in chat

---

## 6. Risk Indicators

- **Missing backend contract clarity**: Task names "zoo" project specifically; unclear if this is a hardcoded test project or a generic example. Frontend cannot assume project name — must use `currentChat.projectId`.
- **No backend validation currently visible**: Codebase shows admin UI for configuring restrictions, but no explicit validation in chat request handling. Backend must enforce; frontend assumes it does.
- **Conversation type includes `projectId` but unused**: Field exists (line 223 conversation.ts) but current selectors don't read it. May indicate incomplete backend integration.
- **No existing filtering logic in chat page**: Both `ChatPromptLlmSelector` and `ChatConfigLlmSelector` render all models. No caching of project config fetches.
- **Potential performance issue**: Fetching project model config on every chat page load could be expensive. Settings page caches this in component state; chat page will need similar strategy.
- **Test coverage gap**: No tests for project-scoped filtering; risky to implement without adding test coverage.

---

## 7. Summary for Complexity Assessment

The chat page model selection dropdowns currently display all available system models from `appInfoStore.llmModels` without filtering by project. The codebase already has a complete project-scoped model configuration system in the admin settings (ProjectModelsSection, AvailableModelsSection) that stores `enabledModelIds` and `defaultModelId` on the backend per project. The `Conversation` type includes an optional `projectId` field, indicating backend support for project context in chats.

To implement project-scoped filtering on the chat page, the work involves: (1) extracting the project ID from the current chat snapshot via `currentChat.projectId`, (2) fetching or reusing the project's allowed model list (which the settings page already fetches via `getProjectModelConfigurationFromBackend`), (3) filtering the global model array by the allowed IDs, and (4) handling graceful fallbacks if the project is missing or has no restrictions. The core architecture is strictly three-layer (Component → Store → API); all filtering logic must live in a store getter or utility, not in components. Existing test coverage for model selectors is limited; the implementation will require new test fixtures for project-scoped scenarios.

The primary technical risks are: (1) unclear backend contract for how model restrictions are validated on conversation creation/update, (2) no explicit validation visible in the codebase, (3) potential performance cost of fetching project config repeatedly, and (4) the gap between the admin settings implementation (which works) and the chat page implementation (which must be added). The pattern is straightforward and follows established conventions; complexity is low if the backend model validation is already in place.

---

## 8. External References

None named by the task.
