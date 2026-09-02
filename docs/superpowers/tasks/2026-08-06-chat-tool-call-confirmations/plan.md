# Chat Tool Call Confirmations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an assistant's backend pauses before executing a tool, surface an inline Allow/Deny block in the chat message, disable the chat prompt, and resume the conversation via the `/model/tool-call/resume` endpoint.

**Architecture:** The `tool_call_pending` SSE field is handled in `chatGeneration.ts` alongside the existing `interactive_request` pattern. `ChatToolConfirmation` is a standalone component rendered inside `ChatAiMessage` (below the thoughts section). The chat prompt reuses the existing `isInterrupted` visual pattern via a new prompt mode. Page-refresh recovery maps `pending_tool_call` from the conversation endpoint during `transformChatBEtoFE`.

**Tech Stack:** React 18, Valtio, TypeScript, Vitest + React Testing Library, Tailwind CSS.

## Global Constraints

- Commit format: `EPMCDME-13903: Capital sentence` (enforced by Tekton CI).
- All `src/` changes require `npm run lint`, `npm run typecheck`, and `npm run test:unit` to pass before committing.
- Follow the existing `interactive_request` code pattern — new code must mirror it in structure and naming style.
- No new CSS classes or design tokens — reuse `bg-interrupted-primary`, `Button`, `ButtonType`, `ButtonSize` from existing code.
- The assistant settings toggle (`tool_permissions.require_confirmation`) is out of scope.

---

### Task 1: Add types

**Test-first: no — pure TypeScript additions, compiler enforces correctness.**

**Files:**
- Create: `src/types/entity/toolCallConfirmation.ts`
- Modify: `src/types/entity/conversation.ts`
- Modify: `src/types/chatGeneration.ts`

**Interfaces:**
- Produces: `ToolCallPendingEvent` (consumed by Tasks 2, 3, 4, 5); `StreamChunk.tool_call_pending`, `ChatMessage.toolCallPending`, `ChatMessage.toolCallPendingRestore`, `Conversation.pendingToolCall`, `ChatBackend.pending_tool_call`, `ChatRequest.toolCallAction`, `ChatRequest.pendingToolCallId` (consumed by Tasks 2, 3, 4, 7).

- [ ] **Step 1: Create `src/types/entity/toolCallConfirmation.ts`**

```typescript
export interface ToolCallPendingEvent {
  pending_tool_call_id: string
  tool_name: string
  tool_args: Record<string, unknown>
}
```

- [ ] **Step 2: Extend `src/types/entity/conversation.ts`**

In `StreamChunk`, add:
```typescript
  tool_call_pending?: ToolCallPendingEvent | null
```

In `ChatMessage`, add:
```typescript
  toolCallPending?: ToolCallPendingEvent | null
  // Stored before a resume call so _handleRequestError can restore state on failure
  toolCallPendingRestore?: ToolCallPendingEvent | null
```

In `Conversation`, add:
```typescript
  pendingToolCall?: ToolCallPendingEvent | null
```

In `ChatBackend`, add:
```typescript
  pending_tool_call?: ToolCallPendingEvent | null
```

Add the import at the top of the file:
```typescript
import type { ToolCallPendingEvent } from '@/types/entity/toolCallConfirmation'
```

- [ ] **Step 3: Extend `src/types/chatGeneration.ts`**

In `ChatRequest`, add:
```typescript
  toolCallAction?: 'allow' | 'deny'
  pendingToolCallId?: string
```

- [ ] **Step 4: Run type-check**

```bash
npm run typecheck
```

