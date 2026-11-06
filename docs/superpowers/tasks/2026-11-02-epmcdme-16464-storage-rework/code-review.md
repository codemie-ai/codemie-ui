---
schema: sdlc-factory/code-review@1
decision: approve
reviewed_head: a65605bcd6c2b2e0069f3f831b189fb61bd93015
---

# Code review — 2026-11-02-epmcdme-16464-storage-rework

**Decision:** approve (check round, confidence final medium · check high)  
**Reviewed head:** `a65605b` · **Rounds:** final → check

**Closed:** 4 fixed · 0 moot · 0 decided

All four prior blocking findings (CR-001..CR-004, all kind: code) were re-read in the working tree at 43a4d19ab: the real-valtio integration test now exercises the click-to-label chain and the AC15 GET-loaded fixture, scrollToThought compares dataset.thoughtId instead of interpolating the id into a selector (with a quoted-id view test), the local isPauseLive alias is gone from thoughtView.tsx, and chats.pollIncompleteChat.test asserts neither reconnectChatStream nor pollIncompleteChat runs for the in_progress=false paused entry. CR-004's cited file (chatHelpers.test.ts) was intentionally untouched because its recommendation placed the coverage in the two changed test files. business_review and standards_review carried forward from the final round; no new findings sought on this targeted round; the browser stick-to-bottom scroll check remains pending-stage-7.

## Open — 0

## Pre-existing (not blocking) — 1

- **Post-200 drain throw leaves entry in progress** — `src/store/chatGeneration.ts:1739` — `_handleStreamResponse` is awaited outside `_sendRequest`'s try, so a reader throw after the 200 headers rejects up to `onDecide`'s `.catch(console.error)` with `historyItem.inProgress` still `true` and `stream` still set; nothing toasts or recovers. Pre-existing: this is main's ordinary-turn drain handling, and spec rule 4 / AC8 explicitly revert the on-throw `stream = null` writer to main ("a drain throw keeps the stream, as on main"), so the gap belongs to the ordinary send path, not to this rework.

## Coverage

Graded at the final round; the check round re-verified the findings, not these rows — Open and Closed above are current.

