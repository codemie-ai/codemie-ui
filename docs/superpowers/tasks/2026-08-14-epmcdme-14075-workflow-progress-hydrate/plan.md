# Restore workflow chat progress after reload

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development (sdlc-light Stage 4 — inline TDD, no subagent per task). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After reloading a workflow chat mid-run, hydrate the current IN PROGRESS step (not Interrupted / blank) and keep polling `GET v1/conversations/{id}` until the execution is terminal.

**Architecture:** Fix `transformHistoryGroup` so an assistant turn with `executionStatus === 'In Progress'` keeps backend thought `in_progress` and message `inProgress`. After `getChat`, a ChatPage hook polls the same conversation GET every 4s and patches the open message in place (`refreshWorkflowExecutionIds`) — never `setOpenChat`, which ignores payloads while any message is `inProgress`. Empty workflow answers with no thoughts and no live status show restore-failed copy.

**Tech Stack:** React 18, Valtio, Vitest + RTL, existing `usePolling`, `GET v1/conversations/{id}`.

## Global Constraints

- Ticket: `EPMCDME-14075`. Commits: `EPMCDME-14075: Capital sentence` (first word after colon capitalized, no trailing period).
- Branch: `EPMCDME-14075_workflow-progress-hydrate`. Do not commit `vite.config.ts` (local proxy).
- Keep non-workflow hydrate remap: thought `in_progress: true` → `interrupted: true`, `in_progress: false`.
- No SSE rejoin. No `api.*` in pages/hooks. Poll via `chatsStore` only.
- Poll while `executionStatus === 'In Progress'` (`WORKFLOW_STATUSES.RUNNING`), not “any non-final status”.
- Between steps there may be no `in_progress` thought; `inProgress` follows `executionStatus`, not thought flags alone.
- Thought JSON stays snake_case; message fields camelCase (`executionStatus`, `workflowExecutionRef`, `inProgress`).
- Poll interval: `4000` ms (same literal as Workflow Details). `usePolling` already clears on unmount / `enabled === false`.
- License header on every new `src/` file (Apache 2.0, Copyright 2026 EPAM Systems, Inc.).
- Intra-step token streaming after reload is not required.

## Requirements

Ticket EPMCDME-14075: reload during a workflow chat step must restore the current step card (IN PROGRESS / Thinking…) and continue showing later steps until a terminal status. Non-workflow cut streams stay Interrupted. Consume backend conversation GET contract (`executionId`, `executionStatus`, `workflowExecutionRef`, snake_case thoughts). If nothing can be restored, show a clear message instead of a blank answer node.

## File structure

| File | Responsibility |
|---|---|
| `src/types/entity/conversation.ts` | Add `executionStatus`, `workflowExecutionRef` on `ChatMessage` and `HistoryItemBackend` |
| `src/utils/chatHelpers.ts` | Conditional preserve of live workflow progress in `transformHistoryGroup` |
| `src/utils/__tests__/chatHelpers.test.ts` | Hydrate preserve vs remap cases |
| `src/store/chats.ts` | Always patch thoughts/response/`inProgress`/status in `refreshWorkflowExecutionIds` |
| `src/store/__tests__/chats.refreshWorkflowExecutionIds.test.ts` | In-place patch + `setOpenChat` guard |
| `src/pages/chat/hooks/useWorkflowExecutionPoll.ts` | 4s poll while status is In Progress |
| `src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts` | Poll start/stop/unmount |
| `src/pages/chat/ChatPage.tsx` | Call the poll hook after `getChat` |
| `src/constants/chats.ts` | Restore-failed copy constant |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` | Empty-state copy |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx` | Empty-state cases |

---

### Task 1: Preserve live workflow progress on hydrate

**Test-first: yes — workflow `executionStatus: 'In Progress'` + thought `in_progress: true` currently hydrates as `interrupted: true` / `in_progress: false` / `inProgress: false`.**

**Files:**
- Modify: `src/types/entity/conversation.ts` (`ChatMessage`, `HistoryItemBackend`)
- Modify: `src/utils/chatHelpers.ts` (`groupAndTransformHistory`, `transformHistoryGroup`)
- Test: `src/utils/__tests__/chatHelpers.test.ts`

