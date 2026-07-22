# Spec: EPMCDME-12616 — Enhance Workflow Edit with Refine/Modify with AI and Revert to Previous

## Summary

Add two new actions to the Workflow Edit page:

1. **Refine with AI** — a button that opens a prompt popup (optional instructions), calls the backend inline, and auto-applies the AI-generated YAML directly into the editor. No approval/preview step. User must still click Save to persist.
2. **Revert to Previous** — a button enabled only when an AI refinement has been applied to the unsaved form. Restores the pre-refinement YAML client-side; no backend call required.

Both buttons are unconditionally rendered (no feature flag).

---

## API Contracts

### `POST /v1/workflows/{workflow_id}/refine`

**Request body:**
```json
{
  "yaml_config": "<current yaml>",
  "refine_prompt": "<optional instruction>"
}
```
(`refine_prompt` is omitted when the user leaves the prompt field empty.)

**Response:**
```json
{ "yaml_config": "<complete revised yaml>" }
```

**Error envelope:**
```json
{ "error": { "message": "...", "details": "...", "help": "..." } }
```
Read `error.message` for the user-facing string.

| Status | Cause |
|---|---|
| `400` | LLM returned invalid/unparseable YAML |
| `403` | User lacks WRITE permission |
| `404` | Workflow not found |
| `429` | LLM quota / rate limit exceeded |
| `500` | Unexpected AI chain error |

**Latency:** 5–20 s typical; 60 s hard client timeout not implemented (UX: button disabled + spinner while in-flight).

---

## Architecture

```
EditWorkflowPage
  ├── "Revert to Previous" button   (disabled until an AI refinement is applied)
  ├── "Refine with AI" button       (disabled while isRefining or workflow not loaded)
  ├── RefineWorkflowPromptPopup     (optional prompt; shows inline spinner while API is in-flight)
  ├── ConfirmationModal             (revert confirmation)
  └── WorkflowForm
        └── Refine path: formRef.replaceYamlConfig(yaml) → editor update + blockTransition()
```

**Refine flow:**
1. Click "Refine with AI" → `showPromptPopup = true`
2. User enters optional prompt, clicks "Refine with AI" inside popup
3. Popup stays open, button shows spinner (`isLoading` prop), `isRefining = true`
4. `workflowsStore.refineWorkflowWithAI(id, { yaml_config, refine_prompt })` called
5. On success → popup closes, `preRefinementYaml` captured, `formRef.current.replaceYamlConfig(yaml_config)`, toast "AI refine applied — save to confirm"
6. On error → popup closes, error toast shown

**Revert flow:**
1. Click "Revert to Previous" (enabled only when `preRefinementYaml !== null`) → `showRevertConfirm = true`
2. User confirms → `formRef.current.replaceYamlConfig(preRefinementYaml)`, `preRefinementYaml = null`, toast "Reverted to previous version"
3. No API call — revert is purely client-side restoration of the snapshot taken before refinement
4. After a successful Save, `preRefinementYaml` is cleared — the refinement is now the saved baseline, revert no longer applies

---

## State (`EditWorkflowPage`)

```tsx
const [isRefining, setIsRefining] = useState(false)
const [showPromptPopup, setShowPromptPopup] = useState(false)
const [showRevertConfirm, setShowRevertConfirm] = useState(false)
// non-null only while an unsaved AI refinement is active
const [preRefinementYaml, setPreRefinementYaml] = useState<string | null>(null)
```

Key handlers:
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

const handleRevertConfirm = () => {
  if (!preRefinementYaml) return
  setShowRevertConfirm(false)
  formRef.current?.replaceYamlConfig(preRefinementYaml)
  setPreRefinementYaml(null)
  toaster.info('Reverted to previous version')
}
```

Button disabled conditions:
```tsx
// Revert: only active after a refinement is applied
disabled={!preRefinementYaml}

