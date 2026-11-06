# EPMCDME-16464 Nested tool-call confirmation (UI): Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Allow/Deny, prompt blocking, resume and reload work for a pending step at any depth of the thought tree (spec.md).
**Architecture:** One pure module holds the step predicates and tree walks. The store builds the tree recursively and sends `thought_id`. All resume outcomes go through one settle function next to `RESUME_ERROR_ACTIONS`. The shared `Thought` gets one opt-in seam, so the workflow drawer is unchanged.
**Tech stack:** React 18, TS, Valtio, Vitest + RTL (`unit` project, co-located `__tests__/`, see `.ai-run/guides/testing/testing-patterns.md`).

Commit per task using the repository's existing convention. Line numbers come from technical-analysis.md; re-check them before you edit.

Backend fixtures live outside the repo. Copy the trimmed S1/S5/S6/S8 shapes and the resume messages (`tool_call_resume.py:53-58`, S8 body) into `src/store/__tests__/fixtures/toolCallResume.fixtures.ts` (T3 creates it). Every error-row test reads its message from that file.

---

### T1: Types and the `thoughtTree` module
**Files:** Modify `src/types/entity/conversation.ts:114-131,290-305,328,348-355`, `src/types/chatGeneration.ts:26-37`. Create `src/utils/thoughtTree.ts` and `src/utils/__tests__/thoughtTree.test.ts`.
Test-first: yes. A depth-2 tree (O→O2→S): `findPath` returns [O→O2, O2→S, S]; `isPendingStep` is false for decided and abandoned steps; `canDecide` is false while `message.stream` is set.
- [ ] Add `decision?: ThoughtDecision | null` to `Thought` and `ThoughtBackend`, and `parent_id` to `ThoughtBackend`. Add an optional `tool_call_pending` / `pending_tool_call` with `location` to `StreamChunk` (both) and `ChatBackend`. These are types only: no logic reads them.
- [ ] Write the failing tests, then implement:
```ts
export type ThoughtDecision = 'allow' | 'deny' | 'abandoned'
export const isPendingStep = (t: Thought) => t.interrupted === true && !t.decision
export const isDecidedStep = (t: Thought) => t.interrupted === true && (t.decision === 'allow' || t.decision === 'deny')
export const isAbandonedStep = (t: Thought) => t.decision === 'abandoned'
export function findThought(thoughts: Thought[] | undefined, id: string): Thought | null
export function findPath(thoughts: Thought[] | undefined, id: string): Thought[] // root..target, [] if absent
export function findPendingStep(thoughts?: Thought[]): Thought | null           // first pending, depth-first
export const hasPendingStep = (thoughts?: Thought[]) => !!findPendingStep(thoughts)
export function isPauseLive(message: ChatMessage): boolean                      // any interrupted step, any depth
export const canDecide = (message: ChatMessage, step: Thought) => isPendingStep(step) && !message.stream && !message.inProgress
```

### T2: One recursive thought normaliser on reload
**Files:** Modify `src/utils/chatHelpers.ts:171-190`. Test: `src/utils/__tests__/chatHelpers.test.ts`.
Test-first: yes. `transformChatBEtoFE` on an S5-shaped paused conversation keeps `parent_id` and `decision` (including `"abandoned"`) at the top level and in nested `children`, and both levels have the same shape.
- [ ] Extract `normaliseThought(t: ThoughtBackend): Thought`. It maps the fields of today's top-level mapping plus `parent_id` and `decision`, and calls itself on `children`. Use it for the top level. Leave `isInterrupted` (`:40`) top-level-only (spec rule 6).

### T3: Recursive parent lookup and the `decision` merge in the stream
**Files:** Modify `src/store/chatGeneration.ts:1791-1834`. Create `src/store/__tests__/fixtures/toolCallResume.fixtures.ts`. Test: `src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts`.
Test-first: yes. Covers four cases.
- An S1 waiting step nests under its delegation step.
- A depth-2 step nests under O2→S, not at the top level.
- An existing step's `decision` merges.
- Rule 8 on the merge path: an S5 `10-allow-first` chunk adds the next pending step under S2 while the decided step keeps `decision: 'allow'`; a later chunk with the same ids clears `interrupted`.
- [ ] At `:1818`, look the parent up with `findThought` (T1) instead of the top-level `find`. Merge `decision` next to the other fields (`:1797-1816`). The not-found branch (`:1822-1830`) stays byte-identical (orphans, a non-goal).

