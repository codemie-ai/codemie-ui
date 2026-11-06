# EPMCDME-16464 Storage-Rework Confirmation UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move nested tool-call confirmation from "one request per click, `Thought.decision`" to the batch contract: a local choice per waiting step, one `decisions[]` resume on the last click, Allowed/Denied step states applied on send, resume path ending at the 200 headers.

**Architecture:** `collectWaitingSteps` is the single source of waiting steps (buttons, scroll order, last-click check, body, on-send update, prompt, "Waiting"). Choices live in `chatGenerationStore.toolCallChoices` (reactive map, step id → action). `decideToolCall` records a choice and calls `_sendToolCallDecisions` when none is undecided; that builds the body and an undo snapshot from the collector, clears the choices, applies the on-send states, marks the entry in progress and goes through `_sendRequest`. Settle sites receive the undo instead of a thought id; after the headers the stream is an ordinary turn.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL (`unit` project, co-located `__tests__/`).

Spec: `spec.md` here (rules 1–9, AC1–AC15); it governs where `technical-analysis.md` differs. Commit per task using the repository's existing convention. Per-task tests only; the calling flow runs gates, browser checks and review. Lines refer to HEAD `cf3b591fe`.

---

### Task 1: Contract types, decision-state map, fixture additions

**Files:** Modify `src/types/entity/conversation.ts:116-120,357,367`, `src/types/chatGeneration.ts:17,21-24,37`, `src/store/__tests__/fixtures/toolCallResume.fixtures.ts`.

Test-first: no — types and fixtures, exercised by Tasks 2–6.

- [ ] `conversation.ts`: delete `ToolCallLocation`, `ChatBackend.pending_tool_call`, `StreamChunk.tool_call_pending` (no readers). `decision` stays until Task 6.
- [ ] `types/chatGeneration.ts`: drop the `ToolCallLocation` import and `StreamChunk.toolCallPending`; add next to `ToolCallAction` (rule 6, cite `codemie/src/codemie/core/tool_step_states.py:24-53`):

```ts
export interface ToolCallDecision { thought_id: string; action: ToolCallAction }
/** Prior step fields captured at send; Restore writes them back (rule 9). */
export interface ToolCallStepSnapshot {
  thought_id: string; aborted: boolean; interrupted: boolean; in_progress: boolean; message: string
}
export const TOOL_CALL_DENIED_MESSAGE = 'Tool call was denied by the user.'
export const TOOL_CALL_DECISION_STATES: Record<ToolCallAction, Pick<Thought, 'aborted' | 'interrupted' | 'in_progress' | 'message'>> = {
  [ToolCallAction.ALLOW]: { aborted: false, interrupted: false, in_progress: true, message: '' },
  [ToolCallAction.DENY]: { aborted: true, interrupted: false, in_progress: false, message: TOOL_CALL_DENIED_MESSAGE },
}
```

- [ ] Fixtures, additions only (old exports go with their last consumer in Tasks 4 and 6): `s5BatchPausedConversation` — S5 tree with `s5FirstPendingId` and `s5SecondStepId` both `interrupted: true` with the waiting message (AC11); `s5ResumeChunks` — allowed step `in_progress: true`, then its output, then `last: true`; `cancelledPausedConversation` — both S5 steps `aborted: true, interrupted: false, message: 'Tool call was cancelled without a decision.'` (AC6); `unavailableStep` — `aborted: true, interrupted: false` with the Unavailable message (AC9); `pausedHistoryItemBackend` — `HistoryItemBackend` with `in_progress: false` and the batch thoughts (AC15); `RESUME_ERRORS` — `{ status, message }` for `NO_PENDING` 404, `DECISIONS_MISMATCH` 409, `OTHER_ROOT_ASSISTANT` 409, `UNSUPPORTED` 422, `NOT_STREAMED` 422, verbatim from `tool_call_resume.py:62-68`.

### Task 2: Waiting-step collector in `thoughtTree`

**Files:** Modify `src/utils/thoughtTree.ts`, `src/utils/__tests__/thoughtTree.test.ts:59-89`; one-line caller edits `thoughtView.tsx:95`, `chatGeneration.ts:1399`.

Test-first: yes — `collectWaitingSteps` returns the depth-2 step of `s6PausedConversation` and both batch steps in depth-first order; `nextUndecidedStep(waiting, { [first]: 'allow' }, secondId)` wraps to the first undecided and returns `null` when nothing else is undecided; `canDecide(message)` is false with `stream` set or `inProgress`, true otherwise.

