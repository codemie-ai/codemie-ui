# EPMCDME-15256: Workflow chat poll — drop stale fallback, add hidden-tab pause + idle backoff

Two independent fixes to workflow chat execution-status polling in codemie-ui. They touch different parts
of the same file and compose in either order; ship together. No backend change.

## Reviewer notes — verified backend invariants (read before raising reachability findings)

The two claims below were raised by code review twice (CR-001 / CR-002) and rejected both times against
the backend source. They were kept last time only as "reachability unconfirmed — backend shape not
provable from this repo". **The backend evidence is quoted here so reachability can be judged without the
`codemie` repo: treat both as disproven.** Verified on `codemie` `origin/main` @ `2656f490` and on the
EPMCDME-15256 backend branch @ `8c72064e`. Re-raise only with a backend code path that contradicts a
quote below.

**Invariant A — materialized workflow thoughts have constant `children` / `author_type`, and a workflow
turn's `workflowExecutionRef` is always `true`.** So `progressSignature`
(`src/pages/chat/hooks/useWorkflowExecutionPoll.ts`) leaves these out on purpose: they cannot differ
between two polls, and a change confined to them cannot happen. Its comment "every field
`refreshWorkflowExecutionIds` can change" means every field that can *differ between polls*. It is not a
missing field (rejects CR-001).

```python
# codemie: service/conversation/history_materializer.py — _get_execution_thoughts (only thought producer)
{
    "id": state.id,
    "author_name": state.name,
    "author_type": "WorkflowState",   # literal
    "message": state.output or "",
    "input_text": state.task or None,
    "children": [],                   # literal — sub-steps are never nested on GET
    "in_progress": ..., "interrupted": ..., "aborted": ...,
}
# _materialize_execution_reference returns GeneratedMessage(..., workflow_execution_ref=True,
#     execution_status=execution.overall_status)            # no in_progress
# on failure it returns the stored reference, which both writers stored with workflow_execution_ref=True
```

**Invariant B — a workflow conversation turn from `GET /conversations/{id}` always has its assistant
item, and that item never carries a top-level `in_progress`.** So the `transformHistoryGroup` placeholder
(odd-sized group, `in_progress: true`, no `executionStatus`) is unreachable for workflow chats. Skipping
`pollIncompleteChat` for workflow chats in `getChat` (`src/store/chats.ts`) loses no refresh path. The
tests asserting "no poll when `executionStatus` is missing" pin intended behaviour, not a silenced bug
(rejects CR-002).

```python
# codemie: service/workflow_service.py — the only two writers of workflow chat history
# (execution start, and append_user_message_on_resume)
assistant_message_ref = GeneratedMessage(role=ASSISTANT, history_index=history_index,
    workflow_execution_ref=True, execution_id=execution_id, thoughts=[], message=None)  # no in_progress
conversation.history = [*(conversation.history or []), user_message, assistant_message_ref]
conversation.update()   # user + assistant written atomically — never an unpaired user item
```

- The frontend sends workflow chat messages to `v1/workflows/{id}/executions` and `/resume`
  (`src/store/chatGeneration.ts`), never to the assistant stream handler. The assistant stream handler
  (`rest_api/handlers/assistant_handlers.py`, `save_chat_history(..., in_progress=True)`) is the only
  backend writer that persists a top-level `in_progress=True`. `graph_callback.py`'s `in_progress=True`
  is a streamed SSE thought and is never persisted.
- Legacy workflow data with a stored `in_progress: true` is never cleared by the backend. The removed
  `pollIncompleteChat` path could not clear it either; it only finalized locally after 5 minutes.

## Problem

A workflow chat with a finished run (`executionStatus` final) that still has a leftover stuck `In
Progress` thought never stops polling and stays UI-locked, because liveness is OR'd with a legacy "any
thought in_progress" fallback obsolete since backend 2.49.0 (production runs 2.52.0; `executionStatus` has
been sent since 2.49.0). Separately, `usePolling` — the primitive `useWorkflowExecutionPoll` sits on — has
no idea whether a tab is hidden or a fetch changed anything, so a genuinely live workflow chat polls every
4s indefinitely, hidden tab or not, changed or not.

## Fix 1 — remove the stale fallback

`hasInProgressExecution` (`src/pages/chat/hooks/useWorkflowExecutionPoll.ts:27-36`) and
`isActiveWorkflowTurn` (`src/utils/chatHelpers.ts:101-109`) decide liveness from
`executionStatus === WORKFLOW_STATUSES.RUNNING` alone; drop the `thoughts?.some(in_progress)` disjunct in
both. `isActiveWorkflowTurn` becomes a one-line check and drops its `isWorkflow` parameter; remove that
parameter from its callers too: `transformChatBEtoFE:30`, `groupAndTransformHistory:111`,
`transformHistoryGroup:139,170`. `transformWorkflowExecutionHistoryBEtoFE:78`, the only other
`groupAndTransformHistory` caller, already omits `isWorkflow` and needs no change.

