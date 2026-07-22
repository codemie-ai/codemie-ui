# Technical Research

**Task**: chat assistant-config agent-execution interactive-elements
**Generated**: 2026-07-16T00:00:00Z
**Research path**: filesystem
**Repos researched**: Backend `codemie` (branch feature/EPMCDME-13259-interactive-chat-input) · Frontend `codemie-ui` (branch feature/EPMCDME-13259-interactive-chat-input)

---

## 1. Original Context

EPMCDME-13259 — Enable interactive user input in CodeMie agent chat (Story, Major).

As a CodeMie user, I want to interact with an agent directly in the chat through basic interactive elements, so that I can make decisions, select options, and provide structured input without relying only on free-text messages. The agent must be able to request explicit user decisions/inputs, pause execution until the user responds, and then continue the workflow based on the structured user response.

Preconditions: CodeMie agent chat is available; agent execution happens server-side; existing text-only chat behavior remains supported.

Scenarios:
1. Decision (Approve/Reject/Confirm/Continue): agent shows actions → user clicks → agent receives selected action → continues.
2. Choice (single/multi): agent shows options → user selects one/multiple → structured selection returned → agent continues.
3. Short forms with validation: agent requests structured fields → user fills form → client validates → structured values returned → agent continues.
4. State update: after user action, UI updates state of existing interactive element (disable buttons, mark submitted, update text) without breaking chat context.

Affected areas: CodeMie chat UI (rendering interactive elements); Agent ↔ UI interaction flow (delivery of structured user actions/values); Agent execution flow (pause/resume on explicit user input); Assistant configuration UI (new "Interactive features" block in assistant creation/editing); configuration of allowed interactive elements (catalog exposed to agent).

Interactive Features Configuration (v1): features enable/disable via config; disabled feature's elements must be removed from the catalog exposed to the agent (not only hidden in UI). Always-on layout elements when any feature enabled: Column, Row, Text. Features: action_buttons (Button), choice (MultipleChoice, single/multi via maxAllowedSelections), short_forms (TextField, CheckBox, Submit Button; validation: required, regex, email). Dependency: Button available when action_buttons OR short_forms enabled. System must expose explicit list of enabled elements to the agent.

Acceptance criteria: chat UI displays interactive elements in agent messages; user triggers actions in chat, agent receives structured action and continues; MultipleChoice single/multi with structured return; short form submit with structured return; validation blocks invalid input client-side; agent can pause until explicit user input and resume after; UI updates element state without breaking chat context; "Interactive features" config block in assistant create/edit UI; disabled features removed from agent-exposed catalog; text-only chat not regressed.

Technical notes: researched implementation is a single integrated stack CopilotKit + AG-UI + A2UI (complementary parts of one end-to-end solution): CopilotKit — frontend integration & rendering of interactive elements in chat; AG-UI — bi-directional transport for events between UI and agent execution; A2UI — structured schema/payload format for interactive UI produced by the agent and rendered by the UI. For v1 start with fixed-schema and the built-in basic catalog.

---

## 2. Codebase Findings

### Existing Implementations

**BACKEND (`codemie`)**

Chat pipeline (transport is **NDJSON over HTTP POST, not SSE**):
- `codemie/src/codemie/rest_api/routers/assistant.py` — chat endpoints `POST /v1/assistants/{assistant_id}/model` and `POST /v1/assistants/virtual/model` (streaming or sync); also assistant CRUD
- `codemie/src/codemie/rest_api/handlers/assistant_handlers.py` — `_handle_stream` builds agent via `AssistantService.build_agent`, runs `agent.stream()` in a thread pool, pipes a `ThreadedGenerator` queue into `StreamingResponse(media_type="application/x-ndjson")`; each line is `StreamedGenerationResult.model_dump_json()`; client disconnect saves history with `ConversationStatus.INTERRUPTED`
- `codemie/src/codemie/chains/base.py` — stream chunk schema: `StreamedGenerationResult` (`generated_chunk`, `generated`, `thought`, `last`, `workflow_state`, `execution_error`, `success`, `tool_errors`), `Thought` (id/parent_id tree; `output_format` limited to `text|markdown`), `WorkflowStateEvent` — extensible pydantic model; new interactive-element event = new optional field(s)
- `codemie/src/codemie/core/thread.py` — `ThreadedGenerator` producer/consumer queue between agent thread and HTTP stream

