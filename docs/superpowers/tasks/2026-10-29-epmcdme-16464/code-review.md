---
schema: sdlc-factory/code-review@1
decision: approve
reviewed_head: 25ba5009d8f0b93a56c71abbb35faf39ccf0051a
---

# Code review — 2026-10-29-epmcdme-16464

**Decision:** approve (check round, confidence final low · check high)  
**Reviewed head:** `25ba500` · **Rounds:** final → check

**Closed:** 5 fixed · 0 moot · 1 decided

Targeted check: all 6 prior blocking findings resolved on kind-appropriate proof — CR-001..CR-005 by current source in changed files (thoughtView.tsx, ChatAiMessage.tsx, api.ts) with matching tests, CR-006 by the mapped user decision (option a, intentional amendment to spec rule 6) implemented in ChatPrompt.tsx. Business and standards rows carried forward from the final round; new tests were inspected, not run (Stage 7 owns execution).

## Open — 0

## Decided — 1

- **CR-006** · isInterrupted stays true when no step pends — `src/utils/chatHelpers.ts:42` — **(a) In ChatPrompt, the WORKFLOW_INTERRUPTED prompt mode, the ChatControls render and the resumeWorkflowExecution submit routing are allowed only when currentChat.isWorkflow is true. This intentionally amends spec rule 6: isInterrupted itself stays top-level only and unchanged, and only its effect is gated on isWorkflow.** The mode was built for workflow chat interruption only (EPMCDME-9940, commit 81ba87b29): Continue label, Cancel via abortWorkflowChat, Edit Output and PUT v1/workflows/{id}/executions/{id}/resume. In an assistant chat, _prepareRequestData returns the assistant endpoint before it reaches the resumeExecution branch, so Continue sends a request with no text and clears the last message's interrupted flags. The mode reaches assistant chats only by accident, through interruptChatHistory on Stop and the reload derivation in chatHelpers.ts. The user accepts the visible change: after Stop in an assistant chat the prompt stays a normal prompt, with no Continue and no ChatControls. Implemented in ChatPrompt.tsx and covered by two ChatPrompt.test.tsx cases (interrupted assistant chat keeps Send, has no ChatControls and submits via createChatGeneration; interrupted workflow chat keeps Continue and ChatControls).

## Pre-existing (not blocking) — 2

- **Stale abort controller after resume error** — `src/store/chatGeneration.ts:1436` — the `_settleResume` restore branch (gate, 401/403/other 4xx, retryable 409) leaves `chatAbortControllers[chat.id]` set, so `reconnectChatStream` early-returns for that chat until the next request overwrites it. Pre-existing: the non-resume `_handleRequestError` path never deleted the controller on error either; the resume branch inherits that lifecycle rather than introducing it.
- **Stream error body read as one chunk only** — `src/utils/api.ts:216` — `buildStreamError` reads only the first chunk of the error body, so a multi-chunk JSON error fails `JSON.parse` and is classified as "no status", losing the real status message. Pre-existing: the single `getReader().read()` was moved verbatim from the old inline `stream` error branch.

## Coverage

Graded at the final round; the check round re-verified the findings, not these rows — Open and Closed above are current.

