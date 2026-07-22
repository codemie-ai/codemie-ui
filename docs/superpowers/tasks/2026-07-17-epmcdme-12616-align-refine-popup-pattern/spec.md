# Design: Align RefineWorkflowPromptPopup with GenerateWorkflowPopup Pattern

## Summary

Refactor `RefineWorkflowPromptPopup` to follow the same architectural pattern as `GenerateWorkflowPopup` (EPMCDME-10037): move the async API call inside the popup, remove the `isLoading` prop, align the loading UI (centered spinner replacing form content), remove React Hook Form / Yup, and simplify `EditWorkflowPage` state.

---

## Component Contract

### Before

```ts
interface RefineWorkflowPromptPopupProps {
  isVisible: boolean
  isLoading?: boolean
  onHide: () => void
  onRefine: (prompt: string) => void
}
```

### After

```ts
interface RefineWorkflowPromptPopupProps {
  isVisible: boolean
  workflowId: string
  currentYaml: string
  onHide: () => void
  onRefined: (result: WorkflowAIRefineResponse) => void
}
```

Internal state replaces the external `isLoading` prop:

```ts
const [prompt, setPrompt] = useState('')
const [isLoading, setIsLoading] = useState(false)
```

React Hook Form and Yup are removed — the field is a single optional string with no validation rules.

---

## Async Flow (inside popup)

```ts
const handleRefineClick = async () => {
  setIsLoading(true)
  try {
    const result = await workflowsStore.refineWorkflowWithAI(workflowId, {
      yaml_config: currentYaml,
      refine_prompt: prompt || undefined,
    })
    onRefined(result)
    handleHide()
  } catch (error: any) {
    handleHide()
    toaster.error(
      error?.parsedError?.error?.message ?? error?.message ?? 'Failed to refine workflow'
    )
  } finally {
    setIsLoading(false)
  }
}
```

Error behavior: close popup + show error toast (same as current implementation; differs from `GenerateWorkflowPopup` which stays open on error).

The auto-focus `useEffect` + `textareaRef` is retained.

---

## Loading UI

Centered spinner replaces form content while loading — matching `GenerateWorkflowPopup`:

```tsx
{isLoading && (
  <div className="flex justify-center mt-4 mb-12">
    <Spinner inline />
  </div>
)}

{!isLoading && (
  // textarea + infobox
)}

{/* Cancel always visible — disabled while loading so user can dismiss */}
{/* Refine button hidden while loading */}
<div className="flex gap-4 justify-end my-4">
  <Button variant={ButtonType.SECONDARY} onClick={handleHide} disabled={isLoading}>
    Cancel
  </Button>
  {!isLoading && (
    <Button variant={ButtonType.MAGICAL} onClick={handleRefineClick}>
      Refine with AI
    </Button>
  )}
</div>
```

---

## EditWorkflowPage Changes

`isRefining` state is removed. YAML is captured at the moment the popup is opened (before the API call) via a new `capturedYaml` state variable:

```ts
const [capturedYaml, setCapturedYaml] = useState('')

const handleRefineStart = () => {
  setCapturedYaml(formRef.current?.getFormValues()?.yaml_config ?? '')
  setShowPromptPopup(true)
}

const handleRefined = (result: WorkflowAIRefineResponse) => {
  setPreRefinementYaml(capturedYaml)
  formRef.current?.replaceYamlConfig(result.yaml_config)
  toaster.info('AI refine applied — save to confirm')
}
```

`capturedYaml` is passed as `currentYaml` to the popup. The header "Refine with AI" button drops its spinner branch — disabled only when `currentWorkflowLoading || !currentWorkflow`. `handlePromptSubmit` is removed.

**Revert button visibility:** "Revert to Previous" is hidden by default and rendered only when `preRefinementYaml !== null` — i.e., only after an AI refinement has been applied and before the next Save. After Save or a successful revert, `preRefinementYaml` is cleared and the button disappears.

```tsx
{preRefinementYaml && (
  <Button type="secondary" onClick={() => setShowRevertConfirm(true)}>
    Revert to Previous
  </Button>
)}
```

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx` | New props, internal async, remove RHF/Yup, align loading UI |
| `src/pages/workflows/EditWorkflowPage.tsx` | Remove `isRefining`, add `capturedYaml`, replace `handlePromptSubmit` with `handleRefined`, simplify header button |
| `src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx` | Remove `isLoading` tests, add store mock, add spinner/error tests |
| `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx` | Remove `isRefining`/spinner assertions |

---

## Testing

### RefineWorkflowPromptPopup.test.tsx

- Render with required props (`workflowId`, `currentYaml`)
- Shows textarea and buttons when not loading
- Shows centered spinner, hides form content while loading
- Calls `workflowsStore.refineWorkflowWithAI` with correct args on submit
- Calls `onRefined` with result and closes on success
- Calls `onHide` and `toaster.error` on API error (close-on-error behavior)
- Empty prompt sends `refine_prompt: undefined`

### EditWorkflowPage.integration.test.tsx

- Remove any assertion checking `Refining…` text or spinner in the header button
- Verify `handleRefineStart` captures YAML and opens popup
- Verify `handleRefined` applies result and sets `preRefinementYaml`

---

## Out of Scope

- Changing error behavior of `GenerateWorkflowPopup`
- Extracting a shared base component
- Any changes to the revert flow or `WorkflowFormRef`
