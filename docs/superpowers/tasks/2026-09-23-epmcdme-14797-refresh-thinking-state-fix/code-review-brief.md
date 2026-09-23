# Code Review Brief: EPMCDME-14797 (Frontend Stream Reconnect & Polling Fix)

Fix intermittent empty timestamp / checkmark displayed on page refresh during assistant thinking state.

### Key Changes
- In `src/store/chatGeneration.ts`:
  - Updated `_handleStreamResponse` to only clear `inProgress` and assign `processingTime` when terminal chunk markers (`response?.last`, `response?.generated`, or `response?.capturedStreamText`) are present.
  - Returned `response` from `_handleStreamResponse` to allow caller to inspect stream completion status.
  - In `reconnectChatStream`, tracked `streamCompleted` and ensured `finally` block triggers immediate `chatsStore.pollIncompleteChat(chat.id, true)` if the stream closed without terminal content.
  - In `_handleNonStreamResponse`, only cleared `inProgress` when `data.generated` is present.
- In `src/store/chats.ts`:
  - Extended `pollIncompleteChat(id: string, immediate?: boolean)` to support an immediate zero-delay first poll.
  - Extracted `syncPolledChatHistory` and `finalizeTimedOutPoll` to keep cognitive complexity well under 15.
  - Added safety fallback: if poll reaches max attempts (150), resets lingering `inProgress` flags and updates list item.
- In `src/store/__tests__/`:
  - Added unit tests in `chatGeneration.reconnect.test.ts` for empty-stream fallback and terminal chunk handling.
  - Added unit tests in `chats.pollIncompleteChat.test.ts` for immediate polling and timeout ceiling cleanup.
