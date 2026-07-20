# Spec: EPMCDME-13243 — Fix TableBlock copy button overlap

## Problem

The copy button added by `TableBlock.tsx` is always visible at `absolute top-0 right-0`, which causes it to overlap the table heading labels rendered in the first row of the table.

## Solution

Hide the button by default and reveal it only when the user hovers over the table or focuses the button via keyboard. Use the Tailwind `group`/`group-hover`/`focus-within` pattern already established in `PinnedRow`, `Card`, `WorkflowCard`, and `PinnedAssistantsOverflowDropdown`.

## Affected File

`src/components/markdown/tokens/TableBlock.tsx` — 2-line Tailwind class change, no structural change.

## Change

```tsx
// wrapper div: add `group`
<div className="relative my-1 group">

// button container div: add opacity classes and transition
<div className="absolute top-0 right-0 z-10 flex items-center h-9 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
```

- `opacity-0` — hidden at rest.
- `group-hover:opacity-100` — revealed when mouse enters the table wrapper.
- `focus-within:opacity-100` — revealed when keyboard focus lands on the button (WCAG 2.1.1).
- `transition-opacity` — smooth fade using Tailwind's default 150 ms duration.

## Accessibility

The button remains in the DOM and in the tab order at all times. Screen readers and keyboard users are unaffected by the opacity change.

## Tests

No test changes. The three existing tests in `TableBlock.test.tsx` cover DOM presence, accessible label, and click behaviour — all of which are unaffected by the CSS change. Hover-triggered visibility is not testable in jsdom and belongs in E2E tests if needed.
