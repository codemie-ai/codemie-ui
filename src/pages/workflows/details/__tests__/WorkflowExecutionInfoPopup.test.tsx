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

import { WORKFLOW_STATUSES } from '@/constants/workflows'
import { ExtendedWorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionInfoPopup from '../WorkflowExecutionInfoPopup'

const { mockCopyToClipboard } = vi.hoisted(() => {
  return {
    mockCopyToClipboard: vi.fn(),
  }
})

vi.mock('@/utils/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils/utils')>('@/utils/utils')
  return {
    ...actual,
    copyToClipboard: mockCopyToClipboard,
  }
})

vi.mock('@/assets/icons/copy.svg?react', () => ({
  default: () => <svg data-testid="copy-icon" />,
}))

describe('WorkflowExecutionInfoPopup', () => {
  let user: UserEvent

  const mockExecution: ExtendedWorkflowExecution = {
    execution_id: 'exec-123',
    workflow_id: 'workflow-456',
    overall_status: WORKFLOW_STATUSES.SUCCEEDED,
    date: '2026-03-15T10:00:00Z',
    update_date: '2026-03-15T10:30:00Z',
    index: 5,
    created_by: {
      name: 'John Doe',
      username: 'johndoe',
    },
    tokens_usage: {
      money_spent: 1.2345,
      input_tokens: 1000,
      output_tokens: 500,
    },
  } as ExtendedWorkflowExecution

  const defaultProps = {
    isVisible: true,
    onHide: vi.fn(),
    execution: mockExecution,
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('returns null when execution is null', () => {
    const { container } = render(<WorkflowExecutionInfoPopup {...defaultProps} execution={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render when not visible', () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} isVisible={false} />)
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('renders popup with correct header', () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} />)

    expect(screen.getByText('Execution Info')).toBeInTheDocument()
  })

  it('displays execution status', () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} />)

    expect(screen.getByText(WORKFLOW_STATUSES.SUCCEEDED)).toBeInTheDocument()
  })

  it('displays triggered by information', () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} />)

    expect(screen.getByText('Triggered by:')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays execution ID', () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} />)

    expect(screen.getByText('ID:')).toBeInTheDocument()
    expect(screen.getByText('exec-123')).toBeInTheDocument()
  })

  it('copies execution ID to clipboard when copy button is clicked', async () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} />)

    const copyButton = screen.getByTestId('copy-icon').closest('button')
    expect(copyButton).toBeInTheDocument()
    await user.click(copyButton!)

    expect(mockCopyToClipboard).toHaveBeenCalledWith('exec-123', 'ID copied to clipboard')
  })

  it('displays spending metrics with correct formatting', () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} />)

    expect(screen.getByText('Spending metrics')).toBeInTheDocument()
    expect(screen.getByText('$1.2345')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('displays default values when tokens_usage is missing', () => {
    const executionWithoutTokens = {
      ...mockExecution,
      tokens_usage: undefined,
    }

    render(
      <WorkflowExecutionInfoPopup {...defaultProps} execution={executionWithoutTokens as any} />
    )

    expect(screen.getByText('$0.0000')).toBeInTheDocument()
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThan(0)
  })

  it('displays default values when tokens_usage properties are null', () => {
    const executionWithNullTokens = {
      ...mockExecution,
      tokens_usage: {
        money_spent: null,
        input_tokens: null,
        output_tokens: null,
      },
    }

    render(
      <WorkflowExecutionInfoPopup {...defaultProps} execution={executionWithNullTokens as any} />
    )

    expect(screen.getByText('$0.0000')).toBeInTheDocument()
  })

  it('calls onHide when close button is clicked', async () => {
    const onHide = vi.fn()
    render(<WorkflowExecutionInfoPopup {...defaultProps} onHide={onHide} />)

    // Look for close button by its aria-label
    const closeButton = screen.getByLabelText(/close/i)
    await user.click(closeButton)

    expect(onHide).toHaveBeenCalledTimes(1)
  })

  it('displays started and updated dates', () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} />)

    expect(screen.getByText('Started:')).toBeInTheDocument()
    expect(screen.getByText('Finished:')).toBeInTheDocument()
  })
})
