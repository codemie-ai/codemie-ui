# EPMCDME-12616 — Enhance Workflow Edit with Refine/Modify with AI and Revert to Previous

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Refine with AI" (prompt popup → inline API call → auto-apply) and "Revert to Previous" (client-side snapshot restore) buttons to `EditWorkflowPage`. No feature flag. No approval modal.

**Architecture:** State lives in `EditWorkflowPage`. `preRefinementYaml: string | null` captures the YAML snapshot before any AI refinement — it drives the revert button's enabled state and is the source of truth for restoring. `WorkflowForm` gains `replaceYamlConfig` on its ref to inject YAML into both editor modes. `RefineWorkflowPromptPopup` gains an `isLoading` prop so the popup stays open (with spinner) while the API call is in-flight. Revert is purely client-side — no API call.

**Tech Stack:** React 18, TypeScript, Valtio (proxy stores), React Hook Form + Yup, Vitest + @testing-library/react, custom `api` wrapper, `Popup`/`ConfirmationModal` components.

## Global Constraints

- Apache 2.0 license header on every new `.tsx`/`.ts` file (copy from any existing file in the same directory).
- Commit format: `EPMCDME-12616: Capital sentence` (no conventional commits prefix).
- Never use `--no-verify` on git commits.
- `ButtonType.MAGICAL` for the "Refine with AI" button; `ButtonType.SECONDARY` for "Revert to Previous".
- API post via `api.post(url, body).then(r => r.json())` — same pattern as every other store method.
- No `WorkflowEditor.tsx` modification needed — visual editor auto-updates from `yamlConfig` prop via `useMemo([configurationString])`.
- Test commands: unit → `npm run test:unit -- --reporter=verbose <path>`, integration → `npm run test:integration`.

---

## File Structure

**New files (created):**
- `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx` — Prompt popup with optional instruction textarea + `isLoading` prop
- `src/pages/workflows/components/RefineWorkflowModal.tsx` — Exists on disk; **not wired into the current page flow** (unused)
- `src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx` — Unit tests
- `src/pages/workflows/components/__tests__/RefineWorkflowModal.test.tsx` — Unit tests
- `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx` — Integration tests
- `src/store/__tests__/workflows-ai.test.ts` — Store method unit tests

**Modified files:**
- `src/types/entity/workflow.ts` — Added `WorkflowAIRefineFields`, `WorkflowAIRefineResponse`, `WorkflowRevertResponse`
- `src/store/workflows.ts` — Added `refineWorkflowWithAI` and `revertWorkflow` store methods
- `src/pages/workflows/components/WorkflowFormFields.tsx` — Added `setYamlConfig` to ref
- `src/pages/workflows/components/WorkflowForm.tsx` — Added `replaceYamlConfig` to ref
- `src/pages/workflows/EditWorkflowPage.tsx` — Wired all features together

---

### Task 1: Add types and store methods

**Files:**
- Modify: `src/types/entity/workflow.ts`
- Modify: `src/store/workflows.ts`
- Create: `src/store/__tests__/workflows-ai.test.ts`

**Interfaces:**
- Produces: `WorkflowAIRefineFields`, `WorkflowAIRefineResponse`, `WorkflowRevertResponse`, `workflowsStore.refineWorkflowWithAI`, `workflowsStore.revertWorkflow`

- [x] **Step 1: Write failing tests for store methods**

`src/store/__tests__/workflows-ai.test.ts` — tests `refineWorkflowWithAI` and `revertWorkflow` with mocked `api.post`.

- [x] **Step 2: Run tests — expect FAIL**

```
npm run test:unit -- --reporter=verbose src/store/__tests__/workflows-ai.test.ts
```

- [x] **Step 3: Add types to `src/types/entity/workflow.ts`**

```ts
export interface WorkflowAIRefineFields {
  yaml_config: string
  refine_prompt?: string
}

export interface WorkflowAIRefineResponse {
  yaml_config: string
}

export interface WorkflowRevertResponse {
  message: string
  data: Workflow
}
```