### T4: `api.stream` exposes the status and can turn off its toast
**Files:** Modify `src/utils/api.ts:206-255`. Test: `src/utils/__tests__/api.test.ts`.
Test-first: yes. On `!response.ok` the thrown body has `status`; with `{ errorToast: false }` neither the JSON nor the non-JSON branch toasts; when the argument is omitted, the toast and the body are as today.
- [ ] Add a fifth parameter, `options: StreamOptions = {}`, with `errorToast` defaulting to true. Gate both toast branches on it, and attach `status` to the thrown value in both branches. Export `StreamHttpError` and `StreamOptions`.

### T5: Resume request with `thought_id`; mark the step decided on click
**Files:** Modify `src/types/chatGeneration.ts` (`ChatRequest`) and `src/store/chatGeneration.ts:106,1180-1218,1497-1507`. Tests: `src/store/__tests__/chatGeneration.resumeToolCall.test.ts`, `src/store/__tests__/chatGeneration.prepareRequestData.test.ts`.
Test-first: yes. Covers:
- `resumeToolCall` on a nested S5 step sets `decision` and keeps `interrupted: true`;
- it sets `inProgress` and clears the pending auth prompts;
- a second call while the step is decided or `stream` is set is a no-op;
- `_prepareRequestData` sends `{conversation_id, action, thought_id, stream: true}` for a top-level step as well.
- [ ] Replace `ChatRequest.toolCallAction` with `resume?: { action: ToolCallAction; thoughtId: string }` and update every reader.
- [ ] `resumeToolCall` finds the step with `findThought` over the last history item and returns early unless `canDecide`. It sets `decision = action` and `inProgress = true`, and clears the history item's pending auth prompts (the state `setOpenChat` checks, `src/store/chats.ts:527-531`). It no longer sets `interrupted = false` / `in_progress = true` on the step.
- [ ] Drop the placeholder request fields that only fed `toolCallAction`. Update the old tests to match.

### T6: `RESUME_ERROR_ACTIONS`, the settle function, and the pre-header site
**Files:** Modify `src/store/chatGeneration.ts` (next to `resumeToolCall`; `_sendRequest:1438-1487`; `_handleRequestError:1546-1561`; `stopChatGeneration:985-1021`). Test: create `src/store/__tests__/chatGeneration.resumeErrors.test.ts`.
Test-first: yes. Each table row in spec "Resume errors" is tested at the pre-header site, with the message taken from the fixtures. Rows: 404, each 409 message, a 409 matched by `help`, no status, 5xx, 401/403/other 4xx. Each test asserts:
- one toast with the backend message, or the fallback text;
- no "Failed to generate answer" toast, and `response` unchanged;
- refetch versus restore (`decision` cleared).

Three more tests:
- a failed refetch → toast and restore;
- the refetch is skipped when `chatsStore.currentChat?.id` differs;
- the controller entry is deleted only while it is this request's controller.
- [ ] Define `RESUME_ERROR_ACTIONS: { status: number; message?: string; help?: string; action: 'refetch' | 'restore' }[]` from the spec table. Write `_settleResume(chat, historyItem, controller, outcome)`, where `outcome` is `{ kind: 'error'; error } | { kind: 'after200' } | { kind: 'abort' } | { kind: 'gate' }`.
- [ ] **Restore** clears the local `decision` (via `findThought`), sets `inProgress = false`, and keeps `response`.
- [ ] **Refetch:**
  1. Clear `inProgress` and the auth prompts.
  2. `delete chatAbortControllers[chat.id]`, only if it `=== controller`.
  3. `chatsStore.getChat(chat.id)`, only while the chat is still current.
  4. On failure, toast and restore.
- [ ] In `_sendRequest`, read `data.resume` once. Pass `{ errorToast: false }` to `api.stream` when it is set. Send pre-header errors that pass the gate parsers to `_settleResume({kind:'error'})`, through a resume branch in `_handleRequestError` placed next to the `a2uiAction` branch. No retry, no re-routing.

### T7: The remaining outcome sites (gate, non-stream, after a 200, abort) and `stream` on every end
**Files:** Modify `src/store/chatGeneration.ts` (`_sendRequest:1448-1494`, `_handleNonStreamResponse:1579-1600`, `_handleStreamResponse:1602-1658`, `stopChatGeneration:1018`). Test: `src/store/__tests__/chatGeneration.resumeErrors.test.ts`.
Test-first: yes. Covers each outcome site:
- a gate payload on resume shows today's gate UI, keeps `response` and restores the buttons;
- a non-stream 200, a stream that throws, and a stream with no terminal chunk each toast and refetch;
- Stop mid-resume adds no toast beyond Stop's own, keeps `response` over the partial text, and refetches only after the `/abort` promise settles;
- every end of a stream sets `stream` to null: terminal chunk, abort and throw (AC13).
- [ ] Save `historyItem.response` before the gate chain. On resume, after any gate applier, restore it and call `_settleResume({kind:'gate'})`.
- [ ] For a resume, route a `Response` to `_settleResume({kind:'after200'})`. Wrap `_handleStreamResponse` in try/catch:
  - an aborted response → restore the saved `response`, then `{kind:'abort'}`;
  - a throw, or no `last`/`generated` → `{kind:'after200'}`.
