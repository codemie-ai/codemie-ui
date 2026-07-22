# Plan — EPMCDME-8433: Pinned-chat indicator accessible name

## Requirements
Give the pinned-chat indicator an accessible name (WCAG 1.1.1) so AT users perceive the pinned state on keyboard tab navigation.

- Label goes INSIDE the chat-name `<button>` via the existing `sr-only` pattern.
- Decorative `<PinnedSvg>` gets `aria-hidden="true"` (no `aria-label` on the SVG — mock swallows props).
- Do not touch `vite.config.ts`.

## Task 1 — Add sr-only "Pinned" label inside the chat-name button + hide the icon
**Test-first: yes** — In `ChatListItem.test.tsx`, add a test asserting that for a pinned chat the chat-name control is reachable via `screen.getByRole('button', { name: /pinned/i })`. This fails today because the pinned indicator sits outside the button.

Implementation in `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`:
- Inside the `<button>` (lines 101–109), after the name text, render `{chat.pinned && <span className="sr-only">Pinned</span>}`.
- Add `aria-hidden="true"` to the `<PinnedSvg>` at line 114.

Verify: new test GREEN; existing `shows pinned icon for pinned chats` and all other ChatListItem tests remain GREEN.
