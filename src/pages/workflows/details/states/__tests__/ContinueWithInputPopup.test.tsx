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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ContinueWithInputPopup from '../ContinueWithInputPopup'

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    getWorkflowExecutionStateOutput: vi.fn().mockResolvedValue('Step output text'),
  },
}))

vi.mock('@/components/Editor/Editor', () => ({
  default: ({ onChange, placeholder }: any) => (
    <textarea
      placeholder={placeholder}
      onChange={(e) => onChange({ message: e.target.value, messageRaw: e.target.value })}
    />
  ),
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
    <button onClick={openFilePicker} aria-label="Attach files">
      attach
    </button>
  ),
}))

vi.mock('@/components/Popup', () => ({
  default: ({ children, visible, headerContent, onHide }: any) =>
    visible ? (
      <div role="dialog">
        {headerContent}
        <button onClick={onHide}>close</button>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/markdown/Markdown', () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}))

vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn() } }))

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the popup with header and subtitle when visible', () => {
    render(<ContinueWithInputPopup {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Workflow interrupted')).toBeInTheDocument()
    expect(
      screen.getByText('Review the output, add a message if needed, then continue the workflow.')
    ).toBeInTheDocument()
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

    const textarea = screen.getByPlaceholderText('Leave empty or type a message for the next step')
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
