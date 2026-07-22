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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import RefineWorkflowPromptPopup from '../RefineWorkflowPromptPopup'

const { mockWorkflowsStore } = vi.hoisted(() => ({
  mockWorkflowsStore: {
    refineWorkflowWithAI: vi.fn(),
  },
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: mockWorkflowsStore,
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, header, children }: any) =>
    visible ? (
      <div data-testid="refine-popup">
        <h1>{header}</h1>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/Spinner', () => ({
  default: ({ inline }: any) => <div data-testid={inline ? 'spinner-inline' : 'spinner'} />,
}))

const defaultProps = {
  isVisible: true,
  workflowId: 'wf-1',
  currentYaml: 'states: []',
  onHide: vi.fn(),
  onRefined: vi.fn(),
}

describe('RefineWorkflowPromptPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with correct header when visible', () => {
    render(<RefineWorkflowPromptPopup {...defaultProps} />)
    expect(screen.getByText('Refine Workflow with AI')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(<RefineWorkflowPromptPopup {...defaultProps} isVisible={false} />)
    expect(screen.queryByText('Refine Workflow with AI')).not.toBeInTheDocument()
  })

  it('shows textarea and buttons when not loading', () => {
    render(<RefineWorkflowPromptPopup {...defaultProps} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Refine with AI')).toBeInTheDocument()
  })

  it('shows centered spinner and hides form content while loading', async () => {
    mockWorkflowsStore.refineWorkflowWithAI.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<RefineWorkflowPromptPopup {...defaultProps} />)
    await user.click(screen.getByText('Refine with AI'))
    expect(screen.getByTestId('spinner-inline')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Refine with AI')).not.toBeInTheDocument()
  })

  it('Cancel is visible and disabled while loading', async () => {
    mockWorkflowsStore.refineWorkflowWithAI.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<RefineWorkflowPromptPopup {...defaultProps} />)
    await user.click(screen.getByText('Refine with AI'))
    const cancelBtn = screen.getByText('Cancel').closest('button')
    expect(cancelBtn).toBeInTheDocument()
    expect(cancelBtn).toBeDisabled()
  })

  it('calls workflowsStore.refineWorkflowWithAI with correct args on submit', async () => {
    mockWorkflowsStore.refineWorkflowWithAI.mockResolvedValue({
      yaml_config: 'states: []\n# refined',
    })
    const user = userEvent.setup()
    render(<RefineWorkflowPromptPopup {...defaultProps} />)
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Add retry logic')
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => {
      expect(mockWorkflowsStore.refineWorkflowWithAI).toHaveBeenCalledWith('wf-1', {
        yaml_config: 'states: []',
        refine_prompt: 'Add retry logic',
      })
    })
  })

  it('sends refine_prompt: undefined when prompt is empty', async () => {
    mockWorkflowsStore.refineWorkflowWithAI.mockResolvedValue({ yaml_config: 'states: []' })
    const user = userEvent.setup()
    render(<RefineWorkflowPromptPopup {...defaultProps} />)
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => {
      expect(mockWorkflowsStore.refineWorkflowWithAI).toHaveBeenCalledWith('wf-1', {
        yaml_config: 'states: []',
        refine_prompt: undefined,
      })
    })
  })

  it('calls onRefined with result and closes popup on success', async () => {
    const result = { yaml_config: 'states: []\n# refined' }
    mockWorkflowsStore.refineWorkflowWithAI.mockResolvedValue(result)
    const onRefined = vi.fn()
    const onHide = vi.fn()
    const user = userEvent.setup()
    render(<RefineWorkflowPromptPopup {...defaultProps} onRefined={onRefined} onHide={onHide} />)
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => {
      expect(onRefined).toHaveBeenCalledWith(result)
      expect(onHide).toHaveBeenCalled()
    })
  })

  it('closes popup and shows parsedError.error.message on API error', async () => {
    const apiError = Object.assign(new Error('ignored'), {
      parsedError: { error: { message: 'Invalid YAML' } },
    })
    mockWorkflowsStore.refineWorkflowWithAI.mockRejectedValue(apiError)
    const onHide = vi.fn()
    const user = userEvent.setup()
    render(<RefineWorkflowPromptPopup {...defaultProps} onHide={onHide} />)
    await user.click(screen.getByText('Refine with AI'))
    const toaster = (await import('@/utils/toaster')).default
    await waitFor(() => {
      expect(onHide).toHaveBeenCalled()
      expect(toaster.error).toHaveBeenCalledWith('Invalid YAML')
    })
  })

  it('falls back to error.message when parsedError is absent', async () => {
    mockWorkflowsStore.refineWorkflowWithAI.mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(<RefineWorkflowPromptPopup {...defaultProps} />)
    await user.click(screen.getByText('Refine with AI'))
    const toaster = (await import('@/utils/toaster')).default
    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Network error')
    })
  })

  it('calls onHide when Cancel is clicked', async () => {
    const onHide = vi.fn()
    const user = userEvent.setup()
    render(<RefineWorkflowPromptPopup {...defaultProps} onHide={onHide} />)
    await user.click(screen.getByText('Cancel'))
    expect(onHide).toHaveBeenCalled()
  })
})
