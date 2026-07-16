# EPMCDME-13308: Fix Workflow Edit Back/Cancel (Direct Link) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a missing empty-history guard in `goBackFromWorkflowEdit` so Back and Cancel on the workflow edit page navigate to the workflow list when the page is opened via a direct URL.

**Architecture:** One 3-line guard condition inserted in `goBackFromWorkflowEdit` in the navigation utility. A new unit test file covers the empty-history (direct link) scenario and the existing in-app navigation scenario to prevent regression.

**Tech Stack:** TypeScript, React, Valtio (history proxy), React Router v7, Vitest, `@testing-library/react`

---

## File Map

| File | Action |
|---|---|
| `src/pages/workflows/utils/goBackWorkflows.ts` | **Modify** — add `!safeRoute` guard (lines 73–83) |
| `src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts` | **Create** — 2 unit test cases |

---

### Task 1: Add the `!safeRoute` guard to `goBackFromWorkflowEdit`

**Files:**
- Modify: `src/pages/workflows/utils/goBackWorkflows.ts:73-83`

- [ ] **Step 1: Write the failing test first**

Create `src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts` with just the test for the direct-link scenario (it will fail because the guard doesn't exist yet):

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, it, expect, beforeEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { goBackFromWorkflowEdit } from '@/pages/workflows/utils/goBackWorkflows'

describe('goBackFromWorkflowEdit', () => {
  beforeEach(() => {
    mockRouterState.push.mockClear()
    history.stack = []
    history.currentIndex = -1
  })

  it('navigates to the workflow list when history is empty (direct link)', () => {
    goBackFromWorkflowEdit({ workflowId: 'test-wf-id' })

    expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'workflows-all' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails (RED)**

```bash
npx vitest run --project unit src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts
```

Expected: FAIL — the assertion fails because without the guard, `router.push` is called with `{ name: 'workflow-execution' }` (broken fallback), not `{ name: 'workflows-all' }`.

- [ ] **Step 3: Add the guard in `goBackFromWorkflowEdit`**

Open `src/pages/workflows/utils/goBackWorkflows.ts`. The current `goBackFromWorkflowEdit` function (lines 73–83) looks like this:

```typescript
export const goBackFromWorkflowEdit = ({ workflowId }: { workflowId: string }) => {
  const safeRoute = findFirstNonWorkflowRoute(workflowId)

  if (safeRoute?.name === NEW_WORKFLOW) {
    // Came from create→execute flow: skip the execution page to avoid a back-loop
    goBackWorkflows()
    return
  }

  goBackWorkflows({ name: WOKRFLOW_EXECUTIONS, params: { id: workflowId } })
}
```

Replace with:

```typescript
export const goBackFromWorkflowEdit = ({ workflowId }: { workflowId: string }) => {
  const safeRoute = findFirstNonWorkflowRoute(workflowId)

  if (safeRoute?.name === NEW_WORKFLOW) {
    // Came from create→execute flow: skip the execution page to avoid a back-loop
    goBackWorkflows()
    return
  }

  if (!safeRoute) {
    // No session history (page opened via direct link) — fall back to workflow list
    goBackWorkflows()
    return
  }

  goBackWorkflows({ name: WOKRFLOW_EXECUTIONS, params: { id: workflowId } })
}
```

- [ ] **Step 4: Run the failing test to verify it passes (GREEN)**

```bash
npx vitest run --project unit src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts
```

Expected: PASS — `router.push` is now called with `{ name: 'workflows-all' }`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows/utils/goBackWorkflows.ts \
        src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts
git commit -m "EPMCDME-13308: Fix Back and Cancel navigation on direct-link workflow edit page"
```

---

### Task 2: Add the regression test for in-app navigation

**Files:**
- Modify: `src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts`

- [ ] **Step 1: Write the failing regression test**

Add a second test case to the existing test file. Open `src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts` and add inside the `describe` block, after the first `it`:

```typescript
  it('navigates via history when previous non-workflow route exists (in-app navigation)', () => {
    history.stack = [
      { name: 'workflows-all', params: {}, query: {} },
      { name: 'edit-workflow', params: { id: 'test-wf-id' }, query: {} },
    ]
    history.currentIndex = 1

    goBackFromWorkflowEdit({ workflowId: 'test-wf-id' })

    // navigateBack finds 'workflows-all' in the history stack and pushes to it.
    // The !safeRoute guard must NOT fire (safeRoute is 'workflows-all', not null).
    expect(mockRouterState.push).toHaveBeenCalledWith({
      name: 'workflows-all',
      params: {},
      query: {},
    })
  })
```

- [ ] **Step 2: Run the test to verify it passes immediately (GREEN)**

This test should pass without any code change because the existing in-app navigation path is already correct:

```bash
npx vitest run --project unit src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts
```

Expected: PASS for both tests. If the second test fails, investigate whether `history.stack` or `currentIndex` state leaked from the first test — the `beforeEach` resets both to empty.

- [ ] **Step 3: Run the full workflow test suite for regression**

```bash
npx vitest run --project unit src/pages/workflows
```

Expected: all existing workflow tests pass; no new failures.

- [ ] **Step 4: Commit**

```bash
git add src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts
git commit -m "EPMCDME-13308: Add regression test for in-app navigation path"
```

---

## Final verification

- [ ] Run the full unit and integration test suites:

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] Verify test-first line summary for both tasks:

| Task | Test-first | Failing test description |
|---|---|---|
| Task 1 | yes | `goBackFromWorkflowEdit` called with empty history; asserts `router.push({ name: 'workflows-all' })` |
| Task 2 | yes (trivially) | in-app nav scenario passes immediately; confirms the new guard does not fire when `safeRoute` is non-null |
