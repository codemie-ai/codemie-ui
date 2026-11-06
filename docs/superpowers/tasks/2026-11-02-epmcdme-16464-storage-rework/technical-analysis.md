# Technical Research

**Task**: chat tool-call-confirmation thoughts resume
**Generated**: 2026-11-02
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-16464 (https://jiraeu.epam.com/browse/EPMCDME-16464): rework the nested tool-call confirmation UI in codemie-ui to the reworked backend contract (storage rework, EPMCDME-16463, codemie MR !4668).

Requirements: the updated handoff /Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-16464-ui-handoff.md. Read it in full; it is the task's verbatim requirements. Backend sources of truth, read-only:
- /Users/yanaasadchaya/Projects/epam/codemie/codemie/docs/superpowers/tasks/2026-10-30-EPMCDME-16463-confirmation-storage-rework/spec.md, sections "Contract" and "Decisions";
- in /Users/yanaasadchaya/Projects/epam/codemie/codemie (branch EPMCDME-16463_sub-assistant-tool-confirmation): src/codemie/rest_api/models/assistant.py (ToolCallResumeRequest / ToolCallDecision), src/codemie/rest_api/handlers/tool_call_resume.py (error constants), src/codemie/core/tool_step_states.py.

The current UI implementation on this branch comes from the previous run. Its spec is docs/superpowers/tasks/2026-10-29-epmcdme-16464/spec.md and its plan is docs/superpowers/tasks/2026-10-29-epmcdme-16464/plan.md, in this repo. The handoff's last sections list which parts of that spec are superseded. Map precisely which code on this branch must change: Thought.decision type and usage, resumeToolCall / _sendRequest / _prepareRequestData resume branch, RESUME_ERROR_ACTIONS and the settle sites, thoughtView statuses (Allowed / Denied / Not run / Waiting), the disabled-until-stream-ends rule, the pending_tool_call type, chatHelpers normalisation, and their tests. Also map what can stay.

User decisions already made:
(1) keep CR-006: the WORKFLOW_INTERRUPTED prompt mode and Continue after Stop stay workflow-only;
(2) always send the batch resume form {conversation_id, stream:true, decisions:[{thought_id, action}...]}, also for a single waiting step;
(3) keep the "Waiting" status on ancestors of a waiting step;
(4) drop the rule that keeps Allow/Deny disabled until the pausing stream ends.

---

## 2. Codebase Findings

### Existing Implementations

**P1 — Find the waiting steps of the last answer (tree only).**
- `src/utils/thoughtTree.ts:20` `isPendingStep` = `interrupted === true && !t.decision`; `:42` `findPendingStep` (first depth-first, one only); `:52` `hasPendingStep`; `:54-57` `hasInterrupted`/`isPauseLive` (any `interrupted` at any depth; `isPauseLive` has no consumer in `src/`, tests only). `:22` `isDecidedStep`, `:25` `isAbandonedStep` read `decision` (consumers: tests only). `:27` `findPath`, `:37` `findThought` are decision-free.
- Consumers: `thoughtView.tsx:72` (`findPendingStep`), `ChatPrompt.tsx:152-154` (`hasPendingStep` on last message → `isToolCallPending` blocks the prompt, non-workflow only), `chatGeneration.ts:57,1399` (`canDecide`, `findThought`).
- `src/pages/chat/components/ChatHistory/ChatAiMessage/thoughtView.tsx:35` `collectInterrupted` already collects every `interrupted` step at any depth (no decision filter).
- Nothing reads `tool_call_pending`/`toolCallPending` or `pending_tool_call`: only type declarations (`conversation.ts:357,367`, `types/chatGeneration.ts:37`). Searched `toolCallPending|tool_call_pending|pending_tool_call` in `src/`.

**P2 — Collect a decision per waiting step and send them.**
- `chatGeneration.ts:1389-1426` `resumeToolCall(thoughtId, action)`: finds the step recursively in the last history item, guards with `canDecide`, sets `targetThought.decision = action`, `inProgress = true`, `clearAuthPrompts`, builds a `ChatRequest` with `resume: {action, thoughtId}` and calls `_sendRequest` — one request per click.
- `types/chatGeneration.ts:21` `ToolCallAction` enum (`allow|deny`); `:91` `ChatRequest.resume?: {action; thoughtId}`.
- `chatGeneration.ts:1733-1744` `_prepareRequestData` resume branch: endpoint `v1/assistants/${entityId}/model/tool-call/resume`, body `{conversation_id, action, thought_id, stream: true}`. Target assistant `historyItem.assistantId ?? chat.assistantID` (`:1655`).
- `thoughtView.tsx:43-64` `DecisionButtons` → `resumeToolCall(step.id, ...)`; `:94-96` buttons only on the single `pending` step, `disabled={!canDecide(...)}`.
- No local "decided-but-not-sent" store exists; the only decided marker is `Thought.decision`. No scroll-to-thought utility exists: `Thought.tsx` exposes `ThoughtRef {expand, collapse}` (`:40`), no element id; chat scroll is `useChatScroll.tsx:33` `scrollToBottom`. Searched `scrollIntoView|data-thought-id`.

**P3 — Show step states.**
- `src/components/Thought/ThoughtHeader.tsx:34-45` `getThoughtStatus`: In Progress → `interrupted && decision==='allow'` "Allowed" → `deny` "Denied" → `decision==='abandoned'` "Not run" → `interrupted` "Interrupted" → `aborted` "Aborted" (Warning) → `error` "Failed" → "Success". `:29` `WAITING_THOUGHT_STATUS` (override only). Shared with the workflow drawer (`WorkflowExecutionStateThought.tsx`).
- `thoughtView.tsx:74-106`: every interrupted step's path is force-expanded and stays visible under `hideToolOutputs`; ancestors get "Waiting"; a step with no message and no decision also gets "Waiting" (`:103`), unless `in_progress|error|aborted`.
- `ChatAiMessage.tsx:229-236`: `canShowDecision = !isWorkflow && !isSharedPage && isLastHistoryItem`; `createThoughtView` rebuilt each render.

**P4 — Settle a resume outcome.**
- `chatGeneration.ts:616-659` `RESUME_FALLBACK_ERROR_MESSAGE`, `RESUME_REFETCH_FAILED_MESSAGE`, `RESUME_OLD_PENDING_MESSAGE`, `RESUME_ERROR_ACTIONS` (rows: 404 no-pending→refetch; 409 "not waiting for this decision"→refetch; 409 "still being saved"→restore; 409 "still being applied"→restore; 409 "another assistant"→restore; 409 old-pending→refetch; 409 `help`=old-pending→refetch). Unlisted 4xx → restore, 5xx/no status → refetch (`:671-679`).
- `:661` `ResumeOutcome` (`error|after200|abort|gate`), `:690` `resolveResumeOutcome`, `:706` `resumeStreamArgs` (`errorToast:false`), `:709-716` `toResumeErrorContext`/`ResumeErrorContext {chat, controller, thoughtId}`, `:761` `getResumeStreamOutcome`, `:779` `isAbortOutcome`, `:782-786` `restoreResumeStep` (sets `step.decision = null`, `inProgress=false`).
- Settle sites: `_sendRequest` gate branch `:1696-1708`; `_handleRequestError` resume branch `:1783-1792`; `_handleResumeResponse` `:1914-1922` (restores `savedResponse`, `stream=null`); `_settleResume` `:1428-1440` (awaits `abortRequests[chat.id]` on abort); `_refetchAfterResume` `:1442-1456` (clears inProgress/auth prompts, deletes own controller, `getChat`, on failure toast + `restoreResumeStep`).
- `api.ts:213-275` `buildStreamError` attaches `status`; `stream(..., options: StreamOptions)` `errorToast` default true (other callers unchanged).

**P5 — Merge streamed/reloaded steps.**
- `chatGeneration.ts:2055-2081` `_handleThought`: existing interrupted step's message is replaced, others appended; `:2078` merges `decision`; parent lookup recursive (`:2083-2088`).
- `src/utils/chatHelpers.ts:110-130` `normaliseThought`: `decision: t.decision ?? null` (`:123`); recursive children; `aborted = aborted || in_progress` when the entry is not in progress. `:42` `isInterrupted` = any top-level interrupted thought (all chat types).

**P6 — Buttons enabled only after the pausing stream ends (decision 4 drops it).**
- `thoughtTree.ts:59-60` `canDecide` = `isPendingStep && !message.stream && !message.inProgress`.
- `chatGeneration.ts:1856-1861` `_handleStreamResponse`: `stream=null` on drain throw and on aborted response, comment "Allow/Deny wait for a null stream (AC13)" — applies to every chat, not only resume. Also `:1920` in `_handleResumeResponse`.

### Decisions Already in the Code
- Resume rides `_sendRequest` (controller registration, auth-gate chain, Stop) rather than its own path — `chatGeneration.ts:1648-1731`; reason in old spec "Resume errors / Owner".
- Resume errors bypass the generic chat error path; message text is never written into the paused response (`savedResponse`, `:1668`, `:1919`).
- Matching by status + exact backend message (+ `help` for one row) — `:675-677`. Backend constants now: `NO_PENDING_TOOL_CALL_MESSAGE`, `OTHER_ROOT_ASSISTANT_MESSAGE`, `DECISIONS_MISMATCH_MESSAGE`, `UNSUPPORTED_RESUME_MESSAGE`, `NOT_STREAMED_RESUME_MESSAGE` (`tool_call_resume.py:62-68`). Rows for "not waiting for this decision", "still being saved", "still being applied", old-pending message and `help` have no backend counterpart any more.
- Decided state stored on the server-shaped `Thought` (`decision`) rather than in separate UI state — `conversation.ts:134,311`; alternative (local map) not present.
- Workflow interrupted mode gated on `isWorkflow` (CR-006) — `ChatPrompt.tsx:148-150`; `stopChatGeneration` still calls `interruptChatHistory` for non-workflow chats (`:1209-1211`) which sets `chat.isInterrupted=true`, neutralised by that gate.

### Task Statements Checked Against the Code
- "`pending_tool_call` at `conversation.ts:357` can drop" — holds; no reader in `src/`.
- "Do not read `tool_call_pending`" — holds; only types at `conversation.ts:367`, `types/chatGeneration.ts:37`.
- "Remove `Thought.decision`" — keeps P1/P3/P4/P5 consumers to rework: `conversation.ts:114,134,311`, `thoughtTree.ts:16-25,59`, `ThoughtHeader.tsx:36-40`, `thoughtView.tsx:103`, `chatGeneration.ts:784,1401,2078`, `chatHelpers.ts:123`.
- "Location is only `{parent_thought_id}`; place by `parent_id`" — holds for placement (`_handleThought` uses `parent_id`); `ToolCallLocation {thought_id, parent_id, path}` (`conversation.ts:116`) is referenced only by the two unused pending types.
- Decision (1) keep CR-006 — holds; keeps `ChatPrompt.tsx:150` gate in place (consumers: prompt mode, `ChatControls`, `resumeWorkflowExecution`).
- Decision (2) always batch, also for one step — consistent with backend (`decisions` valid for any pause, `assistant.py:1775-1791`); `{action}` form is what `_prepareRequestData` sends today.
- Decision (3) keep Waiting on ancestors — keeps `thoughtView.tsx:77-81,100-106` in place.
- Decision (4) drop disabled-until-stream-ends — keeps `canDecide` stream check (`thoughtTree.ts:60`) and `stream=null` additions (`chatGeneration.ts:1857-1861`) in place unless removed; the latter affect all chats.
- "Single-assistant confirmation must not regress" — today single-assistant uses the same `resumeToolCall`/`DecisionButtons` path (no separate code).
- "After each click, scroll to the next undecided waiting step" — no existing mechanism (P2).
- Backend step states (Denied/Cancelled/Unavailable = `aborted`, `interrupted=false`, message) render today via `getThoughtStatus` as "Aborted" + message — holds for display; "Not run" label has no backend source any more.

### Consumers of Changed Contracts
- `Thought.decision` / `ThoughtDecision`: listed above + tests (Section 4) + fixture `src/store/__tests__/fixtures/toolCallResume.fixtures.ts:25`.
- `resumeToolCall(thoughtId, action)` signature: `thoughtView.tsx:49,58`, store type `chatGeneration.ts:109`, tests.
- `ChatRequest.resume` / `ResumeErrorContext.thoughtId`: `chatGeneration.ts:706-716,1656,1666,1704,1734-1741,1786,1915`.
- `canDecide`: `thoughtView.tsx:95`, `chatGeneration.ts:1399`.
- `findPendingStep`/`hasPendingStep`: `thoughtView.tsx:72`, `ChatPrompt.tsx:153`.
- `restoreResumeStep`: `chatGeneration.ts:1436,1454`.
- `getThoughtStatus`: shared with workflow drawer through `Thought`/`ThoughtHeader`.

### Architecture and Layers Affected
- Types: `src/types/entity/conversation.ts`, `src/types/chatGeneration.ts`.
- Store: `src/store/chatGeneration.ts` (resume, settle, merge).
- Utils: `src/utils/thoughtTree.ts`, `src/utils/chatHelpers.ts`.
- Components: `thoughtView.tsx`, `ChatAiMessage.tsx`, `ThoughtHeader.tsx`, `ChatPrompt.tsx`.

### Integration Points
- `POST v1/assistants/{id}/model/tool-call/resume` (NDJSON stream); `POST v1/conversations/{id}/abort`; `GET v1/conversations/{id}/stream` (`reconnectChatStream`, `:1243-1286`); `GET v1/conversations/{id}` via `chatsStore.getChat`.

### Patterns and Conventions
- Valtio proxy mutation in place; `ref()` for controllers/promises (`:1219,1664`).
- View overrides through `ThoughtView {forceExpanded, hidden, footer, status}` (`Thought.tsx:25-30`), opt-in so workflow drawer is unaffected.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/development/api-integration.md`, `.ai-run/guides/testing/testing-patterns.md` exist (not read in detail).

### Architectural Decisions
- Previous run: `docs/superpowers/tasks/2026-10-29-epmcdme-16464/spec.md` rules 1-9, "Resume errors", AC1-AC19; `decisions.jsonl` CR-006 (gate WORKFLOW_INTERRUPTED on isWorkflow), feature verification noted test-harness expects Continue after Stop in assistant chats. Superseded per handoff: Definitions, rules 7-8, AC3, AC4, AC18; rule 7's stream-null sub-rule and AC13 by user decision (4).
- Backend spec Decisions: one request with all decisions; client-side sequencing; client sets decided states on send (AR-4); `Thought.decision` and `pending_tool_call` removed.

### Derived Conventions
- Comments cite spec rule/AC ids next to the code they enforce (e.g. `chatGeneration.ts:1857`).

---

## 4. Testing Landscape

### Existing Coverage
- `src/store/__tests__/chatGeneration.resumeToolCall.test.ts` — decision marking, request shape `{action, thoughtId}`, no-op guards (decision at `:113,124,167,178`).
- `src/store/__tests__/chatGeneration.resumeErrors.test.ts` — every settle site, error table rows, Stop mid-resume, AC13 stream-null block (`:493-536`), decision asserts `:232,265,378,438`.
- `src/store/__tests__/chatGeneration.prepareRequestData.test.ts:106-140` — resume body `{conversation_id, action, thought_id, stream}`.
- `src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts:168-250` — nesting, decision merge, S5 one-at-a-time.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.toolConfirmation.test.tsx` — placement, disabled-while-stream (`:139`), Allowed (`:155`), Waiting (`:188,197,247`), Not run (`:206`), hidden outputs, shared/workflow/non-last.
- `src/components/Thought/__tests__/ThoughtHeader.test.tsx:362` — Not run.
- `src/utils/__tests__/thoughtTree.test.ts:59-89` — decided/abandoned classification, canDecide stream rule.
- `src/utils/__tests__/chatHelpers.test.ts:~1001` — decision normalisation.
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx:292-359` — pending blocks send, abandoned nested does not block, interrupted mode workflow-only.
- Fixtures: `src/store/__tests__/fixtures/toolCallResume.fixtures.ts` — S1/S5/S6 trimmed recordings with `decision: null`; `RESUME_ERROR_MESSAGES` holds old 409 texts; S5 `s5AllowFirstChunk` models the old one-at-a-time stream.

### Testing Framework and Patterns
- Vitest + React Testing Library, projects `unit` / `integration` (`vite.config.ts`).

### Coverage Gaps
- No fixture for a batch pause with several waiting steps visible at once, nor for Denied/Cancelled/Unavailable step states or the 409 decisions-mismatch / 422 messages.

---

## 5. Configuration and Environment

### Environment Variables
- None specific; `VITE_API_URL` / `window._env_` base URL (`api.ts:149`).

### Configuration Files
- None for this feature.

### Feature Flags and Deployment Concerns
- No flag; backend and UI deploy together (handoff).

---

## 6. Risk Indicators

- `Thought.decision` spans 4 layers and ~9 test files; removing it touches every P1/P3/P4/P5 site (see Consumers).
- Fixtures encode the old contract (old 409 messages, one-at-a-time S5 chunk, `decision` field); tests built on them assert removed behaviour.
- `stream=null` additions in `_handleStreamResponse` (`chatGeneration.ts:1857-1861`) apply to all chats; tests at `resumeErrors.test.ts:493-536` pin them. Decision (4) leaves their fate open.
- `findPendingStep` returns one step; `DecisionButtons` render on one step only — the batch model shows all waiting steps at once.
- `getThoughtStatus` is shared with the workflow drawer (`Thought` component).
- No scroll-to-step mechanism exists in chat (P2).
- `ToolCallLocation` shape (`conversation.ts:116`) no longer matches the backend `{parent_thought_id}`; only unused types reference it.
- Test-harness (external) expects Continue after Stop in assistant chats; decision (1) keeps CR-006, so that mismatch persists.
- Speculative: the local decided-before-send state and the on-send state update (AR-4) have no existing home; where they live decides how settle/restore (`restoreResumeStep`) undo them on a restore-type error.

---

## 7. Summary for Complexity Assessment

The change is confined to the chat confirmation path of the frontend: two type files, the `chatGeneration` store (resume entry, request builder, error table and five settle sites, thought merge), two utils (`thoughtTree`, `chatHelpers`), and four components (`thoughtView`, `ChatAiMessage`, `ThoughtHeader`, `ChatPrompt`). All of it was written by the previous run on this branch, so the surface is known and already covered by focused tests; no new endpoints, dependencies or config. What can stay as-is: `_sendRequest` as the resume carrier, `api.stream` `StreamOptions`/`status`, the outcome kinds and settle-site wiring, `savedResponse` protection, Stop/abort handling, recursive tree placement, hidden-output path visibility, Waiting on ancestors, `canShowDecision`, and CR-006 gating.

Novelty: the one-request-per-click model with `Thought.decision` is replaced by client-side collection of all waiting steps and one batch send, plus a local state update on send (Allowed/Denied as backend step shapes). There is no existing mechanism for "decided locally but not yet sent" outside `Thought.decision`, and no scroll-to-step utility. The error table shrinks to the new backend constants (404, two 409s, 422s); several existing rows and fixture messages no longer exist on the backend.

Tests: nine test files and one fixture module assert the old contract (decision field, `{action, thought_id}` body, one-at-a-time S5, disabled-while-stream, "Not run", old 409 texts) and need rework rather than only extension. Key risks: breadth of `decision` removal, fixtures modelling the old stream, the all-chats `stream=null` change left over from the dropped rule, and the shared `getThoughtStatus` used by the workflow drawer.

---

## 8. External References

- `/Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-16464-ui-handoff.md` — resolved. Pause = thoughts with `interrupted === true` at any depth in the last entry; `tool_call_pending` never populated; `pending_tool_call` and `Thought.decision` gone. Request: `POST /v1/assistants/{assistant_id}/model/tool-call/resume`, batch `{"conversation_id","stream":true,"decisions":[{"thought_id","action":"allow|deny"}]}` covering every waiting step once; `stream:false` 422; top-level `thought_id` with `decisions` 422. Client: mark click decided locally (no buttons), scroll to next undecided, send once after last click, lock buttons then. On send: Denied → `aborted=true, interrupted=false, in_progress=false, message "Tool call was denied by the user."`; Allowed → `interrupted=false, in_progress=true`, message cleared. Errors: 404 "No pending tool call found for this conversation." → reload, no re-send; 409 "The decisions do not match the tool calls waiting for a decision. Please reload the conversation." → reload, rebuild buttons; 409 "This tool call is waiting for another assistant of the conversation." → resume through the root that paused; 422 "Tool call confirmation is not supported for this assistant." → show error; 422 validation (incl. "A tool call resume is always streamed; stream=false is not supported.") → UI bug; 401/403/404 access → show error. No "still being saved" 409, no lost-race error chunk, no old-format 409. A failed resumed turn is an ordinary turn error (no Allow/Deny again). Stop via `/abort`, reattach via `GET /stream`, disconnect does not stop; a resume can pause again. Unavailable/Cancelled render as aborted step with message, no buttons.
- `.../2026-10-30-EPMCDME-16463-confirmation-storage-rework/spec.md` (Contract, Decisions) — resolved; consistent with the handoff. Error order: 422 → 404 → 409 other root → 409 mismatch; a 4xx changes nothing.
- `.../rest_api/models/assistant.py:1768-1791` — resolved. `ToolCallDecision{thought_id: str, action: Literal["allow","deny"]}`; `ToolCallResumeRequest{conversation_id, decisions?, action?, stream=True, thought_id?}`, `shape_error` rejects both/neither and `thought_id` with `decisions`.
- `.../handlers/tool_call_resume.py:62-68` — resolved; constants quoted above (`NO_PENDING_TOOL_CALL_MESSAGE`, `OTHER_ROOT_ASSISTANT_MESSAGE`, `DECISIONS_MISMATCH_MESSAGE`, `UNSUPPORTED_RESUME_MESSAGE`, `NOT_STREAMED_RESUME_MESSAGE`).
- `.../core/tool_step_states.py:24-53` — resolved. `WAITING_MESSAGE="Tool call is waiting for user approval."` (`interrupted=True, in_progress=False`); `allowed`: `interrupted=False, in_progress=True, message=""`; `_stopped`: `interrupted=False, aborted=True, in_progress=False` with `DENIED_MESSAGE`, `CANCELLED_MESSAGE="Tool call was cancelled without a decision."`, `UNAVAILABLE_MESSAGE="Tool call needs user confirmation, which is not available in this channel. The tool was not run."`.
