# Design: Enable File Upload in HITL Workflow Interruption

**Ticket**: EPMCDME-12393  
**Date**: 2026-05-26  
**Status**: Approved  

---

## Goal

Allow users to attach files when resuming an interrupted workflow execution — both in chat mode and on the standalone workflow execution page.

---

## Architecture

Two independent change sets shipped under one ticket.

| Repo | Branch |
|------|--------|
| `codemie-ui` (frontend) | `EPMCDME-12393_enable-file-upload-hitl` |
| `codemie` (backend) | `EPMCDME-12393_enable-file-upload-hitl` (new, from `main`) |

---

## Backend changes (`codemie`)

### `ResumeWorkflowExecutionRequest`

File: `src/codemie/core/workflow_models/workflow_execution.py`

Add `file_names` to the existing request model:

```python
class ResumeWorkflowExecutionRequest(BaseModel):
    user_input: str | None = None
    file_names: list[str] | None = None   # encoded upload URLs, same format as CreateWorkflowExecutionRequest
```

### Resume router

File: `src/codemie/rest_api/routers/workflow_executions.py`

Extract `file_names` from the request body and pass to `WorkflowExecutor.create_executor`:

```python
file_names = body.file_names if body and body.file_names else []

workflow = WorkflowExecutor.create_executor(
    ...
    user_input=body.user_input if body else None,
    file_names=file_names,          # added
    resume_execution=True,
    ...
)
```

### `WorkflowExecutor`

`WorkflowExecutor.create_executor` already accepts `file_names` for initial executions and propagates them to `AgentNode` and `ToolNode`. No changes needed in the executor itself — the resume path will reuse this mechanism once `file_names` is passed from the router.

---

## Frontend changes (`codemie-ui`)

### 1. Types

**`src/types/chatGeneration.ts`**  
Add `resumeExecutionFileNames` to `ChatRequest`:

```ts
resumeExecutionFileNames?: string[]
```

**`src/pages/workflows/details/hooks/useExecutionsContext.tsx`**  
Update `resumeWithMessage` signature:

```ts
resumeWithMessage: (message: string | undefined, fileNames: string[]) => void
```

### 2. `chatGenerationStore` — chat mode resume

File: `src/store/chatGeneration.ts`

`resumeWorkflowExecution` gains `fileNames?: string[]`:

```ts
async resumeWorkflowExecution(userInput?: string, fileNames?: string[]) {
  ...
  const data: ChatRequest = {
    ...
    resumeExecution: true,
    ...(userInput ? { resumeExecutionInput: userInput } : {}),
    ...(fileNames?.length ? { resumeExecutionFileNames: fileNames } : {}),
  }
}
```

`_prepareRequestData` includes `file_names` in the resume body:

```ts
if (data.resumeExecution) {
  const hasInput = !!data.resumeExecutionInput
  const hasFiles = !!data.resumeExecutionFileNames?.length
  const requestData = (hasInput || hasFiles)
    ? {
        ...(hasInput ? { user_input: data.resumeExecutionInput } : {}),
        ...(hasFiles ? { file_names: data.resumeExecutionFileNames } : {}),
      }
    : undefined
  return {
    endpoint: `v1/workflows/${data.workflowId}/executions/${data.executionId}/resume?stream=true`,
    requestData,
    method: 'PUT',
  }
}
```

### 3. `workflowExecutionsStore` — execution page resume

File: `src/store/workflowExecutions.ts`

`resumeWorkflowExecution` gains `fileNames?: string[]`:

```ts
async resumeWorkflowExecution(workflowId, executionId, userInput?: string, fileNames?: string[]) {
  const body = (userInput || fileNames?.length)
    ? {
        ...(userInput ? { user_input: userInput } : {}),
        ...(fileNames?.length ? { file_names: fileNames } : {}),
      }
    : undefined

  const response = await api.put(
    `v1/workflows/${workflowId}/executions/${executionId}/resume`,
    body
  )
  ...
}
```

### 4. `useExecutionResume` hook

File: `src/pages/workflows/details/hooks/useExecutionResume.tsx`

Update `resumeWithMessage` to accept and pass `fileNames`:

```ts
type UseExecutionResumeReturn = {
  ...
  resumeWithMessage: (message: string | undefined, fileNames: string[]) => void
}

const resumeWithMessage = useCallback(
  async (message: string | undefined, fileNames: string[]) => {
    ...
    await workflowExecutionsStore.resumeWorkflowExecution(workflowId, executionId, message, fileNames)
  },
  [workflowId, executionId]
)
```

### 5. `ChatPrompt.tsx` — chat mode UI