Agent execution:
- `codemie/src/codemie/agents/langgraph_agent.py` — `LangGraphAgent` (~1590 lines): `init_agent`, `stream()`, `_stream_graph`, supervisor/handoff logic — the assistant agent loop
- `codemie/src/codemie/agents/langgraph_event_adapter.py` — `LangGraphCallbackBridge` / `LangGraphEventAdapter`: maps LangGraph chunks (messages, tool calls) to Thought callbacks — the layer where interactive-element events would be emitted into the stream
- `codemie/src/codemie/agents/assistant_agent.py` — system prompt assembly (`_get_system_prompt`, appends `markdown_response_prompt`) — injection point for the allowed-elements catalog instructions
- `codemie/src/codemie/service/assistant_service.py` — `build_agent` (line ~480), `render_system_prompt_with_vars` (Jinja2 secure template), `get_tools_info`
- `codemie/src/codemie/service/assistant/assistant_engine_builder.py` — builds compiled LangGraph `CompiledStateGraph` executors, subagents, tool kwargs

Models & config:
- `codemie/src/codemie/rest_api/models/assistant.py` — `AssistantBase`/`Assistant` (SQLModel) with JSONB config fields (`toolkits`, `mcp_servers`, `hedging_config`, `enabled_builtin_subagents`, `prompt_variables`, `custom_metadata`); `AssistantRequest` (line ~286) carries per-assistant toggles (`enable_image_generation`, `smart_tool_selection_enabled`, `hedging_config`, `enabled_builtin_subagents`) — natural home for a new `interactive_features` JSONB field + request sub-model
- `codemie/src/codemie/rest_api/models/conversation.py` — `Conversation` + `GeneratedMessage(ChatMessage)`: persisted message = `message`, `thoughts: List[Thought]`, `file_names`, workflow refs; **no structured interactive parts today**
- `codemie/src/external/alembic/versions/` — migration pattern precedent: `r7s8t9u0v1w2_add_hedging_config_to_assistants.py` (`op.add_column('assistants', sa.Column('hedging_config', postgresql.JSONB(), nullable=True))`)

Workflow-level HITL (existing pause/resume, workflows only):
- `codemie/src/codemie/workflows/workflow.py` — `interrupt_before` states, `_check_for_interruption`, resume via checkpointer
- `codemie/src/codemie/workflows/checkpoint_saver.py` — LangGraph checkpoint saver for resuming interrupted workflows
- `codemie/src/codemie/rest_api/routers/workflow_executions.py` (line ~385) — `PUT /v1/workflows/{id}/executions/{execution_id}/resume?stream=true` with `ResumeWorkflowExecutionRequest { user_input, file_names }`

**FRONTEND (`codemie-ui`)**

Chat streaming client & state:
- `codemie-ui/src/utils/api.ts` — `api.stream()`: `fetch` POST, checks `Content-Type === 'application/x-ndjson'`, returns `response.body.pipeThrough(new TextDecoderStream()).getReader()`; parses MCP-auth error payloads. No EventSource/SSE anywhere
- `codemie-ui/src/store/chatGeneration.ts` — valtio store (~1115 lines): `createChatGeneration` → `_prepareRequestData` → `_handleGenerationStream` read loop → `_handleChunk` (line-buffered JSON.parse with `cachedValue` for partial chunks) → `_handleThought` (merge by id/parent_id into `historyItem.thoughts`); also `resumeWorkflowExecution`, `stopChatGeneration`, MCP auth prompt actions — where new interactive-element chunk handling and "submit structured response" actions land
- `codemie-ui/src/store/chats.ts` — conversations/history store (`chat.isInterrupted`, `refreshWorkflowExecutionIds`)
- `codemie-ui/src/types/entity/conversation.ts` — `ChatMessage` (response, thoughts, stream, `mcpAuthPromptRows`, executionId), `Thought`, `Stream` types

