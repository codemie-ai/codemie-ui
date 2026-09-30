# Technical Research

**Task**: chat sidebar pin focus accessibility aria screenreader
**Generated**: 2026-09-03T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8432 — [2.4.3, 4.1.2] The focus order is incorrect after performing the "Pin" action to a chat link.

Ticket details:
- NVDA screen reader is ON
- Steps: Open Chats Sidebar → Tab to "More options" button next to a chat link → activate it → Tab to "Pin" option → activate it
- Actual: After pinning, focus is lost and NVDA does not announce anything
- Expected: After pinning, focus should be set on the chat link AND the screen reader should announce it as "pinned"

This is a WCAG 2.4.3 (Focus Order) + 4.1.2 (Name, Role, Value) accessibility bug fix.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx` — The primary component. Renders each chat entry as a `<li role="treeitem">`. Contains the chat name `<button>` and the `NavigationMore` component that renders the "More options" menu with the Pin/Unpin action. The pin handler is `() => pinChat(chat.id)` passed directly to `NavigationMore`'s `items` prop. There is no focus management code after `pinChat` resolves. The only focus logic in the file is `setTimeout(() => editNameInputRef.current?.focus(), 0)` used for the Rename flow.

- `src/pages/chat/components/ChatSidebar/ChatList/ChatList.tsx` — Renders two ordered sub-lists (pinned first, then unpinned) inside a `<ul role="group">`. When `chat.pinned` flips to `true`, the item moves from the `unpinnedChats` array to the top of `pinnedChats`. This re-render causes the `<li>` element to unmount and remount at a new DOM position, which is why focus is lost — the DOM node the browser had focused is gone.

- `src/components/NavigationMore/NavigationMore.tsx` — The "More options" trigger and floating menu. Built on `@floating-ui/react` with `useClick`, `useDismiss`. When `hideOnClickInside` is `true` (as it is in `ChatListItem`), clicking a menu item calls `setShow(false)` synchronously. There is no `FloatingFocusManager` wrapping the floating element, so `@floating-ui/react` does not automatically return focus to the trigger button when the menu closes. Focus simply disappears.

- `src/store/chats.ts` — The `pinChat` method at line 374. It calls `api.put(`v1/conversations/${id}`, { pinned: !chat.pinned })` and on success mutates `chat.pinned = !chat.pinned` on the Valtio store proxy. No focus side-effects here. The toggle is in-place on the found chat object; the re-ordering into pinned/unpinned sublists happens downstream in `ChatList`'s `useMemo`.

### Architecture and Layers Affected

- **Presentation layer — `ChatListItem`**: The fix lives here. Focus must be explicitly returned to the chat name button (`#chat-name-${chat.id}`) after the pin action completes, and an announcement must be emitted. A `useRef` to the chat name button and a `useEffect`/callback responding to `chat.pinned` toggling is the expected pattern.

- **Presentation layer — `NavigationMore`** (shared component): Optionally, adding `FloatingFocusManager` or a manual `onOpenChange` side-effect that returns focus to the reference button when the menu closes would fix focus loss for all `NavigationMore` consumers. However the ticket is scoped to the pin action specifically, so the minimum fix is in `ChatListItem`.

- **Announcement layer — `Announcement` + `useAnnouncementQueue`**: The screen reader announcement ("pinned" or "unpinned") must be driven by a `useAnnouncementQueue` instance in `ChatListItem` paired with an `<Announcement>` render, following the exact pattern used in `RecordInput` and `FilesDropzone`.

### Integration Points

- `chatsStore.pinChat(id)` — async, no return value. On success, the store's `chat.pinned` boolean flips; `useSnapshot` in `ChatListItem` will reflect the change on the next render.
- `NavigationMore` `items[].onClick` — synchronous callback. The menu closes via `setShow(false)` before the `pinChat` promise resolves.
- `ChatList` `useMemo` — splits `chats` into `pinnedChats`/`unpinnedChats` each render. A pin toggle causes the item's `<li>` to move to a different position in the DOM, unmounting the original node.
- `ToasterAnnouncer` — app-level polite live region wired to `toaster.ts`. This handles toast announcements but is not available for inline component state announcements. The component must own its own `Announcement` + `useAnnouncementQueue`.

### Patterns and Conventions

- **Focus return after action**: `NavigationProfile` (`src/components/Navigation/NavigationProfile.tsx` line 151) uses `setTimeout(() => buttonRef.current?.focus(), 0)` in `onHide` to return focus when its overlay panel closes. This is the canonical pattern in the codebase.
- **Accessibility guide pattern for restore-on-close** (`.ai-run/guides/patterns/accessibility-patterns.md` §"Restore Focus on Modal Close"): capture `document.activeElement` on open, call `.focus()` on it when the popup closes.
- **Announcement pattern**: `useAnnouncementQueue` + `<Announcement>` used in `RecordInput` (`src/components/form/RecordInput/RecordInput.tsx`) and `FilesDropzone` (`src/components/form/FilesDropzone/FilesDropzone.tsx`). The hook serializes messages to prevent collapse and clears the region before re-announcing the same string.
- **Chat name button id convention**: `id={`chat-name-${chat.id}`}` — already present, suitable for `document.getElementById` to target focus programmatically.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — covers focus restore on modal/popup close, `useFocusOnVisible`, live-region patterns, and the ARIA attribute table. Directly applicable.
- `.ai-run/guides/components/component-patterns.md` — general component construction; not specific to focus flows.

### Architectural Decisions

