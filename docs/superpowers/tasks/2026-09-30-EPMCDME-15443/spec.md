# Spec: Keyboard navigation for the NavigationMore options popup

**Ticket**: EPMCDME-15443
**Status**: Approved

## Problem

The "More options" popup opened from `NavigationMore` (used by the chat sidebar's chat-item
context menu, among other consumers) does not receive keyboard focus when it opens, and its items
are not reachable via Tab. Keyboard users cannot reach or activate the Pin option in the chat
sidebar, which also blocks validation of EPMCDME-8432.

## Acceptance Criteria

1. When the popup opens, keyboard focus moves to the first enabled, tabbable item inside it.
2. All enabled items in the popup are reachable via Tab (disabled items and dividers are
   naturally skipped, as today).
3. The Pin option is reachable and can be activated with the keyboard (Enter/Space) — this is
   already true structurally in `ChatListItemContextMenu` (Pin/Unpin renders first), so satisfying
   criterion 1 satisfies this directly.
4. Keyboard focus remains visible at every step (existing focus-ring classes already apply; no
   new styling required).
5. No regression to existing dismissal/focus-return behavior: Escape, outside click, and
   ancestor-scroll dismissal continue to close the popup. Escape returns focus to the trigger.
   When focus has moved to another element (including Tab outside), preserve that destination;
   `useFocusReturn` restores focus only if no element remains focused (`useDismiss` unchanged).
6. No regression for other `NavigationMore` consumers (assistants, workflows, folders, tables) —
   the fix is made once in the shared component.

## Design

### Approach

Wrap the popup content in `@floating-ui/react`'s `FloatingFocusManager`, in **non-modal** mode,
inside `src/components/NavigationMore/NavigationMore.tsx`. This is the library's built-in
mechanism for exactly this problem — it is already a transitive capability of the installed
`@floating-ui/react@0.27.16` dependency, so no new dependency is introduced.

- `modal={false}`: preserves the existing non-trapping behavior consumers rely on today — Tab
  past the last item (or Shift+Tab before the first) exits the popup in page order rather than
  wrapping, and the existing `useDismiss`/`useFocusReturn` wiring for Escape, outside-click, and
  ancestor-scroll keeps working. Keep default `closeOnFocusOut` so Tab outside closes the popup;
  the approved review fix guards `useFocusReturn` against overriding the new focus destination.
- `initialFocus={0}`: focuses the first tabbable descendant of the floating element on open. No
  per-item index bookkeeping is needed — Floating UI resolves this against actual DOM order,
  which already covers custom `children`, hidden/filtered items, and disabled buttons (`disabled`
  buttons are not tabbable, so they're skipped automatically). Disabled links explicitly use
  `tabIndex={-1}` to exclude them from initial focus and traversal.
- `context={context}`: the existing `context` object returned by `useFloating`.

`FloatingFocusManager` must wrap the floating element itself (the `menu` div with
`refs.setFloating`), and only render while `show` is true, consistent with the existing
`{show && (...)}` render guard.

### Scope

Change is confined to `NavigationMore.tsx`, `useFocusReturn.ts`, and their focused tests.
The user approved the hook guard during review fix-up: preserve focus already moved outside
when default focus-out dismissal closes the popup. No change to `ChatListItemContextMenu.tsx`,
`ChatListItem.tsx`, or `chats.ts`; Pin's position and the pin/unpin flow are already correct.

### Out of scope

- NVDA / live-browser verification (requires separate consent per EPMCDME-15443's own ticket
  notes; not part of this fix's acceptance criteria, which are keyboard-focus/Tab-order based).
- Any change to `primary-500` vs. `border-focus` focus-ring token usage — out of scope for this
  defect; current focus-ring classes already render visibly via `border-focus`/
  `surface-specific-dropdown-focused` tokens defined in Tailwind config.
- EPMCDME-8432 itself (depends on this fix but is a separate ticket).

## Testing

Extend `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` (real component, no
mocking) with:

- Opening the popup moves focus to the first enabled item.
- Repeated Tab presses move focus through all enabled items in DOM order; a disabled item (if
  present in a test case) is skipped.
- Enter/Space on a focused item activates its `onClick`.
- Tabbing past the last item moves focus out of the popup (regression guard for non-modal mode).
- Escape still closes the popup and returns focus to the trigger button (existing coverage,
  re-run to confirm no regression from the `FloatingFocusManager` wrap).

No new test files; no changes to `ChatListItem.test.tsx` or `ChatSidebarLists.keyboard.test.tsx`
are required since the fix is entirely inside the shared component they already exercise through
mocks/real rendering respectively.

## Risks

- `FloatingFocusManager` changes where focus lands on open for every `NavigationMore` consumer.
  Mitigated by `initialFocus={0}` targeting the first tabbable descendant, which is a strict
  improvement (previously: nothing was focused) and non-modal mode preserving today's exit
  behavior.
- None of the located existing tests assert on *absence* of initial focus, so no existing
  assertion is expected to break; this will be confirmed by running the full `NavigationMore`
  test file after the change.
