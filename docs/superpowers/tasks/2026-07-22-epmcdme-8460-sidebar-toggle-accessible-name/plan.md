# EPMCDME-8460 Sidebar Toggle Accessible Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development inline (sdlc-light flow — no subagent dispatch). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the sidebar collapse/expand toggle button a state-dependent accessible name (`aria-label="Hide Menu"` expanded / `"Show Menu"` collapsed) so it satisfies WCAG 2.4.6 / 4.1.2 in both states.

**Architecture:** Single presentational component change. `NavigationExpandButton` already reads `navigationExpanded` from the valtio `appInfoStore`; the fix adds one state-dependent `aria-label` attribute to the existing `<button>`. No state, routing, tooltip, or visual changes.

**Tech Stack:** React 18 + TypeScript, valtio, Vitest 1.6 + @testing-library/react (existing mock harness in the co-located test file).

## Requirements (Stage 2 — clarity check: Clear, no open questions)

- Ticket EPMCDME-8460, scope corrected by the user against the live DOM: target is the bottom sidebar toggle button, **not** the logo (`NavigationLogo.tsx` must not be touched).
- Expanded state: visible text "Hide Menu" stays; accessible name must be "Hide Menu".
- Collapsed state: icon-only button must get accessible name "Show Menu".
- Labelling only — no change to toggle logic, tooltip, or visuals.
- Known accepted divergence: collapsed-state tooltip text remains "Expand Menu" (visible tooltip) while the screen-reader name is "Show Menu" per ticket wording; changing the tooltip is out of scope.
- i18n out of scope — hardcoded English labels are the repo convention (precedent: EPMCDME-8433 review).
- WCAG 2.5.3 note: expanded-state `aria-label="Hide Menu"` exactly matches the visible text, so label-in-name holds.

## Global Constraints

- Minimal diff: 2 files only — `NavigationExpandButton.tsx` + its test file.
- Do not modify `NavigationLogo.tsx`, `Navigation.tsx`, `appInfo.ts`, or the tooltip attributes.
- Do not commit the unrelated local `vite.config.ts` change.
- Commit message format: `EPMCDME-8460: <description>` (repo convention from git log).

---

### Task 1: State-dependent aria-label on NavigationExpandButton

**Test-first: yes — collapsed-state test `getByRole('button', { name: /show menu/i })` fails against current code (button has no accessible name when collapsed).**

**Files:**
- Modify: `src/components/Navigation/NavigationExpandButton.tsx:31-41` (the `<button>` element)
- Test: `src/components/Navigation/__tests__/NavigationExpandButton.test.tsx` (append to existing `describe`)

**Interfaces:**
- Consumes: `navigationExpanded: boolean` from `useSnapshot(appInfoStore)` — already wired at line 28.
- Produces: `<button aria-label={navigationExpanded ? 'Hide Menu' : 'Show Menu'}>` — nothing downstream consumes it besides AT and tests.

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('NavigationExpandButton', ...)` block, using the existing `mockAppInfoStore` harness:

```tsx
  it('has accessible name "Hide Menu" when expanded', () => {
    mockAppInfoStore.navigationExpanded = true
    render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByRole('button', { name: /hide menu/i })).toBeInTheDocument()
  })

  it('has accessible name "Show Menu" when collapsed', () => {
    mockAppInfoStore.navigationExpanded = false
    render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByRole('button', { name: /show menu/i })).toBeInTheDocument()
  })

  it('does not keep the "Hide Menu" name when collapsed', () => {
    mockAppInfoStore.navigationExpanded = false
    render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.queryByRole('button', { name: /hide menu/i })).not.toBeInTheDocument()
  })

  it('updates accessible name on state change', () => {
    mockAppInfoStore.navigationExpanded = true
    const { rerender } = render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByRole('button', { name: /hide menu/i })).toBeInTheDocument()

    mockAppInfoStore.navigationExpanded = false
    rerender(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByRole('button', { name: /show menu/i })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm run test:unit -- src/components/Navigation/__tests__/NavigationExpandButton.test.tsx`
Expected: the collapsed-state tests (`"Show Menu"` positive, name-transition) FAIL — `getByRole('button', { name: /show menu/i })` finds no match because the button has no accessible name when collapsed. The expanded-state `/hide menu/i` test passes already (visible text provides the name) — that is expected; the RED signal is the collapsed-state assertions.

- [ ] **Step 3: Minimal implementation**

In `src/components/Navigation/NavigationExpandButton.tsx`, add one attribute to the `<button>`:

```tsx
    <button
      type="button"
      aria-label={navigationExpanded ? 'Hide Menu' : 'Show Menu'}
      className={cn(
        'rounded-lg duration-100 mx-2 flex items-center text-text-specific-bottom-navigation-label gap-6 hover:bg-surface-specific-bottom-navigation-label',
        'px-[11px] h-9 select-none text-sm text-nowrap'
      )}
      onClick={onClick}
      data-tooltip-id="react-tooltip"
      data-tooltip-content={!navigationExpanded ? 'Expand Menu' : undefined}
      data-tooltip-place="right"
    >
```

Nothing else changes (icon, text node `{navigationExpanded ? 'Hide Menu' : ''}`, tooltip attrs all stay as-is).

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm run test:unit -- src/components/Navigation/__tests__/NavigationExpandButton.test.tsx`
Expected: all tests PASS (15 existing + 4 new = 19). Existing `getByText('Hide Menu')` tests still pass because `aria-label` does not remove the text node.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navigation/NavigationExpandButton.tsx src/components/Navigation/__tests__/NavigationExpandButton.test.tsx
git commit -m "EPMCDME-8460: Add accessible name to sidebar toggle in collapsed state"
```

---

## Verification (Stage 6 inputs)

- Lint: `npm run lint`
- Build: `npm run build`
- Unit tests: `npm run test:unit -- src/components/Navigation/__tests__/NavigationExpandButton.test.tsx`