Expected: silent, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/types/entity/toolCallConfirmation.ts src/types/entity/conversation.ts src/types/chatGeneration.ts
git commit -m "EPMCDME-13903: Add ToolCallPendingEvent types and extend ChatMessage/Conversation/ChatRequest"
```

---

### Task 2: Handle `tool_call_pending` in the SSE stream

**Test-first: yes — test that `_handleChunk` sets `toolCallPending` on the history item and `pendingToolCall` on the current chat when the terminal chunk carries the new field.**

**Files:**
- Modify: `src/store/chatGeneration.ts` — `_handleChunk`
- Create: `src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts`

**Interfaces:**
- Consumes: `ToolCallPendingEvent` from Task 1; `chatsStore.currentChat: Conversation` (existing import in `chatGeneration.ts`)
- Produces: `historyItem.toolCallPending` set on the ChatMessage; `chatsStore.currentChat.pendingToolCall` set

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage, Conversation } from '@/types/entity/conversation'

const mockChatsStore = {
  currentChat: null as Conversation | null,
}

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj), ref: vi.fn((v) => v) }))
vi.mock('@/utils/api', () => ({
  default: { stream: vi.fn(), put: vi.fn(), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Error',
}))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getAssistant: vi.fn(), updateRecentAssistants: vi.fn() },
}))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn() } }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/utils/stream', () => ({ default: vi.fn(), streamChunkToObject: vi.fn() }))
vi.mock('@/utils/chatHelpers', () => ({ transformChatHistoryFEtoBE: vi.fn(() => []) }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/constants', () => ({ ROLE_USER: 'User' }))

const makeHistoryItem = (): ChatMessage => ({
  role: 'Assistant',
  createdAt: '2026-01-01T00:00:00.000Z',
  inProgress: true,
  assistantId: 'assistant-1',
  assistant: { id: 'assistant-1', name: 'Assistant' },
  executionId: null,
  stream: {
    isStreaming: true,
    stream: '',
    streamBuffer: '',
    start: vi.fn(),
    finish: vi.fn(),
    push: vi.fn(),
    getStream: vi.fn(() => ''),
    notification: null,
  },
})

describe('chatGenerationStore tool_call_pending handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
  })

  it('sets toolCallPending on historyItem when terminal chunk has tool_call_pending', async () => {
    const historyItem = makeHistoryItem()
    const pending = {
      pending_tool_call_id: 'call_abc',
      tool_name: 'search_confluence',
      tool_args: { query: 'SSO config' },
    }
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({ last: true, tool_call_pending: pending })
    )

    expect(historyItem.toolCallPending).toEqual(pending)
  })

  it('sets pendingToolCall on currentChat when terminal chunk has tool_call_pending', async () => {
    const historyItem = makeHistoryItem()
    const pending = {
      pending_tool_call_id: 'call_abc',
      tool_name: 'search_confluence',
      tool_args: { query: 'SSO config' },
    }
    mockChatsStore.currentChat = {
      id: 'chat-1',
      assistantIds: [],
      assistantData: [],
      history: [[historyItem]],
    } as any
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({ last: true, tool_call_pending: pending })
    )

    expect(mockChatsStore.currentChat?.pendingToolCall).toEqual(pending)
  })

  it('still marks inProgress=false when tool_call_pending is present', async () => {
    const historyItem = makeHistoryItem()
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({
        last: true,
        tool_call_pending: { pending_tool_call_id: 'x', tool_name: 't', tool_args: {} },
      })
    )

    expect(historyItem.inProgress).toBe(false)
  })

  it('does not set toolCallPending when terminal chunk has no tool_call_pending', async () => {
    const historyItem = makeHistoryItem()
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({ last: true, generated: 'Hello' })
    )

    expect(historyItem.toolCallPending).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts
```

Expected: FAIL — `historyItem.toolCallPending` is undefined.

- [ ] **Step 3: Implement in `_handleChunk`**

In `src/store/chatGeneration.ts`, inside `_handleChunk`, add after the existing `if (chunk.interactive_request)` block (around line 1233):

```typescript
// Existing code:
if (chunk.interactive_request) {
  historyItem.interactiveRequest = chunk.interactive_request
} else if (chunk.thought) {
  // ...
```

Change to:

```typescript
if (chunk.interactive_request) {
  historyItem.interactiveRequest = chunk.interactive_request
} else if (chunk.tool_call_pending) {
  historyItem.toolCallPending = chunk.tool_call_pending
  if (chatsStore.currentChat) {
    chatsStore.currentChat.pendingToolCall = chunk.tool_call_pending
  }
} else if (chunk.thought) {
  chatGenerationStore._handleThought(historyItem, chunk.thought)
} else {
  historyItem.stream?.push(chunk.generated_chunk ?? '')
}
```

