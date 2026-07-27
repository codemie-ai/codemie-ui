# Fix Copy Table Button Hover Dismiss Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Copy button on Markdown tables so it auto-hides when the pointer leaves the hover area after clicking, without requiring an additional click.

**Architecture:** The bug is a CSS interaction: `focus-within:opacity-100` on the overlay div keeps the Copy button visible after click because the browser assigns DOM focus to the button. The fix calls `element.blur()` immediately after the click handler runs, releasing `:focus-within` and restoring the CSS-only hover behavior. `focus-within:opacity-100` must stay in place for keyboard accessibility.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, React Testing Library

## Global Constraints

- Only `src/components/markdown/tokens/TableBlock.tsx` changes in the implementation.
- `focus-within:opacity-100` class on the overlay div must NOT be removed (required for keyboard accessibility).
- No new dependencies.
- Test-first: red → green for every task.

---

### Task 1: Add failing test for blur-on-click

**Files:**
- Modify: `src/components/markdown/tokens/__tests__/TableBlock.test.tsx`

**Test-first: yes — test must fail before TableBlock.tsx is changed.**

- [ ] **Step 1: Add the failing test**

  Append inside the `describe('TableBlock', ...)` block in `src/components/markdown/tokens/__tests__/TableBlock.test.tsx`:

  ```tsx
  it('blurs the copy button after click so the overlay dismisses without an extra click', () => {
    render(<TableBlock html="<table></table>" raw="| a |\n|---|" />)
    const button = screen.getByRole('button', { name: 'Copy table' })
    const blurSpy = vi.spyOn(button, 'blur')

    fireEvent.click(button)

    expect(blurSpy).toHaveBeenCalledTimes(1)
  })
  ```

- [ ] **Step 2: Run the test — expect RED**

  ```bash
  npm test -- src/components/markdown/tokens/__tests__/TableBlock.test.tsx
  ```

  Expected: `FAIL — Expected "blur" to have been called 1 time(s) but was called 0 time(s).`

---

### Task 2: Fix TableBlock onClick to blur after copy

**Files:**
- Modify: `src/components/markdown/tokens/TableBlock.tsx:38`

**Test-first: yes — green after this change.**

- [ ] **Step 3: Apply the fix**

  In `src/components/markdown/tokens/TableBlock.tsx`, change line 38 from:

  ```tsx
  onClick={() => copyToClipboard(raw.trim(), 'Table copied to clipboard')}
  ```

  to:

  ```tsx
  onClick={(e) => {
    copyToClipboard(raw.trim(), 'Table copied to clipboard')
    ;(e.currentTarget as HTMLElement).blur()
  }}
  ```

- [ ] **Step 4: Run all TableBlock tests — expect GREEN**

  ```bash
  npm test -- src/components/markdown/tokens/__tests__/TableBlock.test.tsx
  ```

  Expected: all 4 tests pass.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

  ```bash
  npm test
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/markdown/tokens/TableBlock.tsx \
          src/components/markdown/tokens/__tests__/TableBlock.test.tsx
  git commit -m "EPMCDME-13611: Blur copy button after click to dismiss overlay on mouse-leave"
  ```
