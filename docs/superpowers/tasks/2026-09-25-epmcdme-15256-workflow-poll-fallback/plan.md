# EPMCDME-15256: Workflow Poll Fallback Removal + Hidden-Tab Pause/Idle Backoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop workflow chats from polling forever when a finished run leaves a stuck `In Progress`
thought, and make the shared `usePolling` primitive pause while a tab is hidden and back off when
nothing is changing, wired opt-in into the workflow chat poller only.

**Architecture:** Two independent, composable fixes in the hooks/utils layer. Fix 1 collapses two
liveness checks (`hasInProgressExecution`, `isActiveWorkflowTurn`) from an OR-fallback to
`executionStatus === RUNNING` alone and drops the now-dead `isWorkflow` parameter chain. Fix 2 adds
two opt-in fields to `UsePollingOptions` (`pauseWhenHidden`, `idleBackoff`) built on the hook's
existing ref-based timer, then wires both on for `useWorkflowExecutionPoll` with a `fetchFn` that
detects "nothing changed" via a before/after signature of the polled chat's progress fields.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + `@testing-library/react` (`renderHook`/`act`,
fake timers).

**Spec:** `docs/superpowers/tasks/2026-09-25-epmcdme-15256-workflow-poll-fallback/spec.md` — read
it alongside this plan; it carries the exact next-interval decision table, visibility-transition
rules, and the full test-change tables this plan's steps summarize.

Commit per task using the repository's existing convention (`EPMCDME-15256: <summary>`, ticket
prefix per `git log`).

## Global Constraints

- `pauseWhenHidden` and `idleBackoff` on `UsePollingOptions` default to unset/off — the other 12
  `usePolling` callers (`useOAuth.ts`, `usePopupWindow.ts`, `useWorkflowData.ts`,
  `useExecutionStates.ts`, `WorkflowExecutions.tsx`) must behave identically to today.
- The 4s base interval (`WORKFLOW_CHAT_POLL_INTERVAL_MS`) and the existing error-backoff
  `intervalIncrement`/`maxInterval` defaults do not change.
- `useWorkflowExecutionPoll`'s `idleBackoff.maxInterval` is `30_000` (30s), matching `usePolling`'s
  existing error-backoff `maxInterval` default.
- No backend change, no change to `chatsStore.refreshWorkflowExecutionIds`'s signature/return type
  (stays `void`), no change to `WORKFLOW_STATUSES`/`WORKFLOW_FINAL_STATUSES`.
- Only a strict `=== false` return from `fetchFn` counts as "no change" for idle backoff; `true`,
  `undefined`, or anything else resets the idle counter and interval to base.

## Review Focus

- Switching the open chat mid-poll must not make `useWorkflowExecutionPoll`'s `fetchFn` report a
  false "changed" for the chat it's actually polling — it must compare the polled `chatId` against
  `chatsStore.openedChatsHistory`, not whatever `currentChat` happens to be. Test in Task 5.
- A rejected `chatsStore.refreshWorkflowExecutionIds` call must propagate out of `fetchFn` so
  `usePolling`'s existing error backoff (not the idle-backoff path) engages — a swallowed error
  would silently stop backing off on failure. Test in Task 5.
- Mounting, or `enabled` flipping to `true`, while the tab is already hidden must not start the
  timer at all — it only starts on the first `visibilitychange` to visible. Test in Task 4.
- An `Interrupted` turn with one thought `interrupted: true` and a separate stuck thought
  `in_progress: true`: the interrupted thought must keep `interrupted: true` while only the stuck
  one flips to `aborted: true`, and the turn's `inProgress` must be `false`. Test in Task 1.
- A `fetchFn` that resolves `undefined` (any consumer that forgets the boolean-return contract)
  must never back off, staying at the base interval indefinitely. Test in Task 3.

---

### Task 1: Fix 1 — drop the `isWorkflow` thought-fallback in `chatHelpers.ts`

**Test-first:** yes — inverts `'preserves in-progress thoughts on a workflow chat when
executionStatus is missing but a thought is in_progress'` to assert `inProgress: false` /
`aborted: true`, and adds an `it.each(WORKFLOW_FINAL_STATUSES)` case plus an interrupted-turn
mixed-thoughts case.

