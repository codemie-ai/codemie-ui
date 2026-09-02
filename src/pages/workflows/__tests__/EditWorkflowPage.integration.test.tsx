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
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { mockAPI, renderPage } from '@/test-utils/integration'
import type { Workflow } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

// `@/router` pulls in MarkdownEditor → react-syntax-highlighter, which crashes
// under this environment's ESM/CJS setup (same pattern as WorkflowCard tests).
vi.mock('react-syntax-highlighter', () => ({
  Prism: () => null,
}))
vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  dracula: {},
  prism: {},
}))

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
  appInfoStore.configs = [{ id: 'features:workflowAI', settings: { enabled: true } } as any]
  appInfoStore.isConfigFetched = true
})

afterEach(() => {
  vi.clearAllMocks()
  ;(mockRouterState as any).params = {}
})

describe('EditWorkflowPage - AI Refine and Revert', () => {
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

describe('EditWorkflowPage - Version History restore', () => {
  const restoredYaml = 'states:\n  - id: restored-from-history\n# keep-me\n'

  const historyWorkflow = () =>
    createWorkflowFixture({
      yaml_config_history: [
        {
          date: '2026-01-01T00:00:00Z',
          yaml_config: restoredYaml,
          created_by: { user_id: 'u1', username: 'alice', name: 'Alice' },
        },
      ],
    })

  it('restores history YAML into the editor without calling rollback', async () => {
    mockAPI('GET', 'v1/workflows/id/wf-edit-1', historyWorkflow())
    mockAPI('PUT', 'v1/workflows/wf-edit-1', historyWorkflow())
    renderPage('/workflows/wf-edit-1/edit')

    await user.click(await screen.findByRole('button', { name: 'YAML' }))

    await user.click(
      await screen.findByRole('button', { name: /Version History \(visual editor\)/i })
    )
    await screen.findByRole('heading', { name: 'Version History' })
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Restore this version?' })).getByRole(
        'button',
        { name: 'Restore' }
      )
    )

    await waitFor(() => {
      expect(toaster.info).toHaveBeenCalledWith('Workflow YAML has been restored successfully!')
    })
    expect(screen.queryByText(/Rollback creates a new current version/i)).not.toBeInTheDocument()
    expect(toaster.success).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/rollback'),
      expect.anything()
    )

    const headerSave = within(
      screen.getByRole('button', { name: /Save and Run/i }).parentElement as HTMLElement
    ).getByRole('button', { name: 'Save' })
    await user.click(headerSave)
    await waitFor(() => {
      const putCall = vi.mocked(global.fetch).mock.calls.find(([input, init]) => {
        let path: string
        if (typeof input === 'string') {
          path = input
        } else if (input instanceof URL) {
          path = input.href
        } else {
          path = input.url
        }
        const method = (init?.method ?? 'GET').toUpperCase()
        return method === 'PUT' && path.includes('v1/workflows/wf-edit-1')
      })
      expect(putCall).toBeDefined()
      const rawBody = putCall?.[1]?.body
      if (typeof rawBody !== 'string') {
        throw new Error('Expected PUT body to be a string')
      }
      const body = JSON.parse(rawBody)
      expect(body.yaml_config).toContain('restored-from-history')
      expect(body.yaml_config).not.toContain('# keep-me')
    })
  })
})
