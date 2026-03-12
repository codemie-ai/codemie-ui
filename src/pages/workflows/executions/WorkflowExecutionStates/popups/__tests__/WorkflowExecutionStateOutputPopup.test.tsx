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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { WorkflowExecutionState } from '@/types/entity/workflow'

import WorkflowExecutionStateOutputPopup from '../WorkflowExecutionStateOutputPopup'

vi.hoisted(() => vi.resetModules())

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

vi.mock('@/components/Popup', () => ({
  default: ({ visible, header, children, onHide }: any) =>
    visible ? (
      <div data-testid="popup">
        <div data-testid="popup-header">{header}</div>
        <div data-testid="popup-body">{children}</div>
        <button onClick={onHide}>Close</button>
      </div>
    ) : null,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('@/components/markdown/TextBlock', () => ({
  default: ({ text }: { text: string }) => <div data-testid="text-block">{text}</div>,
}))

describe('WorkflowExecutionStateOutputPopup', () => {
  const mockState: WorkflowExecutionState = {
    id: 'state-123',
    date: '2024-01-01T10:00:00Z',
    update_date: '2024-01-01T10:05:00Z',
    execution_id: 'execution-1',
    name: 'Data Processing',
    task: 'Process user data',
    status: 'Succeeded',
    started_at: '2024-01-01T10:00:00Z',
    completed_at: '2024-01-01T10:05:00Z',
    output: null,
    error: null,
    thoughts: [],
  }

  const defaultProps = {
    visible: true,
    workflowId: 'workflow-123',
    executionId: 'execution-456',
    state: mockState,
    onHide: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Output data')
    const { container } = render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('does not render when visible is false', () => {
    render(<WorkflowExecutionStateOutputPopup {...defaultProps} visible={false} />)
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('displays correct header with state name', () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Output data')
    render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    expect(screen.getByTestId('popup-header')).toHaveTextContent(
      'Execution State Output for Data Processing'
    )
  })

  it('displays empty header when state has no name', () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Output data')
    const stateWithoutName = { ...mockState, name: '' }
    render(<WorkflowExecutionStateOutputPopup {...defaultProps} state={stateWithoutName} />)

    expect(screen.getByTestId('popup-header')).toHaveTextContent('Execution State Output for')
  })

  it('displays spinner while loading output', () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockImplementation(
      () => new Promise(() => {})
    )
    render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('text-block')).not.toBeInTheDocument()
  })

  it('fetches and displays state output when visible', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue(
      'Successfully processed 100 records'
    )

    render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledWith(
        'workflow-123',
        'execution-456',
        'state-123'
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('text-block')).toBeInTheDocument()
      expect(screen.getByTestId('text-block')).toHaveTextContent(
        'Successfully processed 100 records'
      )
    })
  })

  it('displays empty string when output is empty', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('')

    render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('text-block')).toBeInTheDocument()
      expect(screen.getByTestId('text-block')).toHaveTextContent('')
    })
  })

  it('displays empty string when API returns null', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue(null)

    render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('text-block')).toBeInTheDocument()
      expect(screen.getByTestId('text-block')).toHaveTextContent('')
    })
  })

  it('handles error when fetching output fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockRejectedValue(
      new Error('Network error')
    )

    render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching state output:',
        expect.any(Error)
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('text-block')).toBeInTheDocument()
      expect(screen.getByTestId('text-block')).toHaveTextContent('')
    })

    consoleErrorSpy.mockRestore()
  })

  it('does not fetch output when state has no id', () => {
    const stateWithoutId = { ...mockState, id: '' }
    render(<WorkflowExecutionStateOutputPopup {...defaultProps} state={stateWithoutId} />)

    expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).not.toHaveBeenCalled()
  })

  it('does not fetch output when not visible', () => {
    render(<WorkflowExecutionStateOutputPopup {...defaultProps} visible={false} />)

    expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).not.toHaveBeenCalled()
  })

  it('refetches output when visibility changes', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('First output')

    const { rerender } = render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledTimes(1)
    })

    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Second output')

    rerender(<WorkflowExecutionStateOutputPopup {...defaultProps} visible={false} />)
    rerender(<WorkflowExecutionStateOutputPopup {...defaultProps} visible={true} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledTimes(2)
    })
  })

  it('refetches output when state id changes', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('First output')

    const { rerender } = render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledWith(
        'workflow-123',
        'execution-456',
        'state-123'
      )
    })

    const newState = { ...mockState, id: 'state-456', name: 'New State' }
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Second output')

    rerender(<WorkflowExecutionStateOutputPopup {...defaultProps} state={newState} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledWith(
        'workflow-123',
        'execution-456',
        'state-456'
      )
    })
  })

  it('refetches output when workflowId changes', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('First output')

    const { rerender } = render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledWith(
        'workflow-123',
        'execution-456',
        'state-123'
      )
    })

    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Second output')

    rerender(<WorkflowExecutionStateOutputPopup {...defaultProps} workflowId="workflow-new" />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledWith(
        'workflow-new',
        'execution-456',
        'state-123'
      )
    })
  })

  it('refetches output when executionId changes', async () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('First output')

    const { rerender } = render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledWith(
        'workflow-123',
        'execution-456',
        'state-123'
      )
    })

    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Second output')

    rerender(<WorkflowExecutionStateOutputPopup {...defaultProps} executionId="execution-new" />)

    await waitFor(() => {
      expect(mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput).toHaveBeenCalledWith(
        'workflow-123',
        'execution-new',
        'state-123'
      )
    })
  })

  it('calls onHide when close button is clicked', () => {
    mockWorkflowExecutionsStore.getWorkflowExecutionStateOutput.mockResolvedValue('Output data')
    render(<WorkflowExecutionStateOutputPopup {...defaultProps} />)

    const closeButton = screen.getByText('Close')
    closeButton.click()

    expect(defaultProps.onHide).toHaveBeenCalledTimes(1)
  })
})
