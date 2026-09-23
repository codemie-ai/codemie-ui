# Technical Analysis: Intermittent Empty Timestamp Fix on Page Refresh

**Ticket:** EPMCDME-14797  

## 1. Investigation Findings
1. **Backend Generator Lifecycle (`codemie/`):**
   - In `_drain_and_save_chat_history`, once generation finishes, `generator_mgr.unregister_generator(conversation_id)` is invoked.
   - Any subsequent call to `GET /conversations/{id}/stream` receives an empty `StreamingResponse(empty_stream())`.
2. **Frontend Stream Consumption (`codemie-ui/`):**
   - In `chatGeneration.ts`, `_handleStreamResponse` previously unconditionally set `historyItem.inProgress = false`.
   - On a 0-byte stream, the stream loop ended immediately without processing chunks. `historyItem.response` remained empty, but `inProgress` was set to `false`.
   - In `reconnectChatStream`, the `finally` block checked `if (inProgressMessage.inProgress)`, which evaluated to `false`, omitting the polling fallback.
   - The UI received an empty assistant turn with `inProgress=false`, causing the message header to render the timestamp and complete checkmark without the text.

## 2. Architectural Solution
1. **Terminal Chunk Detection:**
   - Only transition `inProgress` to `false` when a terminal chunk indicator (`last: true`, `generated`, or non-empty `capturedStreamText`) is received.
2. **Immediate Polling Fallback:**
   - When the stream reader finishes without receiving a terminal chunk, `reconnectChatStream` recognizes `!streamCompleted` and calls `chatsStore.pollIncompleteChat(chat.id, true)` immediately.
   - The immediate poll fetches the completed conversation from `GET /conversations/{id}`, cleanly updating the reactive Valtio store.
3. **Cognitive Complexity Guard:**
   - Factored out helper functions `syncPolledChatHistory` and `finalizeTimedOutPoll` in `chats.ts` to ensure ESLint `sonarjs/cognitive-complexity` passes strictly under threshold.
