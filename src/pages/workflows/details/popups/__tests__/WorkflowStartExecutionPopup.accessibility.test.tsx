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

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import WorkflowStartExecutionPopup from '../WorkflowStartExecutionPopup'

vi.mock('@/components/Editor/Editor', () => ({
  default: ({ ariaLabelledBy }: any) => <textarea readOnly aria-labelledby={ariaLabelledBy} />,
}))

vi.mock('@/components/Popup', () => ({
  default: ({ children, visible }: any) =>
    visible ? (
      <dialog aria-label="New Workflow Execution" open>
        {children}
      </dialog>
    ) : null,
}))

vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    inputProps: {},
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    openFilePicker: vi.fn(),
    hasActiveUploads: false,
  }),
  createFileMetadata: vi.fn((url: string) => ({ fileName: url, fileId: url, isUploading: false })),
}))

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChanges: vi.fn(() => ({ unblockTransition: vi.fn(), blockTransition: vi.fn() })),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({ name: 'some-route', push: vi.fn(), replace: vi.fn() })),
}))

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: { createWorkflowExecution: vi.fn() },
}))

vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn() } }))
vi.mock('@/assets/icons/attachment.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/components/Spinner', () => ({ default: () => <div>loading...</div> }))

const defaultProps = { workflowId: 'wf-1', isVisible: true, onHide: vi.fn() }

describe('WorkflowStartExecutionPopup accessibility — prompt field label', () => {
  it('renders a visible label with text "Enter a starting prompt"', () => {
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    expect(screen.getByText('Enter a starting prompt')).toBeVisible()
  })

  it('prompt editor textbox is labelled by the visible label element', () => {
    render(<WorkflowStartExecutionPopup {...defaultProps} />)
    const labelEl = screen.getByText('Enter a starting prompt')
    const textbox = screen.getByRole('textbox', { name: /enter a starting prompt/i })
    expect(labelEl).toHaveAttribute('id')
    expect(textbox).toHaveAttribute('aria-labelledby', labelEl.getAttribute('id'))
  })
})
