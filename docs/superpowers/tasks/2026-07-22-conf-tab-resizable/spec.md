# Spec: EPMCDME-9820 — Resizable Chat Configuration Panel

## Problem

The chat configuration panel (`ChatConfiguration.tsx`) has a hardcoded width (`w-96` / `w-0` Tailwind classes). Users editing complex or wide configurations have no way to gain more horizontal space.

## Goal

Make the configuration panel horizontally resizable by dragging the separator between the chat area and the panel. Close and reopen resets to the default width.

## Approach

Follow the same pattern as MR EPMCDME-10137 (adjustable chat sidebar): replace the inner flex container in `ChatPage.tsx` with a `react-resizable-panels` `<Group>`, extract constants to a dedicated width file, and manage resize state in a dedicated hook.

`react-resizable-panels` v4.11.2 is already installed. `ResizableSeparator` is an existing shared component. `groupResizeBehavior="preserve-pixel-size"` is used so all sizes are in pixels, matching the sidebar precedent.

## Components

### `chatConfigWidth.ts` (new)
Constants and helpers for the config panel width.

- `CHAT_CONFIG_DEFAULT_WIDTH = 384` — matches current `w-96` (24 rem at 16px base)
- `CHAT_CONFIG_MIN_WIDTH = 260` — minimum usable panel width
- `CHAT_CONFIG_MAX_WIDTH = 640` — maximum panel width

No localStorage. Reset-on-close is implemented by calling `panel.resize(DEFAULT)` before `panel.collapse()` so the next expand always starts at the default.

### `useChatConfigResize.ts` (new)
Mirrors `useChatSidebarResize`.

- `panelRef: useRef<PanelImperativeHandle>` — passed to `<Panel panelRef={…}>`.
- `pointerDownRef` — global `pointerdown`/`pointerup`/`pointercancel` listeners to distinguish user drags from programmatic resize.
- `isConfigVisibleRef` — tracks `isConfigVisible` synchronously in the render cycle so `handleResize` can read the current value without stale-closure issues.
- `handleResize(panelSize)` — called by the panel's `onResize`. Only acts when `pointerDownRef.current` is true (user drag). If `panelSize.inPixels === 0`, calls `onClose()`. If `panelSize.inPixels > 0` and `!isConfigVisibleRef.current` (user dragged the separator open from a collapsed state), calls `onOpen()` to sync React state.
- Effect on `isConfigVisible`:
  - `true` + panel collapsed → `panel.resize(CHAT_CONFIG_DEFAULT_WIDTH)` (always resets to default on open)
  - `false` + panel expanded → `panel.collapse()`

Accepts `{ isConfigVisible: boolean; onClose: () => void; onOpen: () => void }`.
Returns `{ panelRef, handleResize }`.

### `ChatPage.tsx` (modified)
Replace the inner `<div className="flex h-full">` with a horizontal `<Group>`:

```tsx
<Group orientation="horizontal" className="h-full">
  <Panel id="chat-area" minSize={400}>
    {currentChat && (
      <div className="flex flex-col items-center h-full pb-4">
        {!!currentChat?.history.length && <ChatHistory />}
        <ChatPrompt />
      </div>
    )}
  </Panel>

  <ChatConfigResizableSeparator />

  <Panel
    id="chat-config"
    panelRef={configPanelRef}
    defaultSize={0}
    minSize={CHAT_CONFIG_MIN_WIDTH}
    maxSize={CHAT_CONFIG_MAX_WIDTH}
    collapsible
    collapsedSize={0}
    groupResizeBehavior="preserve-pixel-size"
    onResize={handleConfigResize}
  >
    <ChatConfiguration showNewIntegrationPopup={showNewIntegrationPopup} />
  </Panel>
</Group>
```

`useChatConfigResize` is called with `{ isConfigVisible, onClose: closeConfig, onOpen: toggleConfigVisibility }`.

`defaultSize={0}` ensures the panel starts collapsed on initial render. The hook's `isConfigVisible` effect expands it to `CHAT_CONFIG_DEFAULT_WIDTH` on first open.

### `ChatConfiguration.tsx` (modified)
- Remove `w-96 max-w-96`, `w-0`, `shrink-0`, `transition-all duration-150 ease-in-out` from the `<aside>`.
- Keep semantic classes: `flex flex-col h-full overflow-x-hidden bg-surface-base-sidebar shadow-surface-base-sidebar border-l border-border-specific-panel-outline`.
- Inner content div: `w-96` → `w-full`.
- Keep `{isConfigVisible && …}` guard for content rendering (avoids rendering config controls while panel is collapsed).

### `ChatConfigResizableSeparator.tsx` (new)
Dedicated separator between the chat area and config panel. Follows the EPMCDME-11292 `ChatResizableSeparator` pattern: a `<Separator>` element with a decorative vertical pill (`h-10 w-1 rounded-full`) that animates on hover and focus-visible, providing a visible drag affordance. The pill uses `bg-black/20` in light themes and `[.codemieDark_&]:bg-white/25` for dark-mode contrast — the app applies `codemieDark` to `<html>` rather than Tailwind's `dark:` modifier.

### `ResizableSeparator.tsx` (modified)
Added `children?: ReactNode` prop and `relative` to the base class so content can be rendered inside the separator element (used by `ChatConfigResizableSeparator`).

## Reset Behaviour

On every open (`isConfigVisible` → true), the hook calls `panel.resize(CHAT_CONFIG_DEFAULT_WIDTH)` because the panel is collapsed at that point. This means the panel always opens at 384px regardless of the previous drag position — reset is implicit and requires no extra user action.

## Layout Compatibility

This change lives inside `PageLayout`'s children. When MR EPMCDME-10137 (sidebar resize) merges, `ChatPage.tsx` wraps the outer layout in a `<Group>`. Our inner Group sits inside that outer panel (`chat-main-content`) and requires no changes on merge.

## Tests

### `ChatConfiguration.test.tsx` (migrate)
Replace class assertions:
- `aside.toHaveClass('w-0')` → `expect(screen.queryByText('General')).not.toBeInTheDocument()`
- `aside.toHaveClass('w-96')` → `expect(screen.getByText('General')).toBeInTheDocument()`

The aside no longer has width classes; visibility of content is the correct behaviour contract.

### `useChatConfigResize.test.ts` (new)
- `handleResize` is a no-op when `pointerDownRef` is false (programmatic resize)
- `handleResize` calls `onClose()` when `panelSize.inPixels === 0` and pointer is down
- Effect: expands panel when `isConfigVisible` changes to `true`
- Effect: collapses panel (and resets to DEFAULT) when `isConfigVisible` changes to `false`

## Acceptance Criteria

1. Config panel has an `ew-resize` drag handle between the chat area and the panel.
2. Dragging widens or narrows the panel within 260–640px.
3. Width changes apply without lag or flicker.
4. Content (`ChatConfigLlmSelector`, `ChatConfigAssistants`, etc.) fills the new width without overflow.
5. Closing and reopening the panel resets width to 384px.
6. Dragging the panel to 0px closes it and syncs the "Configuration" header button state.
7. The main chat area is not broken at any valid config panel width.
8. All existing `ChatConfiguration` tests pass after migration.
