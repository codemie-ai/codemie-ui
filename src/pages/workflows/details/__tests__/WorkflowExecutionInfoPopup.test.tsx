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
import { ABSENT_VALUE_MARKER } from '@/utils/analyticsFormatters'

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

  /** The value rendered beside one InfoItem label, so a `-` here cannot be another field's `-`. */
  const infoItemValue = (label: string): string | null =>
    screen.getByText(label).nextElementSibling?.textContent ?? null

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

  // Re-baselined: this used to assert `$0.0000` for an execution with no tokens_usage at all, which
  // pinned a measured-looking zero onto something nobody ever priced. The backend twin maps the same
  // case to `money_spent=None`, so the marker is the honest rendering and the zero is now reserved
  // for a run that really cost nothing (see the measured-zero test below).
  it('renders the absent marker for money spent when tokens_usage is missing entirely', () => {
    const executionWithoutTokens = {
      ...mockExecution,
      tokens_usage: undefined,
    }

    render(
      <WorkflowExecutionInfoPopup {...defaultProps} execution={executionWithoutTokens as any} />
    )

    expect(infoItemValue('Money spent:')).toBe(ABSENT_VALUE_MARKER)
    expect(screen.queryByText('$0.0000')).not.toBeInTheDocument()
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThan(0)
  })

  it('renders the absent marker for money spent when the execution was never priced', () => {
    const executionWithNullTokens: ExtendedWorkflowExecution = {
      ...mockExecution,
      tokens_usage: {
        money_spent: null,
        input_tokens: 1000,
        output_tokens: 500,
      },
    }

    render(<WorkflowExecutionInfoPopup {...defaultProps} execution={executionWithNullTokens} />)

    expect(infoItemValue('Money spent:')).toBe(ABSENT_VALUE_MARKER)
    expect(screen.queryByText('$0.0000')).not.toBeInTheDocument()
  })

  it('renders a measured zero as a zero, which absence must never look like', () => {
    const freeExecution: ExtendedWorkflowExecution = {
      ...mockExecution,
      tokens_usage: {
        money_spent: 0,
        input_tokens: 1000,
        output_tokens: 500,
      },
    }

    render(<WorkflowExecutionInfoPopup {...defaultProps} execution={freeExecution} />)

    expect(infoItemValue('Money spent:')).toBe('$0.0000')
  })

  it('keeps the pending annotation on an unpriced figure without inventing a zero', () => {
    const pendingUnpricedExecution: ExtendedWorkflowExecution = {
      ...mockExecution,
      tokens_usage: {
        money_spent: null,
        input_tokens: 1000,
        output_tokens: 500,
        money_spent_pending: true,
      },
    }

    render(<WorkflowExecutionInfoPopup {...defaultProps} execution={pendingUnpricedExecution} />)

    expect(infoItemValue('Money spent:')).toBe(`${ABSENT_VALUE_MARKER} (awaiting final cost)`)
  })

  // A zero flagged pending or unavailable is the placeholder written before any cost settled, not a
  // run that cost nothing - the scheduler run page renders the same state as `- (awaiting final cost)`.
  it('renders a pending zero as the absent marker, never as a measured $0.0000', () => {
    const pendingZeroExecution: ExtendedWorkflowExecution = {
      ...mockExecution,
      tokens_usage: {
        money_spent: 0,
        input_tokens: 1000,
        output_tokens: 500,
        money_spent_pending: true,
      },
    }

    render(<WorkflowExecutionInfoPopup {...defaultProps} execution={pendingZeroExecution} />)

    expect(infoItemValue('Money spent:')).toBe(`${ABSENT_VALUE_MARKER} (awaiting final cost)`)
  })

  it('renders an unavailable zero as the absent marker, never as a measured $0.0000', () => {
    const unavailableZeroExecution: ExtendedWorkflowExecution = {
      ...mockExecution,
      tokens_usage: {
        money_spent: 0,
        input_tokens: 1000,
        output_tokens: 500,
        money_spent_unavailable: true,
      },
    }

    render(<WorkflowExecutionInfoPopup {...defaultProps} execution={unavailableZeroExecution} />)

    expect(infoItemValue('Money spent:')).toBe(`${ABSENT_VALUE_MARKER} (final cost unavailable)`)
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

  it('renders the settled figure with no marker when neither flag is set', () => {
    render(<WorkflowExecutionInfoPopup {...defaultProps} />)

    expect(screen.getByText('$1.2345')).toBeInTheDocument()
    expect(screen.queryByText(/awaiting final cost/)).not.toBeInTheDocument()
    expect(screen.queryByText(/final cost unavailable/)).not.toBeInTheDocument()
  })

  it('marks a pending figure as awaiting final cost', () => {
    const pendingExecution: ExtendedWorkflowExecution = {
      ...mockExecution,
      tokens_usage: {
        money_spent: 1.2345,
        input_tokens: 1000,
        output_tokens: 500,
        money_spent_pending: true,
      },
    }

    render(<WorkflowExecutionInfoPopup {...defaultProps} execution={pendingExecution} />)

    expect(screen.getByText('$1.2345 (awaiting final cost)')).toBeInTheDocument()
    expect(screen.queryByText(/final cost unavailable/)).not.toBeInTheDocument()
  })

  it('marks an unavailable figure as final cost unavailable, distinct from pending', () => {
    const unavailableExecution: ExtendedWorkflowExecution = {
      ...mockExecution,
      tokens_usage: {
        money_spent: 1.2345,
        input_tokens: 1000,
        output_tokens: 500,
        money_spent_unavailable: true,
      },
    }

    render(<WorkflowExecutionInfoPopup {...defaultProps} execution={unavailableExecution} />)

    expect(screen.getByText('$1.2345 (final cost unavailable)')).toBeInTheDocument()
    expect(screen.queryByText(/awaiting final cost/)).not.toBeInTheDocument()
  })
})