**Files:**
- Modify: `src/utils/chatHelpers.ts:30-66` (`transformChatBEtoFE`), `:101-109`
  (`isActiveWorkflowTurn`), `:111-137` (`groupAndTransformHistory`), `:139-221`
  (`transformHistoryGroup`)
- Test: `src/utils/__tests__/chatHelpers.test.ts`

**Interfaces:**
- Produces: `isActiveWorkflowTurn(assistantItem: HistoryItemBackend): boolean` (drops the
  `isWorkflow: boolean` second parameter every caller in this repo used positionally).
- `transformWorkflowExecutionHistoryBEtoFE:78` already calls `groupAndTransformHistory(historyBE,
  {})` with no `isWorkflow` — confirmed by codegraph in Stage 1 research; no change needed there.

- [ ] **Step 1: Write the failing tests**

In `src/utils/__tests__/chatHelpers.test.ts`, add `WORKFLOW_FINAL_STATUSES` to the existing
`import { WORKFLOW_STATUSES } from '@/constants/workflows'` line, then replace the test named
`'preserves in-progress thoughts on a workflow chat when executionStatus is missing but a thought
is in_progress'` (currently ~line 350) with its inversion, and add two new cases using the existing
`workflowHistoryChat` helper (~line 251):

```ts
it('does not preserve in-progress thoughts on a workflow chat when executionStatus is missing but a thought is in_progress', () => {
  const result = transformChatBEtoFE(
    workflowHistoryChat({
      executionStatus: undefined,
      thoughts: [{ id: 's1', message: '', in_progress: true, interrupted: false }],
    })
  )
  const message = result.history[0]![0]!
  expect(message.inProgress).toBe(false)
  expect(message.thoughts![0]!.in_progress).toBe(false)
  expect(message.thoughts![0]!.aborted).toBe(true)
})

it.each(WORKFLOW_FINAL_STATUSES)(
  'treats a stuck in_progress thought as not in progress when executionStatus is %s',
  (status) => {
    const result = transformChatBEtoFE(
      workflowHistoryChat({
        executionStatus: status,
        thoughts: [{ id: 's1', message: '', in_progress: true, interrupted: false }],
      })
    )
    const message = result.history[0]![0]!
    expect(message.inProgress).toBe(false)
    expect(message.thoughts![0]!.in_progress).toBe(false)
    expect(message.thoughts![0]!.aborted).toBe(true)
  }
)

it('flags only the stuck thought as aborted on an interrupted turn with one interrupted and one stuck thought', () => {
  const result = transformChatBEtoFE(
    workflowHistoryChat({
      executionStatus: WORKFLOW_STATUSES.INTERRUPTED,
      thoughts: [
        { id: 's1', message: '', in_progress: false, interrupted: true },
        { id: 's2', message: '', in_progress: true, interrupted: false },
      ],
    })
  )
  const message = result.history[0]![0]!
  expect(message.inProgress).toBe(false)
  expect(message.thoughts![0]!.interrupted).toBe(true)
  expect(message.thoughts![0]!.aborted).toBe(false)
  expect(message.thoughts![1]!.interrupted).toBe(false)
  expect(message.thoughts![1]!.aborted).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify the new/changed cases fail**

Run: `npx vitest run src/utils/__tests__/chatHelpers.test.ts`
Expected: the three cases above FAIL (current code still ORs in the thought fallback).

- [ ] **Step 3: Implement**

Replace `isActiveWorkflowTurn` (`chatHelpers.ts:101-109`) with:

```ts
const isActiveWorkflowTurn = (assistantItem: HistoryItemBackend): boolean =>
  assistantItem.executionStatus === WORKFLOW_STATUSES.RUNNING
```

Then remove the `isWorkflow` parameter end-to-end: drop `isWorkflow: transformedChat.isWorkflow`
from the `groupAndTransformHistory` call in `transformChatBEtoFE` (line ~62); drop `isWorkflow` from
`groupAndTransformHistory`'s destructured options type and from its call to `transformHistoryGroup`
(lines 111-137); drop `isWorkflow` from `transformHistoryGroup`'s destructured options type and
change its call site at line 170 from `isActiveWorkflowTurn(assistantItem, isWorkflow)` to
`isActiveWorkflowTurn(assistantItem)`.

- [ ] **Step 4: Run tests to verify they pass, and confirm the keep-green list stays green**

Run: `npx vitest run src/utils/__tests__/chatHelpers.test.ts`
Expected: PASS, including the three cases above and the untouched pre-existing cases —
`'maps thought in_progress:true to aborted:true in history'`,
`'preserves in-progress workflow thoughts when executionStatus is In Progress'`,
`'keeps Thinking state between steps when executionStatus is In Progress and no thought is
in_progress'`, `'does not treat a succeeded workflow turn as in progress'`.

