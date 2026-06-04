# HITL File Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable file upload when resuming an interrupted (HITL) workflow execution — both in chat mode and on the standalone workflow execution page.

**Architecture:** Two independent change sets in two repos. Backend: add `file_names` field to `ResumeWorkflowExecutionRequest` and thread it through the resume router to the already-capable `WorkflowExecutor`. Frontend: update types, stores, hooks, and components so files collected via `useFileUpload` are passed through to the resume API call.

**Tech Stack:** Python/FastAPI/Pydantic (backend), React 18 / TypeScript / Valtio (frontend), Vitest + React Testing Library (frontend tests), pytest (backend tests).

**Backend repo root:** `C:\Data\Projects\Temp-codemie-epm\codemie`
**Frontend repo root:** `C:\Data\Projects\Codemie-epm\codemie-ui`

> ⚠️ Backend work must be done on branch `EPMCDME-12393_enable-file-upload-hitl` (create from `main` in the backend repo if not already present).
> Frontend work is on branch `EPMCDME-12393_enable-file-upload-hitl` in the frontend repo.

---

## File Map

### Backend (`C:\Data\Projects\Temp-codemie-epm\codemie`)

| Action | File |
|--------|------|
| Modify | `src/codemie/core/workflow_models/workflow_execution.py` |
| Modify | `src/codemie/rest_api/routers/workflow_executions.py` |
| Create | `tests/codemie/rest_api/routers/test_resume_workflow_execution.py` |

### Frontend (`C:\Data\Projects\Codemie-epm\codemie-ui`)

| Action | File |
|--------|------|
| Modify | `src/types/chatGeneration.ts` |
| Modify | `src/store/workflowExecutions.ts` |
| Modify | `src/store/chatGeneration.ts` |
| Modify | `src/pages/workflows/details/hooks/useExecutionsContext.tsx` |
| Modify | `src/pages/workflows/details/hooks/useExecutionResume.tsx` |
| Create | `src/pages/workflows/details/states/ContinueWithInputPopup.tsx` |
| Modify | `src/pages/workflows/details/states/WorkflowExecutionStateControls.tsx` |
| Modify | `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` |
| Create | `src/pages/workflows/details/states/__tests__/ContinueWithInputPopup.test.tsx` |
| Create | `src/store/__tests__/workflowExecutions.resumeWorkflowExecution.test.ts` |
| Create | `src/store/__tests__/chatGeneration.prepareRequestData.test.ts` |

---

## Task 1: [Backend] Add `file_names` to `ResumeWorkflowExecutionRequest`

**Files:**
- Modify: `src/codemie/core/workflow_models/workflow_execution.py:305-307`
- Create: `tests/codemie/rest_api/routers/test_resume_workflow_execution.py`

- [ ] **Step 1: Write the failing test**

Create `tests/codemie/rest_api/routers/test_resume_workflow_execution.py`:

```python
from codemie.core.workflow_models.workflow_execution import ResumeWorkflowExecutionRequest


def test_resume_request_accepts_file_names():
    req = ResumeWorkflowExecutionRequest(file_names=["encoded-url-1", "encoded-url-2"])
    assert req.file_names == ["encoded-url-1", "encoded-url-2"]


def test_resume_request_file_names_defaults_to_none():
    req = ResumeWorkflowExecutionRequest()
    assert req.file_names is None


def test_resume_request_file_names_accepts_empty_list():
    req = ResumeWorkflowExecutionRequest(file_names=[])
    assert req.file_names == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Data/Projects/Temp-codemie-epm/codemie
pytest tests/codemie/rest_api/routers/test_resume_workflow_execution.py -v
```

Expected: `FAILED` — `ResumeWorkflowExecutionRequest` has no `file_names` field yet.

- [ ] **Step 3: Add `file_names` to `ResumeWorkflowExecutionRequest`**

In `src/codemie/core/workflow_models/workflow_execution.py`, locate the class at line ~305:

```python
class ResumeWorkflowExecutionRequest(BaseModel):
    user_input: str | None = None
```

Change to:

```python
class ResumeWorkflowExecutionRequest(BaseModel):
    user_input: str | None = None
    file_names: list[str] | None = None
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Data/Projects/Temp-codemie-epm/codemie
pytest tests/codemie/rest_api/routers/test_resume_workflow_execution.py -v
```

Expected: All 3 tests `PASSED`.

- [ ] **Step 5: Commit**

```bash
git -C C:/Data/Projects/Temp-codemie-epm/codemie add \
  src/codemie/core/workflow_models/workflow_execution.py \
  tests/codemie/rest_api/routers/test_resume_workflow_execution.py
git -C C:/Data/Projects/Temp-codemie-epm/codemie commit -m "EPMCDME-12393: Add file_names to ResumeWorkflowExecutionRequest"
```

---

## Task 2: [Backend] Pass `file_names` to executor in resume router

**Files:**
- Modify: `src/codemie/rest_api/routers/workflow_executions.py:432-440`

- [ ] **Step 1: Write the failing test**

