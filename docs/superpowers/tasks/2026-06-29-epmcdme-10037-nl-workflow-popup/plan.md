# Plan: NL Workflow Generation Popup (EPMCDME-10037)

## Tasks

### T1 — Add types to workflow.ts
**File**: `src/types/entity/workflow.ts`
**Test-first**: no — interface additions have no runtime behavior to test

Add two interfaces after existing type exports:
```ts
export interface GenerateWorkflowRequest {
  text: string
  include_tools: boolean
}

export interface GenerateWorkflowResponse {
  name: string
  description: string
  yaml_config: string
}
```

---

### T2 — Add generateWorkflow to store
**File**: `src/store/workflows.ts`
**Test-first**: no — store methods are tested via component mocks in this project

Add to the type declaration and implementation:
```ts
// type block
generateWorkflow: (text: string, includeTools: boolean) => Promise<GenerateWorkflowResponse>

// implementation
async generateWorkflow(text: string, includeTools: boolean): Promise<GenerateWorkflowResponse> {
  const response = await api.post('v1/workflows/generate', {
    text,
    include_tools: includeTools,
  })
  return response.json()
},
```

---

### T3 — Create GenerateWorkflowPopup component
**File**: `src/pages/workflows/components/GenerateWorkflowPopup.tsx`
**Test-first**: yes — write failing test for render/submit/cancel/error before implementing

Props:
```ts
interface GenerateWorkflowPopupProps {
  visible: boolean
  onHide: () => void
  onGenerated: (data: GenerateWorkflowResponse) => void
}
```

Internals:
- `text: string` state (default `''`)
- `includeTools: boolean` state (default `false`)
- `isLoading: boolean` state
- On submit: `setIsLoading(true)` → `workflowsStore.generateWorkflow(text, includeTools)` → `onGenerated(data)` → `onHide()` / on error: `toaster.error(...)` → `setIsLoading(false)`
- `onHide` also resets `text` and `includeTools`
- Uses: `<Popup isMagic limitWidth dismissableMask={false} visible={visible} header="Generate Workflow" submitText="Generate" submitDisabled={isLoading || !text.trim()} onHide={onHide} onSubmit={handleSubmit}>`
- Body: `{isLoading ? <Spinner inline /> : <><Textarea .../><Switch .../></>}`
- Apache 2.0 license header required

---

### T4 — Wire popup into NewWorkflowPage
**File**: `src/pages/workflows/NewWorkflowPage.tsx`
**Test-first**: no — NewWorkflowPage has no existing test coverage; auto-open behavior verified via popup unit tests

Changes:
1. Add state: `const [showGeneratePopup, setShowGeneratePopup] = useState(!isCloning && !isFromTemplate)`
2. Add `handleGenerated` callback:
   ```ts
   const handleGenerated = (data: GenerateWorkflowResponse) => {
     setTemplate(data)
   }
   ```
3. Mount popup before closing `</div>`:
   ```tsx
   <GenerateWorkflowPopup
     visible={showGeneratePopup}
     onHide={() => setShowGeneratePopup(false)}
     onGenerated={handleGenerated}
   />
   ```
4. Import `GenerateWorkflowPopup` and `GenerateWorkflowResponse`

---

### T5 — Unit tests for GenerateWorkflowPopup
**File**: `src/pages/workflows/components/__tests__/GenerateWorkflowPopup.test.tsx`
**Test-first**: yes (written before T3 implementation)

Tests:
- Renders popup when visible=true
- Does not render when visible=false
- Generate button disabled when text is empty
- Generate button enabled when text is non-empty
- Calls workflowsStore.generateWorkflow with correct args on submit
- Calls onGenerated and onHide on success
- Shows toaster.error and stays open on API failure
- Resets state on close (onHide)
- Apache 2.0 license header required
