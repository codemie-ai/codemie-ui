# EPMCDME-11292: Draggable resizer between chat history and prompt input

## Goal

Users can drag a horizontal separator between the chat message history and the prompt input area to resize the prompt area height. The resize position persists across sessions per user. Neither panel can be collapsed to zero — both areas remain visible at all times.

## Scope

Pure UI change. No API calls, no store changes, no new dependencies. `react-resizable-panels` (v4.11.2) is already installed.

---

## Architecture

`ChatPage` owns the split layout. The conditional rendering that already gates `ChatHistory` on `!!currentChat?.history.length` is extended to choose between two rendering branches:

- **History present**: `Group / Panel / ChatResizableSeparator / Panel` vertical split
- **No history**: `ChatPrompt` standalone, unchanged from today

The outer wrapper div in `ChatPage` changes from `flex flex-col items-center grow min-w-0 pb-4` to `flex flex-col grow min-w-0 overflow-hidden`. `items-center` is dropped (the Group fills width via its own layout), `pb-4` is dropped (panels own internal padding), `overflow-hidden` is added so the Group is bounded by the layout container.

Panel sizing: `defaultSize` is percentage (0–100); `minSize` is **pixels** (confirmed from library source and WorkflowDrawer usage pattern):
- `ChatHistory` panel: `defaultSize={70}`, `minSize={80}` (px — keeps at least a couple of message lines visible)
- `ChatPrompt` panel: `defaultSize={30}`, `minSize={130}` (px — editor row + button row + padding)

---

## Components

### New: `src/pages/chat/hooks/useChatPromptResize.ts`

Reads `userId` from `useSnapshot(userStore)`. Calls `useDefaultLayout` from `react-resizable-panels` with:

```
id: `chat-prompt-height-${userId}`
storage: localStorage
```

**Shared layout across chats**: the storage key is per-user, not per-chat. A resize in one chat applies to all chats for that user.

**Debounced persistence**: `onLayoutChanged` fires on every drag event. The hook wraps it with a 300 ms debounce using a `useRef<ReturnType<typeof setTimeout>>` + `clearTimeout` pattern (consistent with `useSkillsBase`). The timer is cleared on unmount.

**Layout type**: `useDefaultLayout` returns `Layout = { [id: string]: number }` — a record keyed by panel `id`, not a plain array. The `debouncedOnLayoutChanged` parameter type is inferred as `Parameters<typeof onLayoutChanged>[0]`.

Returns `{ defaultLayout, debouncedOnLayoutChanged }`. No collapse/expand logic.

### New: `src/pages/chat/components/ChatResizableSeparator.tsx`

A chat-specific separator built directly on `Separator` from `react-resizable-panels`. No full-width line — renders a centered pill handle with hover feedback and WCAG-compliant attributes.

- **Hit zone**: `h-4` (16 px) with `-my-2` (8 px overlap into each panel) → 32 px total drag target
- **Visual**: `w-10 h-1 rounded-full bg-white/20` pill, brightens to `bg-white/45` and widens to `w-12` on hover; on keyboard focus: `bg-white/60 h-[3px] ring-2 ring-white/50`
- **WCAG 4.1.2** — `aria-label="Resize chat prompt area"`, `aria-controls="chat-history chat-prompt"`, `aria-orientation="horizontal"`; decorative pill has `aria-hidden="true"`
- **WCAG 2.1.1** — keyboard resize via ↑/↓ arrow keys handled by the library
- **WCAG 2.4.7** — custom focus ring on the pill via `group-focus-visible` (replaces removed default outline)

### Modified: `src/pages/chat/ChatPage.tsx`

- Import `Panel`, `Group` from `react-resizable-panels`
- Import `ChatResizableSeparator`
- Import and call `useChatPromptResize`
- Replace the single wrapper + inline history/prompt with the two-branch layout