Chat rendering:
- `codemie-ui/src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — assistant message renderer: `Markdown` + `Thought` components, `ThinkingLoader`, `ChatAiAuthPrompt` (existing in-message interactive button block for MCP auth) — insertion point for interactive elements
- `codemie-ui/src/components/markdown/Markdown.tsx` — react-markdown 10.1.0 + dompurify; custom tokens in `src/components/markdown/tokens`
- `codemie-ui/src/components/Thought/Thought.tsx` — tool-call/step display
- `codemie-ui/src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` — user input; interrupted-state gating (`isInterrupted`)
- `codemie-ui/src/pages/chat/components/ChatEditOutputForm.tsx` + `codemie-ui/src/components/EditOutputForm/EditOutputForm.tsx` — existing workflow-interrupt UI (edit output, then resume)

Assistant configuration form:
- `codemie-ui/src/pages/assistants/components/AssistantForm/AssistantForm.tsx` — react-hook-form 7.56.4 + `yupResolver` (Yup 1.6.1, not zod); accordion sections ("Context & Data Sources", "Image generation", "Skills", "Request Hedging") — "Interactive features" is a new section here
- `codemie-ui/src/pages/assistants/components/AssistantForm/components/HedgingConfig.tsx` — template example of an optional per-assistant config block section
- `codemie-ui/src/pages/assistants/components/AssistantForm/components/FormAccordion/` + `FormSection.tsx` — section primitives
- `codemie-ui/src/types/entity/assistant.ts` — assistant entity type; `codemie-ui/src/pages/assistants/utils/compareFormData.ts` — form-diff logic that must include the new block

### Architecture and Layers Affected

**Backend**: API/Router (`rest_api/routers/assistant.py`, possibly a new resume/action endpoint) → Handlers (`rest_api/handlers/assistant_handlers.py` streaming) → Service (`service/assistant_service.py`, `service/assistant/assistant_engine_builder.py`, conversation service) → Agent runtime (`agents/langgraph_agent.py`, `langgraph_event_adapter.py`, `assistant_agent.py` prompt assembly) → Models/Persistence (`rest_api/models/assistant.py`, `conversation.py`, alembic migration) → Chains/stream schema (`chains/base.py`). Config layer: `configs/config.py` + `config/customer/customer-config.yaml` feature flag.

**Frontend**: Pages (chat, assistants) → Feature components (ChatAiMessage, ChatPrompt, AssistantForm sections, new interactive-element components) → Shared components (Markdown, Thought, form primitives) → Valtio stores (`chatGeneration`, `chats`, `assistants`, `appInfo` feature flags) → `utils/api.ts` streaming client → Types (`types/entity/conversation.ts`, `assistant.ts`).

### Integration Points

- **Stream protocol contract** (backend `StreamedGenerationResult` NDJSON ⇄ frontend `_handleChunk`): both sides must change in lockstep to carry interactive-element payloads and element-state updates. Note: adopting the AG-UI event protocol would mean replacing or bridging this proprietary NDJSON protocol on both sides — a significant integration decision.
- **Resume/structured-action delivery**: no agent-chat resume endpoint exists. Workflow precedent: `PUT /v1/workflows/{id}/executions/{id}/resume` with `user_input`. LangGraph 1.1.6 + langgraph-checkpoint ^3.0.1 provide `interrupt()`/`Command(resume=...)` primitives — installed but unused for assistant chat; the workflow checkpoint saver (`workflows/checkpoint_saver.py`) is the reuse candidate.
- **Assistant CRUD contract**: `AssistantRequest`/`AssistantBase` (backend) ⇄ `assistant.ts` entity + `AssistantForm` (frontend) for the `interactive_features` config block.
- **Feature-flag pipeline**: backend `config/customer/customer-config.yaml` component (`features:*` id) served via `GET /v1/config` (`rest_api/routers/customer_config.py`) → frontend `appInfoStore.fetchCustomerConfig()` (`src/store/appInfo.ts`) → `isFeatureEnabled()` (`src/utils/featureFlags.ts`) / `useFeatureFlag()` (`src/hooks/useFeatureFlags.ts`).
- **Agent-facing catalog exposure**: system prompt assembly in `assistant_agent.py` (Jinja2-rendered, format prompts appended) and/or a tool registered via the engine builder; tool catalog UI exposure precedent in `service/tools/tools_info_service.py` (`get_tools_info(show_for_ui=...)`).
- **NATS is NOT relevant** to pause/resume — it serves plugin toolkit / IDE request-reply. Redis and the ES conversation indices are available for state; LangGraph checkpointer is the documented mechanism.
- **Naming caution**: backend has an `a2a` (Agent2Agent) module at `src/codemie/rest_api/a2a/` — unrelated to A2UI; do not confuse.

### Patterns and Conventions

- **Backend**: layered router → handler → feature-scoped service → repository; assistant config blocks = pydantic sub-model stored as JSONB column (`PydanticType`/`PydanticListType`) + backward-compat validators + alembic migration (`hedging_config`, `enabled_builtin_subagents` are direct precedents); two-tier feature gating (env bool on `Config` for backend behavior + `customer-config.yaml` `features:*` component for UI-visible features — `HedgingConfig` gated by `features:requestHedging` is the exact precedent for "Interactive features"); stream events flow agent → callback bridge → `ThoughtInMemoryStorage`/`ThreadedGenerator` → NDJSON.
- **Frontend**: mandatory store pattern — ALL API calls (including streaming) live in valtio store methods, components consume `useSnapshot`; element-state updates after user action = direct proxy mutation on `historyItem` (same as `applyPromptRows` for MCP auth); NDJSON line-buffered parsing with partial-chunk cache; thought tree merged by id/parent_id (supports incremental structured payloads); forms = react-hook-form + Yup + `Controller` + `FormAccordion` sections.
- **Existing in-chat interactive precedents**: `ChatAiAuthPrompt` (MCP auth buttons rendered inside an agent message, action → re-send) and workflow interrupt → `ChatEditOutputForm` + `resumeWorkflowExecution(userInput)`.
- **CopilotKit / AG-UI / A2UI: zero presence** in either repo (no deps, no code refs, no doc mentions). Adoption is greenfield and conflicts with two established conventions: the proprietary NDJSON `StreamedGenerationResult` protocol and the frontend "all API in valtio stores" rule.

---

## 3. Documentation Findings

### Guides and Architecture Docs

**Backend `.ai-run/guides/` (37 guides; most relevant):**
- `codemie/.ai-run/guides/workflows/langgraph-workflows.md` — LangGraph patterns; rule: extend `WorkflowExecutor`/nodes rather than create parallel graph paths. Primary guide for pause/resume work.
- `codemie/.ai-run/guides/agents/langchain-agent-patterns.md`, `agents/agent-tools.md`, `agents/custom-tool-creation.md`, `agents/tool-overview.md` — agent runtime and tool schema (relevant for exposing the element catalog as a tool)
- `codemie/.ai-run/guides/api/rest-api-patterns.md`, `api/endpoint-conventions.md` — FastAPI conventions (no streaming section)
- `codemie/.ai-run/guides/architecture/service-layer-patterns.md` — feature-scoped service pattern for a new interactive-input service

**Frontend `.ai-run/guides/` (26 guides; most relevant):**
- `codemie-ui/.ai-run/guides/development/api-integration.md` — documented streaming convention (`api.stream()` + manual reader loop) and the "Store Pattern (Required Architecture)" rule — key constraint for any CopilotKit/AG-UI adoption
- `codemie-ui/.ai-run/guides/patterns/state-management.md` — valtio, one store per domain
- `codemie-ui/.ai-run/guides/components/component-patterns.md`, `component-organization.md`, `reusable-components.md` — where new interactive chat elements live
- `codemie-ui/.ai-run/guides/patterns/form-patterns.md`, `modal-patterns.md` — form/dialog conventions for in-chat forms and the config block

Note: frontend `CLAUDE.md`/`AGENTS.md` body appears copied from the backend repo — trust `.ai-run/guides/` in the frontend repo instead.

### Architectural Decisions

- Backend `codemie/docs/workflows/06_advanced_features.md` §7.4 "Workflow Interruption" — the recorded HITL design: `interrupt_before: true` pauses before a state; user reviews/edits/continues; resume from checkpoint. Includes "Interruption with User Input Integration" example and best practices. Also `docs/workflows/03_workflow_states.md`.
- Frontend `codemie-ui/docs/superpowers/specs/2026-05-26-hitl-file-upload-design.md` (EPMCDME-12393, Approved) — closest prior art: records the full chat-mode pause/resume plumbing (`chatGenerationStore.resumeWorkflowExecution` → resume endpoint; `isInterrupted` gating in ChatPrompt; `ContinueWithInputPopup`; `useExecutionResume.tsx`). Plus its plan and work-item docs.
- Frontend `codemie-ui/docs/superpowers/plans/2026-05-28-agentcore-configuration-json-form.md` — precedent for a JSON-driven config form block in assistant configuration.
- Backend streaming decisions: `docs/superpowers/agentcore-non-streaming.md`, `docs/superpowers/specs/2026-06-16-agentcore-streaming-mismatch-error-design.md`.

### Derived Conventions

- Per-assistant optional feature = pydantic sub-model + JSONB column + alembic migration + `AssistantRequest` field + matching frontend form accordion section + `compareFormData.ts` entry (HedgingConfig end-to-end precedent).
- Deployment-level feature gate = `customer-config.yaml` `features:*` component + `useFeatureFlag()` on the frontend.
- Config catalogs live under `config/` wired through `Config` path fields (`ASSISTANT_TEMPLATES_DIR`, `SUBAGENTS_CONFIG_DIR`) — an interactive-elements catalog config would follow this pattern.

---

## 4. Testing Landscape

### Existing Coverage

**Backend** (`codemie/tests`, mirrors src structure):
- `tests/codemie/rest_api/routers/test_assistant.py` — assistant CRUD (17 tests); `test_conversation.py` — chat endpoints (18 tests)
- `tests/codemie/rest_api/handlers/test_assistant_handlers_streaming.py` — streaming error formatting, serialized stream chunks, MCP-auth re-raise
- `tests/codemie/agents/test_assistant_agent/` (15 files incl. `test_agent_streaming.py` chunk processing) + langgraph multi-assistant/supervisor/patches/truncation tests
- `tests/codemie/workflows/test_workflow_resume_input.py`, `test_workflow_state_transitions.py`, `tests/codemie/rest_api/routers/test_resume_workflow_execution.py` — workflow pause/resume/interrupt (nearest analog to agent pause/resume)
- `tests/codemie/service/test_assistant_service_*.py` (~13 files), `test_conversation_service.py`, `test_history_materializer.py`

**Frontend** (~290 test files, colocated `__tests__/` dirs):
- `src/store/__tests__/chatGeneration.test.ts` (+ `.prepareRequestData`, `.resumeWorkflowExecution` variants) — chat generation store incl. MCP auth prompts, abort, workflow resume
- `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiAuthPrompt.test.tsx` — closest existing "interactive element in a message" test precedent
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx`; `src/pages/chat/__tests__/ChatPage.test.tsx`; `src/pages/chat/hooks/__tests__/useAssistantFeatures.test.ts`
- `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx`, `AssistantDetailsPage.integration.test.tsx` — assistant create/edit flows (files to extend for the new config block); `src/store/__tests__/assistants.test.ts`

