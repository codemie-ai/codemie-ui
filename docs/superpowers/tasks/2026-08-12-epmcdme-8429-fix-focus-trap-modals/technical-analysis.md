# Technical Research

**Task**: modal dialog focus-trap accessibility keyboard
**Generated**: 2026-08-12T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8429: Bug — The keyboard focus moves outside modal dialog windows. Affected modals: 'Create new folder', 'Move to folder', 'Delete Chat?'. The keyboard focus should be trapped inside the modal when navigating with the Tab key. Currently, Tab key navigation escapes outside the modal dialog window. Fix: implement focus trapping so keyboard focus stays within the modal dialog while it is open.

---

## 2. Codebase Findings

### Existing Implementations

- `src/hooks/useFocusTrap.ts` — fully implemented focus trap hook; exports `useFocusTrap(containerRef, isActive)` and `FOCUSABLE_SELECTOR`; already tested
- `src/components/Popup/Popup.tsx` — central modal wrapper around PrimeReact `Dialog`; used by **117 consumers**; does NOT currently call `useFocusTrap` — **this is the root cause**
- `src/components/ConfirmationModal/ConfirmationModal.tsx` — delete/destructive confirmation wrapper around `Popup`; used by 47 consumers; inherits the fix when `Popup` is fixed
- `src/pages/chat/components/ChatSidebar/FolderList/FolderFormPopup.tsx` — "Create new folder" / "Edit folder name" modal → `Popup`
- `src/pages/chat/components/ChatSidebar/ChatList/MoveChatPopup.tsx` — "Move to folder" modal → `Popup`
- `src/pages/chat/components/ChatSidebar/ChatList/DeleteChatPopup.tsx` — "Delete Chat?" modal → `ConfirmationModal` → `Popup`
- `src/components/Navigation/NavigationProfile.tsx` — **only existing consumer of `useFocusTrap`**; established reference pattern: `useFocusTrap(panelContentRef, isTrapActive)`
- `src/hooks/useFocusOnVisible.ts` — auto-focus hook (separate concern; not needed for trap fix)
- `src/hooks/useEscapeKey.ts` — ESC key hook (separate concern; `Popup` handles ESC via its own `useEffect` already)

### Architecture and Layers Affected

- **Hook layer**: `useFocusTrap` (exists, no changes needed to the hook itself)
- **Shared component layer**: `Popup.tsx` — the single fix point; fixing it heals all 117 consumers
- **Feature component layer**: `FolderFormPopup`, `MoveChatPopup`, `DeleteChatPopup` — no changes needed; they inherit the fix via `Popup`

### Integration Points