Layout when history is present:
```
<div className="flex flex-col grow min-w-0 overflow-hidden">
  <Group orientation="vertical" defaultLayout={defaultLayout} onLayoutChanged={debouncedOnLayoutChanged}>
    <Panel id="chat-history" defaultSize={70} minSize={80}>
      <ChatHistory />
    </Panel>
    <ChatResizableSeparator />
    <Panel id="chat-prompt" defaultSize={30} minSize={130}>
      <ChatPrompt resizable />
    </Panel>
  </Group>
</div>
```

Layout when no history:
```
<div className="flex flex-col grow min-w-0 overflow-hidden">
  <ChatPrompt />
</div>
```

### Modified: `src/pages/chat/components/ChatHistory/ChatHistory.tsx`

Root div: replace `grow` with `h-full`. Panel controls height; `grow` has no effect inside a Panel.

### Modified: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`

Add `resizable?: boolean` prop (default `false`). When `true`, four class changes apply:

| Element | Remove | Add |
|---|---|---|
| `div.relative.w-full.z-20` | — | `h-full flex flex-col` |
| Outer scroll container | `-translate-y-3 h-fit shrink-0 min-h-32` | `flex-1 min-h-0` |
| `box-content p-px` wrapper | `min-h-fit` | `h-full flex flex-col` |
| Inner content div | `min-h-32 max-h-64` | `h-full min-h-0` |

`flex-1` (not `h-full`) on the outer scroll container lets `ChatControls` (shown when `isInterrupted`) take natural height while the scroll container fills the rest.

The border-wrapper `cn(...)` call was extracted to a module-level `getBorderWrapperClassName` helper to keep the component within the SonarJS cognitive complexity limit of 15.

### Modified: `src/components/ResizableSeparator/ResizableSeparator.tsx`

Added `children?: ReactNode` prop forwarded to `Separator`, and `relative` to base classes — both additive and non-breaking. Hover colors unchanged from original.

---

## Data flow

`useChatPromptResize` is the only new data path:

1. On mount: `useDefaultLayout` reads `chat-prompt-height-${userId}` from `localStorage` and returns the stored `Layout` record as `defaultLayout` (or `undefined` on first visit).
2. `Group` uses `defaultLayout` to restore panel positions on initial render (falls back to `defaultSize` props when `undefined`).
3. During drag: the library calls `onLayoutChanged({ 'chat-history': N, 'chat-prompt': M })` continuously. The hook's debounced wrapper suppresses all calls except the last within each 300 ms window, then writes to localStorage.

No Valtio store changes. No API calls.

---

## Testing

### `src/pages/chat/hooks/__tests__/useChatPromptResize.test.ts` (new)

- Mocks `react-resizable-panels` and `valtio` at unit level
- Asserts: correct per-user storage key passed to `useDefaultLayout`
- Asserts: `debouncedOnLayoutChanged` fires `onLayoutChanged` exactly once after a burst within 300 ms
- Asserts: pending timer is cleared on unmount (no stale callback)
- Layout values in test data are `{ 'chat-history': N, 'chat-prompt': M }` records (matching the `Layout` type)

### `src/pages/chat/__tests__/ChatPage.test.tsx` (modified)

- Mocks `react-resizable-panels` (Group/Panel as pass-through divs) and `ChatResizableSeparator` (`data-testid="resizable-separator"`)
- New test: separator present when history is non-empty
- New test: no separator and standalone `ChatPrompt` when history is empty

### `src/pages/chat/__tests__/ChatPage.integration.test.tsx` (new)

Uses real `react-resizable-panels` (not mocked). `ResizeObserver` and `localStorage` are globally mocked in `setupTests.tsx`.

- Asserts: `getByRole('separator')` is in the document when history is present
- Asserts: `queryByRole('separator')` returns null when history is empty

Note: Panel children do not render in jsdom when `ResizeObserver` reports 0 dimensions; child `data-testid` assertions are covered by the unit test instead.

### `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` (unchanged)

Existing tests exercise `resizable=false` default path and remain unaffected.

---

## Out of scope

- Collapse-to-zero / expand toggle (prompt is always visible)
- Resize of the horizontal (sidebar) axis
- Changes to `SharedChatPage` (read-only, no prompt)
- Any backend or store changes
