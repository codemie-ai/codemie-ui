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
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { WorkflowExecution, Workflow } from '@/types/entity/workflow'

import WorkflowExecutionExportPopup from '../WorkflowExecutionExportPopup'

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      workflow: {
        id: 'workflow-1',
        name: 'Test Workflow',
      } as Workflow,
      execution: {
        execution_id: 'exec-1',
        overall_status: 'Succeeded',
      } as WorkflowExecution,
      exportWorkflowExecution: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
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
  default: ({ visible, header, children, onHide, onSubmit, submitText }: any) =>
    visible ? (
      <div data-testid="export-popup">
        <h1>{header}</h1>
        {children}
        <button onClick={onHide}>Cancel</button>
        <button onClick={onSubmit}>{submitText}</button>
      </div>
    ) : null,
}))

vi.mock('@/components/form/RadioButton', () => ({
  RadioButton: ({ label, checked, onChange, value }: any) => (
    <label>
      <input type="radio" checked={checked} onChange={() => onChange({ value })} value={value} />
      {label}
    </label>
  ),
}))

vi.mock('@/components/form/Checkbox', () => ({
  Checkbox: ({ label, checked, onChange }: any) => (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  ),
}))

describe('WorkflowExecutionExportPopup', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('does not render when not visible', () => {
    render(<WorkflowExecutionExportPopup isVisible={false} onHide={vi.fn()} />)

    expect(screen.queryByTestId('export-popup')).not.toBeInTheDocument()
  })

  it('renders header when visible', () => {
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={vi.fn()} />)

    expect(screen.getByText('Export Workflow Execution')).toBeInTheDocument()
  })

  it('renders export format options', () => {
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={vi.fn()} />)

    expect(screen.getByText('Markdown (.md)')).toBeInTheDocument()
    expect(screen.getByText('HTML (.html)')).toBeInTheDocument()
  })

  it('renders combine checkbox', () => {
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={vi.fn()} />)

    expect(screen.getByText('Combine results into one file')).toBeInTheDocument()
  })

  it('has markdown selected by default', () => {
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={vi.fn()} />)

    const mdRadio = screen.getByLabelText('Markdown (.md)') as HTMLInputElement
    expect(mdRadio).toBeChecked()
  })

  it('allows selecting HTML format', async () => {
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={vi.fn()} />)

    const htmlRadio = screen.getByLabelText('HTML (.html)')
    await user.click(htmlRadio)

    expect(htmlRadio).toBeChecked()
  })

  it('allows toggling combine checkbox', async () => {
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={vi.fn()} />)

    const combineCheckbox = screen.getByLabelText(
      'Combine results into one file'
    ) as HTMLInputElement
    expect(combineCheckbox).not.toBeChecked()

    await user.click(combineCheckbox)

    expect(combineCheckbox).toBeChecked()
  })

  it('calls onHide when cancel is clicked', async () => {
    const onHide = vi.fn()
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={onHide} />)

    await user.click(screen.getByText('Cancel'))

    expect(onHide).toHaveBeenCalled()
  })

  it('renders Export button', () => {
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={vi.fn()} />)

    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('renders Cancel button', () => {
    render(<WorkflowExecutionExportPopup isVisible={true} onHide={vi.fn()} />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})
