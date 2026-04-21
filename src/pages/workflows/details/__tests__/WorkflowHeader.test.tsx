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

import { Workflow } from '@/types/entity'

import { ExecutionContext } from '../hooks/useExecutionsContext'
import WorkflowDetailsHeader from '../WorkflowDetailsHeader'

const { mockRouter } = vi.hoisted(() => {
  return {
    mockRouter: {
      push: vi.fn(),
      replace: vi.fn(),
    },
  }
})

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      clearWorkflowExecutions: vi.fn(),
    },
  }
})

const { mockCanEdit } = vi.hoisted(() => {
  return {
    mockCanEdit: vi.fn(),
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => mockRouter,
}))

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
}))

vi.mock('@/utils/entity', () => ({
  canEdit: mockCanEdit,
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: ({
    children,
    visible,
    header,
    message,
    onConfirm,
    onCancel,
  }: {
    children: React.ReactNode
    visible: boolean
    header: string
    message: string
    onConfirm: () => void
    onCancel: () => void
  }) =>
    visible ? (
      <div data-testid="confirmation-modal">
        <h2>{header}</h2>
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/InfoWarning', () => ({
  default: ({ message, className }: { message: string; className?: string }) => (
    <div data-testid="info-warning" className={className}>
      {message}
    </div>
  ),
}))

vi.mock('@/assets/icons/edit.svg?react', () => ({
  default: () => <svg data-testid="edit-icon" />,
}))

vi.mock('@/assets/icons/sidebar.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="sidebar-icon" className={className} />
  ),
}))

vi.mock('@/assets/icons/sweep.svg?react', () => ({
  default: () => <svg data-testid="sweep-icon" />,
}))

describe('WorkflowHeader', () => {
  let user: UserEvent

  const mockWorkflow: Workflow = {
    id: 123,
    name: 'Test Workflow',
  } as unknown as Workflow

  const defaultProps = {
    workflow: mockWorkflow,
    isConfigExpanded: false,
    onToggleConfig: vi.fn(),
  }

  const mockContextValue = {
    workflowId: '123',
    executionId: null,
    executionStatus: null,
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
    mockCanEdit.mockReturnValue(true)
  })

  it('renders clear executions button', () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    expect(screen.getByTestId('sweep-icon')).toBeInTheDocument()
  })

  it('renders configuration button', () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    expect(screen.getByText('Configuration')).toBeInTheDocument()
  })

  it('renders edit button when user can edit workflow', () => {
    mockCanEdit.mockReturnValue(true)
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('does not render edit button when user cannot edit workflow', () => {
    mockCanEdit.mockReturnValue(false)
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('does not render edit button when workflow is null', () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} workflow={null} />)

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('calls onToggleConfig when configuration button is clicked', async () => {
    const onToggleConfig = vi.fn()
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} onToggleConfig={onToggleConfig} />)

    await user.click(screen.getByText('Configuration'))

    expect(onToggleConfig).toHaveBeenCalledTimes(1)
  })

  it('rotates sidebar icon when config is expanded', () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} isConfigExpanded={true} />)

    const sidebarIcon = screen.getByTestId('sidebar-icon')
    expect(sidebarIcon).toHaveClass('rotate-180')
  })

  it('does not rotate sidebar icon when config is not expanded', () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} isConfigExpanded={false} />)

    const sidebarIcon = screen.getByTestId('sidebar-icon')
    expect(sidebarIcon).not.toHaveClass('rotate-180')
  })

  it('navigates to edit page when edit button is clicked', async () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    await user.click(screen.getByText('Edit'))

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'edit-workflow',
      params: { id: '123' },
    })
  })

  it('shows confirmation modal when clear button is clicked', async () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    await user.click(screen.getByTestId('sweep-icon').closest('button')!)

    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument()
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
  })

  it('hides confirmation modal when cancel is clicked', async () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    await user.click(screen.getByTestId('sweep-icon').closest('button')!)
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument()

    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument()
  })

  it('clears executions and navigates when confirmed', async () => {
    mockWorkflowExecutionsStore.clearWorkflowExecutions.mockResolvedValue(undefined)

    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    await user.click(screen.getByTestId('sweep-icon').closest('button')!)
    await user.click(screen.getByText('Confirm'))

    expect(mockWorkflowExecutionsStore.clearWorkflowExecutions).toHaveBeenCalledWith('123')
    expect(mockRouter.replace).toHaveBeenCalledWith({
      name: 'view-workflow',
      params: { workflowId: '123' },
    })
  })

  it('closes modal after clearing executions', async () => {
    mockWorkflowExecutionsStore.clearWorkflowExecutions.mockResolvedValue(undefined)

    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    await user.click(screen.getByTestId('sweep-icon').closest('button')!)
    await user.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument()
    })
  })

  it('does not call clearWorkflowExecutions when workflowId is undefined', async () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />, {
      ...mockContextValue,
      workflowId: undefined as any,
    })

    await user.click(screen.getByTestId('sweep-icon').closest('button')!)
    await user.click(screen.getByText('Confirm'))

    expect(mockWorkflowExecutionsStore.clearWorkflowExecutions).not.toHaveBeenCalled()
  })

  it('shows info warning in confirmation modal', async () => {
    renderWithContext(<WorkflowDetailsHeader {...defaultProps} />)

    await user.click(screen.getByTestId('sweep-icon').closest('button')!)

    expect(screen.getByTestId('info-warning')).toBeInTheDocument()
    expect(
      screen.getByText(/If an execution is part of a Chat it will unaffected/)
    ).toBeInTheDocument()
  })
})
