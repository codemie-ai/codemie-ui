# Workflow Executions Bare-Path Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opening `/workflows/:workflowId/workflow-executions` (no execution id) renders `WorkflowDetailsPage` instead of 404ing, by making `:executionId` optional on the existing `WOKRFLOW_EXECUTIONS` route.

**Architecture:** Make the single `WOKRFLOW_EXECUTIONS` route entry in `src/router.tsx` match both `workflows/:workflowId/workflow-executions` and `workflows/:workflowId/workflow-executions/:executionId` by adding a trailing `?` to the `:executionId` segment (react-router 7's optional-segment syntax). No second route entry, no new route id, no change to `goBackWorkflows.ts` (it branches on route id only, already confirmed).

**Tech Stack:** React Router 7 (data router, `createMemoryRouter` in tests), Vitest + React Testing Library (`unit` and `integration` workspace projects).

**Spec:** Ticket EPMCDME-14318 (requirements supplied inline — see Acceptance criteria below; no spec.md for this task).

## Global Constraints

- Reuse the existing `WOKRFLOW_EXECUTIONS` route id — do not introduce a third route id.
- Do not rename the `WOKRFLOW_EXECUTIONS` constant (pre-existing typo, out of scope).
- Do not fix the unrelated hardcoded `'workflow-execution'` string in `WorkflowExecutionsListItem.tsx`.
- Do not modify `goBackWorkflows.ts` — it branches only on route id, not path shape, so it already handles the bare path correctly.
- Do not add a whole-suite quality-gate, manual/browser-verification, or commit task — the calling flow runs those separately.

---

## Acceptance criteria

- [ ] Opening `/workflows/:workflowId/workflow-executions` for an existing workflow no longer returns 404.
- [ ] The bare route renders the workflow executions list via `WorkflowDetailsPage` (same component the `:executionId`-included route and `VIEW_WORKFLOW` already use).
- [ ] Existing routes that include `:executionId` continue to open the corresponding workflow execution details page.
- [ ] Invalid or inaccessible workflow IDs are handled the same as today (no regression) — unaffected by this change since `WorkflowDetailsPage`'s workflow-fetch/error handling is untouched.
- [ ] Browser navigation, refresh, and direct URL opening work for the new bare path (guaranteed by it being a real router path match, not a client-side redirect).
- [ ] A route-level regression test covers the bare executions-list path (new; none exists today).
- [ ] No link-generation helper needs updating — confirmed none exists that assumes `executionId` is always present (`WorkflowExecutionsListItem.tsx`'s existing `router.replace` call already always supplies `executionId` and is unaffected).

negative-constraints: reuse existing `WOKRFLOW_EXECUTIONS` id (do not introduce a third id); do not touch `goBackWorkflows.ts`; do not rename the typo'd constant; do not fix the unrelated hardcoded string in `WorkflowExecutionsListItem.tsx`. Task 1 satisfies the id-reuse constraint by editing only the `path` string, not the `id`, on the existing route entry. No task touches `goBackWorkflows.ts`, the constant name, or `WorkflowExecutionsListItem.tsx`.

---

### Task 1: Make `:executionId` optional on the `WOKRFLOW_EXECUTIONS` route

**Files:**
- Modify: `src/router.tsx:417-421`
- Test: `src/__tests__/router.test.tsx` (new)

**Interfaces:**
- Consumes: `WOKRFLOW_EXECUTIONS`, `VIEW_WORKFLOW` from `src/constants/routes.ts` (unchanged); `routes` exported from `src/router.tsx` (unchanged export, only the one route object's `path` string changes).
- Produces: `routes` array where the `WOKRFLOW_EXECUTIONS` entry matches both `workflows/:workflowId/workflow-executions` and `workflows/:workflowId/workflow-executions/:executionId` — later tasks' integration test relies on this.

Test-first: yes — failing test asserts `matchRoutes` resolves the bare path to the `WOKRFLOW_EXECUTIONS` route id with no `executionId` param.

- [ ] **Step 1: Write the failing route-matching test**

```tsx
import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { routes } from '@/router'
import { WOKRFLOW_EXECUTIONS } from '@/constants/routes'

describe('workflowRoutes - WOKRFLOW_EXECUTIONS optional executionId', () => {
  it('matches the bare executions-list path with no executionId param', () => {
    const matches = matchRoutes(routes, '/workflows/wf-123/workflow-executions')

    expect(matches?.at(-1)?.route.id).toBe(WOKRFLOW_EXECUTIONS)
    expect(matches?.at(-1)?.params.workflowId).toBe('wf-123')
    expect(matches?.at(-1)?.params.executionId).toBeUndefined()
  })

  it('still matches the path with an executionId param', () => {
    const matches = matchRoutes(routes, '/workflows/wf-123/workflow-executions/exec-1')

    expect(matches?.at(-1)?.route.id).toBe(WOKRFLOW_EXECUTIONS)
    expect(matches?.at(-1)?.params.workflowId).toBe('wf-123')
    expect(matches?.at(-1)?.params.executionId).toBe('exec-1')
  })
})
```

- [ ] **Step 2: Run test to verify the first case fails**

Run: `npx vitest run src/__tests__/router.test.tsx --project unit`
Expected: FAIL on the first `it` — `matchRoutes` returns `null` (no route matches the bare path today), so `matches?.at(-1)` is `undefined`.

- [ ] **Step 3: Make `:executionId` optional**

In `src/router.tsx:417-421`, change the `path` on the existing `WOKRFLOW_EXECUTIONS` entry (id and `Component` unchanged):

```tsx
{
  id: WOKRFLOW_EXECUTIONS,
  path: 'workflows/:workflowId/workflow-executions/:executionId?',
  Component: WorkflowDetailsPage,
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/router.test.tsx --project unit`
Expected: PASS, both cases.

- [ ] **Step 5: Commit**

Commit per task using the repository's existing convention.

---

### Task 2: Regression-cover the bare route rendering `WorkflowDetailsPage`

**Files:**
- Modify: `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration`; `mockRouterState` from `@/hooks/__mocks__/useVueRouter`; the `mockBaseAPIs`/`createWorkflowFixture`/`createExecutionsResponse` helpers already defined in this file (unchanged signatures).
- Produces: nothing consumed by later tasks — this is the terminal regression test for the feature.

Test-first: yes — failing test opens `/workflows/wf-123/workflow-executions` (via `renderPage`, the real route table) and asserts the executions list renders instead of a 404/blank result; it fails before Task 1's route change ships wired into the same test run, and is written here to prove the end-to-end behavior on top of Task 1's route-matching fix.

- [ ] **Step 1: Write the failing integration test**

Add inside the existing `describe('Execution Sidebar', ...)` block (reuses `createWorkflowFixture`/`createExecutionsResponse` already defined above in the file):

```tsx
it('renders the executions list at the bare path with no executionId', async () => {
  ;(mockRouterState as any).params = { workflowId: 'wf-123' }
  mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
  mockAPI(
    'GET',
    'v1/workflows/wf-123/executions',
    createExecutionsResponse([createExecutionFixture()])
  )

  renderPage('/workflows/wf-123/workflow-executions')

  await waitFor(() => {
    expect(screen.getAllByText('My Workflow').length).toBeGreaterThan(0)
    expect(screen.getByText('Workflow Execution History')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx --project integration`
Expected: FAIL before Task 1's router change is present (route 404s, `WorkflowDetailsPage` never mounts, `My Workflow` text never appears). If run after Task 1 is already committed, confirm intent by temporarily reverting the `router.tsx` path change locally to see the failure, then restore it — do not commit a revert.

- [ ] **Step 3: Confirm it passes with Task 1's route change in place**

Run: `npx vitest run src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx --project integration`
Expected: PASS — all tests in the file, including the pre-existing `:executionId`-included ones, still pass (covers acceptance criterion 3: no regression to the executionId path).

- [ ] **Step 4: Commit**

Commit per task using the repository's existing convention.
