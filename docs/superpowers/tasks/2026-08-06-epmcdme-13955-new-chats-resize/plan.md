# Plan: EPMCDME-13955 — Resize handle visible in new empty chats

## Task 1 — Fix ChatPage.tsx JSX

**File**: `src/pages/chat/ChatPage.tsx` (lines 116–139)

**Test-first: yes** — update `ChatPage.integration.test.tsx` to assert separator IS in DOM for empty history, then implement the fix.

Replace the `hasHistory ? (...) : (...)` ternary with a single always-mounted panel Group:

```jsx
{currentChat && (
  <div className="flex flex-col h-full pb-4">
    <Group
      key={hasHistory ? userId : `empty-${userId}`}
      orientation="vertical"
      defaultLayout={hasHistory ? defaultLayout : undefined}
      onLayoutChanged={hasHistory ? debouncedOnLayoutChanged : undefined}
      className="flex-1 min-h-0"
    >
      <Panel
        id="chat-history"
        minSize={hasHistory ? 80 : 0}
        defaultSize={!hasHistory ? 0 : undefined}
        collapsible={!hasHistory}
        collapsedSize={!hasHistory ? 0 : undefined}
      >
        {hasHistory && <ChatHistory />}
      </Panel>
      <ChatResizableSeparator />
      <Panel id="chat-prompt" defaultSize={130} minSize={130}>
        <ChatPrompt resizable />
      </Panel>
    </Group>
  </div>
)}
```

Key design decisions:
- `key={hasHistory ? userId : \`empty-${userId}\`}` — separate key for empty state prevents stale saved layout from expanding the history panel when it should start at 0.
- `defaultSize={0}` + `collapsible collapsedSize={0}` — only on empty state; keeps the panel at 0px without a minimum-size constraint.
- `minSize={hasHistory ? 80 : 0}` — restores the 80px minimum only when history exists, preventing accidental over-collapse.
- `{hasHistory && <ChatHistory />}` — ChatHistory not rendered in empty state (no content to show), but the panel element itself is always in the DOM for ARIA correctness.
- `pb-4` on the wrapper div kept unconditionally (was the history-state padding; now unified).

## Task 2 — Update ChatPage.integration.test.tsx

**File**: `src/pages/chat/__tests__/ChatPage.integration.test.tsx`

**Test-first: yes** — these changes turn the currently-passing "does not render" test into the RED test.

- Rename `"does not render a resize handle when the chat has no history"` → `"renders the resize handle even when the chat has no history"`.
- Change `queryByRole('separator', …).not.toBeInTheDocument()` → `getByRole('separator', …).toBeInTheDocument()`.
- The existing assertion `queryByTestId('chat-history').not.toBeInTheDocument()` remains valid (ChatHistory is not rendered in empty state).
- Add a new test: `"separator is present and chat-history is absent for an empty new chat"` (or keep this logic in the renamed test).

## Task 3 — Update ChatPage.test.tsx

**File**: `src/pages/chat/__tests__/ChatPage.test.tsx`

**Test-first: yes** — same pattern; current assertion at line 356 encodes the buggy behaviour.

- Rename `"renders ChatPrompt standalone without separator when history is empty"` → `"renders ChatPrompt with separator in empty new chat"`.
- Remove `expect(screen.queryByTestId('resizable-separator')).not.toBeInTheDocument()`.
- Add `expect(screen.getByTestId('resizable-separator')).toBeInTheDocument()`.
- Keep `expect(screen.getByTestId('chat-prompt')).toBeInTheDocument()`.
