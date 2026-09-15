# Technical Analysis — EPMCDME-8554

## Task Context

Bug: focus is not returned to the invoking element after pressing Esc inside a NavigationMore menu.

Reproduction: Data Sources page → "More Options" button → Tab to "View Details" → press Esc → focus goes to browser address bar instead of back to "More Options" button.

## Codebase Findings

### Root cause — `NavigationMore` component

**File:** `src/components/NavigationMore/NavigationMore.tsx`

The component uses `@floating-ui/react` (`useFloating`, `useClick`, `useDismiss`) to manage the floating menu. Key observations:

1. `useDismiss(context)` is called with no options — it handles Escape key dismissal by calling `onOpenChange(false)` / `setShow(false)`, but does **not** return focus.
2. The trigger button uses `ref={refs.setReference}` (a floating-ui callback ref). There is no separate `useRef` stored for manual `.focus()` calls.
3. `FloatingFocusManager` is **not** used — there is no focus trap and no automatic focus return from the floating-ui library.
4. No `useEffect` tracks the `show` transition to call `.focus()` on close.

Result: when Escape is pressed while focus is inside the menu, floating-ui closes the menu but focus is left wherever the browser chooses (address bar).

### Correct patterns already in the codebase

- `NavigationProfile.tsx` — `setTimeout(() => buttonRef.current?.focus(), 0)` in the `onHide` callback.
- `PinnedAssistantsOverflowDropdown.tsx` — `(anchorRef.current as HTMLElement)?.focus()` in the Escape key handler.
- `ChatHeaderDownloadConversationButton.tsx` — `triggerWrapperRef.current?.querySelector('button')?.focus()` in `handleOverlayHide`.

All three manually store a ref to the trigger and call `.focus()` on close.

### How `NavigationMore` is triggered in the Data Sources table

`DataSourceActions.tsx` (line ~10):
```tsx
<NavigationMore
  hideOnClickInside
  items={menuActions}
  contextId={dataSourceNameId(item.id)}
/>
```

`NavigationMore` is also used across assistants, workflows, skills, integrations, and other pages — the fix will apply app-wide.

### Existing tests

`src/components/NavigationMore/__tests__/NavigationMore.test.tsx` — covers rendering and ARIA attributes. No tests for Escape-key focus return.

## Risk Indicators

- **Low risk** — the fix is additive: a `useRef` + `useEffect` that triggers only on `show` going from `true` to `false`. No behavior change when the menu is opened or when it closes by click.
- **Wide reach** — `NavigationMore` is used in many tables and action menus. Regression risk is low (we're only adding focus-return logic) but testing on a few pages is worthwhile.
- **No API surface change** — no prop additions.

## Integration Points

- `@floating-ui/react` refs API: `refs.setReference` is the callback ref; `refs.domReference.current` (or a separate `useRef` passed alongside) gives the DOM element.
- The existing `useEscapeKey` hook is **not** involved here — `NavigationMore` relies on `useDismiss` from floating-ui, not on the app-level hook.
