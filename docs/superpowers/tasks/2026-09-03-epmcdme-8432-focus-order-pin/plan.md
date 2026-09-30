# EPMCDME-8432 Focus Order Pin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore keyboard focus to the chat name button after the Pin/Unpin action in the Chats Sidebar, and announce the state change to NVDA via a polite live region.

**Architecture:** All changes are in `ChatListItem.tsx` and its test file. Two refs (`nameButtonRef`, `prevPinnedRef`) and one hook (`useAnnouncementQueue`) are added to the component. A `useEffect([chat.pinned, announce])` detects the transition (skipping initial mount via `prevPinnedRef` guard) and fires focus + announcement. `<Announcement>` renders the live region. React preserves the component instance across the pin transition via key-based reconciliation (moves rather than remounts), so `useRef` and `useEffect` work as expected.

**Tech Stack:** React 18 (`useRef`, `useEffect`), `useAnnouncementQueue` + `Announcement` (existing internal pattern from `RecordInput`/`FilesDropzone`), Vitest + RTL.

---

### Task 1: Add failing tests

**Test-first: n/a — this IS the test task**

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx`

- [ ] **Step 1: Add the `useAnnouncementQueue` mock and spy**

Add these two lines after the last existing `vi.mock(...)` block (after the `useFeatureFlags` mock):

```tsx
const announceMock = vi.fn()
vi.mock('@/hooks/useAnnouncementQueue', () => ({
  useAnnouncementQueue: () => ({ announcement: '', announce: announceMock }),
}))
```

- [ ] **Step 2: Add four new test cases in a new describe block at the end of the file**

Add this entire block at the bottom, after the existing `describe('ChatListItem accessibility', ...)`:

```tsx
describe('focus and announcement after pin toggle', () => {
  beforeEach(() => announceMock.mockClear())

  it('moves focus to chat name button after pin', () => {
    const { rerender } = render(
      <ChatListItem chat={{ ...chat, pinned: false }} actions={actions} />
    )
    rerender(<ChatListItem chat={{ ...chat, pinned: true }} actions={actions} />)
    expect(screen.getByRole('button', { name: 'My Test Chat' })).toHaveFocus()
  })

  it('moves focus to chat name button after unpin', () => {
    const { rerender } = render(
      <ChatListItem chat={{ ...chat, pinned: true }} actions={actions} />
    )
    rerender(<ChatListItem chat={{ ...chat, pinned: false }} actions={actions} />)
    expect(screen.getByRole('button', { name: 'My Test Chat' })).toHaveFocus()
  })

  it('announces "Chat pinned" after pin', () => {
    const { rerender } = render(
      <ChatListItem chat={{ ...chat, pinned: false }} actions={actions} />
    )
    rerender(<ChatListItem chat={{ ...chat, pinned: true }} actions={actions} />)
    expect(announceMock).toHaveBeenCalledWith('Chat pinned')
  })

  it('announces "Chat unpinned" after unpin', () => {
    const { rerender } = render(
      <ChatListItem chat={{ ...chat, pinned: true }} actions={actions} />
    )
    rerender(<ChatListItem chat={{ ...chat, pinned: false }} actions={actions} />)
    expect(announceMock).toHaveBeenCalledWith('Chat unpinned')
  })
})
```

- [ ] **Step 3: Run to confirm RED**

```bash
npx vitest run --project unit src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx
```

Expected: 4 new tests FAIL. The 2 existing tests pass. Typical failure messages:
- `expected <button> to have focus` (focus tests)
- `expected "announceMock" to have been called with "Chat pinned"` (announcement tests)

---

### Task 2: Implement fix and make tests pass

**Test-first: yes — focus-after-pin, focus-after-unpin, announce-after-pin, announce-after-unpin (written in Task 1)**

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`

- [ ] **Step 1: Add `useEffect` to the React import**

Change:
```tsx
import { useState, useRef, FC, memo } from 'react'
```
to:
```tsx
import { useState, useRef, useEffect, FC, memo } from 'react'
```

- [ ] **Step 2: Add two new internal imports after the existing internal imports (after the `cn` import)**

```tsx
import Announcement from '@/components/Announcement'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
```

- [ ] **Step 3: Add the new refs and hook inside the component body, after the existing `editNameInputRef` line**

Add after `const editNameInputRef = useRef<HTMLInputElement>(null)`:
```tsx
const nameButtonRef = useRef<HTMLButtonElement>(null)
const prevPinnedRef = useRef(chat.pinned)
const { announcement, announce } = useAnnouncementQueue()
```

- [ ] **Step 4: Add the pin-transition `useEffect` after the existing `updateName` function (before the `return (`)**

```tsx
useEffect(() => {
  if (prevPinnedRef.current === chat.pinned) return
  prevPinnedRef.current = chat.pinned
  nameButtonRef.current?.focus()
  announce(chat.pinned ? 'Chat pinned' : 'Chat unpinned')
}, [chat.pinned, announce])
```

- [ ] **Step 5: Attach `nameButtonRef` to the chat name button**

Change the opening `<button` tag (the one with `id={`chat-name-${chat.id}`}`) from:
```tsx
<button
  type="button"
  id={`chat-name-${chat.id}`}
  onClick={select}
  aria-describedby={chat.pinned ? `pinned-icon-${chat.id}` : undefined}
  className="text-inherit hover:no-underline truncate pl-2 grow text-sm h-full text-left"
>
```
to:
```tsx
<button
  ref={nameButtonRef}
  type="button"
  id={`chat-name-${chat.id}`}
  onClick={select}
  aria-describedby={chat.pinned ? `pinned-icon-${chat.id}` : undefined}
  className="text-inherit hover:no-underline truncate pl-2 grow text-sm h-full text-left"
>
```

- [ ] **Step 6: Add `<Announcement>` just before the closing `</li>`**

Change the end of the JSX from:
```tsx
        </div>
      </li>
    )
```
to:
```tsx
        </div>
        <Announcement announcement={announcement} />
      </li>
    )
```

- [ ] **Step 7: Run tests to confirm GREEN**

```bash
npx vitest run --project unit src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx
```

Expected: all 6 tests pass (`Test Files 1 passed`, `Tests 6 passed`).

- [ ] **Step 8: Commit**

```bash
git add src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx \
        src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx
git commit -m "EPMCDME-8432: Fix focus order and announce pin state change in chat sidebar"
```
