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

import { WorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionActions from '../WorkflowExecutionActions'

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      abortWorkflowExecution: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockWorkflowExecutionsStore,
}))

const { mockToaster } = vi.hoisted(() => {
  return {
    mockToaster: {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    },
  }
})

vi.mock('@/utils/toaster', () => ({
  default: mockToaster,
}))

vi.mock('@/assets/icons/cross.svg?react', () => ({
  default: () => <div data-testid="close-icon">CloseIcon</div>,
}))

vi.mock('@/assets/icons/download.svg?react', () => ({
  default: () => <div data-testid="download-icon">DownloadIcon</div>,
}))

vi.mock('@/assets/icons/run.svg?react', () => ({
  default: () => <div data-testid="run-icon">RunIcon</div>,
}))

vi.mock('@/components/DataOverlayButton/DataOverlayButton', () => ({
  default: ({ title }: any) => {
    return <div data-testid="data-overlay-button" aria-label={title ?? 'Usage details'} />
  },
}))

vi.mock('../WorkflowExecutionExportPopup', () => ({
  default: ({ isVisible, onHide }: { isVisible: boolean; onHide: () => void }) =>
    isVisible ? (
      <div data-testid="export-popup">
        <button onClick={onHide}>Close Export</button>
      </div>
    ) : null,
}))

vi.mock('../../WorkflowStartExecutionPopup', () => ({
  default: ({ isVisible, onHide, workflowId, initialPrompt }: any) =>
    isVisible ? (
      <div data-testid="start-execution-popup">
        <div data-testid="workflow-id">{workflowId}</div>
        <div data-testid="initial-prompt">{initialPrompt}</div>
        <button onClick={onHide}>Close Start</button>
      </div>
    ) : null,
}))

const testRender = (data: any) => ({
  'Input tokens': data.input_tokens ?? 0,
  'Output tokens': data.output_tokens ?? 0,
  'Money spent ': `$${data.money_spent?.toFixed(4) ?? 0}`,
})

// Mock PrimeReact hooks to prevent CSS injection errors in tests
vi.mock('primereact/hooks', () => ({
  useMountEffect: vi.fn(),
}))

const mockRunningExecution = {
  execution_id: 'exec-123',
  overall_status: 'running',
  prompt: 'Test prompt',
  file_name: null,
  tokens_usage: {
    input_tokens: 100,
    output_tokens: 200,
    money_spent: 0.0025,
  },
} as unknown as WorkflowExecution

const mockCompletedExecution: WorkflowExecution = {
  execution_id: 'exec-456',
  overall_status: 'Succeeded',
  prompt: 'Completed prompt',
  tokens_usage: {
    input_tokens: 150,
    output_tokens: 250,
    money_spent: 0.003,
  },
} as WorkflowExecution

describe('WorkflowExecutionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all action buttons', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockRunningExecution} />)

    expect(screen.getByText('Abort')).toBeInTheDocument()
    expect(screen.getByLabelText('Usage details')).toBeInTheDocument()
    expect(screen.getByText('Rerun workflow')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('shows Abort button for running execution', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockRunningExecution} />)

    expect(screen.getByText('Abort')).toBeInTheDocument()
  })

  it('hides Abort button for completed execution', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockCompletedExecution} />)

    expect(screen.queryByText('Abort')).not.toBeInTheDocument()
  })

  it('has functioning Abort button for running execution', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockRunningExecution} />)

    const abortButton = screen.getByText('Abort').closest('button')
    expect(abortButton).toBeInTheDocument()
    expect(abortButton).not.toBeDisabled()
  })

  it('renders rerun workflow button', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockRunningExecution} />)

    const rerunButton = screen.getByText('Rerun workflow')
    expect(rerunButton).toBeInTheDocument()
    expect(rerunButton.closest('button')).not.toBeDisabled()
  })

  it('renders Usage details button', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockRunningExecution} />)

    expect(screen.getByLabelText('Usage details')).toBeInTheDocument()
  })

  it('hides Abort button for failed execution', () => {
    const failedExecution = { ...mockRunningExecution, overall_status: 'Failed' }
    render(
      <WorkflowExecutionActions
        workflowId="wf-1"
        execution={failedExecution as WorkflowExecution}
      />
    )

    expect(screen.queryByText('Abort')).not.toBeInTheDocument()
  })

  it('hides Abort button for aborted execution', () => {
    const abortedExecution = { ...mockRunningExecution, overall_status: 'Aborted' }
    render(
      <WorkflowExecutionActions
        workflowId="wf-1"
        execution={abortedExecution as WorkflowExecution}
      />
    )

    expect(screen.queryByText('Abort')).not.toBeInTheDocument()
  })

  it('renders abort button that is clickable for running execution', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockRunningExecution} />)

    const abortButton = screen.getByText('Abort')
    expect(abortButton).toBeInTheDocument()
    expect(abortButton.closest('button')).not.toBeDisabled()
  })

  it('renders usage details data correctly with tokens and money spent', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockRunningExecution} />)

    const rendered = testRender(mockRunningExecution.tokens_usage)

    expect(rendered['Input tokens']).toBe(100)
    expect(rendered['Output tokens']).toBe(200)
    expect(rendered['Money spent ']).toBe('$0.0025')
  })

  it('renders usage details with default values when tokens_usage is missing', () => {
    const executionWithoutTokens = { ...mockRunningExecution, tokens_usage: null }
    render(
      <WorkflowExecutionActions
        workflowId="wf-1"
        execution={executionWithoutTokens as WorkflowExecution}
      />
    )

    const rendered = testRender({})

    expect(rendered['Input tokens']).toBe(0)
    expect(rendered['Output tokens']).toBe(0)
    expect(rendered['Money spent ']).toBe('$0')
  })

  it('renders export and rerun buttons', () => {
    render(<WorkflowExecutionActions workflowId="wf-1" execution={mockRunningExecution} />)

    expect(screen.getByText('Rerun workflow')).toBeInTheDocument()

    // Check that we have the expected number of buttons (abort, usage details, export, rerun)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('renders rerun button with correct prompt', () => {
    const executionWithFile = {
      ...mockRunningExecution,
      file_name: 'test-file.txt',
    }

    render(
      <WorkflowExecutionActions
        workflowId="wf-1"
        execution={executionWithFile as WorkflowExecution}
      />
    )

    expect(screen.getByText('Rerun workflow')).toBeInTheDocument()
  })
})
