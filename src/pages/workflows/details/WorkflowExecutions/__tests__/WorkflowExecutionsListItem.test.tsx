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
import { ExtendedWorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionsListItem from '../WorkflowExecutionsListItem'

// Mock complex external dependency (tooltip library)
vi.mock('react-tooltip', () => ({
  Tooltip: () => null,
}))

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

const { mockRouter } = vi.hoisted(() => {
  return {
    mockRouter: {
      replace: vi.fn(),
    },
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => mockRouter,
}))

vi.mock('@/assets/icons/chat.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="chat-icon" className={className} />
  ),
}))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <svg data-testid="delete-icon" />,
}))

describe('WorkflowExecutionsListItem', () => {
  let user: UserEvent

  const mockExecution: ExtendedWorkflowExecution = {
    execution_id: 'exec-123',
    workflow_id: 'workflow-456',
    overall_status: WORKFLOW_STATUSES.SUCCEEDED,
    date: '2026-03-15T10:00:00Z',
    update_date: '2026-03-15T10:30:00Z',
    index: 5,
  } as ExtendedWorkflowExecution

  const defaultProps = {
    isActive: false,
    execution: mockExecution,
    onRemove: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders execution information correctly', () => {
    render(<WorkflowExecutionsListItem {...defaultProps} />, { wrapper: Wrapper })

    expect(screen.getByText(WORKFLOW_STATUSES.SUCCEEDED)).toBeInTheDocument()
    expect(screen.getByText('05')).toBeInTheDocument() // index padded
  })

  it('applies active styling when isActive is true', () => {
    const { container } = render(<WorkflowExecutionsListItem {...defaultProps} isActive={true} />, {
      wrapper: Wrapper,
    })

    const itemDiv = container.querySelector('.bg-surface-specific-dropdown-hover\\/60')
    expect(itemDiv).toBeInTheDocument()
  })

  it('does not apply active styling when isActive is false', () => {
    const { container } = render(
      <WorkflowExecutionsListItem {...defaultProps} isActive={false} />,
      { wrapper: Wrapper }
    )

    const itemDiv = container.querySelector('.bg-surface-specific-dropdown-hover\\/60')
    expect(itemDiv).not.toBeInTheDocument()
  })

  it('navigates to execution details when clicked', async () => {
    render(<WorkflowExecutionsListItem {...defaultProps} />, { wrapper: Wrapper })

    const button = screen.getByRole('button', { name: /05/i })
    await user.click(button)

    expect(mockRouter.replace).toHaveBeenCalledWith({
      name: 'workflow-execution',
      params: {
        workflowId: 'workflow-456',
        executionId: 'exec-123',
      },
    })
  })

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = vi.fn()
    render(<WorkflowExecutionsListItem {...defaultProps} onRemove={onRemove} />, {
      wrapper: Wrapper,
    })

    // Click the more menu button (has ellipsis icon)
    const buttons = screen.getAllByRole('button')
    const moreButton = buttons.find((btn) => btn.querySelector('svg'))
    expect(moreButton).toBeDefined()
    await user.click(moreButton!)

    // Find and click remove
    const removeButton = await screen.findByText('Remove')
    await user.click(removeButton)

    expect(onRemove).toHaveBeenCalled()
  })

  it('shows remove option in menu', async () => {
    render(<WorkflowExecutionsListItem {...defaultProps} />, { wrapper: Wrapper })

    // Click the more menu button
    const buttons = screen.getAllByRole('button')
    const moreButton = buttons.find((btn) => btn.querySelector('svg'))
    await user.click(moreButton!)

    expect(await screen.findByText('Remove')).toBeInTheDocument()
  })

  it('shows chat icon when execution has conversation_id', () => {
    const executionWithConversation = {
      ...mockExecution,
      conversation_id: 'conv-123',
    }

    render(<WorkflowExecutionsListItem {...defaultProps} execution={executionWithConversation} />, {
      wrapper: Wrapper,
    })

    expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
  })

  it('does not show chat icon when execution has no conversation_id', () => {
    render(<WorkflowExecutionsListItem {...defaultProps} />, { wrapper: Wrapper })

    expect(screen.queryByTestId('chat-icon')).not.toBeInTheDocument()
  })

  it('displays "Finished" label for completed executions', () => {
    const completedExecution = {
      ...mockExecution,
      overall_status: WORKFLOW_STATUSES.SUCCEEDED,
    }

    render(<WorkflowExecutionsListItem {...defaultProps} execution={completedExecution} />, {
      wrapper: Wrapper,
    })

    expect(screen.getByText(/Finished:/)).toBeInTheDocument()
  })

  it('displays information for interrupted executions', () => {
    const interruptedExecution = {
      ...mockExecution,
      overall_status: WORKFLOW_STATUSES.INTERRUPTED,
    }

    render(<WorkflowExecutionsListItem {...defaultProps} execution={interruptedExecution} />, {
      wrapper: Wrapper,
    })

    expect(screen.getByText(WORKFLOW_STATUSES.INTERRUPTED)).toBeInTheDocument()
  })

  it('displays runtime duration', () => {
    render(<WorkflowExecutionsListItem {...defaultProps} />, { wrapper: Wrapper })

    expect(screen.getByText(/Runtime:/)).toBeInTheDocument()
  })

  it('handles execution with no index', () => {
    const executionWithoutIndex = {
      ...mockExecution,
      index: undefined,
    }

    render(
      <WorkflowExecutionsListItem {...defaultProps} execution={executionWithoutIndex as any} />,
      {
        wrapper: Wrapper,
      }
    )

    expect(screen.getByText('00')).toBeInTheDocument()
  })
})
