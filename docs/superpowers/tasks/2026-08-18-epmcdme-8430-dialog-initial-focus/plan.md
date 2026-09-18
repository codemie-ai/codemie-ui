> **Superseded mechanism:** the `data-popup-id` focus approach described below was replaced before merge; see [post-review-changes.md](./post-review-changes.md).

# EPMCDME-8430 Dialog Initial Focus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a `Popup` dialog opens, move focus to the Close button (or first visible focusable when `hideClose` is true) so keyboard and screen-reader users do not have to Tab back into the dialog.

**Architecture:** Add a single `useEffect([visible, headerId, hideClose])` in `Popup.tsx` that, once `visible` becomes `true`, queries the rendered `[role="dialog"]` by a `data-popup-id` attribute (set on `pt.root`) and focuses the correct target. PrimeReact's own `onExited` focus-restoration remains untouched; React's children-first effect ordering guarantees Dialog captures the pre-open trigger before our effect moves focus.

**Tech Stack:** React 18, PrimeReact 10.9.5, Vitest + RTL, TypeScript, jsdom.

## Global Constraints

- `focusOnShow={false}` on the PrimeReact Dialog MUST stay — removing it activates PrimeReact's FocusTrap, which conflicts with the custom `useFocusTrap` added by open MR !1697 (EPMCDME-8429).
- Do NOT touch `src/hooks/useFocusTrap.ts` — it is !1697's territory.
- Do NOT fix `aria-describedby` (empty string, ~line 165) or the double Escape handling — those are the maintainer's, out of scope.
- Scope: `src/components/Popup/Popup.tsx` and `src/components/Popup/__tests__/Popup.test.tsx` only.
- Filter `SPAN[data-p-hidden-focusable="true"]` from every "first focusable" query — they are PrimeReact's invisible sentinels.
- Accessibility name assertions must be exact, not substrings (lesson from EPMCDME-8433).

---

### Task 1: TDD — Write 5 failing focus tests

**Files:**
- Modify: `src/components/Popup/__tests__/Popup.test.tsx`

**Test-first: yes** — all five tests fail before implementation because no focus logic exists yet.

- [ ] **Step 1: Add the 5 new `it` blocks at the end of the existing `describe('Popup', ...)` block**

Append inside `describe('Popup', () => { ... })`, after the last existing test. Copy exactly:

```tsx
  describe('focus management', () => {
    it('moves focus to the close button when the dialog opens', () => {
      renderPopup()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
    })

    it('does not move focus when visible is false', () => {
      const btn = document.createElement('button')
      document.body.appendChild(btn)
      btn.focus()
      renderPopup({ visible: false })
      expect(document.activeElement).toBe(btn)
      document.body.removeChild(btn)
    })

    it('focuses the first visible focusable when hideClose is true', () => {
      renderPopup({
        hideClose: true,
        hideFooter: true,
        children: <input aria-label="folder name" />,
      })
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'folder name' })
      )
    })

    it('returns focus to the trigger when the dialog closes', async () => {
      const { rerender } = render(
        <>
          <button>Open Dialog</button>
          <Popup
            visible={false}
            onHide={mockOnHide}
            onSubmit={mockOnSubmit}
            header="Test Popup"
          />
        </>
      )
      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      trigger.focus()

      rerender(
        <>
          <button>Open Dialog</button>
          <Popup
            visible={true}
            onHide={mockOnHide}
            onSubmit={mockOnSubmit}
            header="Test Popup"
          />
        </>
      )
      // Focus moves into dialog
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))

      // Close via the close button
      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect(mockOnHide).toHaveBeenCalled()
      // PrimeReact restores focus to the trigger it captured before our effect moved it
      expect(document.activeElement).toBe(trigger)
    })

    it('only focuses the newly opened dialog when two are stacked', async () => {
      const { rerender } = render(
        <>
          <Popup visible={true} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Dialog One" />
          <Popup visible={false} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Dialog Two" />
        </>
      )
      const [closeBtn1] = screen.getAllByRole('button', { name: 'Close' })
      expect(document.activeElement).toBe(closeBtn1)

      rerender(
        <>
          <Popup visible={true} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Dialog One" />
          <Popup visible={true} onHide={mockOnHide} onSubmit={mockOnSubmit} header="Dialog Two" />
        </>
      )
      const [, closeBtn2] = screen.getAllByRole('button', { name: 'Close' })
      expect(document.activeElement).toBe(closeBtn2)
    })
  })
```