Note: the `tool_call_pending` field only appears on the final `last: true` chunk per the API contract, so this branch runs once. The `last: true` handling below (finish stream, set `inProgress = false`) remains unchanged.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/store/chatGeneration.ts src/store/__tests__/chatGeneration.toolCallConfirmation.test.ts
git commit -m "EPMCDME-13903: Handle tool_call_pending SSE field in _handleChunk"
```

---

### Task 3: `_prepareRequestData` branch + `resumeToolCall` method

**Test-first: yes — test the new `_prepareRequestData` branch and the `resumeToolCall` method behavior.**

**Files:**
- Modify: `src/store/chatGeneration.ts` — `_prepareRequestData`, add `resumeToolCall`
- Modify: `src/store/__tests__/chatGeneration.prepareRequestData.test.ts`
- Create: `src/store/__tests__/chatGeneration.resumeToolCall.test.ts`

**Interfaces:**
- Consumes: `ChatRequest.toolCallAction`, `ChatRequest.pendingToolCallId` from Task 1; `ToolCallPendingEvent` from Task 1
- Produces: `chatGenerationStore.resumeToolCall(action: 'allow' | 'deny'): Promise<void>` (consumed by Task 5)

- [ ] **Step 1: Write failing test for `_prepareRequestData`**

Add to `src/store/__tests__/chatGeneration.prepareRequestData.test.ts` (existing file — append after the existing `describe` block):

```typescript
describe('chatGenerationStore._prepareRequestData toolCallAction branch', () => {
  it('routes to the tool-call resume endpoint when toolCallAction is set', () => {
    const chat = { id: 'chat-1', isWorkflow: false, history: [] } as any
    const data = {
      conversationId: 'chat-1',
      toolCallAction: 'allow',
      pendingToolCallId: 'call_abc',
    } as any

    const result = chatGenerationStore._prepareRequestData(chat, 'assistant-1', data)

    expect(result.endpoint).toBe('v1/assistants/assistant-1/model/tool-call/resume')
    expect(result.method).toBe('POST')
    expect(result.requestData).toEqual({
      conversation_id: 'chat-1',
      pending_tool_call_id: 'call_abc',
      action: 'allow',
      stream: true,
    })
  })

  it('routes deny action correctly', () => {
    const chat = { id: 'chat-1', isWorkflow: false, history: [] } as any
    const data = {
      conversationId: 'chat-1',
      toolCallAction: 'deny',
      pendingToolCallId: 'call_xyz',
    } as any

    const result = chatGenerationStore._prepareRequestData(chat, 'assistant-2', data)

    expect(result.endpoint).toBe('v1/assistants/assistant-2/model/tool-call/resume')
    expect(result.requestData).toMatchObject({ action: 'deny' })
  })
})
```

- [ ] **Step 2: Write failing test for `resumeToolCall`**

Create `src/store/__tests__/chatGeneration.resumeToolCall.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage, Conversation } from '@/types/entity/conversation'
import type { ToolCallPendingEvent } from '@/types/entity/toolCallConfirmation'

