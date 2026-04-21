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

import { WORKFLOW_STATUSES } from '@/constants/workflows'

import { ExecutionContext } from '../../hooks/useExecutionsContext'
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

vi.mock('@/components/Popup', () => ({
  default: ({
    children,
    visible,
    header,
  }: {
    children: React.ReactNode
    visible: boolean
    header?: string
  }) =>
    visible ? (
      <div data-testid="popup">
        {header && <h2>{header}</h2>}
        {children}
      </div>
    ) : null,
}))

vi.mock('../WorkflowExecutionEditOutputForm', () => ({
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
    stateId: 'state-1',
    workflowId: 'wf-1',
    executionId: 'ex-1',
  }

  const mockContextValue = {
    workflowId: 'workflow-1',
    executionId: 'execution-1',
    executionStatus: WORKFLOW_STATUSES.INTERRUPTED,
    interruptedStateId: null,
    isResuming: false,
    resume: vi.fn(),
    refreshOutput: vi.fn(),
  }

  const renderWithContext = (ui: React.ReactElement, contextValue = mockContextValue) => {
    return render(<ExecutionContext.Provider value={contextValue}>{ui}</ExecutionContext.Provider>)
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders control buttons regardless of execution status', () => {
    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />, {
      ...mockContextValue,
      executionStatus: WORKFLOW_STATUSES.SUCCEEDED,
    })

    expect(screen.getByText('Abort')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('renders control buttons when execution status is Interrupted', () => {
    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />)

    expect(screen.getByText('Abort')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('calls abortWorkflowExecution and shows toast when Abort is clicked', async () => {
    mockWorkflowExecutionsStore.abortWorkflowExecution.mockResolvedValue(undefined)

    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Abort'))

    expect(mockWorkflowExecutionsStore.abortWorkflowExecution).toHaveBeenCalledWith(
      'workflow-1',
      'execution-1'
    )
    expect(mockToaster.info).toHaveBeenCalledWith('Workflow execution aborted')
  })

  it('calls resume function when Continue is clicked', async () => {
    const resume = vi.fn().mockResolvedValue(undefined)

    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />, {
      ...mockContextValue,
      resume,
    })

    await user.click(screen.getByText('Continue'))

    expect(resume).toHaveBeenCalled()
  })

  it('disables buttons when isResuming is true', async () => {
    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />, {
      ...mockContextValue,
      isResuming: true,
    })

    // Buttons should be disabled while resuming
    expect(screen.getByText('Abort')).toBeDisabled()
    expect(screen.getByText('Edit')).toBeDisabled()
    expect(screen.getByText('Continue')).toBeDisabled()
  })

  it('opens Edit Output popup when Edit is clicked', async () => {
    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Edit'))

    expect(screen.getByText('Edit Output')).toBeInTheDocument()
    expect(screen.getByTestId('edit-output-form')).toBeInTheDocument()
  })

  it('closes Edit Output popup when form cancel is clicked', async () => {
    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit Output')).toBeInTheDocument()

    await user.click(screen.getByText('Cancel Form'))

    await waitFor(() => {
      expect(screen.queryByText('Edit Output')).not.toBeInTheDocument()
    })
  })

  it('calls refreshOutput and closes popup when form update is clicked', async () => {
    const refreshOutput = vi.fn()

    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />, {
      ...mockContextValue,
      refreshOutput,
    })

    await user.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit Output')).toBeInTheDocument()

    await user.click(screen.getByText('Update'))

    expect(refreshOutput).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByText('Edit Output')).not.toBeInTheDocument()
    })
  })

  it('applies custom className to controls', () => {
    const { container } = renderWithContext(
      <WorkflowExecutionStateControls {...defaultProps} className="custom-class" />
    )

    const controlsDiv = container.querySelector('.custom-class')
    expect(controlsDiv).toBeInTheDocument()
  })

  it('disables buttons when execution status is In Progress', () => {
    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />, {
      ...mockContextValue,
      executionStatus: 'In Progress',
    })

    expect(screen.getByText('Abort')).toBeDisabled()
    expect(screen.getByText('Edit')).toBeDisabled()
    expect(screen.getByText('Continue')).toBeDisabled()
  })

  it('passes correct props to WorkflowExecutionEditOutputForm', async () => {
    renderWithContext(<WorkflowExecutionStateControls {...defaultProps} />)

    await user.click(screen.getByText('Edit'))

    expect(screen.getByTestId('edit-output-form')).toBeInTheDocument()
  })
})
