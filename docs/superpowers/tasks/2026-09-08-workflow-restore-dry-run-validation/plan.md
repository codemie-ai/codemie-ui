# Workflow Restore Dry-Run Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Acceptance criteria

- [ ] Restoring from version history POSTs to `v1/workflows/{id}/validate?error_format=json` with the restored YAML merged into current form fields
- [ ] A 400 response surfaces issues in the issues panel (same visual result as a Save 400)
- [ ] A 200 response leaves the issues panel empty; no "updated" toast, no navigation
- [ ] The restore info toast fires before validation and appears even when validation returns 400
- [ ] `workflowsStore.updateWorkflow` is never called from the restore path
- [ ] Read-only users see no Restore button; no validate call is triggered

**Goal:** After restoring a workflow version from history, POST-validate the restored YAML and surface backend errors in the issues panel without persisting.

**Architecture:** Add `validateWorkflow` to `workflowsStore` (POST to `/validate`, same error-format contract as `updateWorkflow`). Extract the inline error-routing block in `submit` into a page-local closure helper. Add `validateRestoredWorkflow` that calls the store method and routes errors through the helper. Make `handleRestoreFromHistory` async, awaiting validation after the existing synchronous UI steps.

**Tech Stack:** Valtio (`src/store/workflows.ts`) · React (`EditWorkflowPage.tsx`) · Vitest + React Testing Library

## Global Constraints

- Use `helpers/backendErrorHandler.ts` (`processBackendError`); never the sibling `workflowEditor/backendErrorHandler.ts`
- Never call `workflowsStore.updateWorkflow` from the restore path
- Validation logic lives in `EditWorkflowPage`, not `WorkflowVersionHistoryPopup`
- `error_format=json` is unconditional for the validate endpoint
- Commit per task using the repository's existing convention

---

### Task 1: Add `validateWorkflow` to `workflowsStore`

**Files:**
- Modify: `src/store/workflows.ts` — interface (~line 88, after `updateWorkflow`), proxy (~line 330, after `updateWorkflow` closing brace)

**Test-first: no** — verbatim port of the `updateWorkflow` pattern; no new branching logic

- [ ] In `WorkflowsStore` interface, add after the `updateWorkflow` line:

```typescript
validateWorkflow: (id: string | number, values: any, errorFormat?: ErrorFormat) => Promise<Response>
```

- [ ] In the proxy object, add after `updateWorkflow`'s closing brace:

```typescript
async validateWorkflow(id: string | number, values: any, errorFormat?: ErrorFormat) {
  let url = `v1/workflows/${id}/validate`
  if (errorFormat) url += `?error_format=${errorFormat}`
  const options = errorFormat === ERROR_FORMAT_JSON ? { skipErrorHandling: true } : {}
  return api.post(url, values, options)
},
```

---

### Task 2: Page-level helper, dry-run validation, and async restore

**Files:**
- Modify: `src/pages/workflows/__tests__/EditWorkflowPage.versionHistory.test.tsx`
- Modify: `src/pages/workflows/EditWorkflowPage.tsx:83–120` (submit catch), `176–181` (handleRestoreFromHistory)

**Test-first: yes** — four new cases, all failing before the page changes:
1. `calls validateWorkflow after restore` — fails: `handleRestoreFromHistory` is sync and never calls the store method
2. `opens issues panel when validateWorkflow returns 400` — fails: no `openIssuesPanel` call on the restore path
3. `does not open issues panel or PUT on 200 validate` — locks in the no-PUT constraint
4. `shows restore toast even on 400` — regression guard that toast fires before the `await`

- [ ] **Step 1: Update test file — mocks and new cases**

In `src/pages/workflows/__tests__/EditWorkflowPage.versionHistory.test.tsx`:

a) Add `waitFor` to the `@testing-library/react` import.

b) Extend `vi.hoisted` to export `mockOpenIssuesPanel`:
```typescript
const { mockReplaceYamlConfig, mockOpenIssuesPanel } = vi.hoisted(() => ({
  mockReplaceYamlConfig: vi.fn(),
  mockOpenIssuesPanel: vi.fn(),
}))
```

c) Add `openIssuesPanel: mockOpenIssuesPanel` to the `useImperativeHandle` return in the `WorkflowForm` mock (alongside the existing entries).

d) In `beforeEach`, add:
```typescript
mockOpenIssuesPanel.mockClear()
workflowsStore.validateWorkflow = vi.fn().mockResolvedValue(undefined) as any
workflowsStore.updateWorkflow = vi.fn() as any
```