- [ ] **Step 5: Commit**

---

### Task 2: Fix 1 — drop the thought-fallback in `useWorkflowExecutionPoll.ts`

**Test-first:** yes — inverts `'polls when executionStatus is missing but a thought is still
in_progress'` to assert no poll, and adds an `it.each(WORKFLOW_FINAL_STATUSES)` no-poll case.

**Files:**
- Modify: `src/pages/chat/hooks/useWorkflowExecutionPoll.ts:27-36` (`hasInProgressExecution`)
- Test: `src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`

**Interfaces:**
- Produces: `hasInProgressExecution(chat): boolean` — same signature, liveness now decided by
  `executionStatus === WORKFLOW_STATUSES.RUNNING` alone.

- [ ] **Step 1: Write the failing tests**

In `useWorkflowExecutionPoll.test.ts`, add `import { WORKFLOW_STATUSES, WORKFLOW_FINAL_STATUSES }
from '@/constants/workflows'`. Replace the test named `'polls when executionStatus is missing but a
thought is still in_progress'` (~line 102) with its inversion, and add an `it.each` case:

```ts
it('does not poll when executionStatus is missing even if a thought is still in_progress', async () => {
  mockChatsStore.currentChat = {
    id: 'chat-1',
    isWorkflow: true,
    history: [
      [
        {
          executionId: 'exec-1',
          inProgress: true,
          thoughts: [{ in_progress: true }],
        },
      ],
    ],
  }
  renderHook(() => useWorkflowExecutionPoll('chat-1'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
})

it.each(WORKFLOW_FINAL_STATUSES)(
  'does not poll when executionStatus is %s even if a thought is still in_progress',
  async (status) => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      history: [
        [
          {
            executionId: 'exec-1',
            executionStatus: status,
            inProgress: false,
            thoughts: [{ in_progress: true }],
          },
        ],
      ],
    }
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  }
)
```

(`WORKFLOW_STATUSES` import is unused by these two cases alone but is added now since Task 5 reuses
this import block.)

- [ ] **Step 2: Run tests to verify the new/changed cases fail**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`
Expected: FAIL — the current OR-fallback still polls on a stuck thought regardless of status.

- [ ] **Step 3: Implement**

Replace `hasInProgressExecution` (`useWorkflowExecutionPoll.ts:27-36`) with:

```ts
const hasInProgressExecution = (chat: typeof chatsStore.currentChat): boolean =>
  !!chat?.history?.some((group) =>
    group.some(
      (message) =>
        !message.generationStopped &&
        !isLiveStreaming(message) &&
        message.executionStatus === WORKFLOW_STATUSES.RUNNING
    )
  )
```

- [ ] **Step 4: Run tests to verify they pass, and confirm the keep-green list stays green**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`
Expected: PASS, including `'does not poll when the open chat has no In Progress executionStatus'`,
`'polls refreshWorkflowExecutionIds every 4s while executionStatus is In Progress'`,
`'does not poll while a live stream is open even if thoughts are in_progress'`,
`'does not poll after the user stopped generation on this page'`, `'stops polling after unmount'`.

- [ ] **Step 5: Commit**

---

### Task 3: Fix 2 — add `idleBackoff` to `usePolling`

**Test-first:** yes — new cases asserting the gap sequence 4/4/4/8/16/30/30s under `threshold:3,
multiplier:2, maxInterval:30000`, a reset to base on a `true` result, no backoff on `undefined`, and
additive error backoff staying independent of the idle counter.

**Files:**
- Modify: `src/hooks/usePolling.tsx:18-24` (`UsePollingOptions`), `:37-67` (`executeFetch`)
- Test: `src/hooks/__tests__/usePolling.test.tsx`

**Interfaces:**
- Produces: `UsePollingOptions.idleBackoff?: { threshold: number; multiplier: number; maxInterval:
  number }`. `fetchFn`'s resolved value is now inspected: strict `=== false` is "unchanged", anything
  else (including `undefined`) is "changed".

- [ ] **Step 1: Write the failing tests**

Add to `usePolling.test.tsx`:

