# EPMCDME-8417: Sidebar Toggle Button Accessibility Fix

## Problem

The `SidebarToggle` button does not announce its name or state changes to screen readers.

Two root causes:
1. **Unreliable re-renders**: `subscribe(appInfoStore, …)` is called outside a `useEffect`, creating a new subscription on every render with no cleanup. The subscription fires, but React may not re-render reliably, so the accessibility tree never gets the updated `aria-label`.
2. **Missing `aria-expanded`**: All peer toggle buttons in the codebase (`NavigationExpandButton`, `OverflowButton`, etc.) have `aria-expanded`. `SidebarToggle` does not, so screen readers cannot announce the current collapsed/expanded state.

## Acceptance Criteria

- Button has `aria-label="Hide Sidebar"` when `sidebarExpanded === true`.
- Button has `aria-label="Open Sidebar"` when `sidebarExpanded === false`.
- Button has `aria-expanded={sidebarExpanded}` reflecting current state.
- After activation, NVDA announces the updated name and role: `"Open Sidebar, button"` / `"Hide Sidebar, button"`.
- Keyboard shortcut (Ctrl+B) continues to work.
- No regressions in sidebar toggle behaviour.

## Architecture

**Files changed**: `src/components/Sidebar/SidebarToggle.tsx` (production fix)  
**Files added**: `src/components/Sidebar/__tests__/SidebarToggle.test.tsx` (new tests)

### Production fix — `SidebarToggle.tsx`

Replace the `subscribe`+`useState` pair with `useSnapshot` — the idiomatic valtio pattern already used by `NavigationExpandButton`:

```diff
- import { useState, useEffect } from 'react'
- import { subscribe } from 'valtio'
+ import { useEffect } from 'react'
+ import { useSnapshot } from 'valtio'

  const SidebarToggle = () => {
-   const [isOpen, setIsOpen] = useState<boolean>(appInfoStore.sidebarExpanded)
+   const { sidebarExpanded: isOpen } = useSnapshot(appInfoStore)

    useEffect(() => {
      // keydown handler unchanged
-   }, [appInfoStore.sidebarExpanded])
+   }, [])

-   subscribe(appInfoStore, () => {
-     setIsOpen(appInfoStore.sidebarExpanded)
-   })

    return (
      sidebarOffsetClass && (
        <button
          type="button"
          aria-label={isOpen ? 'Hide Sidebar' : 'Open Sidebar'}
+         aria-expanded={isOpen}
          …
        >
```

`useSnapshot` makes React re-render the component whenever tracked store properties change, so the accessibility tree receives the updated `aria-label` and `aria-expanded` synchronously with every toggle.

### Tests — `SidebarToggle.test.tsx`

Modelled on `NavigationExpandButton.test.tsx`. Mock setup:
- `valtio`: `useSnapshot` returns `mockAppInfoStore`; `subscribe` is a no-op
- `@/store/appInfo`: `appInfoStore` → `mockAppInfoStore`
- `@/hooks/useSidebarOffsetClass`: returns a truthy string class so the button renders
- `@/assets/icons/chevron-left.svg?react`: renders a `<svg data-testid="chevron-icon">`
- `appInfoStore.toggleSidebar`: `vi.fn()`

Test cases:
- Renders without crashing
- Renders a `<button type="button">`
- Renders the chevron icon
- `aria-label="Hide Sidebar"` when `sidebarExpanded === true`
- `aria-label="Open Sidebar"` when `sidebarExpanded === false`
- `aria-expanded` is `true` when `sidebarExpanded === true`
- `aria-expanded` is `false` when `sidebarExpanded === false`
- Icon has `rotate-180` class when collapsed
- Icon does not have `rotate-180` class when expanded
- Clicking the button calls `appInfoStore.toggleSidebar`
- `aria-label` updates from "Hide Sidebar" → "Open Sidebar" on rerender with new state
- `aria-label` updates from "Open Sidebar" → "Hide Sidebar" on rerender with new state
- `aria-expanded` updates on state change

## Data Flow

```
User clicks / Ctrl+B
  → appInfoStore.toggleSidebar()
  → appInfoStore.sidebarExpanded flips
  → useSnapshot triggers React re-render
  → aria-label + aria-expanded update in DOM
  → Screen reader picks up updated accessible name and state
```

## Out of Scope

- No changes to other components, store logic, or keyboard shortcut wiring.
- No visual/layout changes.