e) Add inside `describe('EditWorkflowPage version history restore', ...)`:
```typescript
it('calls validateWorkflow after restore', async () => {
  const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
  render(<EditWorkflowPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Open History' }))
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
  await waitFor(() =>
    expect(workflowsStore.validateWorkflow).toHaveBeenCalledWith(
      'wf-edit-1',
      expect.objectContaining({ yaml_config: 'states: []\n# v1' }),
      'json'
    )
  )
})

it('opens issues panel when validateWorkflow returns 400', async () => {
  ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>).mockRejectedValue({
    parsedError: {
      message: 'Validation failed',
      details: { error_type: 'resource_validation', message: '', errors: [{ state_id: 's1', message: 'bad', config_line: 1 }] },
    },
  })
  const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
  render(<EditWorkflowPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Open History' }))
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
  await waitFor(() => expect(mockOpenIssuesPanel).toHaveBeenCalled())
  expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled()
})

it('does not open issues panel or PUT on 200 validate', async () => {
  const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
  render(<EditWorkflowPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Open History' }))
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
  await waitFor(() => expect(workflowsStore.validateWorkflow).toHaveBeenCalled())
  expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
  expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled()
})

it('shows restore toast even when validateWorkflow returns 400', async () => {
  ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>).mockRejectedValue({
    parsedError: { message: 'fail', details: { error_type: 'resource_validation', message: '', errors: [] } },
  })
  const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
  render(<EditWorkflowPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Open History' }))
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
  await waitFor(() => expect(mockOpenIssuesPanel).toHaveBeenCalled())
  expect(toaster.info).toHaveBeenCalledWith('Workflow YAML has been restored successfully!')
})
```

- [ ] **Step 2: Run tests — verify the four new cases fail, the two originals pass**

Run: `npx vitest run src/pages/workflows/__tests__/EditWorkflowPage.versionHistory.test.tsx`
Expected: 4 new tests FAIL, 2 original tests PASS.

- [ ] **Step 3: Extract `applyWorkflowBackendValidationError` in `EditWorkflowPage.tsx`**

Update the `processBackendError` import at line 38 to also import `WorkflowValidationError`:
```typescript
import { processBackendError, WorkflowValidationError } from '@/utils/workflowEditor/helpers/backendErrorHandler'
```

Add the following closure immediately before `submit` (~line 83):
```typescript
const applyWorkflowBackendValidationError = (parsedError: WorkflowValidationError) => {
  setIssues(null)
  formRef.current?.clearAllResolvedFields()
  const { issues: backendIssues, generalError } = processBackendError(parsedError)
  if (backendIssues) {
    setIssues(backendIssues)
    formRef.current?.openIssuesPanel()
  } else if (generalError) {
    toaster.error(generalError)
  }
}
```

Replace the `submit` catch body (lines 105–119) with:
```typescript
} catch (error: any) {
  if (errorFormat !== ERROR_FORMAT_JSON) {
    API.handleError({ error: error.parsedError })
    return
  }
  applyWorkflowBackendValidationError(error.parsedError)
}
```

- [ ] **Step 4: Add `validateRestoredWorkflow` and make `handleRestoreFromHistory` async**

Add before `handleRestoreFromHistory` (line 176):
```typescript
const validateRestoredWorkflow = async (yamlConfig: string) => {
  try {
    await workflowsStore.validateWorkflow(
      id,
      { ...formRef.current?.getFormValues(), yaml_config: yamlConfig },
      ERROR_FORMAT_JSON
    )
  } catch (error: any) {
    if (error?.parsedError) {
      applyWorkflowBackendValidationError(error.parsedError)
    } else {
      toaster.error('Failed to validate the restored workflow')
    }
  }
}
```

Replace `handleRestoreFromHistory` (lines 176–181):
```typescript
const handleRestoreFromHistory = async (yamlConfig: string) => {
  formRef.current?.replaceYamlConfig(yamlConfig)
  setPreRefinementYaml(null)
  setShowVersionHistory(false)
  toaster.info('Workflow YAML has been restored successfully!')
  await validateRestoredWorkflow(yamlConfig)
}
```

- [ ] **Step 5: Run tests — verify all six pass**

Run: `npx vitest run src/pages/workflows/__tests__/EditWorkflowPage.versionHistory.test.tsx`
Expected: all 6 tests PASS.

---

<!-- negative-constraints verified:
  1. "Do NOT call updateWorkflow from Restore" — handleRestoreFromHistory never calls updateWorkflow; Task 2 test asserts this. ✓
  2. "Do NOT re-check assistant existence" — no task adds such a check. ✓
  3. "Do NOT invent a second issues mapper" — applyWorkflowBackendValidationError delegates entirely to processBackendError from helpers/. ✓
  4. "Do NOT change Restore to a server rollback" — only a POST to /validate; no PUT/rollback call. ✓
  5. "Validate at EditWorkflowPage, not WorkflowVersionHistoryPopup" — all new logic is in EditWorkflowPage.tsx. ✓
  6. "Read-only users: Restore stays hidden (canWrite); no validate call" — handleRestoreFromHistory is reachable only via WorkflowVersionHistoryPopup.onRestore, which renders only when canWrite. No task changes visibility gating. ✓
  7. "Use helpers/ backendErrorHandler, not legacy one" — import targets helpers/backendErrorHandler.ts. ✓
-->