```ts
it('backs off after threshold consecutive unchanged results and resets on a changed result', async () => {
  const fetchFn = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true)

  renderHook(() =>
    usePolling({
      fetchFn,
      enabled: true,
      interval: 4000,
      idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
    })
  )

  const gaps = [4000, 4000, 4000, 8000, 16000, 30000, 30000]
  for (let i = 0; i < gaps.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await vi.advanceTimersByTimeAsync(gaps[i])
    })
    expect(fetchFn).toHaveBeenCalledTimes(i + 1)
  }

  // the 7th result was `true`: interval reset to base
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(fetchFn).toHaveBeenCalledTimes(8)
})

it('never backs off when fetchFn resolves undefined', async () => {
  const fetchFn = vi.fn().mockResolvedValue(undefined)
  renderHook(() =>
    usePolling({
      fetchFn,
      enabled: true,
      interval: 4000,
      idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
    })
  )
  for (let i = 0; i < 5; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
  }
  expect(fetchFn).toHaveBeenCalledTimes(5)
})

it('uses additive error backoff during idle backoff, then resumes idle rules on the next success', async () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const fetchFn = vi
    .fn()
    .mockResolvedValueOnce(false) // counter 1, interval stays 4000
    .mockResolvedValueOnce(false) // counter 2, interval stays 4000
    .mockResolvedValueOnce(false) // counter 3 >= threshold, interval -> 8000
    .mockRejectedValueOnce(new Error('network')) // error backoff: 8000+2000=10000, counter unchanged
    .mockResolvedValueOnce(false) // counter 4 >= threshold, interval -> min(10000*2,30000)=20000

  renderHook(() =>
    usePolling({
      fetchFn,
      enabled: true,
      interval: 4000,
      intervalIncrement: 2000,
      maxInterval: 30000,
      idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
    })
  )

  const gaps = [4000, 4000, 4000, 8000, 10000]
  for (const gap of gaps) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await vi.advanceTimersByTimeAsync(gap)
    })
  }
  expect(fetchFn).toHaveBeenCalledTimes(5)
  expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/usePolling.test.tsx`
Expected: FAIL — `idleBackoff` doesn't exist yet, so the interval never changes on `false`.

- [ ] **Step 3: Implement**

Add `idleBackoff?: { threshold: number; multiplier: number; maxInterval: number }` to
`UsePollingOptions` (`usePolling.tsx:18-24`), destructure it in `usePolling`'s params, and add a new
`idleCountRef = useRef(0)` next to the existing three refs. In `executeFetch`'s success branch
(`usePolling.tsx:42-51`), capture `fetchFn()`'s resolved value and, when `idleBackoff` is set, drive
the next interval from it before the existing "reschedule only if changed" `clearInterval`/
`setInterval` block: `result === false` increments `idleCountRef.current` and, once it reaches
`idleBackoff.threshold`, sets the next interval to `Math.min(currentIntervalRef.current *
idleBackoff.multiplier, idleBackoff.maxInterval)` (otherwise the interval stays at its current
value); any other resolved value resets `idleCountRef.current = 0` and the next interval to the base
`interval`. The existing error-catch branch (`usePolling.tsx:52-63`) is untouched — it does not read
or reset `idleCountRef`, matching the spec's "error backoff is unaffected and independent of the
idle counter".

- [ ] **Step 4: Run tests to verify they pass, and confirm existing behavior is unaffected**

Run: `npx vitest run src/hooks/__tests__/usePolling.test.tsx`
Expected: PASS — the three new cases plus all 16 pre-existing cases (interval/error-backoff/reset/
in-flight-guard/unmount/rapid-toggle/dynamic-interval), none of which set `idleBackoff`.

- [ ] **Step 5: Commit**

---

### Task 4: Fix 2 — add `pauseWhenHidden` to `usePolling`

**Test-first:** yes — new cases asserting no fetch while hidden, an immediate fetch on becoming
visible only when the last fetch was ≥ one interval old, no timer restart for a fetch that resolves
after the tab hid, and listener add/remove on `enabled` toggling and unmount.

**Files:**
- Modify: `src/hooks/usePolling.tsx:18-24` (`UsePollingOptions`), `:37-67` (`executeFetch`'s
  `finally`, for `lastFetchAtRef`), `:69-89` (mount/`enabled` effect)
