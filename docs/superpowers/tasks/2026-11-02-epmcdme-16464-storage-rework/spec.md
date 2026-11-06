# EPMCDME-16464 — Nested tool-call confirmation, storage-rework contract

**Requirements:** `/Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-16464-ui-handoff.md` (backend EPMCDME-16463, MR !4668). **Research:** `technical-analysis.md`. **Size:** M.

## Goal

Move the confirmation UI on this branch from "one request per click, `Thought.decision`" to the reworked contract. The user collects a decision for every waiting step in the browser. One batch resume is sent. On send the client sets the decided states itself, and after that the resumed turn behaves like an ordinary turn.

## Behaviour

1. **Finding the pause.** A **waiting** step is a thought with `interrupted === true`, at any depth, in the last history entry. An **undecided** step is a waiting step with no local choice. One collector returns all waiting steps in depth-first order. It is the only source for everything that needs them: the buttons, the scroll order, the last-click check, the request body, the on-send update, prompt blocking and "Waiting". It replaces `isPendingStep`/`hasPendingStep`/`collectInterrupted` (`thoughtTree.ts:20,52`, `thoughtView.tsx:35`). The one-step `findPendingStep` (`thoughtTree.ts:42`) and both `isPauseLive` (`thoughtTree.ts:54-57`, `thoughtView.tsx:83`) are removed. `tool_call_pending` is never read. `pending_tool_call` (`conversation.ts:357`) and the unused `ToolCallLocation` types (`conversation.ts:116,367`, `types/chatGeneration.ts:37`) are removed. Steps are placed by `parent_id`, as today (`chatGeneration.ts:2083-2088`).
2. **No `Thought.decision`.** The field, its normalisation (`chatHelpers.ts:123`), its merge (`chatGeneration.ts:2078`) and every branch keyed on it are removed. The consumers are listed in the analysis, "Consumers of Changed Contracts".
3. **Collection.** Every undecided waiting step shows Allow/Deny at the same time, and the user can decide them in any order. A click records that step's choice locally. The step loses its buttons and shows "Allowed" or "Denied". After each click the view scrolls to the next undecided waiting step in depth-first tree order, wrapping to the top. The local choices live in the chat generation store as one reactive map keyed by step id, so the labels re-render and a Restore in the store can clear them. Local choices are not persisted: a reload before the request is sent shows every waiting step undecided again.
4. **When the buttons are active and when the request is sent.**
   - Allow/Deny are inactive only while this tab is reading a live stream of this answer, i.e. the entry's `stream` is set or it is `inProgress`. This is the `canDecide` stream check (`thoughtTree.ts:59-60`), kept.
   - After a reload there is no live stream (the paused answer is saved with `in_progress=false`, see "Backend guarantees"), so the buttons are active at once. A reattach replay ends with a final chunk, like any stream.
   - Of the two all-chats `stream=null` writers (`chatGeneration.ts:1856-1861`), the one that runs after Stop (`:1861`) stays: when the stopped stream had no text, as in a pausing run made only of steps, it is the only thing that ends the inactive window. The one that runs when the stream throws (`:1857-1859`) is reverted to main: the entry stays in progress anyway, so it does not end the window, and clearing the stream removes the partial answer from view in every chat. The kept writer's comment cites this rule instead of the superseded AC13.
   - The click that leaves no undecided step sends the batch at once, from the click handler, for the chat the click came from. Before any wait and in this order: collect the waiting steps, build the decisions and the undo from them, clear those choices from the map, apply the on-send update (rule 6). The steps then stop being waiting, so a second click or send cannot happen.
   - The wait for a pending Stop request of that chat runs inside the request, after its abort handle is registered. A Stop during the wait therefore follows the "Stop before the response headers" row of rule 9.
   - There is no deferred send, no stored send record and no sent or stream-ended flag. After a Restore, the next last click sends again.
