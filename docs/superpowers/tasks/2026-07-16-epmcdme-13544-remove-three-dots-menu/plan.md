# EPMCDME-13544: Remove Three-Dots Menu from Workflow Template Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the three-dots kebab menu from workflow template cards by adding an `!isTemplate` guard in `WorkflowCard.tsx`, and add a regression test that will fail if the guard is ever removed.

**Architecture:** The bug is a missing conditional in `WorkflowCard.tsx`: the `navigationSlot ?? <WorkflowActions />` block at lines 280-293 renders unconditionally regardless of `isTemplate`. The fix is a single `{!isTemplate && (...)}` wrapper, following the identical pattern already in use at lines 244-278 of the same file. The regression test lives in the existing integration test suite that renders the real card stack.

**Tech Stack:** React, TypeScript, Vitest (integration project), @testing-library/react

---

### Task 1: Write the failing regression test

**Test-first: yes — `does not render the three-dots menu on workflow template cards` fails because the menu IS rendered before the fix**

**Files:**
- Modify: `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx`

- [ ] **Step 1: Add the new test inside the existing `describe` block**

Open `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx`.

Add the following test at the end of the `describe('WorkflowTemplates - Pagination', ...)` block, immediately before the closing `})`:

```ts
it('does not render the three-dots menu on workflow template cards', async () => {
  mockAPI('GET', 'v1/workflows/prebuilt', [createTemplateFixture()])

  renderPage('/workflows/templates')

  await waitFor(() => {
    expect(screen.getByText('Workflow Template')).toBeInTheDocument()
  })

  expect(screen.queryByRole('button', { name: /more options/i })).not.toBeInTheDocument()
})
```

Note: `createTemplateFixture` is defined in this file's `describe` block (not imported). `mockAPI`, `renderPage`, `screen`, and `waitFor` are already imported at the top of the file.

- [ ] **Step 2: Run the new test to verify it FAILS**

```bash
npm run test:integration -- --reporter=verbose "WorkflowTemplatesPagination"
```

Expected: the new test FAILS with output similar to:

```
✗ does not render the three-dots menu on workflow template cards
  AssertionError: expected element to not be in the document
```

This confirms the bug is real and the test is detecting it correctly. If the test passes at this point, re-check that `WorkflowTemplates.tsx` is actually passing `isTemplate` to `WorkflowCard` and that no other mock is suppressing `WorkflowActions`.

---

### Task 2: Add the `!isTemplate` guard to `WorkflowCard`

**Test-first: yes — Task 1's test is the failing test this task makes GREEN**

**Files:**
- Modify: `src/pages/workflows/components/WorkflowCard.tsx:280-293`

- [ ] **Step 1: Wrap the navigationSlot block with `!isTemplate`**

In `src/pages/workflows/components/WorkflowCard.tsx`, locate lines 280-293 (the `navigationSlot ?? <WorkflowActions />` block). Replace:

```tsx
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              {navigationSlot ?? (
                <WorkflowActions
                  workflow={workflow}
                  onView={() =>
                    router.push({
                      name: VIEW_WORKFLOW,
                      params: { workflowId: String(workflow.id) },
                    })
                  }
                  reloadWorkflows={reloadWorkflows}
                />
              )}
            </div>
```

with:

```tsx
            {!isTemplate && (
              <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {navigationSlot ?? (
                  <WorkflowActions
                    workflow={workflow}
                    onView={() =>
                      router.push({
                        name: VIEW_WORKFLOW,
                        params: { workflowId: String(workflow.id) },
                      })
                    }
                    reloadWorkflows={reloadWorkflows}
                  />
                )}
              </div>
            )}
```

- [ ] **Step 2: Run the integration test suite to verify GREEN**

```bash
npm run test:integration -- --reporter=verbose "WorkflowTemplatesPagination"
```

Expected: all tests PASS including the new one:

```
✓ does not render the three-dots menu on workflow template cards
```

- [ ] **Step 3: Run the full test suite to check for regressions**

```bash
npm run test
```

Expected: all tests pass. The `WorkflowCard` unit tests and `WorkflowsList` integration tests (if any) must remain green — the `!isTemplate` guard defaults to `false`, so regular workflow cards are unaffected.

---

### Task 3: Commit

- [ ] **Step 1: Stage the two changed files**

```bash
git add src/pages/workflows/components/WorkflowCard.tsx \
        src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "EPMCDME-13544: Remove three-dots menu from workflow template cards"
```