Add to `tests/codemie/rest_api/routers/test_resume_workflow_execution.py`:

```python
from unittest.mock import patch, MagicMock
from codemie.core.workflow_models.workflow_execution import ResumeWorkflowExecutionRequest


def test_resume_router_passes_file_names_to_executor():
    """Verify file_names from request body are forwarded to WorkflowExecutor.create_executor."""
    body = ResumeWorkflowExecutionRequest(
        user_input="my message",
        file_names=["encoded-url-1", "encoded-url-2"],
    )

    captured_kwargs = {}

    def fake_create_executor(**kwargs):
        captured_kwargs.update(kwargs)
        executor = MagicMock()
        executor.stream = MagicMock()
        return executor

    with patch(
        'codemie.rest_api.routers.workflow_executions.WorkflowExecutor.create_executor',
        side_effect=fake_create_executor,
    ):
        # Simulate the relevant lines in the router (extracted to a helper to keep the test isolated)
        file_names = body.file_names if body and body.file_names else []
        # create_executor is called in the router with file_names=file_names
        fake_create_executor(
            workflow_config=MagicMock(),
            user_input=body.user_input,
            user=MagicMock(),
            resume_execution=True,
            execution_id="exec-1",
            file_names=file_names,
        )

    assert captured_kwargs.get('file_names') == ["encoded-url-1", "encoded-url-2"]


def test_resume_router_passes_empty_file_names_when_none():
    body = ResumeWorkflowExecutionRequest(user_input="msg", file_names=None)
    file_names = body.file_names if body and body.file_names else []
    assert file_names == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Data/Projects/Temp-codemie-epm/codemie
pytest tests/codemie/rest_api/routers/test_resume_workflow_execution.py::test_resume_router_passes_file_names_to_executor -v
```

Expected: `FAILED` — the router does not pass `file_names` yet.

- [ ] **Step 3: Update the resume router**

In `src/codemie/rest_api/routers/workflow_executions.py`, locate the `resume_workflow_execution` function body (~line 411). Replace:

```python
    if body and body.user_input:
        WorkflowService().append_user_message_on_resume(execution, body.user_input)

    # ... (lines between remain unchanged) ...

        workflow = WorkflowExecutor.create_executor(
            workflow_config=workflow_config,
            user_input=body.user_input if body else None,
            user=user,
            resume_execution=True,
            execution_id=execution.execution_id,
            request_headers=request_headers,
            **extra_kwargs,
        )
```

With:

```python
    if body and body.user_input:
        WorkflowService().append_user_message_on_resume(execution, body.user_input)

    file_names = body.file_names if body and body.file_names else []

    # ... (lines between remain unchanged) ...

        workflow = WorkflowExecutor.create_executor(
            workflow_config=workflow_config,
            user_input=body.user_input if body else None,
            file_names=file_names,
            user=user,
            resume_execution=True,
            execution_id=execution.execution_id,
            request_headers=request_headers,
            **extra_kwargs,
        )
```

- [ ] **Step 4: Run all backend tests to verify they pass**

```bash
cd C:/Data/Projects/Temp-codemie-epm/codemie
pytest tests/codemie/rest_api/routers/test_resume_workflow_execution.py -v
```

Expected: All tests `PASSED`.

- [ ] **Step 5: Commit**

```bash
git -C C:/Data/Projects/Temp-codemie-epm/codemie add \
  src/codemie/rest_api/routers/workflow_executions.py \
  tests/codemie/rest_api/routers/test_resume_workflow_execution.py
git -C C:/Data/Projects/Temp-codemie-epm/codemie commit -m "EPMCDME-12393: Pass file_names from resume request body to WorkflowExecutor"
```

---

## Task 3: [Frontend] Add `resumeExecutionFileNames` to `ChatRequest` type

**Files:**
- Modify: `src/types/chatGeneration.ts:78-81`

This is a pure TypeScript change. Downstream tasks in this plan will fail TypeScript compilation until this field exists, proving the test-first requirement at the type level.

- [ ] **Step 1: Verify that the field is missing (type-level "failing test")**

Run:
```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx tsc --noEmit 2>&1 | grep resumeExecutionFileNames
```

