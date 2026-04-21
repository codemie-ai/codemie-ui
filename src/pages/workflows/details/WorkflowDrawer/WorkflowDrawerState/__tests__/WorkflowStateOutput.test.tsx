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

import { ExecutionContext } from '../../../hooks/useExecutionsContext'
import WorkflowStateOutput from '../WorkflowStateOutput'

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      getWorkflowExecutionStateOutput: vi.fn(),
    },
  }
})

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
}))

vi.mock('@/components/CodeBlock', () => ({
  default: ({
    title,
    text,
    downloadFilename,
    headerActionsTemplate,
  }: {
    title?: string
    text: string
    downloadFilename?: string
    headerActionsTemplate?: React.ReactNode
  }) => (
    <div data-testid="code-block">
      {title && <div data-testid="code-block-title">{title}</div>}
      <pre data-testid="code-block-text">{text}</pre>
      <div data-testid="code-block-filename">{downloadFilename}</div>
      {headerActionsTemplate}
    </div>
  ),
}))

vi.mock('@/components/Popup', () => ({
  default: ({
    children,
    visible,
    header,
    onHide,
  }: {
    children: React.ReactNode
    visible: boolean
    header?: string
    onHide?: () => void
  }) =>
    visible ? (
      <div data-testid="popup">
        <div data-testid="popup-header">{header}</div>
        <button onClick={onHide}>Close</button>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/Tabs', () => ({
  default: ({ tabs }: { tabs: Array<{ id: string; label: string; element: React.ReactNode }> }) => (
    <div data-testid="tabs">
      {tabs.map((tab) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>
          <div data-testid={`tab-label-${tab.id}`}>{tab.label}</div>
          {tab.element}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/markdown/Markdown', () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}))

vi.mock('@/components/markdown/TextBlock', () => ({
  default: ({ text }: { text: string }) => <div data-testid="text-block">{text}</div>,
}))

vi.mock('@/assets/icons/expand.svg?react', () => ({
  default: () => <svg data-testid="expand-icon" />,
}))

describe('WorkflowStateOutput', () => {
  let user: UserEvent

  const defaultProps = {
    stateId: 'state-789',
    stateName: 'Test State',
    stateUpdatedDate: '2026-03-15T10:00:00Z',
    stateCompletedDate: '2026-03-15T10:05:00Z',
    refreshKey: 0,
  }

  const mockContextValue = {
    workflowId: 'workflow-123',
    executionId: 'exec-456',
    executionStatus: null,
    interruptedStateId: null,
    isResuming: false,
    resume: vi.fn(),
    refreshOutput: vi.fn(),
  }

  const renderWithContext = (ui: React.ReactElement) => {
    return render(
      <ExecutionContext.Provider value={mockContextValue}>{ui}</ExecutionContext.Provider>
    )
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Sample output')
  })

  it('fetches and displays state output', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Test output')

    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledWith(
        'workflow-123',
        'exec-456',
        'state-789'
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('code-block-text')).toHaveTextContent('Test output')
    })
  })

  it('displays empty string when output is null', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue(null)

    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('code-block-text')).toHaveTextContent('')
    })
  })

  it('renders code block with Result title', async () => {
    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('code-block-title')).toHaveTextContent('Result')
    })
  })

  it('renders expand button', async () => {
    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })
  })

  it('opens popup when expand button is clicked', async () => {
    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    expect(screen.getByTestId('popup')).toBeInTheDocument()
  })

  it('displays state name in popup header', async () => {
    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    expect(screen.getByTestId('popup-header')).toHaveTextContent(
      'Execution State Output for Test State'
    )
  })

  it('displays generic header when stateName is not provided', async () => {
    renderWithContext(<WorkflowStateOutput {...defaultProps} stateName={undefined} />)

    await waitFor(() => {
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    expect(screen.getByTestId('popup-header')).toHaveTextContent('Execution State Output')
  })

  it('closes popup when close button is clicked', async () => {
    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    expect(screen.getByTestId('popup')).toBeInTheDocument()

    await user.click(screen.getByText('Close'))

    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('renders tabs with Raw and Markdown options in popup', async () => {
    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    expect(screen.getByTestId('tab-raw')).toBeInTheDocument()
    expect(screen.getByTestId('tab-preview')).toBeInTheDocument()
    expect(screen.getByTestId('tab-label-raw')).toHaveTextContent('Raw')
    expect(screen.getByTestId('tab-label-preview')).toHaveTextContent('Markdown')
  })

  it('refetches output when stateId changes', async () => {
    const { rerender } = renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledTimes(1)
    })

    rerender(
      <ExecutionContext.Provider value={mockContextValue}>
        <WorkflowStateOutput {...defaultProps} stateId="new-state-id" />
      </ExecutionContext.Provider>
    )

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledTimes(2)
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenLastCalledWith(
        'workflow-123',
        'exec-456',
        'new-state-id'
      )
    })
  })

  it('refetches output when refreshKey changes', async () => {
    const { rerender } = renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledTimes(1)
    })

    rerender(
      <ExecutionContext.Provider value={mockContextValue}>
        <WorkflowStateOutput {...defaultProps} refreshKey={1} />
      </ExecutionContext.Provider>
    )

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledTimes(2)
    })
  })

  it('displays output in text block within Raw tab', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Raw text output')

    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    await waitFor(() => {
      expect(screen.getByTestId('text-block')).toHaveTextContent('Raw text output')
    })
  })

  it('displays output in markdown within Markdown tab', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue(
      '# Markdown output'
    )

    renderWithContext(<WorkflowStateOutput {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })

    const expandButton = screen.getByTestId('expand-icon').closest('button')
    await user.click(expandButton!)

    await waitFor(() => {
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('# Markdown output')
    })
  })
})