- The `NavigationMore` component intentionally does not use `FloatingFocusManager` from `@floating-ui/react`. There is no documented ADR for this choice; it is observable from the source. This means all consumers must handle post-close focus themselves if the action changes the DOM.
- `Announcement` + `useAnnouncementQueue` is the established in-component live-region pattern. The app-level `ToasterAnnouncer` is only for toast notifications.

### Derived Conventions

- Focus return is always done via `setTimeout(() => ref.current?.focus(), 0)` to yield to the browser's paint cycle before moving focus.
- Screen reader announcements for component state changes use a local `useAnnouncementQueue` + `<Announcement>` rather than the global toaster announcer.
- The chat name button's stable `id` (`chat-name-${chat.id}`) is already used by `NavigationMore`'s `aria-labelledby` linkage — the same id can be used as a focus target via `document.getElementById` or a `useRef`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatSidebar/__tests__/ChatListItem.test.tsx` — 17 tests. Covers: pin/unpin calls `chatsStore.pinChat`; pinned-icon aria-hidden; `aria-describedby` linkage for pinned chats; `aria-selected`; rename flow; truncation; route resolution. Does NOT cover: focus placement after pin; screen reader announcement after pin.
- `src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx` — 2 tests. Only covers id and `aria-labelledby` on the More Options button. No pin interaction tests.
- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarLists.keyboard.test.tsx` — keyboard activation of the Create Folder trigger; does not cover pin flow.

### Testing Framework and Patterns

- Vitest with React Testing Library (`@testing-library/react`) and `@testing-library/user-event`.
- Valtio stores are mocked via `vi.mock('valtio', ...)` with `useSnapshot: vi.fn((store) => store)`.
- `chatsStore` is mocked via `vi.mock('@/store/chats', ...)` with `pinChat: vi.fn()`.
- `NavigationMore` is mocked in the sidebar `__tests__` as a flat list of `<button>` elements with `data-testid="menu-item-{title}"` — tests can directly click the mock "Pin"/"Unpin" button.
- Focus assertions use `expect(element).toHaveFocus()`.

### Coverage Gaps

- No test verifies focus is set on the chat name button after pin.
- No test verifies a screen reader announcement is emitted after pin/unpin.
- Both gaps need new tests in `src/pages/chat/components/ChatSidebar/__tests__/ChatListItem.test.tsx`.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this fix. The pin feature is not gated by a feature flag.

### Configuration Files

No configuration changes required.

### Feature Flags and Deployment Concerns

No feature flags gate the pin action. The fix is a pure UI/accessibility change with no deployment-level concerns.

---

## 6. Risk Indicators

- **DOM node unmount on pin**: When `chat.pinned` flips, `ChatList` moves the item from `unpinnedChats` to `pinnedChats`. The `<li>` at the old position unmounts and a new one mounts at the top of the pinned section. Any `useRef` captured before the pin action becomes stale. Focus must be restored in the new mounted instance, not the old one. The fix must use `useEffect` watching `chat.pinned` to run after the re-mount, or `document.getElementById(`chat-name-${chat.id}`)` as a DOM query rather than a ref captured at render time.
- **`NavigationMore` closes before `pinChat` resolves**: The menu's `setShow(false)` is synchronous on item click, but `pinChat` is async. When the menu closes, `chat.pinned` has not yet changed. The `useEffect` detecting the pin toggle will fire after the API resolves, which is correct timing for the announcement but means there is a window where the menu is gone and focus is already lost.
- **No `FloatingFocusManager` in `NavigationMore`**: The floating menu has no automatic focus-return contract. This is a shared component used widely; patching it centrally could fix the focus loss for all consumers but is a broader change with risk of regressions. The ticket is scoped to ChatListItem — the safest fix is local.
- **Repeated pin/unpin announcements**: If the user pins and unpins rapidly, `useAnnouncementQueue` must serialize the announcements. The existing `useAnnouncementQueue` implementation handles this correctly via its queue.
- **No test for focus-after-pin**: Adding tests for `toHaveFocus()` requires `jsdom` to honor `focus()` calls, which RTL/jsdom does support. The existing test setup is compatible.
- **`sr-only` span for "Pinned" label uses a static string**: The existing `<span id="pinned-icon-${chat.id}" className="sr-only">Pinned</span>` only appears for already-pinned chats on render. It does not announce the transition. A live region is needed to announce the change at the moment it happens.

---

## 7. Summary for Complexity Assessment

The fix touches a single presentation-layer component (`ChatListItem`) in the Chat Sidebar, plus requires adding a local `<Announcement>` live region. The store and API layers require no changes. The estimated file change surface is 1–2 files: `ChatListItem.tsx` (focus restoration + announcement) and its co-located test file. No shared components need to change for a minimal-risk fix, though `NavigationMore` could optionally be upgraded to use `FloatingFocusManager` for a more systemic solution.

The task is technically nuanced in one area: because `ChatList` remounts the `<li>` element when `chat.pinned` changes (items move between the pinned/unpinned sublists), a naive `useRef`-based focus approach will target a stale node. The correct implementation must use `useEffect` on `chat.pinned` to detect the toggle after re-mount and query the DOM by the stable button id (`chat-name-${chat.id}`), or use `useRef` on the button and call focus in a `useEffect` keyed to the pinned state. This is a known React pattern and well-precedented in the codebase (`NavigationProfile`'s `onHide` timeout, `NavigationPinnedSection`'s unpin focus effect).

Test coverage for the affected area is good for existing behavior but has zero coverage for the focus-return and announcement requirements. Two new test cases are needed: one asserting `toHaveFocus()` on the chat button after clicking Pin, and one asserting the announcement text is rendered in the live region. The test infrastructure (RTL + userEvent + Valtio mock + NavigationMore mock) is all in place and requires only extending the existing `ChatListItem.test.tsx`.
