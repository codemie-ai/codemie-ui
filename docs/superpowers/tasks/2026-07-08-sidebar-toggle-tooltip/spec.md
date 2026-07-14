# EPMCDME-12771: Sidebar toggle Ctrl+B tooltip

## Problem

The sidebar hide/show toggle button (Chats page and other areas) has a working `Ctrl + B` keyboard shortcut, but nothing surfaces it to the user. Add a tooltip on hover-hold that shows the shortcut, matching the app's existing tooltip pattern.

## Scope

Single component: `src/components/Sidebar/SidebarToggle.tsx`. The button rendered there (currently lines 58-76) is shared across 4+ pages (chat, workflows, assistants, skills); the change applies everywhere the component is used, which matches the ticket's intent ("Chats page and other areas with sidebar toggle").

## Design

Reuse the existing global React Tooltip pattern already used by 30+ buttons in this codebase (e.g. `ChatHeaderClearButton.tsx`), rather than the separate PrimeReact `Tooltip` wrapper component (`src/components/Tooltip/Tooltip.tsx`), which is a different render-target pattern used for data-bound tooltips elsewhere and doesn't fit a static hover tooltip on a plain button.

Add three attributes to the toggle `<button>`:

- `data-tooltip-id="react-tooltip"` — targets the app's single global tooltip instance.
- `data-tooltip-content="Toggle Sidebar (Ctrl + B)"` — static text naming the action plus shortcut, consistent with sibling tooltips ("Clear Chat", "Share Chat", etc.).
- `data-tooltip-place="right"` — the button sits flush against the left edge of the viewport; default (top) placement risks clipping off-screen, so pin it right into the visible content area.

## Behavior

Hover-hold-to-show and mouse-leave-to-dismiss come for free from the global tooltip config (`src/utils/tooltip.ts`), which already sets `openEvents: { mouseover: true }`. No new state, effects, or event handlers are needed.

## Accessibility

`aria-label` on the button (dynamic: "Hide Sidebar" / "Open Sidebar") is untouched. The tooltip text is static and additive — it does not duplicate the aria-label's announcement.

## Non-goals

- No change to the Ctrl+B keydown handler (already implemented, lines 26-44) — verified correct, out of scope.
- No new shared Tooltip component — reuse existing pattern exactly.
- No new test file — component has zero existing test coverage; this is a presentation-only, additive change reviewed manually per QA gates. Not adding new test infra as part of an XS ticket.

## Acceptance criteria (from ticket)

- [ ] Tooltip appears showing "Toggle Sidebar (Ctrl + B)" on hover-hold over the sidebar toggle button.
- [ ] Tooltip styled consistently with other tooltips in the app (uses the same global tooltip instance/styling).
- [ ] Tooltip disappears when cursor moves away.
- [ ] Tooltip content is accessible/readable (does not duplicate or conflict with aria-label).
- [ ] No regression to existing sidebar toggle click/keyboard behavior.
