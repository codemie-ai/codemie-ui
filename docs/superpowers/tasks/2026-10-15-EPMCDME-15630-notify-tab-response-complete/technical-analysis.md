# Technical Research

**Task**: chat streaming completion notification document visibility favicon title
**Generated**: 2026-10-15
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15630 Notify users when an LLM response is completed while the CodeMie tab is inactive.

Summary: Notify users when an LLM response is completed while the CodeMie tab is inactive.

Description: As a CodeMie user, I want to be notified when an LLM has finished generating a response while I am viewing another browser tab or application, so that I can return to the completed response promptly without repeatedly checking the CodeMie tab. The solution should provide a non-intrusive completion indication for inactive tabs. It should update the browser tab appearance (tab title and/or favicon) when a response is ready. Where browser notifications are supported and permission is granted, also provide a browser notification. The notification must not interrupt the user when the CodeMie tab is already active; in that case keep the normal tab title and favicon unchanged and show no browser notification.

Preconditions: user has an open CodeMie chat and submits a prompt; response takes a noticeable time; tab becomes inactive before completion; browser notification may need permission.

Scenarios: (1) user submits prompt and switches tab while LLM generates; (2) LLM completes; (3) tab title and/or favicon updated; (4) if permission available, browser notification shown; (5) user returns and reads; (6) returning to tab clears indicator and restores normal title/favicon; (7) if tab active on completion, no title/favicon change and no notification.

Affected areas: CodeMie chat UI; LLM response completion handling (streaming end / success only, not errors); browser tab title and favicon management; Browser Notification API integration and permission handling; frontend state for active/inactive tab detection (visibilitychange / focus).

Acceptance criteria:
1. Completion while tab inactive => tab visibly indicates ready (title and/or favicon).
2. Indication uses an accessible mechanism, not color alone.
3. Permission granted => browser notification shown after completion while inactive.
4. Notification clearly identifies CodeMie and says an AI response is ready.
5. Tab active at completion => no title/favicon change, no notification.
6. Permission unavailable/denied/unsupported => tab indication still works, no error.
7. Returning to CodeMie clears indication and restores normal title/favicon.
8. Indicators do not appear before successful completion and do not remain after returning to the conversation.
9. Does not disrupt existing streaming, error handling, or chat behaviour.
10. Accessible; not color-only.

---

## 2. Codebase Findings

### Existing Implementations
- `src/store/chatGeneration.ts` — `chatGenerationStore` (line 588), valtio proxy owning generation. Entry `createChatGeneration` (591) → `_sendRequest` (683). Stream-related private methods declared in the store interface: `_handleGenerationStream` (183), `_processStreamChunk` (188), `_handleChunk` (193), `_finishThoughts` (200), `_handleGenerationAbort` (201), `_handleGenerationStreamError` (199), `_handleStreamResponse` (221), `_handleNonStreamResponse` (215), `_handleRequestError` (213).
- `StreamDrainState` (src/store/chatGeneration.ts:82) — `{ cachedValue, response, receivedFinalChunk, notificationTimeoutId }`. `receivedFinalChunk` is the only success-related flag seen in explored source.
- `STREAMING_NOTIFICATION` = `'Still waiting for response, agent is thinking'`, interval 5 s (src/store/chatGeneration.ts:66-67), scheduled by `_scheduleWaitingNotification` / `_clearWaitingNotification`. An in-chat "still waiting" hint, not a completion signal.
- `src/utils/stream.ts` — class `Stream` (27): `push()` buffers text; `run()` drains it on a 10 ms `setTimeout` with adaptive chunk sizes; `finish()` resets. `streamChunkToObject` (89) parses NDJSON.
- `src/types/entity/conversation.ts` — interface `Stream` (152, has `notification?`); `ChatMessage` (161) with `inProgress?`, `generationStopped?` (user Stop), `response?`; `Conversation` (212) with `isInterrupted?`.
- `src/types/chatGeneration.ts` — `StreamEventType = 'thought' | 'chunk' | 'complete' | 'error'` (39). Handling site for `complete` not returned by codegraph this pass.
- `src/utils/api.ts` — `API.stream()` (206): returns NDJSON reader when `Content-Type` is `application/x-ndjson`, else raw `Response`; on `!response.ok` toasts `'Failed to generate answer'` and throws.
- `src/store/chats.ts` — `chatsStore` (299): `currentChat`, `isNewChat`, `chats`. `getChat` (360) reconnects an in-progress chat via `chatGenerationStore.reconnectChatStream`, or `pollIncompleteChat` (396) when history has `inProgress` messages.
- `src/hooks/usePolling.tsx` — `usePolling` (83) with `pauseWhenHidden`; `isTabHidden` (35) reads `document.visibilityState`; `handleVisibilityChange` (182) registered on `document` `visibilitychange` (200). Only visibility handling found in src.
- `src/hooks/appLevel/usePageTitle.ts` — `usePageTitle` (21) sets `document.title` in an effect keyed on `useMatches()` (24-32). Titles from `src/constants/pageTitles.ts` (`APP_TITLE` 16, `ROUTE_ID_TO_TITLE` 18). Called from `App.tsx`.