- Test: `src/hooks/__tests__/usePolling.test.tsx`

**Interfaces:**
- Consumes: `idleCountRef`, `currentIntervalRef` from Task 3's `usePolling.tsx` changes (same file).
- Produces: `UsePollingOptions.pauseWhenHidden?: boolean`.

- [ ] **Step 1: Write the failing tests**

Add a `setVisibility` helper and an `afterEach` reset near the top of the `describe` block, plus
four cases:

```ts
const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}
```

Add `setVisibility('visible')` to the existing `afterEach` so visibility state doesn't bleed
between tests, then add:

```ts
it('does not start polling while mounted hidden, and fetches immediately once visible', async () => {
  const fetchFn = vi.fn().mockResolvedValue(undefined)
  setVisibility('hidden')

  renderHook(() => usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10000)
  })
  expect(fetchFn).not.toHaveBeenCalled()

  await act(async () => {
    setVisibility('visible')
  })
  expect(fetchFn).toHaveBeenCalledTimes(1)
})

it('skips the immediate re-fetch on becoming visible if the last fetch was under one interval ago', async () => {
  const fetchFn = vi.fn().mockResolvedValue(undefined)
  renderHook(() => usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(fetchFn).toHaveBeenCalledTimes(1)

  await act(async () => {
    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(1000)
  })
  expect(fetchFn).toHaveBeenCalledTimes(1)

  await act(async () => {
    setVisibility('visible')
  })
  expect(fetchFn).toHaveBeenCalledTimes(1) // last fetch was 1s ago, under the 4s interval

  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(fetchFn).toHaveBeenCalledTimes(2)
})

it('does not restart the timer while hidden even if a fetch was still in flight when the tab hid', async () => {
  let resolveFetch: () => void = () => {}
  const fetchFn = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveFetch = resolve
      })
  )
  renderHook(() => usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(fetchFn).toHaveBeenCalledTimes(1)

  setVisibility('hidden')
  await act(async () => {
    resolveFetch()
    await Promise.resolve()
  })

  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000)
  })
  expect(fetchFn).toHaveBeenCalledTimes(1)
})

it('removes the visibilitychange listener on unmount and when enabled turns false', async () => {
  const fetchFn = vi.fn().mockResolvedValue(undefined)
  const addSpy = vi.spyOn(document, 'addEventListener')
  const removeSpy = vi.spyOn(document, 'removeEventListener')

  const { rerender, unmount } = renderHook(
    ({ enabled }) => usePolling({ fetchFn, enabled, interval: 4000, pauseWhenHidden: true }),
    { initialProps: { enabled: true } }
  )
  expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

  act(() => rerender({ enabled: false }))
  expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

  addSpy.mockClear()
  act(() => rerender({ enabled: true }))
  expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

  unmount()
  expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/usePolling.test.tsx`
Expected: FAIL — no `visibilitychange` handling exists yet, so the hook polls while hidden and never
adds/removes a listener.

- [ ] **Step 3: Implement**

Add `pauseWhenHidden?: boolean` to `UsePollingOptions` and destructure it. Add `lastFetchAtRef =
useRef<number | null>(null)`, set to `Date.now()` in `executeFetch`'s `finally` block
(`usePolling.tsx:64-66`) so both the success and error paths record it.

Rewrite the mount/`enabled` effect (`usePolling.tsx:69-89`): factor timer start into a local
`startTimer()` closure; when `enabled`, only call it immediately if `!pauseWhenHidden ||
document.visibilityState !== 'hidden'` (mount-while-hidden starts nothing). When `pauseWhenHidden`
is true, `document.addEventListener('visibilitychange', handleVisibilityChange)` inside the same
effect, where `handleVisibilityChange`: on `'hidden'`, `clearInterval` and set
`intervalIdRef.current = null` (this is the race the spec flags — `executeFetch`'s reschedule logic
only fires when `intervalIdRef.current` is truthy, so a fetch resolving after the tab hides finds it
`null` and does not resurrect the timer); on visible, reset `currentIntervalRef.current = interval`
and `idleCountRef.current = 0`, call `startTimer()`, and call `executeFetch()` immediately only if
`lastFetchAtRef.current === null || Date.now() - lastFetchAtRef.current >= interval`. The effect's
cleanup clears the interval and, when `pauseWhenHidden`, removes the listener — unchanged from the
existing pattern of owning both inside one effect.

