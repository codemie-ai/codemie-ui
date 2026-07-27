# EPMCDME-8527 — Simplified screenreader workflow status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the VoiceOver-specific `executionStatusAnnouncer` singleton with `role="status"` added directly on `StatusBadge`, removing all timer/DOM/focus-blur complexity.

**Architecture:** Add `role="status"` and `aria-label={text}` unconditionally to both `StatusBadge` implementations (directory and flat-file variants). Delete the `executionStatusAnnouncer` module and strip all references to it from `WorkflowExecutions` and `WorkflowStartExecutionPopup`.

**Tech Stack:** React 18, TypeScript, Vitest, @testing-library/react, Tailwind CSS

## Global Constraints

- All new/modified `.tsx`/`.ts` files must carry the Apache 2.0 license header (lines 1–14 of every existing source file in this repo).
- Test files import from `vitest` (not jest). Use `describe`/`it`/`expect`/`vi`.
- `npm test` = `vitest run` (all tests). Run a specific file with `npx vitest run <path>`.
- Do not run `npm test` for all tests during implementation — run only the file under test to keep feedback fast.
- No new npm dependencies.
- `vite.config.ts` is modified locally (build fix) — do not stage or commit it.

---

### Task 1: Add `role="status"` to StatusBadge + tests (TDD)

**Files:**
- Create: `src/components/StatusBadge/__tests__/StatusBadge.test.tsx`
- Modify: `src/components/StatusBadge/StatusBadge.tsx`
- Modify: `src/components/StatusBadge.tsx`

**Interfaces:**
- Consumes: `StatusBadge` default export + `StatusEnum` named export from `../StatusBadge`
- Produces: `StatusBadge` renders `role="status"` and `aria-label={text}` on its wrapper `<div>` — no prop changes, fully backwards-compatible

- [ ] **Step 1: Write the failing tests**

Create `src/components/StatusBadge/__tests__/StatusBadge.test.tsx`:

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

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import StatusBadge, { StatusEnum } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders with role="status"', () => {
    render(<StatusBadge status={StatusEnum.InProgress} text="In Progress" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('sets aria-label to the text prop', () => {
    render(<StatusBadge status={StatusEnum.InProgress} text="In Progress" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'In Progress')
  })

  it('does not set aria-label when text is not provided', () => {
    render(<StatusBadge status={StatusEnum.Success} />)
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-label')
  })

  it('applies correct container class for InProgress status', () => {
    render(<StatusBadge status={StatusEnum.InProgress} text="In Progress" />)
    expect(screen.getByRole('status')).toHaveClass('bg-in-progress-tertiary')
  })
})
```

- [ ] **Step 2: Run tests — verify RED**

```bash
npx vitest run src/components/StatusBadge/__tests__/StatusBadge.test.tsx
```

Expected: 4 FAIL — `Unable to find role="status"` (the wrapper `<div>` has no role yet).

- [ ] **Step 3: Add `role="status"` to `src/components/StatusBadge/StatusBadge.tsx`**

Replace only the `return` block (lines 68–73):

```tsx
  return (
    <div role="status" aria-label={text} className={badgeClasses}>
      <div className={dotClasses}></div>
      {text}
    </div>
  )
```

- [ ] **Step 4: Add `role="status"` to `src/components/StatusBadge.tsx` (flat-file variant)**

Replace only the `return` block (the flat file's `StatusBadge` component's return statement):

```tsx
  return (
    <div
      role="status"
      aria-label={text}
      className={cn(
        'flex flex-row items-center gap-1.5 px-2 rounded-full',
        'uppercase font-bold font-geist-mono text-[10px] w-fit select-none',
        'whitespace-nowrap h-[17px] leading-[17px] border',
        styles.container
      )}
    >
      <span className={cn('rounded-full w-[7px] h-[7px] inline-block', styles.dot)} />
      {text}
    </div>
  )
