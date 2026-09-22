# Implementation Plan: Prevent Assistant Conversation Loss During Page Refresh

## Tasks

### Task 1: Backend Conversation Model Extension & response_time Suppression
Update `GeneratedMessage` and `ChatTurnData` models to support `in_progress` and `status` fields. Update history builder to pass these fields, and ensure `response_time` is set to `None` when `in_progress` is true.
- **Test-first:** Yes — Unit tests in `tests/` verifying `GeneratedMessage` serialization with `in_progress`, `status` and `response_time=None` when active.

### Task 2: Backend GenerationManager
Implement `GenerationManager` thread-safe singleton to track active assistant generator threads.
- **Test-first:** Yes — Test cases verifying register, unregister, is_active, and abort actions in `GenerationManager`.

### Task 3: Backend Initial Prompt Inception
Ensure the user prompt is saved immediately in the DB with `in_progress=True` and status `SUCCESS` in `_handle_stream` before streaming starts.
- **Test-first:** Yes — Assert in tests that the initial turn with `in_progress=True` is persisted upon endpoint call.

### Task 4: Backend Disconnect Handling & Background Drainer
Update `_serve_data` and `_handle_client_disconnect` to continue draining the queue in a background thread pool on transport exit, completing the turn and saving to DB.
- **Test-first:** Yes — Test simulating connection drop during streaming and checking that the thread completes generation and saves with status `SUCCESS`.

### Task 5: Backend Abort Route
Add `POST /v1/conversations/{conversation_id}/abort` to explicitly cancel a running generation and set status `INTERRUPTED`.
- **Test-first:** Yes — API test calling abort and verifying `INTERRUPTED` status in the DB and thread cancellation.

### Task 6: Frontend chatHelpers Mapping & processingTime Suppression
Update `transformHistoryGroup` and associated interfaces in `codemie-ui/src/utils/chatHelpers.ts` to map `in_progress` from backend to frontend `inProgress`. Additionally, ensure `processingTime` is mapped as `undefined` for active, in-progress assistant messages.
- **Test-first:** Yes — Unit test in `chatHelpers.test.ts` verifying transformation of a chat history with an active, in-progress turn and omission of `processingTime`.

### Task 7: Frontend Re-attachment Polling & ThinkingLoader Suppression Guard
Update `getChat` in `codemie-ui/src/store/chats.ts` to start a polling mechanism if the loaded history has any message with `inProgress` true. Update `ChatAiMessage.tsx` component to memoize and suppress `processingTime` when `isInProgress` is active, avoiding any premature "Processed in:" flashes.
- **Test-first:** Yes — Mock `getChat` response and assert polling loops correctly. Add unit tests for `ChatAiMessage` ensuring it renders `ThinkingLoader` and hides `Processed in` metadata when `inProgress` is true even if `processingTime` is set.

### Task 8: Frontend Abort Invocation
Update `stopChatGeneration` in `codemie-ui/src/store/chatGeneration.ts` to call the backend abort endpoint.
- **Test-first:** Yes — Mock API call to abort endpoint and assert it is called when stopChatGeneration is executed.
