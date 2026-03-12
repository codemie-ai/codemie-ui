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

import WorkflowExecutionHeader from '../WorkflowExecutionHeader'

vi.hoisted(() => vi.resetModules())

const mockRouter = {
  push: vi.fn(),
}

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      clearWorkflowExecutions: vi.fn(),
    },
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
}))

vi.mock('@/pages/workflows/utils/goBackWorkflows', () => ({
  goBackWorkflows: vi.fn(),
}))

const mockGoBackWorkflows = vi.mocked(
  await import('@/pages/workflows/utils/goBackWorkflows')
).goBackWorkflows

describe('WorkflowExecutionHeader', () => {
  let user: UserEvent

  const defaultProps = {
    workflowName: 'Test Workflow',
    worfklowId: 'workflow-123',
    isConfigExpanded: false,
    onToggleConfig: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays the workflow name', () => {
    render(<WorkflowExecutionHeader {...defaultProps} />)
    expect(screen.getByText('Test Workflow')).toBeInTheDocument()
  })

  it('renders back button', () => {
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const backButtons = container.querySelectorAll('button')
    expect(backButtons.length).toBeGreaterThan(0)
  })

  it('calls goBackWorkflows when back button is clicked', async () => {
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const backButton = container.querySelector('button')

    if (backButton) {
      await user.click(backButton)
      expect(mockGoBackWorkflows).toHaveBeenCalled()
    }
  })

  it('renders clear executions button with tooltip', () => {
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const clearButton = container.querySelector('[data-tooltip-content="Clear all executions"]')
    expect(clearButton).toBeInTheDocument()
  })

  it('renders Configuration button', () => {
    render(<WorkflowExecutionHeader {...defaultProps} />)
    expect(screen.getByText('Configuration')).toBeInTheDocument()
  })

  it('calls onToggleConfig when Configuration button is clicked', async () => {
    const onToggleConfig = vi.fn()
    render(<WorkflowExecutionHeader {...defaultProps} onToggleConfig={onToggleConfig} />)

    await user.click(screen.getByText('Configuration'))

    expect(onToggleConfig).toHaveBeenCalled()
  })

  it('confirmation modal is not visible initially', () => {
    render(<WorkflowExecutionHeader {...defaultProps} />)
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
  })

  it('opens confirmation modal when clear button is clicked', async () => {
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const clearButton = container.querySelector('[data-tooltip-content="Clear all executions"]')

    if (clearButton) {
      await user.click(clearButton)
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
    }
  })

  it('displays correct modal message', async () => {
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const clearButton = container.querySelector('[data-tooltip-content="Clear all executions"]')

    if (clearButton) {
      await user.click(clearButton)
      expect(
        screen.getByText('Are you sure you want to delete all executions for current workflow?')
      ).toBeInTheDocument()
    }
  })

  it('closes modal when cancel is clicked', async () => {
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const clearButton = container.querySelector('[data-tooltip-content="Clear all executions"]')

    if (clearButton) {
      await user.click(clearButton)
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
      })
    }
  })

  it('calls clearWorkflowExecutions when confirm is clicked', async () => {
    mockWorkflowExecutionsStore.clearWorkflowExecutions.mockResolvedValue(undefined)
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const clearButton = container.querySelector('[data-tooltip-content="Clear all executions"]')

    if (clearButton) {
      await user.click(clearButton)
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      expect(mockWorkflowExecutionsStore.clearWorkflowExecutions).toHaveBeenCalledWith(
        'workflow-123'
      )
    }
  })

  it('navigates to workflows page after clearing executions', async () => {
    mockWorkflowExecutionsStore.clearWorkflowExecutions.mockResolvedValue(undefined)
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const clearButton = container.querySelector('[data-tooltip-content="Clear all executions"]')

    if (clearButton) {
      await user.click(clearButton)
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith({ name: 'workflows' })
      })
    }
  })

  it('closes modal after confirming', async () => {
    mockWorkflowExecutionsStore.clearWorkflowExecutions.mockResolvedValue(undefined)
    const { container } = render(<WorkflowExecutionHeader {...defaultProps} />)
    const clearButton = container.querySelector('[data-tooltip-content="Clear all executions"]')

    if (clearButton) {
      await user.click(clearButton)
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
      })
    }
  })

  it('does not call clearWorkflowExecutions if workflowId is missing', async () => {
    const { container } = render(
      <WorkflowExecutionHeader {...defaultProps} worfklowId={undefined} />
    )
    const clearButton = container.querySelector('[data-tooltip-content="Clear all executions"]')

    if (clearButton) {
      await user.click(clearButton)
      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockWorkflowExecutionsStore.clearWorkflowExecutions).not.toHaveBeenCalled()
      })
    }
  })
})
