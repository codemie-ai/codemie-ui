# EPMCDME-8502: Fix Semantic Headings on Assistant Details Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change non-semantic `<p>` section-heading elements to `<h3>` so screen readers and accessibility tooling can programmatically detect them as headings.

**Architecture:** Two independent tag-only swaps — one in the shared `DetailsSidebarSection` primitive (fixes all detail page types simultaneously), one in the standalone `SystemInstructions` component. No logic, no style, and no API changes. Tailwind Preflight zeroes browser heading defaults, so preserving existing class names guarantees zero visual regression.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest + React Testing Library

## Global Constraints

- Preserve ALL existing Tailwind class names on every changed element — visual output must be identical before and after.
- Use `<h3>` — the established convention for `text-xs font-semibold` section labels already in use in `MCPServerDetails` and `SidebarNavigation`.
- Test-first: yes — Task 1 has a failing test to update; Task 2 uses the same updated test.
- Commit message format: `EPMCDME-8502: Capital sentence` (CI-enforced).

---

### Task 1: Fix DetailsSidebarSection shared primitive + update test

**Files:**
- Modify: `src/components/details/DetailsSidebar/components/DetailsSidebarSection.tsx:33`
- Modify: `src/components/details/DetailsSidebar/components/__tests__/DetailsSidebarSection.test.tsx:35`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `DetailsSidebarSection` renders `headline` prop as `<h3>` — fixes OVERVIEW, ACCESS LINKS, CATEGORIES, CONFIGURATION, SKILLS, TOOLS & CAPABILITIES, REQUEST HEDGING across all detail page types

Test-first: yes — update the existing `tagName === 'P'` assertion to a role-based heading query before touching the implementation.

- [ ] **Step 1: Update the test to the expected (currently failing) assertion**

  Open `src/components/details/DetailsSidebar/components/__tests__/DetailsSidebarSection.test.tsx`.

  Replace the entire first `it` block (lines 26–37):

  ```tsx
  it('renders the headline as a semantic heading', () => {
    render(
      <DetailsSidebarSection headline={defaultHeadline}>
        <ChildComponent />
      </DetailsSidebarSection>
    )

    const headlineElement = screen.getByRole('heading', { level: 3, name: defaultHeadline })
    expect(headlineElement).toBeInTheDocument()
    expect(headlineElement).toHaveClass('text-xs', 'font-semibold')
  })
  ```

- [ ] **Step 2: Run the test to confirm RED**

  ```bash
  npx vitest run src/components/details/DetailsSidebar/components/__tests__/DetailsSidebarSection.test.tsx
  ```

  Expected: FAIL — `Unable to find an accessible element with the role "heading"` (the element is still a `<p>`).

- [ ] **Step 3: Fix DetailsSidebarSection — swap `<p>` to `<h3>`**

  Open `src/components/details/DetailsSidebar/components/DetailsSidebarSection.tsx`.

  Line 33 — change:
  ```tsx
  <p className="text-xs text-text-primary font-semibold">{headline}</p>
  ```
  to:
  ```tsx
  <h3 className="text-xs text-text-primary font-semibold">{headline}</h3>
  ```

  Full updated component for reference:
  ```tsx
  const DetailsSidebarSection = ({
    headline,
    children,
    itemsWrapperClassName,
  }: DetailsSidebarSectionProps) => {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-xs text-text-primary font-semibold">{headline}</h3>
        <div className={cn('flex flex-col gap-4', itemsWrapperClassName)}>{children}</div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run the test to confirm GREEN**

  ```bash
  npx vitest run src/components/details/DetailsSidebar/components/__tests__/DetailsSidebarSection.test.tsx
  ```

  Expected: PASS — both `it` blocks pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/details/DetailsSidebar/components/DetailsSidebarSection.tsx
  git add src/components/details/DetailsSidebar/components/__tests__/DetailsSidebarSection.test.tsx
  git commit -m "EPMCDME-8502: Fix semantic heading in DetailsSidebarSection shared primitive"
  ```

---

### Task 2: Fix SystemInstructions standalone component

**Files:**
- Modify: `src/pages/assistants/components/AssistantDetails/components/SystemInstructions.tsx:28`

**Interfaces:**
- Consumes: nothing from Task 1
- Produces: "System Instructions" label rendered as `<h3>` — fixes the one heading on the assistant details page not covered by Task 1

Test-first: yes — no existing test file; write a minimal test asserting the heading role before touching the implementation.

- [ ] **Step 1: Create a test file and write the failing test**

  Create `src/pages/assistants/components/AssistantDetails/components/__tests__/SystemInstructions.test.tsx`:

  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'

  import SystemInstructions from '../SystemInstructions'

  describe('SystemInstructions', () => {
    it('renders "System Instructions" as a semantic heading', () => {
      render(<SystemInstructions text="Do not discuss competitors." />)

      const heading = screen.getByRole('heading', { level: 3, name: 'System Instructions' })
      expect(heading).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run the test to confirm RED**

  ```bash
  npx vitest run src/pages/assistants/components/AssistantDetails/components/__tests__/SystemInstructions.test.tsx
  ```

  Expected: FAIL — `Unable to find an accessible element with the role "heading"` (the label is still a `<p>`).

- [ ] **Step 3: Fix SystemInstructions — swap `<p>` to `<h3>`**

  Open `src/pages/assistants/components/AssistantDetails/components/SystemInstructions.tsx`.

  Line 28 — change:
  ```tsx
  <p className="text-xs">System Instructions</p>
  ```
  to:
  ```tsx
  <h3 className="text-xs">System Instructions</h3>
  ```

  Full updated inner `div` for reference:
  ```tsx
  <div className="flex justify-between items-center px-4 py-2 bg-white/5">
    <h3 className="text-xs">System Instructions</h3>
    <Button
      variant="secondary"
      onClick={() => copyToClipboard(text, 'Instructions copied to clipboard')}
    >
      <CopySvg />
      Copy
    </Button>
  </div>
  ```

- [ ] **Step 4: Run the test to confirm GREEN**

  ```bash
  npx vitest run src/pages/assistants/components/AssistantDetails/components/__tests__/SystemInstructions.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass. (Note: `AssistantDetailsPage.integration.test.tsx` line 1194 has a pre-existing mismatch — `level: 4` for an `<h5>` element in `DetailsSection.tsx` — that is unrelated to this ticket and may already be failing or skipped.)

- [ ] **Step 6: Commit**

  ```bash
  git add src/pages/assistants/components/AssistantDetails/components/SystemInstructions.tsx
  git add src/pages/assistants/components/AssistantDetails/components/__tests__/SystemInstructions.test.tsx
  git commit -m "EPMCDME-8502: Fix semantic heading in SystemInstructions component"
  ```
