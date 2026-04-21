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

import { Workflow, WorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionConfiguration from '../WorkflowExecutionConfiguration'

vi.hoisted(() => vi.resetModules())

vi.mock('primereact/hooks', () => ({
  useMountEffect: vi.fn(),
}))

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChanges: vi.fn(() => ({
    unblockTransition: vi.fn(),
    blockTransition: vi.fn(),
  })),
}))

const { mockWorkflowExecutionsStore } = vi.hoisted(() => {
  return {
    mockWorkflowExecutionsStore: {
      isWorkflowLoading: false,
    },
  }
})

const { mockAppInfoStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      configs: [],
      isConfigFetched: true,
    },
  }
})

vi.mock('@/store', () => ({
  default: {},
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn((store: any) => {
      // Return the store itself since our mocks are already properly structured
      return store
    }),
  }
})

vi.mock('../WorkflowExecutionConfigForm', () => ({
  default: ({ workflow, onCancel }: any) => (
    <div data-testid="config-form">
      <div data-testid="form-workflow-id">{workflow.id}</div>
      <h3>Edit Workflow</h3>
      <button onClick={onCancel}>Cancel</button>
      <button>Update</button>
    </div>
  ),
}))

vi.mock('../WorkflowExecutionConfigDetails', () => ({
  default: ({ workflow, onConfigureClick }: any) => (
    <div data-testid="config-details">
      <div data-testid="details-workflow-id">{workflow.id}</div>
      <button onClick={onConfigureClick}>Configure</button>
    </div>
  ),
}))

vi.mock('../WorkflowExecutionConfigYaml', () => ({
  default: ({ workflow, execution }: any) => (
    <div data-testid="config-yaml">
      <div data-testid="yaml-workflow-id">{workflow.id}</div>
      <div data-testid="yaml-execution-id">{execution.execution_id}</div>
      <button>Edit</button>
    </div>
  ),
}))

vi.mock('@/components/Spinner', () => ({
  default: ({ inline }: { inline?: boolean }) => (
    <div data-testid="spinner" data-inline={inline}>
      Loading...
    </div>
  ),
}))

const mockWorkflow = {
  id: 'workflow-123',
  name: 'Test Workflow',
  description: 'Test Description',
  yaml_config: 'test: config',
} as Workflow

const mockExecution = {
  execution_id: 'exec-456',
  overall_status: 'running',
  prompt: 'Test prompt',
} as unknown as WorkflowExecution

describe('WorkflowExecutionConfiguration', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockWorkflowExecutionsStore.isWorkflowLoading = false
  })

  it('renders nothing when not expanded', () => {
    const { container } = render(
      <WorkflowExecutionConfiguration
        isExpanded={false}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    const aside = container.querySelector('aside')
    expect(aside).toHaveClass('w-0')
    expect(screen.queryByText('Configure Workflow')).not.toBeInTheDocument()
  })

  it('renders content when expanded', () => {
    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    expect(screen.getByText('Configure Workflow')).toBeInTheDocument()
    expect(screen.getByTestId('config-details')).toBeInTheDocument()
  })

  it('applies correct width classes when expanded', () => {
    const { container } = render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    const aside = container.querySelector('aside')
    expect(aside).toHaveClass('w-96')
    expect(aside).toHaveClass('max-w-96')
  })

  it('does not show spinner when not loading', () => {
    mockWorkflowExecutionsStore.isWorkflowLoading = false

    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
  })

  it('renders WorkflowExecutionConfigDetails by default', () => {
    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    expect(screen.getByTestId('config-details')).toBeInTheDocument()
    expect(screen.getByText('Configure')).toBeInTheDocument()
    expect(screen.getByTestId('details-workflow-id')).toHaveTextContent('workflow-123')
  })

  it('renders WorkflowExecutionConfigYaml when execution is provided', () => {
    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    expect(screen.getByTestId('config-yaml')).toBeInTheDocument()
    expect(screen.getByTestId('yaml-workflow-id')).toHaveTextContent('workflow-123')
    expect(screen.getByTestId('yaml-execution-id')).toHaveTextContent('exec-456')
  })

  it('does not render WorkflowExecutionConfigYaml when execution is null', () => {
    render(
      <WorkflowExecutionConfiguration isExpanded={true} workflow={mockWorkflow} execution={null} />
    )

    expect(screen.queryByTestId('config-yaml')).not.toBeInTheDocument()
  })

  it('switches to edit form when configure button is clicked', async () => {
    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    expect(screen.getByTestId('config-details')).toBeInTheDocument()
    expect(screen.queryByTestId('config-form')).not.toBeInTheDocument()

    await user.click(screen.getByText('Configure'))

    expect(screen.queryByTestId('config-details')).not.toBeInTheDocument()
    expect(screen.getByTestId('config-form')).toBeInTheDocument()
    expect(screen.getByText('Edit Workflow')).toBeInTheDocument()
  })

  it('switches back to details view when cancel is clicked in form', async () => {
    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    // Open form
    await user.click(screen.getByText('Configure'))
    expect(screen.getByTestId('config-form')).toBeInTheDocument()

    // Click cancel
    await user.click(screen.getByText('Cancel'))

    expect(screen.queryByTestId('config-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('config-details')).toBeInTheDocument()
  })

  it('passes correct props to WorkflowExecutionConfigForm', async () => {
    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    await user.click(screen.getByText('Configure'))

    expect(screen.getByTestId('form-workflow-id')).toHaveTextContent('workflow-123')
  })

  it('hides YAML section when in edit mode', async () => {
    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    // Initially shows YAML
    expect(screen.getByTestId('config-yaml')).toBeInTheDocument()

    // Switch to edit mode
    await user.click(screen.getByText('Configure'))

    // YAML section should be hidden
    expect(screen.queryByTestId('config-yaml')).not.toBeInTheDocument()
  })

  it('shows YAML section after canceling edit mode', async () => {
    render(
      <WorkflowExecutionConfiguration
        isExpanded={true}
        workflow={mockWorkflow}
        execution={mockExecution}
      />
    )

    // Open edit form
    await user.click(screen.getByText('Configure'))
    expect(screen.queryByTestId('config-yaml')).not.toBeInTheDocument()

    // Cancel edit
    await user.click(screen.getByText('Cancel'))

    // YAML should be visible again
    expect(screen.getByTestId('config-yaml')).toBeInTheDocument()
  })
})