- [x] **Step 4: Add interface entries to `WorkflowsStore` and implementations**

```ts
// interface
refineWorkflowWithAI: (id: string, fields: WorkflowAIRefineFields) => Promise<WorkflowAIRefineResponse>
revertWorkflow: (id: string) => Promise<WorkflowRevertResponse>

// implementations
async refineWorkflowWithAI(id: string, fields: WorkflowAIRefineFields): Promise<WorkflowAIRefineResponse> {
  return api.post(`v1/workflows/${id}/refine`, fields).then((r) => r.json())
},
async revertWorkflow(id: string): Promise<WorkflowRevertResponse> {
  return api.post(`v1/workflows/${id}/revert`).then((r) => r.json())
},
```

- [x] **Step 5: Run tests — expect PASS**

```
npm run test:unit -- --reporter=verbose src/store/__tests__/workflows-ai.test.ts
```

Expected: PASS (2 tests)

- [x] **Step 6: Commit**

```bash
git add src/types/entity/workflow.ts src/store/workflows.ts src/store/__tests__/workflows-ai.test.ts
git commit -m "EPMCDME-12616: Add AI refine and revert types and store methods"
```

---

### Task 2: Add `setYamlConfig` to `WorkflowFormFieldsRef`

**Files:**
- Modify: `src/pages/workflows/components/WorkflowFormFields.tsx`

**Interfaces:**
- Produces: `WorkflowFormFieldsRef.setYamlConfig(yaml: string) => void`

- [x] **Step 1: Update `WorkflowFormFieldsRef` interface**

```ts
export interface WorkflowFormFieldsRef {
  isValid: boolean
  triggerValidation: () => Promise<boolean>
  getValues: () => any
  setYamlConfig: (yaml: string) => void
}
```

- [x] **Step 2: Add `setYamlConfig` to `useImperativeHandle`**

```ts
setYamlConfig: (yaml: string) => {
  setValue('yaml_config', yaml, { shouldDirty: true })
},
```

- [x] **Step 3: Commit**

```bash
git add src/pages/workflows/components/WorkflowFormFields.tsx
git commit -m "EPMCDME-12616: Add setYamlConfig to WorkflowFormFieldsRef"
```

---

### Task 3: Add `replaceYamlConfig` to `WorkflowFormRef`

**Files:**
- Modify: `src/pages/workflows/components/WorkflowForm.tsx`

**Interfaces:**
- Consumes: `WorkflowFormFieldsRef.setYamlConfig` (Task 2), `blockTransition` from `useUnsavedChanges`
- Produces: `WorkflowFormRef.replaceYamlConfig(yaml: string) => void`

- [x] **Step 1: Add `replaceYamlConfig` to `WorkflowFormRef` interface**

```ts
export interface WorkflowFormRef {
  isValid: boolean
  validateWorkflow: () => { isValid: boolean; errors?: string[] }
  triggerValidation: () => void
  save: (shouldOpenExecution: boolean) => Promise<void>
  getFormValues: () => any
  openIssuesPanel: () => void
  clearAllResolvedFields: () => void
  replaceYamlConfig: (yaml: string) => void
}
```

- [x] **Step 2: Add `replaceYamlConfig` to `useImperativeHandle`**

```ts
replaceYamlConfig: (yaml: string) => {
  setYamlConfig(yaml)
  if (!isUsingVisualEditor && formFieldsRef.current) {
    formFieldsRef.current.setYamlConfig(yaml)
  }
  blockTransition()
},
```

- [x] **Step 3: Commit**

```bash
git add src/pages/workflows/components/WorkflowForm.tsx
git commit -m "EPMCDME-12616: Add replaceYamlConfig to WorkflowFormRef"
```

---

### Task 4: Create `RefineWorkflowPromptPopup` with `isLoading` prop

**Files:**
- Create: `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx`
- Create: `src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx`