**Interfaces:**
- Consumes: `WORKFLOW_STATUSES.RUNNING` (`'In Progress'`) from `@/constants/workflows`; `WorkflowExecutionStatus` from `@/types/entity/workflow`
- Produces: `HistoryItemBackend.executionStatus?: WorkflowExecutionStatus \| null`, `HistoryItemBackend.workflowExecutionRef?: boolean`; same fields on `ChatMessage`. `transformChatBEtoFE` copies them and, for an active workflow turn, preserves thought `in_progress` and sets `inProgress: true`.

- [ ] **Step 1: Write the failing tests**

Keep the existing non-workflow test (`maps thought in_progress:true to interrupted:true`). Add these cases to `describe('transformChatBEtoFE')` in `src/utils/__tests__/chatHelpers.test.ts`.

Use this factory (place above the new tests):

```ts
import { WORKFLOW_STATUSES } from '@/constants/workflows'

const workflowHistoryChat = (
  assistantOverrides: Record<string, unknown> = {},
  chatOverrides: Record<string, unknown> = {}
): ChatBackend =>
  ({
    id: 'wf-1',
    conversation_name: 'WF',
    assistant_ids: [],
    initial_assistant_id: '',
    assistant_data: [],
    is_workflow: true,
    history: [
      { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
      {
        historyIndex: 0,
        message: '',
        date: '2024-01-01',
        executionId: 'exec-1',
        workflowExecutionRef: true,
        executionStatus: WORKFLOW_STATUSES.RUNNING,
        thoughts: [
          {
            id: 's1',
            author_name: 'Find Items Todo',
            author_type: 'WorkflowState',
            message: '',
            input_text: 'Find changes',
            in_progress: true,
            interrupted: false,
            aborted: false,
          },
        ],
        ...assistantOverrides,
      },
    ],
    ...chatOverrides,
  }) as ChatBackend
```

Tests:

```ts
it('preserves in-progress workflow thoughts when executionStatus is In Progress', () => {
  const result = transformChatBEtoFE(workflowHistoryChat())
  const message = result.history[0]![0]!
  expect(message.inProgress).toBe(true)
  expect(message.executionId).toBe('exec-1')
  expect(message.executionStatus).toBe(WORKFLOW_STATUSES.RUNNING)
  expect(message.workflowExecutionRef).toBe(true)
  expect(message.thoughts![0]!.in_progress).toBe(true)
  expect(message.thoughts![0]!.interrupted).toBe(false)
})

it('keeps Thinking state between steps when executionStatus is In Progress and no thought is in_progress', () => {
  const result = transformChatBEtoFE(
    workflowHistoryChat({
      thoughts: [
        {
          id: 's1',
          author_name: 'Find Items Todo',
          author_type: 'WorkflowState',
          message: 'done',
          in_progress: false,
          interrupted: false,
          aborted: false,
        },
      ],
    })
  )
  const message = result.history[0]![0]!
  expect(message.inProgress).toBe(true)
  expect(message.thoughts![0]!.in_progress).toBe(false)
  expect(message.thoughts![0]!.interrupted).toBe(false)
})

it('does not treat a succeeded workflow turn as in progress', () => {
  const result = transformChatBEtoFE(
    workflowHistoryChat({
      executionStatus: WORKFLOW_STATUSES.SUCCEEDED,
      message: 'final',
      thoughts: [
        {
          id: 's1',
          author_name: 'Find Items Todo',
          author_type: 'WorkflowState',
          message: 'done',
          in_progress: false,
          interrupted: false,
          aborted: false,
        },
      ],
    })
  )
  const message = result.history[0]![0]!
  expect(message.inProgress).toBe(false)
  expect(message.executionStatus).toBe(WORKFLOW_STATUSES.SUCCEEDED)
  expect(message.thoughts![0]!.in_progress).toBe(false)
  expect(message.thoughts![0]!.interrupted).toBe(false)
})

it('preserves in-progress thoughts on a workflow chat when executionStatus is missing but a thought is in_progress', () => {
  const result = transformChatBEtoFE(
    workflowHistoryChat(
      { executionStatus: undefined, thoughts: [{ id: 's1', message: '', in_progress: true, interrupted: false }] },
      { is_workflow: true }
    )
  )
  const message = result.history[0]![0]!
  expect(message.inProgress).toBe(true)
  expect(message.thoughts![0]!.in_progress).toBe(true)
  expect(message.thoughts![0]!.interrupted).toBe(false)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --reporter=verbose src/utils/__tests__/chatHelpers.test.ts`

