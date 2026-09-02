# EPMCDME-13903: Chat Tool Call Confirmations

## Overview

When an assistant has `tool_permissions.require_confirmation = true`, the backend pauses before executing a tool and sends a `tool_call_pending` event in the SSE stream. The frontend must:

1. Detect the pause, render Allow/Deny buttons inline below the tool call in the chat message.
2. Disable the chat prompt and show an interrupted visual while waiting.
3. On Allow or Deny, call the resume endpoint and stream the continuation.
4. Restore the confirmation UI after a page refresh if the conversation is still paused.

## Scope

**Included:**
- SSE stream handler: handle `tool_call_pending` on the final chunk
- New types: `ToolCallPendingEvent`, extended `Conversation.pendingToolCall`
- New component: `ChatToolConfirmation` (inline Allow/Deny below the thought)
- Chat prompt: interrupted visual + disabled input when `pendingToolCall` is set
- `chatGenerationStore.resumeToolCall(action)` method + streaming via existing `_sendRequest`
- Page-refresh recovery: read `pending_tool_call` from `GET /v1/conversations/{id}`, set on `Conversation`
- Error handling for 403 / 404 / 422 from the resume endpoint

**Excluded:**
- Assistant settings toggle for `tool_permissions.require_confirmation` (deferred; backend feature-flagged)
- A2A assistant type (422 is surfaced as a generic error; no special UI)

## Data Shapes

### New type `ToolCallPendingEvent`

```ts
// src/types/entity/toolCallConfirmation.ts
export interface ToolCallPendingEvent {
  pending_tool_call_id: string
  tool_name: string
  tool_args: Record<string, unknown>
}
```

### Updated `StreamChunk` (conversation.ts)

Add optional field:

```ts
interface StreamChunk {
  // ... existing fields ...
  tool_call_pending?: ToolCallPendingEvent | null
}
```

### Updated `ChatMessage` (conversation.ts)

Add optional field:

```ts
interface ChatMessage {
  // ... existing fields ...
  toolCallPending?: ToolCallPendingEvent | null
}
```

### Updated `Conversation` (conversation.ts)

Add optional field:

```ts
interface Conversation {
  // ... existing fields ...
  pendingToolCall?: ToolCallPendingEvent | null
}
```

This mirrors `isInterrupted` on `Conversation`. The field is `null` when the conversation is idle and populated when paused.

### Backend `GET /v1/conversations/{id}` response

The backend returns `pending_tool_call?: { pending_tool_call_id, tool_name, tool_args } | null`. Map this to `Conversation.pendingToolCall` in `transformChatBEtoFE`.

## SSE Stream Handler

**File:** `src/store/chatGeneration.ts` — `_handleChunk()`

Current logic: when `chunk.last === true`, finish the stream and mark `inProgress = false`.

New logic: when `chunk.last === true`:
1. If `chunk.tool_call_pending` is set:
   - Set `historyItem.toolCallPending = chunk.tool_call_pending`
   - Set `chatsStore.currentChat.pendingToolCall = chunk.tool_call_pending`
   - Finish stream and set `inProgress = false` (same as before — stream is truly closed)
2. If `chunk.tool_call_pending` is absent/null: normal completion (no change).

The `tool_call_pending` field may only appear on the `last: true` chunk per the API contract.

## New Component: `ChatToolConfirmation`

**File:** `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatToolConfirmation.tsx`

Mirrors the structure of `ChatAiInteractiveBlock`.

**When to render:** when `message.toolCallPending` is set.

**Active vs. disabled:** render the block only when `conversation.pendingToolCall` is set and `conversation.pendingToolCall.pending_tool_call_id === message.toolCallPending.pending_tool_call_id`. Once the user acts (or after page refresh with no pending call), `chat.pendingToolCall` is null and the block is not shown. No read-only "already answered" state is needed — the LLM's follow-up response explains what happened.

