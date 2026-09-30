# EPMCDME-8574: Keyboard-Accessible Tooltip for Help FAQ Items

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the truncated FAQ item descriptions on the Help page readable by keyboard users via a focus-triggered tooltip.

**Architecture:** Replace the three `data-tooltip-*` attributes on the non-focusable `<p>` element in `HelpItem.tsx` with a local PrimeReact `<Tooltip>` instance targeted at the wrapping `<Link>` element, which is already the keyboard focus target. A `useId()`-derived CSS class ensures each card instance gets a unique tooltip selector, matching the pattern used in `Card.tsx` and `AssistantCard.tsx`.

**Tech Stack:** React 18 (`useId`, `useRef`), PrimeReact Tooltip via `@/components/Tooltip` (index export), Vitest + React Testing Library.

## Global Constraints

- Touch only `src/pages/help/components/HelpItem.tsx` and its test file — no other file.
- Do not modify `src/utils/tooltip.ts` or any global tooltip setup.
- All new tests follow the existing `vi.mock` / `vi.mocked` / `describe`-`it`-`expect` pattern in the test file.
- Commit per task using the repository's existing convention (ticket prefix `EPMCDME-8574`).

---

## Acceptance criteria

- A keyboard user tabbing to a truncated FAQ item can read the full description via tooltip on focus (`event="both"`).
- The fix is scoped to `HelpItem.tsx` and its test file only.
- The global react-tooltip instance in `src/utils/tooltip.ts` is not modified.
- New unit tests cover: Tooltip present in DOM, `data-pr-tooltip` set to description when truncated, `data-pr-tooltip` omitted (not empty string) when not truncated.

---

### Task 1: Replace react-tooltip with local PrimeReact Tooltip in HelpItem

**Files:**
- Modify: `src/pages/help/components/HelpItem.tsx:16-75`
- Modify: `src/pages/help/components/__tests__/HelpItem.test.tsx`

**Interfaces:**
- Consumes: `Tooltip` default export from `@/components/Tooltip` — props `target: string`, `event?: 'hover' | 'focus' | 'both'`, `position?: string`, `showDelay?: number`, `closeOnEscape?: boolean`
- Consumes: `useId` from `'react'`

**Test-first: yes — failing tests assert `data-pr-tooltip` on the `<Link>` and presence of the `<Tooltip>` mock**

- [ ] **Step 1: Add Tooltip mock and new failing tests**

Open `src/pages/help/components/__tests__/HelpItem.test.tsx`. After the existing `vi.mock` blocks (around line 40), add:

```ts
vi.mock('@/components/Tooltip/Tooltip', () => ({
  default: ({ target }: { target: string }) => (
    <div data-testid="tooltip" data-target={target} />
  ),
}))
```

Then add the `useIsTruncated` import at the top of the file (after the existing imports):

```ts
import { useIsTruncated } from '@/hooks/useIsTruncated'
```

Append three new tests inside the existing `describe('HelpItem', ...)` block:

```ts
it('renders Tooltip component in the DOM', () => {
  renderWithRouter(<HelpItem {...defaultProps} />)
  expect(screen.getByTestId('tooltip')).toBeInTheDocument()
})

it('sets data-pr-tooltip to description when text is truncated', () => {
  vi.mocked(useIsTruncated).mockReturnValueOnce(true)
  renderWithRouter(<HelpItem {...defaultProps} />)
  const link = screen.getByRole('link')
  expect(link).toHaveAttribute('data-pr-tooltip', defaultProps.description)
})

it('does not set data-pr-tooltip when text is not truncated', () => {
  renderWithRouter(<HelpItem {...defaultProps} />)
  const link = screen.getByRole('link')
  expect(link).not.toHaveAttribute('data-pr-tooltip')
})
```

- [ ] **Step 2: Run new tests to verify they fail**

```
npx vitest run src/pages/help/components/__tests__/HelpItem.test.tsx
```

Expected: the three new tests FAIL (Tooltip not found, `data-pr-tooltip` attribute absent).

- [ ] **Step 3: Implement the fix in HelpItem.tsx**

In `src/pages/help/components/HelpItem.tsx`:

1. Change the import from `'react'` at line 16 to add `useId`:
   ```ts
   import { FC, useId, useRef } from 'react'
   ```

2. Add the Tooltip import after the `Button` import:
   ```ts
   import Tooltip from '@/components/Tooltip/Tooltip'
   ```

3. Inside the component body, after the `isTruncated` line, add:
   ```ts
   const uid = useId()
   const tooltipTargetClass = `help-item-${uid.replace(/:/g, '')}`
   ```

4. On the `<p>` element, remove the three `data-tooltip-*` props entirely. The `<p>` keeps only `ref={descriptionRef}` and `className`.

5. Wrap the return in a fragment. Render `<Tooltip>` as the first sibling, **before** `<Link>` (outside it — this avoids overflow clipping from ancestors without needing `appendTo`):
   ```tsx
   return (
     <>
       <Tooltip
         target={`.${tooltipTargetClass}`}
         event="both"
         position="bottom"
         showDelay={100}
         style={{ maxWidth: '500px' }}
         closeOnEscape
       />
       <Link
         ...
         {...(isTruncated ? { 'data-pr-tooltip': description } : {})}
         className={`... ${tooltipTargetClass}`}
       >
         ...
       </Link>
     </>
   )
   ```

   `event="both"` is what makes the tooltip fire on focus (keyboard) as well as on hover (mouse) — the core of the accessibility fix.

- [ ] **Step 4: Run all tests to verify they pass**

```
npx vitest run src/pages/help/components/__tests__/HelpItem.test.tsx
```

Expected: all 16 tests PASS (13 existing + 3 new). Confirm the `Test Files` line shows 1 file, 16 tests passed.

- [ ] **Step 5: Commit**

```
git add src/pages/help/components/HelpItem.tsx
git add src/pages/help/components/__tests__/HelpItem.test.tsx
git commit -m "EPMCDME-8574: Replace react-tooltip with PrimeReact Tooltip on HelpItem for keyboard accessibility"
```

---

## Negative-constraint pass

| Constraint | Honoring task | Verdict |
|---|---|---|
| Do not modify `src/utils/tooltip.ts` | Task 1 touches only `HelpItem.tsx` and its test | Pass — no task opens `tooltip.ts` |
| Fix scoped to `HelpItem.tsx` and test file only | Single task, two files listed | Pass — no other file in any step |
| No whole-suite quality-gate task | No lint/build/full-test task emitted | Pass |

`negative-constraints: none stated beyond acceptance criteria above — all honored.`