Expected: FAIL — `inProgress` is `false`, thought `in_progress` is `false`, `interrupted` is `true`, `executionStatus` is `undefined`.

- [ ] **Step 3: Add types and implement the mapper**

On `ChatMessage` and `HistoryItemBackend` in `src/types/entity/conversation.ts`:

```ts
import type { WorkflowExecutionStatus } from '@/types/entity/workflow'

// on both interfaces:
executionStatus?: WorkflowExecutionStatus | null
workflowExecutionRef?: boolean
```

In `src/utils/chatHelpers.ts`, import `WORKFLOW_STATUSES`. Pass `isWorkflow` from `transformChatBEtoFE` into `groupAndTransformHistory` → `transformHistoryGroup`.

```ts
const isActiveWorkflowTurn = (
  assistantItem: HistoryItemBackend,
  isWorkflow: boolean
): boolean => {
  if (assistantItem.executionStatus === WORKFLOW_STATUSES.RUNNING) return true
  return Boolean(
    isWorkflow && assistantItem.executionId && assistantItem.thoughts?.some((thought) => thought.in_progress)
  )
}
```

Inside the thought map / message object:

```ts
const preserveProgress = isActiveWorkflowTurn(assistantItem, isWorkflow ?? false)

// thoughts:
in_progress: preserveProgress ? (thought.in_progress ?? false) : false,
interrupted: preserveProgress
  ? (thought.interrupted ?? false)
  : (thought.interrupted ?? false) || (thought.in_progress ?? false),

// message:
inProgress: preserveProgress,
executionId: assistantItem.executionId,
executionStatus: assistantItem.executionStatus ?? null,
workflowExecutionRef: assistantItem.workflowExecutionRef ?? false,
```

Do not pass `isWorkflow: true` from `transformWorkflowExecutionHistoryBEtoFE` unless the assistant item itself has `executionStatus === 'In Progress'` — that function has no conversation flag; rely on `executionStatus` only (default `isWorkflow` false). Details history of finished runs stays remapped.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --reporter=verbose src/utils/__tests__/chatHelpers.test.ts`

Expected: PASS, including the original non-workflow remap test.

- [ ] **Step 5: Commit**

```bash
git add src/types/entity/conversation.ts src/utils/chatHelpers.ts src/utils/__tests__/chatHelpers.test.ts
git commit -m "$(cat <<'EOF'
EPMCDME-14075: Preserve in-progress workflow thoughts on chat hydrate

EOF
)"
```

---

### Task 2: Patch open workflow messages without setOpenChat

**Test-first: yes — `refreshWorkflowExecutionIds` currently skips empty thought arrays and does not copy `response` / `inProgress` / `executionStatus`.**

**Files:**
- Modify: `src/store/chats.ts` (`refreshWorkflowExecutionIds`)
- Create: `src/store/__tests__/chats.refreshWorkflowExecutionIds.test.ts`

**Interfaces:**
- Consumes: `transformChatBEtoFE` output from Task 1
- Produces: `chatsStore.refreshWorkflowExecutionIds(id: string): Promise<void>` mutates the matching `openedChatsHistory` message: always assigns `thoughts`, `response`, `inProgress`, `executionId`, `executionStatus`, `workflowExecutionRef`. Returns without calling `setOpenChat`. `setOpenChat` still keeps the existing chat when any message has `inProgress: true`.

- [ ] **Step 1: Write the failing tests**

Create `src/store/__tests__/chats.refreshWorkflowExecutionIds.test.ts` mirroring mocks from `chats.getChats.test.ts` (`vi.mock('valtio')` as identity, mock `api.get`, toaster, storage, router, user, recentChats, workflowExecutions).

```ts
const openWorkflowChat = () => {
  chatsStore.openedChatsHistory = [
    {
      id: 'chat-1',
      name: 'WF',
      isWorkflow: true,
      assistantIds: [],
      assistantData: [],
      history: [
        [
          {
            role: 'Assistant',
            request: 'hi',
            response: '',
            createdAt: '2024-01-01',
            assistant: { id: 'a1', name: 'WF' },
            inProgress: true,
            thoughts: [{ id: 's1', message: '', in_progress: true, interrupted: false }],
            executionId: 'exec-1',
            executionStatus: 'In Progress',
            workflowExecutionRef: true,
          },
        ],
      ],
    },
  ]
  chatsStore.currentChat = chatsStore.openedChatsHistory[0]
}

