# EPMCDME-16464: Nested tool-call confirmation (UI) — Spec

**Date**: 2026-10-29 · **Size**: L (21) · **Parent story**: EPMCDME-16461 (`story.md`) · **Backend**: EPMCDME-16463, MR !4668. Both deploy together, with no flag.

## Problem

Allow / Deny, prompt blocking, resume and reload only look at a message's top-level thoughts. Five places assume this (technical-analysis §6): `chatGeneration.ts:1818` (`_handleThought` parent lookup), `:1189` (`resumeToolCall`), `ChatAiMessage.tsx:275-283`, `ChatPrompt.tsx:149-155` and `chatHelpers.ts:40`. A sub-assistant's waiting step nests under its delegation step at any depth. The UI either never draws buttons for it (depth 1, the collapsed parent) or puts it at the top level (depth ≥ 2). The resume sends no `thought_id` (`chatGeneration.ts:1497-1507`), and `decision` is not modelled.

## Definitions

- **Pending step**: a thought with `interrupted === true && !decision`, at any depth. Its `id` is the `thought_id` sent on resume.
- **Decided step**: `interrupted === true` and `decision` is `"allow"` or `"deny"`. The user decided it, and the pause has not been applied yet.
- **Abandoned step**: `interrupted === false`, `decision === "abandoned"`, with no result. The backend ended the pause without running the call. `Thought.decision` is `"allow" | "deny" | "abandoned" | null`.
- Only the thought tree is used to find a pause. The stream field `tool_call_pending` is not populated, on main either, and the handoff paragraph saying otherwise is void. `pending_tool_call` on GET is typed, and no logic reads it.
- **Ended pause (backend, EPMCDME-16463, MR !4668).** In four places a pause is abandoned, and `abandon()` now replaces `clear()` there:
  - an old or invalid record format (`tool_call_resume.py:163`);
  - a structural mismatch (`:283`);
  - a new message at turn start (`:223`);
  - a record without a checkpoint (`assistant_handlers.py:1302`).

  In one transaction, `abandon()` clears the record and rewrites every `interrupted: true` step of that turn's saved thoughts, at any depth, to `interrupted: false, decision: "abandoned"`. Normal completion still uses `clear()` (`:1349`). The UI does nothing special here. A refetch returns a tree with no pending step, so the prompt unlocks.
- **Note for the backend.** Any path that drops a turn must call `abandon()`, not `clear()`.
- **Accepted risks.**
  - (a) A chat paused at deploy time that nobody has clicked yet still shows Allow/Deny. The first click ends it through the backend (409 "can no longer be resumed", then a refetch shows "Not run"). This costs one extra click; the chat is not stuck.
  - (b) The UI depends on the backend `abandon()` change shipping in the same release.
  - (c) If a pause stream is cut before its terminal chunk, Allow/Deny can stay disabled until the next reload.
  - (d) A 404 over a step that is still undecided keeps the step pending after the refetch. On the current branch this needs a pause ended without `abandon()`. That happens only when an old main pod ends a pause during a rolling deploy, or when a future backend path calls `clear()` instead of `abandon()`. Every non-abandon `clear()` runs after all steps are decided (`assistant_handlers.py:1349`), or the record is replaced by a new one (`_WRITE_RECORD_SQL`). This is accepted as a deploy-window risk.

## Behaviour

1. **Tree building.** A streamed thought with a `parent_id` attaches to its parent wherever the parent sits in the tree. The lookup is recursive, like `_findThought` at `:1836`. The existing-thought merge also carries `decision`. When the parent is not found, the thought follows today's path unchanged (it goes to the top level).
2. **Reload.** `transformChatBEtoFE` keeps `parent_id` and `decision` on top-level thoughts and normalises `children` recursively into the same shape, so the two levels no longer differ (`chatHelpers.ts:171-190`). `ThoughtBackend` and `Thought` gain `decision`.
3. **Confirmation placement.** Allow / Deny render on the pending step at any depth, in chat only. Shared pages and workflow chats never get them, as today (`ChatAiMessage.tsx:283`). Every ancestor of a pending step renders expanded. Expansion is opt-in on the shared `Thought`, so the workflow drawer (`WorkflowExecutionStateThought`) behaves as before.
4. **Decided and abandoned states.** `getThoughtStatus` returns:
   - a neutral "Allowed" / "Denied" status when `interrupted` is set and `decision` is `"allow"` / `"deny"`;
   - a neutral "Not run" status when `decision === "abandoned"`.

   Neither state shows buttons, and an abandoned step is not pending. While the message still has an interrupted step (pending or decided), these steps show a neutral "Waiting" status instead of "Success": an ancestor of an interrupted step, and a step with no output and no decision. This covers the time between a click and the next stream chunk. An abandoned step never triggers "Waiting". Like expansion, this is opt-in, so the workflow drawer is unchanged.
