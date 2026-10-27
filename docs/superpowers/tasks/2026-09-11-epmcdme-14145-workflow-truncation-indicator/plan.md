# Workflow Truncation Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface a visible warning indicator on the execution-detail drawer and chat/thread view when a workflow execution state's output was cut off by a model token limit (`truncated: true`).

**Architecture:** The backend state output endpoint now returns `{ output, finish_reason, truncated }`. The fix propagates in three layers: (1) extend the TypeScript type and widen the store method's return type; (2) update the drawer component to render a warning button in its existing `headerActionsTemplate` slot; (3) update the chat component to fetch truncation status via the same store method when the execution is terminal.

**Tech Stack:** TypeScript, React, Valtio, Vitest + React Testing Library.

> **Revision note (backend API change, Task 7)**: The backend later removed `finish_reason` from the API entirely; only `truncated` remains. Tasks 1–6 below are kept as the record of what shipped at the time and still mention `finish_reason` in their code samples, tests and tooltips. Task 7 at the end removes it everywhere and supersedes those parts, so read it alongside them. The code samples in Tasks 1–6 are not the current code.

## Global Constraints

- `truncated` is an optional field — absence (pre-backend-change states) must be treated as non-truncated; no visual change on those states. (`finish_reason` was also optional until Task 7 removed it.)
- `truncated` is an optional boolean — treat it as a standard truthy check (`!!result.truncated`). `false`, `undefined`, and `null` are all falsy and must not show the indicator.
- All Tailwind classes must use semantic design tokens (`text-feedback-warning`), not arbitrary values.
- SVG imports follow the `*Svg` convention: `import FooSvg from '@/assets/icons/foo.svg?react'`.
- No feature flags required for this story.
- Commit message prefix: `EPMCDME-14145:`.

---

### Task 1: Type layer, store fix, and caller compatibility

**Test-first: yes — store returns all three fields from the API response**

**Files:**
- Modify: `src/types/entity/workflow.ts` (add fields to `WorkflowExecutionState`, add `WorkflowExecutionStateOutput` interface)
- Modify: `src/store/workflowExecutions.ts:591-603` (widen return type and return full object)
- Modify: `src/pages/workflows/details/states/WorkflowExecutionEditOutputForm.tsx:36-38` (extract `.output`)
- Modify: `src/pages/workflows/details/states/ContinueWithInputPopup.tsx:69-71` (extract `.output`)
- Create: `src/store/__tests__/workflowExecutions.getStateOutput.test.ts`

**Interfaces:**
- Produces: `WorkflowExecutionStateOutput { output: string | null; finish_reason: string | null; truncated?: boolean }` exported from `src/types/entity/workflow.ts`
- Produces: `workflowExecutionsStore.getWorkflowExecutionStateOutput` returns `Promise<WorkflowExecutionStateOutput>`

- [ ] **Step 1: Write the failing store test**

Create `src/store/__tests__/workflowExecutions.getStateOutput.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '@/utils/api'

import { workflowExecutionsStore } from '../workflowExecutions'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

vi.mock('@/utils/helpers', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
  formatDateTime: vi.fn(),
}))

vi.mock('./workflows', () => ({ workflowsStore: {} }))
vi.mock('./utils/workflowExecutions', () => ({ mapPagination: vi.fn() }))

describe('workflowExecutionsStore.getWorkflowExecutionStateOutput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns output, finish_reason, and truncated from the API response', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        output: 'hello',
        finish_reason: 'length',
        truncated: true,
      }),
    })

    const result = await workflowExecutionsStore.getWorkflowExecutionStateOutput(
      'wf-1',
      'exec-1',
      'state-1'
    )

    expect(result).toEqual({ output: 'hello', finish_reason: 'length', truncated: true })
  })

  it('returns truncated: undefined when field is absent (backward-compatible state)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ output: 'old output' }),
    })

    const result = await workflowExecutionsStore.getWorkflowExecutionStateOutput(
      'wf-1',
      'exec-1',
      'state-1'
    )

    expect(result.output).toBe('old output')
    expect(result.truncated).toBeUndefined()
    expect(result.finish_reason).toBeUndefined()
  })

  it('calls the correct endpoint URL', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ output: null }),
    })

    await workflowExecutionsStore.getWorkflowExecutionStateOutput('wf-2', 'exec-3', 'state-4')

    expect(api.get).toHaveBeenCalledWith(
      'v1/workflows/wf-2/executions/exec-3/states/state-4/output',
      { skipErrorHandling: true }
    )
  })

  it('throws when the API call fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))

    await expect(
      workflowExecutionsStore.getWorkflowExecutionStateOutput('wf-1', 'exec-1', 'state-1')
    ).rejects.toThrow('network error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npm run test:unit -- --reporter=verbose workflowExecutions.getStateOutput
```

