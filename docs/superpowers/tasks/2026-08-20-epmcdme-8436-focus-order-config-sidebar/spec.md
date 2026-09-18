# EPMCDME-8436: Fix Focus Order for Configuration Sidebar

**Date:** 2026-08-20  
**Ticket:** [EPMCDME-8436](https://jiraeu.epam.com/browse/EPMCDME-8436)  
**WCAG criterion:** 2.4.3 Focus Order  
**Complexity:** S (score 10)

---

## Problem

When the Configuration sidebar opens (`isConfigVisible` becomes `true`), keyboard focus stays on or moves past the Configuration toggle button in `ChatHeader`. Because `#chat-area` precedes `#chat-configuration-panel` in DOM source order, Tab navigation enters the chat area's interactive elements before it reaches the sidebar — violating WCAG 2.4.3.

Additionally, when the sidebar closes, focus is not explicitly returned to the trigger button, leaving the user's position in the page indeterminate.

---

## Approach

All changes are confined to `ChatConfiguration.tsx` and its test file. No prop changes, no store changes, no new files.

### 1. Make `<aside>` programmatically focusable

Add `tabIndex={-1}` to the `<aside id="chat-configuration-panel">` element. This allows programmatic `.focus()` calls without inserting the aside into the natural Tab sequence.

### 2. Focus the sidebar on open

Add `sidebarRef = useRef<HTMLElement>(null)` and attach it to the `<aside>`. Call:

```tsx
useFocusOnVisible(sidebarRef, isConfigVisible)
```

The existing hook (`src/hooks/useFocusOnVisible.ts`) moves focus to `ref.current` 100 ms after `isVisible` becomes `true`. The delay accounts for sidebar CSS transitions and is consistent with how modals use the hook elsewhere in the codebase.

### 3. Restore focus on close

Add `prevFocusRef = useRef<HTMLElement | null>(null)` and a single `useEffect` watching `isConfigVisible`:

```tsx
useEffect(() => {
  if (isConfigVisible) {
    prevFocusRef.current = document.activeElement as HTMLElement
  } else {
    prevFocusRef.current?.focus()
  }
}, [isConfigVisible])
```

This captures the Configuration toggle button (the focused element at open time) and restores focus to it when the sidebar closes. Pattern is prescribed by `.ai-run/guides/patterns/accessibility-patterns.md` § "Restore Focus on Modal Close".

---

## Out of scope

The `isConfigFormVisible` view-switch within the sidebar (general settings ↔ assistant form) also lacks focus management. That is a separate concern and not part of WCAG 2.4.3 AC for this ticket.

---

## Testing

Two new test cases added to `ChatConfiguration/__tests__/ChatConfiguration.test.tsx`:

| Test | Assertion |
|---|---|
| `isConfigVisible` transitions `false → true` | `<aside>` element `toHaveFocus()` after 100 ms (fake timers) |
| `isConfigVisible` transitions `true → false` | Previously focused element `toHaveFocus()` |

`vi.useFakeTimers()` / `vi.advanceTimersByTime(100)` used to control the `useFocusOnVisible` delay without real timeouts.

---

## Files changed

| File | Change |
|---|---|
| `src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` | Add `sidebarRef`, `prevFocusRef`, `useFocusOnVisible` call, close-restore `useEffect`, `tabIndex={-1}` on `<aside>` |
| `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx` | Add 2 focus-order test cases |
