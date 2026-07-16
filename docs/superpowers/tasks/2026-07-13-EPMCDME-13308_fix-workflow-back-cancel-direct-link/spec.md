# Spec: Fix Back and Cancel on Workflow Edit Page (Direct Link)

**Ticket**: EPMCDME-13308  
**Branch**: EPMCDME-13308_fix-workflow-back-cancel-direct-link  
**Complexity**: XS (6/36)

---

## Problem

When the workflow edit page is opened via a direct URL (e.g. `/workflows/<id>/edit`), clicking Back or Cancel does nothing. The Valtio session history stack is empty on a fresh page load, so `goBackFromWorkflowEdit` falls through to a `navigateBack` call that exhausts all fallback strategies and silently produces a broken navigation.

Both the Back arrow (`onBack` prop on `PageLayout`) and the Cancel button call `goBackFromWorkflowEdit({ workflowId: id })`, so both are broken by the same root cause.

---

## Root Cause

`goBackFromWorkflowEdit` in `src/pages/workflows/utils/goBackWorkflows.ts` has no guard for an empty session history. When the page loads via direct link:

1. `history.stack` is empty (or contains only the current page); `history.currentIndex` is `-1` or `0`.
2. `findFirstNonWorkflowRoute(workflowId)` iterates from `currentIndex - 1` downward — zero iterations — and returns `null`.
3. The `null` branch falls through to `goBackWorkflows({ name: WOKRFLOW_EXECUTIONS, params: { id: workflowId } })`.
4. `navigateBack` scans the empty history stack (no match), tries URL-path ancestor matching (fails: the route uses `:id` but the execution route expects `:workflowId`), and falls back to `router.push({ name: 'workflow-execution' })` with no params — producing a broken URL or a silent no-op.

---

## Solution

Add a `!safeRoute` early-exit guard in `goBackFromWorkflowEdit`, between the `NEW_WORKFLOW` check and the final `goBackWorkflows(...)` call:

```typescript
// src/pages/workflows/utils/goBackWorkflows.ts

export const goBackFromWorkflowEdit = ({ workflowId }: { workflowId: string }) => {
  const safeRoute = findFirstNonWorkflowRoute(workflowId)

  if (safeRoute?.name === NEW_WORKFLOW) {
    goBackWorkflows()
    return
  }

  if (!safeRoute) {
    goBackWorkflows()   // no history (direct link) → fall back to workflow list
    return
  }

  goBackWorkflows({ name: WOKRFLOW_EXECUTIONS, params: { id: workflowId } })
}
```

`goBackWorkflows()` called without arguments defaults to `WORKFLOWS_ALL`, which is the correct destination when there is no prior session history.

### Why this location

The routing guide (`src/.ai-run/guides/architecture/routing-patterns.md`) requires feature-scoped `goBack*` utilities for create/edit pages. Fixing the utility protects all callsites; fixing the component would leave the utility broken for any future callsite and duplicate the guard across the two call locations in `EditWorkflowPage.tsx`.

### Reference implementations

- `goBackFromWorkflowExecutions` (same file, line 121–123): `if (!safeRoute) { route.push({ name: WORKFLOWS_ALL }); return }`  
- `NewWorkflowPage.onBack` (line 141–145): `if (history.stack.length > 1) { goBackWorkflows() } else { router.push({ name: WORKFLOWS_ALL }) }`

This fix is a local consistency alignment — no novel pattern is introduced.

---

## Constraints

- Do **not** rename `WOKRFLOW_EXECUTIONS` (intentional typo, used throughout the codebase).
- No changes to `EditWorkflowPage.tsx`, `useHistoryStack.tsx`, `router.tsx`, or any shared utilities.
- No new imports required in `goBackWorkflows.ts`.

---

## Acceptance Criteria

1. When the workflow edit page is opened from a direct link, clicking Back navigates to the workflow list (`/workflows/all` or `/workflows/my`).
2. When the workflow edit page is opened from a direct link, clicking Cancel navigates to the workflow list.
3. When the page is opened through in-app navigation (non-empty history stack), Back and Cancel continue to navigate to the previous valid route.
4. No regression on workflow save, "Save and Run", or any other navigation flow.

---

## Testing

New test file: `src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts`

| Test | Setup | Expected assertion |
|---|---|---|
| direct link — Back/Cancel navigate to list | `history.stack = []`, `history.currentIndex = -1` | `mockRouterState.push` called with `{ name: 'workflows-all' }` |
| in-app nav — existing logic unchanged | `history.stack = [validPriorRoute, editRoute]`, `history.currentIndex = 1` | navigation proceeds via `goBackWorkflows` (no `WORKFLOWS_ALL` push) |

Use the global `useVueRouter` mock (`src/hooks/__mocks__/useVueRouter`) and set `history` directly before each test case.

---

## File Change Surface

| File | Change |
|---|---|
| `src/pages/workflows/utils/goBackWorkflows.ts` | Add 3-line `!safeRoute` guard |
| `src/pages/workflows/utils/__tests__/goBackWorkflows.test.ts` | New — 2 integration test cases |