- [ ] **Step 4: Run tests to verify they pass, and confirm existing behavior is unaffected**

Run: `npx vitest run src/hooks/__tests__/usePolling.test.tsx`
Expected: PASS — the four new cases, Task 3's three `idleBackoff` cases, and all 16 pre-existing
cases (none of which set `pauseWhenHidden`).

- [ ] **Step 5: Commit**

---

### Task 5: Wire `useWorkflowExecutionPoll` to `pauseWhenHidden` + `idleBackoff`

**Test-first:** yes — new cases asserting the pause/resume-while-hidden behavior, idle backoff after
repeated unchanged polls, no backoff while progress keeps changing, correct chat-id comparison on
chat switch, and error propagation, all against the real (unmocked) `usePolling`.

**Files:**
- Modify: `src/pages/chat/hooks/useWorkflowExecutionPoll.ts:38-56` (`useWorkflowExecutionPoll`)
- Test: `src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`

**Interfaces:**
- Consumes: `UsePollingOptions.pauseWhenHidden`/`idleBackoff` from Tasks 3-4;
  `chatsStore.openedChatsHistory: Conversation[]`, `chatsStore.refreshWorkflowExecutionIds(id):
  Promise<void>` (unchanged store API).
- Produces: `progressSignature(chat: Conversation): string` — a new module-private helper.

- [ ] **Step 1: Update the test mock fixture and write the failing tests**

The mocked `chatsStore` in `useWorkflowExecutionPoll.test.ts` (~lines 21-39) currently only exposes
`currentChat`/`refreshWorkflowExecutionIds`, but `fetchFn` will now read `openedChatsHistory`
directly. Add `openedChatsHistory: [] as typeof mockChatsStore.currentChat[]` to the hoisted mock
object, and add a `setOpenChat` helper used by every test in place of a bare `mockChatsStore.currentChat
= {...}` assignment, so both stay in sync:

```ts
const setOpenChat = (chat: NonNullable<typeof mockChatsStore.currentChat>) => {
  mockChatsStore.currentChat = chat
  mockChatsStore.openedChatsHistory = [chat]
}
```

Replace each of the file's existing seven `mockChatsStore.currentChat = {...}` assignments with
`setOpenChat({...})` (same object literal, just routed through the helper) and reset
`mockChatsStore.openedChatsHistory = []` alongside `mockChatsStore.currentChat = null` in
`beforeEach`. Then add:

```ts
it('does not poll while the tab is hidden, and resumes when visible again', async () => {
  setOpenChat({
    id: 'chat-1',
    isWorkflow: true,
    history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
  })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })

  renderHook(() => useWorkflowExecutionPoll('chat-1'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000)
  })
  expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()

  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledWith('chat-1')
})

it('backs off the polling interval after repeated unchanged fetches', async () => {
  setOpenChat({
    id: 'chat-1',
    isWorkflow: true,
    history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
  })
  renderHook(() => useWorkflowExecutionPoll('chat-1'))

  const gaps = [4000, 4000, 4000, 8000]
  for (const gap of gaps) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await vi.advanceTimersByTimeAsync(gap)
    })
  }
  expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledTimes(4)
})

it('does not back off while refreshWorkflowExecutionIds keeps adding progress', async () => {
  const chat = {
    id: 'chat-1',
    isWorkflow: true,
    history: [
      [{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1', thoughts: [] as { in_progress?: boolean }[] }],
    ],
  }
  setOpenChat(chat)
  let call = 0
  mockChatsStore.refreshWorkflowExecutionIds.mockImplementation(async () => {
    call += 1
    chat.history[0][0].thoughts = [{ in_progress: true }, ...Array(call).fill({ in_progress: true })]
  })

  renderHook(() => useWorkflowExecutionPoll('chat-1'))
  for (let i = 0; i < 4; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
  }
  // stayed at the base 4s interval for all 4 polls -> 4 calls in 16s, no backoff
  expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledTimes(4)
})

it('compares the polled chat by id, unaffected by switching the open chat mid-poll', async () => {
  const chatA = {
    id: 'chat-1',
    isWorkflow: true,
    history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
  }
  const chatB = {
    id: 'chat-2',
    isWorkflow: true,
    history: [[{ executionStatus: 'Succeeded', inProgress: false, executionId: 'exec-2' }]],
  }
  mockChatsStore.currentChat = chatA
  mockChatsStore.openedChatsHistory = [chatA, chatB]

  renderHook(() => useWorkflowExecutionPoll('chat-1'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledWith('chat-1')

  mockChatsStore.currentChat = chatB
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledTimes(2)
})

it('lets a refreshWorkflowExecutionIds rejection propagate to usePolling error backoff', async () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  setOpenChat({
    id: 'chat-1',
    isWorkflow: true,
    history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
  })
  mockChatsStore.refreshWorkflowExecutionIds.mockRejectedValueOnce(new Error('network'))

  renderHook(() => useWorkflowExecutionPoll('chat-1'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error))
})
```

