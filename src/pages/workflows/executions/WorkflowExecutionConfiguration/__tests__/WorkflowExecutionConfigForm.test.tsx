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
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { Workflow } from '@/types/entity/workflow'

import WorkflowExecutionConfigForm from '../WorkflowExecutionConfigForm'

vi.mock('../../WorkflowForm', () => ({
  default: React.forwardRef(() => <div data-testid="workflow-form">Workflow Form</div>),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({
    currentRoute: {
      value: {
        params: { id: 'test-id' },
      },
    },
    replace: vi.fn(),
  })),
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    updateWorkflow: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
  },
}))

const mockWorkflow: Workflow = {
  id: 'workflow-123',
  name: 'Test Workflow',
  yaml_config: 'test: config',
} as Workflow

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<UnsavedChangesProvider>{ui}</UnsavedChangesProvider>)
}

describe('WorkflowExecutionConfigForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form header', () => {
    renderWithProvider(<WorkflowExecutionConfigForm workflow={mockWorkflow} onCancel={vi.fn()} />)

    expect(screen.getByText('Edit Workflow')).toBeInTheDocument()
  })

  it('renders Cancel button', () => {
    renderWithProvider(<WorkflowExecutionConfigForm workflow={mockWorkflow} onCancel={vi.fn()} />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('renders Update button', () => {
    renderWithProvider(<WorkflowExecutionConfigForm workflow={mockWorkflow} onCancel={vi.fn()} />)

    expect(screen.getByText('Update')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    renderWithProvider(<WorkflowExecutionConfigForm workflow={mockWorkflow} onCancel={onCancel} />)

    await user.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('has proper button layout', () => {
    const { container } = renderWithProvider(
      <WorkflowExecutionConfigForm workflow={mockWorkflow} onCancel={vi.fn()} />
    )

    const buttonContainer = container.querySelector('.flex.gap-3')
    expect(buttonContainer).toBeInTheDocument()
  })

  it('renders with proper structure', () => {
    const { container } = renderWithProvider(
      <WorkflowExecutionConfigForm workflow={mockWorkflow} onCancel={vi.fn()} />
    )

    expect(container.firstChild).toBeInTheDocument()
  })
})
