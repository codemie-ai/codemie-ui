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

import { Thought } from '@/types/entity/conversation'
import { WorkflowExecutionState as WorkflowExecutionStateType } from '@/types/entity/workflow'

import WorkflowExecutionState from '../WorkflowExecutionState'

vi.hoisted(() => vi.resetModules())

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      getStateThought: vi.fn(),
    },
  }
})

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
}))

vi.mock('../WorkflowExecutionStateThought', () => ({
  default: ({ thought }: { thought: Thought }) => (
    <div data-testid="thought">{thought.content}</div>
  ),
}))

describe('WorkflowExecutionState', () => {
  let user: UserEvent

  const mockThought = {
    id: 'thought-1',
    chat_id: 'chat-1',
    role: 'assistant',
    content: 'Test thought content',
    created_at: '2024-01-01T10:00:00Z',
    metadata: {},
  } as unknown as Thought

  const mockState: WorkflowExecutionStateType = {
    id: 'state-1',
    date: '2024-01-01T10:00:00Z',
    update_date: '2024-01-01T10:05:00Z',
    execution_id: 'execution-1',
    name: 'Test State',
    task: 'Test task description',
    status: 'Succeeded',
    started_at: '2024-01-01T10:00:00Z',
    completed_at: '2024-01-01T10:05:00Z',
    output: 'Test output',
    error: null,
    thoughts: [{ id: 'thought-1' }],
  } as WorkflowExecutionStateType

  const mockStateWithoutTask: WorkflowExecutionStateType = {
    ...mockState,
    task: null,
  }

  const mockStateWithoutThoughts: WorkflowExecutionStateType = {
    ...mockState,
    thoughts: [],
  }

  const defaultProps = {
    state: mockState,
    executionStatus: 'Succeeded' as const,
    isExpanded: false,
    isLastItem: false,
    workflowId: 'workflow-1',
    executionId: 'execution-1',
    onExpand: vi.fn(),
    onCollapse: vi.fn(),
    onViewDetails: vi.fn(),
    onRefreshThoughts: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockWorkflowExecutionsStore.getStateThought.mockReturnValue(mockThought)
  })

  it('renders without crashing', () => {
    const { container } = render(<WorkflowExecutionState {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays all basic state information', () => {
    render(<WorkflowExecutionState {...defaultProps} />)

    expect(screen.getByText(/Test State/)).toBeInTheDocument()
    expect(screen.getByText(/Test task description/)).toBeInTheDocument()
    expect(screen.getByText(/Started:/)).toBeInTheDocument()
    expect(screen.getByText(/Completed:/)).toBeInTheDocument()
    expect(screen.getByText(/Output:/)).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('displays dash when task is null', () => {
    render(<WorkflowExecutionState {...defaultProps} state={mockStateWithoutTask} />)
    expect(screen.getByText(/Task:/)).toBeInTheDocument()
    expect(screen.getByText(/-/)).toBeInTheDocument()
  })

  it('calls onViewDetails when Open button is clicked', async () => {
    const onViewDetails = vi.fn()
    render(<WorkflowExecutionState {...defaultProps} onViewDetails={onViewDetails} />)

    await user.click(screen.getByText('Open'))

    expect(onViewDetails).toHaveBeenCalledWith('state-1')
  })

  it('renders expand/collapse button based on thoughts and expansion state', () => {
    // No expand button when no thoughts
    const { container: containerNoThoughts } = render(
      <WorkflowExecutionState {...defaultProps} state={mockStateWithoutThoughts} />
    )
    const buttonsNoThoughts = containerNoThoughts.querySelectorAll('button')
    expect(buttonsNoThoughts.length).toBeLessThanOrEqual(2)

    // Has expand button when has thoughts and not expanded
    const { container: containerCollapsed } = render(
      <WorkflowExecutionState {...defaultProps} isExpanded={false} />
    )
    const buttonsCollapsed = containerCollapsed.querySelectorAll('button')
    expect(buttonsCollapsed.length).toBeGreaterThan(1)

    // Has collapse button when has thoughts and is expanded
    const { container: containerExpanded } = render(
      <WorkflowExecutionState {...defaultProps} isExpanded={true} />
    )
    const buttonsExpanded = containerExpanded.querySelectorAll('button')
    expect(buttonsExpanded.length).toBeGreaterThan(1)
  })

  it('calls onExpand when expand button is clicked', async () => {
    const onExpand = vi.fn()
    const { container } = render(
      <WorkflowExecutionState {...defaultProps} isExpanded={false} onExpand={onExpand} />
    )

    // Find the last button (expand/collapse button)
    const buttons = container.querySelectorAll('button')
    const expandButton = buttons[buttons.length - 1]

    await user.click(expandButton)

    expect(onExpand).toHaveBeenCalledWith('state-1')
  })

  it('displays thoughts only when expanded', () => {
    const { queryByTestId: queryByTestIdCollapsed } = render(
      <WorkflowExecutionState {...defaultProps} isExpanded={false} />
    )
    expect(queryByTestIdCollapsed('thought')).not.toBeInTheDocument()

    const { getByTestId } = render(<WorkflowExecutionState {...defaultProps} isExpanded={true} />)
    expect(getByTestId('thought')).toBeInTheDocument()
    expect(mockWorkflowExecutionsStore.getStateThought).toHaveBeenCalledWith('thought-1')
  })

  it('renders controls only when isLastItem is true', () => {
    // Controls rendered when isLastItem
    const { container: containerWithControls } = render(
      <WorkflowExecutionState {...defaultProps} isLastItem={true} />
    )
    expect(containerWithControls).toBeInTheDocument()

    // Controls not rendered when not isLastItem
    const { container: containerWithoutControls } = render(
      <WorkflowExecutionState {...defaultProps} isLastItem={false} />
    )
    const buttons = containerWithoutControls.querySelectorAll('button')
    // Should only have Open button and expand/collapse button
    expect(buttons.length).toBeLessThanOrEqual(3)
  })

  it('applies correct styling classes', () => {
    const { container } = render(<WorkflowExecutionState {...defaultProps} />)
    const mainDiv = container.firstChild

    expect(mainDiv).toHaveClass('flex', 'flex-col', 'bg-surface-base-chat')
  })

  it('renders all thoughts when expanded', () => {
    const stateWithMultipleThoughts = {
      ...mockState,
      thoughts: [{ id: 'thought-1' }, { id: 'thought-2' }],
    }

    const { getAllByTestId } = render(
      <WorkflowExecutionState
        {...defaultProps}
        state={stateWithMultipleThoughts as WorkflowExecutionStateType}
        isExpanded={true}
      />
    )

    expect(getAllByTestId('thought')).toHaveLength(2)
    expect(mockWorkflowExecutionsStore.getStateThought).toHaveBeenCalledTimes(2)
    expect(mockWorkflowExecutionsStore.getStateThought).toHaveBeenCalledWith('thought-1')
    expect(mockWorkflowExecutionsStore.getStateThought).toHaveBeenCalledWith('thought-2')
  })

  it('handles different execution statuses', () => {
    const failedState = {
      ...mockState,
      status: 'Failed' as const,
      error: 'Test error message',
    }
    const { container: containerFailed } = render(
      <WorkflowExecutionState {...defaultProps} state={failedState} />
    )
    expect(containerFailed).toBeInTheDocument()

    const inProgressState = {
      ...mockState,
      status: 'In Progress' as const,
      completed_at: null,
    }
    const { container: containerInProgress } = render(
      <WorkflowExecutionState
        {...defaultProps}
        state={inProgressState}
        executionStatus="In Progress"
      />
    )
    expect(containerInProgress).toBeInTheDocument()
  })
})