### Testing Framework and Patterns

- **Backend**: pytest ^8.3.1, pytest-asyncio, pytest-mock, pytest-httpx; `pytest.ini` (testpaths=tests, pythonpath=src, env vars). Root conftest loads `.env.test` and session-mocks `PostgresClient.get_engine` (no real DB); router conftests disable rate limiter and build bare FastAPI apps + TestClient; LLM/agent mocking via `MagicMock`/`patch`.
- **Frontend**: Vitest 1.6.1 (istanbul coverage), @testing-library/react 16.3.0, jsdom. Two workspace projects (`vitest.workspace.ts`): `unit` (`*.test.tsx`, mocked stores/api via `src/setupTests.unit.ts`) and `integration` (`*.integration.test.tsx`, real valtio stores, `mockAPI()` harness in `src/test-utils/integration.tsx`, memory router, 15s timeout). No Playwright/e2e. `mock-server/` = json-server for local dev only (REST-only; cannot mock NDJSON streaming).

### Coverage Gaps

- No tests for LangGraph `interrupt()`-based agent chat pause/resume (all interrupt/resume tests are workflow-execution scoped) — backend and frontend
- No tests anywhere for interactive chat elements (grep "interactive" yields nothing test-related in either repo)
- Backend NDJSON chat streaming covered only at error-formatting/chunk level, not end-to-end interrupt-then-resume streams
- Frontend has no tests simulating SSE/ReadableStream chunk-by-chunk stream parsing (mocked at api/response level; abort tested, parsing not)
- No assistant-config tests for feature-toggle blocks of the "Interactive features" kind on either side