**Test changes:**

- `useWorkflowExecutionPoll.test.ts`: invert `polls when executionStatus is missing but a thought is
  still in_progress` → status missing + `in_progress` thought must NOT poll. Add an `it.each` over
  `WORKFLOW_FINAL_STATUSES` (`src/constants/workflows.ts`): final `executionStatus` + thought
  `in_progress: true` → does not poll.
- `chatHelpers.test.ts`: invert `preserves in-progress thoughts on a workflow chat when executionStatus is
  missing but a thought is in_progress` → result must be `inProgress: false`, thought `in_progress: false`,
  `aborted: true`. Add an `it.each` over `WORKFLOW_FINAL_STATUSES` asserting the same outcome. Add one more
  case: an `Interrupted` turn with one thought `interrupted: true` and one stuck `in_progress: true` — the
  interrupted thought keeps `interrupted: true`, the stuck one becomes `aborted: true`, and the turn's
  `inProgress` is `false`.
- Keep green (protect original restore-after-reload behavior): "does not poll when the open chat has no
  In Progress executionStatus", "polls refreshWorkflowExecutionIds every 4s while executionStatus is In
  Progress", the live-stream-exclusion and stopped-generation tests, "preserves in-progress workflow
  thoughts when executionStatus is In Progress", "keeps Thinking state between steps when executionStatus
  is In Progress and no thought is in_progress", "does not treat a succeeded workflow turn as in
  progress", and the non-workflow hydrate tests (e.g. "maps thought in_progress:true to aborted:true in
  history").

## Fix 2 — `usePolling` gets two opt-in options

```ts
interface UsePollingOptions {
  // ...existing fields unchanged...
  pauseWhenHidden?: boolean // default false: stop the timer while document.visibilityState === 'hidden'
  idleBackoff?: { threshold: number; multiplier: number; maxInterval: number } // default unset: no backoff
}
```

**Next-interval rule** (one place decides it; the existing "reschedule only when the interval changes"
pattern stays):

| Fetch result | Next interval | Idle counter |
|---|---|---|
| Error | `min(current + intervalIncrement, maxInterval)` (unchanged) | unchanged |
| Success, `idleBackoff` not set | `interval` (unchanged) | n/a |
| Success, `idleBackoff` set, result is anything but `false` | `interval` | reset to 0 |
| Success, `idleBackoff` set, result `=== false` | if counter+1 ≥ `threshold`: `min(current × multiplier, idleBackoff.maxInterval)`, else `current` | +1 |

Only a strict `false` counts as "no change" — `true`, `undefined`, or any other resolved value counts as
change, so a `fetchFn` that forgets to return a boolean never backs off. Error backoff is unaffected and
independent of the idle counter.

**Visibility rules** (only when `pauseWhenHidden` is true):

- Tab becomes hidden: clear the timer and set `intervalIdRef.current = null` — this matters because
  `executeFetch` only restarts the timer when that ref is set, so a fetch still in flight when the tab
  hides must find it empty and not restart polling in the background. Leave `enabled` and the idle counter
  untouched.
- Tab becomes visible while `enabled`: reset the interval to base and the idle counter to 0, restart the
  timer. If the last fetch finished at least one base interval ago (or none has run yet), also run
  `executeFetch()` immediately. If it finished less than one interval ago, skip the immediate fetch — the
  restarted timer brings the next update within one interval anyway. Track fetch completion time in a new
  `lastFetchAtRef`, set in `executeFetch`'s `finally`.
- Mount, or `enabled` flipping to true, while hidden: do not start the timer; start on the first
  `visibilitychange` to visible.
- The `visibilitychange` listener is added and removed inside the same effect that owns the timer, so
  unmount and `enabled === false` clean it up.
- Keep the existing `isFetchingRef` guard so an immediate fetch on becoming visible and a timer tick can't
  overlap. An immediate fetch that hits the guard is queued, not dropped — see the "`usePolling` race
  handling" addendum.

**Resolved:** `idleBackoff.maxInterval = 30_000` (30s) for the workflow poll — matches
`usePolling`'s existing error-backoff `maxInterval` default, one mental model for "capped backoff" across
both mechanisms.

Both options are unset by every existing caller (`useOAuth.ts`, `usePopupWindow.ts`, `useWorkflowData.ts`,
`useExecutionStates.ts`, `WorkflowExecutions.tsx`) and therefore inert there — `useOAuth` and
`usePopupWindow` must keep polling while hidden.