5. **Request.** `POST v1/assistants/{id}/model/tool-call/resume` with `{conversation_id, stream: true, decisions: [{thought_id, action}]}`. It covers every waiting step once and is used even for a single step. The target assistant is unchanged (`chatGeneration.ts:1655`). The request still goes through `_sendRequest` (controller, auth gate, Stop) until the response headers arrive.
6. **On send (AR-4).** A Denied step becomes `aborted=true, interrupted=false, in_progress=false`, with message `Tool call was denied by the user.`. An Allowed step becomes `interrupted=false, in_progress=true` with its message cleared, and the stream's chunks then fill it. The entry is marked in progress, as today (`chatGeneration.ts:1402`): this keeps the prompt blocked, keeps a conversation reload from overwriting the decided steps, and lets Stop cancel the send. The buttons are gone from here on. A resume that pauses again shows its new waiting steps, and collection starts over.
7. **Step display.** `getThoughtStatus` loses its Allowed/Denied/Not run branches (`ThoughtHeader.tsx:36-40`). Denied, Cancelled and Unavailable steps render as "Aborted" with their message. "Allowed"/"Denied" before send come from a view override, so the workflow drawer is unaffected. While a pause is live, "Waiting" stays on the ancestors of a waiting step and on suspended steps that have no message (`thoughtView.tsx:77-81,100-106`). That rule loses its `decision` condition.
8. **Prompt.** For non-workflow chats the prompt stays blocked while any waiting step exists in the last entry (`ChatPrompt.tsx:152-154`). CR-006 gating (`:150`) is unchanged.
9. **Errors.** These are matched by status and exact backend message (`tool_call_resume.py:62-68`):

| Response | UI |
|---|---|
| 404 "No pending tool call found for this conversation." | Toast with the backend message, then refetch the conversation; no re-send and no extra unlock logic |
| 409 "The decisions do not match the tool calls waiting for a decision. Please reload the conversation." | Toast with the backend message, then refetch; the buttons are rebuilt from the reloaded tree |
| 409 "This tool call is waiting for another assistant of the conversation." | Restore + toast |
| 422 (not supported, validation), 401/403, other 4xx | Restore + toast with the backend message |
| 5xx / no status | Toast with the fallback message, then refetch (unchanged) |
| Stop before the response headers (including during the pending-Stop wait) | No toast; once the abort settles, refetch |
| A recovery refetch (any row above) fails | Toast, then Restore |
| Anything after the 200 headers (exception, streamed error, cut) | The resume path has ended. Ordinary stream handling applies: the error is shown as for any turn, `savedResponse` is not restored, there is no restore or refetch, and no buttons come back. Stop after a 200 is an ordinary Stop |

"Restore" undoes the on-send change on every step of the batch using the undo built at send, clears the entry's in-progress mark, puts back the response text (`savedResponse`) and clears all local choices, so every waiting step shows its buttons again, active. Every Restore row comes before the 200, so no chunk has been merged yet. All rows for the old messages ("not waiting for this decision", "still being saved", "still being applied", old-pending, `help`) are removed, and so is the `after200` resume outcome.

## Backend guarantees this design relies on

- The pause row is saved before the first waiting step is streamed (`ask_for_tool_confirmation`). Once a waiting step is visible, the pause exists, so a 404 caused by a not-yet-saved pause cannot happen.
- All waiting steps of a pause arrive in one batch at the very end of the run, and the stream ends right after them. A new pause only comes in the next resume's stream. After a completed stream every waiting step is therefore present, and the last click sends the full set: no missing-id 409. The inactive window is the moment between the batch and the final chunk. A Stop that cuts the batch short gets the mismatch 409, a toast and a reload, which recovers.
- A paused answer is saved with `in_progress=false`. Both final saves of a turn, `_handle_serve_success` (`assistant_handlers.py:846-858`) and the background drainer `_drain_and_save_chat_history` (`:1009-1020`), write the entry with `in_progress=False`, pause or not. Only the placeholder at the start of a turn (`:661`) and of a resumed turn (`tool_call_resume.py:329`) is `in_progress=True`. So a reloaded paused answer is not in progress, and the page does not reattach to it (verified on branch `EPMCDME-16463_sub-assistant-tool-confirmation`, HEAD `34aafee01`).
- On a 404 the backend first marks the last answer's remaining waiting steps as Cancelled, so the refetch shows no waiting step and the prompt unlocks.

