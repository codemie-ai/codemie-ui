# Plan — EPMCDME-14842: Restore scrollbar visibility on chat history

## Acceptance criteria
1. A long assistant response in Chat can be scrolled from beginning to end.
2. Chat history can be scrolled to earlier messages and back.
3. Up/Down arrow keys scroll the transcript when it is focused.
4. The Help page scrolling behavior is unaffected.
5. No regression in chat input focus, prompt typing, or message sending.

## Tasks

### Task 1 — Add `.show-scroll` class to ChatHistory scroll container
- **File**: `src/pages/chat/components/ChatHistory/ChatHistory.tsx`
- **Change**: Add `show-scroll` to the className of the outermost scrollable div (the one with `overflow-y-auto scrollbar-gutter-edge`)
- **Why**: `main.scss` hides scrollbars globally via `scrollbar-width: none` except on elements with `.show-scroll`
- **Test-first**: yes — add a test asserting the scroll container has the `show-scroll` class in `ChatHistory.test.tsx`
