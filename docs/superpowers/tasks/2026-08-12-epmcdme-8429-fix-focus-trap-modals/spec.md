# Spec: Fix keyboard focus trap in modal dialogs

**Ticket**: EPMCDME-8429
**Branch**: EPMCDME-8429_fix-keyboard-focus-trap-modal
**Date**: 2026-08-12

---

## Problem

Tab key navigation escapes outside modal dialogs. Affected dialogs: "Create new folder", "Move to folder", "Delete Chat?".

PrimeReact's `Dialog` has `focusOnShow={false}`, which disables its built-in focus management. The `useFocusTrap` hook exists and is fully tested but was never wired into `Popup.tsx`, the shared modal wrapper that all modals inherit from.

## Solution

Wire `useFocusTrap` into `Popup.tsx`. Because all modals use `Popup` as their base, a single change fixes all three named modals and all other `Popup` consumers.

---

## Changes

### `src/components/Popup/Popup.tsx`

1. Add `useRef` to the React import.
2. Import `useFocusTrap` from `@/hooks/useFocusTrap`.
3. Inside the component, declare `const dialogRef = useRef<HTMLDivElement>(null)`.
4. Call `useFocusTrap(dialogRef, visible ?? false)`. The `?? false` guard handles the case where `visible` is `undefined` (its type in `PopupProps`).
5. Add `ref: dialogRef as any` to the existing `pt.root` object. This attaches the ref to the `.p-dialog` element rendered by PrimeReact's Dialog — the element that bears `role="dialog"` and contains the header, content, and footer. The `as any` cast is required due to a PrimeReact typing gap and is consistent with the established pattern in `NavigationProfile.tsx`. ESLint's `no-explicit-any` rule is off for this project.

No other production files change. `ConfirmationModal`, `FolderFormPopup`, `MoveChatPopup`, and `DeleteChatPopup` are all fixed by inheritance.

### `src/components/Popup/__tests__/Popup.test.tsx`

Add `fireEvent` to the `@testing-library/react` import. Add a new `describe('focus trap', ...)` block with three tests:

1. **Tab on last focusable element wraps focus to first** — render the dialog with two focusable children, focus the last one, fire `keyDown(document, { key: 'Tab', bubbles: true })`, assert the first element has focus.
2. **Shift+Tab on first focusable element wraps focus to last** — same setup, focus the first, fire `keyDown(document, { key: 'Tab', shiftKey: true, bubbles: true })`, assert last has focus.
3. **Trap is inactive when visible is false** — render with `visible: false`, fire Tab, assert no interception occurred (Tab does not redirect focus).

`FOCUSABLE_SELECTOR` can be imported from `@/hooks/useFocusTrap` for consistent selector reuse when querying focusable elements in the test DOM.

---

## Out of scope

Three guide files (`modal-patterns.md`, `accessibility-patterns.md`, `custom-hooks.md`) contain aspirational claims that `Popup` already provides a focus trap. These are technically incorrect until this fix lands; after the fix they become accurate. Updating the wording is optional cleanup and is not part of this task.

---

## Acceptance criteria

- Tab key navigation stays inside the modal dialog while it is open.
- Shift+Tab wraps from first to last focusable element.
- Tab wraps from last to first focusable element.
- Focus behaviour is unchanged when the dialog is closed (`visible: false`).
- All existing `Popup.test.tsx` tests continue to pass.
- Three new focus trap tests pass in `Popup.test.tsx`.