---

## 5. Configuration and Environment

### Environment Variables

**Backend** (`src/codemie/configs/config.py`, single pydantic `BaseSettings`):
- `AI_AGENT_RECURSION_LIMIT`, `AI_AGENT_CONVERSATION_REPLAY_V2_ENABLED`, `AI_AGENT_HISTORY_COMPACTION_*` — agent execution tuning
- `ENABLE_LANGGRAPH_AITOOLS_AGENT` — langgraph agent version switch; `HIDE_AGENT_STREAMING_EXCEPTIONS` — streaming error masking
- `TOOL_SELECTION_ENABLED`/`_THRESHOLD`/`_LIMIT` — smart tool selection gate (feature-gating naming precedent)
- `USER_CONVERSATION_INDEX`, `SHARED_CONVERSATION_INDEX` — ES chat storage; `REDIS_*` — available (MCP auth, locks); `NATS_*` — plugin/IDE request-reply (not chat)

**Frontend**: `VITE_API_URL`, `VITE_ENV`; `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED` (bool toggle precedent); VITE vars are deploy-time via Helm configmap (`deploy-templates/templates/configmap.yaml`); every new VITE var must be added to `src/types/global.ts` (`ImportMetaEnv`).

### Configuration Files

- `codemie/config/customer/customer-config.yaml` — runtime feature-flag source served to UI via `GET /v1/config`; parsed by `src/codemie/configs/customer_config.py` (`Component{id, settings{enabled, ...}}`). A new `features:interactiveElements` entry is the idiomatic gate.
- `codemie/config/` — `templates/assistant`, `subagents/subagents.yaml`, `categories`, `llms` — path-wired catalogs; pattern for an interactive-elements catalog config.
- `codemie-ui/mock-server/` — json-server (`db.json` + `routes.json`); `/v1/config` already routed — mock the new flag by adding a db.json entry; streaming endpoints not mockable there.

