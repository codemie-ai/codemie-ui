# EPMCDME-15630 Notify tab on completed LLM response Implementation Plan

## Acceptance criteria

- Response completes while the tab is inactive: document.title shows a "Response ready" prefix.
- The indication is text, not colour or icon alone; a polite live region announces "AI response ready".
- With Notification permission `granted`, a browser notification titled "CodeMie" with body "AI response is ready" appears on completion while inactive.
- Tab active at completion: no title change and no notification.
- Permission default, denied, or unsupported: tab indication still works, no error thrown.
- Returning to the tab clears the prefix and restores the normal route title.
- Indicator only after successful completion (not on error, abort, or generationStopped); cleared on return.
- Streaming, error handling and chat behaviour unchanged.

> **For agentic workers:** Implement task-by-task. Commit per task using the repository's existing convention, carrying ticket EPMCDME-15630. Steps use checkbox syntax.

**Goal:** Flag the CodeMie tab (title prefix, live region, optional browser notification) when an AI response finishes while the tab is hidden.

**Architecture:** One Valtio store owns `pending` and the notification side effect; `usePageTitle` builds the title from the same store so route changes and the indicator coexist; the two success paths (live NDJSON drain and poll-driven completion) call one `markResponseReady()`. Permission is requested only from prompt submit.

**Tech Stack:** React 18, Valtio, react-router 7, Vitest + React Testing Library (unit and integration projects).

**Spec:** none (inline requirements; acceptance criteria above). Technical analysis: `docs/superpowers/tasks/2026-10-15-EPMCDME-15630-notify-tab-response-complete/technical-analysis.md`.

## Decisions (assumptions recorded)

- Indicator is document.title prefix only. No favicon change, no new icon asset.
- Completion fires after the Stream drain has visibly finished, on both paths.
- Helper is named `responseReadyStore` / `markResponseReady` (not `notify*`, to avoid STREAMING_NOTIFICATION).
- Live region is a visually hidden `role="status" aria-live="polite"` node; it is kept because title alone is not reliably announced.
- Negative constraints: no favicon change; no permission request on load; no indicator on error/abort/generationStopped; no indicator after returning; no notification when visible; no new behaviour on streaming or error paths; helper not named STREAMING_NOTIFICATION. Each is pinned by the test in Tasks 1, 3, 4 or 5.
- Review Focus (tests in owning tasks): Notification API absent (Task 1); `requestPermission` rejects or throws (Task 5); `document.hidden` undefined (Task 1); route title changes while pending (Task 2); poll finalising a timed-out chat (Task 4).

---

### Task 1: Response-ready store

**Files:**
- Create: `src/store/responseReady.ts`
- Test: `src/store/__tests__/responseReady.test.ts`

**Interfaces:**
- Produces: `responseReadyStore` with `pending: boolean`, `markResponseReady(): void`, `clearResponseReady(): void`, `requestNotificationPermission(): Promise<void>`; pure `formatDocumentTitle(pageTitle: string, pending: boolean): string` returning `Response ready - <pageTitle>` when pending.

- [ ] **Step 1: Write the failing test**

Test-first: yes — `markResponseReady` while `document.hidden` is true sets `pending` and fires `new Notification('CodeMie', { body: 'AI response is ready' })` only when permission is `granted`; it is a no-op when visible; it does not throw when `window.Notification` is undefined or permission is `denied`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/store/__tests__/responseReady.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

