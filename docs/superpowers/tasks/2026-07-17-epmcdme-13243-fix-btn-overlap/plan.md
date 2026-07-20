# EPMCDME-13243 Fix Button Overlap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the `TableBlock` copy button by default and reveal it on hover or keyboard focus, eliminating its overlap with table heading labels.

**Architecture:** Add Tailwind's `group` class to the `TableBlock` wrapper div and `opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity` to the button container div. No state, no new components, no test changes — pure CSS following the pattern established in `PinnedRow`, `Card`, and `WorkflowCard`.

**Tech Stack:** React, Tailwind CSS 3, Vitest, @testing-library/react

---

### Task 1: Apply group-hover visibility to TableBlock copy button

**Test-first:** no — the CSS opacity change does not alter DOM structure, accessible label, or click behaviour; jsdom does not evaluate Tailwind classes at runtime, so the existing three tests already verify all testable behaviour after the change.

**Files:**
- Modify: `src/components/markdown/tokens/TableBlock.tsx:29-31`

- [ ] **Step 1: Run existing tests to confirm green baseline**

```bash
npx vitest run src/components/markdown/tokens/__tests__/TableBlock.test.tsx
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 2: Apply the two-line Tailwind change**

Open `src/components/markdown/tokens/TableBlock.tsx`. The component currently reads:

```tsx
const TableBlock: FC<TableBlockProps> = ({ html, raw }) => (
  <div className="relative my-1">
    <div dangerouslySetInnerHTML={{ __html: html }} />
    <div className="absolute top-0 right-0 z-10 flex items-center h-9">
```

Change it to:

```tsx
const TableBlock: FC<TableBlockProps> = ({ html, raw }) => (
  <div className="relative my-1 group">
    <div dangerouslySetInnerHTML={{ __html: html }} />
    <div className="absolute top-0 right-0 z-10 flex items-center h-9 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
```

The rest of the file is unchanged.

- [ ] **Step 3: Run tests again to confirm still green**

```bash
npx vitest run src/components/markdown/tokens/__tests__/TableBlock.test.tsx
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 4: Commit**

```bash
git add src/components/markdown/tokens/TableBlock.tsx
git commit -m "EPMCDME-13243: Hide copy button by default, show on hover/focus"
```
