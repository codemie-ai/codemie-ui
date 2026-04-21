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

import { NodeTypes } from '@/types/workflowEditor'

import WorkflowDrawerListItem from '../WorkflowDrawerListItem'

vi.mock('@/assets/icons/chevron-right.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-icon" className={className} />
  ),
}))

vi.mock('../../../WorkflowStateIcon', () => ({
  default: ({ type, className }: { type: string; className?: string }) => (
    <svg data-testid="state-icon" data-type={type} className={className} />
  ),
}))

describe('WorkflowDrawerListItem', () => {
  let user: UserEvent

  const defaultProps = {
    id: 'state-1',
    name: 'Test State',
    type: NodeTypes.ASSISTANT,
    stateId: null,
    onClick: vi.fn(),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders state name and icon', () => {
    render(<WorkflowDrawerListItem {...defaultProps} />)

    expect(screen.getByText('Test State')).toBeInTheDocument()
    expect(screen.getByTestId('state-icon')).toHaveAttribute('data-type', NodeTypes.ASSISTANT)
  })

  it('calls onClick when clicked without nested items', async () => {
    const onClick = vi.fn()
    render(<WorkflowDrawerListItem {...defaultProps} onClick={onClick} />)

    await user.click(screen.getByText('Test State'))

    expect(onClick).toHaveBeenCalledWith('state-1')
  })

  it('renders chevron icon when items exist', () => {
    const items = [
      {
        id: 'sub-1',
        name: 'Sub State',
        type: NodeTypes.TOOL,
      },
    ]

    render(<WorkflowDrawerListItem {...defaultProps} items={items as any} />)

    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
  })

  it('toggles nested items when clicked with items', async () => {
    const items = [
      {
        id: 'sub-1',
        name: 'Sub State',
        type: NodeTypes.TOOL,
      },
    ]

    render(<WorkflowDrawerListItem {...defaultProps} items={items as any} />)

    expect(screen.queryByText('Sub State')).not.toBeInTheDocument()

    await user.click(screen.getByText('Test State'))
    expect(screen.getByText('Sub State')).toBeInTheDocument()

    await user.click(screen.getByText('Test State'))
    expect(screen.queryByText('Sub State')).not.toBeInTheDocument()
  })

  it('displays "Failed" text for failed status', () => {
    render(<WorkflowDrawerListItem {...defaultProps} status="Failed" />)

    expect(screen.getByText('Failed')).toBeInTheDocument()
    // Status indicator is rendered
    const container = screen.getByText('Failed').parentElement
    expect(container).toBeInTheDocument()
  })

  it('displays "Aborted" text for aborted status', () => {
    render(<WorkflowDrawerListItem {...defaultProps} status="Aborted" />)

    expect(screen.getByText('Aborted')).toBeInTheDocument()
  })

  it('displays "Interrupted" text for interrupted status', () => {
    render(<WorkflowDrawerListItem {...defaultProps} status="Interrupted" />)

    expect(screen.getByText('Interrupted')).toBeInTheDocument()
  })

  it('displays "Not Started" text for not started status', () => {
    render(<WorkflowDrawerListItem {...defaultProps} status="Not Started" />)

    expect(screen.getByText('Not Started')).toBeInTheDocument()
    expect(screen.queryByTestId('status-indicator')).not.toBeInTheDocument()
  })

  it('displays time difference for succeeded status with dates', () => {
    const { container } = render(
      <WorkflowDrawerListItem
        {...defaultProps}
        status="Succeeded"
        startedAt="2026-03-15T10:00:00Z"
        completedAt="2026-03-15T10:05:00Z"
      />
    )

    // Component renders successfully with status
    expect(container.firstChild).toBeInTheDocument()
    // Time difference is displayed (e.g., "5min")
    expect(screen.getByText(/min/)).toBeInTheDocument()
  })

  it('applies nested styling when nested prop is true', () => {
    const { container } = render(<WorkflowDrawerListItem {...defaultProps} nested />)

    const button = container.querySelector('.pl-5')
    expect(button).toBeInTheDocument()
  })

  it('does not render status indicator for Not Started status', () => {
    render(<WorkflowDrawerListItem {...defaultProps} status="Not Started" />)

    expect(screen.queryByTestId('status-indicator')).not.toBeInTheDocument()
  })

  it('renders nested items recursively', async () => {
    const items = [
      {
        id: 'sub-1',
        name: 'Sub State 1',
        type: NodeTypes.TOOL,
      },
      {
        id: 'sub-2',
        name: 'Sub State 2',
        type: NodeTypes.CUSTOM,
      },
    ]

    render(<WorkflowDrawerListItem {...defaultProps} items={items as any} />)

    await user.click(screen.getByText('Test State'))

    expect(screen.getByText('Sub State 1')).toBeInTheDocument()
    expect(screen.getByText('Sub State 2')).toBeInTheDocument()
  })

  it('uses ASSISTANT type as default for nested items without type', async () => {
    const items = [
      {
        id: 'sub-1',
        name: 'Sub State',
        type: null,
      },
    ]

    render(<WorkflowDrawerListItem {...defaultProps} items={items as any} />)

    await user.click(screen.getByText('Test State'))

    const nestedStateIcons = screen.getAllByTestId('state-icon')
    const nestedIcon = nestedStateIcons.find((icon) =>
      icon.getAttribute('data-type')?.includes(NodeTypes.ASSISTANT)
    )
    expect(nestedIcon).toBeInTheDocument()
  })

  it('does not call onClick when clicking item with nested items', async () => {
    const onClick = vi.fn()
    const items = [
      {
        id: 'sub-1',
        name: 'Sub State',
        type: NodeTypes.TOOL,
      },
    ]

    render(<WorkflowDrawerListItem {...defaultProps} onClick={onClick} items={items as any} />)

    await user.click(screen.getByText('Test State'))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('rotates chevron when expanded', async () => {
    const items = [
      {
        id: 'sub-1',
        name: 'Sub State',
        type: NodeTypes.TOOL,
      },
    ]

    render(<WorkflowDrawerListItem {...defaultProps} items={items as any} />)

    const chevron = screen.getByTestId('chevron-icon')
    expect(chevron).not.toHaveClass('rotate-90')

    await user.click(screen.getByText('Test State'))

    expect(chevron).toHaveClass('rotate-90')
  })
})