Expected: FAIL — `result` has no `finish_reason` or `truncated` (current code returns `data.output`).

- [ ] **Step 3: Add `WorkflowExecutionStateOutput` interface and extend `WorkflowExecutionState`**

In `src/types/entity/workflow.ts`, add after the existing imports block (before `WorkflowConfigHistoryItem`):

```typescript
export interface WorkflowExecutionStateOutput {
  output: string | null
  finish_reason: string | null
  truncated?: boolean
}
```

In the same file, add two optional fields to `WorkflowExecutionState` (currently lines 95–111):

```typescript
export interface WorkflowExecutionState {
  id: string
  date: string | null
  update_date: string | null
  execution_id: string
  name: string
  task: string | null
  status: WorkflowExecutionStatus
  started_at: string | null
  completed_at: string | null
  output: string | null
  error: string | null
  thoughts: Thought[]
  preceding_state_ids: string[] | null
  state_id: string | null
  iteration_number?: number | null
  finish_reason?: string | null
  truncated?: boolean
}
```

- [ ] **Step 4: Fix `getWorkflowExecutionStateOutput` in the store**

In `src/store/workflowExecutions.ts`, replace lines 591–603:

```typescript
// before
async getWorkflowExecutionStateOutput(workflowId, executionId, stateId) {
  try {
    const url = `v1/workflows/${workflowId}/executions/${executionId}/states/${stateId}/output`
    const response = await api.get(url, { skipErrorHandling: true })
    const data: { output: string | null } = await response.json()
    return data.output
  } catch (error) {
    console.error('Error getting workflow execution state output:', error)
    throw error
  }
},

// after
async getWorkflowExecutionStateOutput(workflowId, executionId, stateId) {
  try {
    const url = `v1/workflows/${workflowId}/executions/${executionId}/states/${stateId}/output`
    const response = await api.get(url, { skipErrorHandling: true })
    const data: WorkflowExecutionStateOutput = await response.json()
    return data
  } catch (error) {
    console.error('Error getting workflow execution state output:', error)
    throw error
  }
},
```

Add the import at the top of the store file (or confirm the type is imported from the types file). If `WorkflowExecutionStateOutput` is defined in `src/types/entity/workflow.ts`, add it to the existing workflow types import.

- [ ] **Step 5: Run test to verify it passes**

```
npm run test:unit -- --reporter=verbose workflowExecutions.getStateOutput
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Update `WorkflowExecutionEditOutputForm.tsx` caller**

The `fetchOutput` callback currently returns the raw store result as-is. After the type change it returns `WorkflowExecutionStateOutput` but `EditOutputForm` expects `() => Promise<string | null>`. Extract `.output`:

```typescript
// before
const fetchOutput = useCallback(async () => {
  return workflowExecutionsStore.getWorkflowExecutionStateOutput(workflowId, executionId, stateId)
}, [workflowId, executionId, stateId])

// after
const fetchOutput = useCallback(async () => {
  const result = await workflowExecutionsStore.getWorkflowExecutionStateOutput(workflowId, executionId, stateId)
  return result.output
}, [workflowId, executionId, stateId])
```

- [ ] **Step 7: Update `ContinueWithInputPopup.tsx` caller**

Find the `.then((output) => { if (!cancelled) setStateOutput(output) })` chain (around line 70) and extract `.output`:

```typescript
// before
workflowExecutionsStore
  .getWorkflowExecutionStateOutput(workflowId, executionId, stateId)
  .then((output) => {
    if (!cancelled) setStateOutput(output)
  })

// after
workflowExecutionsStore
  .getWorkflowExecutionStateOutput(workflowId, executionId, stateId)
  .then((result) => {
    if (!cancelled) setStateOutput(result.output)
  })
```

- [ ] **Step 8: Run type-check**

```
npm run type-check
```

Expected: zero errors. If the store's method signature needs an explicit return type annotation, add `Promise<WorkflowExecutionStateOutput>` to the method.

- [ ] **Step 9: Commit**

```bash
git add src/types/entity/workflow.ts src/store/workflowExecutions.ts \
  src/pages/workflows/details/states/WorkflowExecutionEditOutputForm.tsx \
  src/pages/workflows/details/states/ContinueWithInputPopup.tsx \
  src/store/__tests__/workflowExecutions.getStateOutput.test.ts