const mockSendRequest = vi.fn().mockResolvedValue(undefined)
const mockChatsStore = { currentChat: null as Conversation | null }

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj), ref: vi.fn((v) => v) }))
vi.mock('@/utils/api', () => ({
  default: { stream: vi.fn(), put: vi.fn(), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Error',
}))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getAssistant: vi.fn(), updateRecentAssistants: vi.fn() },
}))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn() } }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/utils/stream', () => ({ default: vi.fn(), streamChunkToObject: vi.fn() }))
vi.mock('@/utils/chatHelpers', () => ({ transformChatHistoryFEtoBE: vi.fn(() => []) }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/constants', () => ({ ROLE_USER: 'User' }))

const pending: ToolCallPendingEvent = {
  pending_tool_call_id: 'call_abc',
  tool_name: 'search_confluence',
  tool_args: { query: 'SSO' },
}

const makeChat = (): Conversation => ({
  id: 'chat-1',
  assistantIds: ['assistant-1'],
  assistantData: [],
  pendingToolCall: pending,
  history: [
    [
      {
        role: 'Assistant',
        createdAt: '2026-01-01T00:00:00.000Z',
        inProgress: false,
        assistantId: 'assistant-1',
        assistant: { id: 'assistant-1', name: 'A' },
        executionId: null,
        toolCallPending: pending,
      } as ChatMessage,
    ],
  ],
})

describe('chatGenerationStore.resumeToolCall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
  })

  it('clears pendingToolCall and toolCallPending on the last message before calling _sendRequest', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('allow')

    expect(chat.pendingToolCall).toBeNull()
    expect(chat.history[0][0].toolCallPending).toBeNull()
  })

  it('sets inProgress=true on the last message', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('allow')

    expect(chat.history[0][0].inProgress).toBe(true)
  })

  it('calls _sendRequest with toolCallAction and pendingToolCallId', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const spy = vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('deny')

    expect(spy).toHaveBeenCalledOnce()
    const [, , , data] = spy.mock.calls[0]
    expect(data.toolCallAction).toBe('deny')
    expect(data.pendingToolCallId).toBe('call_abc')
    expect(data.conversationId).toBe('chat-1')
  })

  it('returns early without calling _sendRequest when no pendingToolCall', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      assistantIds: [],
      assistantData: [],
      history: [],
      pendingToolCall: null,
    } as any
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const spy = vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('allow')

    expect(spy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npm run test:unit -- --reporter=verbose src/store/__tests__/chatGeneration.prepareRequestData.test.ts src/store/__tests__/chatGeneration.resumeToolCall.test.ts
```

Expected: FAIL — `toolCallAction` branch missing, `resumeToolCall` method not found.

- [ ] **Step 4: Implement `_prepareRequestData` branch**

In `src/store/chatGeneration.ts`, inside `_prepareRequestData`, add as the FIRST check (before the `if (!chat.isWorkflow)` guard):

```typescript
_prepareRequestData(chat, entityId, data) {
  if (data.toolCallAction) {
    return {
      endpoint: `v1/assistants/${entityId}/model/tool-call/resume`,
      requestData: {
        conversation_id: data.conversationId,
        pending_tool_call_id: data.pendingToolCallId,
        action: data.toolCallAction,
        stream: true,
      },
      method: 'POST',
    }
  }

  if (!chat.isWorkflow) {
    // ... existing code unchanged
```

- [ ] **Step 5: Implement `resumeToolCall` method**

In `src/store/chatGeneration.ts`, add after the `resumeWorkflowExecution` method:

```typescript
async resumeToolCall(action: 'allow' | 'deny') {
  const chat = chatsStore.currentChat
  if (!chat?.pendingToolCall) return

  const { pending_tool_call_id } = chat.pendingToolCall

  chat.pendingToolCall = null

  const lastGroup = chat.history.at(-1)!
  const lastMessage = lastGroup.at(-1)!
  lastMessage.toolCallPending = null
  lastMessage.inProgress = true

  const data: ChatRequest = {
    conversationId: chat.id,
    toolCallAction: action,
    pendingToolCallId: pending_tool_call_id,
  } as ChatRequest

  return chatGenerationStore._sendRequest(
    chat,
    chat.history.length - 1,
    lastGroup.length - 1,
    data
  )
},
```

Also add `resumeToolCall` to the store interface in `chatGeneration.ts` (around line 94, after `resumeWorkflowExecution`):

```typescript
resumeWorkflowExecution: (userInput?: string, fileNames?: string[]) => Promise<void>
resumeToolCall: (action: 'allow' | 'deny') => Promise<void>   // ADD THIS LINE
abortWorkflowChat: (chatId: string) => Promise<void>
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test:unit -- --reporter=verbose src/store/__tests__/chatGeneration.prepareRequestData.test.ts src/store/__tests__/chatGeneration.resumeToolCall.test.ts
```

Expected: all tests PASS.

- [ ] **Step 7: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 8: Commit**

```bash
git add src/store/chatGeneration.ts src/store/__tests__/chatGeneration.prepareRequestData.test.ts src/store/__tests__/chatGeneration.resumeToolCall.test.ts
git commit -m "EPMCDME-13903: Add resumeToolCall method and _prepareRequestData routing"
```

---

### Task 4: Page-refresh recovery in `transformChatBEtoFE`

**Test-first: yes — test that `transformChatBEtoFE` maps `pending_tool_call` from the backend response onto `Conversation.pendingToolCall` and sets `toolCallPending` on the last assistant message.**

**Files:**
- Modify: `src/utils/chatHelpers.ts` — `transformChatBEtoFE`
- Modify: `src/utils/__tests__/chatHelpers.test.ts`

**Interfaces:**
- Consumes: `ChatBackend.pending_tool_call`, `ToolCallPendingEvent` from Task 1
- Produces: `Conversation.pendingToolCall` set; last assistant `ChatMessage.toolCallPending` set

- [ ] **Step 1: Write the failing test**

Add to `src/utils/__tests__/chatHelpers.test.ts` inside the existing `describe('transformChatBEtoFE')` block:

```typescript
it('maps pending_tool_call onto conversation.pendingToolCall', () => {
  const pending = {
    pending_tool_call_id: 'call_abc',
    tool_name: 'search_confluence',
    tool_args: { query: 'SSO' },
  }
  const chat: ChatBackend = {
    id: '1',
    conversation_name: 'Test',
    assistant_ids: ['a1'],
    initial_assistant_id: 'a1',
    assistant_data: [],
    history: [{ historyIndex: 0, message: 'hi', date: '2026-01-01', executionId: null }],
    pending_tool_call: pending,
  }

  const result = transformChatBEtoFE(chat)

  expect(result.pendingToolCall).toEqual(pending)
})

it('sets toolCallPending on the last assistant message when pending_tool_call is present', () => {
  const pending = {
    pending_tool_call_id: 'call_abc',
    tool_name: 'search_confluence',
    tool_args: { query: 'SSO' },
  }
  const chat: ChatBackend = {
    id: '1',
    conversation_name: 'Test',
    assistant_ids: ['a1'],
    initial_assistant_id: 'a1',
    assistant_data: [
      {
        assistant_id: 'a1',
        assistant_name: 'A',
        assistant_icon: '',
      },
    ],
    history: [
      { historyIndex: 0, message: 'user msg', date: '2026-01-01', executionId: null },
      { historyIndex: 0, message: 'assistant response', date: '2026-01-01', executionId: null },
    ],
    pending_tool_call: pending,
  }

  const result = transformChatBEtoFE(chat)

  const flatHistory = result.history.flat()
  const lastAssistantMsg = [...flatHistory].reverse().find((m) => m.role === ROLE_ASSISTANT)
  expect(lastAssistantMsg?.toolCallPending).toEqual(pending)
})

it('sets pendingToolCall to null when pending_tool_call is absent', () => {
  const chat: ChatBackend = {
    id: '1',
    conversation_name: 'Test',
    assistant_ids: [],
    initial_assistant_id: '',
    assistant_data: [],
    history: [],
  }

  const result = transformChatBEtoFE(chat)

  expect(result.pendingToolCall).toBeNull()
})
```

Note: you need to import `ROLE_ASSISTANT` from `@/constants` in the test file (already present if used elsewhere in the file; if not, add to the import).

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose src/utils/__tests__/chatHelpers.test.ts
```

Expected: FAIL — `pendingToolCall` is undefined, `toolCallPending` is undefined.

- [ ] **Step 3: Implement in `transformChatBEtoFE`**

In `src/utils/chatHelpers.ts`, inside `transformChatBEtoFE`, after the existing `isInterrupted` line:

```typescript
// Existing line:
isInterrupted: chatBE.history.some((item) => item.thoughts?.some((t) => t.interrupted)),
// Add:
pendingToolCall: chatBE.pending_tool_call ?? null,
```

Then, after the `history` is fully built (after the loop that populates `transformedChat.history`), add:

```typescript
// Restore toolCallPending on the last assistant message for page-refresh recovery
if (chatBE.pending_tool_call) {
  const flatHistory = transformedChat.history.flat()
  const lastAssistantMsg = [...flatHistory].reverse().find((m) => m.role === ROLE_ASSISTANT)
  if (lastAssistantMsg) {
    lastAssistantMsg.toolCallPending = chatBE.pending_tool_call
  }
}
```

Note: `ROLE_ASSISTANT` is already imported in `chatHelpers.ts`.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose src/utils/__tests__/chatHelpers.test.ts
```

Expected: all tests in the file PASS.

- [ ] **Step 5: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/utils/chatHelpers.ts src/utils/__tests__/chatHelpers.test.ts
git commit -m "EPMCDME-13903: Map pending_tool_call in transformChatBEtoFE for page-refresh recovery"
```

---

### Task 5: `ChatToolConfirmation` component

**Test-first: yes — test that the component renders the tool name, args, and Allow/Deny buttons when active, and renders nothing when inactive.**

**Files:**
- Create: `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatToolConfirmation.tsx`
- Create: `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatToolConfirmation.test.tsx`

**Interfaces:**
- Consumes: `chatGenerationStore.resumeToolCall` from Task 3; `chatsStore.currentChat.pendingToolCall` from Task 2/4; `ChatMessage.toolCallPending` from Task 1
- Produces: `<ChatToolConfirmation message={ChatMessage} />` (consumed by Task 6)

- [ ] **Step 1: Write the failing test**

Create `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatToolConfirmation.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ChatMessage } from '@/types/entity/conversation'
import type { ToolCallPendingEvent } from '@/types/entity/toolCallConfirmation'

const mockResumeToolCall = vi.fn()

const { mockChatsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      pendingToolCall: null as ToolCallPendingEvent | null,
      history: [] as ChatMessage[][],
    },
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn(() => mockChatsStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: { resumeToolCall: (...args: unknown[]) => mockResumeToolCall(...args) },
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

const pending: ToolCallPendingEvent = {
  pending_tool_call_id: 'call_abc',
  tool_name: 'search_confluence',
  tool_args: { query: 'SSO config' },
}

const makeMessage = (toolCallPending: ToolCallPendingEvent | null): ChatMessage => ({
  role: 'Assistant',
  createdAt: '2026-01-01T00:00:00.000Z',
  inProgress: false,
  assistant: { id: 'a1', name: 'A' },
  executionId: null,
  toolCallPending,
})

describe('ChatToolConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat.pendingToolCall = null
  })

  it('renders nothing when message has no toolCallPending', async () => {
    const { default: ChatToolConfirmation } = await import('../ChatToolConfirmation')
    const { container } = render(<ChatToolConfirmation message={makeMessage(null)} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when conversation pendingToolCall does not match message', async () => {
    mockChatsStore.currentChat.pendingToolCall = {
      ...pending,
      pending_tool_call_id: 'different_id',
    }
    const { default: ChatToolConfirmation } = await import('../ChatToolConfirmation')
    const { container } = render(<ChatToolConfirmation message={makeMessage(pending)} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tool name and Allow/Deny buttons when active', async () => {
    mockChatsStore.currentChat.pendingToolCall = pending
    const { default: ChatToolConfirmation } = await import('../ChatToolConfirmation')
    render(<ChatToolConfirmation message={makeMessage(pending)} />)

    expect(screen.getByText('search_confluence')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /allow/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /deny/i })).toBeInTheDocument()
  })

  it('renders tool args as JSON', async () => {
    mockChatsStore.currentChat.pendingToolCall = pending
    const { default: ChatToolConfirmation } = await import('../ChatToolConfirmation')
    render(<ChatToolConfirmation message={makeMessage(pending)} />)

    expect(screen.getByText(/SSO config/)).toBeInTheDocument()
  })

  it('calls resumeToolCall("allow") when Allow is clicked', async () => {
    mockChatsStore.currentChat.pendingToolCall = pending
    const { default: ChatToolConfirmation } = await import('../ChatToolConfirmation')
    render(<ChatToolConfirmation message={makeMessage(pending)} />)

    await userEvent.click(screen.getByRole('button', { name: /allow/i }))

    expect(mockResumeToolCall).toHaveBeenCalledWith('allow')
  })

  it('calls resumeToolCall("deny") when Deny is clicked', async () => {
    mockChatsStore.currentChat.pendingToolCall = pending
    const { default: ChatToolConfirmation } = await import('../ChatToolConfirmation')
    render(<ChatToolConfirmation message={makeMessage(pending)} />)

    await userEvent.click(screen.getByRole('button', { name: /deny/i }))

    expect(mockResumeToolCall).toHaveBeenCalledWith('deny')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose "src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatToolConfirmation.test.tsx"
```

Expected: FAIL — module `ChatToolConfirmation` not found.

- [ ] **Step 3: Implement `ChatToolConfirmation`**

Create `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatToolConfirmation.tsx`:

```tsx
import { FC } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import { ButtonSize, ButtonType } from '@/constants'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import type { ChatMessage } from '@/types/entity/conversation'

interface ChatToolConfirmationProps {
  message: ChatMessage
}

const ChatToolConfirmation: FC<ChatToolConfirmationProps> = ({ message }) => {
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const { toolCallPending } = message

  if (!toolCallPending) return null

  const isActive =
    currentChat?.pendingToolCall?.pending_tool_call_id === toolCallPending.pending_tool_call_id
  if (!isActive) return null

  return (
    <div className="mt-4 rounded-lg border border-border-structural bg-surface-base-secondary p-4">
      <p className="text-xs font-medium text-text-quaternary mb-2">Tool call confirmation</p>
      <p className="text-sm font-semibold text-text-primary mb-3">{toolCallPending.tool_name}</p>
      <pre className="text-xs text-text-secondary bg-surface-base-primary rounded p-3 overflow-auto mb-4 whitespace-pre-wrap break-all">
        {JSON.stringify(toolCallPending.tool_args, null, 2)}
      </pre>
      <div className="flex gap-2">
        <Button
          type={ButtonType.PRIMARY}
          size={ButtonSize.SMALL}
          onClick={() => chatGenerationStore.resumeToolCall('allow')}
        >
          Allow
        </Button>
        <Button
          type={ButtonType.SECONDARY}
          size={ButtonSize.SMALL}
          onClick={() => chatGenerationStore.resumeToolCall('deny')}
        >
          Deny
        </Button>
      </div>
    </div>
  )
}

export default ChatToolConfirmation
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose "src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatToolConfirmation.test.tsx"
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/components/ChatHistory/ChatAiMessage/ChatToolConfirmation.tsx src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatToolConfirmation.test.tsx
git commit -m "EPMCDME-13903: Add ChatToolConfirmation component with Allow/Deny buttons"
```

---

### Task 6: Wire `ChatToolConfirmation` into `ChatAiMessage`

**Test-first: yes — test that `ChatAiMessage` renders `ChatToolConfirmation` when the message has `toolCallPending` set.**

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx`

**Interfaces:**
- Consumes: `ChatToolConfirmation` from Task 5
- Produces: `ChatAiMessage` renders `ChatToolConfirmation` below `ChatAiInteractiveBlock`

- [ ] **Step 1: Write the failing test**

Add to `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx`:

First, add a mock for `ChatToolConfirmation` to the existing mock block (near the mock for `ChatAiInteractiveBlock`):

```typescript
vi.mock('../ChatToolConfirmation', () => ({
  default: ({ message }: { message: any }) =>
    message.toolCallPending ? <div data-testid="tool-confirmation" /> : null,
}))
```

Then add the test case in the existing `describe` block:

```typescript
it('renders ChatToolConfirmation when message has toolCallPending', () => {
  const message: ChatMessage = {
    role: 'Assistant',
    createdAt: '2026-01-01T00:00:00.000Z',
    inProgress: false,
    assistant: { id: 'a1', name: 'A' },
    executionId: null,
    toolCallPending: {
      pending_tool_call_id: 'call_abc',
      tool_name: 'search_confluence',
      tool_args: {},
    },
  }
  const indexes = { historyIndex: 0, messageIndex: 0 }

  render(
    <ChatAiMessage
      indexes={indexes}
      message={message}
      totalMessages={1}
      onChangeMessageIndex={vi.fn()}
    />
  )

  expect(screen.getByTestId('tool-confirmation')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose "src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx"
```

Expected: FAIL — `tool-confirmation` element not found.

- [ ] **Step 3: Implement in `ChatAiMessage`**

In `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`:

Add import at the top (after the `ChatAiInteractiveBlock` import):

```typescript
import ChatToolConfirmation from './ChatToolConfirmation'
```

Add `<ChatToolConfirmation>` immediately after `<ChatAiInteractiveBlock>` in the JSX (around line 256):

```tsx
<ChatAiInteractiveBlock
  message={message}
  indexes={indexes}
  isFormEditing={isFormEditing}
  onSubmitted={() => setIsFormEditing(false)}
/>
<ChatToolConfirmation message={message} />
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose "src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx"
```

Expected: all tests PASS.

- [ ] **Step 5: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx
git commit -m "EPMCDME-13903: Render ChatToolConfirmation in ChatAiMessage"
```

---

### Task 7: Chat prompt `ASSISTANT_INTERRUPTED_TOOL_CALL` mode

**Test-first: yes — test that the prompt placeholder and submit button disabled state react to `currentChat.pendingToolCall`.**

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`
- Modify: `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx`

**Interfaces:**
- Consumes: `Conversation.pendingToolCall` from Task 1/2/4
- Produces: prompt shows interrupted visual and disabled input when `pendingToolCall` is set

- [ ] **Step 1: Write the failing test**

Add to `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx`:

First update the `mockChatsStore` default (add `pendingToolCall: null`) — find the `mockChatsStore` declaration and add the field:

```typescript
mockChatsStore: {
  currentChat: {
    id: 'chat-1',
    history: [[{ inProgress: true }]],
    isInterrupted: false,
    isWorkflow: false,
    assistantIds: ['assistant-1'],
    pendingToolCall: null,
  },
},
```

Then add the test group:

```typescript
describe('tool call pending state', () => {
  beforeEach(() => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
      pendingToolCall: {
        pending_tool_call_id: 'call_abc',
        tool_name: 'search_confluence',
        tool_args: {},
      },
    }
  })

  afterEach(() => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [[{ inProgress: true }]],
      isInterrupted: false,
      isWorkflow: false,
      assistantIds: ['assistant-1'],
      pendingToolCall: null,
    }
  })

  it('shows the tool call pending placeholder when pendingToolCall is set', () => {
    render(<ChatPrompt />)
    // The Editor is mocked to null, but we can check that the submit button is absent/disabled
    // and that the stop button is not shown (chat is not in-progress)
    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit -- --reporter=verbose "src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx"
```

Expected: FAIL — send button is shown even when `pendingToolCall` is set.

- [ ] **Step 3: Implement in `ChatPrompt.tsx`**

In `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`:

**3a. Add the new prompt mode constant** (the `PROMPT_MODES` object, around line 51):

```typescript
const PROMPT_MODES = {
  DEFAULT: 'default',
  WORKFLOW: 'workflow',
  WORKFLOW_INTERRUPTED: 'workflow_interrupted',
  ASSISTANT_INTERRUPTED_TOOL_CALL: 'assistant_interrupted_tool_call',
} as const
```

**3b. Add placeholder and submit label entries** (in `PLACEHOLDERS` and `SUBMIT_LABELS` objects around lines 59-73):

```typescript
// In PLACEHOLDERS:
[PROMPT_MODES.ASSISTANT_INTERRUPTED_TOOL_CALL]: 'Action required: allow or deny the tool call above',

// In SUBMIT_LABELS (button not shown in this mode but the type requires the key):
[PROMPT_MODES.ASSISTANT_INTERRUPTED_TOOL_CALL]: 'Send',
```

**3c. Add `isToolCallPending` and prompt mode** (around line 122, immediately after `isInterrupted`):

Replace:
```typescript
const isInterrupted = currentChat?.isInterrupted

let promptMode: PromptMode = PROMPT_MODES.DEFAULT
if (isInterrupted) promptMode = PROMPT_MODES.WORKFLOW_INTERRUPTED
else if (currentChat?.isWorkflow) promptMode = PROMPT_MODES.WORKFLOW
```

With:
```typescript
const isInterrupted = currentChat?.isInterrupted
const isToolCallPending = !!currentChat?.pendingToolCall

let promptMode: PromptMode = PROMPT_MODES.DEFAULT
if (isInterrupted) promptMode = PROMPT_MODES.WORKFLOW_INTERRUPTED
else if (isToolCallPending) promptMode = PROMPT_MODES.ASSISTANT_INTERRUPTED_TOOL_CALL
else if (currentChat?.isWorkflow) promptMode = PROMPT_MODES.WORKFLOW
```

**3d. Disable submit when tool call is pending** (in `canSubmit` IIFE around line 131):

Replace:
```typescript
const canSubmit = (() => {
  if (isInterrupted) return !isInProgress && !fileUpload.hasActiveUploads
  const hasFiles = !!files.length
  const hasPrompt = prompt.message.length > 0
  return (hasPrompt || hasFiles) && !fileUpload.hasActiveUploads && !isInProgress
})()
```

With:
```typescript
const canSubmit = (() => {
  if (isToolCallPending) return false
  if (isInterrupted) return !isInProgress && !fileUpload.hasActiveUploads
  const hasFiles = !!files.length
  const hasPrompt = prompt.message.length > 0
  return (hasPrompt || hasFiles) && !fileUpload.hasActiveUploads && !isInProgress
})()
```

**3e. Extend interrupted visual in `getBorderWrapperClassName` call** (inside the JSX return, find `getBorderWrapperClassName(...)`):

```typescript
// Before:
getBorderWrapperClassName(resizable, !!isInterrupted, isEditorFocused, !!isInProgress)
// After:
getBorderWrapperClassName(resizable, !!isInterrupted || isToolCallPending, isEditorFocused, !!isInProgress)
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit -- --reporter=verbose "src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx"
```

Expected: all tests PASS.

- [ ] **Step 5: Run all unit tests**

```bash
npm run test:unit
```

Expected: all test suites PASS.

- [ ] **Step 6: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/pages/chat/components/ChatPrompt/ChatPrompt.tsx src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx
git commit -m "EPMCDME-13903: Add ASSISTANT_INTERRUPTED_TOOL_CALL prompt mode for tool call pending state"
```
