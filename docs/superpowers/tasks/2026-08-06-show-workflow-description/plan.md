# Show Workflow Description in Configuration Panel — Implementation Plan

> **Revision:** UX requirement changed. Description moved from under page title to the configuration right panel.

**Goal:** Display `workflow.description` inside the `WorkflowExecutionConfigDetails` card (configuration right panel), below the name/ID section.

**Architecture:** Remove the `description` prop from `PageLayout` (was added only for this ticket). Render description text directly in `WorkflowExecutionConfigDetails` below the avatar/name/ID section, guarded by `workflow.description`. All tests updated accordingly.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + @testing-library/react

## Global Constraints

- License header (Apache 2.0, EPAM 2026) must appear at the top of every file created or modified.
- Commit messages must follow the pattern `EPMCDME-8251: Capital sentence` — no lowercase first word, no period at end.

---

### Task 1: Move description from PageLayout to WorkflowExecutionConfigDetails

**Files:**
- Modify: `src/pages/workflows/details/configuration/WorkflowExecutionConfigDetails.tsx`
- Modify: `src/pages/workflows/WorkflowDetailsPage.tsx` (remove description prop from PageLayout call)
- Modify: `src/components/Layouts/Layout/PageLayout.tsx` (remove description prop — it was only added for this ticket)
- Modify: `src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfigDetails.test.tsx`
- Modify: `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx`

**Test-first: yes — failing test: WorkflowExecutionConfigDetails renders description when workflow has description**

- [x] **Step 1: Update WorkflowExecutionConfigDetails.test.tsx (RED)**

Replace the "does not render a description element" test with:
- "renders description when workflow has a description" (expects `data-testid="workflow-description"`)
- "does not render description when workflow has no description"

Run tests → both new tests FAIL (description not yet in component).

- [x] **Step 2: Update WorkflowDetailsPage.integration.test.tsx**

In the "Workflow Description" describe block, update both tests to use `getByTestId('workflow-description')` / `queryByTestId('workflow-description')` instead of `page-description`.

Run tests → both tests FAIL (description in wrong place).

- [x] **Step 3: Add description to WorkflowExecutionConfigDetails.tsx (GREEN)**

After the name/ID section, render description with `line-clamp-4` truncation and a Show more/less toggle. Overflow is detected via `useLayoutEffect` comparing `scrollHeight > clientHeight` on the description element.

```tsx
{workflow.description && (
  <div className="flex flex-col gap-1">
    <p
      ref={descRef}
      className={cn('text-sm text-text-quaternary break-words whitespace-pre-wrap', !isExpanded && 'line-clamp-4')}
      data-testid="workflow-description"
    >
      {workflow.description}
    </p>
    {(isOverflowing || isExpanded) && (
      <button type="button" ... data-testid="description-toggle" onClick={...}>
        {isExpanded ? 'Show less' : 'Show more'}
      </button>
    )}
  </div>
)}
```

- [x] **Step 4: Remove description from WorkflowDetailsPage.tsx**

Remove `description={workflow?.description?.trim() || undefined}` from the `<PageLayout>` call.

- [x] **Step 5: Remove description prop from PageLayout.tsx**

Remove `description?: ReactNode` from `LayoutProps`, remove from destructuring, remove the render block.

- [x] **Step 6: Run all tests GREEN**

```bash
npx vitest run src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfigDetails.test.tsx src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx --reporter=verbose 2>&1 | tail -20
```

- [x] **Step 7: Commit (move to panel)**

```
EPMCDME-8251: Move workflow description to configuration right panel
```

### Task 2: Truncate long description with Show more/less toggle

**Files:**
- Modify: `src/pages/workflows/details/configuration/WorkflowExecutionConfigDetails.tsx`
- Modify: `src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfigDetails.test.tsx`

**Test-first: yes — 3 new unit tests for overflow detection and toggle behavior**

- [x] Tests added (overflow spy pattern via `vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get')`)
- [x] Implementation: `useLayoutEffect` + `isOverflowing` state + `isExpanded` toggle + `line-clamp-4`
- [x] Commit: `EPMCDME-8251: Truncate long workflow description with Show more/less toggle`
