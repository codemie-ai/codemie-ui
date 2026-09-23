# Specification: Fix Intermittent Empty Timestamp on Assistant Page Refresh

**Jira Ticket:** EPMCDME-14797  
**Goal:** Eliminate the race condition where refreshing the page during assistant thinking state intermittently displays an empty message with only a timestamp and completed checkmark, requiring a second refresh.

## 1. Problem Description & Root Cause
When the assistant generates a fast answer, the backend's `_drain_and_save_chat_history` quickly finishes persisting the turn to PostgreSQL (`in_progress=False`) and unregisters the generator from `GenerationManager`.
When the browser reloads:
1. `GET /conversations/{id}` returns the chat turn before it is finalized or during finalization with `in_progress=true`.
2. Frontend calls `reconnectChatStream`, which requests `GET /conversations/{id}/stream`.
3. Because the generator was already unregistered in the backend, `GenerationManager.get_generator()` returns `None`, and the endpoint returns an empty 200 stream with 0 bytes.
4. Previously, `_handleStreamResponse` unconditionally set `inProgressMessage.inProgress = false` even on an empty stream.
5. In `reconnectChatStream`, the `finally` block checked `if (inProgressMessage.inProgress) chatsStore.pollIncompleteChat(...)`, which was skipped because `inProgress` was already set to `false`.
6. As a result, the UI rendered `<ProcessingCompleteSvg />` with an empty response body and timestamp until the user manually refreshed again.

## 2. Requirements & Acceptance Criteria
1. **Accurate Stream Completion:** `_handleStreamResponse` must only set `inProgress = false` and assign `processingTime` when actual terminal content (`last`, `generated`, or `capturedStreamText`) was received.
2. **Immediate Polling Fallback:** When `reconnectChatStream` encounters an empty stream (0 bytes), it must immediately invoke `chatsStore.pollIncompleteChat(chat.id, true)` without waiting for the initial interval delay.
3. **Reactive Store Sync:** `pollIncompleteChat` must immediately fetch `GET /conversations/{id}` and update the reactive store history, displaying the full assistant answer.
4. **Safety Timeout:** Polling must safely terminate after `MAX_CHAT_POLL_ATTEMPTS` (150 attempts) and clean up any lingering flags.
