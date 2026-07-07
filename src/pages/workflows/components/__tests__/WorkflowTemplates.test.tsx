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
import { describe, expect, it, vi, beforeEach } from 'vitest'

import WorkflowTemplates from '../WorkflowTemplates'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({ push: vi.fn() })),
  useVueRoute: vi.fn(() => ({ path: '/workflows/templates', query: {} })),
}))
vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    workflowTemplates: [],
    workflowsTemplatesLoading: false,
    workflowTemplatesPagination: { page: 0, perPage: 12, totalPages: 0, totalCount: 0 },
    indexWorkflowTemplates: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('../WorkflowCard', () => ({
  default: ({ workflow }: any) => <div data-testid="workflow-card">{workflow.name}</div>,
}))
vi.mock('@/components/Spinner', () => ({ default: () => <div data-testid="spinner" /> }))

const makeTemplate = (overrides = {}) => ({
  id: '1',
  slug: 'test-template',
  name: 'Test Template',
  created_by: { name: 'John Doe', username: 'john' },
  categories: [],
  ...overrides,
})

describe('WorkflowTemplates', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { workflowsStore } = await import('@/store/workflows')
    ;(workflowsStore as any).workflowTemplates = []
    ;(workflowsStore as any).workflowsTemplatesLoading = false
    ;(workflowsStore as any).workflowTemplatesPagination = {
      page: 0,
      perPage: 12,
      totalPages: 0,
      totalCount: 0,
    }
  })

  it('shows spinner while loading', async () => {
    const { workflowsStore } = await import('@/store/workflows')
    ;(workflowsStore as any).workflowsTemplatesLoading = true
    render(<WorkflowTemplates />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('shows empty state when no templates', () => {
    render(<WorkflowTemplates />)
    expect(screen.getByText(/no templates found/i)).toBeInTheDocument()
  })

  it('renders all templates', async () => {
    const { workflowsStore } = await import('@/store/workflows')
    ;(workflowsStore as any).workflowTemplates = [
      makeTemplate({ id: '1', name: 'Alpha' }),
      makeTemplate({ id: '2', slug: 'beta', name: 'Beta' }),
    ]
    ;(workflowsStore as any).workflowTemplatesPagination.totalCount = 2
    render(<WorkflowTemplates />)
    expect(screen.getAllByTestId('workflow-card')).toHaveLength(2)
    expect(screen.getByText('2 TEMPLATES')).toBeInTheDocument()
  })
})