git commit -m "EPMCDME-14145: Extend WorkflowExecutionStateOutput type and fix store narrowing"
```

---

### Task 2: Drawer truncation indicator

**Test-first: yes — truncation warning button is visible when `truncated: true` is returned**

**Files:**
- Modify: `src/constants/workflows.ts` (add `TRUNCATION_TOOLTIP_PREFIX`)
- Modify: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx`
- Modify: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/__tests__/WorkflowStateOutput.test.tsx`

**Interfaces:**
- Consumes: `WorkflowExecutionStateOutput` from Task 1 (the store method now returns an object)
- Consumes: `TRUNCATION_TOOLTIP_PREFIX` from `src/constants/workflows.ts`

- [ ] **Step 1: Update existing mock return values in the test file**

The existing `beforeEach` and all per-test overrides in `WorkflowStateOutput.test.tsx` mock the store to return a plain string. They must return an object matching `WorkflowExecutionStateOutput` after Task 1. Update **every** `mockResolvedValue` call in that file:

```typescript
// In beforeEach — was:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Sample output')
// now (use the minimal old-backend shape as the default — no truncation fields):
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
  output: 'Sample output',
})

// In 'fetches and displays state output' — was:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Test output')
// now:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
  output: 'Test output',
  finish_reason: null,
  truncated: false,
})

// In 'displays empty string when output is null' — was:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue(null)
// now:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
  output: null,
  finish_reason: null,
  truncated: false,
})

// In 'displays output in text block within Raw tab' — was:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Raw text output')
// now:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
  output: 'Raw text output',
  finish_reason: null,
  truncated: false,
})

// In 'displays output in markdown within Markdown tab' — was:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('# Markdown output')
// now:
mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
  output: '# Markdown output',
  finish_reason: null,
  truncated: false,
})
```

- [ ] **Step 2: Add the warning SVG mock and new truncation test cases**

Add to the mock block at the top of `WorkflowStateOutput.test.tsx` (after the existing SVG mock):

```typescript
vi.mock('@/assets/icons/status-warning.svg?react', () => ({
  default: () => <svg data-testid="warning-icon" />,
}))
```

Append these test cases to the `describe('WorkflowStateOutput')` block:

```typescript
it('shows truncation warning when truncated is true', async () => {
  mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
    output: 'Partial answer',
    finish_reason: 'length',
    truncated: true,
  })

  renderWithContext(<WorkflowStateOutput {...defaultProps} />)

  await waitFor(() => {
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
  })
})

it('includes finish_reason in tooltip content when truncated is true', async () => {
  mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
    output: 'Partial answer',
    finish_reason: 'length',
    truncated: true,
  })

  renderWithContext(<WorkflowStateOutput {...defaultProps} />)

  await waitFor(() => {
    const warningButton = screen.getByTestId('warning-icon').closest('[data-tooltip-content]')
    expect(warningButton).toHaveAttribute(
      'data-tooltip-content',
      expect.stringContaining('finish_reason: length')
    )
  })
})

it('does not show truncation warning when truncated is false', async () => {
  mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
    output: 'Complete answer',
    finish_reason: null,
    truncated: false,
  })

  renderWithContext(<WorkflowStateOutput {...defaultProps} />)

  await waitFor(() => {
    expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
  })

  expect(screen.queryByTestId('warning-icon')).not.toBeInTheDocument()
})

it('does not show truncation warning when truncated and finish_reason are absent (old backend)', async () => {
  mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
    output: 'Old state output',
  })

  renderWithContext(<WorkflowStateOutput {...defaultProps} />)

  await waitFor(() => {
    expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
  })

  expect(screen.queryByTestId('warning-icon')).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run tests to verify they fail**

```
npm run test:unit -- --reporter=verbose WorkflowStateOutput
```

Expected: existing tests FAIL (mock return values are now objects but the component still reads the result as a string), new truncation tests FAIL (indicator not rendered yet).

- [ ] **Step 4: Add `TRUNCATION_TOOLTIP_PREFIX` constant**

In `src/constants/workflows.ts`, append after `WORKFLOW_OUTPUT_FORMATS`:

```typescript
export const TRUNCATION_TOOLTIP_PREFIX = 'Output may be incomplete — truncated by token limit'
```