### Feature Flags and Deployment Concerns

- Two-tier flag mechanism: env bool on backend `Config` + `customer-config.yaml` `features:*` component consumed by frontend `useFeatureFlag()`. `HedgingConfig` + `features:requestHedging` is the exact end-to-end precedent for "Interactive features".
- Helm: customer-config mounted from ConfigMap `codemie-customer-config` (`deploy-templates/values.yaml` lines ~521–531) — new flag must be added to prod ConfigMaps.
- New deps (CopilotKit/AG-UI/A2UI), if adopted, are plain Poetry / package.json additions — none present today.
- DB migration required for `interactive_features` JSONB column (note: local Postgres schema is `codemie`, not `public`; branch switches desync alembic).

---

## 6. Risk Indicators

- **Transport mismatch with proposed stack**: chat streaming is proprietary NDJSON (`StreamedGenerationResult` lines over `application/x-ndjson` POST), not SSE and not AG-UI events. Adopting AG-UI/CopilotKit means replacing or bridging this protocol on both sides — high blast radius touching `assistant_handlers.py`, `chains/base.py`, `utils/api.ts`, `chatGeneration.ts`. A protocol-extension approach (new fields on `StreamedGenerationResult` + A2UI-style fixed-schema payloads) fits existing conventions with far less risk.
- **CopilotKit/AG-UI/A2UI are fully greenfield** — zero deps, code refs, or doc mentions in either repo; CopilotKit's own React chat components would conflict with the existing custom chat UI and the mandatory valtio store pattern (`.ai-run/guides/development/api-integration.md`).
- **No agent-chat pause/resume exists** — LangGraph interrupt/checkpoint primitives (langgraph 1.1.6, langgraph-checkpoint ^3.0.1) are installed and used for workflows only (`workflows/workflow.py`, `checkpoint_saver.py`); wiring them into `LangGraphAgent.stream()`/`assistant_handlers.py` and adding an agent-chat resume endpoint is novel work. Workflow resume endpoint + EPMCDME-12393 frontend plumbing are the reuse templates.
- **No test coverage** for interactive elements or agent-chat interrupt/resume anywhere; frontend has no chunk-level stream-parsing tests; end-to-end interrupt-then-resume streams untested on backend.
- **Message persistence gap**: `GeneratedMessage` stores only text + `Thought` tree (`output_format` limited to `text|markdown`) — persisting interactive elements and their post-action state ("submitted", "disabled") requires schema extension in `conversation.py` and history materialization, or element state won't survive reload.
- **Element-state update over a one-directional stream**: scenario 4 (update existing element after user action) needs an id-addressable element model; the thought merge-by-id mechanism (`_handleThought`) is the existing analog but was not designed for user-driven mutations.
- **Catalog integrity requirement**: disabled features must be removed from the agent-exposed catalog (prompt/tool level in `assistant_agent.py` / engine builder), not just hidden in UI — needs server-side enforcement plus validation of agent-emitted payloads against enabled elements.
- **Wide config surface**: the flag/config must be threaded through `customer-config.yaml` + Helm ConfigMap, `AssistantRequest`/`AssistantBase` + alembic migration, `assistant.ts` + `AssistantForm` + `compareFormData.ts`, and mock-server db.json.
- **Naming hazard**: backend `src/codemie/rest_api/a2a/` (Agent2Agent) is unrelated to A2UI.
- **Frontend AGENTS.md is stale** (copied from backend) — rely on frontend `.ai-run/guides/` instead.
- codegraph MCP unavailable in this environment — research done via filesystem exploration (four parallel threads, both repos).