it('patches thoughts, response, and inProgress in place without replacing the open chat', async () => {
  openWorkflowChat()
  const openRef = chatsStore.openedChatsHistory[0]
  apiGet.mockResolvedValue(
    jsonResponse({
      id: 'chat-1',
      conversation_name: 'WF',
      assistant_ids: [],
      initial_assistant_id: '',
      assistant_data: [],
      is_workflow: true,
      history: [
        { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
        {
          historyIndex: 0,
          message: 'final',
          date: '2024-01-01',
          executionId: 'exec-1',
          workflowExecutionRef: true,
          executionStatus: 'Succeeded',
          thoughts: [
            {
              id: 's1',
              author_name: 'Find Items Todo',
              author_type: 'WorkflowState',
              message: 'done',
              in_progress: false,
              interrupted: false,
            },
          ],
        },
      ],
    })
  )

  await chatsStore.refreshWorkflowExecutionIds('chat-1')

  expect(chatsStore.openedChatsHistory[0]).toBe(openRef)
  const message = openRef.history[0][0]
  expect(message.response).toBe('final')
  expect(message.inProgress).toBe(false)
  expect(message.executionStatus).toBe('Succeeded')
  expect(message.thoughts[0].in_progress).toBe(false)
  expect(message.thoughts[0].message).toBe('done')
})

it('replaces thoughts even when the fresh payload has an empty thoughts array', async () => {
  openWorkflowChat()
  apiGet.mockResolvedValue(
    jsonResponse({
      id: 'chat-1',
      conversation_name: 'WF',
      assistant_ids: [],
      initial_assistant_id: '',
      assistant_data: [],
      is_workflow: true,
      history: [
        { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
        {
          historyIndex: 0,
          message: '',
          date: '2024-01-01',
          executionId: 'exec-1',
          workflowExecutionRef: true,
          executionStatus: 'In Progress',
          thoughts: [],
        },
      ],
    })
  )

  await chatsStore.refreshWorkflowExecutionIds('chat-1')

  expect(chatsStore.openedChatsHistory[0].history[0][0].thoughts).toEqual([])
  expect(chatsStore.openedChatsHistory[0].history[0][0].inProgress).toBe(true)
})

it('does not clobber an in-progress open chat when setOpenChat receives a fresh payload', () => {
  openWorkflowChat()
  const openRef = chatsStore.openedChatsHistory[0]
  const result = chatsStore.setOpenChat({
    ...openRef,
    history: [[{ ...openRef.history[0][0], response: 'stale getChat', inProgress: false }]],
  } as Conversation)
  expect(result).toBe(openRef)
  expect(openRef.history[0][0].inProgress).toBe(true)
  expect(openRef.history[0][0].response).toBe('')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --reporter=verbose src/store/__tests__/chats.refreshWorkflowExecutionIds.test.ts`

Expected: FAIL — `response` stays `''`, `inProgress` stays `true` after Succeeded payload, empty `thoughts` not assigned.

- [ ] **Step 3: Patch in place**

Replace the inner assignment in `refreshWorkflowExecutionIds`:

```ts
freshChat.history.forEach((historyGroup, historyIndex) => {
  historyGroup.forEach((message, messageIndex) => {
    const conversation = existingChat.history[historyIndex]
    const existingMessage = conversation?.[messageIndex]
    if (!existingMessage) return

    existingMessage.executionId = message.executionId
    existingMessage.executionStatus = message.executionStatus
    existingMessage.workflowExecutionRef = message.workflowExecutionRef
    existingMessage.response = message.response
    existingMessage.inProgress = message.inProgress
    existingMessage.thoughts = message.thoughts ?? []
  })
})
```

Do not call `setOpenChat` / `getChat` from this method.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --reporter=verbose src/store/__tests__/chats.refreshWorkflowExecutionIds.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/chats.ts src/store/__tests__/chats.refreshWorkflowExecutionIds.test.ts
git commit -m "$(cat <<'EOF'
EPMCDME-14075: Patch workflow progress on the open chat in place

EOF
)"
```

---

### Task 3: Poll conversation GET while execution is In Progress

**Test-first: yes — ChatPage never calls `refreshWorkflowExecutionIds`; no hook starts a 4s poll when `executionStatus` is In Progress.**

**Files:**
- Create: `src/pages/chat/hooks/useWorkflowExecutionPoll.ts`
- Create: `src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`
- Modify: `src/pages/chat/ChatPage.tsx`

**Interfaces:**
- Consumes: `chatsStore.refreshWorkflowExecutionIds`, `usePolling`, `WORKFLOW_STATUSES.RUNNING`
- Produces: `useWorkflowExecutionPoll(chatId: string | undefined): void` — `enabled` when `currentChat.id === chatId` and some history message has `executionStatus === WORKFLOW_STATUSES.RUNNING`; `fetchFn` calls `chatsStore.refreshWorkflowExecutionIds(chatId)`; interval `4000`.

- [ ] **Step 1: Write the failing tests**

Create `src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`. Mock `chatsStore` with a mutable `currentChat` and `refreshWorkflowExecutionIds`. Mock `usePolling` to capture `{ enabled, interval, fetchFn }` **or** use fake timers against the real `usePolling` (preferred, matches `usePolling.test.tsx`).

Preferred: real `usePolling` + fake timers.

```ts
it('does not poll when the open chat has no In Progress executionStatus', async () => {
  mockChatsStore.currentChat = {
    id: 'chat-1',
    isWorkflow: true,
    history: [[{ executionStatus: 'Succeeded', inProgress: false }]],
  }
  renderHook(() => useWorkflowExecutionPoll('chat-1'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
})

it('polls refreshWorkflowExecutionIds every 4s while executionStatus is In Progress', async () => {
  mockChatsStore.currentChat = {
    id: 'chat-1',
    isWorkflow: true,
    history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
  }
  renderHook(() => useWorkflowExecutionPoll('chat-1'))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4000)
  })
  expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledWith('chat-1')
})

it('stops polling after unmount', async () => {
  mockChatsStore.currentChat = {
    id: 'chat-1',
    isWorkflow: true,
    history: [[{ executionStatus: 'In Progress', inProgress: true }]],
  }
  const { unmount } = renderHook(() => useWorkflowExecutionPoll('chat-1'))
  unmount()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(8000)
  })
  expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
})
```

Also assert ChatPage calls the hook: in `src/pages/chat/__tests__/ChatPage.test.tsx` mock `../hooks/useWorkflowExecutionPoll` and expect it to be invoked with `chat-1`. If that file is heavily mocked, covering the hook is enough; add the ChatPage mock-call assertion only if it stays cheap.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --reporter=verbose src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook and wire ChatPage**

`src/pages/chat/hooks/useWorkflowExecutionPoll.ts`:

```ts
import { useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { WORKFLOW_STATUSES } from '@/constants/workflows'
import { usePolling } from '@/hooks/usePolling'
import { chatsStore } from '@/store/chats'

const WORKFLOW_CHAT_POLL_INTERVAL_MS = 4000

const hasInProgressExecution = (chat: typeof chatsStore.currentChat): boolean =>
  !!chat?.history?.some((group) =>
    group.some((message) => message.executionStatus === WORKFLOW_STATUSES.RUNNING)
  )

export const useWorkflowExecutionPoll = (chatId: string | undefined): void => {
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore

  const enabled = useMemo(
    () => Boolean(chatId && currentChat?.id === chatId && hasInProgressExecution(currentChat)),
    [chatId, currentChat]
  )

  const fetchFn = useCallback(async () => {
    if (!chatId) return
    await chatsStore.refreshWorkflowExecutionIds(chatId)
  }, [chatId])

  usePolling({
    interval: WORKFLOW_CHAT_POLL_INTERVAL_MS,
    enabled,
    fetchFn,
  })
}
```

In `ChatPage.tsx`, after the `chatId` `useEffect` that calls `getChat`:

```ts
useWorkflowExecutionPoll(chatId)
```

`enabled` is false until `getChat` populates `currentChat` with `executionStatus: 'In Progress'`. First snapshot already comes from `getChat`; the interval then follows the run. Do not call `getChat` from the poll.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --reporter=verbose src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts src/pages/chat/__tests__/ChatPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/hooks/useWorkflowExecutionPoll.ts src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts src/pages/chat/ChatPage.tsx src/pages/chat/__tests__/ChatPage.test.tsx
git commit -m "$(cat <<'EOF'
EPMCDME-14075: Poll conversation progress after workflow chat reload

EOF
)"
```

---

### Task 4: Show restore-failed copy instead of a blank answer

**Test-first: yes — a workflow assistant message with empty `response`, no thoughts, and `inProgress: false` currently renders empty Markdown.**

**Files:**
- Modify: `src/constants/chats.ts`
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`
- Test: `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx`

**Interfaces:**
- Consumes: `WORKFLOW_PROGRESS_RESTORE_FAILED_MESSAGE` from `@/constants/chats`; `chatsStore.currentChat.isWorkflow`
- Produces: Markdown `content` falls back to that string when the message is a finished/unrestorable workflow turn with no response, no stream, and no thoughts.

- [ ] **Step 1: Write the failing tests**

In `ChatAiMessage.test.tsx` (Markdown is mocked as `data-testid="markdown"`):

```ts
it('shows restore-failed copy for a workflow message with no response and no thoughts', () => {
  mockChatsStore.currentChat.isWorkflow = true
  renderMessage(createMessage({ response: '', thoughts: [], inProgress: false, executionId: 'exec-1' }))
  expect(screen.getByTestId('markdown')).toHaveTextContent(
    'Workflow progress could not be restored.'
  )
})

it('does not show restore-failed copy when an in-progress thought card is present', () => {
  mockChatsStore.currentChat.isWorkflow = true
  renderMessage(
    createMessage({
      response: '',
      inProgress: true,
      thoughts: [{ id: 's1', author_name: 'Step', author_type: 'WorkflowState', message: '', in_progress: true }],
    })
  )
  expect(screen.getByTestId('markdown')).not.toHaveTextContent(
    'Workflow progress could not be restored.'
  )
  expect(screen.getByTestId('thinking-loader')).toBeInTheDocument()
})

it('does not show restore-failed copy for a non-workflow empty response', () => {
  mockChatsStore.currentChat.isWorkflow = false
  renderMessage(createMessage({ response: '', thoughts: [], inProgress: false }))
  expect(screen.getByTestId('markdown')).not.toHaveTextContent(
    'Workflow progress could not be restored.'
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --reporter=verbose src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx`

Expected: FAIL — markdown content is empty / `'Done'` override missing the new string.

- [ ] **Step 3: Implement empty-state copy**

Add to `src/constants/chats.ts`:

```ts
export const WORKFLOW_PROGRESS_RESTORE_FAILED_MESSAGE =
  'Workflow progress could not be restored.'
```

In `ChatAiMessage.tsx`, before rendering Markdown:

```ts
const markdownContent = message.stream?.getStream() ?? message.response
const showRestoreFailed =
  !!currentChat?.isWorkflow &&
  !isInProgress &&
  !isEditing &&
  !hasMcpAuthPrompt &&
  !message.thoughts?.length &&
  !markdownContent

<Markdown
  className="mt-4"
  content={showRestoreFailed ? WORKFLOW_PROGRESS_RESTORE_FAILED_MESSAGE : markdownContent}
/>
```

Live in-progress turns with empty `message` but a thought card must not use this copy (Result stays empty until the step finishes).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- --reporter=verbose src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/constants/chats.ts src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx
git commit -m "$(cat <<'EOF'
EPMCDME-14075: Show copy when workflow progress cannot be restored

EOF
)"
```

---

## Manual verification (note in handoff; not automated)

1. Open a runnable workflow chat, send `hi`.
2. While a step card shows IN PROGRESS and the assistant shows Thinking…, reload.
3. After reload: same kind of step card (IN PROGRESS), not empty and not Interrupted.
4. When the step finishes, Result appears; later steps show until the run completes.
5. A workflow run without reload still behaves as today.
6. A cut non-workflow assistant stream still hydrates as Interrupted.

Requires the sibling BE conversation GET contract (`executionStatus`, in-progress `WorkflowState` thoughts) at runtime.

## Quality gates (Stage 6)

```bash
npm run lint
npm run typecheck
npm run test:unit -- --reporter=verbose src/utils/__tests__/chatHelpers.test.ts src/store/__tests__/chats.refreshWorkflowExecutionIds.test.ts src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts src/pages/chat/__tests__/ChatPage.test.tsx src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx
```