- [ ] Add `collectWaitingSteps(thoughts?: Thought[]): Thought[]` (every `interrupted === true`, any depth, depth-first) and `nextUndecidedStep(waiting: Thought[], choices: Record<string, ToolCallAction>, afterId: string): Thought | null` (first step after `afterId`, wrapping, not in `choices`, `id !== afterId`). `canDecide` becomes `(message: ChatMessage) => !message.stream && !message.inProgress` (rule 4); the two callers pass only the message and keep their `isPendingStep` check until Tasks 3 and 5 replace it. Old predicates remain exported until Task 6.
- [ ] Replace the decided/abandoned/canDecide cases of the test file with the three behaviours above.

### Task 3: Store — choice map, `decideToolCall`, batch send, undo-based Restore

**Files:** Modify `src/store/chatGeneration.ts:109-122,706-716,782-786,1389-1456,1696-1708,1733-1744,1783-1792,1914-1922`, `src/types/chatGeneration.ts:91`; rename `src/store/__tests__/chatGeneration.resumeToolCall.test.ts` → `chatGeneration.decideToolCall.test.ts`; modify `chatGeneration.prepareRequestData.test.ts:106-140`, `chatGeneration.resumeErrors.test.ts:232,265,378,438`.

Test-first: yes — `decideToolCall.test.ts` on `s5BatchPausedConversation`: first click stores `toolCallChoices[id]`, `api.stream` not called (AC2); second click calls it once with `{ conversation_id, stream: true, decisions: [...] }` covering both steps in collector order (AC3); a single S1 step also sends `decisions`; after send the denied step has `aborted: true, interrupted: false, in_progress: false, message: TOOL_CALL_DENIED_MESSAGE`, the allowed step `interrupted: false, in_progress: true, message: ''`, the entry `inProgress: true`, `toolCallChoices` empty (AC4, AC13); a repeated click sends nothing (AC13); clicks are no-ops with `stream`/`inProgress` set or a non-waiting id; `_settleResume` receives an `undo` with every step's prior fields; after `restoreResumeSteps` a new round of clicks sends again (AC14). `prepareRequestData.test.ts`: the body above and nothing else.

- [ ] `ChatRequest.resume` becomes `{ decisions: ToolCallDecision[]; undo: ToolCallStepSnapshot[] }`; `_prepareRequestData` resume branch sends `{ conversation_id, stream: true, decisions }`.
- [ ] Store state `toolCallChoices: Record<string, ToolCallAction>` (`{}`); add it, `decideToolCall(thoughtId, action)` and `_sendToolCallDecisions(chat, historyIndex, messageIndex)` to `ChatGenerationStoreType`; remove `resumeToolCall`.
- [ ] `decideToolCall`: resolve the last entry of `chatsStore.currentChat` as `resumeToolCall` did; `waiting = collectWaitingSteps(entry.thoughts)`; return unless the id is in `waiting`, unchosen, and `canDecide(entry)`; record the choice; when every waiting step is chosen, `return _sendToolCallDecisions(chat, …)` (two methods so Allow-all or a Send button add a caller later).
- [ ] `_sendToolCallDecisions`, synchronously in this order (rule 4): `waiting = collectWaitingSteps`; `decisions` and `undo` from it; delete those ids from `toolCallChoices`; `Object.assign(step, TOOL_CALL_DECISION_STATES[action])`; `entry.inProgress = true`; `clearAuthPrompts(entry)`; then the `ChatRequest` as before with `resume: { decisions, undo }` into `_sendRequest`. No deferred send, no sent flag.
- [ ] `ResumeErrorContext` → `{ chat, controller, undo }`; `toResumeErrorContext` passes `resume.undo`. `restoreResumeStep` → `restoreResumeSteps(historyItem, undo)`: per snapshot `findThought` and write back the four fields; `historyItem.inProgress = false`; `chatGenerationStore.toolCallChoices = {}`. `_settleResume`/`_refetchAfterResume` take `undo` in place of `thoughtId` (type `:110-122`, four call sites). The `savedResponse` restore at the gate branch (`:1699`) stays; no other pre-header row writes the response.
- [ ] The four `decision` assertions in `resumeErrors.test.ts` become assertions on the restored fields (`interrupted: true`, `aborted: false`, waiting message) and empty `toolCallChoices`; the rest of that file is Task 4.

### Task 4: Resume path ends at the headers; error table; pending-Stop wait; stream writer; merge

**Files:** Modify `src/store/chatGeneration.ts:616-703,760-780,1670-1731,1848-1861,1914-1922,2078`; `src/store/__tests__/chatGeneration.resumeErrors.test.ts`, `chatGeneration.toolCallConfirmation.test.ts:168-250`, fixtures (remove old exports).