```

- [ ] **Step 5: Run tests — verify GREEN**

```bash
npx vitest run src/components/StatusBadge/__tests__/StatusBadge.test.tsx
```

Expected: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/StatusBadge/__tests__/StatusBadge.test.tsx \
        src/components/StatusBadge/StatusBadge.tsx \
        src/components/StatusBadge.tsx
git commit -m "fix(a11y): add role=status and aria-label to StatusBadge"
```

---

### Task 2: Delete `executionStatusAnnouncer` and clean up `WorkflowExecutions` (TDD)

**Files:**
- Modify: `src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutions.test.tsx`
- Modify: `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutions.tsx`
- Delete: `src/pages/workflows/details/utils/executionStatusAnnouncer.ts`
- Delete: `src/pages/workflows/details/utils/__tests__/executionStatusAnnouncer.test.ts`

**Interfaces:**
- Consumes: nothing from `executionStatusAnnouncer` (it is deleted)
- Produces: `WorkflowExecutions` renders without any announcer dependency

- [ ] **Step 1: Rewrite the test file (remove all announcer mocks and tests)**

Replace `src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutions.test.tsx` in full:

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

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WorkflowExecutions from '../WorkflowExecutions'

const { mockUseSnapshot } = vi.hoisted(() => ({ mockUseSnapshot: vi.fn() }))
vi.mock('valtio', () => ({ useSnapshot: (...args: unknown[]) => mockUseSnapshot(...args) }))

const { mockUseExecutionsCtx } = vi.hoisted(() => ({
  mockUseExecutionsCtx: vi.fn().mockReturnValue({ workflowId: 'wf-1', executionId: null }),
}))
vi.mock('../../hooks/useExecutionsContext', () => ({
  default: (...args: unknown[]) => mockUseExecutionsCtx(...args),
}))

vi.mock('@/hooks/usePolling', () => ({ usePolling: vi.fn() }))
vi.mock('@/hooks/useInfiniteScroll', () => ({ useInfiniteScroll: () => ({ current: null }) }))
vi.mock('../../hooks/useExecutionGroups', () => ({
  useExecutionGroups: vi.fn().mockReturnValue({
    latestExecutions: [],
    laterExecutions: [],
    otherExecutions: [],
  }),
}))
vi.mock('../WorkflowExecutionsList', () => ({ default: () => null }))
vi.mock('@/components/Sidebar/SidebarToggle', () => ({ default: () => null }))
vi.mock('@/components/Spinner', () => ({ default: () => null }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: {} }))