- `Popup` wraps PrimeReact `Dialog` with `focusOnShow={false}` already set (disabling PrimeReact's native focus management and built-in trap, making `useFocusTrap` solely responsible for keyboard confinement)
- PrimeReact passthrough (`pt`) API: `pt.root.ref = dialogRef as any` attaches a React ref to the Dialog root `.p-dialog` element (which bears `role="dialog"` and contains header, content, footer); PrimeReact's `mergeProps` handles ref merging at runtime — this mechanism is already used in `NavigationProfile.tsx`
- `Popup.tsx` currently imports `useEffect` and `useId` from React; `useRef` must be added to the import

### Patterns and Conventions

- Modal pattern: all modals go through `Popup`; direct PrimeReact `Dialog` imports are prohibited (enforced by guide)
- Focus trap pattern (from `NavigationProfile.tsx`):
  1. `const dialogRef = useRef<HTMLDivElement>(null)`
  2. `useFocusTrap(dialogRef, visible ?? false)` — `visible` prop defaults to `undefined` in `PopupProps`, so `?? false` guards against undefined
  3. Attach ref to PrimeReact Dialog root: `pt={{ root: { ref: dialogRef as any } }}`
- `as any` cast is permitted — `@typescript-eslint/no-explicit-any` is `'off'` in `.eslintrc.cjs`

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/modal-patterns.md` — primary modal guide; lists `Popup` as the single modal primitive; "Focus & Keyboard" table lists `useFocusOnVisible` and `useEscapeKey` but does NOT mention `useFocusTrap`; states "Popup provides built-in: focus trap" — aspirational/incorrect; should be updated after fix
- `.ai-run/guides/patterns/accessibility-patterns.md` — states "Popup provides built-in: ESC close, focus trap, focus restore, aria-modal" (line 194); aspirational/incorrect for focus trap; should be updated after fix
- `.ai-run/guides/patterns/custom-hooks.md` — lists available global hooks; `useFocusTrap` is **not listed** despite existing with full tests (likely an omission); `useFocusOnVisible` and `useEscapeKey` are listed; should be updated after fix
- `.ai-run/guides/testing/testing-patterns.md` — test patterns; `fireEvent` for keyboard events; `getByRole` query priority

### Architectural Decisions

- All modals go through `Popup` — single fix point heals all consumers simultaneously
- `useFocusTrap` was built as a reusable hook (not inlined); the reference implementation in `NavigationProfile` validates the pattern; apply identically to `Popup`
- `focusOnShow={false}` on PrimeReact Dialog delegates all focus management to the application layer

### Derived Conventions

- `useRef<HTMLDivElement>(null)` for PrimeReact Dialog container ref
- `useFocusTrap(ref, visible ?? false)` — always guard `visible` with `?? false`
- `fireEvent` must be added to the `@testing-library/react` import in `Popup.test.tsx` (currently only `render, screen` are imported)
- `FOCUSABLE_SELECTOR` can be imported from `@/hooks/useFocusTrap` for consistent selector reuse in tests

---

## 4. Testing Landscape

### Existing Coverage

- `src/hooks/__tests__/useFocusTrap.test.tsx` — full hook coverage: Tab wrap (last→first), Shift+Tab wrap (first→last), redirect when focus leaves container, inactive state, non-Tab keys ignored
- `src/components/Popup/__tests__/Popup.test.tsx` — covers visibility, buttons, footer, header, Escape; **no focus trap tests**
- `src/components/ConfirmationModal/__tests__/ConfirmationModal.test.tsx` — covers visibility, cancel/confirm, custom text; no focus trap tests (inherits fix; optional to add tests)
- `src/components/Navigation/__tests__/NavigationProfile.test.tsx` — comprehensive focus trap tests (Tab wrap, Shift+Tab wrap, focus restore, deactivation on close, `aria-hidden` on `#app`) — **reference test implementation**

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library 16.3.0
- Two workspace projects: `unit` (*.test.tsx) and `integration` (*.integration.test.tsx)
- Unit test location: `__tests__/` co-located with source file
- Focus trap keyboard events: `fireEvent.keyDown(document, { key: 'Tab', bubbles: true })` and `{ key: 'Tab', shiftKey: true, bubbles: true }`
- Focus state assertion: `expect(element).toHaveFocus()`
- Query priority: `getByRole` first

### Coverage Gaps

- `Popup.test.tsx`: no Tab-trapping tests — needs: Tab wraps last→first, Shift+Tab wraps first→last, trap inactive when dialog is closed
- `ConfirmationModal.test.tsx`: optional — inherits fix from Popup; adding tests is consistent with the pattern but not required for the bug fix

---

## 5. Configuration and Environment

### Environment Variables

None relevant to focus trapping.

### Configuration Files

- `.eslintrc.cjs` — `@typescript-eslint/no-explicit-any` is `'off'`; `as any` casts are permitted
- `vitest.workspace.ts` — two workspace projects (`unit`, `integration`); separate setup files
- `tsconfig.json` — TypeScript config; no special settings relevant to this fix

### Feature Flags and Deployment Concerns

None — this is a pure frontend accessibility fix with no feature flags, no backend changes, no deployment concerns.

---

## 6. Risk Indicators

- **Guide documentation is misleading**: `modal-patterns.md` and `accessibility-patterns.md` both claim "Popup provides built-in: focus trap" — this is aspirational and currently false. These guides should be updated post-fix to match the implementation.
- **`custom-hooks.md` omits `useFocusTrap`**: the hook exists and has full test coverage but is not documented in the hooks guide. Minor documentation debt.
- **PrimeReact `pt` API typing gap**: `pt.root.ref` requires `as any` cast — this is the established pattern (used in `NavigationProfile`) and is lint-permitted; not a code quality risk.
- **`visible` prop can be `undefined`**: `PopupProps.visible` has type `boolean | undefined`; passing it directly to `useFocusTrap(ref, visible)` would fail TypeScript; `visible ?? false` is the correct guard.
- **117 consumers affected**: fixing `Popup.tsx` changes behavior for all modal consumers; regression risk is low (the fix adds keyboard containment, not removal), but test coverage on the shared component ensures correctness.

---

## 7. Summary for Complexity Assessment

This is a targeted accessibility bug fix with a clear root cause and a clear fix path. The `useFocusTrap` hook is already implemented and fully tested; it simply has not been wired into `Popup.tsx`. The fix requires adding ~5 lines to `Popup.tsx`: a `useRef`, a `useFocusTrap` call, and attaching the ref via PrimeReact's passthrough `pt` API. No new hook, no new component, no new dependency — the pattern is lifted directly from the existing `NavigationProfile` reference implementation.

The architecture layers touched are limited: the hook layer (no changes) and the shared component layer (one file: `Popup.tsx`). Because all 117 modal consumers inherit from `Popup`, the single change heals the three named modals (`FolderFormPopup`, `MoveChatPopup`, `DeleteChatPopup`) and every other modal in the app simultaneously.

Test coverage posture is strong: `useFocusTrap` has full hook-level tests; `NavigationProfile` has comprehensive focus trap integration tests that serve as the reference. The gap is `Popup.test.tsx` which has no Tab-trapping tests — these need to be added (Tab wrap and Shift+Tab wrap). The key risk is documentation drift: two guides claim the focus trap is already implemented in `Popup`, which is incorrect; these should be updated after the fix to accurately reflect the implementation.
