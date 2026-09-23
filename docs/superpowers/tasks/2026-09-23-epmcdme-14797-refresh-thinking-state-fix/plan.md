# Implementation Plan: Fix Intermittent Empty Timestamp on Page Refresh

**Ticket:** EPMCDME-14797  
**Goal:** Prevent intermittent empty message (displaying only timestamp and checkmark icon) when refreshing the page during assistant thinking state on fast generations.

## Tasks

### Task 1: Guard Stream Handler Completion in `chatGeneration.ts`
- Update `_handleStreamResponse` to only set `historyItem.inProgress = false` and compute `processingTime` when terminal chunks (`response?.last`, `response?.generated`, or `response?.capturedStreamText`) are present.
- Return `response` from `_handleStreamResponse`.
- In `reconnectChatStream`, track `streamCompleted` and trigger `chatsStore.pollIncompleteChat(chat.id, true)` in the `finally` block when the stream closes without completed content.
- Update `_handleNonStreamResponse` to only clear `inProgress` when `data.generated` exists.

### Task 2: Enhance `pollIncompleteChat` in `chats.ts`
- Add `immediate?: boolean` parameter to `pollIncompleteChat(id, immediate = false)`. When `true`, invoke `poll()` immediately instead of waiting for `CHAT_POLL_INTERVAL_MS`.
- Extract `syncPolledChatHistory` and `finalizeTimedOutPoll` outside the store to maintain low cognitive complexity (< 15).
- If polling exceeds `MAX_CHAT_POLL_ATTEMPTS`, finalize lingering in-progress messages to prevent indefinite spinner.

### Task 3: Unit Testing
- Test in `chatGeneration.reconnect.test.ts`:
  - Verify that an empty stream fallback immediately triggers `pollIncompleteChat(chat.id, true)`.
  - Verify terminal chunk properly completes generation.
- Test in `chats.pollIncompleteChat.test.ts`:
  - Verify immediate polling runs without timer delay.
  - Verify timeout ceiling resets in-progress flags after max attempts.

### Task 4: Pre-push Quality Gates
- Execute `npm run typecheck`, `npm run lint`, and full unit tests to ensure zero regressions.
