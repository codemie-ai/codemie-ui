# Spec — EPMCDME-8554: Focus return on Escape

## Problem

When a user opens a menu or modal and presses Escape, focus is lost (lands on the browser address bar) instead of returning to the element that triggered the overlay. Reported on the Data Sources "More Options" menu; the same gap exists in three other components.

## Solution

Introduce a `useFocusReturn` hook and apply it to the four affected components.

## Hook — `src/hooks/useFocusReturn.ts`

```ts
export const useFocusReturn = (
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean
) => void
```

Tracks the previous value of `isOpen`. When `isOpen` transitions `true → false`, calls `triggerRef.current?.focus()`. No side effects when opening or when `isOpen` was already `false`.

## Callsites

### 1. `NavigationMore.tsx`

- Add `triggerRef = useRef<HTMLButtonElement>(null)`.
- Combine with floating-ui's callback ref on the trigger `<button>`: `ref={(el) => { triggerRef.current = el; refs.setReference(el) }}`.
- Call `useFocusReturn(triggerRef, show)`.

### 2. `SearchableCombobox.tsx` + `ChatPromptLlmSelector.tsx`

`SearchableCombobox` uses a `renderTrigger` render-prop — the trigger button lives in the caller. It uses PrimeReact `OverlayPanel` with an existing `onHide` callback hook. No internal state tracks visibility, so `useFocusReturn` does not apply.

- Add optional `triggerRef?: RefObject<HTMLElement | null>` to `SearchableComboboxProps`.
- Add `onHide` handler to `OverlayPanel`: `onHide={() => triggerRef?.current?.focus()}`.
- In `ChatPromptLlmSelector.tsx` (the only caller): create `triggerRef = useRef<HTMLButtonElement>(null)`, pass it as `triggerRef` to `<SearchableCombobox>`, and attach it to the trigger `<button>` inside `renderTrigger`.

### 3 & 4. `useMCPServerModal` / `useMarketplaceModal`

Both use PrimeReact `Dialog`, which has its own built-in focus management on close. Layering `useFocusReturn` on top risks double-focus interactions. These are deferred — verify PrimeReact Dialog focus-return behaviour in a follow-up before adding anything.

## What is explicitly out of scope

- `useMCPServerModal` / `useMarketplaceModal` — deferred; PrimeReact Dialog focus management needs verification first.
- `TooltipButton` — Escape fires on the button's own `onKeyDown`; focus never leaves the button.
- `MultiSelect` — PrimeReact component with its own internal focus management.
- `WorkflowDetailsPage` / `WorkflowEditor` — Escape deselects canvas state, not a popup pattern.

## Tests

- **`useFocusReturn`**: unit test in `src/hooks/__tests__/useFocusReturn.test.ts` — open then close, assert trigger receives focus; open then close when ref is null, assert no throw.
- **`NavigationMore`**: new test in the existing accessibility describe block — open menu → press Escape → assert `document.activeElement === triggerButton`.
- No new tests required for the modal hooks (covered by the hook unit test + the existing modal test suites).