**UI layout:**
- Header: tool name (e.g. `search_confluence`)
- Body: tool args rendered as a formatted JSON code block
- Footer: `Allow` (primary) and `Deny` (secondary/danger) buttons

**On Allow:** calls `chatGenerationStore.resumeToolCall('allow')`
**On Deny:** calls `chatGenerationStore.resumeToolCall('deny')`

**Placement in `ChatAiMessage`:** rendered immediately after the thoughts/tool call section, before the response text — same slot as `ChatAiInteractiveBlock`. Both blocks must not render at the same time (they are mutually exclusive per message).

## Chat Prompt Changes

**File:** `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`

Add a new prompt mode alongside the existing `WORKFLOW_INTERRUPTED`:

```ts
const PROMPT_MODES = {
  DEFAULT: 'default',
  WORKFLOW: 'workflow',
  WORKFLOW_INTERRUPTED: 'workflow_interrupted',
  ASSISTANT_INTERRUPTED_TOOL_CALL: 'assistant_interrupted_tool_call',   // NEW
}
```

When `currentChat?.pendingToolCall` is set:
- `promptMode = PROMPT_MODES.ASSISTANT_INTERRUPTED_TOOL_CALL`
- Placeholder: `'Action required: allow or deny the tool call above'`
- Submit button: disabled — follow the same `isInterrupted` guard pattern used for `WORKFLOW_INTERRUPTED` (the prompt is not submittable while a tool call is pending)
- Border: `bg-interrupted-primary` CSS class — same class already applied when `isInterrupted` is true; extend that condition to also cover `!!pendingToolCall`

The text editor is read-only while a tool call is pending. Follow the exact same code path as the workflow interruption: the `isInterrupted`-style boolean check should also be true when `pendingToolCall` is set, so all the existing CSS and disabled-state guards apply without duplication.

## `chatGenerationStore.resumeToolCall`

**File:** `src/store/chatGeneration.ts`

New method following the same pattern as `resumeWorkflowExecution`.

Add two fields to `ChatRequest` in `src/types/chatGeneration.ts`:
```ts
toolCallAction?: 'allow' | 'deny'
pendingToolCallId?: string
```

Add a branch to `_prepareRequestData` (before the `!chat.isWorkflow` check):
```ts
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
```

The `resumeToolCall` method itself:
```ts
async resumeToolCall(action: 'allow' | 'deny') {
  const chat = chatsStore.currentChat
  if (!chat?.pendingToolCall) return

  const { pending_tool_call_id } = chat.pendingToolCall

  // Clear pending state so the prompt unblocks immediately
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
}
```

The response is a normal NDJSON stream identical to the regular chat endpoint — no special handling beyond what `_handleStreamResponse` already does.

## Page-Refresh Recovery

**File:** `src/utils/chatHelpers.ts` — `transformChatBEtoFE()`

After mapping `history`, map `chatBE.pending_tool_call` (if present) to `conversation.pendingToolCall`.

Also restore `toolCallPending` on the last assistant `ChatMessage` in history so `ChatToolConfirmation` renders on the correct message.

**File:** `src/store/chats.ts` — `getChat()`

No change needed beyond `transformChatBEtoFE` handling the field. `setOpenChat` already merges the full `Conversation` object.

## Error Handling

Errors from `POST .../tool-call/resume` surface via the existing stream error path in `_handleStreamResponse`. Map HTTP status to user-visible toast messages:

| Status | Message |
|--------|---------|
| 403 | "You no longer have access to this conversation." |
| 404 | "This tool call confirmation has expired or was already acted on." |
| 422 | "Tool call confirmations are not supported for this assistant." |

Use the existing `chatGenerationStore` error-toast pattern (same as other stream errors).

## Out of Scope

- `tool_permissions.require_confirmation` toggle in the assistant form — deferred.
- Any UI change for assistants without `require_confirmation` — zero behavior change.