- [ ] **Step 2: Run the new tests — verify RED**

```bash
npx vitest run src/components/Popup/__tests__/Popup.test.tsx --reporter=verbose 2>&1 | tail -40
```

Expected: the 5 tests in the `focus management` suite all fail (no focus logic exists yet). The existing 11 tests must still pass.

- [ ] **Step 3: Commit the red tests**

```bash
git add src/components/Popup/__tests__/Popup.test.tsx
git commit -m "EPMCDME-8430: Add failing focus tests for Popup dialog"
```

---

### Task 2: Implement — `data-popup-id` identifier + `useEffect` focus hook

**Files:**
- Modify: `src/components/Popup/Popup.tsx:139–196` (Dialog props block)

**Interfaces:**
- Consumes: `headerId` (from `useId()`, line 80), `hideClose` prop, `visible` prop
- Produces: on every `visible → true` transition, `document.activeElement` is the Close button (or first non-sentinel non-hidden focusable, or `[tabindex="-1"]` content fallback)

- [ ] **Step 1: Add the focus `useEffect` after the existing Escape-key effect (around line 94)**

The two existing lines after the Escape effect hook end at line 94 (`}, [visible, onHide])`). Insert the new effect immediately after:

```tsx
  useEffect(() => {
    if (!visible) return

    const dialog = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(
      el => el.getAttribute('data-popup-id') === headerId
    )
    if (!dialog) return

    let target: HTMLElement | null = null

    if (!hideClose) {
      target = dialog.querySelector<HTMLElement>('.p-dialog-header-icons button') ?? null
    }

    if (!target) {
      const FOCUSABLE =
        'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      for (const el of Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))) {
        if (el.getAttribute('data-p-hidden-focusable') === 'true') continue
        if (el.closest('.p-dialog-header-icons.hidden')) continue
        target = el
        break
      }
    }

    if (!target) {
      target = dialog.querySelector<HTMLElement>('[tabindex="-1"]') ?? null
    }

    target?.focus()
  }, [visible, headerId, hideClose])
```

- [ ] **Step 2: Add `'data-popup-id': headerId` to `pt.root` (around line 163)**

In the `pt` object, the `root` key currently reads:

```tsx
        root: {
          'aria-labelledby': header ? headerId : undefined,
          'aria-describedby': '',
```

Change it to:

```tsx
        root: {
          'aria-labelledby': header ? headerId : undefined,
          'aria-describedby': '',
          'data-popup-id': headerId,
```

Note: `useId()` returns values like `:r0:` containing colons. The `getAttribute` equality check in the effect handles this correctly without CSS-escape issues.

- [ ] **Step 3: Run all Popup tests — verify GREEN**

```bash
npx vitest run src/components/Popup/__tests__/Popup.test.tsx --reporter=verbose 2>&1 | tail -40
```

Expected: all 16 tests pass (11 existing + 5 new). Zero failures.

- [ ] **Step 4: Run lint and type-check**

```bash
npm run lint -- --max-warnings=0 src/components/Popup/Popup.tsx src/components/Popup/__tests__/Popup.test.tsx
npx tsc --noEmit --project tsconfig.json 2>&1 | grep -E "Popup|error" | head -20
```

Expected: no errors. If TypeScript rejects `'data-popup-id'` in the `pt.root` object, add a cast:
```tsx
'data-popup-id': headerId as string,
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Popup/Popup.tsx
git commit -m "EPMCDME-8430: Move focus into dialog on open (close button or first focusable)"
```

Commit message note for the MR: the MR description must explain:
- Blast radius: 112 importers, 117 render sites; of 11 destructive-action dialogs reviewed, all have Close as first focusable — no unintended auto-confirm risk.
- Coordination with MR !1697 (EPMCDME-8429): `focusOnShow={false}` stays to prevent two focus traps when !1697 merges.
