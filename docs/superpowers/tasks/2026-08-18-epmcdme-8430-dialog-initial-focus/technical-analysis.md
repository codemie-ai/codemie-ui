> **Superseded mechanism:** the timed DOM-lookup focus approach analyzed below was replaced before merge; see [post-review-changes.md](./post-review-changes.md).

# Technical Analysis — EPMCDME-8430 dialog-initial-focus

## Summary

Bug: `Popup.tsx` wraps PrimeReact `Dialog` with `focusOnShow={false}`. PrimeReact's built-in
auto-focus path is gated on that prop (`if (props.focusOnShow) focus()`), so focus never enters
the dialog — it stays on the trigger element outside the overlay.

Scope: `src/components/Popup/Popup.tsx` + `src/components/Popup/__tests__/Popup.test.tsx` only.

## Codebase Findings

### Popup.tsx (src/components/Popup/Popup.tsx)

- **Line 141**: `focusOnShow={false}` — must stay. Removing it activates PrimeReact's FocusTrap
  with `autoFocus`, which conflicts with the custom `useFocusTrap` that MR !1697
  (EPMCDME-8429, open) is adding to this exact component.
- **Line 80**: `const headerId = useId()` — unique per instance; safe to use as a dialog
  identifier via a `data-popup-id` attribute on `pt.root`.
- **Line 182**: `pt.content: { tabIndex: -1 }` — the content container is already
  programmatically focusable; it serves as the final fallback target.
- **Line 39** (`hideClose` prop) / **Line 181** (`pt.headerIcons.className: cn('self-auto', hideClose && 'hidden')`):
  when `hideClose` is true the `p-dialog-header-icons` container gets Tailwind class `hidden`
  (display:none). The close button DOM node is still rendered — skipping it must be done by
  checking the `hideClose` prop, not by reading computed styles (jsdom does not apply CSS).
- **Line 162–165**: `pt.root` already carries `aria-labelledby` and `aria-describedby`. Adding
  `data-popup-id={headerId}` here is safe and zero-impact on semantics.

### PrimeReact Dialog (v10.9.5) — relevant internals (measured)

- Renders focus sentinels as `<span data-p-hidden-focusable="true">` at start and end of
  `[role="dialog"]`. They have `tabIndex="0"` and must be filtered from any "first focusable"
  search.
- `focusElementOnHide.current` is captured (set to `document.activeElement`) in Dialog's own
  `useEffect` that runs before parent effects (children-first React ordering). At capture time
  focus is still on the trigger → close restores focus to trigger correctly after our change.
- Close button: `<button class="p-dialog-header-close ... " aria-label="Close">` — always
  accessible name "Close".

### Import surface (measured, 2026-08-17)

112 files import Popup; 117 render sites. Of 11 auto-focus-sensitive sites
(ConfirmationModal, DeleteFolderPopup, UnsavedChangesConfirmation, CompleteKataConfirmation, etc.)
the first focusable element is **always** the Close button — not Submit. Blast radius is safe.

## Risk Indicators

1. **Import breadth**: 112 importers — single-component change with wide deployment surface.
2. **Sentinel interaction**: focus logic must filter `data-p-hidden-focusable` or first focus
   lands on an invisible sentinel.
3. **MR !1697 coordination**: `useFocusTrap` will be added to this same component; MR description
   must explain why `focusOnShow={false}` stays.
4. **jsdom CSS limitation**: `hidden` class (Tailwind display:none) is not applied by jsdom —
   test assertions must rely on class-name checks, not computed style, to distinguish visible
   vs hidden headerIcons.
5. **Effect ordering**: our `useEffect` must run after PrimeReact's Dialog effect so that
   `focusElementOnHide` captures the trigger (not the close button) before we move focus.
   React's children-first effect ordering guarantees this: Dialog is a child of Popup.

## Implementation Notes

- **Detection**: `data-popup-id={headerId}` on `pt.root` + `Array.from(querySelectorAll).find()`
  avoids CSS-escape issues with `useId()`'s `:r0:` format.
- **Focus priority**: (1) close button via `.p-dialog-header-icons button` when `!hideClose`;
  (2) first non-sentinel, non-hidden-headerIcons focusable; (3) content element (`tabIndex: -1`).
- **Stacked dialogs**: each Popup instance has its own `useEffect([visible, headerId, hideClose])`.
  Opening a second dialog triggers only that instance's effect; the first dialog's effect does
  not re-run (its `visible` didn't change).
- **No timing shim needed**: the dialog portal is committed to the DOM synchronously before any
  effects run; `querySelector('[role="dialog"]')` always finds the element.