5. **Hidden tool outputs.** A top-level thought stays visible when it is pending or has a pending descendant. Inside it, only the ancestor chain down to the pending step renders (opened), and siblings stay hidden. This matches the backend's tool_output_visibility rule.
6. **Prompt blocking.** `isToolCallPending` becomes recursive and uses the pending-step predicate. `chat.isInterrupted` stays top-level-only, so ChatControls and the WORKFLOW_INTERRUPTED mode appear exactly as today and never for a nested pause.
7. **Resume.** `resumeToolCall(thoughtId, action)` finds the step recursively in the last history item. It sets `decision = action` locally and keeps `interrupted: true`, so the step shows "Allowed/Denied" right away instead of an optimistic "in progress". It sets the message to in progress and clears any pending auth prompts. The buttons cannot be clicked twice. The request always sends `thought_id`.
   - **Buttons become active when the pause stream's reader has finished**, that is, when the generation `stream` is null. They do not become active when the message stops being in progress on the `last` chunk. While the reader is still open, the pending step is visible but Allow/Deny are disabled.
   - The reason: in a pause, the `last`-marked chunk is the waiting step itself. The backend sends it (`assistant_handlers.py:892`) before it saves the history and marks the record `saved` (`:896-904`). An optional final chunk comes after the save, but a pause usually has none. The reader finishes only after the save, so a click after that point never meets "still being saved", and there is no auto-retry.
   - Every end of a pause stream sets `stream` to null: normal end, a terminal chunk, abort and error.
8. **One at a time.** A non-final decision streams only the next pending step (fixture S5 `10-allow-first.json`). Rule 1 places that step, and the decided step keeps its local decision. The final decision's stream clears `interrupted` on the decided steps (same ids), and their results arrive through the usual merge.
9. **Single assistant.** A root pause is a top-level thought, and the placement, tree and prompt rules reduce to today's behaviour for it. A single-assistant chat also gets these intended changes:
   - the added `thought_id`;
   - the one-at-a-time display of several calls in one step;
   - the "Allowed"/"Denied" status after a click, until the first chunk, in place of today's optimistic "in progress";
   - "Waiting" in place of "Success" on suspended steps while the pause is live;
   - "Not run" on abandoned steps;
   - Allow/Deny disabled until the pause stream ends;
   - the resume error policy below (toast with the backend message, the paused message left intact), in place of the generic chat error path.

   **Approved by the user as product owner (AR-18):** the five visible changes, which are Allowed/Denied, Waiting, Not run, disabled buttons and the resume error toasts. They are recorded in `story.md` under "Single assistant", marked *Revised (EPMCDME-16464 spec, user-approved)*.

## Resume errors

Resume errors bypass the generic chat error path. They raise no "Failed to generate answer" toast, and no error text is written into the paused message's `response`. Each error shows a toast with the backend message and ends the message's in-progress state. When the error has no status or no `error.message`, the toast uses a fixed fallback text instead. The UI matches on status + message, or status + `help`; the messages are stable constants (`tool_call_resume.py:53-58`).

**Owner.** The resume stays on `_sendRequest` (`chatGeneration.ts:1410`). That path already does three things the resume needs:
- it registers `chatAbortControllers[chat.id]` (`:1428`), so Stop aborts the request and the stream;
- it runs the auth-gate chain;
- it routes stream and non-stream responses.

Changes to it:
- `_prepareRequestData` (`:1498`) adds `thought_id` to the resume body.
- `_sendRequest` turns off `api.stream`'s generic toast for the resume.
- `_handleRequestError` (`:1546`) gets a resume branch, next to the existing `historyItem.a2uiAction` branch. It dispatches to one constant table, `RESUME_ERROR_ACTIONS`, kept next to `resumeToolCall`, instead of writing the error into the message.

