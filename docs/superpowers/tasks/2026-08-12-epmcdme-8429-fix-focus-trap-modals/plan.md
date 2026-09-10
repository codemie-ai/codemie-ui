# Fix Keyboard Focus Trap in Modal Dialogs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing `useFocusTrap` hook into `Popup.tsx` so Tab key navigation stays inside every modal dialog in the app.

**Architecture:** `Popup.tsx` is the single shared modal wrapper (117 consumers). It uses PrimeReact's `Dialog` with `focusOnShow={false}`, which disables PrimeReact's built-in focus management entirely. Adding `useFocusTrap` to `Popup` — attached to the Dialog root via the PrimeReact passthrough (`pt`) API — fixes all modals in one place.

**Tech Stack:** React 18, TypeScript, PrimeReact 10, Vitest 1.6.1, React Testing Library 16

## Global Constraints

- Follow the PrimeReact `pt` ref pattern: `pt.root.ref = dialogRef as any` (established in `NavigationProfile.tsx`; `as any` is lint-permitted)
- Guard `visible ?? false` — `PopupProps.visible` is `boolean | undefined`
- Do not modify the hook (`useFocusTrap.ts`) — it is correct as-is
- Do not modify any feature-level modal (`FolderFormPopup`, `MoveChatPopup`, `DeleteChatPopup`) — fix is at the `Popup` level only
- Commit message must match the pattern `EPMCDME-XXXX: Capital sentence` (CI enforced)

---

### Task 1: Wire useFocusTrap into Popup and add Tab-trap tests

**Test-first: yes — failing test: Tab on last focusable element does NOT wrap to first (no focus trap active)**

**Files:**
- Modify: `src/components/Popup/Popup.tsx:17` (React import — add `useRef`)
- Modify: `src/components/Popup/Popup.tsx:17` (add `useFocusTrap` import)
- Modify: `src/components/Popup/Popup.tsx:80` (add `dialogRef` + `useFocusTrap` call)
- Modify: `src/components/Popup/Popup.tsx:162` (add `ref` to `pt.root`)
- Modify: `src/components/Popup/__tests__/Popup.test.tsx:16` (add `fireEvent` to import)
- Modify: `src/components/Popup/__tests__/Popup.test.tsx` (add `describe('focus trap')` block)

**Interfaces:**
- Consumes: `useFocusTrap(containerRef: RefObject<HTMLElement | null>, isActive: boolean): void` from `@/hooks/useFocusTrap`
- Produces: nothing new — `Popup` props and exports are unchanged

- [ ] **Step 1: Add the three failing focus-trap tests to `Popup.test.tsx`**

Add `fireEvent` to the existing `@testing-library/react` import and add the import for `FOCUSABLE_SELECTOR`. Then add this `describe` block after the closing `})` of the existing `describe('Popup', ...)` block:

```tsx
// At the top of the file, update the import:
import { render, screen, fireEvent } from '@testing-library/react'

// After the existing describe block, add:
describe('Popup — focus trap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('traps Tab on last focusable element — wraps focus to first', () => {
    render(
      <Popup visible onHide={mockOnHide} hideFooter hideClose>
        <button data-testid="btn-a">A</button>
        <button data-testid="btn-b">B</button>
      </Popup>
    )
    screen.getByTestId('btn-b').focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })
    expect(screen.getByTestId('btn-a')).toHaveFocus()
  })

  it('traps Shift+Tab on first focusable element — wraps focus to last', () => {
    render(
      <Popup visible onHide={mockOnHide} hideFooter hideClose>
        <button data-testid="btn-a">A</button>
        <button data-testid="btn-b">B</button>
      </Popup>
    )
    screen.getByTestId('btn-a').focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true, bubbles: true })
    expect(screen.getByTestId('btn-b')).toHaveFocus()
  })

  it('does not intercept Tab when the dialog is not visible', () => {
    render(
      <Popup visible={false} onHide={mockOnHide}>
        <button data-testid="btn-a">A</button>
      </Popup>
    )
    // Dialog is not in DOM when visible=false; Tab must not throw or redirect focus
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(() => {
      fireEvent.keyDown(document, { key: 'Tab', bubbles: true })
    }).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the new tests to confirm they fail (RED)**

```bash
npx vitest run --project unit src/components/Popup/__tests__/Popup.test.tsx
```

Expected: the two wrap tests fail — `btn-a` / `btn-b` do not have focus after Tab because the trap is not yet active. The third test passes (no dialog in DOM is already true). That's fine — we need at least the first two RED.

- [ ] **Step 3: Implement the fix in `Popup.tsx`**

**3a — update the React import** (line 17): add `useRef`

```tsx
import React, { ReactNode, useEffect, useId, useRef } from 'react'
```

**3b — add the `useFocusTrap` import** after the existing local imports block (after line 23, `import { cn } from '@/utils/utils'`):

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap'
```

**3c — declare the ref and activate the trap** inside the component body, right after `const headerId = useId()` (line 80):

```tsx
const dialogRef = useRef<HTMLDivElement>(null)
useFocusTrap(dialogRef, visible ?? false)
```

**3d — attach the ref to the Dialog root** via the PrimeReact passthrough API. In the `pt` prop (line 162), add `ref: dialogRef as any` as the first property of `pt.root`:

```tsx
pt={{
  root: {
    ref: dialogRef as any,
    'aria-labelledby': header ? headerId : undefined,
    'aria-describedby': '',
    ...(isMagic && {
      style: {
        backgroundImage: `url(${gradientModal})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      },
    }),
  },
  // ... remainder of pt unchanged
```

- [ ] **Step 4: Run all Popup tests to confirm GREEN**

```bash
npx vitest run --project unit src/components/Popup/__tests__/Popup.test.tsx
```

Expected: all tests pass, including the three new focus-trap tests. Zero regressions in the existing 11 tests.

- [ ] **Step 5: Run the full unit suite to confirm no regressions**

```bash
npx vitest run --project unit
```

Expected: all tests pass. The change is strictly additive — no consumer behaviour changes.

- [ ] **Step 6: Commit**

```bash
git add src/components/Popup/Popup.tsx src/components/Popup/__tests__/Popup.test.tsx
git commit -m "EPMCDME-8429: Fix keyboard focus trap in modal dialogs"
```

---

## Self-Review

**Spec coverage:**
- ✅ Tab stays inside modal — covered by Task 1 step 3 (useFocusTrap wired) and step 1 (test wraps last→first)
- ✅ Shift+Tab wraps first→last — covered by test 2
- ✅ Tab wraps last→first — covered by test 1
- ✅ No behaviour change when `visible: false` — covered by test 3 and the `?? false` guard
- ✅ Existing tests unaffected — covered by full suite run in step 5
- ✅ Three new focus trap tests — all three written in step 1

**Placeholder scan:** No TBDs, no "similar to" references, all test code and implementation code is explicit.

**Type consistency:** `dialogRef` is `useRef<HTMLDivElement>(null)` throughout; `useFocusTrap` accepts `RefObject<HTMLElement | null>` — `HTMLDivElement` satisfies `HTMLElement`. No naming drift.