| Acceptance criterion | Status | Notes |
|---|---|---|
| Pending step = interrupted && !decision at any depth; its id is the resume thought_id | pass | isPendingStep/findPendingStep in thoughtTree.ts |
| Thought.decision typed allow \| deny \| abandoned \| null | pass | ThoughtDecision in conversation.ts |
| Find pauses from the thought tree only; tool_call_pending / pending_tool_call typed but unread | pass | types only, no reader |
| Rule 1: streamed thought with parent_id attaches at any depth; merge carries decision; orphans unchanged | pass | _handleThought uses findThought |
| Rule 2: transformChatBEtoFE keeps parent_id/decision, normalises children recursively | pass | normaliseThought in chatHelpers.ts |
| Rule 3: Allow/Deny on pending step at any depth, chat only; ancestors expanded; opt-in on shared Thought | pass | createThoughtView + getView |
| Rule 4: Allowed/Denied and Not run statuses; no buttons for either | pass | getThoughtStatus branches |
| Rule 4: Waiting on ancestors and empty steps while an interrupted step exists; abandoned never triggers | pass | see CR-004: override also replaces In Progress/Failed/Aborted |
| Rule 5: hidden outputs keep pending step and ancestor chain visible, siblings hidden | pass | see CR-001 for the decided nested step |
| Rule 6: isToolCallPending recursive; chat.isInterrupted stays top-level only | pass | see CR-006 |
| Rule 7: resumeToolCall recursive, sets decision, keeps interrupted, clears auth prompts, sends thought_id | pass | resumeToolCall |
| Rule 7: buttons active only when stream is null; every end of a pause stream nulls stream | pass | cut-without-terminal is accepted risk (c) |
| Rule 8: one at a time; decided step keeps local decision; final stream clears interrupted | pass | decision merge uses ?? |
| Rule 9: single-assistant root pause reduces to today's behaviour plus approved changes | pass | same predicates at top level |
| Resume errors bypass generic chat error path; toast backend message or fallback; end in-progress | pass | _handleRequestError resume branch |
| Resume stays on _sendRequest; thought_id added; api.stream toast disabled; RESUME_ERROR_ACTIONS dispatch | pass | resumeStreamArgs, matchResumeErrorAction |
| Every outcome site calls one settle function | pass | _settleResume |
| Restore rule: non-refetch, non-stream outcomes restore Allow/Deny and keep response text | pass | savedResponse + restoreResumeStep |
| Error table rows (abort, 404, 409 variants, no status, 5xx, after-200, 401/403/4xx) | pass | resolveResumeOutcome |
| Refetch guard: clear in-progress and auth prompts; getChat only while chat is current | pass | _refetchAfterResume |
| Refetch failure: toast and restore Allow/Deny | pass | _refetchAfterResume catch |
| api.stream attaches status as an added field only; thrown value type and other callers unchanged | partial (final round) | non-object JSON bodies replaced by {} before status is added (CR-005) |
| Non-goals respected (isInterrupted, bulk decisions, re-routing, orphans, drawer, local end, auto-retry, leave-chat abort) | pass | no hunk touches these |
| AC1: depth-1 pending step under its delegation step, opened, with Allow/Deny | pass | S1 tests |
| AC2: depth-2 pending step nests under O2->S | pass | S6 test |
| AC3: Allow/Deny send conversation_id, action, thought_id, stream:true | pass | _prepareRequestData |
| AC4: decided step shows Allowed/Denied; next pending shows buttons | pass | S5 merge test |
| AC5: reload mid-sequence restores decided steps, pending opened, prompt blocked | pass | normaliseThought + hasPendingStep |
| AC6: hidden tool outputs keep pending step and ancestor chain visible | pass | hidden-outputs test |
| AC7: nested pause blocks editor, hides Send, no ChatControls | pass | ChatPrompt hasPendingStep |
| AC8: each error row behaves as its table row; paused text unchanged | pass | resumeErrors.test |
| AC9: other api.stream callers: same toast, same thrown body plus status | partial (final round) | non-object JSON error bodies now thrown as {status} (CR-005) |
| AC10: single-assistant pause renders, blocks and resumes as today except rule 9 | pending-stage-7 | full-suite result is Stage 7 evidence |
| AC11: workflow execution drawer renders thoughts as before | pass | getView optional |
| AC12: unit tests cover tree, merge/transform, statuses, resume, thought_id, error rows, refetch failure | pass | see CR-003 for the ancestor Waiting gap |
| AC13: Allow/Deny disabled while reader open; active when it finishes; every end nulls stream | pass | canDecide !message.stream |
| AC14: S5 queued sibling and delegation steps show Waiting, also after Allow | pass | two S5 tests |
| AC15: after 409 can-no-longer-be-resumed refetch shows Not run, prompt accepts input | pass | refetch rows |
| AC16: Stop during live resume aborts, no second toast, partial text not kept | pass | abort outcome |
| AC17: auth-gate on resume shows gate UI, restores Allow/Deny, keeps response | pass | applyAuthGate + gate restore |
| AC18: abandoned shows Not run, no buttons, does not block prompt, no Waiting | pass | getThoughtStatus abandoned |
| AC19: network failure or 5xx ends in-progress and refetches; failed refetch toasts and restores | pass | matchResumeErrorAction |

Standards: commit-format pass · code-quality na · security pass
