# Keyboard navigation for the NavigationMore options popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared `NavigationMore` options popup keyboard-Tab-navigable on open, so keyboard users can reach and activate the Pin option in the chat sidebar.

**Architecture:** Wrap the existing floating menu `<div>` in `@floating-ui/react`'s `FloatingFocusManager` (`modal={false}`, `initialFocus={0}`, `context={context}`), inside `NavigationMore.tsx`. Keep `useDismiss` and `useClick` unchanged. The user-approved review fix also guards `useFocusReturn` so closing on focus-out preserves an existing external focus destination; default `closeOnFocusOut` stays enabled.

**Tech Stack:** React 18/19, TypeScript, `@floating-ui/react@0.27.16`, Vitest + React Testing Library + `@testing-library/user-event@14.6.1`.

---

## File Structure

- Modify: `src/components/NavigationMore/NavigationMore.tsx:16-28` (imports), `:141-240` (`menu` JSX) — wrap the floating `<div>` in `FloatingFocusManager`.
- Test: `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` — add Tab-traversal/focus coverage using `@testing-library/user-event`; existing Escape-focus-return test (lines 285-296) re-run unchanged as a regression check.

Review fix-up also modifies `src/hooks/useFocusReturn.ts` and `src/hooks/__tests__/useFocusReturn.test.tsx` for restoring absent focus while preserving external focus. Disabled links receive `tabIndex={-1}`; tests cover custom children and Tab-out dismissal. No changes to `ChatListItemContextMenu.tsx`, `ChatListItem.tsx`, or `chats.ts`.

---

### Task 1: Wrap the popup in `FloatingFocusManager` with initial-focus and Tab-traversal coverage

**Files:**
- Modify: `src/components/NavigationMore/NavigationMore.tsx`
- Test: `src/components/NavigationMore/__tests__/NavigationMore.test.tsx`

- [ ] **Step 1: Write the failing test for initial focus on open**

Add to `src/components/NavigationMore/__tests__/NavigationMore.test.tsx`. First add the import at the top of the file (alongside the existing imports):

```tsx
import userEvent from '@testing-library/user-event'
```

Then add a new `describe` block at the end of the file:

```tsx
describe('NavigationMore keyboard focus', () => {
  it('moves focus to the first enabled item when the popup opens', async () => {
    const user = userEvent.setup()
    render(<NavigationMore items={makeItems()} />)
    await user.click(screen.getByRole('button', { name: 'More options' }))

    const [firstItem] = screen.getAllByRole('menuitem')
    expect(firstItem).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/NavigationMore/__tests__/NavigationMore.test.tsx -t "moves focus to the first enabled item"`
Expected: FAIL — the first menu item does not have focus (nothing is focused inside the popup today).

- [ ] **Step 3: Write minimal implementation — wrap the menu in `FloatingFocusManager`**

In `src/components/NavigationMore/NavigationMore.tsx`, add `FloatingFocusManager` to the `@floating-ui/react` import (line 16-28):

```tsx
import {
  useFloating,
  offset,
  shift,
  autoPlacement,
  useDismiss,
  useInteractions,
  useClick,
  useMergeRefs,
  FloatingPortal,
  FloatingFocusManager,
  Alignment,
  Placement,
} from '@floating-ui/react'
```

Then wrap the floating `<div>` (the outer element of `menu`, currently starting at line 142) in `FloatingFocusManager`. Replace:

```tsx
  const menu = (
    <div
      ref={refs.setFloating}
      className="z-50"
      style={floatingStyles}
      onClick={handleClickInside}
      {...getFloatingProps()}
    >
```

with:

```tsx
  const menu = (
    <FloatingFocusManager context={context} modal={false} initialFocus={0}>
      <div
        ref={refs.setFloating}
        className="z-50"
        style={floatingStyles}
        onClick={handleClickInside}
        {...getFloatingProps()}
      >
```

