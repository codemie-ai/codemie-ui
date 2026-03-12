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

import WorkflowExecutionHistory from '../WorkflowExecutionHistory'

const mockExecutionsStore = vi.hoisted(() => {
  return {
    executions: [] as WorkflowExecution[],
    getExecutions: vi.fn(),
  }
})

const mockAppInfoStore = vi.hoisted(() => {
  return {
    sidebarExpanded: true,
  }
})

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: mockExecutionsStore,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/hooks/usePolling', () => ({
  usePolling: vi.fn(),
}))

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => mockRouter }))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <div data-testid="delete-icon">DeleteIcon</div>,
}))

describe('WorkflowExecutionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecutionsStore.executions = []
    mockAppInfoStore.sidebarExpanded = true
  })

  it('renders header', () => {
    render(<WorkflowExecutionHistory workflowId="workflow-1" />)

    expect(screen.getByText('Workflow Execution History')).toBeInTheDocument()
  })

  it('renders with empty executions array', () => {
    mockExecutionsStore.executions = []

    const { container } = render(<WorkflowExecutionHistory workflowId="workflow-1" />)

    expect(screen.getByText('Workflow Execution History')).toBeInTheDocument()
    expect(container.querySelector('aside')).toBeInTheDocument()
  })
})
