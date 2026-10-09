# Fix Download Tooltip Overlap/Stuck-Open in CodeBlock Expand Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Download button's tooltip from overlapping (and getting stuck open over) the Expand popup's close icon, without touching shared tooltip/Popup infrastructure.

**Architecture:** Add an `isInExpandPopup` prop to `CodeBlock` that flips the Download button's `data-tooltip-place` from `top` to `bottom` when `CodeBlock` is rendered inside `CodeBlockExpandPopup`. Pair it with restoring real top padding on the popup body (replacing `!pt-0`) so the gap between the dialog header and `CodeBlock`'s header is no longer near-zero. Both changes are additive and scoped to the two named files; no shared tooltip/Popup code changes.

**Tech Stack:** React 18, TypeScript, Tailwind, Vitest + React Testing Library.

**Spec:** Requirements supplied inline by the caller (ticket EPMCDME-10659 follow-up QA fix) — see Acceptance criteria below; no separate spec file.

## Global Constraints

- Do not touch `src/utils/tooltip.ts` (`clickable: true` stays as-is — intentional, tested, EPMCDME-8421).
- Do not edit `src/utils/tooltipCloseBehavior.ts`.
- Do not edit `src/components/Popup/Popup.tsx` — no z-index/header-stacking changes there.
- Changes land only in `src/components/CodeBlock/CodeBlock.tsx` and `src/components/CodeBlock/CodeBlockExpandPopup.tsx` (plus their tests).
- Do not touch any workflow edit-page files (Issue 2 / legacy AceEditor config component is explicitly out of scope).
- Commit per task using the repository's existing convention.

## Review Focus

- Inline (non-popup) `CodeBlock` usage must keep `data-tooltip-place="top"` on Download — the new prop must default to `false`/undefined so every existing non-popup caller is unaffected.
- The inner `CodeBlock` rendered by `CodeBlockExpandPopup` (not the outer one that owns the Expand button) is the one that must receive the new prop — easy to wire to the wrong instance since there are two `CodeBlock` renders in the file tree.
- Softening `!pt-0` must not reintroduce the original (pre-EPMCDME-10659) problem the padding override was presumably added for — use a small positive padding (e.g. `!pt-2`), not a full revert to the base `pt-4`, unless nothing else in the popup depends on zero padding.
- The Copy and Expand buttons' tooltips are unaffected — only Download's placement changes.
- `expandable` must remain false/unset on the inner `CodeBlock` (no nested Expand button) — confirm the fix doesn't change that existing behavior.

---

## Acceptance criteria

- [ ] Download button's tooltip no longer renders with `data-tooltip-place="top"` when `CodeBlock` is rendered inside `CodeBlockExpandPopup`; it uses a placement (e.g. `bottom`) that does not overlap the popup's close icon.
- [ ] Download button's tooltip placement is unchanged (`top`) for every other existing `CodeBlock` usage (inline/non-popup).
- [ ] `CodeBlockExpandPopup`'s body no longer collapses the gap between the dialog header and `CodeBlock`'s header to near-zero (`!pt-0` is replaced or softened).
- [ ] A unit/RTL test asserts the new prop/placement wiring on `CodeBlock`.
- [ ] A unit/RTL test (or assertion within the same test file) asserts `CodeBlockExpandPopup` passes the new prop to its inner `CodeBlock` and/or renders non-zero top padding.
- [ ] No changes made to `src/utils/tooltip.ts`, `src/utils/tooltipCloseBehavior.ts`, `src/components/Popup/Popup.tsx`, or any workflow edit-page file.

---

### Task 1: Add `isInExpandPopup` prop to `CodeBlock` and conditionally change Download's tooltip placement

**Files:**
- Modify: `src/components/CodeBlock/CodeBlock.tsx:35-49` (add prop to `CodeBlockProps` interface), `:51-65` (destructure it), `:160-169` (use it for `data-tooltip-place`)
- Test: `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx` (new `describe` block)

**Interfaces:**
- Produces: `CodeBlockProps.isInExpandPopup?: boolean` — when `true`, Download's tooltip anchor gets `data-tooltip-place="bottom"` instead of `"top"`. Default/omitted behaves exactly as today (`"top"`).

Test-first: yes — write a failing RTL test asserting the Download button's `data-tooltip-place` attribute before implementing the prop.

- [ ] **Step 1: Write the failing test**

Add to `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx`:

```tsx
describe('CodeBlock Download tooltip placement', () => {
  afterEach(cleanup)

  it('defaults the Download tooltip to top placement', () => {
    const { getByText } = render(<CodeBlock text="const x = 1;" language="js" />)
    const downloadBtn = getByText('Download').closest('button')
    expect(downloadBtn).toHaveAttribute('data-tooltip-place', 'top')
  })

  it('places the Download tooltip at bottom when isInExpandPopup is true', () => {
    const { getByText } = render(
      <CodeBlock text="const x = 1;" language="js" isInExpandPopup />
    )
    const downloadBtn = getByText('Download').closest('button')
    expect(downloadBtn).toHaveAttribute('data-tooltip-place', 'bottom')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx`