describe('WorkflowExecutions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSnapshot.mockReturnValue({
      sidebarExpanded: true,
      executions: [],
      executionsPagination: { totalCount: 0 },
      isLoadingMoreExecutions: false,
      hasMoreExecutions: false,
    })
  })

  it('renders without crashing', () => {
    const { container } = render(<WorkflowExecutions />)
    expect(container.firstChild).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test — verify RED**

```bash
npx vitest run src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutions.test.tsx
```

Expected: FAIL — the component still imports from `executionStatusAnnouncer` which is now unmocked (the old `vi.mock` block was removed). Error will be something like `Failed to resolve import "../../utils/executionStatusAnnouncer"` or similar module resolution failure — this confirms the test is correctly coupled to the upcoming component change.

- [ ] **Step 3: Rewrite `WorkflowExecutions.tsx` (strip all announcer code)**

Replace `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutions.tsx` in full:

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

import { useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import SidebarToggle from '@/components/Sidebar/SidebarToggle'
import Spinner from '@/components/Spinner'
import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { usePolling } from '@/hooks/usePolling'
import { appInfoStore } from '@/store/appInfo'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { cn } from '@/utils/utils'

import WorkflowExecutionsList from './WorkflowExecutionsList'
import { useExecutionGroups } from '../hooks/useExecutionGroups'
import useExecutionsContext from '../hooks/useExecutionsContext'

const WorkflowExecutions = () => {
  const { workflowId, executionId } = useExecutionsContext()
  const { sidebarExpanded } = useSnapshot(appInfoStore)
  const { executions, executionsPagination, isLoadingMoreExecutions, hasMoreExecutions } =
    useSnapshot(workflowExecutionsStore) as typeof workflowExecutionsStore

  usePolling({
    enabled: useMemo(() => {
      return executions.some(
        (ex) => !WORKFLOW_FINAL_STATUSES.includes(ex.overall_status) && ex.id !== executionId
      )
    }, [executions, executionId]),
    fetchFn: useCallback(
      () => workflowExecutionsStore.refreshExecutions(workflowId!),
      [workflowId]
    ),
  })

  const sentinelRef = useInfiniteScroll({
    enabled: true,
    isLoading: isLoadingMoreExecutions,
    hasMore: hasMoreExecutions,
    onLoadMore: () => {
      workflowExecutionsStore.loadMoreExecutions(workflowId!)
    },
  })

  const executionGroups = useExecutionGroups(executions, executionsPagination.totalCount)

  const hasExecutions = !!(
    executionGroups.laterExecutions.length ||
    executionGroups.latestExecutions.length ||
    executionGroups.otherExecutions.length
  )

  return (
    <aside
      className={cn(
        'transition-all shrink-0 duration-150 overflow-x-hidden border-border-specific-sidebar border-r bg-sidebar-gradient',
        sidebarExpanded ? 'w-workflow-exec-sidebar' : 'w-0'
      )}
    >
      <div className="flex flex-col w-workflow-exec-sidebar max-h-full h-full">
        <h2 className="pt-4 pb-3 pl-2 font-semibold mx-4">Workflow Execution History</h2>
        {!hasExecutions && (
          <h3 className="text-text-secondary text-sm mx-auto mt-[10%]">No Executions Yet</h3>
        )}

        <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain max-h-full show-scroll px-4 pb-4">
          <WorkflowExecutionsList
            title="Last 7 days"
            executions={executionGroups.latestExecutions}
          />

          <WorkflowExecutionsList
            title="Last 30 days"
            executions={executionGroups.laterExecutions}
          />

          <WorkflowExecutionsList title="Earlier" executions={executionGroups.otherExecutions} />

          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading indicator */}
          {isLoadingMoreExecutions && <Spinner className="w-6 h-6" rootClassName="py-4 min-h-0" />}
        </div>
      </div>

      <SidebarToggle />
    </aside>
  )
}

export default WorkflowExecutions
```

- [ ] **Step 4: Delete the announcer module and its test**

```bash
git rm src/pages/workflows/details/utils/executionStatusAnnouncer.ts
git rm src/pages/workflows/details/utils/__tests__/executionStatusAnnouncer.test.ts
```

- [ ] **Step 5: Run tests — verify GREEN**

```bash
npx vitest run src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutions.test.tsx
```

Expected: 1 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutions.test.tsx \
        src/pages/workflows/details/WorkflowExecutions/WorkflowExecutions.tsx
git commit -m "fix(a11y): remove executionStatusAnnouncer, simplify WorkflowExecutions"
```

---

### Task 3: Simplify `WorkflowStartExecutionPopup` (TDD)

**Files:**
- Modify: `src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.test.tsx`
- Modify: `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx`

**Interfaces:**
- Consumes: nothing from `executionStatusAnnouncer` (deleted in Task 2)
- Produces: `WorkflowStartExecutionPopup` with simplified `handleHide` and `handleSubmit`, no announcer refs

- [ ] **Step 1: Rewrite the test file (remove announcer mocks + announcement integration block, keep all other tests)**

Replace `src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.test.tsx` in full:

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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import WorkflowStartExecutionPopup from '../WorkflowStartExecutionPopup'

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    createWorkflowExecution: vi.fn().mockResolvedValue({
      workflow_id: 'wf-1',
      execution_id: 'exec-1',
      overall_status: 'In Progress',
    }),
  },
}))

