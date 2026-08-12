# Plan — EPMCDME-8433: Pinned-chat indicator accessible name

## Requirements
Give the pinned-chat indicator an accessible name (WCAG 1.1.1) so AT users perceive the pinned state on keyboard tab navigation.

- The pinned icon announces itself in place via `role="img"` `aria-label="Pinned"` (no `aria-hidden`), rather than baking an sr-only text node into the chat-name button's accessible name.
- The chat-name `<button>` is linked to the icon via `aria-describedby` (pointing at a stable per-chat id on the icon) so the pinned state stays reachable when tabbing to the button — the actual ticket requirement.
- Do not touch `vite.config.ts`.

## Task 1 — Announce the pinned icon via role=img/aria-label, link it to the chat button via aria-describedby
**Test-first: yes** — In `ChatListItem.test.tsx`, add a test asserting that for a pinned chat the rendered icon has `role="img"` and `aria-label="Pinned"` (no `aria-hidden`), and that the chat-name button's `aria-describedby` matches the icon's `id`. Add a companion test asserting an unpinned chat's button has no `aria-describedby`. These fail today because the icon is `aria-hidden` and the button carries an sr-only span instead of `aria-describedby`.

Implementation in `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`:
- Remove the `sr-only` "Pinned" span from inside the chat-name `<button>`.
- Give `<PinnedSvg>` a stable `id={`pinned-icon-${chat.id}`}`, `role="img"`, and `aria-label="Pinned"`; drop `aria-hidden`.
- Add `aria-describedby={chat.pinned ? `pinned-icon-${chat.id}` : undefined}` to the chat-name `<button>`.
- Update the `pinned.svg?react` test mock in `ChatListItem.test.tsx` to forward props (`(props: any) => <div data-testid="pinned-icon" {...props} />`), matching the existing convention in `NavigationExpandButton.test.tsx`/`NavigationLogo.test.tsx`, so `role`/`aria-label`/`id` are testable.

Verify: new tests GREEN; existing `shows pinned icon for pinned chats` and all other ChatListItem tests remain GREEN.
