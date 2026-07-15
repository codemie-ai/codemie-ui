# EPMCDME-8521: Workflows Templates Semantic List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `div`-based grid container and items in the Workflows Templates page with semantic `ul`/`li` HTML elements to meet accessibility requirements.

**Architecture:** The `WorkflowTemplates` component renders a CSS grid of `WorkflowCard` items. The grid container `div` becomes a `ul` (preserving all Tailwind grid classes) and each `WorkflowCard` is wrapped in an `li`. The `WorkflowCard` component itself is not changed — the semantic wrapper is added at the point of iteration in `WorkflowTemplates`. This limits the change to one file and avoids any unintended effect on other pages that use `WorkflowCard`.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, @testing-library/react

## Global Constraints

- Branch: `EPMCDME-8521_semantic-list-fix`
- Commit format: `EPMCDME-8521: Capital sentence` (enforced by Tekton CI)
- No `--no-verify` on commits — pre-commit hooks must pass
- License header required on every new source file (existing files already have it)
- Do not modify `WorkflowCard.tsx` — the fix is scoped to `WorkflowTemplates.tsx` only

---

### Task 1: Add semantic-list accessibility test and fix WorkflowTemplates markup

**Files:**
- Modify: `src/pages/workflows/components/WorkflowTemplates.tsx:151-160`
- Modify: `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx`

**Interfaces:**
- Consumes: existing `WorkflowCard` component (unchanged)
- Produces: `ul` container with `li` wrappers around each `WorkflowCard`

- [ ] **Step 1: Write the failing test**

  Open `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx` and add this test at the end of the `describe` block (before the closing `}`):

  ```tsx
  it('renders workflow template items as a semantic list', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(3))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByText('Workflow Template 1')).toBeInTheDocument()
    })

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('UL')

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    items.forEach((item) => expect(item.tagName).toBe('LI'))
  })
  ```

- [ ] **Step 2: Run the test to verify it fails (RED)**

  ```bash
  npm run test:integration -- --reporter=verbose src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx
  ```

  Expected: FAIL — `Unable to find an accessible element with the role "list"`.

- [ ] **Step 3: Fix WorkflowTemplates.tsx**

  In `src/pages/workflows/components/WorkflowTemplates.tsx`, replace the grid container block:

  **Before:**
  ```tsx
          <div className="grid grid-cols-1 gap-2.5 justify-items-center min-[1140px]:grid-cols-2 min-[1540px]:grid-cols-3 mt-4">
            {workflowTemplates.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                isTemplate
                workflow={workflow}
                onViewWorkflowTemplate={viewWorkflowTemplate}
                onCreateFromWorkflowTemplate={navigateToCreateWFFromTemplate}
              />
            ))}
          </div>
  ```

  **After:**
  ```tsx
          <ul className="grid grid-cols-1 gap-2.5 justify-items-center min-[1140px]:grid-cols-2 min-[1540px]:grid-cols-3 mt-4 list-none p-0 m-0">
            {workflowTemplates.map((workflow) => (
              <li key={workflow.id} className="w-full">
                <WorkflowCard
                  isTemplate
                  workflow={workflow}
                  onViewWorkflowTemplate={viewWorkflowTemplate}
                  onCreateFromWorkflowTemplate={navigateToCreateWFFromTemplate}
                />
              </li>
            ))}
          </ul>
  ```

- [ ] **Step 4: Run the test to verify it passes (GREEN)**

  ```bash
  npm run test:integration -- --reporter=verbose src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx
  ```

  Expected: All tests PASS.

- [ ] **Step 5: Run full quality gates**

  ```bash
  npm run lint
  npm run typecheck
  npm run test:unit
  npm run test:integration
  ```

  All must exit 0.

- [ ] **Step 6: Commit**

  ```bash
  git add src/pages/workflows/components/WorkflowTemplates.tsx \
          src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx \
          docs/superpowers/tasks/2026-07-10-epmcdme-8521-workflows-templates-semantic-list/
  git commit -m "EPMCDME-8521: Use semantic ul/li list for workflow templates grid"
  ```