### `useWorkflowExecutionPoll.ts` wiring

Turns both options on: `WORKFLOW_CHAT_POLL_IDLE_BACKOFF = { threshold: 3, multiplier: 2, maxInterval:
30_000 }`, `pauseWhenHidden: true`. `fetchFn` wraps the existing `chatsStore.refreshWorkflowExecutionIds`
call with a before/after signature comparison over the target chat's workflow-turn progress fields, read
from `chatsStore.openedChatsHistory` directly by chat id (not the `useSnapshot` proxy, not `currentChat`,
to avoid a false "changed" on chat switch), returning whether the signature changed. The intended
signature covers, per workflow turn: `executionId`, `executionStatus`, `inProgress`, response length, and
per-thought `id`, `in_progress`, `aborted`, `interrupted`, and message length, plus the chat's
`isInterrupted` flag — response/thought text length is sufficient because the backend never shrinks a
step's stored text mid-step and always sends `children: []`. **This field list is an unverified design
sketch, not implemented or run** — Stage 4/5 must confirm the exact paths against the real
`HistoryItemBackend`/`ChatMessage` types before coding it. *(Implemented and verified; see the "signature coverage" addendum below.)*

**Test changes:**

- `usePolling.test.tsx`: without the new options, all existing behavior (interval, error backoff, reset on
  success) stays identical. Add cases: `pauseWhenHidden` — no fetch while hidden; immediate fetch on
  becoming visible when the last fetch was ≥ one interval ago; no immediate fetch when it was < one
  interval ago (next fetch comes from the restarted timer); a fetch in flight when the tab hides still
  resolves (success or error) but triggers no further fetch while hidden; enabling while hidden doesn't
  start polling until visible; the listener is removed on unmount and when `enabled` turns false.
  `idleBackoff` — `false` results slow down after `threshold` (gap sequence 4, 4, 4, 8, 16, 30, 30s), one
  `true` resets to 4s; a `fetchFn` resolving to `undefined` never backs off; an error during idle backoff
  still uses additive error backoff and the next success follows the idle rules. Simulate visibility in
  jsdom via `Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden'
  })` followed by `document.dispatchEvent(new Event('visibilitychange'))`.
- `useWorkflowExecutionPoll.test.ts`: add a case asserting the poll passes `pauseWhenHidden` and
  `idleBackoff`, and that `fetchFn` returns `true` when `refreshWorkflowExecutionIds` adds a thought,
  changes `executionStatus`, or changes `isInterrupted`, and `false` when nothing changes. Keep every
  existing test green (starts on `In Progress`, stops on terminal, live-stream exclusion, stopped
  generation).

## Acceptance criteria

- All test cases listed above pass; all "keep green" tests listed above stay green.
- A finished run (any `WORKFLOW_FINAL_STATUSES`) with a stuck `In Progress` thought: 0 polls, chat
  unlocked, stuck step shows `aborted`.
- A running workflow: unchanged polling while visible and changing; paused while hidden; backs off to 30s
  after 3 unchanged polls; resets to 4s on any change; fetches once immediately on becoming visible if the
  last fetch was ≥ one interval old.
- `useOAuth`, `usePopupWindow`, and the three workflow-details pollers behave identically to today (neither
  option passed).

## Non-goals

- No backend change (`finish()` cleanup, answer-text blanking during a stuck step, and crashed-pod
  run-repair are backend follow-up work, out of scope here).
- No change to `chatsStore.refreshWorkflowExecutionIds`'s signature or return type (stays `void`).
- No opt-in of `pauseWhenHidden`/`idleBackoff` for `useOAuth`, `usePopupWindow`, or the workflow-details
  pollers.
- No change to `WORKFLOW_STATUSES` / `WORKFLOW_FINAL_STATUSES`.
- No change to the 4s base interval or the existing error-backoff `intervalIncrement`/`maxInterval`
  defaults.
- No lighter/partial polling endpoint.

## Open risks

- The `fetchFn` signature-comparison field list above is an unimplemented design sketch; the plan must
  confirm exact field paths against the real `HistoryItemBackend`/`ChatMessage` types before
  implementation, not trust it verbatim.
- `usePolling`'s ref/timer interaction (visibility pause + idle backoff layered on existing error backoff)
  has a documented race — an in-flight fetch during tab-hide must not restart the timer — worth
  deliberate test-first coverage.

## Addendum: related duplicate-polling defect found on this branch