The target assistant (today `historyItem.assistantId ?? chat.assistantID`, `chatGeneration.ts:1417`) is unchanged. Only Stop aborts a resume. Leaving the chat does not, because chat streams continue in the background on purpose.

**Every outcome site (AR-15).** `_sendRequest` reads one resume value, the request's `toolCallAction` with the thought id, and checks it at each place where it settles a request. All sites call one function that lives next to `RESUME_ERROR_ACTIONS`:
- **Errors thrown before the response headers** go to the `_handleRequestError` resume branch.
- **Gate parsers.** The response is saved before the gate chain. After any gate, the response text and the buttons are restored.
- **Non-stream response.** It is routed the same way as the "after a 200" row.
- **Stream failure after a 200.** The stream handling is wrapped, so a throw or a missing terminal chunk takes the "after a 200" row.
- **Abort.** It takes the abort row; the partial text or placeholder does not overwrite the response.

**Restore rule.** Every outcome that neither refetches nor streams restores Allow/Deny (clears the local `decision`) and keeps the paused message's response text. This includes the auth-gate outcomes.

| Status / message | UI action |
|---|---|
| Aborted by Stop | No toast. End the in-progress state, then refetch |
| 404 "No pending tool call found…" | Toast, then refetch the conversation |
| 409 "…not waiting for this decision…" | Toast, then refetch |
| 409 "…still being saved…" | Fallback only: toast, restore Allow/Deny, no retry. Still reachable on the client-disconnect background-drain path, where history and `saved` are two separate writes (`assistant_handlers.py:1005-1023`) |
| 409 "…decision is still being applied…" | Toast, restore Allow/Deny, no retry |
| 409 "…waiting for another assistant…" | Toast, restore Allow/Deny, no re-routing. Probably unreachable from the UI: in S6 the history item's `assistantId` (`08-get-conversation-paused.json:60`) equals `assistant_data[0].assistant_id` (`:171`), so this row is a fallback |
| 409 "…can no longer be resumed…" | Toast, then refetch. The backend has abandoned the steps, so they show "Not run" |
| 409 whose `help` is "This tool call can no longer be resumed…" (structural mismatch, variable message) | Same as "can no longer be resumed" |
| No status (network failure after the request was sent, non-JSON body) | Fallback toast text, end the in-progress state, then refetch |
| 5xx | Toast, end the in-progress state, then refetch |
| Non-stream 200, stream fails after a 200, or ends with no terminal chunk | Toast, end the in-progress state, then refetch |
| 401 / 403 / other 4xx | Toast, restore Allow/Deny |

**Refetch guard.** Before a refetch, the UI clears the message's in-progress state and any pending auth prompts. `setOpenChat` keeps the local copy while either is set (`chats.ts:527-540`). The refetch calls `getChat` only while `chatsStore.currentChat?.id` is still this chat; otherwise it is skipped.

**Refetch failure.** If the recovery refetch fails, the UI shows a toast and restores Allow/Deny. This is safe because the backend rejects a decision it already holds.

`api.stream` attaches the HTTP status to the error it throws, as an added field only. The thrown value's type and the behaviour of every other caller stay the same (`api.ts:229-247`). An optional fifth argument turns off the generic toast in both of its toast branches (the JSON and the non-JSON branch). The shape:

```ts
// thrown by api.stream on !response.ok — existing body fields unchanged
type StreamHttpError = <existing parsed JSON body> & { status: number }
// new optional fifth parameter of api.stream; omitted = today's behaviour
type StreamOptions = { errorToast?: boolean } // default true
```

## Acceptance criteria