// Refine: active only when workflow is loaded and not currently refining
disabled={currentWorkflowLoading || !currentWorkflow || isRefining}
```

---

## New/Modified Components

### `RefineWorkflowPromptPopup` (modified)

**Path:** `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx`

- Props: `isVisible: boolean`, `isLoading?: boolean`, `onHide: () => void`, `onRefine: (prompt: string) => void`
- When `isLoading` is true: both Cancel and "Refine with AI" buttons are disabled; "Refine with AI" shows `<Spinner inline /> Refining…`
- Header: "Refine Workflow with AI"
- Body: description text + optional `<Textarea>` (React Hook Form + Yup, field `refine_prompt?: string`)
- `dismissableMask={false}`, auto-focus textarea on open

### `RefineWorkflowModal` (exists but unused)

Still present at `src/pages/workflows/components/RefineWorkflowModal.tsx` — not wired into the current page flow. Can be removed in a future cleanup.

---

## New Types (`src/types/entity/workflow.ts`)

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

---

## Store (`src/store/workflows.ts`)

```ts
async refineWorkflowWithAI(id: string, fields: WorkflowAIRefineFields): Promise<WorkflowAIRefineResponse> {
  return api.post(`v1/workflows/${id}/refine`, fields).then((r) => r.json())
},

async revertWorkflow(id: string): Promise<WorkflowRevertResponse> {
  return api.post(`v1/workflows/${id}/revert`, {}).then((r) => r.json())
},
```

(`revertWorkflow` is kept in the store for potential future use but is not called from the current UI flow.)

---

## WorkflowFormRef Changes (refine path)

New method for AI refine YAML injection:

```ts
replaceYamlConfig: (yaml: string) => void
```

- **Visual editor path:** calls `setYamlConfig(yaml)` React state → `WorkflowNodeEditor` auto-updates via its `useMemo([configurationString])` prop; also calls `blockTransition()`
- **Legacy form path:** calls `formFieldsRef.current.setYamlConfig(yaml)` → RHF `setValue('yaml_config', yaml, { shouldDirty: true })`; also calls `blockTransition()`

---

## UnsavedChanges Guard

- **Refine path:** `replaceYamlConfig` calls `blockTransition()` — re-arms the guard so the user is warned if navigating away before saving.
- **Revert path:** `replaceYamlConfig(preRefinementYaml)` also calls `blockTransition()` — form is still dirty relative to the last save.

---

## Acceptance Criteria Mapping

| AC | Implementation |
|---|---|
| 'Refine/Modify with AI' button added to workflow edit | `EditWorkflowPage` header, always rendered |
| 'Revert to Previous' option available after AI modification | Enabled only after AI refinement applied (`preRefinementYaml !== null`) |
| After revert, workflow restored to pre-refinement state | Client-side snapshot restoration via `replaceYamlConfig(preRefinementYaml)` |
| Action history logged | Server-side — `yaml_config_history` tracks all saves automatically |
| No regression in workflow edit/save | Existing save flow untouched |
| Both options accessible for all workflow types | Works in visual and legacy editor modes |

---

## Out of Scope

- Per-field cherry-picking in the refine modal (full YAML replacement)
- Frontend audit-log or history UI
- Version picker modal for revert
- Exposing `llm_model` or `project` in the UI (backend uses defaults)
- Feature flag gating (removed — buttons always rendered)
- Server-side revert (replaced by client-side snapshot)

---

## File Change Summary

**Modified:**
- `src/pages/workflows/EditWorkflowPage.tsx`
- `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx` (added `isLoading` prop)
- `src/pages/workflows/components/WorkflowForm.tsx` (`WorkflowFormRef` + `replaceYamlConfig`)
- `src/pages/workflows/components/WorkflowFormFields.tsx` (`WorkflowFormFieldsRef` + `setYamlConfig`)
- `src/types/entity/workflow.ts` (new types)
- `src/store/workflows.ts` (two new store methods)

**Created:**
- `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx`
- `src/pages/workflows/components/RefineWorkflowModal.tsx` (unused in current flow)
- `src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx`
- `src/pages/workflows/components/__tests__/RefineWorkflowModal.test.tsx`
- `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`
