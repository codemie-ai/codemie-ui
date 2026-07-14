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

  beforeEach(() => {
    vi.clearAllMocks()
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
})