- [ ] **Step 5: Rewrite `WorkflowStateOutput.tsx`**

Full replacement of `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx`:

```typescript
import { useEffect, useMemo, useState } from 'react'

import ExpandSvg from '@/assets/icons/expand.svg?react'
import StatusWarningSvg from '@/assets/icons/status-warning.svg?react'
import Button from '@/components/Button'
import CodeBlock from '@/components/CodeBlock'
import Markdown from '@/components/markdown/Markdown'
import TextBlock from '@/components/markdown/TextBlock'
import Popup from '@/components/Popup'
import Tabs from '@/components/Tabs'
import { Tab } from '@/components/Tabs/Tabs'
import { TRUNCATION_TOOLTIP_PREFIX } from '@/constants/workflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'

import useExecutionsContext from '../../hooks/useExecutionsContext'

interface WorkflowStateOutputProps {
  stateId: string
  stateName?: string
  stateUpdatedDate: string
  stateCompletedDate: string
  refreshKey: number
}

const WorkflowStateOutput = ({
  stateId,
  stateName,
  stateUpdatedDate,
  stateCompletedDate,
  refreshKey,
}: WorkflowStateOutputProps) => {
  const { workflowId, executionId } = useExecutionsContext()
  const [output, setOutput] = useState<string>('')
  const [truncated, setTruncated] = useState(false)
  const [finishReason, setFinishReason] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const getStateOutput = async () => {
      if (!workflowId || !executionId) return
      const result = await workflowExecutionsStore.getWorkflowExecutionStateOutput(
        workflowId,
        executionId,
        stateId
      )
      setOutput(result.output ?? '')
      setTruncated(!!result.truncated)
      setFinishReason(result.finish_reason ?? null)
    }

    getStateOutput()
  }, [stateId, workflowId, executionId, stateUpdatedDate, stateCompletedDate, refreshKey])

  const handleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const tooltipContent = finishReason
    ? `${TRUNCATION_TOOLTIP_PREFIX} (finish_reason: ${finishReason})`
    : TRUNCATION_TOOLTIP_PREFIX

  const headerActions = (
    <>
      {truncated ? (
        <Button
          variant="secondary"
          className="!px-2"
          data-tooltip-id="react-tooltip"
          data-tooltip-content={tooltipContent}
        >
          <StatusWarningSvg className="size-4 text-feedback-warning" />
        </Button>
      ) : null}
      <Button
        variant="secondary"
        className="!px-2"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Expand"
        onClick={handleExpand}
      >
        <ExpandSvg className="size-4" />
      </Button>
    </>
  )

  const tabs = useMemo<Tab<'raw' | 'preview'>[]>(
    () => [
      {
        id: 'raw',
        label: 'Raw',
        element: (
          <div className="bg-surface-base-secondary p-4 rounded-lg border border-border-structural w-full">
            <TextBlock text={output} />
          </div>
        ),
      },
      {
        id: 'preview',
        label: 'Markdown',
        element: (
          <div className="bg-surface-base-secondary w-full">
            <Markdown content={output} />
          </div>
        ),
      },
    ],
    [output]
  )

  const header = `Execution State Output${stateName ? ` for ${stateName}` : ''}`

  return (
    <div className="overflow-y-auto min-h-0 hide-scrollbar">
      <CodeBlock
        headerActionsLast
        title="Result"
        language="txt"
        downloadFilename="output"
        text={output}
        headerActionsTemplate={headerActions}
      />

      <Popup
        hideFooter
        header={header}
        visible={isExpanded}
        onHide={handleExpand}
        cancelText="Close"
        withBorder={false}
        className="max-w-4xl w-full"
        bodyClassName="pt-1 pb-4"
      >
        <Tabs tabs={tabs} />
      </Popup>
    </div>
  )
}

export default WorkflowStateOutput
```

- [ ] **Step 6: Run tests to verify they pass**

```
npm run test:unit -- --reporter=verbose WorkflowStateOutput
```

Expected: all tests PASS — existing tests pass with the updated mock values, new truncation tests pass.

- [ ] **Step 7: Run type-check**

```
npm run type-check
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
git add src/constants/workflows.ts \
  src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx \
  src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/__tests__/WorkflowStateOutput.test.tsx
git commit -m "EPMCDME-14145: Add truncation indicator to execution-detail drawer"
```

---

### Task 3: Chat truncation indicator

**Test-first: yes — truncation warning is visible in the chat message when `truncated: true` is returned**

