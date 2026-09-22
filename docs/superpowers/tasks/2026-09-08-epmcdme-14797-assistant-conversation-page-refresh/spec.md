# Specification: Prevent Assistant Conversation Loss During Page Refresh

**Jira Ticket:** EPMCDME-14797  
**Goal:** Prevent loss of assistant conversations on page refresh, and allow the background agent thread to continue generation after network disconnection/refresh, while enabling an explicit abort signal and fixing the ThinkingLoader/processing duration display.

## 1. Requirements & Acceptance Criteria
- **User Prompt Retention:** User prompt is saved immediately in the DB on submission so that it's never lost if a page refresh occurs before generation starts/completes.
- **Background Generation:** On TCP socket disconnection (refresh/F5), the agent thread continues generating and draining the stream, compiling and saving the final complete reply with status `SUCCESS`.
- **In-Progress State Reflection:** The `GeneratedMessage` model and `ChatTurnData` include fields `in_progress` and `status` to reflect whether the turn is active.
- **Re-attachment and Polling:** On page load/refresh, if the fetched conversation indicates `in_progress` is true, the frontend displays the user query and an active loader, then polls the backend conversation endpoint every 2.5 seconds until finalized.
- **Explicit Abort Endpoint:** Add `POST /v1/conversations/{id}/abort` to allow the user to explicitly terminate generation. Only this explicit abort (or other explicit actions, not network disconnection) sets status `INTERRUPTED` and cancels the background execution thread.
- **Thinking Loader & Processing Time Suppression (Triple-Lock):** During active background generation (when `in_progress` is true), the UI must immediately display the animated `<ThinkingLoader />` and strictly suppress any premature completion metadata (e.g. `Processed in: 0.03s`).
  - **Lock 1 (Backend)**: In-progress turns set `response_time = None` inside `_build_chat_history_messages`.
  - **Lock 2 (Frontend Adapter)**: `transformHistoryGroup` strictly maps `processingTime: isAssistantInProgress ? undefined : assistantItem.responseTime`.
  - **Lock 3 (Frontend Presentation)**: `ChatAiMessage` component memoizes `processingTime` as `null` whenever `isInProgress` is active.

## 2. Scope & Boundaries
- Applies strictly to assistant conversations (`POST /v1/assistant/chat` and its associated models and endpoints).
- Does not affect workflows which already use a dedicated abort path.

## 3. High-Level Design
- Decouple Starlette low-level transport disconnection events from agent cancellation.
- Create thread-safe registry `GenerationManager` to map active generation threads.
- Implement background-draining worker to persist response data in the DB on transport exit.
- Suppress premature response time metadata on both the serialization, transformation, and presentation layers during active generating state.