- [ ] `stopChatGeneration` keeps its `/abort` promise in `chatGenerationStore.abortRequests[chatId]`. The abort row awaits it before refetching. Nothing aborts when the user leaves the chat.
- [ ] In `_handleStreamResponse`, set `historyItem.stream = null` on an aborted response and on a drain throw, for every chat. A cut stream with no terminal chunk stays as today (accepted risk c).

### T8: An opt-in seam on the shared `Thought`; decided and Not run statuses
**Files:** Modify `src/components/Thought/Thought.tsx:37-93` and `src/components/Thought/ThoughtHeader.tsx:28-34`. Tests: `src/components/Thought/__tests__/Thought.test.tsx`, `ThoughtHeader.test.tsx`.
Test-first: yes. Covers:
- `getThoughtStatus` returns "Allowed"/"Denied" for interrupted + allow/deny, and "Not run" for abandoned;
- with `getView` returning `forceExpanded`, a collapsed parent renders its child;
- `hidden` omits a child, `footer` renders under it, and the `status` override replaces the header status;
- without `getView`, rendering is identical (workflow drawer, AC11).
- [ ] Add the optional prop `getView?: (t: Thought) => { forceExpanded?: boolean; hidden?: boolean; footer?: ReactNode; status?: ThoughtStatus }` and forward it unchanged to every child. Compute expansion on each render as `forceExpanded || isExpanded || isInProgress`. Add a neutral "Waiting" `ThoughtStatus`, applied only through the override. `WorkflowExecutionStateThought` is not touched.

### T9: Confirmation placement, hidden outputs and Waiting in `ChatAiMessage`
**Files:** Modify `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx:275-304`. Test: `ChatAiMessage/__tests__/ChatAiMessage.test.tsx`.
Test-first: yes. Covers:
- S1 depth-1 and S6 depth-2 pending steps render opened, with Allow/Deny;
- the buttons are disabled while `message.stream` is set, and enabled after;
- a decided step has no buttons and shows Allowed;
- the S5 queued sibling and its ancestors show "Waiting" (AC14);
- an abandoned step shows Not run and no Waiting;
- with hidden outputs, only the ancestor chain stays visible;
- shared pages and workflow chats have no buttons.
- [ ] Build `getView` from `thoughtTree`, based on `path = findPath(thoughts, findPendingStep(thoughts)?.id)`:
  - `forceExpanded` for the ancestors in `path`;
  - `footer` = the existing Allow/Deny buttons on the pending step, under today's condition (`:283`), `disabled={!canDecide(message, step)}`;
  - with `hideToolOutputs`, `hidden` for any thought outside `path`;
  - when `isPauseLive(message)`, `status: 'Waiting'` for ancestors of an interrupted step and for steps with an empty `message` and no `decision`.
- [ ] A top-level thought stays visible under hidden outputs when it is in `path` or is interrupted. Pass `getView` to each top-level `<Thought>`.

### T10: Recursive prompt blocking
**Files:** Modify `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:149-155`. Test: `ChatPrompt/__tests__/ChatPrompt.test.tsx`.
Test-first: yes. A last message with a nested pending step disables the editor, hides Send and renders no `ChatControls`; an abandoned-only tree does not block.
- [ ] Set `isToolCallPending = hasPendingStep(lastMessage?.thoughts)`. Leave `isInterrupted` (`:147,169,276`) untouched.

---

## Negative-constraint pass
- `tool_call_pending` / `pending_tool_call` are not read in logic: T1 adds types only.
- `chat.isInterrupted` and the workflow-interrupt UI are unchanged: T2 and T10.
- No bulk or multiple decisions: T9 renders one pending step.
- No re-routing: in T6, "another assistant" restores.
- Orphans are unchanged: T3.
- Workflow drawer, shared pages and workflow chats are unchanged: T8 (opt-in) and T9.
- No local end of a pause: T6 only refetches.
- No auto-retry: T6.
- Leaving the chat does not abort: T7.
- A 404 is a plain refetch: T6.
- Old-format records get no special handling: none added.
- Arch-review plan notes:
  - controller released by identity: T6;
  - await `/abort`: T7;
  - one `resume` value: T5;
  - one pure module: T1;
  - one `Thought` seam: T8;
  - fixture-driven rows: T6 and T7;
  - one recursive normaliser (previous round): T2.
- The previous round's notes on retry and on ending a pause locally no longer apply, because the spec dropped both.