- AC1: A depth-1 pending step (O→S) streams in under its delegation step. The step is opened and shows Allow/Deny.
- AC2: A depth-2 pending step (O→O2→S) nests under the step O2→S, not at the top level.
- AC3: Allow and Deny send `{conversation_id, action, thought_id, stream: true}`, with `thought_id` = the pending step's id. This holds for single-assistant resumes too.
- AC4: After a non-final decision, the decided step shows "Allowed"/"Denied" without buttons, and the next pending step shows Allow/Deny under its own container.
- AC5: A reload mid-sequence restores the decided steps as decided and the pending step opened with working buttons, and the prompt stays blocked.
- AC6: With tool outputs hidden, the pending step and its ancestor chain stay visible, and siblings do not.
- AC7: A nested pause blocks the editor and hides Send, and does not show ChatControls.
- AC8: Each error row behaves as its table row says, and the paused message's response text is left unchanged.
- AC9: Other `api.stream` callers behave the same (same toast, same thrown body plus `status`).
- AC10: A single-assistant one-call pause renders, blocks and resumes as today, except for the changes listed in rule 9. The existing tests pass, updated for `thought_id`, the decided status and the resume error policy.
- AC11: The workflow execution drawer renders thoughts as before.
- AC12: Unit tests cover:
  - recursive tree building;
  - the `decision` merge/transform, including `"abandoned"`;
  - the `getThoughtStatus` decided and "Not run" states;
  - the recursive `resumeToolCall`;
  - the `thought_id` in `_prepareRequestData`;
  - each error row, tested at the outcome site where it lands (before the headers, gate, non-stream, after a 200, abort);
  - the refetch-failure fallback;
  - recursive `isToolCallPending`.

  Rule 8 is tested on the merge path. S1/S5/S8 fixtures are used where they fit.
- AC13: While the pause stream's reader is still open (the generation `stream` is not null), the pending step is shown with Allow/Deny disabled. This holds even after the `last`-marked waiting-step chunk has ended the in-progress state. The buttons become active when the reader finishes, and every end of the stream (normal, terminal chunk, abort, error) sets `stream` to null.
- AC14: In the S5 paused message, the queued sibling call and the delegation steps above the pending step show "Waiting", not "Success". They still show "Waiting" after a click on Allow, before the next chunk arrives.
- AC15: After a 409 "can no longer be resumed" (by message or by `help`), the refetch shows the steps as "Not run" and the prompt accepts a new message. This still holds after later reloads.
- AC16: Pressing Stop during a live resume stream aborts it through `_sendRequest`'s controller. No second toast appears, the partial text does not overwrite the response, and the abort row applies. Leaving the chat does not abort it.
- AC17: An auth-gate outcome on resume shows today's gate UI, restores Allow/Deny and keeps the paused message's response text. Auth prompts are cleared when a resume is sent and before a refetch.
- AC18: A step with `decision: "abandoned"` shows "Not run", has no buttons, does not block the prompt and does not trigger "Waiting".
- AC19: A network failure after the request was sent, or a 5xx, ends the in-progress state and refetches instead of restoring the buttons. If that refetch fails, a toast is shown and Allow/Deny are restored.

## Non-goals

- Reading `tool_call_pending` or `pending_tool_call` in UI logic (typing them is allowed).
- Changing `chat.isInterrupted` semantics or the workflow-interrupt UI.
- Showing several pending decisions at once, or a bulk Allow/Deny (EPMCDME-16342).
- Re-routing a resume to another assistant.
- Changing `_handleThought`'s handling of thoughts whose parent is not found (orphans).
- Changing the workflow execution drawer, shared pages, or workflow-chat confirmation.
- Policy-model or per-tool policy changes; anything about sync/background/workflow-node/A2A runs.
- Dedicated handling of old-format records from the deploy window.
- Ending a pause locally in the UI; the backend's `abandon()` owns that.
- Auto-retrying a resume.
- Aborting a chat request when the user leaves the chat.
- Special handling of a 404 over an undecided step beyond a plain refetch.

## Decisions