---

## 7. Summary for Complexity Assessment

This is a large, cross-repo, cross-layer feature touching every tier of both applications. Backend: chat router/handlers, the NDJSON stream schema (`chains/base.py`), the LangGraph agent loop and event adapter, system-prompt/tool assembly (catalog exposure), the Assistant SQLModel + alembic migration + `AssistantRequest`, conversation/message persistence, and the customer-config feature-flag pipeline — roughly 10–15 backend files plus a migration. Frontend: the streaming client and `chatGeneration` valtio store, message rendering (`ChatAiMessage` + a new family of interactive-element components: Button, MultipleChoice, TextField, CheckBox, layout Column/Row/Text), `ChatPrompt` gating, the assistant form (new "Interactive features" accordion section + Yup schema + compareFormData), entity types, feature-flag hook, and mock-server data — roughly 15–20 frontend files, many of them new components. Both sides must change in lockstep on two contracts: the stream chunk schema and the assistant config schema.

Technical novelty is high in two areas and low in the rest. Novel: (1) agent-chat pause/resume — LangGraph interrupt/checkpoint primitives exist in the installed versions and are proven for workflows, but have never been wired into the assistant chat path, and no agent-chat resume endpoint exists; (2) the structured interactive-element schema and its id-addressable post-action state updates, which the current text+Thought message model cannot persist. Everything else follows strong existing precedents: `HedgingConfig` + `features:requestHedging` is an exact end-to-end template for the "Interactive features" config block; `ChatAiAuthPrompt` and the EPMCDME-12393 workflow-interrupt chat flow are direct precedents for interactive elements and resume UX. The ticket's proposed CopilotKit + AG-UI + A2UI stack is entirely absent from both repos and structurally conflicts with the proprietary NDJSON protocol and the frontend's mandatory valtio-store architecture — a build-vs-adopt decision with major complexity implications should be made explicitly during planning (extending the existing protocol with A2UI-style fixed-schema payloads is the convention-compatible path).

Test posture is mixed-to-weak in exactly the areas this task touches. Assistant CRUD, chat endpoints, and the assistant form have solid unit/integration coverage on both sides, and workflow pause/resume is tested — but there is zero coverage for interactive elements, agent-chat interrupt/resume, end-to-end stream interrupt scenarios, or chunk-level stream parsing on the frontend. Key risk factors for scoring: dual-repo lockstep protocol changes, DB migration, message-persistence schema extension, server-side catalog enforcement, the greenfield third-party-stack question, and the regression requirement that text-only chat remain untouched.