## Acceptance criteria

- AC1: For a pause with N waiting steps at any depth, all N show Allow/Deny at once. After reload they show undecided with working buttons, and the prompt stays blocked.
- AC2: A click hides that step's buttons, shows "Allowed"/"Denied", sends nothing, and scrolls to the next undecided step in tree order, wrapping to the top.
- AC3: The last click sends exactly one request with the batch body covering every waiting step, built before the on-send update. This also applies to a single waiting step.
- AC4: On send, denied steps show "Aborted" with "Tool call was denied by the user.", allowed steps show in progress and then their tool output, and the entry is in progress.
- AC5: A resumed turn that pauses again shows the new waiting steps with buttons.
- AC6: A 404 or the 409 mismatch shows a toast and refetches the conversation without re-sending. Cancelled steps render as aborted with their message, and the prompt unlocks. Stop before the response headers shows no toast and refetches once the abort settles.
- AC7: A 409 other-root, 422, 401/403 or unlisted 4xx shows a toast with the backend message and restores every step of the batch, the response text, the entry's not-in-progress state and every step's buttons, active. A recovery refetch that fails shows a toast and does the same restore.
- AC8: A failure after the 200 headers is shown as an ordinary turn error: no paused text restored, no refetch, no buttons.
- AC9: An Unavailable step renders as aborted with its message and has no buttons.
- AC10: Single-assistant confirmation works through the same path; no "Not run" label exists anywhere.
- AC11: Tests and fixtures no longer assert `decision`, the `{action, thought_id}` body, one-at-a-time S5 or the old 409 texts. A fixture for a batch pause with several waiting steps exists.
- AC12: While this tab reads a live stream of the answer, Allow/Deny are inactive. They become active when that stream completes or is stopped, and at once after a reload.
- AC13: The last click sends for the chat it came from, and the decided states are applied before any wait. A repeated click sends no second request. A Stop during the pending-Stop wait cancels the send and follows AC6's Stop clause.
- AC14: After a Restore, including one after an auth gate, the buttons come back active, the earlier choices are gone, and the next last click sends a new request.
- AC15: A fixture that loads a paused entry from `GET /v1/conversations/{id}` (with `in_progress: false`) shows its waiting steps with active buttons and starts no reattach.

## Non-goals

- Changing a local choice before the request is sent (no undo).
- Persisting local choices across a reload.
- Sending the `{action}` request form.
- Reading `tool_call_pending`.
- Special prompt unlock on 404 when the backend's Cancelled marking failed.
- Continue after Stop in assistant chats (CR-006 stays).
- Changing workflow-drawer statuses or confirmation in workflow, A2A or sync channels.

## Superseded