Expected: FAIL on the second case — `isInExpandPopup` prop does not exist / attribute is still `top`.

- [ ] **Step 3: Implement the prop**

In `CodeBlock.tsx`, add `isInExpandPopup?: boolean` to the `CodeBlockProps` interface (line ~48), destructure it in the component (default omitted = falsy), and change line 164 from the hardcoded `data-tooltip-place="top"` to:

```tsx
data-tooltip-place={isInExpandPopup ? 'bottom' : 'top'}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx`
Expected: PASS, both cases.

- [ ] **Step 5: Commit**

```bash
git add src/components/CodeBlock/CodeBlock.tsx src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx
git commit -m "<repo convention>: give CodeBlock an isInExpandPopup flag for Download tooltip placement"
```

---

### Task 2: Wire `isInExpandPopup` through `CodeBlockExpandPopup` and restore header spacing

**Files:**
- Modify: `src/components/CodeBlock/CodeBlockExpandPopup.tsx:48` (replace `!pt-0`), `:50-55` (pass new prop to inner `CodeBlock`)
- Test: new `src/components/CodeBlock/__tests__/CodeBlockExpandPopup.test.tsx`

**Interfaces:**
- Consumes: `CodeBlockProps.isInExpandPopup` from Task 1.
- Produces: inner `CodeBlock` instance always rendered with `isInExpandPopup` set, and `Popup`'s `bodyClassName` no longer `!pt-0`.

Test-first: yes — write a failing RTL test asserting the inner `CodeBlock`'s Download tooltip placement and the popup body's padding class before implementing.

- [ ] **Step 1: Write the failing test**

Create `src/components/CodeBlock/__tests__/CodeBlockExpandPopup.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import CodeBlockExpandPopup from '../CodeBlockExpandPopup'

describe('CodeBlockExpandPopup', () => {
  it('passes isInExpandPopup to the inner CodeBlock so Download tooltip avoids the close icon', () => {
    const { getByText } = render(
      <CodeBlockExpandPopup isVisible onHide={() => {}} text="const x = 1;" language="js" />
    )
    const downloadBtn = getByText('Download').closest('button')
    expect(downloadBtn).toHaveAttribute('data-tooltip-place', 'bottom')
  })

  it('does not collapse the body top padding to zero', () => {
    const { container } = render(
      <CodeBlockExpandPopup isVisible onHide={() => {}} text="const x = 1;" language="js" />
    )
    const bodyEl = container.querySelector('[class*="pt-"]')
    expect(bodyEl?.className).not.toMatch(/!pt-0\b/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/CodeBlock/__tests__/CodeBlockExpandPopup.test.tsx`
Expected: FAIL — inner `CodeBlock` still gets `top`, body still has `!pt-0`.

- [ ] **Step 3: Implement**

In `CodeBlockExpandPopup.tsx`:
- Change line 48 from `bodyClassName="!pt-0"` to `bodyClassName="!pt-2"`.
- Add `isInExpandPopup` to the inner `<CodeBlock>` call (lines 50-55):

```tsx
<CodeBlock
  language={language}
  text={text}
  title={title}
  downloadFilename={downloadFilename}
  isInExpandPopup
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/CodeBlock/__tests__/CodeBlockExpandPopup.test.tsx`
Expected: PASS, both cases.

Manual verification (not automatable in jsdom): open a workflow YAML CodeBlock, click Expand, hover the Download button — confirm the tooltip renders below Download (not overlapping the popup's close icon), and that moving the pointer from Download toward the close icon reliably hides the tooltip on mouseleave rather than staying stuck open.

- [ ] **Step 5: Commit**

```bash
git add src/components/CodeBlock/CodeBlockExpandPopup.tsx src/components/CodeBlock/__tests__/CodeBlockExpandPopup.test.tsx
git commit -m "<repo convention>: restore popup header spacing and route Download tooltip away from close icon"
```

---

## Negative-constraint pass

- "Do NOT touch src/utils/tooltip.ts's clickable:true" — honored: no task touches this file.
- "Do NOT edit src/utils/tooltipCloseBehavior.ts" — honored: no task touches this file.
- "Do NOT edit src/components/Popup/Popup.tsx ... no z-index or header-stacking changes there" — honored: Task 2 only changes the `bodyClassName` value passed *into* `Popup` from `CodeBlockExpandPopup`, never `Popup.tsx` itself.
- "Fix must be scoped to CodeBlock.tsx and CodeBlockExpandPopup.tsx only" — honored: Tasks 1-2 touch only those two files plus their own new/updated tests.
- "Explicitly out of scope: ... do not touch any workflow edit-page files" — honored: no task references AceEditor, `WorkflowYamlHeaderActions`, or any workflow edit-page path.
- "inline (non-popup) usage ... would need to not regress" (from analysis, implicit non-goal) — honored: Task 1's first test pins the default (`isInExpandPopup` unset) to `top`, unchanged from today.
