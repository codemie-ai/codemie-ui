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
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { mockAPI, renderPage } from '@/test-utils/integration'
import type { Workflow } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

describe('EditWorkflowPage - AI Refine and Revert', () => {
  const user = userEvent.setup()

  const createWorkflowFixture = (overrides: Partial<Workflow> = {}): Workflow => ({
    id: 'wf-edit-1',
    slug: 'edit-workflow',
    name: 'Edit Workflow',
    yaml_config: 'states: []',
    yaml_config_history: [
      {
        date: '2026-01-01T00:00:00Z',
        yaml_config: 'states: []\n# v1',
        created_by: { user_id: 'u1', username: 'alice', name: 'Alice' },
      },
    ],
    update_date: '2026-01-02T00:00:00Z',
    user_abilities: ['read', 'write', 'delete'],
    guardrail_assignments: [],
    ...overrides,
  })

  beforeEach(() => {
    ;(mockRouterState as any).params = { id: 'wf-edit-1' }
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    mockAPI('GET', 'v1/workflows/id/wf-edit-1', createWorkflowFixture())
  })

  afterEach(() => {
    vi.clearAllMocks()
    ;(mockRouterState as any).params = {}
  })

  it('renders "Refine with AI" button and hides "Revert to Previous" by default', async () => {
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => {
      expect(screen.getByText('Refine with AI')).toBeInTheDocument()
      expect(screen.queryByText('Revert to Previous')).not.toBeInTheDocument()
    })
  })

  it('"Revert to Previous" is not shown on page load', async () => {
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    expect(screen.queryByText('Revert to Previous')).not.toBeInTheDocument()
  })

  it('"Revert to Previous" appears after an AI refinement is applied', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', {
      yaml_config: 'states: []\n# refined',
    })
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => {
      expect(screen.getByText('Revert to Previous')).toBeInTheDocument()
    })
  })

  it('opens prompt popup when "Refine with AI" is clicked', async () => {
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => {
      expect(screen.getByText('Refine Workflow with AI')).toBeInTheDocument()
    })
  })

  it('calls refine API and shows success toast after submitting prompt', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', {
      yaml_config: 'states: []\n# refined',
    })
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => {
      expect(toaster.info).toHaveBeenCalledWith('AI refine applied — save to confirm')
    })
  })

  it('shows revert confirmation modal when "Revert to Previous" is clicked after refinement', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', {
      yaml_config: 'states: []\n# refined',
    })
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => toaster.info)
    await user.click(screen.getByText('Revert to Previous'))
    await waitFor(() => {
      expect(screen.getByText('Revert to Previous Version')).toBeInTheDocument()
    })
  })

  it('restores pre-refinement YAML and shows success toast on revert confirm', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', {
      yaml_config: 'states: []\n# refined',
    })
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => toaster.info)
    await user.click(screen.getByText('Revert to Previous'))
    await waitFor(() => screen.getByText('Revert to Previous Version'))
    await user.click(screen.getByText('Revert'))
    await waitFor(() => {
      expect(toaster.info).toHaveBeenCalledWith('Reverted to previous version')
    })
  })

  it('shows error toast when refine API fails', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', { error: { message: 'Bad Request' } }, 400)
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Failed to refine workflow')
    })
  })

  it('"Revert to Previous" disappears after a successful save', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', { yaml_config: 'states: []\n# refined' })
    mockAPI('PUT', 'v1/workflows/wf-edit-1', createWorkflowFixture())
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => {
      expect(screen.getByText('Revert to Previous')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(toaster.info).toHaveBeenCalledWith('Workflow has been updated successfully!')
    })
    expect(screen.queryByText('Revert to Previous')).not.toBeInTheDocument()
  })
})
