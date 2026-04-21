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
import { BrowserRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { WORKFLOW_STATUSES } from '@/constants/workflows'
import { WorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionHeader from '../WorkflowExecutionHeader'

// Mock complex external dependencies
vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  UnsavedChangesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUnsavedChanges: () => ({
    checkHasUnsavedChanges: () => false,
    registerForm: () => {},
    unregisterForm: () => {},
  }),
}))

vi.mock('react-tooltip', () => ({
  Tooltip: () => null,
}))

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      abortWorkflowExecution: vi.fn(),
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

vi.mock('@/assets/icons/cross.svg?react', () => ({
  default: () => <svg data-testid="close-icon" />,
}))

vi.mock('@/assets/icons/info.svg?react', () => ({
  default: () => <svg data-testid="info-icon" />,
}))

vi.mock('@/assets/icons/download.svg?react', () => ({
  default: () => <svg data-testid="download-icon" />,
}))

describe('WorkflowExecutionHeader', () => {
  let user: UserEvent

  const mockWorkflow = {
    id: 'workflow-123',
    name: 'Test Workflow',
  }

  const mockExecution: WorkflowExecution = {
    execution_id: 'exec-456',
    workflow_id: 'workflow-123',
    overall_status: WORKFLOW_STATUSES.RUNNING,
  } as WorkflowExecution

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('returns null when workflow is null', () => {
    const { container } = render(
      <WorkflowExecutionHeader workflow={null} execution={mockExecution} />,
      { wrapper: Wrapper }
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders header with workflow buttons when workflow exists', () => {
    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={null} />, {
      wrapper: Wrapper,
    })

    // Check buttons are rendered
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows abort button when execution is not in final status', () => {
    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={mockExecution} />, {
      wrapper: Wrapper,
    })

    expect(screen.getByText('Abort')).toBeInTheDocument()
  })

  it('does not show abort button when execution is succeeded', () => {
    const succeededExecution = {
      ...mockExecution,
      overall_status: WORKFLOW_STATUSES.SUCCEEDED,
    }

    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={succeededExecution} />, {
      wrapper: Wrapper,
    })

    expect(screen.queryByText('Abort')).not.toBeInTheDocument()
  })

  it('does not show abort button when execution is failed', () => {
    const failedExecution = {
      ...mockExecution,
      overall_status: WORKFLOW_STATUSES.FAILED,
    }

    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={failedExecution} />, {
      wrapper: Wrapper,
    })

    expect(screen.queryByText('Abort')).not.toBeInTheDocument()
  })

  it('calls abortWorkflowExecution and shows toast when abort is clicked', async () => {
    mockWorkflowExecutionsStore.abortWorkflowExecution.mockResolvedValue(undefined)

    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={mockExecution} />, {
      wrapper: Wrapper,
    })

    await user.click(screen.getByText('Abort'))

    expect(mockWorkflowExecutionsStore.abortWorkflowExecution).toHaveBeenCalledWith(
      'workflow-123',
      'exec-456'
    )
    expect(mockToaster.info).toHaveBeenCalledWith('Workflow execution aborted')
  })

  it('shows info button when execution exists', () => {
    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={mockExecution} />, {
      wrapper: Wrapper,
    })

    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('has info button when execution exists', async () => {
    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={mockExecution} />, {
      wrapper: Wrapper,
    })

    const infoButton = screen.getByText('Info')
    expect(infoButton).toBeInTheDocument()

    // Button is clickable
    expect(infoButton).not.toBeDisabled()
  })

  it('shows export button when execution exists', () => {
    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={mockExecution} />, {
      wrapper: Wrapper,
    })

    expect(screen.getByTestId('download-icon')).toBeInTheDocument()
  })

  it('opens export popup when export button is clicked', async () => {
    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={mockExecution} />, {
      wrapper: Wrapper,
    })

    const exportButton = screen.getByTestId('download-icon').closest('button')
    expect(exportButton).toBeInTheDocument()
    await user.click(exportButton!)

    // Popup dialog should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not show info or export buttons when execution is null', () => {
    render(<WorkflowExecutionHeader workflow={mockWorkflow} execution={null} />, {
      wrapper: Wrapper,
    })

    expect(screen.queryByText('Info')).not.toBeInTheDocument()
    expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument()
  })
})