vi.mock('@/components/Editor/Editor', () => ({
  default: ({ onChange, placeholder, onSubmit }: any) => (
    <textarea
      placeholder={placeholder}
      onChange={(e) => onChange({ message: e.target.value, messageRaw: e.target.value })}
      onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
    />
  ),
}))

const mockUseFileUpload = vi.fn((_config?: any) => ({
  inputProps: {},
  addFiles: vi.fn(),
  removeFile: vi.fn(),
  openFilePicker: vi.fn(),
  hasActiveUploads: false,
}))

vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: (config: any) => mockUseFileUpload(config),
  createFileMetadata: vi.fn((url: string) => ({ fileName: url, fileId: url, isUploading: false })),
}))

vi.mock('@/components/Popup', () => ({
  default: ({ children, visible, onHide, submitDisabled, submitText = 'Create', onSubmit }: any) =>
    visible ? (
      <dialog open>
        <button onClick={onHide}>close</button>
        {children}
        <button disabled={submitDisabled} onClick={onSubmit}>
          {submitText}
        </button>
      </dialog>
    ) : null,
}))

vi.mock('@/components/File', () => ({
  default: ({ file, onRemove }: any) => (
    <div data-testid="file-chip">
      {file.fileName}
      <button onClick={onRemove}>remove</button>
    </div>
  ),
}))

vi.mock('@/components/Spinner', () => ({ default: () => <div>loading...</div> }))

vi.mock('@/assets/icons/attachment.svg?react', () => ({ default: () => <span>attach-icon</span> }))

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChanges: vi.fn(() => ({
    unblockTransition: vi.fn(),
    blockTransition: vi.fn(),
  })),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({
    name: 'some-route',
    push: vi.fn(),
    replace: vi.fn(),
  })),
}))

vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn() } }))