Test-first: yes — `resumeErrors.test.ts`, rows from `RESUME_ERRORS`: 404 and 409 mismatch → backend toast + `getChat`, no second `api.stream` (AC6); 409 other-root, 422 ×2, 401, unlisted 4xx → toast with the backend message + restore from undo (AC7); 500 / no status → fallback toast + refetch; failed refetch → `RESUME_REFETCH_FAILED_MESSAGE` + restore. Stop: with `abortRequests[chat.id]` pending and the controller aborted during the wait, `api.stream` is never called, no toast, `getChat` runs after the abort promise settles (AC6, AC13). Gate → gate UI, `response` kept, restore (AC14). After a 200: a throwing stream leaves `response` and `getChat` untouched and restores nothing (AC8); a `last: true` stream finishes normally; `_handleStreamResponse` still nulls `stream` on a Stop with no text (rule 4) and no longer on a drain throw. `toolCallConfirmation.test.ts`: `_handleThought` ignores a `decision` field; two waiting steps in one batch are placed under their parents; `s5ResumeChunks` fill the allowed step and clear `in_progress` on the terminal chunk (AC5).

- [ ] Error table (rule 9): `RESUME_ERROR_ACTIONS` keeps 404 no-pending → refetch, 409 mismatch → refetch, 409 other-root → restore, texts from `tool_call_resume.py:62-68`; delete `help`, `RESUME_OLD_PENDING_MESSAGE` and the other four rows; `matchResumeErrorAction` matches on message only. Unlisted 4xx → restore, 5xx/no status → refetch, unchanged. Refresh the comment at `:616-618`.
- [ ] `ResumeOutcome` → `{ kind: 'error'; error } | { kind: 'gate' }`; delete `after200`, `abort`, `getResumeStreamOutcome`, `_handleResumeResponse` (and its type entry) and the `if (resumeCtx)` branch at `:1715-1724`, so a resume response falls through to the ordinary handlers. `isAbortOutcome` reduces to the `ABORT_ERROR` name check; `resolveResumeOutcome` loses the removed kinds.
- [ ] Pending-Stop wait (rule 4, AC13): inside the `try` at `:1680`, before `api.stream`, when `resume` is set `await chatGenerationStore.abortRequests[chat.id]?.catch(() => undefined)`; if `abortController.signal.aborted` afterwards, throw an error whose `name` is `ABORT_ERROR` so the catch takes the Stop row. The controller is registered at `:1670` already.
- [ ] `_handleStreamResponse:1850-1860`: revert the try/catch to main (plain `await`); keep `:1861`, its comment now citing spec rule 4 instead of AC13.
- [ ] `_handleThought:2078`: delete the `decision` merge.
- [ ] Tests: rework `resumeErrors.test.ts` to the list above (drop the `after200` cases `:384-419`, make "Stop mid-resume" `:441` an ordinary Stop with no refetch, drop the "drain throw" case). Rework `toolCallConfirmation.test.ts:209-250` as listed. Remove `s5AllowFirstChunk`, `RESUME_ERROR_MESSAGES`, `RESUME_ERROR_STATUS`, `S8_WRONG_THOUGHT_ID_*` from the fixtures.

### Task 5: Components — buttons on every undecided step, local Allowed/Denied, scroll, status, prompt

**Files:** Modify `src/components/Thought/Thought.tsx:61`, `src/components/Thought/ThoughtHeader.tsx:36-40`, `src/pages/chat/components/ChatHistory/ChatAiMessage/thoughtView.tsx`, `ChatAiMessage.tsx:229-236`, `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:152-153`; tests `ChatAiMessage/__tests__/ChatAiMessage.toolConfirmation.test.tsx`, `src/components/Thought/__tests__/ThoughtHeader.test.tsx:362`, `ChatPrompt/__tests__/ChatPrompt.test.tsx:292-359`.

Test-first: yes — `ChatAiMessage.toolConfirmation.test.tsx` on the batch fixture: two Allow/Deny pairs at once, active with `stream: null, inProgress: false` (AC1), disabled with `stream` set or `inProgress: true` (AC12); with `toolCallChoices = { [first]: 'allow' }` the first step shows "Allowed" without buttons, the second keeps its buttons (AC2); Deny calls `decideToolCall(id, 'deny')` and `scrollIntoView` on the `[data-thought-id]` element of the next undecided step, wrapping, none when nothing is left; denied-shape and `unavailableStep` render "Aborted" with their message and no buttons (AC4, AC9); "Waiting" stays on ancestors and message-less suspended steps; shared page, workflow and non-last keep no buttons; "Not run" nowhere (AC10). `ThoughtHeader.test.tsx`: aborted steps with the Denied/Cancelled/Unavailable message render "Aborted"; no Allowed/Denied/Not run from `getThoughtStatus`. `ChatPrompt.test.tsx`: any waiting step in the last entry blocks the prompt, a chosen-but-waiting step still blocks, an aborted nested step does not, interrupted mode stays workflow-only.

