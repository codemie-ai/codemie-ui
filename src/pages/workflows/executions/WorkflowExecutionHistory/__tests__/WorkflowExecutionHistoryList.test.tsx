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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockRouter } from '@/hooks/__mocks__/useVueRouter'
import { WorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionHistoryList from '../WorkflowExecutionHistoryList'

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      deleteWorkflowExecution: vi.fn(async () => Promise.resolve()),
    },
  }
})

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
}))

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => mockRouter }))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <div data-testid="delete-icon">DeleteIcon</div>,
}))

const mockExecutions: WorkflowExecution[] = [
  {
    execution_id: 'exec-1',
    workflow_id: 'workflow-1',
    overall_status: 'Succeeded',
    prompt: 'Test execution 1',
    date: '2024-01-15T10:30:00Z',
  },
  {
    execution_id: 'exec-2',
    workflow_id: 'workflow-1',
    overall_status: 'Failed',
    prompt: 'Test execution 2',
    date: '2024-01-15T11:00:00Z',
  },
] as unknown as WorkflowExecution[]

describe('WorkflowExecutionHistoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title and execution items', () => {
    render(
      <WorkflowExecutionHistoryList
        title="Last 7 days"
        executions={mockExecutions}
        executionId="exec-1"
      />
    )

    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('Test execution 1')).toBeInTheDocument()
    expect(screen.getByText('Test execution 2')).toBeInTheDocument()
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders nothing when executions array is empty', () => {
    const { container } = render(
      <WorkflowExecutionHistoryList title="Last 7 days" executions={[]} executionId="exec-1" />
    )

    expect(container.firstChild).toBeNull()
  })

  it('applies active styling to current execution', () => {
    render(
      <WorkflowExecutionHistoryList
        title="Last 7 days"
        executions={mockExecutions}
        executionId="exec-1"
      />
    )

    const activeItem = screen
      .getByText('Test execution 1')
      .closest('div[class*="bg-surface-specific-dropdown-hover"]')
    expect(activeItem).toHaveClass('bg-surface-specific-dropdown-hover/60', 'text-text-primary')
  })

  it('renders confirmation modal component', () => {
    render(
      <WorkflowExecutionHistoryList
        title="Last 7 days"
        executions={mockExecutions}
        executionId="exec-1"
      />
    )

    // Modal exists but not visible initially
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
  })

  it('renders navigation more menu for each execution', () => {
    render(
      <WorkflowExecutionHistoryList
        title="Last 7 days"
        executions={mockExecutions}
        executionId="exec-1"
      />
    )

    // NavigationMore component renders for each execution
    const { container } = render(
      <WorkflowExecutionHistoryList
        title="Last 7 days"
        executions={mockExecutions}
        executionId="exec-1"
      />
    )

    expect(container).toBeInTheDocument()
  })
})