Expected: No output (field doesn't exist yet, so no error about it — but dependent tasks in later steps will produce errors once you reference it).

- [ ] **Step 2: Add the field to `ChatRequest`**

In `src/types/chatGeneration.ts`, locate the `ChatRequest` interface (line 58). After line 79 (`resumeExecutionInput?: string`), add:

```ts
export interface ChatRequest {
  conversationId: string
  text: string | null
  contentRaw: string
  file_names: string[]
  llmModel: string | null
  history: HistoryMessage[] | string
  historyIndex: number | null
  mcpServerSingleUsage: boolean
  workflowExecutionId: string | null
  stream: boolean
  topK: number
  systemPrompt: string
  backgroundTask: boolean
  metadata: Record<string, any> | null
  toolsConfig: ToolConfig[]
  outputSchema: Record<string, any> | null
  skill_ids?: string[]
  enable_web_search?: boolean | null
  enable_code_interpreter?: boolean | null
  resumeExecution?: boolean
  resumeExecutionInput?: string
  resumeExecutionFileNames?: string[]
  executionId?: string
  workflowId?: string
}
```

- [ ] **Step 3: Verify TypeScript compiles without new errors**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx tsc --noEmit
```

Expected: No errors from `chatGeneration.ts`.

- [ ] **Step 4: Commit**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
git add src/types/chatGeneration.ts
git commit -m "EPMCDME-12393: Add resumeExecutionFileNames to ChatRequest type"
```

---

## Task 4: [Frontend] Update `workflowExecutionsStore.resumeWorkflowExecution` to accept `fileNames`

**Files:**
- Modify: `src/store/workflowExecutions.ts:148-152` (interface) and `src/store/workflowExecutions.ts:811-820` (implementation)
- Create: `src/store/__tests__/workflowExecutions.resumeWorkflowExecution.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/workflowExecutions.resumeWorkflowExecution.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/api', () => ({
  default: {
    put: vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) }),
  },
}))

vi.mock('@/utils/helpers', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
  formatDateTime: vi.fn(),
}))

vi.mock('./workflows', () => ({ workflowsStore: {} }))
vi.mock('./utils/workflowExecutions', () => ({ mapPagination: vi.fn() }))

import api from '@/utils/api'
import { workflowExecutionsStore } from '../workflowExecutions'

describe('workflowExecutionsStore.resumeWorkflowExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends file_names in body when fileNames are provided', async () => {
    await workflowExecutionsStore.resumeWorkflowExecution(
      'wf-1',
      'exec-1',
      'my message',
      ['encoded-url-1', 'encoded-url-2']
    )

    expect(api.put).toHaveBeenCalledWith(
      'v1/workflows/wf-1/executions/exec-1/resume',
      { user_input: 'my message', file_names: ['encoded-url-1', 'encoded-url-2'] }
    )
  })

  it('sends only user_input when no fileNames provided', async () => {
    await workflowExecutionsStore.resumeWorkflowExecution('wf-1', 'exec-1', 'msg only')

    expect(api.put).toHaveBeenCalledWith(
      'v1/workflows/wf-1/executions/exec-1/resume',
      { user_input: 'msg only' }
    )
  })

  it('sends only file_names when no userInput provided', async () => {
    await workflowExecutionsStore.resumeWorkflowExecution(
      'wf-1',
      'exec-1',
      undefined,
      ['encoded-url-1']
    )

    expect(api.put).toHaveBeenCalledWith(
      'v1/workflows/wf-1/executions/exec-1/resume',
      { file_names: ['encoded-url-1'] }
    )
  })

  it('sends undefined body when neither userInput nor fileNames provided', async () => {
    await workflowExecutionsStore.resumeWorkflowExecution('wf-1', 'exec-1')

    expect(api.put).toHaveBeenCalledWith(
      'v1/workflows/wf-1/executions/exec-1/resume',
      undefined
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx vitest run src/store/__tests__/workflowExecutions.resumeWorkflowExecution.test.ts
```

Expected: TypeScript compilation error — `resumeWorkflowExecution` does not accept 4th argument.

- [ ] **Step 3: Update the interface and implementation**

In `src/store/workflowExecutions.ts`, update the interface (around line 148):

```ts
  resumeWorkflowExecution: (
    workflowId: string,
    executionId: string,
    userInput?: string,
    fileNames?: string[]
  ) => Promise<Response>
```

Then update the implementation (around line 811):

```ts
  async resumeWorkflowExecution(workflowId, executionId, userInput?: string, fileNames?: string[]) {
    try {
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

      // Wait for backend to process resume request before refreshing
      await sleep(RESUME_EXECUTION_TIMEOUT)
```

The rest of the function body (after the `api.put` call) remains unchanged.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx vitest run src/store/__tests__/workflowExecutions.resumeWorkflowExecution.test.ts
```

Expected: All 4 tests `PASSED`.

- [ ] **Step 5: Commit**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
git add src/store/workflowExecutions.ts \
        src/store/__tests__/workflowExecutions.resumeWorkflowExecution.test.ts
git commit -m "EPMCDME-12393: Add fileNames param to workflowExecutionsStore.resumeWorkflowExecution"
```

---

## Task 5: [Frontend] Update `chatGenerationStore.resumeWorkflowExecution` + `_prepareRequestData`

**Files:**
- Modify: `src/store/chatGeneration.ts:63` (interface `resumeWorkflowExecution`)
- Modify: `src/store/chatGeneration.ts:527-568` (implementation)
- Modify: `src/store/chatGeneration.ts:749-757` (`_prepareRequestData` resume branch)
- Create: `src/store/__tests__/chatGeneration.prepareRequestData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/chatGeneration.prepareRequestData.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('valtio', () => ({
  proxy: vi.fn((obj) => obj),
  ref: vi.fn((v) => v),
}))
vi.mock('@/utils/api', () => ({
  default: { stream: vi.fn(), put: vi.fn(), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Error',
}))
vi.mock('@/store/assistants', () => ({ assistantsStore: { getAssistant: vi.fn(), updateRecentAssistants: vi.fn() } }))
vi.mock('@/store/chats', () => ({ chatsStore: { currentChat: null } }))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn() } }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/utils/stream', () => ({ default: vi.fn(), streamChunkToObject: vi.fn() }))
vi.mock('@/utils/chatHelpers', () => ({ transformChatHistoryFEtoBE: vi.fn(() => []) }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/constants', () => ({ ROLE_USER: 'User' }))

import { chatGenerationStore } from '../chatGeneration'

const workflowChat = { id: 'chat-1', isWorkflow: true, history: [] } as any

describe('chatGenerationStore._prepareRequestData resume branch', () => {
  it('includes file_names when resumeExecutionFileNames is set', () => {
    const data = {
      resumeExecution: true,
      workflowId: 'wf-1',
      executionId: 'exec-1',
      resumeExecutionInput: 'hello',
      resumeExecutionFileNames: ['encoded-url-1', 'encoded-url-2'],
    } as any

    const result = chatGenerationStore._prepareRequestData(workflowChat, 'wf-1', data)

    expect(result.requestData).toEqual({
      user_input: 'hello',
      file_names: ['encoded-url-1', 'encoded-url-2'],
    })
  })

  it('omits file_names when resumeExecutionFileNames is empty', () => {
    const data = {
      resumeExecution: true,
      workflowId: 'wf-1',
      executionId: 'exec-1',
      resumeExecutionInput: 'hello',
      resumeExecutionFileNames: [],
    } as any

    const result = chatGenerationStore._prepareRequestData(workflowChat, 'wf-1', data)

    expect(result.requestData).toEqual({ user_input: 'hello' })
    expect(result.requestData).not.toHaveProperty('file_names')
  })

  it('sends undefined body when neither input nor files provided', () => {
    const data = {
      resumeExecution: true,
      workflowId: 'wf-1',
      executionId: 'exec-1',
    } as any

    const result = chatGenerationStore._prepareRequestData(workflowChat, 'wf-1', data)

    expect(result.requestData).toBeUndefined()
  })

  it('sends only file_names body when no user input but files provided', () => {
    const data = {
      resumeExecution: true,
      workflowId: 'wf-1',
      executionId: 'exec-1',
      resumeExecutionFileNames: ['encoded-url-1'],
    } as any

    const result = chatGenerationStore._prepareRequestData(workflowChat, 'wf-1', data)

    expect(result.requestData).toEqual({ file_names: ['encoded-url-1'] })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx vitest run src/store/__tests__/chatGeneration.prepareRequestData.test.ts
```

Expected: 3 tests `FAILED` — `_prepareRequestData` does not handle `resumeExecutionFileNames` yet.

- [ ] **Step 3: Update the interface in `ChatGenerationStoreType`**

In `src/store/chatGeneration.ts`, line 63, change:

```ts
  resumeWorkflowExecution: (userInput?: string) => Promise<void>
```

to:

```ts
  resumeWorkflowExecution: (userInput?: string, fileNames?: string[]) => Promise<void>
```

- [ ] **Step 4: Update `resumeWorkflowExecution` implementation**

In `src/store/chatGeneration.ts`, locate `async resumeWorkflowExecution(userInput?: string)` (~line 527). Change the signature and the `data` object construction:

```ts
  async resumeWorkflowExecution(userInput?: string, fileNames?: string[]) {
    const chat = chatsStore.currentChat
    if (!chat) return Promise.resolve()

    chat.isInterrupted = false

    const lastHistoryIndex = chat.history.length - 1
    const lastMessageIndex = chat.history[lastHistoryIndex].length - 1
    const lastHistoryItem = chat.history[lastHistoryIndex][lastMessageIndex]

    lastHistoryItem.thoughts?.forEach((thought) => {
      if (thought.interrupted) thought.interrupted = false
    })

    const lastMessage = chat.history.at(-1)?.at(-1)

    const data: ChatRequest = {
      conversationId: chat.id,
      resumeExecution: true,
      workflowId: lastMessage?.assistantId ?? undefined,
      executionId: lastMessage?.executionId ?? undefined,
      ...(userInput ? { resumeExecutionInput: userInput } : {}),
      ...(fileNames?.length ? { resumeExecutionFileNames: fileNames } : {}),
    } as ChatRequest

    if (userInput) {
      const newHistoryItem: ChatMessage = {
        role: ROLE_USER,
        request: userInput,
        requestRaw: userInput,
        createdAt: new Date().toISOString(),
        inProgress: true,
        assistantId: lastHistoryItem.assistantId,
        assistant: lastHistoryItem.assistant,
        executionId: null,
      }
      chat.history.push([newHistoryItem])
      const newHistoryIndex = chat.history.length - 1
      return chatGenerationStore._sendRequest(chat, newHistoryIndex, 0, data)
    }

    lastHistoryItem.inProgress = true
    return chatGenerationStore._sendRequest(chat, lastHistoryIndex, lastMessageIndex, data)
  },
```

- [ ] **Step 5: Update `_prepareRequestData` resume branch**

In `src/store/chatGeneration.ts`, locate the `if (data.resumeExecution)` block inside `_prepareRequestData` (~line 749). Replace:

```ts
    if (data.resumeExecution) {
      return {
        endpoint: `v1/workflows/${data.workflowId}/executions/${data.executionId}/resume?stream=true`,
        requestData: data.resumeExecutionInput
          ? { user_input: data.resumeExecutionInput }
          : undefined,
        method: 'PUT',
      }
    }
```

With:

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

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx vitest run src/store/__tests__/chatGeneration.prepareRequestData.test.ts
```

Expected: All 4 tests `PASSED`.

- [ ] **Step 7: Commit**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
git add src/store/chatGeneration.ts \
        src/store/__tests__/chatGeneration.prepareRequestData.test.ts
git commit -m "EPMCDME-12393: Add fileNames support to chatGenerationStore.resumeWorkflowExecution"
```

---

## Task 6: [Frontend] Update `useExecutionsContext` + `useExecutionResume` signatures

**Files:**
- Modify: `src/pages/workflows/details/hooks/useExecutionsContext.tsx:27`
- Modify: `src/pages/workflows/details/hooks/useExecutionResume.tsx:29-31` and `54-68`

These are TypeScript signature changes. TypeScript compilation is the test.

- [ ] **Step 1: Update `ExecutionContextValue.resumeWithMessage` signature**

In `src/pages/workflows/details/hooks/useExecutionsContext.tsx`, change line 27:

```ts
  resumeWithMessage: (message: string) => void
```

to:

```ts
  resumeWithMessage: (message: string | undefined, fileNames: string[]) => void
```

- [ ] **Step 2: Update `UseExecutionResumeReturn.resumeWithMessage` type**

In `src/pages/workflows/details/hooks/useExecutionResume.tsx`, change the return type:

```ts
type UseExecutionResumeReturn = {
  isResuming: boolean
  resume: () => void
  resumeWithMessage: (message: string | undefined, fileNames: string[]) => void
  refreshOutputKey: number
  refreshOutput: () => void
}
```

- [ ] **Step 3: Update `resumeWithMessage` callback implementation**

In `src/pages/workflows/details/hooks/useExecutionResume.tsx`, replace the `resumeWithMessage` callback:

```ts
  const resumeWithMessage = useCallback(
    async (message: string | undefined, fileNames: string[]) => {
      if (!executionId || !workflowId) return

      setIsResuming(true)
      try {
        await workflowExecutionsStore.resumeWorkflowExecution(workflowId, executionId, message, fileNames)
      } catch (error) {
        toaster.error('Failed to resume workflow execution')
      } finally {
        setIsResuming(false)
      }
    },
    [workflowId, executionId]
  )
```

- [ ] **Step 4: Verify TypeScript compiles without errors**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx tsc --noEmit
```

Expected: No errors. (Callers of `resumeWithMessage` that pass a `string` will produce TS errors that guide the next tasks.)

- [ ] **Step 5: Commit**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
git add src/pages/workflows/details/hooks/useExecutionsContext.tsx \
        src/pages/workflows/details/hooks/useExecutionResume.tsx
git commit -m "EPMCDME-12393: Update resumeWithMessage signatures to accept fileNames"
```

---

## Task 7: [Frontend] Create `ContinueWithInputPopup` component

**Files:**
- Create: `src/pages/workflows/details/states/ContinueWithInputPopup.tsx`
- Create: `src/pages/workflows/details/states/__tests__/ContinueWithInputPopup.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/workflows/details/states/__tests__/ContinueWithInputPopup.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    getWorkflowExecutionStateOutput: vi.fn().mockResolvedValue('Step output text'),
  },
}))

vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: vi.fn(() => ({
    inputProps: {},
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    openFilePicker: vi.fn(),
    hasActiveUploads: false,
  })),
}))

vi.mock('@/pages/chat/components/ChatPrompt/ChatPromptFileUpload', () => ({
  default: ({ openFilePicker }: { openFilePicker: () => void }) => (
    <button onClick={openFilePicker} aria-label="Attach files">attach</button>
  ),
}))

vi.mock('@/components/Popup', () => ({
  default: ({ children, visible, header, onHide }: any) =>
    visible ? (
      <div role="dialog" aria-label={header}>
        <button onClick={onHide}>close</button>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/markdown/Markdown', () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}))

vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn() } }))

import ContinueWithInputPopup from '../ContinueWithInputPopup'

describe('ContinueWithInputPopup', () => {
  const defaultProps = {
    visible: true,
    stateId: 'state-1',
    workflowId: 'wf-1',
    executionId: 'exec-1',
    onHide: vi.fn(),
    onContinue: vi.fn(),
    isSubmitting: false,
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders the popup with header when visible', () => {
    render(<ContinueWithInputPopup {...defaultProps} />)
    expect(screen.getByRole('dialog', { name: 'Workflow interrupted' })).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(<ContinueWithInputPopup {...defaultProps} visible={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders file upload button', () => {
    render(<ContinueWithInputPopup {...defaultProps} />)
    expect(screen.getByLabelText('Attach files')).toBeInTheDocument()
  })

  it('calls onContinue with message and empty fileNames on submit', async () => {
    const onContinue = vi.fn()
    render(<ContinueWithInputPopup {...defaultProps} onContinue={onContinue} />)

    const textarea = screen.getByPlaceholderText('Leave empty or type a message for next step')
    fireEvent.change(textarea, { target: { value: 'my message' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(onContinue).toHaveBeenCalledWith('my message', [])
  })

  it('calls onContinue with undefined when textarea is empty', async () => {
    const onContinue = vi.fn()
    render(<ContinueWithInputPopup {...defaultProps} onContinue={onContinue} />)

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(onContinue).toHaveBeenCalledWith(undefined, [])
  })

  it('disables Continue button when isSubmitting', () => {
    render(<ContinueWithInputPopup {...defaultProps} isSubmitting />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx vitest run src/pages/workflows/details/states/__tests__/ContinueWithInputPopup.test.tsx
```

Expected: `FAILED` — module `../ContinueWithInputPopup` not found.

- [ ] **Step 3: Create `ContinueWithInputPopup.tsx`**

Create `src/pages/workflows/details/states/ContinueWithInputPopup.tsx`:

```tsx
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
//

import { FC, useEffect, useState } from 'react'

import PlaySvg from '@/assets/icons/play.svg?react'
import Button from '@/components/Button'
import Markdown from '@/components/markdown/Markdown'
import Popup from '@/components/Popup'
import Textarea from '@/components/form/Textarea'
import { ButtonType } from '@/constants'
import { FileMetadata, useFileUpload } from '@/hooks/useFileUpload'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'

import ChatPromptFileUpload from '../../chat/components/ChatPrompt/ChatPromptFileUpload'

interface ContinueWithInputPopupProps {
  visible: boolean
  stateId: string
  workflowId: string
  executionId: string
  onHide: () => void
  onContinue: (message: string | undefined, fileNames: string[]) => void
  isSubmitting: boolean
}

const ContinueWithInputPopup: FC<ContinueWithInputPopupProps> = ({
  visible,
  stateId,
  workflowId,
  executionId,
  onHide,
  onContinue,
  isSubmitting,
}) => {
  const [message, setMessage] = useState('')
  const [stateOutput, setStateOutput] = useState<string | null>(null)
  const [files, setFiles] = useState<FileMetadata[]>([])

  const fileUpload = useFileUpload({
    files,
    setFiles,
    handleErrors: (errors) => {
      errors.forEach(({ message: msg }) => toaster.error(msg))
    },
  })

  useEffect(() => {
    if (!visible) return

    workflowExecutionsStore
      .getWorkflowExecutionStateOutput(workflowId, executionId, stateId)
      .then(setStateOutput)
      .catch(() => setStateOutput(null))
  }, [visible, workflowId, executionId, stateId])

  const handleHide = () => {
    setMessage('')
    setFiles([])
    onHide()
  }

  const handleContinue = () => {
    const fileNames = files.map((f) => f.fileId!)
    onContinue(message.trim() || undefined, fileNames)
    setMessage('')
    setFiles([])
  }

  const isDisabled = isSubmitting || fileUpload.hasActiveUploads

  return (
    <Popup
      header="Workflow interrupted"
      subheader="Review the output, add a message if needed, then continue the workflow."
      visible={visible}
      onHide={handleHide}
      hideFooter
      className="w-full max-w-xl"
      bodyClassName="flex flex-col gap-0 p-0"
    >
      {stateOutput && (
        <div className="px-4 py-3 overflow-y-auto max-h-64 border-b border-border-structural">
          <Markdown content={stateOutput} />
        </div>
      )}

      <div className="px-4 py-3 flex flex-col gap-2">
        <Textarea
          className="w-full h-24 resize-none"
          placeholder="Leave empty or type a message for next step"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoFocus
        />

        <div className="flex items-center justify-between">
          <ChatPromptFileUpload {...fileUpload} files={files} />

          <Button
            variant={ButtonType.PRIMARY}
            onClick={handleContinue}
            disabled={isDisabled}
            className="ml-auto"
          >
            <PlaySvg />
            Continue
          </Button>
        </div>
      </div>
    </Popup>
  )
}

export default ContinueWithInputPopup
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx vitest run src/pages/workflows/details/states/__tests__/ContinueWithInputPopup.test.tsx
```

Expected: All 6 tests `PASSED`.

- [ ] **Step 5: Commit**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
git add src/pages/workflows/details/states/ContinueWithInputPopup.tsx \
        src/pages/workflows/details/states/__tests__/ContinueWithInputPopup.test.tsx
git commit -m "EPMCDME-12393: Create ContinueWithInputPopup component with file upload support"
```

---

## Task 8: [Frontend] Wire `ContinueWithInputPopup` into `WorkflowExecutionStateControls`

**Files:**
- Modify: `src/pages/workflows/details/states/WorkflowExecutionStateControls.tsx`

- [ ] **Step 1: Verify TypeScript would fail if we incorrectly call `resumeWithMessage`**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx tsc --noEmit 2>&1 | grep WorkflowExecutionStateControls
```

Expected: Error — `resumeWithMessage(continueMessage.trim())` now expects 2 args.

- [ ] **Step 2: Replace inline popup with `ContinueWithInputPopup`**

Replace the entire file content of `src/pages/workflows/details/states/WorkflowExecutionStateControls.tsx` with:

```tsx
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
//

import { FC, useEffect, useRef, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import CloseSvg from '@/assets/icons/cross.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PlaySvg from '@/assets/icons/play.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import ContinueWithInputPopup from './ContinueWithInputPopup'
import WorkflowExecutionEditOutputForm from './WorkflowExecutionEditOutputForm'
import useExecutionsContext from '../hooks/useExecutionsContext'

interface WorkflowExecutionStateControlsProps {
  stateId: string | null
  className?: string
  small?: boolean
}

const WorkflowExecutionStateControls: FC<WorkflowExecutionStateControlsProps> = ({
  stateId,
  className,
  small,
}) => {
  const {
    workflowId,
    executionId,
    isResuming,
    executionStatus,
    resume,
    resumeWithMessage,
    refreshOutput,
  } = useExecutionsContext()
  const [isEditOutputPopupVisible, setIsEditOutputPopupVisible] = useState(false)
  const [isContinueDropdownOpen, setIsContinueDropdownOpen] = useState(false)
  const [isContinueWithMessagePopupVisible, setIsContinueWithMessagePopupVisible] = useState(false)
  const continueDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isContinueDropdownOpen) return () => {}
    const handleClickOutside = (e: MouseEvent) => {
      if (continueDropdownRef.current && !continueDropdownRef.current.contains(e.target as Node)) {
        setIsContinueDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isContinueDropdownOpen])

  const abortWorkflow = async () => {
    if (!workflowId || !executionId) return
    await workflowExecutionsStore.abortWorkflowExecution(workflowId, executionId)
    toaster.info('Workflow execution aborted')
  }

  const openContinueWithMessagePopup = () => {
    setIsContinueDropdownOpen(false)
    setIsContinueWithMessagePopupVisible(true)
  }

  const closeContinueWithMessagePopup = () => {
    setIsContinueWithMessagePopupVisible(false)
  }

  const closeEditOutputPopup = () => setIsEditOutputPopupVisible(false)

  const handleUpdate = () => {
    refreshOutput()
    closeEditOutputPopup()
  }

  const buttonClassname = small ? 'h-10 px-2.5 rounded-xl' : ''
  const iconClassname = small ? 'size-7' : ''

  const disabled = isResuming || executionStatus === 'In Progress'

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        <Button
          variant={ButtonType.DELETE}
          onClick={abortWorkflow}
          disabled={disabled}
          className={buttonClassname}
        >
          <CloseSvg className={iconClassname} />
          {!small && 'Abort'}
        </Button>

        <Button
          variant={ButtonType.SECONDARY}
          disabled={disabled}
          className={buttonClassname}
          onClick={() => {
            setIsEditOutputPopupVisible(true)
          }}
        >
          <EditSvg className={iconClassname} />
          {!small && 'Edit'}
        </Button>

        <div ref={continueDropdownRef} className="relative flex">
          <Button
            variant={ButtonType.PRIMARY}
            onClick={resume}
            disabled={disabled}
            className={cn(buttonClassname, 'rounded-r-none')}
          >
            <PlaySvg className={iconClassname} />
            {!small && 'Continue'}
          </Button>
          <span className="self-stretch w-px bg-white/20" />
          <Button
            variant={ButtonType.PRIMARY}
            disabled={disabled}
            className={cn(buttonClassname, 'rounded-l-none px-2')}
            onClick={() => setIsContinueDropdownOpen((prev) => !prev)}
            aria-label="Continue options"
          >
            <ChevronDownSvg className="size-3.5" />
          </Button>
          {isContinueDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 z-10 bg-surface-base-secondary py-1 rounded-md shadow-md px-1 min-w-max">
              <button
                className="flex w-full text-left text-sm px-2 py-2 rounded-md hover:bg-surface-specific-dropdown-hover hover:text-text-accent"
                onClick={openContinueWithMessagePopup}
              >
                Continue with message
              </button>
            </div>
          )}
        </div>
      </div>

      {workflowId && executionId && stateId && (
        <ContinueWithInputPopup
          visible={isContinueWithMessagePopupVisible}
          stateId={stateId}
          workflowId={workflowId}
          executionId={executionId}
          onHide={closeContinueWithMessagePopup}
          onContinue={(message, fileNames) => {
            resumeWithMessage(message, fileNames)
            closeContinueWithMessagePopup()
          }}
          isSubmitting={isResuming}
        />
      )}

      {workflowId && executionId && stateId && (
        <Popup
          hideFooter
          header="Edit Output"
          withBorder={false}
          dismissableMask={false}
          className="w-full max-w-4xl h-full"
          bodyClassName="pb-4 px-0 pt-0"
          visible={isEditOutputPopupVisible}
          onHide={closeEditOutputPopup}
        >
          <WorkflowExecutionEditOutputForm
            stateId={stateId}
            workflowId={workflowId}
            executionId={executionId}
            onUpdate={handleUpdate}
            onCancel={closeEditOutputPopup}
          />
        </Popup>
      )}
    </>
  )
}

export default WorkflowExecutionStateControls
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx tsc --noEmit
```

Expected: No errors from `WorkflowExecutionStateControls.tsx`.

- [ ] **Step 4: Commit**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
git add src/pages/workflows/details/states/WorkflowExecutionStateControls.tsx
git commit -m "EPMCDME-12393: Replace inline Continue popup with ContinueWithInputPopup"
```

---

## Task 9: [Frontend] Update `ChatPrompt.tsx` for HITL file upload

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:111-116` (canSubmit)
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:118-126` (handleSubmit)
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:234` (remove guard)

- [ ] **Step 1: Confirm current behaviour (compile-level "failing test")**

Run `npx tsc --noEmit` — the current call `chatGenerationStore.resumeWorkflowExecution(userInput)` compiles fine but passes no files (functional gap, not TS error). After this task the TS call signature will match and files will be forwarded.

- [ ] **Step 2: Update `canSubmit` to block submit during active uploads when interrupted**

In `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`, replace lines 111-116:

```ts
  const canSubmit = (() => {
    if (isInterrupted) return !isInProgress
    const hasFiles = !!files.length
    const hasPrompt = prompt.message.length > 0
    return (hasPrompt || hasFiles) && !fileUpload.hasActiveUploads && !isInProgress
  })()
```

With:

```ts
  const canSubmit = (() => {
    if (isInterrupted) return !isInProgress && !fileUpload.hasActiveUploads
    const hasFiles = !!files.length
    const hasPrompt = prompt.message.length > 0
    return (hasPrompt || hasFiles) && !fileUpload.hasActiveUploads && !isInProgress
  })()
```

- [ ] **Step 3: Update `handleSubmit` interrupted branch to pass files**

In `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`, replace lines 121-126:

```ts
    if (isInterrupted) {
      const userInput = prompt.message.trim() || undefined
      setPrompt({ message: '', messageRaw: '' })
      chatGenerationStore.resumeWorkflowExecution(userInput)
      return
    }
```

With:

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

- [ ] **Step 4: Show file upload when interrupted (remove `!isInterrupted &&` guard)**

In `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`, replace line 234:

```tsx
                  {!isInterrupted && <ChatPromptFileUpload {...fileUpload} files={files} />}
```

With:

```tsx
                  <ChatPromptFileUpload {...fileUpload} files={files} />
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run all unit tests to confirm no regressions**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
npm run test:unit
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
cd C:/Data/Projects/Codemie-epm/codemie-ui
git add src/pages/chat/components/ChatPrompt/ChatPrompt.tsx
git commit -m "EPMCDME-12393: Show file upload in HITL chat mode and pass files on resume"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|---|---|
| `file_names` added to `ResumeWorkflowExecutionRequest` | Task 1 |
| Resume router passes `file_names` to executor | Task 2 |
| `resumeExecutionFileNames` added to `ChatRequest` | Task 3 |
| `workflowExecutionsStore.resumeWorkflowExecution` accepts `fileNames` | Task 4 |
| `chatGenerationStore.resumeWorkflowExecution` accepts `fileNames` | Task 5 |
| `_prepareRequestData` includes `file_names` in resume body | Task 5 |
| `resumeWithMessage` signature updated in context + hook | Task 6 |
| New `ContinueWithInputPopup` component with output + file upload | Task 7 |
| `WorkflowExecutionStateControls` uses `ContinueWithInputPopup` | Task 8 |
| `ChatPrompt` shows file upload when interrupted | Task 9 |
| `ChatPrompt` passes files on resume submit | Task 9 |
| `ChatPrompt` blocks submit during active uploads when interrupted | Task 9 |

### Type consistency check

- `resumeWithMessage(message: string | undefined, fileNames: string[])` — defined in Task 6, consumed in Task 8 ✓
- `fileNames?: string[]` on both store methods — defined in Tasks 4 & 5 ✓
- `resumeExecutionFileNames?: string[]` on `ChatRequest` — defined in Task 3, used in Task 5 ✓
- `ContinueWithInputPopup` props `workflowId` + `executionId` — required, provided by `WorkflowExecutionStateControls` from context ✓

### Placeholder scan

No TBD, TODO, or incomplete sections. All code blocks are complete.