- [ ] `Thought.tsx`: `data-thought-id={thought.id}` on the root `div`.
- [ ] `ThoughtHeader.tsx:36-40`: delete the Allowed, Denied and Not run branches (rule 7); `WAITING_THOUGHT_STATUS` unchanged.
- [ ] `thoughtView.tsx`: options gain `choices: Record<string, ToolCallAction>`; `waiting = collectWaitingSteps(thoughts)` replaces `collectInterrupted`/`findPendingStep`/the local `isPauseLive`. For each waiting step when `canShowDecision`: chosen → `view.status = { status: StatusEnum.NotStarted, label: 'Allowed' | 'Denied' }`, no footer; unchosen → `DecisionButtons` with `disabled={!canDecide(message)}`. The Waiting rule (`:100-106`) drops `!thought.decision` and skips chosen steps. Click: `next = nextUndecidedStep(waiting, choices, step.id)`; `void chatGenerationStore.decideToolCall(step.id, action)`; `scrollToThought(next?.id)` — local helper calling `scrollIntoView({ block: 'center' })` on `[data-thought-id="…"]`, no-op when absent. No code for stick-to-bottom (`useChatScroll.tsx:60-63`): the later browser stage checks the scroll is not pulled back while the batch streams.
- [ ] `ChatAiMessage.tsx:229-236`: `toolCallChoices` via `useSnapshot(chatGenerationStore)` passed as `choices`; comment names `decideToolCall`.
- [ ] `ChatPrompt.tsx:152-153`: `isToolCallPending = !isWorkflow && collectWaitingSteps(lastEntry?.thoughts).length > 0`; `:150` (CR-006) untouched.
- [ ] Tests as above; the `chatGeneration` mock at `ChatAiMessage.toolConfirmation.test.tsx:55-57` exposes `decideToolCall` and `toolCallChoices`, and the `valtio.useSnapshot` mock returns the store it is given.

### Task 6: Remove `Thought.decision`, the old predicates and the normalisation; AC15

**Files:** Modify `src/types/entity/conversation.ts:114,134,311`, `src/utils/chatHelpers.ts:123`, `src/utils/thoughtTree.ts` (old exports), fixtures `step()` at `:25`; tests `src/utils/__tests__/chatHelpers.test.ts:~1001`.

Test-first: yes — `chatHelpers.test.ts`: a chat whose last item is `pausedHistoryItemBackend` transforms to an entry with `inProgress: false` (no reattach, AC15) whose waiting steps keep `interrupted: true`, `aborted: false` and their message, with no `decision` key on any thought; a `ThoughtBackend` carrying a stray `decision` is normalised without it.

- [ ] Delete `ThoughtDecision`, `Thought.decision`, `ThoughtBackend.decision`, `chatHelpers.ts:123`, and `isPendingStep`, `isDecidedStep`, `isAbandonedStep`, `findPendingStep`, `hasPendingStep`, `hasInterrupted`, `isPauseLive`, the `ThoughtDecision` re-export from `thoughtTree.ts`; drop `decision: null` from the fixture `step()`. Finish with `grep -rn "decision" src --include='*.ts' --include='*.tsx'`: only `decisions`, `decideToolCall`, `ToolCallDecision` names may remain.
- [ ] Update `chatHelpers.test.ts` as above.

---

## Negative-constraint pass

- No undo of a local choice before send — Task 5 drops a step's buttons once chosen; no task adds a change path.
- No persistence across reload — Task 3 keeps the map in store memory; Task 6's AC15 test rebuilds from the server tree.
- No `{action}` form — Task 3 sends `decisions` for every pause, one step included.
- `tool_call_pending` never read — Task 1 deletes the types.
- No special 404 unlock — Task 4's 404 row is a plain refetch.
- CR-006 stays — Task 5 leaves `ChatPrompt.tsx:150`.
- No workflow-drawer status change — Task 5 only removes `getThoughtStatus` branches; Allowed/Denied are a view override.
- No re-send on 404/409 mismatch, no toast on pre-header Stop, no restore/refetch/`savedResponse` after the 200 headers — Task 4.
- No deferred send, stored record, sent or stream-ended flag — Task 3.
- No "Not run" anywhere — Task 5.