- Find pauses from the thought tree only, over consuming `tool_call_pending` / `pending_tool_call` (which signal identifies the waiting step).
- Rely on the backend's `abandon()` (`interrupted: false`, `decision: "abandoned"`) and only refetch, over a UI local end of the pause (AR-1: how an ended pause is left).
- A neutral "Not run" status for abandoned steps, which are neither pending nor "Waiting", over reusing "Allowed"/"Denied" or "Success" (how an abandoned step looks).
- Accept that an unclicked deploy-window chat still shows Allow/Deny until its first click, with no dedicated handling, over a separate path (AR-1: chats paused at deploy time).
- Accept a 404 over an undecided step as a deploy-window risk, with the 404 row a plain refetch, over UI handling for it (AR-16: a pause ended without `abandon()`).
- Recursive `isToolCallPending` that only blocks the editor, over also making `isInterrupted` recursive (which prompt state a nested pause shows).
- With hidden tool outputs, show the ancestor chain down to the pending step, over showing the step alone or the whole subtree (what stays visible).
- A new neutral "Allowed"/"Denied" header status, over keeping "Interrupted" with a chat-only label (how a decided step looks).
- A neutral "Waiting" status for ancestors of a pending step and for steps with no output and no decision, over today's "Success" (how suspended steps look while a pause is live).
- Key "Waiting" on any interrupted step, pending or decided, over pending steps only (AR-5: the time between a click and the next chunk).
- Accept the five visible single-assistant changes in rule 9, over keeping single-assistant visuals as today (AR-18: the product owner's approval).
- Resume errors toast the backend message and leave the paused message intact, over today's chat error path (how resume errors appear).
- Keep the resume on `_sendRequest`, with a resume branch in `_handleRequestError` that dispatches to `RESUME_ERROR_ACTIONS`, over the resume opening its own request or a shared request opener (AR-2/AR-3: who owns the request lifecycle).
- Check one resume value at every outcome site of `_sendRequest`, through one function next to `RESUME_ERROR_ACTIONS`, over handling resume errors only in `_handleRequestError` (AR-15: where resume outcomes land).
- Enable Allow/Deny only after the pause stream ends, over an auto-retry on "still being saved" (when a decision may be sent).
- Use "the stream reader has finished" (`stream` is null) as the signal that enables the buttons, over "the message is no longer in progress" (AR-14: the `last` chunk comes before the save).
- Treat "still being saved" as a fallback that toasts and restores the buttons, over retrying (the background-drain path).
- Only Stop aborts a resume, over also aborting when the user leaves the chat (AR-11: chat streams continue in the background).
- Clear auth prompts when a resume is sent and before a refetch, over leaving them set (AR-12: `setOpenChat` keeping a stale local copy).
- Run the existing auth-gate parsers before the resume error table, over sending gate payloads to the table (order of gate handling on resume).
- Restore Allow/Deny and keep the response text on every outcome that neither refetches nor streams, gates included, over restoring only from the table (AR-8: a gate on resume).
- An abort row with no toast, end in-progress and refetch, over sending aborts to the "no status" row (AR-9: an aborted resume).
- Refetch on a network failure after sending and on 5xx, over restoring the buttons (AR-13: the backend may have applied the decision).
- Toast and restore Allow/Deny when the recovery refetch fails, over leaving the step decided (AR-17: the backend rejects a decision it already holds).
- Refetch the conversation on 404 and on 409 "not waiting for this decision", over leaving the reload to the user (stale pause).
- Refetch only after in-progress is cleared and only while the chat is still current, over refetching straight away (refetch ordering).
- Restore the buttons with no retry on "decision is still being applied", over an automatic retry (another resume is running).
- Keep the buttons with no re-routing on "waiting for another assistant", over retrying through `chat.assistantID` (wrong assistant).
- Refetch on "can no longer be resumed", over only unblocking the prompt (pause abandoned by the backend).
- Match rows on status plus message or status plus `help`, over status plus message only (the structural-mismatch 409 has a variable message).
- A fixed fallback toast text for errors with no status or no `error.message`, over toasting an empty message (errors without a backend message).
- Toast, end in-progress and refetch on a non-stream 200, or when the stream fails after a 200 or ends with no terminal chunk, over leaving the message in progress (failure after a successful response).
- Attach `status` to `api.stream`'s thrown error, over matching on message text alone (how error rows are told apart).
- An optional fifth `api.stream` argument that turns off both toast branches, over a flag threaded through `ChatRequest` (how the resume path turns off the generic toast).
- Mark the step decided locally on click, over today's optimistic `interrupted=false`/`in_progress=true` (what the step shows while a non-final decision is pending).
- Make ancestor expansion opt-in on the shared `Thought`, over changing its default (keeping the workflow drawer unchanged).
- Toast and restore the buttons on 401/403 and other 4xx, over the generic chat error path (errors outside the table).
- Leave orphans on today's top-level path, over changing `_finishThoughts` behaviour (parent not found).