Add `Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible'
})` to the file's `afterEach` so visibility doesn't bleed into other tests.

- [ ] **Step 2: Run tests to verify the new cases fail and existing cases still pass on the mock refactor alone**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`
Expected: the five new cases FAIL (hidden-pause/idle-backoff not wired yet); the seven pre-existing
cases still PASS after the `setOpenChat` refactor (proves the refactor alone is behavior-preserving).

- [ ] **Step 3: Confirm the `progressSignature` field paths against the real types**

Before implementing, re-read `src/types/entity/conversation.ts`'s `Conversation`, `ChatMessage`, and
`Thought` interfaces to confirm the field paths below exist as written (they were confirmed during
planning: `Conversation.isInterrupted?: boolean`, `Conversation.history: ChatHistoryGroup[]` where
`ChatHistoryGroup = ChatMessage[]`; `ChatMessage.executionId: string | null`,
`.executionStatus?: WorkflowExecutionStatus | null`, `.inProgress?: boolean`, `.response?: string`,
`.thoughts?: Thought[]`; `Thought.id: string`, `.in_progress: boolean`, `.aborted?: boolean`,
`.interrupted?: boolean`, `.message: string`). This step exists because the spec's field-list sketch
is explicitly unverified — treat this confirmation as required, not optional.

- [ ] **Step 4: Implement**

Add to `useWorkflowExecutionPoll.ts`, alongside the existing `WORKFLOW_CHAT_POLL_INTERVAL_MS`
constant:

```ts
import type { Conversation } from '@/types/entity/conversation'

const WORKFLOW_CHAT_POLL_IDLE_BACKOFF = { threshold: 3, multiplier: 2, maxInterval: 30_000 }

const progressSignature = (chat: Conversation): string =>
  JSON.stringify({
    isInterrupted: chat.isInterrupted ?? false,
    history: chat.history.map((group) =>
      group.map((message) => ({
        executionId: message.executionId,
        executionStatus: message.executionStatus ?? null,
        inProgress: message.inProgress ?? false,
        responseLength: message.response?.length ?? 0,
        thoughts: (message.thoughts ?? []).map((thought) => ({
          id: thought.id,
          in_progress: thought.in_progress,
          aborted: thought.aborted ?? false,
          interrupted: thought.interrupted ?? false,
          messageLength: thought.message?.length ?? 0,
        })),
      }))
    ),
  })