| Acceptance criterion | Status | Notes |
|---|---|---|
| Rule 1: one depth-first collector of waiting steps is the only source for buttons, scroll, last-click check, body, on-send update, prompt and Waiting | pass | collectWaitingSteps in thoughtTree.ts; consumed by thoughtView, ChatPrompt, decideToolCall/_sendToolCallDecisions |
| Rule 1: isPendingStep/hasPendingStep/collectInterrupted replaced; findPendingStep and both isPauseLive removed | partial (final round) | predicates and the thoughtTree isPauseLive removed; thoughtView.tsx:102 keeps a local isPauseLive alias derived from the collector (CR-003) |
| Rule 1: tool_call_pending is never read; pending_tool_call and ToolCallLocation types removed | pass | removed in conversation.ts and types/chatGeneration.ts; the only remaining reader is an untyped stale test mock in ChatAiMessage.test.tsx |
| Rule 1: steps are placed by parent_id, as today | pass | placement untouched; batch placement test present |
| Rule 2: Thought.decision field, normalisation, merge and every branch keyed on it removed | pass | no remaining consumer |
| Rule 3: every undecided waiting step shows Allow/Deny at once; a click records the choice locally, step loses buttons and shows Allowed/Denied | pass | per-step footer, CHOSEN_THOUGHT_STATUS override, decideToolCall records into toolCallChoices |
| Rule 3: after each click scroll to the next undecided step in depth-first order, wrapping to the top | pass | nextUndecidedStep + scrollToThought via data-thought-id; next, wrap and no-scroll tested |
| Rule 3: local choices live in the chat generation store as one reactive map keyed by step id; not persisted | pass | toolCallChoices on the valtio proxy; in-memory only |
| Rule 4: Allow/Deny inactive only while the entry's stream is set or it is inProgress | pass | canDecide(message) = !stream && !inProgress; checked in view and store |
| Rule 4: post-Stop stream=null writer stays with a rule-4 comment; on-throw writer reverted to main | pass | try/catch nulling removed; aborted writer kept with comment |
| Rule 4: last click sends at once from the click handler for the click's chat; collect, build decisions+undo, clear choices, apply on-send update before any wait | pass | _sendToolCallDecisions is synchronous up to _sendRequest; chat captured in decideToolCall |
| Rule 4: pending-Stop wait runs inside the request after the abort handle is registered; Stop during the wait follows the pre-headers Stop row | pass | controller registered before the wait; ABORT_ERROR thrown into the abort row |
| Rule 4: no deferred send, stored send record or sent/stream-ended flag; after Restore the next last click sends again | pass | no such state; AC14 test |
| Rule 5: POST v1/assistants/{id}/model/tool-call/resume with {conversation_id, stream: true, decisions}; also for one step; via _sendRequest | pass | _prepareRequestData resume branch; body asserted exactly |
| Rule 6: on send Denied -> aborted/!interrupted/!in_progress + denied message; Allowed -> !interrupted/in_progress/''; entry in progress; auth prompts cleared | pass | TOOL_CALL_DECISION_STATES applied in _sendToolCallDecisions |
| Rule 7: getThoughtStatus loses Allowed/Denied/Not run; Denied/Cancelled/Unavailable render Aborted; Allowed/Denied before send via view override | pass | ThoughtHeader branches removed; override lives in thoughtView |
| Rule 8: non-workflow prompt blocked while any waiting step exists in the last entry; CR-006 gating unchanged | pass | ChatPrompt uses collectWaitingSteps; isInterrupted line untouched |
| Rule 9: 404 and 409 mismatch -> backend toast + refetch, no re-send | pass | RESUME_ERROR_ACTIONS rows; tested |
| Rule 9: 409 other-root, 422, 401/403, other 4xx -> Restore + backend toast | pass | matchResumeErrorAction defaults to restore; backend message for 4xx |
| Rule 9: 5xx / no status -> fallback toast + refetch | pass | fallback for undefined status or >= 500 |
| Rule 9: Stop before headers -> no toast, refetch once abort settles; failed recovery refetch -> toast then Restore | pass | _settleResume awaits abortRequests; _refetchAfterResume catch restores |
| Rule 9: after the 200 headers the resume path has ended; ordinary stream handling, no savedResponse restore, no refetch, no buttons | pass | _handleResumeResponse removed; _sendRequest falls through to ordinary branches |
| Rule 9: Restore undoes every step of the batch from the undo built at send, clears in-progress, keeps savedResponse, clears all local choices | pass | restoreResumeSteps |
| Rule 9: old-message rows and the after200 outcome removed | pass | 3 rows remain; ResumeOutcome is error\|gate |
| Plan: recording a choice and sending the batch are two store methods | pass | decideToolCall and _sendToolCallDecisions |
| Plan: Restore uses the per-step undo passed to the settle sites in place of one thought id | pass | ToolCallStepSnapshot[] threaded through |
| Plan: denied message and per-action field changes in one constant map next to ToolCallAction citing tool_step_states.py | pass | TOOL_CALL_DENIED_MESSAGE / TOOL_CALL_DECISION_STATES with citation |
| Plan: browser check that the scroll to the next step is not pulled back by stick-to-bottom while the batch streams | pending-stage-7 | scroll implemented; stick-to-bottom interaction is browser evidence only |
| Non-goals: no undo of a local choice; no persistence; no {action} form; tool_call_pending not read; CR-006 and workflow-drawer statuses unchanged | pass | second click ignored; in-memory map; batch body only; drawer unaffected |
| AC1: N waiting steps at any depth all show Allow/Deny at once; after reload undecided with working buttons and the prompt blocked | pass | view and prompt tests |
| AC2: a click hides that step's buttons, shows Allowed/Denied, sends nothing, scrolls to the next undecided step with wrap | pass | store and view tests; reactivity itself only tested with valtio mocked (CR-001) |
| AC3: the last click sends exactly one request with the batch covering every waiting step, built before the on-send update; also for a single step | pass | decideToolCall.test AC3 rows |
| AC4: on send denied steps show Aborted with the denied message, allowed steps in progress then their output, entry in progress | pass | store and view tests |
| AC5: a resumed turn that pauses again shows the new waiting steps with buttons | pass | ordinary stream branch merges interrupted chunks; the AC5-labelled test covers only the allowed-step fill |
| AC6: 404 / 409 mismatch -> toast + refetch, no re-send; Cancelled steps render aborted and the prompt unlocks; Stop before headers no toast, refetch after ab... | pass | resumeErrors.test rows + pending-Stop test; ChatPrompt aborted test |
| AC7: 409 other-root, 422, 401/403, unlisted 4xx -> backend toast + full restore; failed recovery refetch does the same | pass | expectRestored rows; failed-refetch test |
| AC8: a failure after the 200 headers is an ordinary turn error: no paused text restored, no refetch, no buttons | pass | tested; the resulting stuck in-progress entry is main's behaviour (deferred) |
| AC9: an Unavailable step renders as aborted with its message and has no buttons | pass | unavailableStep fixture test |
| AC10: single-assistant confirmation uses the same path; no 'Not run' label anywhere | pass | single-step test; 'Not run' only in negative assertions |
| AC11: tests/fixtures no longer assert decision, the {action, thought_id} body, one-at-a-time S5 or old 409 texts; a batch-pause fixture exists | pass | old tests/fixtures removed; s5BatchPausedConversation added |
| AC12: Allow/Deny inactive while this tab reads a live stream; active when it completes or is stopped, and at once after reload | pass | canDecide; live-stream view test; post-Stop writer kept |
| AC13: last click sends for its chat with decided states applied before any wait; repeated click sends no second request; Stop during the wait cancels per AC6 | pass | AC13 store rows; pending-Stop test |
| AC14: after a Restore (incl. after an auth gate) buttons come back active, choices gone, next last click sends a new request | pass | gate path restores; AC14 tests |
| AC15: a fixture loading a paused entry from GET /v1/conversations/{id} (in_progress: false) shows its waiting steps with active buttons and starts no reattach | partial (final round) | chatHelpers.test asserts inProgress=false and waiting-step fields only; no button-state or no-reattach assertion from that fixture (CR-004) |

Standards: commit-format pass · code-quality na · security pass