- Old spec `2026-10-29-epmcdme-16464/spec.md`: superseded in full except AC1, AC2, AC6, AC7, AC9, AC11, AC17, the "Resume errors" paragraphs on the owner and the refetch guard, and only the first and last clauses of AC16 (Stop aborts through the request's controller; leaving the chat does not abort it). This includes its non-goal against showing several pending decisions at once (EPMCDME-16342).
- `story.md`: the "Several waiting calls … one at a time" criterion and the "Single assistant" bullets for one-at-a-time and "Not run". The disabled-until-stream-ended bullet is narrowed to rule 4. "Chats waiting at release" is now handled by the migration (Cancelled steps, no error). Also superseded:
  - the Out of Scope line naming EPMCDME-16342: several waiting steps are now shown at once;
  - the "left out with a warning" sentences in "Customer minimum" and "Not available": per the handoff's "Runs that cannot pause", the tree is built in full and the call gets an Unavailable step;
  - "Allowed/Denied until the first chunk": now Allowed/Denied until the request is sent, then the rule 6 states;
  - "a toast for every resume error, paused message intact": now only before the 200 headers (rule 9).
- `technical-analysis.md` still records the original decision (4) "drop the disabled-until-stream-ends rule" and lists the resume settle wiring as kept; the spec governs on both.

## Decisions

- WORKFLOW_INTERRUPTED prompt mode and Continue after Stop stay workflow-only (CR-006) over showing them in assistant chats — user
- Always the batch body, also for one waiting step, over the `{action}` form — user
- "Waiting" kept on ancestors of a waiting step over dropping it — user
- Allow/Deny inactive only while this tab reads a live stream of the answer, over active immediately with a send deferred until the stream ends — user, answers AR-6
- The last click sends the batch at once from the click handler, over a deferred send held in a store record — user, answers AR-6
- All undecided waiting steps show buttons at once, any order, scroll to the next with wrap, over one at a time — user
- 404 is a plain refetch relying on the backend's Cancelled marking over UI unlock logic — user
- A reloaded paused answer is treated as not in progress, verified in the backend's final saves, over guarding against a reattach — user, answers AR-12
- Locally decided steps show "Allowed"/"Denied" through a view override over showing no status until send
- Restore-type errors clear all local choices over keeping them for a resend
- 409 other-root restores and toasts over refetching (the target is already the entry's assistant, so a retry repeats the error; accepted under Open risks)
- The post-Stop `stream=null` writer stays as the end of the inactive window, over reverting it to main
- The on-throw `stream=null` writer is reverted to main, over keeping it (it does not end the window and blanks partial answers in every chat)
- Local choices live in the generation store as one reactive map keyed by step id, over component state or a plain module map
- The request body and the undo are built from the waiting steps before the choices are cleared and the on-send update is applied, over building them afterwards
- The entry is marked in progress at send and the mark is cleared on Restore, over changing only the step fields
- The pending-Stop wait runs inside the request after its abort handle is registered, over before the request
- The resume path ends at the 200 headers and the `after200` outcome is dropped, over keeping the resume settle wiring for the streamed turn
- One collector of all waiting steps is the only source for buttons, last-click check, body, on-send update, prompt and "Waiting", over the existing per-site predicates

## For the plan

- Plan against rule 9, not the analysis summary. Remove the resume-outcome wiring after the headers, so a resume that pauses again exits through the ordinary stream branch.
- Split recording a choice from sending the batch into two store methods: one records the choice and calls the other when nothing is left undecided. Allow all, a Send button or an undo then each add a caller instead of editing the click path.
- Restore uses the undo recorded when the on-send change is applied (prior `aborted`, `interrupted`, `in_progress`, `message` per step). It is passed to the settle sites in place of one thought id (`chatGeneration.ts:709-716,1428-1456,1704,1786`).
- Keep the denied message and the per-action field changes in one constant map next to `ToolCallAction`, citing `tool_step_states.py`.
- Browser check: the scroll to the next step is not pulled back by stick-to-bottom (`useChatScroll.tsx:60-63`) while the batch streams.

## Open risks

- If the backend fails to mark steps Cancelled on a 404 (e.g. a DB error), the waiting steps survive the refetch and the prompt stays blocked until the next message clears them (accepted, rare).
- A restore-type error that a retry repeats (409 other-root, 422 not supported, 401/403) brings the buttons back, while the prompt stays blocked by the waiting steps (accepted: these paths are rare, since A2A runs never pause and the target is the entry's own assistant).
- A pausing stream that is cut or fails before its final chunk leaves the buttons inactive until a reload (accepted, visible and recoverable).
- The test-harness expects Continue after Stop in assistant chats, while CR-006 keeps it hidden.
- The old spec and the story have no "partly superseded" note at the top yet; the caller adds it.
