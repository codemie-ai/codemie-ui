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

import { render, screen, cleanup } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GenerateWorkflowPopup from '../GenerateWorkflowPopup'

const { mockWorkflowsStore } = vi.hoisted(() => ({
  mockWorkflowsStore: {
    generateWorkflow: vi.fn(),
    setShowNewWorkflowAIPopup: vi.fn(),
  },
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: mockWorkflowsStore,
}))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
  },
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, header, children }: any) =>
    visible ? (
      <div data-testid="generate-popup">
        <h1>{header}</h1>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/form/Textarea/Textarea', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="nl-textarea"
      value={value}
      placeholder={placeholder}
      onChange={onChange}
    />
  ),
}))

vi.mock('@/components/form/Checkbox', () => ({
  Checkbox: ({ label, checked, onChange }: any) => (
    <label>
      <input
        type="checkbox"
        data-testid="do-not-show-checkbox"
        checked={checked}
        onChange={(e: any) => onChange(e.target.checked)}
      />
      {label}
    </label>
  ),
}))

vi.mock('@/components/Spinner', () => ({
  default: ({ inline }: any) => <div data-testid={inline ? 'spinner-inline' : 'spinner'} />,
}))

describe('GenerateWorkflowPopup', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('renders popup when visible=true', () => {
    render(<GenerateWorkflowPopup visible={true} onHide={vi.fn()} onGenerated={vi.fn()} />)
    expect(screen.getByTestId('generate-popup')).toBeInTheDocument()
  })

  it('does not render when visible=false', () => {
    render(<GenerateWorkflowPopup visible={false} onHide={vi.fn()} onGenerated={vi.fn()} />)
    expect(screen.queryByTestId('generate-popup')).not.toBeInTheDocument()
  })

  it('disables Generate button when text is empty', () => {
    render(<GenerateWorkflowPopup visible={true} onHide={vi.fn()} onGenerated={vi.fn()} />)
    expect(screen.getByText('Generate with AI')).toBeDisabled()
  })

  it('enables Generate button when text has non-whitespace content', async () => {
    render(<GenerateWorkflowPopup visible={true} onHide={vi.fn()} onGenerated={vi.fn()} />)
    await user.type(screen.getByTestId('nl-textarea'), 'some description')
    expect(screen.getByText('Generate with AI')).not.toBeDisabled()
  })

  it('calls workflowsStore.generateWorkflow with text on submit', async () => {
    mockWorkflowsStore.generateWorkflow.mockResolvedValue({
      workflow_config: {
        name: 'Test',
        description: 'Desc',
        yaml_config: 'states: []',
        states: [],
        assistants: [],
      },
      workflow_id: null,
    })

    render(<GenerateWorkflowPopup visible={true} onHide={vi.fn()} onGenerated={vi.fn()} />)

    await user.type(screen.getByTestId('nl-textarea'), 'create a summarizer')
    await user.click(screen.getByText('Generate with AI'))

    expect(mockWorkflowsStore.generateWorkflow).toHaveBeenCalledWith('create a summarizer', false)
  })

  it('calls onGenerated with response data and onHide on success', async () => {
    const responseData = {
      workflow_config: {
        name: 'Summarizer',
        description: 'Desc',
        yaml_config: 'states: []',
        states: [],
        assistants: [],
      },
      workflow_id: null,
    }
    mockWorkflowsStore.generateWorkflow.mockResolvedValue(responseData)

    const onGenerated = vi.fn()
    const onHide = vi.fn()

    render(<GenerateWorkflowPopup visible={true} onHide={onHide} onGenerated={onGenerated} />)

    await user.type(screen.getByTestId('nl-textarea'), 'create a summarizer')
    await user.click(screen.getByText('Generate with AI'))

    expect(onGenerated).toHaveBeenCalledWith(responseData)
    expect(onHide).toHaveBeenCalled()
  })

  it('shows toaster.error and does not call onHide when generateWorkflow rejects', async () => {
    mockWorkflowsStore.generateWorkflow.mockRejectedValue(new Error('API error'))

    const onHide = vi.fn()

    render(<GenerateWorkflowPopup visible={true} onHide={onHide} onGenerated={vi.fn()} />)

    await user.type(screen.getByTestId('nl-textarea'), 'create a summarizer')
    await user.click(screen.getByText('Generate with AI'))

    const toaster = (await import('@/utils/toaster')).default
    expect(toaster.error).toHaveBeenCalled()
    expect(onHide).not.toHaveBeenCalled()
  })

  it('resets text and doNotShow when onHide is called', async () => {
    render(<GenerateWorkflowPopup visible={true} onHide={vi.fn()} onGenerated={vi.fn()} />)

    await user.type(screen.getByTestId('nl-textarea'), 'something')
    await user.click(screen.getByTestId('do-not-show-checkbox'))
    await user.click(screen.getByText('Cancel'))

    expect(screen.queryByTestId<HTMLTextAreaElement>('nl-textarea')?.value ?? '').toBe('')
    const checkboxEl = screen.queryByTestId<HTMLInputElement>('do-not-show-checkbox')
    expect(checkboxEl?.checked ?? false).toBe(false)
  })

  it('calls workflowsStore.setShowNewWorkflowAIPopup(false) when checkbox is checked and Cancel is clicked', async () => {
    render(<GenerateWorkflowPopup visible={true} onHide={vi.fn()} onGenerated={vi.fn()} />)

    await user.click(screen.getByTestId('do-not-show-checkbox'))
    await user.click(screen.getByText('Cancel'))

    expect(mockWorkflowsStore.setShowNewWorkflowAIPopup).toHaveBeenCalledWith(false)
  })

  it('does not call workflowsStore.setShowNewWorkflowAIPopup when checkbox is unchecked', async () => {
    render(<GenerateWorkflowPopup visible={true} onHide={vi.fn()} onGenerated={vi.fn()} />)

    await user.click(screen.getByText('Cancel'))

    expect(mockWorkflowsStore.setShowNewWorkflowAIPopup).not.toHaveBeenCalled()
  })
})