Create the proxy with `pending: false`. `markResponseReady` returns early when `!document.hidden`; otherwise sets `pending = true` and calls the notification if `typeof Notification !== 'undefined' && Notification.permission === 'granted'`. `clearResponseReady` sets `pending = false`. `requestNotificationPermission` runs only when `Notification.permission === 'default'` and is wrapped in try/catch. Export `formatDocumentTitle`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/store/__tests__/responseReady.test.ts`
Expected: PASS.

---

### Task 2: Title and live region integration

**Files:**
- Modify: `src/hooks/appLevel/usePageTitle.ts:21-33` (read `responseReadyStore.pending` via `useSnapshot`, add to effect deps, use `formatDocumentTitle`)
- Create: `src/hooks/appLevel/useResponseReadyTab.ts` (registers `visibilitychange`; clears pending when `document.visibilityState === 'visible'`, with cleanup)
- Create: `src/components/ResponseReadyAnnouncer.tsx` (renders visually hidden `role="status"` text "AI response ready" only while pending)
- Modify: `src/App.tsx` (call `useResponseReadyTab()`, render `ResponseReadyAnnouncer`)
- Test: `src/hooks/appLevel/__tests__/usePageTitle.test.tsx` (extend), `src/hooks/appLevel/__tests__/useResponseReadyTab.test.tsx`

**Interfaces:**
- Consumes: `responseReadyStore`, `formatDocumentTitle` (Task 1).

- [ ] **Step 1: Write the failing test**

Test-first: yes — with `pending` true, a route-match change keeps the title as `Response ready - <route title>`; after `clearResponseReady()` or a `visibilitychange` to visible, the title is restored to the plain route title and the live region disappears.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/hooks/appLevel`
Expected: FAIL on the new cases.

- [ ] **Step 3: Write minimal implementation**

Route `document.title` through `formatDocumentTitle` in `usePageTitle` so there is one writer. The visibility hook follows the `usePolling` listener pattern.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/hooks/appLevel`
Expected: PASS.

---

### Task 3: Live stream success path

**Files:**
- Modify: `src/utils/stream.ts` (Stream class, ~line 27): add `whenDrained(): Promise<void>` that resolves when the buffer is empty and `run()` has stopped.
- Modify: `src/store/chatGeneration.ts` — success branch after `_handleStreamResponse` drain (returns `state.response` at ~line 1699); after `await historyItem.stream?.whenDrained()` on success only, call `responseReadyStore.markResponseReady()`. Confirm the success-finalise site during implementation; do not call from error, abort or `generationStopped` branches.
- Test: `src/store/__tests__/chatGeneration.responseReady.test.ts`, `src/utils/__tests__/stream.test.ts` (whenDrained case)

**Interfaces:**
- Produces: `Stream.whenDrained(): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Test-first: yes — a successful NDJSON generation with a hidden document calls `markResponseReady` only after the drain resolves; a stream error, an abort, and a `generationStopped` finish do not call it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/store/__tests__/chatGeneration.responseReady.test.ts src/utils/__tests__/stream.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Add `whenDrained` using the existing 10 ms timer loop; add the single call on the success path.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/store/__tests__/chatGeneration.responseReady.test.ts src/utils/__tests__/stream.test.ts`
Expected: PASS. Existing chatGeneration tests must still pass.

---

### Task 4: Poll-driven success path

**Files:**
- Modify: `src/store/chats.ts:431-434` (the non-`stillInProgress` branch of `pollIncompleteChat`): when the freshly polled history has a message that completed with a `response` and no error and no `generationStopped`, call `responseReadyStore.markResponseReady()`. Do not call from `finalizeTimedOutPoll` (line ~420).
- Test: `src/store/__tests__/chats.pollIncompleteChat.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Test-first: yes — polling that transitions a chat from in-progress to completed with a successful response calls `markResponseReady` once; a timed-out finalise, an errored message, and a `generationStopped` message do not.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/store/__tests__/chats.pollIncompleteChat.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Compute the success flag from the polled message at the completion branch and call the store method once.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/store/__tests__/chats.pollIncompleteChat.test.ts`
Expected: PASS.

---

### Task 5: Permission request from prompt submit

**Files:**
- Modify: the prompt submit handler in `src/components/ChatPrompt/` (locate with `codegraph_explore "ChatPrompt submit"`): call `responseReadyStore.requestNotificationPermission()` once per submit.
- Test: `src/components/ChatPrompt/__tests__/` (extend or add a focused test)

**Interfaces:**
- Consumes: `requestNotificationPermission` (Task 1).

- [ ] **Step 1: Write the failing test**

Test-first: yes — mounting the prompt does not call `Notification.requestPermission`; submitting with permission `default` calls it once; with `denied` or unsupported it is not called and submit still succeeds even when `requestPermission` rejects.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/ChatPrompt`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

One call at the top of the submit handler, not awaited, so submission is not delayed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/ChatPrompt`
Expected: PASS.
