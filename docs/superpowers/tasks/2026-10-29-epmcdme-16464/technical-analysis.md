# Technical Research

**Task**: chat tool-call-confirmation thoughts sub-assistant
**Generated**: 2026-10-29
**Research path**: codegraph

---

## 1. Original Context

Implement Jira ticket EPMCDME-16464 (https://jiraeu.epam.com/browse/EPMCDME-16464) in codemie-ui — the UI for nested tool-call confirmation (sub-assistant tool calls that pause an orchestrator run). The full requirements are in the handoff document — read it in full, it is the task's verbatim requirements: /Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-16464-ui-handoff.md
Parent story (context, product-owner, for EPMCDME-16461): /Users/yanaasadchaya/Projects/epam/codemie/codemie-ui/docs/superpowers/tasks/2026-10-29-epmcdme-16464/story.md
Backend sources of truth (read-only, outside this repo, referenced by the handoff): backend spec /Users/yanaasadchaya/Projects/epam/codemie/codemie/docs/superpowers/tasks/2026-10-28-EPMCDME-16463-sub-assistant-tool-confirmation/spec.md (section "Contract (the backend defines it, EPMCDME-16464 consumes it; additive)", rules 9 and 10, AC1–AC28); live request/response fixtures in /Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-16463-live/evidence/ (S1–S8).
Key points: the waiting step is a Thought with interrupted:true and parent_id = its immediate container (delegation step), at any depth, so tree code must find parents recursively; new Thought.decision "allow"|"deny"|null shown as decided with no buttons; stream chunk tool_call_pending and pending_tool_call on GET /v1/conversations/{id} gain an optional location {agent_path, agent_names, parent_thought_id}; the resume POST /v1/assistants/{id}/model/tool-call/resume must always send thought_id; several calls in one pause are shown one at a time; reload restores; there's a table of 404/409 errors to handle; the single-assistant confirmation must not regress. Find the existing tool-call confirmation implementation in the UI (prior task dirs like docs/superpowers/tasks/2026-08-06-chat-tool-call-confirmations, 2026-08-10-chat-tool-call-allow-deny-all, 2026-09-01-epmcdme-13903-chat-tool-call-confirmations show earlier work), the thought tree building and rendering, the chat store/stream handling, the resume API call, and their tests.

---

## 2. Codebase Findings

### Existing Implementations

**Purpose A: show a waiting tool call with Allow / Deny where it happened.**
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:275-304`: iterates `message.thoughts` (top level only). Draws Deny/Allow when `thought.interrupted && !currentChat?.isWorkflow && !isSharedPage` (:283). Hidden tool outputs: a top-level thought is rendered if `!hideToolOutputs || thought.interrupted` (:277). Children are never inspected. Buttons call `chatGenerationStore.resumeToolCall(thought.id, action)`, with no disabled or loading state.
- `src/components/Thought/Thought.tsx:37-93`: the shared recursive renderer. Children render only when `isExpanded || isInProgress` (:59), as `<Thought isEmbedded>` (:69-71), with no badge or action slot. `defaultExpanded` is false. Consumers: ChatAiMessage, `src/pages/workflows/details/states/WorkflowExecutionStateThought.tsx:50`.
- `src/components/Thought/ThoughtHeader.tsx:28-34` `getThoughtStatus`: in progress, then `interrupted` → Pending "Interrupted", then aborted, error, else Success. There is no decided state.
- Distance: a nested waiting step (S1 fixture: a child of the delegation step) renders inside a collapsed parent, with no buttons.

**Purpose B: build the step tree from the stream.**
- `src/store/chatGeneration.ts:1791-1834` `_handleThought`:
  - An existing thought is found recursively through `_findThought` (:1836-1852). Fields are merged one by one (:1797-1816), including `parent_id`. `decision` is not merged.
  - A new thought looks for its parent among **top-level only** (:1818), or uses `parent_id === 'latest'` (:1822).
  - When the parent is not found, it calls `_finishThoughts` on everything (:1830) and pushes the thought to the top level. Result: depth 1 (parent is top level) nests correctly; at depth 2 or more the parent (O2 → S, a child of O → O2) is missed and the waiting step becomes a top-level item.
- `_handleChunk` (:1755-1789) branches on `chunk.a2ui`, `chunk.thought` and `generated_chunk`. `chunk.tool_call_pending` is never read.
- `src/types/entity/conversation.ts:348-355` `StreamChunk` has no `tool_call_pending`. `src/types/chatGeneration.ts:26-37` has a second, camelCase `StreamChunk`, also without it.

**Purpose C: resume a decision.**
- `chatGeneration.ts:1180-1218` `resumeToolCall(thoughtId, action)`:
  - It looks at the last history item's **top-level** thoughts for `id === thoughtId && interrupted` (:1189).
  - It sets `interrupted=false` and `in_progress=true` optimistically before the request (:1192-1193), and `inProgress=true` on the message.
  - It builds a full `ChatRequest` with `toolCallAction`.
- `_prepareRequestData` (:1497-1507): when `toolCallAction` is set, the request goes to `v1/assistants/${entityId}/model/tool-call/resume` with `{conversation_id, action, stream: true}`. No `thought_id` is sent. `entityId` = `historyItem.assistantId ?? chat.assistantID` (:1417).
- Stream end (:1631-1635): `_finishThoughts` → `markThoughtDone` (:256-259) recursively sets `in_progress=false`.

**Purpose D: restore the pause after a reload.**
- `src/utils/chatHelpers.ts:31-70` `transformChatBEtoFE`:
  - `isInterrupted` = any **top-level** thought interrupted (:40).
  - `pending_tool_call` is not read. A codegraph search for `pending_tool_call` / `tool_call_pending` found no symbol in `src/`.
- `chatHelpers.ts:171-190`: top-level thoughts are re-mapped field by field, which **drops `parent_id` and `decision`**. `children` are passed raw (:179), so nested backend fields, including `parent_id` and `decision`, survive unnormalised.
- `ThoughtBackend` (`conversation.ts:290-305`) declares neither `parent_id` nor `decision`. `Thought` (`:114-131`) has `parent_id` but no `decision`.

**Purpose E: block the prompt while a call waits.**
- `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:149-155`: `isToolCallPending` is true when any **top-level** thought of the last message is interrupted. It disables the editor and hides Send (:384).
- `isInterrupted` (:147), from `chatHelpers.ts:40`, switches the prompt to `WORKFLOW_INTERRUPTED` mode (:169) and renders `ChatControls` (:276) for any chat, workflow or not.

**Other touched code**
- `src/utils/api.ts:206-255` `stream`: on `!response.ok` it shows the toast "Failed to generate answer" (unless the error is an auth gate payload) and **throws the parsed JSON body only**, so the HTTP status is lost (:229-247).
- `chatGeneration.ts:1546-1561` `_handleRequestError` writes `_handleGenerationStreamError` text (`${DEFAULT_ERROR_MESSAGE} \n ${message}: ${details} \n ${help}`, :1854-1863) into `historyItem.response` and finalises the message.
- `chatGeneration.ts:1133-1145` `resumeWorkflowExecution` clears top-level `interrupted` only. `:1272` does the same for top-level `truncated`.

### Decisions Already in the Code
- The confirmation is identified by thought id, not by the pending event. The UI never consumed `pending_tool_call` / `tool_call_pending`; the interrupted thought is the only signal (ChatAiMessage:283, ChatPrompt:154). Alternative: an event-driven UI state. Reason: none found.
- The resume reuses the generation pipeline: `_sendRequest` → `_prepareRequestData` branch → the same stream handler as chat. Errors therefore follow the chat error path: a toast plus an error text in the message.
- Optimistic clearing of `interrupted` before the request (:1192). Alternative: clear on response. Reason: none found.
- The tree is stored nested (`children`). Stream parent lookup is flat (:1818), while the update lookup is recursive (:1836).
- Data direction: the GET pending event carries `pending_tool_call_id` = the LLM call id (`call_WfncHc8KyMWKRk4s2tbJ7myb`), **not** the waiting thought's UUID (S5 `07-get-conversation-paused.json`). It points to the step only through `location.parent_thought_id` (nested) or not at all (root, `location: null`). The thought tree is the store that holds the `id` that `thought_id` needs.
- Conventions: Valtio store methods carry the side effects (`.ai-run/guides/patterns/state-management.md`). Every backend call goes through `src/utils/api.ts`. Tests live in co-located `__tests__/`, with `*.test.ts(x)` for unit and `*.integration.test.tsx` for integration.

### Task Statements Checked Against the Code
- "tree code must find parents recursively": **contradicted** for the stream (`_handleThought` :1818 is top-level only) and for rendering (`ChatAiMessage` :275 is top-level only). Updates are recursive (:1836).
- "Thought.decision … shown as decided": **contradicted**. There is no `decision` on `Thought`/`ThoughtBackend`; `_handleThought` and `transformHistoryGroup` drop it at the top level.
- "stream chunk tool_call_pending … gains location": the UI does not read the chunk field (keeps the thought-only mechanism of Purpose B in place). It is **unverified** as an emitted value: in the S1 `04-chat.json` and S5 `10-allow-first.json` fixtures every chunk has `"tool_call_pending": null`, and the waiting step arrives as a `thought` chunk with `interrupted: true` and `last: true` in the same chunk.
- "resume must always send thought_id": **contradicted**. `_prepareRequestData` :1501-1505 sends no `thought_id`.
- "reload restores": holds for a top-level step (single assistant). For nested steps, `isInterrupted` (chatHelpers:40) and `isToolCallPending` (ChatPrompt:154) see only the top level, so the prompt is not blocked. The buttons are not drawn (Purpose A).
- "a table of 404/409 errors to handle": no status-specific handling exists. `api.stream` drops the status (api.ts:246), so only `error.message` distinguishes the rows.
- "single-assistant confirmation must not regress": its current path is Purposes A–E at the top level. Tests in Section 4.
- "Several calls … one at a time": nothing exists for it. A non-final decision response (S5 `10-allow-first.json`) streams one chunk: the next waiting step under the S2 container, with `last: true`, and nothing about the decided step. After that, `resumeToolCall` has left the decided step at `interrupted=false`, and `_finishThoughts` turns it into "Success" (ThoughtHeader:33).
- Prior task "Allow All / Deny All" (2026-08-10 spec): the policy control evolved into `ChatPromptToolCallPolicy` / `ToolCallPolicyDropdown`. No bulk resume exists.

### Consumers of Changed Contracts
- `Thought` type (`conversation.ts:114`): `_handleThought`, `_findThought`, `markThoughtDone`, `dropInProgressThoughts` (:261, top-level filter), `Thought.tsx`, `ThoughtHeader.getThoughtStatus`, `WorkflowExecutionStateThought.transformThought` (:27-39, recursive copy), `ChatAiMessage`, `ChatPrompt:154`, `chatHelpers.transformHistoryGroup`.
- `ThoughtBackend` / `ChatBackend` (`conversation.ts:290`, `:328`): `transformChatBEtoFE`, `transformWorkflowExecutionHistoryBEtoFE` (chatHelpers:82). Tests: `chatHelpers.test.ts`, `ThoughtHeader.test.tsx`.
- `resumeToolCall` signature (store type :106): `ChatAiMessage.tsx:289,299`, `chatGeneration.resumeToolCall.test.ts`.
- `_prepareRequestData` tool-call branch: `_sendRequest` (:1419), `chatGeneration.prepareRequestData.test.ts`.
- `Thought.tsx` children rendering: chat and the workflow state drawer (`WorkflowStateCallHistory` → `WorkflowExecutionStateThought`). Any change applies to both.
- `chat.isInterrupted`: `ChatPrompt` (:147,169,185,276) and `resumeWorkflowExecution` (:1137). It is shared between workflow-interrupt and tool-call semantics.

### Architecture and Layers Affected
- Types: `src/types/entity/conversation.ts`, `src/types/chatGeneration.ts`.
- Store: `src/store/chatGeneration.ts` (stream, thought tree, resume, request data, errors).
- Transform: `src/utils/chatHelpers.ts`.
- UI: `ChatAiMessage.tsx`, `ChatPrompt.tsx`, `src/components/Thought/{Thought,ThoughtHeader}.tsx` (shared).

### Integration Points
- `POST v1/assistants/{id}/model/tool-call/resume` (ndjson stream), `GET v1/conversations/{id}` (via `chatsStore.getChat`), `api.stream` error semantics.
- Backend MR !4668 (codemie branch `EPMCDME-16463_sub-assistant-tool-confirmation`), deployed together with this change and no flag.

### Patterns and Conventions
- Valtio `proxy` store with a mutable history. Components read through `useSnapshot`.
- `Button` with `ButtonType`/`ButtonSize`, `toaster` for errors, `cn` for classes.
- The store unit tests mock `valtio`, `@/utils/api`, `@/store/chats` and then dynamically import the store (resumeToolCall.test.ts:23-41).

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/state-management.md` (stores), `development/api-integration.md` and `development/error-handling-patterns.md` (errors), `testing/testing-patterns.md` (Vitest + RTL, `unit`/`integration` projects; the `unit` setup mocks `useSnapshot` and `@/utils/api`), `testing/local-verification.md` (harness and screenshots for the MR), `components/component-patterns.md`.

### Architectural Decisions
- Prior specs: `docs/superpowers/tasks/2026-08-06-chat-tool-call-confirmations/spec.md` (per-call buttons on `thought.interrupted`), `2026-08-10-chat-tool-call-allow-deny-all/spec.md`, and `2026-09-01-epmcdme-13903-…` (code-review JSON only).

### Derived Conventions
- Confirmation UI lives in the chat page, not in the shared `Thought` component. Shared-page and workflow chats never show buttons (ChatAiMessage:283).

---

## 4. Testing Landscape

### Existing Coverage
- `src/store/__tests__/chatGeneration.resumeToolCall.test.ts`: 5 tests, top-level thought only. It asserts `interrupted` is cleared, `inProgress=true`, the `_sendRequest` payload `toolCallAction`/`conversationId`, and early returns.
- `src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts`: 4 `_handleChunk` tests for top-level `interrupted`/`aborted`.
- `src/store/__tests__/chatGeneration.prepareRequestData.test.ts`: covers the request branches, including the tool-call branch (references `ToolCallAction`).
- `ChatAiMessage/__tests__/ChatAiMessage.test.tsx` (tool-output visibility helpers `createMockThought`), `components/Thought/__tests__/{Thought,ThoughtHeader,ThoughtMessage}.test.tsx`, `utils/__tests__/chatHelpers.test.ts`, `workflows/details/states/__tests__/WorkflowExecutionStateThought.test.tsx`.

### Testing Framework and Patterns
- Vitest + React Testing Library. The store tests use `vi.mock` of modules and `vi.spyOn(chatGenerationStore, '_sendRequest')`. The backend fixtures (S1–S8 JSON) can be used for fixtures.

### Coverage Gaps
- No test covers nested thoughts in `_handleThought`, depth-2 parent lookup, `decision`, `thought_id`, resume error handling, `ChatPrompt` blocking (no tests for `ChatPrompt`: "no tests found within 3 caller hops"), or `getThoughtStatus` (no tests found within 3 hops per codegraph, although `ThoughtHeader.test.tsx` exists).

---

## 5. Configuration and Environment

### Environment Variables
- None specific. `VITE_API_URL` / `window._env_` base URL only (api.ts:142).

### Configuration Files
- None for this domain.

### Feature Flags and Deployment Concerns
- No flag, by contract. The UI and backend deploy together (handoff, spec "Release constraints").

---

## 6. Risk Indicators

- Top-level-only assumptions in five places: `_handleThought:1818`, `resumeToolCall:1189`, `ChatAiMessage:275-283`, `ChatPrompt:154`, `chatHelpers:40`. Any one left behind breaks nesting, resume, prompt blocking or reload (see Existing Implementations).
- `_handleThought:1830` calls `_finishThoughts` on every thought whenever a parent is not found. An orphan or a depth-2 waiting step marks still-running siblings as done.
- `Thought.tsx:59` hides children of a collapsed step. The story requires the waiting step to be "shown open". `Thought` is shared with the workflow drawer.
- Hidden tool outputs (ChatAiMessage:277) keep only top-level interrupted thoughts, so a nested waiting step under a hidden delegation step is not shown (story AC "Hidden tool outputs").
- The optimistic `interrupted=false` / `in_progress=true` in `resumeToolCall:1192-1193`, combined with a non-final decision stream that never updates the decided step (S5 fixture), shows the decided step as "Success". On an error response the buttons are already gone.
- `api.stream:246` loses the HTTP status and always toasts "Failed to generate answer". The 404/409 rows are distinguishable by `error.message` only. `_handleRequestError` writes the error text into the paused message's `response`.
- The pending event cannot be matched to a thought by id (`pending_tool_call_id` is the LLM call id). The root event has `location: null`.
- `chatHelpers.ts:171-190` drops `parent_id`/`decision` at the top level but passes `children` raw. Top-level and nested thoughts end up with different shapes.
- `chat.isInterrupted` drives workflow-interrupt UI (`ChatControls`, "Continue") for non-workflow chats too (ChatPrompt:169,276). Widening it to nested pauses widens that behaviour.
- `tool_call_pending` was `null` in every captured stream chunk (S1, S5). Its emitted shape is unverified against the live backend.
- No buttons have a loading or disabled state, so double clicks are possible (AC24: concurrent Allows → 409).
- Speculative: the error rows "retry in a moment" imply timed retry logic that does not exist anywhere in the chat store.

---

## 7. Summary for Complexity Assessment

The change touches four layers: types (`conversation.ts`, `chatGeneration.ts`), the chat store (`chatGeneration.ts`: `_handleThought`, `resumeToolCall`, `_prepareRequestData`, the error path), the BE→FE transform (`chatHelpers.ts`), and UI (`ChatAiMessage.tsx`, `ChatPrompt.tsx`, and the shared `Thought.tsx`/`ThoughtHeader.tsx`, which the workflow drawer also uses). The confirmation mechanism exists and works at the top level. The task stays within it, but five independent places assume top-level-only thoughts, and the shared `Thought` renderer collapses children.

Novelty is moderate. Recursive tree lookup already exists (`_findThought`); a "decided" step state, sequenced one-at-a-time decisions within one paused message, and status-aware resume errors do not. The stream error path drops HTTP status, so the error table must be keyed by message text. The fixtures show that a non-final decision returns only the next waiting step, and that the pending event's id is not a thought id.

Coverage exists for the top-level store behaviour (resume, interrupted chunk, request data) and the Thought components. Nothing covers nested trees, `decision`, `thought_id`, resume errors or `ChatPrompt` blocking. Key risks: missing one of the top-level assumptions, the `_finishThoughts` side effect on orphans, the shared `Thought` component's collapse behaviour, and regressing the single-assistant path, whose request body and tests will change.

---

## 8. External References

- `/Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-16464-ui-handoff.md`: resolved.
  - Waiting step: `interrupted: true`, `parent_id` = immediate container (root: its own tool-call step; O→S: the step O→S; O→O2→S: the step O2→S; O2's own call: the step O→O2). An orphan stays at the top level with its `parent_id`.
  - `decision: "allow"|"deny"|null`. Decided-not-applied: keeps `interrupted: true`, has no result; show it decided, with no buttons. After the resume, the same `id`, `interrupted` cleared, and the result arrives.
  - Event `ToolCallPendingEvent{pending_tool_call_id, tool_name, tool_args, display_name?, history_index?, original_user_message, all_tool_call_ids, location?: {agent_path[], agent_names[], parent_thought_id}}`; `location` is null at the root.
  - Resume body: `{"conversation_id","action":"allow"|"deny","thought_id","stream":true}`. Without `thought_id` it is accepted only for a one-call pause, otherwise 409.
  - Errors:
    - 404 "No pending tool call found for this conversation." → reload.
    - 409 "The tool call is not waiting for this decision. Please reload the conversation." → reload.
    - 409 "The paused turn is still being saved. Please retry in a moment." → retry after a delay.
    - 409 "A tool call decision is still being applied. Please retry in a moment." → retry or wait.
    - 409 "This tool call is waiting for another assistant of the conversation." → resume through the root assistant.
    - 409 "This tool call can no longer be resumed. Please send your request again." → ask the user to resend.
    - 401/403 → access.
  - Done-when: depth 1 and 2, parallel/batch one at a time, reload mid-sequence, each error row, single-assistant behaviour unchanged.
- `…/codemie/docs/superpowers/tasks/2026-10-28-EPMCDME-16463-sub-assistant-tool-confirmation/spec.md`: resolved.
  - Rule 9: a non-final decision runs nothing, writes `decision` on the decided step and adds the next waiting step under its container in the saved thoughts, then streams that step. The final decision claims the pause and resumes.
  - Rule 10: the container is the latest handoff step; one recursive find; an applied decision clears `interrupted`; an orphan is kept at the top level.
  - AC14: with hidden tool outputs, the nested waiting step keeps its `parent_id` and its ancestors.
  - AC11: a single call keeps today's event, step and `location: null`.
  - AC24: of two concurrent Allows, one gets 409.
- `…/codemie/local/EPMCDME-16463-live/evidence/`: resolved (S1–S8; S6 depth-2 run under the `242575-` prefix; `b317c7-s6-crash`).
  - S1 `04-chat.json`: the delegation step has `parent_id: null`, `author_name` = the sub-assistant name, `author_type: "Tool"`, `metadata.tool_name: "transfer_to_…"`. The waiting step has `parent_id` = the delegation id, message "Tool call is waiting for user approval.", `interrupted: true`, `decision: null`, and `last: true` in the same chunk. `tool_call_pending: null` in all chunks.
  - S5 `07-get-conversation-paused.json`: the thoughts are pre-nested in `children`, each with `parent_id`. The second sibling's not-yet-shown call is a non-interrupted child with an empty message. `pending_tool_call.pending_tool_call_id` = `call_WfncHc8KyMWKRk4s2tbJ7myb` (LLM id); `location.parent_thought_id` = `e7fee3a4-…` (the S1 delegation step).
  - S5 `10-allow-first.json`: the response to a non-final decision is a single chunk holding the next waiting step under the S2 container, with `last: true`.
  - S5 `12-tree-after-first.json`: the decided step shows `interrupted` + `decision=allow`.
  - S8 `04-resume-wrong-thought-id.json`: 409, `{"error":{"message":"The tool call is not waiting for this decision. Please reload the conversation.","details":null,"help":null}}`.
- `docs/superpowers/tasks/2026-10-29-epmcdme-16464/story.md`: resolved. AC "Reload": the waiting step is shown **open** with working Allow/Deny, and the prompt stays blocked. AC "Hidden tool outputs": the waiting step stays visible.

## Facts Added by Review

Researched for the names the spec relies on, after the analysis above was written. Read like the facts layer; where a line here contradicts one above, this one was read later.

- Backend history items use the camelCase key `assistantId`: `HistoryItemBackend.assistantId?` (`src/types/entity/conversation.ts:313`). In the fixture S6 `08-get-conversation-paused.json` it is at `:60`, with the value `e6f7ee5e-…`.
- The snake-case `assistant_id` exists only on `AssistantDataBackend` (`conversation.ts:280`). Fixture `:171` is `assistant_data[0].assistant_id`, with the same value.
- `transformHistoryGroup` (`src/utils/chatHelpers.ts:134-215`) maps it to `ChatMessage.assistantId` (`:192`). It also uses it to look up the matching `assistant_data` entry by `assistant_id` (`:160-161`) and fills `assistant.id` (`:195`).
- For live turns, `_createHistoryItem` sets `assistantId` from `createChatGeneration` options (`chatGeneration.ts:761`).
- `transformChatHistoryFEtoBE` for group chats (`chatHelpers.ts:253`).
- `Conversation.assistantID?` is declared in `conversation.ts:230`. `transformChatBEtoFE` (`chatHelpers.ts:31-70`) does not set it. A codegraph search found no code that writes to it.
- In-repo callers include `editChatGeneration` `chatGeneration.ts:976`, `deleteChatMessage` `:981` and `_handleNonStreamResponse` `:1599` (workflow chats). Page-level callers were not enumerated.
- The paused GET (S6 `08…json:154-155`) has `inProgress: false` and `status: "success"`. `transformHistoryGroup` reads `in_progress ?? inProgress` (`chatHelpers.ts:164`), which gives `false`, so refetching a paused chat does not reconnect.
- `pollIncompleteChat` → `syncPolledChatHistory` (`chats.ts:281-291`) writes `history` and `isInterrupted` directly;
- "`setOpenChat` keeps the local copy while a message is in progress, `chats.ts:533-540`": **holds**. It also keeps the local copy while an auth-gate prompt is pending (`:527-531`).
- "In S6 the history item's `assistant_id` equals `root_assistant_id` (`08…json:171`, `10-db-pending-record.json:92`)": the value matches, but `:171` is `assistant_data[0].assistant_id`. The history item's own key is `assistantId`, at `:60`. `10-db-pending-record.json` was not opened, so that half is **unverified**.
- `ChatMessage.assistantId`: `_sendRequest:1417`, `resumeWorkflowExecution:1152,1165`, `submitA2uiAction:1102-1104`, `chatHelpers.ts:253`.