**Files:**
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`
- Modify: `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx`

**Interfaces:**
- Consumes: `workflowExecutionsStore.getWorkflowExecutionStateOutput` from Task 1 (returns `WorkflowExecutionStateOutput`)
- Consumes: `TRUNCATION_TOOLTIP_PREFIX` from Task 2
- Consumes: `isTerminalExecution` — already computed in `ChatAiMessage` as `!!message.executionStatus && WORKFLOW_FINAL_STATUSES.includes(message.executionStatus)`
- Consumes: `message.workflowExecution?.workflow_id`, `message.executionId`, `message.stateId` from `ChatMessage`

- [ ] **Step 1: Add mock and new tests to `ChatAiMessage.test.tsx`**

Add after the existing `vi.mock('@/store/chats', ...)` block:

```typescript
const { mockWorkflowExecutionsStore } = vi.hoisted(() => ({
  mockWorkflowExecutionsStore: {
    getWorkflowExecutionStateOutput: vi.fn(),
  },
}))

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
}))

vi.mock('@/assets/icons/status-warning.svg?react', () => ({
  default: () => <svg data-testid="truncation-warning-icon" />,
}))
```

Add a new `beforeEach` reset inside the truncation-specific describe block, and append to the test file:

```typescript
describe('ChatAiMessage — workflow truncation indicator', () => {
  beforeEach(() => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
      output: 'Partial answer',
      finish_reason: 'length',
      truncated: true,
    })
  })

  it('shows truncation warning when execution is terminal and truncated is true', async () => {
    const message = createMessage({
      executionStatus: 'Succeeded',
      stateId: 'state-1',
      executionId: 'exec-1',
      workflowExecution: { id: 'exec-1', workflow_id: 'wf-1' },
    })

    renderMessage(message)

    await waitFor(() => {
      expect(screen.getByTestId('truncation-warning-icon')).toBeInTheDocument()
    })
  })

  it('does not call getWorkflowExecutionStateOutput when stateId is absent', () => {
    const message = createMessage({
      executionStatus: 'Succeeded',
      stateId: null,
      executionId: 'exec-1',
      workflowExecution: { id: 'exec-1', workflow_id: 'wf-1' },
    })

    renderMessage(message)

    expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).not.toHaveBeenCalled()
  })

  it('does not call getWorkflowExecutionStateOutput when execution is not terminal', () => {
    const message = createMessage({
      executionStatus: 'In Progress',
      stateId: 'state-1',
      executionId: 'exec-1',
      workflowExecution: { id: 'exec-1', workflow_id: 'wf-1' },
    })

    renderMessage(message)

    expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).not.toHaveBeenCalled()
  })

  it('does not show truncation warning when truncated is false', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue({
      output: 'Complete answer',
      finish_reason: null,
      truncated: false,
    })

    const message = createMessage({
      executionStatus: 'Succeeded',
      stateId: 'state-1',
      executionId: 'exec-1',
      workflowExecution: { id: 'exec-1', workflow_id: 'wf-1' },
    })

    renderMessage(message)

    // Wait for the effect to run
    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalled()
    })

    expect(screen.queryByTestId('truncation-warning-icon')).not.toBeInTheDocument()
  })

  it('does not show truncation warning when fetch fails', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockRejectedValue(
      new Error('network error')
    )

    const message = createMessage({
      executionStatus: 'Succeeded',
      stateId: 'state-1',
      executionId: 'exec-1',
      workflowExecution: { id: 'exec-1', workflow_id: 'wf-1' },
    })

    renderMessage(message)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalled()
    })

    expect(screen.queryByTestId('truncation-warning-icon')).not.toBeInTheDocument()
  })

  it('tooltip includes finish_reason value', async () => {
    const message = createMessage({
      executionStatus: 'Succeeded',
      stateId: 'state-1',
      executionId: 'exec-1',
      workflowExecution: { id: 'exec-1', workflow_id: 'wf-1' },
    })

    renderMessage(message)

    await waitFor(() => {
      const indicator = screen.getByTestId('truncation-warning-icon').closest('[data-tooltip-content]')
      expect(indicator).toHaveAttribute(
        'data-tooltip-content',
        expect.stringContaining('finish_reason: length')
      )
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm run test:unit -- --reporter=verbose ChatAiMessage
```

Expected: new truncation tests FAIL — `truncation-warning-icon` not found, mock not called.

- [ ] **Step 3: Implement the truncation indicator in `ChatAiMessage.tsx`**

Add these imports at the top (after existing imports):

```typescript
import StatusWarningSvg from '@/assets/icons/status-warning.svg?react'
import { TRUNCATION_TOOLTIP_PREFIX } from '@/constants/workflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
```

Add local state after the existing `useState` declarations (around line 78–83):

```typescript
const [outputTruncated, setOutputTruncated] = useState(false)
const [outputFinishReason, setOutputFinishReason] = useState<string | null>(null)
```

Add a `useEffect` after the existing `useLayoutEffect` (around line 208–213):

```typescript
useEffect(() => {
  const workflowId = message.workflowExecution?.workflow_id
  if (!isTerminalExecution || !message.stateId || !message.executionId || !workflowId) return

  workflowExecutionsStore
    .getWorkflowExecutionStateOutput(workflowId, message.executionId, message.stateId)
    .then((result) => {
      setOutputTruncated(!!result.truncated)
      setOutputFinishReason(result.finish_reason ?? null)
    })
    .catch(() => {
      // non-fatal: indicator simply does not show
    })
}, [
  message.stateId,
  message.executionId,
  message.workflowExecution?.workflow_id,
  isTerminalExecution,
])
```

Add the indicator JSX in the component's return, immediately after the `<Markdown>` block that renders `markdownContent` and before `ChatAiMessageActions`. Locate the `<Markdown content={markdownContent} />` line in the JSX and add after it:

```typescript
{outputTruncated ? (
  <div
    className="flex items-center gap-1.5 text-xs text-feedback-warning mt-1"
    data-tooltip-id="react-tooltip"
    data-tooltip-content={
      outputFinishReason
        ? `${TRUNCATION_TOOLTIP_PREFIX} (finish_reason: ${outputFinishReason})`
        : TRUNCATION_TOOLTIP_PREFIX
    }
  >
    <StatusWarningSvg className="size-3.5" />
    <span>Output may be incomplete</span>
  </div>
) : null}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm run test:unit -- --reporter=verbose ChatAiMessage
```

Expected: all tests PASS — new truncation tests pass, existing tests unaffected.

- [ ] **Step 5: Run type-check**

```
npm run type-check
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx \
  src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx
git commit -m "EPMCDME-14145: Add truncation indicator to chat/thread view"
```

---

## Follow-up tasks (post code-review, shipped)

Tasks 1–3 above landed as commits `b8ebf2bc4`, `11a7c27d8`, `23b6d8383`, followed by a code-review fixup (`b2277d09f`) and a planning/review-artifact commit (`6f6d9d041`). Three more commits then reworked the drawer and chat surfaces beyond the original design; they are documented here as Tasks 4–6 since they changed files and architecture the original spec did not anticipate. All steps below are already implemented — checkboxes reflect the shipped state, not a to-do list.

### Task 4: `headerBadge` on `CodeBlock` + drawer state-list indicator

**Commit:** `d28f22732` — "Add headerBadge to CodeBlock and truncation indicator UI"

**Why:** The output panel's warning badge (Task 2) sat inside `headerActionsTemplate` alongside the Expand button, mixing a status indicator into a slot meant for actions. Separately, the state **list** (`WorkflowDrawerListItem`) had no truncation signal at all, even though each list item already carries `truncated` / `finish_reason` on its `ExtendedWorkflowExecutionState`.

**Files:**
- Modified: `src/components/CodeBlock/CodeBlock.tsx` — new `headerBadge?: ReactNode` prop, rendered next to the title in a `flex flex-wrap gap-2` wrapper, separate from the actions row.
- Modified: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerList/WorkflowDrawerList.tsx` — passes `truncated={state.truncated}` / `finishReason={state.finish_reason ?? null}` to each `WorkflowDrawerListItem`.
- Modified: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerList/WorkflowDrawerListItem.tsx` — new `truncated?` / `finishReason?` props; renders a warning `<span>` with `StatusWarningSvg` + tooltip in the row (inline markup at this point, not yet the shared component); forwards both props recursively to nested items.
- Modified: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx` — split the old `headerActions` fragment into a separate `warningBadge` (now passed as `headerBadge`) and `expandButton` (still `headerActionsTemplate`).
- Added: `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx` coverage for `headerBadge`.
- Added: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerList/__tests__/WorkflowDrawerListItem.test.tsx`.
- Extended: `WorkflowStateOutput.test.tsx` for the new `headerBadge`-based rendering.

- [x] Add `headerBadge` prop to `CodeBlock`, rendered beside the title, independent of `headerActionsTemplate`.
- [x] Thread `truncated` / `finish_reason` from `ExtendedWorkflowExecutionState` through `WorkflowDrawerList` into `WorkflowDrawerListItem` (including nested items).
- [x] Render the warning icon + tooltip in `WorkflowDrawerListItem`'s row.
- [x] Move `WorkflowStateOutput`'s warning badge from `headerActionsTemplate` to `headerBadge`.
- [x] Add/extend tests for `CodeBlock`, `WorkflowDrawerListItem`, and `WorkflowStateOutput`.
- [x] Type-check and unit tests pass.

---

### Task 5: Extract shared `TruncationBadge` component

**Commit:** `bca4030af` — "Extract shared TruncationBadge component"

**Why:** Task 4 left the same icon/tooltip markup duplicated between `WorkflowDrawerListItem` and `WorkflowStateOutput`. Task 6 (below) was about to add a third call site in the chat surface, so the markup was extracted first.

**Files:**
- Added: `src/components/TruncationBadge/TruncationBadge.tsx` — `{ truncated?, finishReason?, className? }` props; returns `null` when `!truncated`; builds the tooltip from `TRUNCATION_TOOLTIP_PREFIX`; default icon size `size-3.5`, overridable via `className`.
- Added: `src/components/TruncationBadge/index.ts` — re-exports the default.
- Added: `src/components/TruncationBadge/__tests__/TruncationBadge.test.tsx`.
- Modified: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerList/WorkflowDrawerListItem.tsx` — replaced the inline `<span>`/`StatusWarningSvg` markup with `<TruncationBadge truncated={truncated} finishReason={finishReason} className="size-4" />`.
- Modified: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx` — same replacement for `warningBadge`.
- Modified: `src/components/Thought/Thought.tsx` — new `headerBadge?: ReactNode` prop, forwarded to `ThoughtHeader`.
- Modified: `src/components/Thought/ThoughtHeader.tsx` — new `headerBadge?: ReactNode` prop, rendered next to `ThoughtStatus`.
- Extended: `Thought.test.tsx`, `ThoughtHeader.test.tsx` for the new prop.

- [x] Create `TruncationBadge` — self-guarding (`if (!truncated) return null`), single source of the tooltip string and icon.
- [x] Replace both existing inline badge implementations with `TruncationBadge`.
- [x] Add a `headerBadge` slot to `Thought` / `ThoughtHeader` in preparation for the chat surface (Task 6) to use the same component.
- [x] Add/extend tests for `TruncationBadge`, `Thought`, `ThoughtHeader`.
- [x] Type-check and unit tests pass.

---

### Task 6: Drive the chat indicator from `Thought` fields instead of a per-message fetch

**Commit:** `226a0acb4` — "Drive chat truncation indicator from Thought fields"

**Why:** Task 3's `ChatAiMessage` effect fetched `getWorkflowExecutionStateOutput` per rendered message once the execution reached a terminal status — a network round-trip per message for a value the backend already streams on each `Thought`. This task removes that fetch and reads `finish_reason` / `truncated` directly off each thought, using the `headerBadge` slot Task 5 added to `Thought`.

**Files:**
- Modified: `src/types/entity/conversation.ts` — `Thought` and `ThoughtBackend` both gain `finish_reason?: string | null` and `truncated?: boolean`.
- Modified: `src/utils/chatHelpers.ts` (`transformHistoryGroup`) — maps `finish_reason: thought.finish_reason ?? null` and `truncated: thought.truncated ?? false` from `ThoughtBackend` when hydrating history.
- Modified: `src/store/chatGeneration.ts` — on a streamed thought update matching an existing thought by id, merges `finish_reason` / `truncated` the same way `interrupted` / `aborted` / `routing` are already merged.
- Modified: `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — removed the `useEffect` that called `getWorkflowExecutionStateOutput`, the `outputTruncated` / `outputFinishReason` state, the `workflowExecutionsStore` import, and the standalone warning `<div>` below the markdown block. Each `<Thought thought={thought} />` render now passes `headerBadge={<TruncationBadge truncated={thought.truncated} finishReason={thought.finish_reason} />}`.
- Extended: `src/store/__tests__/chatGeneration.test.ts`, `src/utils/__tests__/chatHelpers.test.ts` for the new field propagation.
- Rewrote: `ChatAiMessage.test.tsx` — replaced the fetch-mock-based truncation tests with tests that set `truncated` / `finish_reason` directly on the message's thoughts.

- [x] Add `finish_reason` / `truncated` to `Thought` and `ThoughtBackend`.
- [x] Hydrate both fields from history in `chatHelpers.transformHistoryGroup`.
- [x] Merge both fields on streamed thought updates in `chatGeneration`.
- [x] Remove the fetch-based effect, its local state, and the standalone warning markup from `ChatAiMessage`.
- [x] Render `TruncationBadge` as each `Thought`'s `headerBadge`, keyed off the thought's own fields.
- [x] Update/replace tests in `ChatAiMessage.test.tsx`, `chatGeneration.test.ts`, `chatHelpers.test.ts`.
- [x] Type-check and unit tests pass.

---

### Task 7: Remove `finish_reason`; clear `truncated` on output edit

**Commit:** `9a94009ee` — "EPMCDME-14145: Remove finish_reason and clear truncated on output edit"

**Why:** The backend no longer returns `finish_reason` anywhere (it cannot supply a provider reason now). Only `truncated` (boolean, default `false`) remains, in the output endpoint (`{ output, truncated }`), execution state responses, conversation-history thoughts, the `STATE_FINISH` stream event (`workflow_state.truncated`) and the node-end thought (`thought.truncated`). The badge must show when `truncated === true` and nothing else. Editing a state's output also clears the flag on the backend, so a thought already streamed into the chat must have its local flag cleared when the user saves an edit; the drawer and chat history pick it up on the next fetch or reload. Existing rows get `truncated = false` through the migration default.

**Files:**
- Modified: `src/types/entity/workflow.ts` — removed `finish_reason` from `WorkflowExecutionState` and `WorkflowExecutionStateOutput` (now `{ output, truncated? }`).
- Modified: `src/types/entity/conversation.ts` — removed `finish_reason` from `Thought` and `ThoughtBackend`.
- Modified: `src/utils/chatHelpers.ts` — `transformHistoryGroup` no longer maps `finish_reason`.
- Modified: `src/store/chatGeneration.ts` — dropped the `finish_reason` merge in the streamed thought update; `updateWorkflowChatOutput` now sets `truncated = false` on interrupted thoughts of the last message after the update call succeeds.
- Modified: `src/components/TruncationBadge/TruncationBadge.tsx` — removed the `finishReason` prop; the tooltip is always `TRUNCATION_TOOLTIP_PREFIX`.
- Modified: `ChatAiMessage.tsx`, `WorkflowDrawerList.tsx`, `WorkflowDrawerListItem.tsx`, `WorkflowStateOutput.tsx` — stop passing or holding `finishReason`.
- Updated tests: `TruncationBadge.test.tsx`, `chatHelpers.test.ts`, `chatGeneration.test.ts`, `workflowExecutions.getStateOutput.test.ts`, `ChatAiMessage.test.tsx`, `WorkflowStateOutput.test.tsx`, `WorkflowDrawerListItem.test.tsx`, `ContinueWithInputPopup.test.tsx` — dropped `finish_reason` fixtures and the tooltip-suffix assertions; tooltip tests now assert the plain `TRUNCATION_TOOLTIP_PREFIX`.
- Added tests: `chatGeneration.test.ts` (`updateWorkflowChatOutput` clears `truncated` on interrupted thoughts only, and leaves it when the save fails); `WorkflowStateOutput.test.tsx` (a refetch returning `truncated: false` removes the badge).

**Design notes:**
- The local clear targets `thought.interrupted` thoughts because the edit applies to the interrupted state; other thoughts keep their flag.
- The clear runs after the awaited `updateWorkflowExecutionStateOutput`, so a failed save leaves the badge in place.
- No local clear is needed in the drawer: `WorkflowStateOutput` and the state list refetch and receive `truncated: false` from the backend.

- [x] Remove `finish_reason` from the types, history hydration, streamed-thought merge, `TruncationBadge` and all four call sites.
- [x] Make the tooltip the plain `TRUNCATION_TOOLTIP_PREFIX` on all three surfaces.
- [x] Clear `truncated` on interrupted thoughts after a successful `updateWorkflowChatOutput`.
- [x] Update the existing tests and add the clear-on-edit and refetch-clears-badge tests.
- [x] `npm run typecheck` and ESLint on the changed files pass; the touched unit test files pass.
- [ ] Before the MR: run `npm run test-harness` and fill the MR template's `## Test harness` and `## Verified locally` sections (not done yet).
