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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockRouter } from '@/hooks/__mocks__/useVueRouter'
import { WorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionHistoryItem from '../WorkflowExecutionHistoryItem'

vi.hoisted(() => vi.resetModules())

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => mockRouter }))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <div data-testid="delete-icon">DeleteIcon</div>,
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: { items: any[] }) => (
    <div data-testid="navigation-more">
      {items.map((item) => (
        <button
          key={item.title}
          data-testid={`menu-item-${item.title.toLowerCase()}`}
          onClick={item.onClick}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}))

const mockExecution = {
  execution_id: 'exec-123',
  workflow_id: 'workflow-456',
  overall_status: 'In Progress',
  prompt: 'Test execution prompt',
  date: new Date().toISOString(),
  states: [],
} as unknown as WorkflowExecution

describe('WorkflowExecutionHistoryItem', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders execution item correctly', () => {
    render(
      <WorkflowExecutionHistoryItem isActive={false} execution={mockExecution} onRemove={vi.fn()} />
    )

    expect(screen.getByText('Test execution prompt')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByTestId('navigation-more')).toBeInTheDocument()
  })

  it('displays execution id when prompt is empty', () => {
    const executionWithoutPrompt = {
      ...mockExecution,
      prompt: '',
    }

    render(
      <WorkflowExecutionHistoryItem
        isActive={false}
        execution={executionWithoutPrompt}
        onRemove={vi.fn()}
      />
    )

    expect(screen.getByText('exec-123')).toBeInTheDocument()
  })

  it('displays execution id when prompt is whitespace', () => {
    const executionWithWhitespace = {
      ...mockExecution,
      prompt: '   ',
    }

    render(
      <WorkflowExecutionHistoryItem
        isActive={false}
        execution={executionWithWhitespace}
        onRemove={vi.fn()}
      />
    )

    expect(screen.getByText('exec-123')).toBeInTheDocument()
  })

  it('truncates long execution names', () => {
    const longPrompt = 'This is a very long execution prompt that should be truncated'
    const executionWithLongPrompt = {
      ...mockExecution,
      prompt: longPrompt,
    }

    render(
      <WorkflowExecutionHistoryItem
        isActive={false}
        execution={executionWithLongPrompt}
        onRemove={vi.fn()}
      />
    )

    const displayedName = screen.getByText(/This is a very long/)
    expect(displayedName.textContent?.length).toBeLessThanOrEqual(33) // 30 + '...'
    expect(displayedName.textContent?.endsWith('...')).toBe(true)
  })

  it('navigates to execution when clicked', async () => {
    render(
      <WorkflowExecutionHistoryItem isActive={false} execution={mockExecution} onRemove={vi.fn()} />
    )

    const executionButton = screen.getByRole('button', { name: /Test execution prompt/i })
    await user.click(executionButton)

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

    render(
      <WorkflowExecutionHistoryItem
        isActive={false}
        execution={mockExecution}
        onRemove={onRemove}
      />
    )

    await user.click(screen.getByTestId('menu-item-remove'))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('displays correct execution status', () => {
    render(
      <WorkflowExecutionHistoryItem isActive={false} execution={mockExecution} onRemove={vi.fn()} />
    )

    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it.todo('displays relative date for recent executions', () => {
    const recentExecution = {
      ...mockExecution,
      date: new Date().toISOString(),
    }

    render(
      <WorkflowExecutionHistoryItem
        isActive={false}
        execution={recentExecution}
        onRemove={vi.fn()}
      />
    )

    // Recent dates should show relative time like "0 seconds ago"
    expect(screen.getByText(/\d{0,10} seconds? ago/i)).toBeInTheDocument()
  })

  it('displays tooltip for truncated execution names', () => {
    const longPrompt = 'This is a very long execution prompt that should be truncated'
    const executionWithLongPrompt = {
      ...mockExecution,
      prompt: longPrompt,
    }

    render(
      <WorkflowExecutionHistoryItem
        isActive={false}
        execution={executionWithLongPrompt}
        onRemove={vi.fn()}
      />
    )

    const nameElement = screen.getByText(/This is a very long/)
    expect(nameElement).toHaveAttribute('data-tooltip-content', longPrompt)
  })

  it('does not display tooltip for short execution names', () => {
    render(
      <WorkflowExecutionHistoryItem isActive={false} execution={mockExecution} onRemove={vi.fn()} />
    )

    const nameElement = screen.getByText('Test execution prompt')
    expect(nameElement).toHaveAttribute('data-tooltip-content', '')
  })
})