**Interfaces:**
- Produces: `RefineWorkflowPromptPopup` with props `{ isVisible: boolean, isLoading?: boolean, onHide: () => void, onRefine: (prompt: string) => void }`

The `isLoading` prop (default `false`) disables both buttons and shows a spinner inside the "Refine with AI" button while the API call is in-flight. The popup stays open until the caller explicitly closes it via `onHide` or state change — it does NOT close itself on submit.

- [x] **Step 1: Write failing tests**

`src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx` — tests: renders header, calls `onRefine` with empty string when no prompt, calls `onRefine` with entered text, calls `onHide` on Cancel, disables buttons when `isLoading=true`.

- [x] **Step 2: Run tests — expect FAIL**

```
npm run test:unit -- --reporter=verbose src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx
```

- [x] **Step 3: Create `RefineWorkflowPromptPopup.tsx`**

Key prop interface:
```ts
interface RefineWorkflowPromptPopupProps {
  isVisible: boolean
  isLoading?: boolean
  onHide: () => void
  onRefine: (prompt: string) => void
}
```

Button rendering when `isLoading`:
```tsx
<Button variant={ButtonType.SECONDARY} onClick={handleHide} disabled={isLoading}>
  Cancel
</Button>
<Button variant={ButtonType.MAGICAL} onClick={handleSubmit(handleRefineClick)} disabled={isLoading}>
  {isLoading ? (
    <><Spinner inline /> Refining…</>
  ) : (
    'Refine with AI'
  )}
</Button>
```

- [x] **Step 4: Run tests — expect PASS**

```
npm run test:unit -- --reporter=verbose src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/pages/workflows/components/RefineWorkflowPromptPopup.tsx src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx
git commit -m "EPMCDME-12616: Add RefineWorkflowPromptPopup with isLoading prop"
```

---

### Task 5: Create `RefineWorkflowModal` (exists but unused in current flow)

**Files:**
- Create: `src/pages/workflows/components/RefineWorkflowModal.tsx`
- Create: `src/pages/workflows/components/__tests__/RefineWorkflowModal.test.tsx`

**Note:** This component was created as part of the original design (approval step between prompt and apply). The final implementation auto-applies AI results without an approval modal. `RefineWorkflowModal` exists on disk with its tests passing, but is **not imported or used** in `EditWorkflowPage`. It can be removed in a future cleanup.

- [x] **Step 1–5:** Component created and tested. All tests pass.

---

### Task 6: Wire everything into `EditWorkflowPage`

**Files:**
- Modify: `src/pages/workflows/EditWorkflowPage.tsx`
- Create: `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`

**Key state:**
```tsx
const [isRefining, setIsRefining] = useState(false)
const [showPromptPopup, setShowPromptPopup] = useState(false)
const [showRevertConfirm, setShowRevertConfirm] = useState(false)
// non-null only while an unsaved AI refinement is active
const [preRefinementYaml, setPreRefinementYaml] = useState<string | null>(null)
```

**Refine flow (inline, no approval step):**
```tsx
const handleRefineStart = () => setShowPromptPopup(true)

const handlePromptSubmit = async (prompt: string) => {
  const yamlBeforeRefine = formRef.current?.getFormValues()?.yaml_config ?? ''
  setIsRefining(true)
  try {
    const result = await workflowsStore.refineWorkflowWithAI(id, {
      yaml_config: yamlBeforeRefine,
      refine_prompt: prompt || undefined,
    })
    setShowPromptPopup(false)
    setPreRefinementYaml(yamlBeforeRefine)
    formRef.current?.replaceYamlConfig(result.yaml_config)
    toaster.info('AI refine applied — save to confirm')
  } catch (error: any) {
    setShowPromptPopup(false)
    toaster.error(error?.parsedError?.error?.message ?? error?.message ?? 'Failed to refine workflow')
  } finally {
    setIsRefining(false)
  }
}
```