### Architecture and Layers Affected
- **Store**: `chatGenerationStore` (completion), `chatsStore` (current chat, poll path).
- **Transport/utils**: `api.ts` (`stream`), `utils/stream.ts` (`Stream` drain).
- **App-level hooks**: `usePageTitle` (title owner), `usePolling` (visibility precedent).
- **Components**: `ChatPrompt.tsx` and `ChatHistory/ChatAiMessage/ChatAiMessage.tsx` are among 27 callers of `chatGenerationStore`.

### Integration Points
- `chatGenerationStore` ↔ `chatsStore` (current chat, poll, reconnect).
- `chatGenerationStore` → `api.stream` / `api.post`, `toaster`.
- `App.tsx` → `usePageTitle`.
- Browser APIs already used: `document` visibility (usePolling), `document.title` (usePageTitle), `sessionStorage` (api.ts).

### Patterns and Conventions
- Valtio `proxy()` stores with methods on the object; components read via `useSnapshot`.
- Visibility handled inside a hook with `addEventListener('visibilitychange')` and cleanup.
- One hook (`usePageTitle`) owns `document.title` and rewrites it on route-match change.

---

## 3. Documentation Findings

### Guides and Architecture Docs
Guide index `.ai-run/guides/README.md`. Read: `.ai-run/guides/patterns/accessibility-patterns.md`, `.ai-run/guides/development/security-patterns.md` (first 60 lines). Not read: `patterns/state-management.md`, `architecture/architecture.md`, `development/api-integration.md`, `development/error-handling-patterns.md`.

### Architectural Decisions
None found in the guides read. No ADR for notifications or tab state.

### Derived Conventions
- Accessibility guide: WCAG 2.1 AA; "Color not the only means of conveying status"; status uses `aria-live='polite'`; decorative SVGs `aria-hidden='true'`.
- Security guide: API response content is untrusted; a notification body should be a static string.

---

## 4. Testing Landscape

### Existing Coverage
- Store: `src/store/__tests__/chatGeneration.prepareRequestData.test.ts`, `chatGeneration.storageGuards.test.ts`, `chatGeneration.resumeToolCall.test.ts`, `chatGeneration.resumeWorkflowExecution.test.ts`, `src/store/__tests__/chats.pollIncompleteChat.test.ts`.
- Stream: `src/utils/__tests__/stream.test.ts`.
- Visibility: `src/hooks/__tests__/usePolling.test.tsx` (`pauseWhenHidden`).
- Title: `src/hooks/appLevel/__tests__/usePageTitle.test.tsx`.

### Testing Framework and Patterns
Vitest with React Testing Library, `unit` and `integration` projects (from AGENTS.md; version not checked). `usePolling.test.tsx` is the closest visibility precedent.

### Coverage Gaps
- No test for chat-driven `document.title` changes (only route-based title).
- No code or test for `Notification`, `requestPermission`, or favicon in src (codegraph).
- Success-only branch of `_handleStreamResponse` / `_processStreamChunk` not located in source this pass; its coverage is unverified.

---

## 5. Configuration and Environment

### Environment Variables
None found for this feature. Adjacent: `VITE_API_URL` / `window._env_` (api.ts constructor).

### Configuration Files
None for notifications or favicon. `public/assets/` holds `android-chrome-192x192.png` and `android-chrome-512x512.png`. No `favicon.ico` seen in the public listing; `index.html` not inspected this pass.

### Feature Flags and Deployment Concerns
None found in explored code. Notification permission is per-origin and user-controlled.

---

## 6. Risk Indicators

- Two success paths: live NDJSON stream (`receivedFinalChunk`) and poll-driven completion after reload (`chats.ts:396`). A stream-only hook misses reconnected generations.
- Speculative: `Stream.run()` drains on a 10 ms timer, so network end can precede visible text end. Raise the completion signal after drain.
- Error, abort, and `generationStopped` branches must not set the indicator (AC-8).
- Speculative: `usePageTitle` rewrites `document.title` on every route-match change and will overwrite a chat title indicator unless restore logic is shared.
- `STREAMING_NOTIFICATION` name collides with any new "notify" helper.
- Speculative: favicon swap needs a new icon asset; the served `index.html` must be checked first.
- Speculative: `Notification.requestPermission()` must run from a user gesture (prompt submit), not on load.
- Speculative: title changes are not reliably announced by screen readers; an `aria-live='polite'` region may be needed for AC-2/AC-10.
- No existing tests for title, favicon, or Notification; new hook needs active, inactive, denied, and unsupported cases.

---

## 7. Summary for Complexity Assessment

The change touches the success branch of `chatGenerationStore` (src/store/chatGeneration.ts), the poll-driven completion in `src/store/chats.ts`, and a new app-level indicator alongside `usePageTitle` and the `usePolling` visibility pattern. File surface is moderate: one store touch point, one new hook, and possibly an `index.html` or `public/` asset. Novelty is low-to-medium: visibility handling exists, but no Notification or favicon code exists in src.

Test posture is weak in this area: store and hook tests exist for neighbours, but nothing covers chat-driven title, favicon, or Notification. Key risks: two completion paths, typewriter drain delaying visible completion, `usePageTitle` overwriting the title, and an unconfirmed favicon source. Open questions for spec: which completion signal is authoritative, whether title or favicon is primary, and whether the notification body is fixed text.

---

## 8. External References

None named by the task.
