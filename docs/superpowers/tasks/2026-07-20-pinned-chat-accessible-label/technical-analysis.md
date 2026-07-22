# Technical Analysis — EPMCDME-8433: Pinned-chat indicator accessible name

## Task
The pinned-chat indicator icon in `ChatListItem.tsx` has no accessible name (WCAG 1.1.1). Add a screen-reader-only label so keyboard/AT users perceive the pinned state.

## Codebase Findings

- **Target component**: `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx`
  - Chat-name control is a `<button>` at lines 101–109 (`onClick={select}`), rendering the (possibly truncated) chat name as its only text child.
  - Pinned indicator at line 114: `{!isEditing && chat.pinned && <PinnedSvg className="text-inherit" />}` — lives in a **separate sibling `<div>`** (line 113), outside the button. Text/labels outside the button are not part of the button's accessible name and are not announced on tab navigation to that button.
- **`sr-only` pattern** already used in the repo:
  - `src/components/Navigation/NavigationAssistants.tsx:142` — `<span ... className="sr-only">`
  - `src/components/TooltipButton/TooltipButton.tsx:64`
  - `src/components/form/Switch/Switch.tsx:81`
  - Tailwind `sr-only` utility (visually hidden, exposed to AT).
- **Test file**: `src/pages/chat/components/ChatSidebar/__tests__/ChatListItem.test.tsx`
  - SVG icons are mocked as plain divs that **ignore all props** (e.g. `pinned.svg?react` → `<div data-testid="pinned-icon">PinnedIcon</div>`, lines 50–52). Any `aria-*` placed on `<PinnedSvg>` would be dropped by the mock and untestable → the label must be a real DOM node the component owns, not an SVG prop.

## Approach
- Put the accessible label **inside** the chat-name `<button>` (lines 101–109) as `<span className="sr-only">Pinned</span>`, rendered only when `chat.pinned`. This makes "Pinned" part of the button's accessible name.
- Add `aria-hidden="true"` to the decorative `<PinnedSvg>` (line 114) so the visual icon is not double-announced. (Not verifiable via the prop-swallowing mock; correctness is by inspection.)

## Risk Indicators
- Single file change + one test. No shared state, no store, no routing changes.
- Low risk. No new dependencies.

## Constraints (from ticket owner)
1. Label must go INSIDE the chat-name `<button>` (not next to the icon), using existing `sr-only`; icon gets `aria-hidden="true"`.
2. Do NOT put `aria-label` on the SVG — the test mock swallows props.
3. Do NOT touch `vite.config.ts`.