```

Replace the existing `fetchFn` (`useWorkflowExecutionPoll.ts:46-49`) so it reads the polled chat from
`chatsStore.openedChatsHistory` by `chatId` (not `currentChat`, not the `useSnapshot` proxy) before
and after calling `refreshWorkflowExecutionIds`, and returns whether the signature changed:

```ts
const fetchFn = useCallback(async () => {
  if (!chatId) return false
  const findChat = () => chatsStore.openedChatsHistory.find((chat) => chat.id === chatId)

  const before = findChat()
  const beforeSignature = before ? progressSignature(before) : null

  await chatsStore.refreshWorkflowExecutionIds(chatId)

  const after = findChat()
  const afterSignature = after ? progressSignature(after) : null

  return beforeSignature !== afterSignature
}, [chatId])
```

Add `pauseWhenHidden: true` and `idleBackoff: WORKFLOW_CHAT_POLL_IDLE_BACKOFF` to the `usePolling`
call (`useWorkflowExecutionPoll.ts:51-55`).

- [ ] **Step 5: Run tests to verify they pass, and confirm the keep-green list stays green**

Run: `npx vitest run src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`
Expected: PASS — all five new cases, plus the seven pre-existing ones (starts on `In Progress`,
stops on terminal/final statuses, live-stream exclusion, stopped generation, unmount cleanup) still
green through the `setOpenChat` mock refactor.

- [ ] **Step 6: Commit**

---

## Self-Review

**Spec coverage:** Fix 1's `hasInProgressExecution`/`isActiveWorkflowTurn` collapse and the
`isWorkflow` parameter removal are Tasks 1-2. Fix 2's `UsePollingOptions` additions, the
next-interval decision table, and the visibility-transition rules (including the in-flight-fetch
race) are Tasks 3-4. The `useWorkflowExecutionPoll` wiring and `progressSignature` sketch
verification are Task 5. The spec's acceptance criteria (0 polls on a finished+stuck run, unchanged
polling while live, pause while hidden, 30s backoff after 3 unchanged polls, reset on change,
immediate fetch on becoming visible when due, other five `usePolling` callers unaffected) are each
covered by a named test above.

**Placeholder scan:** No task step is code-free; every "write the failing test" step has runnable
assertions naming the exact expected values, not descriptions of them.

**Type consistency:** `isActiveWorkflowTurn(assistantItem: HistoryItemBackend)` (Task 1) is used the
same way at its one call site (Task 1, `transformHistoryGroup`). `hasInProgressExecution` (Task 2)
keeps its existing signature. `UsePollingOptions.idleBackoff`/`pauseWhenHidden` (Tasks 3-4) and
`progressSignature`/`fetchFn`'s `Promise<boolean>` return (Task 5) are used consistently across the
tasks that introduce and consume them.

**Review Focus:** the five items above each cite the task and test that covers them; none are
speculative additions without an owning test.

## Negative-Constraint Pass

- No backend change — no task touches any backend/API surface; all five tasks are frontend-only
  edits to `src/`. Honored.
- No change to `chatsStore.refreshWorkflowExecutionIds`'s signature/return type (stays `void`) —
  Task 5's `fetchFn` calls it exactly as before (`await chatsStore.refreshWorkflowExecutionIds(chatId)`)
  and derives the boolean itself from a before/after signature; the store method's own signature is
  untouched. Honored.
- No opt-in of `pauseWhenHidden`/`idleBackoff` for `useOAuth`, `usePopupWindow`, or the
  workflow-details pollers — only Task 5 (`useWorkflowExecutionPoll.ts`) sets either option; no
  other `usePolling` call site is touched by any task, and Tasks 3-4's tests explicitly assert the
  16 pre-existing `usePolling` cases (none of which set the new options) stay green. Honored.
- No change to `WORKFLOW_STATUSES`/`WORKFLOW_FINAL_STATUSES` — no task modifies
  `src/constants/workflows.ts`; both are only consumed (Tasks 1-2, 5). Honored.
- No change to the 4s base interval or the existing error-backoff `intervalIncrement`/`maxInterval`
  defaults — Tasks 3-4 add new optional fields and new refs only; the existing `interval = 5000`,
  `maxInterval = 30000`, `intervalIncrement = 2000` defaults and the error-catch branch's math are
  left as-is. Honored.
- No lighter/partial polling endpoint — no task adds any new network call; `fetchFn` wraps the
  existing full-conversation `refreshWorkflowExecutionIds` GET. Honored.
- "Only a strict `false` counts as change... a `fetchFn` that forgets to return a boolean never backs
  off" — Task 3's implementation branches on `result === false` specifically (not falsy), and its
  `'never backs off when fetchFn resolves undefined'` test pins this. Honored.
- `fetchFn` must read the polled chat from `openedChatsHistory` by id, "not the `useSnapshot` proxy,
  not `currentChat`, to avoid a false 'changed' on chat switch" — Task 5's `fetchFn` and its
  chat-switch test enforce this directly. Honored.

### Task 6 (addendum): Duplicate workflow-chat polling fix

`chatsStore.getChat()`'s `hasInProgress` branch (`src/store/chats.ts`) called the legacy
`pollIncompleteChat` loop for any in-progress chat, including workflow chats already tracked by
`useWorkflowExecutionPoll`, doubling `GET /conversations/{id}` traffic. The fix scopes that fallback
poll to non-workflow chats only, so a workflow chat is never double-polled regardless of
`openedChat`. Root cause, tests, and acceptance criteria live in this addendum's own task's
`spec.md`/`plan.md` under
`docs/superpowers/tasks/2026-09-25-duplicate-workflow-chat-polling/` — not repeated here.