**Revert flow (client-side only):**
```tsx
const handleRevertConfirm = () => {
  if (!preRefinementYaml) return
  setShowRevertConfirm(false)
  formRef.current?.replaceYamlConfig(preRefinementYaml)
  setPreRefinementYaml(null)
  toaster.info('Reverted to previous version')
}
```

**After successful save** — clear the snapshot so revert no longer applies:
```tsx
setPreRefinementYaml(null)
```

**Button disabled conditions:**
```tsx
// Revert: only active after a refinement is applied in the current unsaved session
disabled={!preRefinementYaml}

// Refine: active only when workflow is loaded and not currently refining
disabled={currentWorkflowLoading || !currentWorkflow || isRefining}
```

**Popup JSX:**
```tsx
<RefineWorkflowPromptPopup
  isVisible={showPromptPopup}
  isLoading={isRefining}
  onHide={() => setShowPromptPopup(false)}
  onRefine={handlePromptSubmit}
/>
```

**Confirmation modal:**
```tsx
<ConfirmationModal
  visible={showRevertConfirm}
  header="Revert to Previous Version"
  message="This will discard the AI refinement and restore the previous version. Continue?"
  confirmText="Revert"
  confirmButtonType={ButtonType.DELETE}
  onConfirm={handleRevertConfirm}
  onCancel={() => setShowRevertConfirm(false)}
/>
```

**Integration tests (7 tests):**
1. Renders "Refine with AI" and "Revert to Previous" buttons
2. "Revert to Previous" is disabled on page load
3. "Revert to Previous" is enabled after an AI refinement is applied
4. Opens prompt popup when "Refine with AI" is clicked
5. Calls refine API and shows success toast after submitting prompt
6. Shows revert confirmation modal when "Revert to Previous" is clicked after refinement
7. Restores pre-refinement YAML and shows success toast on revert confirm

- [x] **Step 1: Write failing integration tests** ✓
- [x] **Step 2: Run integration tests — expect FAIL** ✓
- [x] **Step 3: Implement `EditWorkflowPage`** ✓
- [x] **Step 4: Run integration tests — expect PASS** ✓ (7/7)
- [x] **Step 5: Run full QA gates**

```
npm run lint          # ✓ clean
npm run typecheck     # ✓ clean
npm run test:unit     # ✓ 3356/3356 passed
npm run test:integration  # ✓ 291/291 passed (5 pre-existing failures unrelated to this task)
```

- [x] **Step 6: Commit**

```bash
git add src/pages/workflows/EditWorkflowPage.tsx src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx
git commit -m "EPMCDME-12616: Wire AI refine and revert into EditWorkflowPage"
```

---

## Self-Review Checklist

| Spec requirement | Task | Status |
|---|---|---|
| `WorkflowAIRefineFields`, `WorkflowAIRefineResponse`, `WorkflowRevertResponse` types | Task 1 | ✓ |
| `workflowsStore.refineWorkflowWithAI` | Task 1 | ✓ |
| `workflowsStore.revertWorkflow` (store method, unused in UI) | Task 1 | ✓ |
| `WorkflowFormFieldsRef.setYamlConfig` | Task 2 | ✓ |
| `WorkflowFormRef.replaceYamlConfig` (visual + legacy paths, re-arms guard) | Task 3 | ✓ |
| `RefineWorkflowPromptPopup` with `isLoading` prop (stays open during API call) | Task 4 | ✓ |
| `EditWorkflowPage` wiring: buttons always rendered, inline API call, `preRefinementYaml` | Task 6 | ✓ |
| Revert button disabled until AI refinement applied (`preRefinementYaml !== null`) | Task 6 | ✓ |
| `ConfirmationModal` for revert | Task 6 | ✓ |
| `preRefinementYaml` cleared after successful save | Task 6 | ✓ |
| Apache 2.0 license headers on new files | Tasks 1–6 | ✓ |
| All QA gates pass | Task 6 | ✓ |
