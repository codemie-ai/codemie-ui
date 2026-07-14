# QA Test Review — EPMCDME-10037

**Status**: PASSED (after fix-up)
**Blocking scenarios covered**: 7/7
**High-severity findings**: 0
**Low-severity findings**: 1 (getByTestId preference — acceptable for mocked components)

---

## Scenario Coverage

| ID | Description | Status |
|---|---|---|
| S1 | Popup renders when visible / hidden | covered |
| S2 | Generate button disabled when text empty | covered |
| S3 | generateWorkflow called with correct args on submit | covered |
| S4 | onGenerated + onHide called on success | covered |
| S5 | toaster.error shown on failure, popup stays open | covered |
| S6 | State resets on close | covered |
| S7 (HIGH-RISK) | generateWorkflow store method posts to v1/workflows/generate with correct body | covered (fix-up: `src/store/__tests__/workflows.generateWorkflow.test.ts`) |

---

## Findings

### F1 — HIGH — S7 not covered (missing store-level test)

**Scenario**: S7 — `generateWorkflow` store method should call `api.post('v1/workflows/generate', { text, include_tools })` and return parsed JSON.

**Found**: No test in changed files verifies the store method's API call. Component tests mock the store method — they confirm the component calls it but do not test what the method does internally.

**Fix**: Add `src/store/__tests__/generateWorkflow.test.ts` (or extend an existing workflow store test) that mocks `@/utils/api` and asserts `api.post` is called with the correct path and body.

---

### F2 — LOW — getByTestId preference

**File**: `GenerateWorkflowPopup.test.tsx`

**Found**: `getByTestId('nl-textarea')`, `getByTestId('include-tools-switch')`, `getByTestId('generate-popup')` — anti-pattern per qa-strategy.md.

**Context**: Popup is a mock with `data-testid` — no real accessible role. Switch and Textarea are also mocks. `getByRole` would require real component rendering.

**Verdict**: Acceptable given full mocking strategy. Low severity — no action required.