And close the new wrapper after the existing closing `</div>` for that element (the `menu` constant's closing, currently at line 239-240). Replace:

```tsx
      </div>
    </div>
  )
```

with:

```tsx
      </div>
    </div>
    </FloatingFocusManager>
  )
```

(Formatting/indentation will be normalized automatically by the repo's prettier/eslint post-edit hook — do not hand-fix indentation.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/NavigationMore/__tests__/NavigationMore.test.tsx -t "moves focus to the first enabled item"`
Expected: PASS

- [ ] **Step 5: Write the failing test for Tab traversal through all enabled items**

Add to the same `describe('NavigationMore keyboard focus', ...)` block:

```tsx
  it('moves focus through all enabled items in DOM order via Tab', async () => {
    const user = userEvent.setup()
    render(<NavigationMore items={makeItems()} />)
    await user.click(screen.getByRole('button', { name: 'More options' }))

    const [first, second] = screen.getAllByRole('menuitem')
    expect(first).toHaveFocus()

    await user.tab()
    expect(second).toHaveFocus()
  })

  it('skips a disabled item when tabbing', async () => {
    const user = userEvent.setup()
    const items = [
      { title: 'Pin', onClick: vi.fn() },
      { title: 'Rename', onClick: vi.fn(), disabled: true },
      { title: 'Delete', onClick: vi.fn() },
    ]
    render(<NavigationMore items={items} />)
    await user.click(screen.getByRole('button', { name: 'More options' }))

    const [pin, , deleteItem] = screen.getAllByRole('menuitem')
    expect(pin).toHaveFocus()

    await user.tab()
    expect(deleteItem).toHaveFocus()
  })
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/NavigationMore/__tests__/NavigationMore.test.tsx -t "Tab"`
Expected: Both new tests FAIL before Step 3's change is considered proven in isolation — but since Step 3 already landed in this task, run this as a confirmation step instead: these tests should already PASS immediately given the Step 3 implementation, because `initialFocus={0}` plus native Tab order (disabled buttons are not tabbable) already covers traversal. If either fails, inspect whether `modal={false}` was set correctly (a modal focus trap would still pass Tab-forward but would also trap Tab-out, which the next step checks).

- [ ] **Step 7: Run full file to confirm everything passes together**

Run: `npx vitest run --project unit src/components/NavigationMore/__tests__/NavigationMore.test.tsx`
Expected: PASS, all tests including Step 1's and Step 5's.

- [ ] **Step 8: Write the failing-by-design regression test — Tab out of the popup in non-modal mode**

```tsx
  it('moves focus out of the popup when tabbing past the last item (non-modal)', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <NavigationMore items={makeItems()} />
        <button type="button">After</button>
      </div>
    )
    await user.click(screen.getByRole('button', { name: 'More options' }))

    const [, second] = screen.getAllByRole('menuitem')
    await user.tab()
    expect(second).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/NavigationMore/__tests__/NavigationMore.test.tsx -t "tabbing past the last item"`
Expected: PASS — `modal={false}` means Tab past the last item exits the popup into page order rather than wrapping or trapping.

If this fails (focus gets trapped instead), it means `modal` defaulted to `true` or was omitted; re-check Step 3's `modal={false}` is present.

- [ ] **Step 10: Write the failing test for Enter/Space activation**

```tsx
  it('activates the focused item with Enter', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<NavigationMore items={[{ title: 'Pin', onClick }]} />)
    await user.click(screen.getByRole('button', { name: 'More options' }))

    expect(screen.getByRole('menuitem')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/NavigationMore/__tests__/NavigationMore.test.tsx -t "activates the focused item with Enter"`
Expected: PASS — native `<button>` elements already activate on Enter/Space; this confirms the focus-manager wrap didn't interfere.

- [ ] **Step 12: Re-run the existing Escape-focus-return test as a regression check**

Run: `npx vitest run --project unit src/components/NavigationMore/__tests__/NavigationMore.test.tsx -t "returns focus to trigger button when Escape closes the menu"`
Expected: PASS (Escape from a focused menu item returns to the trigger; Tab-out closes the menu and preserves the destination with the approved `useFocusReturn` guard).

- [ ] **Step 13: Run the full NavigationMore test file one final time**

Run: `npx vitest run --project unit src/components/NavigationMore/__tests__/NavigationMore.test.tsx`
Expected: PASS — every test in the file, old and new.

- [ ] **Step 14: Commit**

```bash
git add src/components/NavigationMore/NavigationMore.tsx src/components/NavigationMore/__tests__/NavigationMore.test.tsx
git commit -m "EPMCDME-15443: Make NavigationMore popup keyboard-Tab-navigable"
```

---

## Testing Summary

All new coverage lives in `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` (real component, no mocking), per `spec.md`'s Testing section:
- Initial focus on open (Step 1).
- Tab traversal through enabled items, disabled items skipped (Step 5).
- Tab-out of the popup in non-modal mode — regression guard (Step 8).
- Enter activation (Step 10).
- Existing Escape-focus-return test re-run unchanged (Step 12).

No changes to `ChatListItem.test.tsx` or `ChatSidebarLists.keyboard.test.tsx` — out of scope per `spec.md`.

**Test-first: yes** — every behavioral change in Task 1 is preceded by a failing test (Steps 1, 5, 8, 10) before or alongside the implementation step (Step 3).