File: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`

Three changes:

**a) Show file upload in interrupted state**  
Remove the `!isInterrupted &&` guard:
```tsx
// before
{!isInterrupted && <ChatPromptFileUpload {...fileUpload} files={files} />}
// after
<ChatPromptFileUpload {...fileUpload} files={files} />
```

**b) Pass files on resume submit**  
```ts
if (isInterrupted) {
  const userInput = prompt.message.trim() || undefined
  const fileNames = files.map((f) => f.fileId!)
  setPrompt({ message: '', messageRaw: '' })
  setFiles([])
  chatGenerationStore.resumeWorkflowExecution(userInput, fileNames)
  return
}
```

**c) Block submit during active uploads when interrupted**  
```ts
const canSubmit = (() => {
  if (isInterrupted) return !isInProgress && !fileUpload.hasActiveUploads
  ...
})()
```

### 6. `ContinueWithInputPopup` (new component)

File: `src/pages/workflows/details/states/ContinueWithInputPopup.tsx`

New component extracted from the inline popup in `WorkflowExecutionStateControls`. Responsible for:
- Fetching the interrupted state's output on open via `getWorkflowExecutionStateOutput`
- Displaying a scrollable `Markdown` output area
- Providing a text input + `ChatPromptFileUpload` + Continue button input bar

**Props:**
```ts
interface ContinueWithInputPopupProps {
  visible: boolean
  stateId: string
  onHide: () => void
  onContinue: (message: string | undefined, fileNames: string[]) => void
  isSubmitting: boolean
}
```

**Layout** (matches screenshot):
```
┌─────────────────────────────────────────────────┐
│ Workflow interrupted                          [×] │
│ Review the output, add a message if needed,       │
│ then continue the workflow.                       │
├───────────────────────────────────────────────── │
│                                                   │
│  [scrollable Markdown output area]                │
│                                                   │
├───────────────────────────────────────────────── │
│ ┌─────────────────────────────────────────────┐  │
│ │ Leave empty or type a message for next step │  │
│ │                                             │  │
│ │ 📎                          ▶ Continue      │  │
│ └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

- Uses `useFileUpload` hook for file state
- `Continue` disabled when `isSubmitting || fileUpload.hasActiveUploads`
- On submit: calls `onContinue(message || undefined, files.map(f => f.fileId!))`, resets local state

### 7. `WorkflowExecutionStateControls.tsx` — wire up new popup

File: `src/pages/workflows/details/states/WorkflowExecutionStateControls.tsx`

- Remove existing inline `Popup` + `Textarea` "Continue with message" block
- Import and render `ContinueWithInputPopup` instead:
```tsx
<ContinueWithInputPopup
  visible={isContinueWithMessagePopupVisible}
  stateId={stateId ?? ''}
  onHide={closeContinueWithMessagePopup}
  onContinue={(message, fileNames) => {
    resumeWithMessage(message, fileNames)
    closeContinueWithMessagePopup()
  }}
  isSubmitting={isResuming}
/>
```

---

## Data flow summary

```
User attaches files → useFileUpload (POST /v1/files/bulk) → file_url (encoded string)
User clicks Continue →
  [chat]      chatGenerationStore.resumeWorkflowExecution(text, fileNames)
                → PUT .../resume?stream=true  { user_input, file_names }
  [exec page] workflowExecutionsStore.resumeWorkflowExecution(wfId, exId, text, fileNames)
                → PUT .../resume  { user_input, file_names }
Backend:
  ResumeWorkflowExecutionRequest { user_input, file_names }
  → WorkflowExecutor.create_executor(file_names=file_names, resume_execution=True)
  → AgentNode / ToolNode receive file_names (existing mechanism)
```

---

## Files changed

### Backend (`codemie`)
| File | Change |
|------|--------|
| `src/codemie/core/workflow_models/workflow_execution.py` | Add `file_names` to `ResumeWorkflowExecutionRequest` |
| `src/codemie/rest_api/routers/workflow_executions.py` | Extract and pass `file_names` to executor |

### Frontend (`codemie-ui`)
| File | Change |
|------|--------|
| `src/types/chatGeneration.ts` | Add `resumeExecutionFileNames` to `ChatRequest` |
| `src/pages/workflows/details/hooks/useExecutionsContext.tsx` | Update `resumeWithMessage` signature |
| `src/store/chatGeneration.ts` | Add `fileNames` param + `_prepareRequestData` resume body |
| `src/store/workflowExecutions.ts` | Add `fileNames` param to `resumeWorkflowExecution` |
| `src/pages/workflows/details/hooks/useExecutionResume.tsx` | Update `resumeWithMessage` signature and call |
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | Unhide upload, pass files, fix canSubmit |
| `src/pages/workflows/details/states/ContinueWithInputPopup.tsx` | **New** — extracted + redesigned popup |
| `src/pages/workflows/details/states/WorkflowExecutionStateControls.tsx` | Replace inline popup with `ContinueWithInputPopup` |

---

## Out of scope

- File upload in non-interrupted workflow chat (already works)
- Bedrock workflows (backend already rejects file uploads for Bedrock)
- The `Edit output` popup in `WorkflowExecutionStateControls` (no changes)

---

## Testing notes

- Existing HITL flow without files must continue to work (no regression)
- Chat mode: submit with files only (no text), with text only, with both
- Execution page: same three combinations
- Backend: `file_names=[]` and `file_names=None` treated identically (no files passed to executor)
