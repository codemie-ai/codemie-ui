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
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import WorkflowExecutionStateControls from '../WorkflowExecutionStateControls'

vi.hoisted(() => vi.resetModules())

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      abortWorkflowExecution: vi.fn(),
      resumeWorkflowExecution: vi.fn(),
    },
  }
})

const { mockToaster } = vi.hoisted(() => {
  return {
    mockToaster: {
      info: vi.fn(),
    },
  }
})

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
}))

vi.mock('@/utils/toaster', () => ({
  default: mockToaster,
}))

vi.mock('../popups/WorkflowExecutionEditOutputForm', () => ({
  default: ({ onUpdate, onCancel }: { onUpdate: () => void; onCancel: () => void }) => (
    <div data-testid="edit-output-form">
      <button onClick={onUpdate}>Update</button>
      <button onClick={onCancel}>Cancel Form</button>
    </div>
  ),
}))

describe('WorkflowExecutionStateControls', () => {
  let user: UserEvent

  const defaultProps = {
    workflowId: 'workflow-1',
    executionId: 'execution-1',
    stateId: 'state-1',
    onRefresh: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders control buttons', () => {
    render(<WorkflowExecutionStateControls {...defaultProps} />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('calls abortWorkflowExecution and shows toast when Cancel is clicked', async () => {
    mockWorkflowExecutionsStore.abortWorkflowExecution.mockResolvedValue(undefined)

    render(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Cancel'))

    expect(mockWorkflowExecutionsStore.abortWorkflowExecution).toHaveBeenCalledWith(
      'workflow-1',
      'execution-1'
    )
    expect(mockToaster.info).toHaveBeenCalledWith('Workflow execution aborted')
  })

  it('calls resumeWorkflowExecution when Continue is clicked', async () => {
    mockWorkflowExecutionsStore.resumeWorkflowExecution.mockResolvedValue(undefined)

    render(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Continue'))

    expect(mockWorkflowExecutionsStore.resumeWorkflowExecution).toHaveBeenCalledWith(
      'workflow-1',
      'execution-1'
    )
  })

  it('shows spinner while resume is in progress', async () => {
    let resolveResume: () => void
    const resumePromise = new Promise<void>((resolve) => {
      resolveResume = resolve
    })
    mockWorkflowExecutionsStore.resumeWorkflowExecution.mockReturnValue(resumePromise)

    render(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Continue'))

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Continue')).not.toBeInTheDocument()

    resolveResume!()

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  it('opens Edit Output popup when Edit is clicked', async () => {
    render(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Edit'))

    expect(screen.getByText('Edit Output')).toBeInTheDocument()
    expect(screen.getByTestId('edit-output-form')).toBeInTheDocument()
  })

  it('closes Edit Output popup when form cancel is clicked', async () => {
    render(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit Output')).toBeInTheDocument()

    await user.click(screen.getByText('Cancel Form'))

    await waitFor(() => {
      expect(screen.queryByText('Edit Output')).not.toBeInTheDocument()
    })
  })

  it('calls onRefresh and closes popup when form update is clicked', async () => {
    const onRefresh = vi.fn()

    render(<WorkflowExecutionStateControls {...defaultProps} onRefresh={onRefresh} />)

    await user.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit Output')).toBeInTheDocument()

    await user.click(screen.getByText('Update'))

    expect(onRefresh).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByText('Edit Output')).not.toBeInTheDocument()
    })
  })

  it('applies custom className to controls', () => {
    const { container } = render(
      <WorkflowExecutionStateControls {...defaultProps} className="custom-class" />
    )

    const controlsDiv = container.querySelector('.custom-class')
    expect(controlsDiv).toBeInTheDocument()
  })

  it('passes correct props to WorkflowExecutionEditOutputForm', async () => {
    render(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Edit'))

    expect(screen.getByTestId('edit-output-form')).toBeInTheDocument()
  })
})
