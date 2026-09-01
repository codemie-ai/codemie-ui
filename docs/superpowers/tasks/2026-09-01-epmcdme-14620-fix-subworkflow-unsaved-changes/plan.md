# EPMCDME-14620: Fix Sub-Workflow Unsaved Changes Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the "Unsaved Changes" popup appearing immediately after a Sub-Workflow node is dropped onto the workflow canvas.

**Architecture:** The bug is a one-character fix in `SubWorkflowTab.tsx` — changing `??` to `||` in the react-hook-form `defaultValues` initialization so that an empty `workflow_id` (`''`) produces `null` in the form, matching the `null` that `WorkflowSelector` emits via its onChange handler on mount. The regression test updates the existing `WorkflowSelector` mock to simulate that mount-time onChange call, making the test reproduce the exact bug condition.

**Tech Stack:** React 18, react-hook-form, Vitest, React Testing Library

---

### Task 1: Add regression test (RED)

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx`

- [ ] **Step 1: Add `act` and `useEffect` to the imports**

In `SubWorkflowTab.test.tsx`:

Add `act` to the existing `@testing-library/react` import (line 16):

```ts
// Before
import { render, screen, waitFor } from '@testing-library/react'
```

```ts
// After
import { act, render, screen, waitFor } from '@testing-library/react'
```

Add `useEffect` to the existing `react` import (line 17):

```ts
// Before
import { createRef, forwardRef, useImperativeHandle } from 'react'
```

```ts
// After
import { createRef, forwardRef, useEffect, useImperativeHandle } from 'react'
```

- [ ] **Step 2: Update the WorkflowSelector mock to simulate onChange on mount**

Replace the existing WorkflowSelector mock (lines 60–64):

```ts
// Before
vi.mock('@/pages/workflows/components/WorkflowSelector', () => ({
  default: forwardRef(({ singleValue }: any, _ref: any) => (
    <div data-testid="workflow-selector" data-single-value={String(singleValue)} />
  )),
}))
```

```ts
// After
vi.mock('@/pages/workflows/components/WorkflowSelector', () => ({
  default: forwardRef(({ singleValue, value = [], onChange }: any, _ref: any) => {
    useEffect(() => {
      // Simulate the project-prop useEffect in WorkflowSelector that fires on initial mount,
      // calling resetValue() → onChange(initialValue).
      onChange(value)
    }, [])
    return <div data-testid="workflow-selector" data-single-value={String(singleValue)} />
  }),
}))
```

- [ ] **Step 3: Add the regression test case**

Inside the `describe('SubWorkflowTab', ...)` block, after the last existing test (line 151), add:

```ts
it('isDirty() returns false on initial mount when workflow_id is empty (regression EPMCDME-14620)', async () => {
  const ref = createRef<SubWorkflowTabRef>()
  const emptyConfig: WorkflowConfiguration = {
    states: [
      {
        id: 'state-1',
        workflow_id: '',
      } as any,
    ],
  }
  render(<SubWorkflowTab {...defaultProps} config={emptyConfig} ref={ref} />)
  await act(async () => {})
  expect(ref.current!.isDirty()).toBe(false)
})
```

- [ ] **Step 4: Run the new test to confirm it FAILS (RED)**

```bash
npm run test:unit -- --reporter=verbose SubWorkflowTab
```

Expected output contains:

```
FAIL  src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx
  × isDirty() returns false on initial mount when workflow_id is empty (regression EPMCDME-14620)
```

If the test passes at this point, the bug is not reproducing in the test environment — stop and investigate why the mock onChange call is not causing a dirty state before proceeding.

---

### Task 2: Fix defaultValues in SubWorkflowTab (GREEN)

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx:83`

- [ ] **Step 1: Apply the one-line fix**

In `SubWorkflowTab.tsx`, change line 83:

```ts
// Before
        workflow_id: state?.workflow_id ?? null,
```

```ts
// After
        workflow_id: state?.workflow_id || null,
```

Full context (lines 79–85) after the change:

```ts
    } = useForm<SubWorkflowFormValues>({
      resolver: yupResolver(subWorkflowFormSchema as any),
      mode: 'onChange',
      defaultValues: {
        workflow_id: state?.workflow_id || null,
      },
    })
```

`'' || null` evaluates to `null`, matching the `null` the WorkflowSelector onChange handler produces for an empty selection. For any non-empty `workflow_id` (e.g. `'some-uuid'`), the result is identical to `??`.

- [ ] **Step 2: Run the full test suite for this file to confirm GREEN**

```bash
npm run test:unit -- --reporter=verbose SubWorkflowTab
```

Expected output contains:

```
✓ renders the workflow selector with singleValue=true
✓ save() calls onConfigChange with the correct state shape
✓ isDirty() returns false when form and common fields are clean
✓ passes getSelectableWorkflows from workflowsStore to WorkflowSelector
✓ isDirty() returns false on initial mount when workflow_id is empty (regression EPMCDME-14620)

Test Files  1 passed (1)
Tests       5 passed (5)
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/workflows/editor/configPanels/SubWorkflowTab.tsx \
        src/pages/workflows/editor/configPanels/__tests__/SubWorkflowTab.test.tsx
git commit -m "EPMCDME-14620: Fix Sub-workflow node triggering unsaved changes popup on drop"
```
