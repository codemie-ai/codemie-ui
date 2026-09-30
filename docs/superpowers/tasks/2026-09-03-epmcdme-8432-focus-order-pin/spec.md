# Spec — EPMCDME-8432: Fix focus order after "Pin" chat action

## Problem

WCAG 2.4.3 (Focus Order) + 4.1.2 (Name, Role, Value).

After opening the "More options" menu on a chat link in the Chats Sidebar and activating "Pin":
- Focus is lost entirely.
- NVDA does not announce the state change.

Expected: focus returns to the chat name button; NVDA announces "Chat pinned" / "Chat unpinned".

## Root cause

`chatsStore.pinChat(id)` flips `chat.pinned` on the Valtio proxy but has no focus side-effects.
`ChatListItem` has no mechanism to restore focus after a programmatic state transition.

Note: React key-matches `chat.id` across both the pinned and unpinned `map` arrays in `ChatList`,
so the `ChatListItem` component is **re-rendered** (not remounted) when `chat.pinned` flips. Refs
and `useEffect` deps both behave as expected across the transition.

## Solution

All changes are in `ChatListItem.tsx` and its test file.

### Focus management

Add `nameButtonRef = useRef<HTMLButtonElement>(null)` and wire it to the chat name `<button>`.

Add a `prevPinnedRef = useRef(chat.pinned)` guard. A `useEffect` with `[chat.pinned, announce]`
skips the initial mount (guard returns early when value matches), then on a real transition:
1. Calls `nameButtonRef.current?.focus()`.
2. Calls `announce(chat.pinned ? 'Chat pinned' : 'Chat unpinned')`.
3. Updates `prevPinnedRef.current`.

A `chatNameRef` (updated every render, not in effect deps) is available for future announcement
copy changes without adding `chatName` as an effect dependency.

### Screen reader announcement

Import `useAnnouncementQueue` and `Announcement` — the same pattern used in `RecordInput` and
`FilesDropzone`. Render `<Announcement announcement={announcement} />` at the bottom of the
component JSX. This creates a visually hidden `aria-live="polite" aria-atomic="true"` region
scoped to the item.

Announcement copy: `'Chat pinned'` on pin, `'Chat unpinned'` on unpin.

## Files changed

| File | Change |
|---|---|
| `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx` | Add `nameButtonRef`, `prevPinnedRef`, `chatNameRef`, `useAnnouncementQueue`, pin-transition `useEffect`, `<Announcement>` |
| `src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx` | Add focus-after-pin, focus-after-unpin, announcement-after-pin, announcement-after-unpin tests |

## Acceptance criteria

- After "Pin", focus lands on the chat name button.
- After "Unpin", focus lands on the chat name button.
- NVDA announces "Chat pinned" after pin.
- NVDA announces "Chat unpinned" after unpin.
- No focus side-effect on initial mount.
- Existing accessibility tests continue to pass.