While manually verifying this ticket's polling behavior, a pre-existing, independent bug was found:
`chatsStore.getChat()` also started the legacy `pollIncompleteChat` loop for in-progress **workflow**
chats, doubling `GET /conversations/{id}` traffic against `useWorkflowExecutionPoll`. `git blame`
against `main` traces the branch to EPMCDME-14797, predating this ticket. It was not part of this
spec's original Fix 1/Fix 2, but fixing it further reduces redundant polling, reinforcing this
ticket's own polling-efficiency goal. Full detail (root cause, tests, acceptance criteria) lives in
`docs/tasks/2026-09-25-duplicate-workflow-chat-polling.md` and
`docs/superpowers/tasks/2026-09-25-duplicate-workflow-chat-polling/` — not duplicated here.

## Addendum: liveness rule and no attempt cap (review CR-005 / CR-006)

Checked against the backend (`codemie` repo, `service/conversation/history_materializer.py`,
`service/workflow_service.py`):

- A workflow chat turn is stored as a reference (`workflow_execution_ref=True`, `execution_id`) with no
  `in_progress`. On every `GET /conversations/{id}` it is materialized with
  `execution_status = execution.overall_status` and, again, no `in_progress`. So for workflow turns the
  frontend's `inProgress` is exactly `executionStatus === RUNNING`. An `inProgress && !final` fallback in
  `hasInProgressExecution` adds nothing, and Fix 1's RUNNING-only rule stands as written.
- Known gaps, out of scope for this ticket: a turn whose execution cannot be loaded keeps the raw
  reference (no status, so no poll), and the short `Not Started` window before `start_progress()` is
  not treated as live.
- **No attempt/time cap on the workflow poll.** Removing `pollIncompleteChat` for workflow chats also
  removes its cap (`MAX_CHAT_POLL_ATTEMPTS` × `CHAT_POLL_INTERVAL_MS` = 5 min) and its local
  "timed out" finalize. That is intended. The cap would mark any workflow running longer than 5 minutes
  as finished, and the backend is the source of truth for run status. A run the backend keeps at
  `In Progress` keeps polling. Cost stays bounded by idle backoff (≤ 30s) and the hidden-tab pause.

## Addendum: signature coverage and unpaired / status-less turns (review 2026-09-27, CR-001 / CR-002)

Moved and expanded, with the backend source quoted, to **Reviewer notes — verified backend invariants** at
the top of this spec. Both findings are not defects.

## Addendum: `usePolling` race handling (review 2026-09-28)

Fix 2 as first written left four races between in-flight fetches, the timer, and the effect lifecycle.
Each was reproduced by a test in `usePolling.test.tsx` and fixed in `usePolling.tsx`. These are part of
Fix 2, not scope creep.

**Generations.** `generationRef` is bumped on every run of the timer effect (`enabled`, `interval`,
`fetchFn` or an option changing) and on every tab-visible transition. A fetch records the generation it
started under; when it settles under a newer one it does not reschedule the timer, touch the idle
counter or set `lastFetchAt`. It still releases `isFetchingRef`.

| # | Race | Without the fix | Fix |
|---|---|---|---|
| R1 | Chat switch while a fetch for the previous chat is in flight | The late fetch restarts the timer with the previous chat's `fetchFn` | Generation check before rescheduling |
| R2 | Per-target state leaking across a chat switch while `enabled` stays true | The idle count and `lastFetchAt` from chat A back off chat B, or suppress its immediate visible fetch | Reset interval, idle count, `lastFetchAt` and pending refetch on every effect run, not only on disable |
| R3 | Immediate visible fetch requested while a fetch is in flight | The `isFetchingRef` guard silently drops it, so the user waits a full interval | `requestImmediateFetch` queues it (`pendingRefetchRef`). The settling fetch fires it through `latestExecuteFetchRef`, so it targets the current generation. The queue is cleared on hide, on unmount and on a new effect run |
| R4 | A fetch in flight across hide → visible | Its late result undoes the visible reset: `false` bumps the idle count, and an error raises the interval | The visible transition bumps the generation, so the stale result is ignored |

`isFetchingRef` is deliberately not reset with a new generation. A previous generation's fetch still has
side effects (`refreshWorkflowExecutionIds` writes to the store), so new fetches wait for it instead of
overlapping it.

**Related hardening from the same review:**
- `idleBackoff` is keyed on its three numbers, not object identity. An inline object literal would
  otherwise re-run the effect on every render, and the idle count would never reach the threshold.
- `fetchFn` is typed `() => Promise<unknown>` (was `any`), and the option documents that only a strict
  `false` means "no progress".
- The `isTerminalWorkflowTurn` guard in `chatHelpers.ts` (a final `executionStatus` overriding a
  top-level `in_progress`) was removed. By Invariant B the backend never sends a top-level `in_progress`
  on a workflow turn, so the guard could not fire.