describe('WorkflowStartExecutionPopup', () => {
  const defaultProps = {
    workflowId: 'wf-1',
    isVisible: true,
    onHide: vi.fn(),
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    const { workflowExecutionsStore } = await import('@/store/workflowExecutions')
    ;(workflowExecutionsStore.createWorkflowExecution as any).mockResolvedValue({
      workflow_id: 'wf-1',
      execution_id: 'exec-1',
      overall_status: 'In Progress',
    })
    mockUseFileUpload.mockReturnValue({
      inputProps: {},
      addFiles: vi.fn(),
      removeFile: vi.fn(),
      openFilePicker: vi.fn(),
      hasActiveUploads: false,
    })
  })

  it('renders the popup when isVisible is true', () => {
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when isVisible is false', () => {
    render(<WorkflowStartExecutionPopup {...defaultProps} isVisible={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('clicking attach button calls openFilePicker', () => {
    const openFilePicker = vi.fn()
    mockUseFileUpload.mockReturnValue({
      inputProps: {},
      addFiles: vi.fn(),
      removeFile: vi.fn(),
      openFilePicker,
      hasActiveUploads: false,
    })
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /attach/i }))
    expect(openFilePicker).toHaveBeenCalledTimes(1)
  })

  it('disables Create button when hasActiveUploads is true', () => {
    mockUseFileUpload.mockReturnValue({
      inputProps: {},
      addFiles: vi.fn(),
      removeFile: vi.fn(),
      openFilePicker: vi.fn(),
      hasActiveUploads: true,
    })
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('Create button is enabled when hasActiveUploads is false', () => {
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    expect(screen.getByRole('button', { name: /create/i })).not.toBeDisabled()
  })

  it('disables Create button when isLoading is true', async () => {
    const { workflowExecutionsStore } = await import('@/store/workflowExecutions')
    ;(workflowExecutionsStore.createWorkflowExecution as any).mockImplementation(
      () => new Promise(() => {})
    )
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    })
  })

  it('pressing Enter does not submit when hasActiveUploads is true', async () => {
    const { workflowExecutionsStore } = await import('@/store/workflowExecutions')
    mockUseFileUpload.mockReturnValue({
      inputProps: {},
      addFiles: vi.fn(),
      removeFile: vi.fn(),
      openFilePicker: vi.fn(),
      hasActiveUploads: true,
    })
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    fireEvent.keyDown(screen.getByPlaceholderText('Enter a starting prompt'), { key: 'Enter' })
    expect(workflowExecutionsStore.createWorkflowExecution).not.toHaveBeenCalled()
  })

  it('submits with correct workflowId and empty file_names when no files attached', async () => {
    const { workflowExecutionsStore } = await import('@/store/workflowExecutions')
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(workflowExecutionsStore.createWorkflowExecution).toHaveBeenCalledWith('wf-1', '', [])
    })
  })

  it('submits with file_names from initialFiles', async () => {
    const { workflowExecutionsStore } = await import('@/store/workflowExecutions')
    render(
      <WorkflowStartExecutionPopup {...defaultProps} initialFiles={['file-id-1', 'file-id-2']} />
    )
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(workflowExecutionsStore.createWorkflowExecution).toHaveBeenCalledWith('wf-1', '', [
        'file-id-1',
        'file-id-2',
      ])
    })
  })

  it('keeps Spinner mounted after Create success (setIsLoading false not called on success)', async () => {
    const { workflowExecutionsStore } = await import('@/store/workflowExecutions')
    ;(workflowExecutionsStore.createWorkflowExecution as any).mockResolvedValue({
      workflow_id: 'wf-1',
      execution_id: 'exec-1',
      overall_status: 'In Progress',
    })

    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() =>
      expect(workflowExecutionsStore.createWorkflowExecution).toHaveBeenCalled()
    )

    expect(screen.getByText('loading...')).toBeInTheDocument()
  })

  it('does not keep Spinner on Create error', async () => {
    const { workflowExecutionsStore } = await import('@/store/workflowExecutions')
    ;(workflowExecutionsStore.createWorkflowExecution as any).mockRejectedValue(
      new Error('API failure')
    )

    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    vi.clearAllMocks()
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => expect(screen.queryByText('loading...')).not.toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run tests — verify RED**

```bash
npx vitest run src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.test.tsx
```

Expected: tests FAIL — component still imports from `executionStatusAnnouncer` (deleted in Task 2), causing a module-resolution error.

- [ ] **Step 3: Rewrite `WorkflowStartExecutionPopup.tsx` (strip all announcer code)**

Replace `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx` in full:

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

import { FC, useState, useEffect } from 'react'

import AttachmentSvg from '@/assets/icons/attachment.svg?react'
import Editor, { EditorValue } from '@/components/Editor/Editor'
import File from '@/components/File'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { WF_FILE_UPLOAD_MESSAGE } from '@/constants/chats'
import { FormIDs } from '@/constants/formIds'
import { EDIT_WORKFLOW, NEW_WORKFLOW } from '@/constants/routes'
import { useFileUpload, FileMetadata, createFileMetadata } from '@/hooks/useFileUpload'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import './WorkflowStartExecutionPopup.scss'

interface WorkflowStartExecutionPopupProps {
  workflowId: string
  initialPrompt?: string | null
  initialFiles?: string[] | null
  startHint?: string | null
  isVisible: boolean
  onHide: () => void
  onStart?: () => void
  replaceRoute?: boolean
}

const WorkflowStartExecutionPopup: FC<WorkflowStartExecutionPopupProps> = ({
  workflowId,
  initialPrompt,
  initialFiles,
  startHint,
  isVisible,
  onHide,
  onStart,
  replaceRoute,
}) => {
  const router = useVueRouter()
  const { unblockTransition, blockTransition } = useUnsavedChanges({
    formId: FormIDs.WORKFLOW_FORM,
  })

  const initialPromptState = {
    message: initialPrompt ?? '',
    messageRaw: initialPrompt ?? '',
  }

  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [prompt, setPrompt] = useState<EditorValue>(initialPromptState)

  const { inputProps, removeFile, openFilePicker, addFiles, hasActiveUploads } = useFileUpload({
    files,
    setFiles,
    handleErrors: (errors) => {
      errors.forEach(({ message }) => toaster.error(message))
    },
  })

  useEffect(() => {
    if (isVisible) {
      setIsLoading(false)
      if (initialFiles) setFiles(initialFiles.map((f) => createFileMetadata(f)))
      setPrompt(initialPromptState)
    }
  }, [isVisible])

  function handleHide() {
    onHide()
  }

  async function handleSubmit() {
    if (hasActiveUploads) return
    setIsLoading(true)
    try {
      const fileNames = files.map((f) => f.fileId).filter(Boolean) as string[]
      const execution = await workflowExecutionsStore.createWorkflowExecution(
        workflowId,
        prompt.message,
        fileNames
      )

      unblockTransition()

      // Replace /workflows/new with /workflows/{id}/edit in browser history so that
      // browser-back from the execution page leads to edit, not the empty create form
      if (router.name === NEW_WORKFLOW) {
        router.replace({ name: EDIT_WORKFLOW, params: { id: execution.workflow_id } })
      }

      router[replaceRoute ? 'replace' : 'push']({
        name: 'workflow-execution',
        params: { workflowId: execution.workflow_id, executionId: execution.execution_id },
      })

      blockTransition()

      onHide()
      onStart?.()
      // setIsLoading(false) intentionally omitted on success — keeps Spinner mounted
      // through the dialog close animation, preventing Quill from remounting.
    } catch (error) {
      console.error('Error creating workflow execution:', error)
      toaster.error('Error creating workflow execution:')
      setIsLoading(false)
    }
  }

  return (
    <Popup
      limitWidth
      dismissableMask={false}
      visible={isVisible}
      withBorderBottom={false}
      submitDisabled={isLoading || hasActiveUploads}
      header="New Workflow Execution"
      submitText="Create"
      onHide={handleHide}
      onSubmit={handleSubmit}
    >
      {isLoading ? (
        <Spinner inline />
      ) : (
        <div>
          <div className="pt-1 mb-2 relative">
            <Editor
              value={prompt}
              withMentions={false}
              className="workflow-execution-editor"
              placeholder="Enter a starting prompt"
              onChange={setPrompt}
              onAddFiles={addFiles}
              onSubmit={handleSubmit}
            />

            <button
              type="button"
              onClick={openFilePicker}
              data-tooltip-id="react-tooltip"
              data-tooltip-content={WF_FILE_UPLOAD_MESSAGE}
              className={cn(
                'absolute top-[54%] right-[6px] transform -translate-x-1/2 -translate-y-1/2',
                'hover:opacity-80 transition-opacity'
              )}
            >
              <AttachmentSvg />
            </button>
          </div>

          <input {...inputProps} />

          {startHint && (
            <div
              className="flex items-start gap-2 mt-2 p-3 bg-surface-base-secondary border border-border-structural rounded-lg text-sm text-text-secondary"
              role="note"
              aria-label="Start hint"
            >
              <span className="whitespace-pre-wrap">{startHint}</span>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <File
                  file={file}
                  withDelete
                  withPreview
                  withDownload
                  key={file.fileName}
                  onRemove={() => removeFile(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Popup>
  )
}

export default WorkflowStartExecutionPopup
```

- [ ] **Step 4: Run tests — verify GREEN**

```bash
npx vitest run src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.test.tsx
```

Expected: 11 PASS (9 original non-announcement tests + 2 adapted Spinner tests).

- [ ] **Step 5: Run all tests in the changed scope**

```bash
npx vitest run src/components/StatusBadge src/pages/workflows/details
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.test.tsx \
        src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx
git commit -m "fix(a11y): remove announcer from WorkflowStartExecutionPopup"
```
