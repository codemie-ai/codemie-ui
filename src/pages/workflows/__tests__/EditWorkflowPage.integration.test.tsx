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

import { WORKFLOWS_ALL } from '@/constants/routes'
import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { applyOutcome, contractOutcomeStore, handOverIssues } from '@/store/contractOutcome'
import { workflowsStore } from '@/store/workflows'
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

// Back-navigation goes through `navigateBack` → `router.push`, not `useNavigate`, so the shared
// `navigate` spy never sees it; the global `@/hooks/useVueRouter` mock records it on
// `mockRouterState.push`. Opened directly, the edit page has no history and falls back to the list.
const BACK_ROUTE = { name: WORKFLOWS_ALL }

const urlOf = (input: RequestInfo | URL | undefined): string => {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input?.url ?? ''
}

// The fixed, safe body the backend returns for a database failure.
const UNAVAILABLE_ENVELOPE = {
  error: { message: 'Service unavailable', details: 'Please try again later' },
}

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
  contractOutcomeStore.outcome = null
  ;(mockRouterState as any).params = { id: 'wf-edit-1' }
  mockRouterState.push.mockClear()
  mockRouterState.replace.mockClear()
  mockAPI('GET', 'v1/workflows/id/wf-edit-1', createWorkflowFixture())
  appInfoStore.configs = [
    { id: 'features:workflowAI', settings: { enabled: true } } as any,
    { id: 'features:workflowContracts', settings: { enabled: true } } as any,
  ]
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
    mockAPI('POST', 'v1/workflows/wf-edit-1/validate', {})
    renderPage('/workflows/wf-edit-1/edit')

    await user.click(await screen.findByRole('button', { name: 'YAML' }))

    const historyButton = await screen.findByRole('button', {
      name: 'Version History (YAML)',
    })
    await user.click(historyButton)
    await screen.findByRole('heading', { name: 'Version History' })
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Restore this version?' })).getByRole(
        'button',
        { name: 'Restore' }
      )
    )

    await waitFor(() => {
      expect(toaster.info).toHaveBeenCalledWith('Workflow YAML restored — checking for issues…')
    })
    await waitFor(() =>
      expect(toaster.success).toHaveBeenCalledWith('No issues found in the restored workflow')
    )
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

describe('EditWorkflowPage - contract save outcomes', () => {
  const contractWarning = (id: string, outcome = 'WARNING') => ({
    id,
    kind: 'contract_validation',
    outcome,
    state_id: 's1',
    path: 'task',
    message: `issue ${id}`,
    config_section: 'states',
    config_line: 3,
  })
  const coverage = {
    validated_states: 1,
    total_states: 1,
    uncovered_state_ids: [],
    analysed: true,
    cap_reached: false,
  }
  const warnedBody = (outcome2 = 'WARNING') => ({
    message: 'Workflow updated successfully',
    warnings: [
      contractWarning('w1'),
      contractWarning('w2', outcome2),
      contractWarning('u1', 'UNVERIFIED'),
    ],
    coverage,
  })

  const clickSave = async (name = 'Save') => {
    await screen.findByText('Refine with AI')
    await waitFor(() => expect(screen.getByRole('button', { name })).toBeEnabled())
    await user.click(screen.getByRole('button', { name }))
  }

  it("navigates back with today's toast on a clean save", async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', { message: 'ok', warnings: [] })
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()
    await waitFor(() => expect(mockRouterState.push).toHaveBeenCalledWith(BACK_ROUTE))
    expect(toaster.info).toHaveBeenCalledWith('Workflow has been updated successfully!')
  })

  it('treats an UNVERIFIED-only save as clean', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', {
      message: 'ok',
      warnings: [contractWarning('u1', 'UNVERIFIED')],
      coverage,
    })
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()
    await waitFor(() => expect(mockRouterState.push).toHaveBeenCalledWith(BACK_ROUTE))
    expect(toaster.info).toHaveBeenCalledWith('Workflow has been updated successfully!')
    expect(screen.queryByRole('button', { name: 'Run anyway' })).not.toBeInTheDocument()
  })

  it('stays on the page when a 2xx save body carries an ERROR', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', {
      message: 'ok',
      warnings: [contractWarning('e1', 'ERROR')],
      coverage,
    })
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()

    expect(await screen.findByRole('button', { name: 'Run anyway' })).toBeInTheDocument()
    expect(mockRouterState.push).not.toHaveBeenCalled()
    expect(toaster.info).not.toHaveBeenCalledWith('Workflow has been updated successfully!')
  })

  it('stays on the page and points to Check when the save body cannot be read', async () => {
    vi.spyOn(workflowsStore, 'updateWorkflow').mockResolvedValueOnce({
      json: () => Promise.reject(new SyntaxError('bad json')),
    } as unknown as Response)
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()

    await waitFor(() =>
      expect(toaster.info).toHaveBeenCalledWith(expect.stringContaining('Run Check'))
    )
    expect(mockRouterState.push).not.toHaveBeenCalled()
    expect(toaster.info).not.toHaveBeenCalledWith('Workflow has been updated successfully!')
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('stays on the page after a WARNING save with one summary toast, the panel open and the saved header', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', warnedBody())
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()

    expect(await screen.findByRole('button', { name: 'Run anyway' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Saved/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save and Run' })).not.toBeInTheDocument()
    expect(mockRouterState.push).not.toHaveBeenCalled()
    expect(toaster.info).toHaveBeenCalledWith('Workflow saved with 2 warnings')
    expect(toaster.info).not.toHaveBeenCalledWith('Workflow has been updated successfully!')
    expect(toaster.info).toHaveBeenCalledTimes(1)
    expect(contractOutcomeStore.outcome?.context).toBe('saved')
    expect(contractOutcomeStore.outcome?.key).toBe('wf-edit-1')
    expect(await screen.findByText('Saved with warnings')).toBeInTheDocument()
  })

  it('uses the singular for a single warning', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', {
      warnings: [contractWarning('w1')],
      coverage,
    })
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Workflow saved with 1 warning'))
  })

  it('does not open the run popup on Save and Run with a warning, and Run anyway opens it without saving', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', warnedBody())
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave('Save and Run')

    const runAnyway = await screen.findByRole('button', { name: 'Run anyway' })
    expect(screen.queryByText('New Workflow Execution')).not.toBeInTheDocument()

    const putCount = () =>
      vi.mocked(global.fetch).mock.calls.filter(([, init]) => init?.method === 'PUT').length
    const before = putCount()
    await user.click(runAnyway)
    expect(await screen.findByText('New Workflow Execution')).toBeInTheDocument()
    expect(putCount()).toBe(before)
  })

  it('Done leaves the page without a confirmation dialog', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', warnedBody())
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()
    await user.click(await screen.findByRole('button', { name: 'Done' }))
    expect(mockRouterState.push).toHaveBeenCalledWith(BACK_ROUTE)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('restores Cancel, Save and Save and Run once the form is edited again', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', warnedBody())
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()
    await screen.findByRole('button', { name: 'Run anyway' })

    // An AI refinement changes the YAML, which makes the form dirty again.
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', {
      yaml_config: 'max_concurrency: 3\nstates: []',
    })
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])

    expect(await screen.findByRole('button', { name: 'Save and Run' })).toBeInTheDocument()
    const header = screen.getByRole('button', { name: 'Save and Run' }).parentElement as HTMLElement
    expect(within(header).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'Save' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Run anyway' })).not.toBeInTheDocument()
  })

  it('opens the panel with every group and no banner when the save is rejected', async () => {
    mockAPI(
      'PUT',
      'v1/workflows/wf-edit-1',
      {
        error: {
          message: 'Workflow Configuration error',
          help: '',
          details: {
            error_type: 'contract_validation',
            message: 'Workflow contracts are not satisfied',
            errors: [
              {
                id: 'e1',
                outcome: 'ERROR',
                state_id: 's1',
                path: 'task',
                message: 'broken contract',
                config_section: 'states',
                config_line: 3,
              },
            ],
            warnings: [contractWarning('w1')],
            coverage,
          },
        },
      },
      400
    )
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()

    expect(await screen.findByText('broken contract')).toBeInTheDocument()
    expect(screen.queryByText('Saved with warnings')).not.toBeInTheDocument()
    expect(screen.queryByText('Changes not saved yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Run anyway' })).not.toBeInTheDocument()
    expect(mockRouterState.push).not.toHaveBeenCalled()
    expect(contractOutcomeStore.outcome?.context).toBe('rejected')
  })

  it('does not open the run popup when Save and Run is rejected', async () => {
    mockAPI(
      'PUT',
      'v1/workflows/wf-edit-1',
      {
        error: {
          message: 'Workflow Configuration error',
          details: {
            error_type: 'contract_validation',
            errors: [
              {
                id: 'e1',
                outcome: 'ERROR',
                state_id: 's1',
                path: 'task',
                message: 'broken contract',
              },
            ],
            warnings: [],
          },
        },
      },
      400
    )
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave('Save and Run')
    expect(await screen.findByText('broken contract')).toBeInTheDocument()
    expect(screen.queryByText('New Workflow Execution')).not.toBeInTheDocument()
  })

  it.each(['Save', 'Save and Run'])(
    'shows the safe 503 message on %s, keeps the edits and reports no success or clean result',
    async (button) => {
      mockAPI('PUT', 'v1/workflows/wf-edit-1', UNAVAILABLE_ENVELOPE, 503)
      renderPage('/workflows/wf-edit-1/edit')
      await screen.findByText('Refine with AI')
      // An AI refinement is the edit: it dirties the form and enables "Revert to Previous".
      mockAPI('POST', 'v1/workflows/wf-edit-1/refine', { yaml_config: 'states: []\n# refined' })
      await user.click(screen.getByText('Refine with AI'))
      await waitFor(() => screen.getByText('Refine Workflow with AI'))
      const refineButtons = screen.getAllByText('Refine with AI')
      await user.click(refineButtons[refineButtons.length - 1])
      await screen.findByText('Revert to Previous')
      vi.mocked(toaster.info).mockClear()
      await clickSave(button)

      await waitFor(() =>
        expect(toaster.error).toHaveBeenCalledWith('Service unavailable: Please try again later')
      )
      expect(toaster.info).not.toHaveBeenCalled()
      expect(toaster.success).not.toHaveBeenCalled()
      expect(mockRouterState.push).not.toHaveBeenCalled()
      expect(screen.queryByText('New Workflow Execution')).not.toBeInTheDocument()
      expect(screen.queryByText('Saved with warnings')).not.toBeInTheDocument()
      expect(screen.queryByText('No issues found')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Run anyway' })).not.toBeInTheDocument()
      expect(contractOutcomeStore.outcome).toBeNull()
      expect(screen.getByText('Revert to Previous')).toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: button })).toBeEnabled())
    }
  )

  const createdWarning = {
    id: 'w1',
    message: 'created warning',
    path: 'task',
    stateId: 's1',
    configLine: 3,
    error_type: 'contract_validation',
    outcome: 'WARNING',
  } as any

  it('consumes a created hand-off on mount: saved header, one toast and the open panel', async () => {
    applyOutcome({ coverage }, 'created', 'wf-edit-1')
    handOverIssues('wf-edit-1', [createdWarning])
    renderPage('/workflows/wf-edit-1/edit')

    expect(await screen.findByRole('button', { name: 'Run anyway' })).toBeInTheDocument()
    expect(toaster.info).toHaveBeenCalledTimes(1)
    expect(toaster.info).toHaveBeenCalledWith('Workflow saved with 1 warning')
    expect(await screen.findByText('Workflow created with warnings')).toBeInTheDocument()
    expect(await screen.findByText('created warning')).toBeInTheDocument()
    expect(contractOutcomeStore.outcome?.key).toBe('wf-edit-1')
  })

  it('takes the hand-off only once: a second visit starts clean', async () => {
    applyOutcome({ coverage }, 'created', 'wf-edit-1')
    handOverIssues('wf-edit-1', [createdWarning])
    const first = renderPage('/workflows/wf-edit-1/edit')
    await screen.findByRole('button', { name: 'Run anyway' })
    first.unmount()

    applyOutcome({ coverage }, 'created', 'wf-edit-1')
    renderPage('/workflows/wf-edit-1/edit')
    await screen.findByText('Refine with AI')

    expect(screen.queryByRole('button', { name: 'Run anyway' })).not.toBeInTheDocument()
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('drops issues handed over for another workflow and resets the outcome on mount', async () => {
    applyOutcome({ coverage }, 'created', 'wf-edit-1')
    handOverIssues('other-wf', [createdWarning])
    renderPage('/workflows/wf-edit-1/edit')
    await screen.findByText('Refine with AI')

    expect(screen.queryByRole('button', { name: 'Run anyway' })).not.toBeInTheDocument()
    expect(screen.queryByText('created warning')).not.toBeInTheDocument()
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('clears an outcome that belongs to another workflow on mount', async () => {
    applyOutcome({}, 'created', 'other-wf')
    renderPage('/workflows/wf-edit-1/edit')
    await screen.findByText('Refine with AI')
    expect(contractOutcomeStore.outcome).toBeNull()
    expect(screen.queryByRole('button', { name: 'Run anyway' })).not.toBeInTheDocument()
  })

  it('clears only its own outcome key on unmount', async () => {
    const { unmount } = renderPage('/workflows/wf-edit-1/edit')
    await screen.findByText('Refine with AI')
    applyOutcome({}, 'saved', 'wf-edit-1')
    unmount()
    expect(contractOutcomeStore.outcome).toBeNull()

    applyOutcome({}, 'created', 'someone-else')
    const second = renderPage('/workflows/wf-edit-1/edit')
    await screen.findByText('Refine with AI')
    applyOutcome({}, 'created', 'someone-else')
    second.unmount()
    expect(contractOutcomeStore.outcome?.key).toBe('someone-else')
  })

  it('toasts a generic failure when the save fails without a backend error body', async () => {
    const updateSpy = vi
      .spyOn(workflowsStore, 'updateWorkflow')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()

    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Failed to save the workflow'))
    expect(mockRouterState.push).not.toHaveBeenCalled()
    expect(contractOutcomeStore.outcome).toBeNull()
    updateSpy.mockRestore()
  })

  it('escapes the backend message of a rejection that lists no issues', async () => {
    mockAPI(
      'PUT',
      'v1/workflows/wf-edit-1',
      { error: { message: 'Workflow Configuration error', details: '<b>bad</b> & name' } },
      400
    )
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(
        'Workflow Configuration error: &lt;b&gt;bad&lt;/b&gt; &amp; name'
      )
    )
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('sends every save with the JSON error format', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', { message: 'ok', warnings: [] })
    renderPage('/workflows/wf-edit-1/edit')
    await clickSave()

    await waitFor(() => expect(mockRouterState.push).toHaveBeenCalledWith(BACK_ROUTE))
    const putCall = vi
      .mocked(global.fetch)
      .mock.calls.find(
        ([input, init]) => init?.method === 'PUT' && urlOf(input).includes('v1/workflows/wf-edit-1')
      )
    expect(urlOf(putCall?.[0])).toContain('error_format=json')
  })

  it('ignores a save response that arrives after the page unmounted', async () => {
    let resolveSave: (value: Response) => void = () => {}
    const updateSpy = vi.spyOn(workflowsStore, 'updateWorkflow').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveSave = resolve
        })
    )
    const { unmount } = renderPage('/workflows/wf-edit-1/edit')
    await clickSave()
    await waitFor(() => expect(workflowsStore.updateWorkflow).toHaveBeenCalled())

    unmount()
    resolveSave(new Response(JSON.stringify(warnedBody()), { status: 200 }))
    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    expect(mockRouterState.push).not.toHaveBeenCalled()
    expect(contractOutcomeStore.outcome).toBeNull()
    expect(toaster.info).not.toHaveBeenCalled()
    updateSpy.mockRestore()
  })
})

describe('EditWorkflowPage - locks, Check wiring and history refresh', () => {
  const WARNING_BASE = {
    kind: 'contract_validation',
    state_id: 's1',
    path: 'task',
    config_section: 'states',
    config_line: 3,
  }
  const contractWarning = (id: string, outcome = 'WARNING') => ({
    ...WARNING_BASE,
    id,
    outcome,
    message: `issue ${id}`,
  })

  const nonContractRejection = {
    error: {
      message: 'Workflow Configuration error',
      details: {
        error_type: 'resource_validation',
        message: '',
        errors: [{ state_id: 's1', message: 'plain failure', config_line: 2 }],
      },
    },
  }

  // The visual editor re-serialises the YAML on every Check; this text is already in that form, so
  // the form values the Check compares against stay equal to what it sent.
  const SERIALIZED_YAML =
    'states: []\n\nmeta_states:\n  - id: start\n    type: start\n    is_connected: false\n    position:\n      x: 0\n      y: 20\n    data: {}\n  - id: end\n    type: end\n    is_connected: false\n    position:\n      x: 0\n      y: 175\n    data: {}\n'

  const mockSerializedWorkflow = () =>
    mockAPI(
      'GET',
      'v1/workflows/id/wf-edit-1',
      createWorkflowFixture({ yaml_config: SERIALIZED_YAML })
    )

  const waitForEditor = async () => {
    await screen.findByText('Refine with AI')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
  }

  const neverSettles = () => new Promise<Response>(() => {})

  it('locks Save and Save and Run while a save is in flight and sends one PUT', async () => {
    const updateSpy = vi.spyOn(workflowsStore, 'updateWorkflow').mockImplementation(neverSettles)
    renderPage('/workflows/wf-edit-1/edit')
    await waitForEditor()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Save and Run' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    updateSpy.mockRestore()
  })

  it('locks Save and Save and Run while a Check is in flight', async () => {
    const validateSpy = vi
      .spyOn(workflowsStore, 'validateWorkflowConfig')
      .mockImplementation(neverSettles)
    renderPage('/workflows/wf-edit-1/edit')
    await waitForEditor()

    await user.click(await screen.findByRole('button', { name: 'Check' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Save and Run' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    validateSpy.mockRestore()
  })

  it('wires Check to the workflow validate endpoint and opens the panel with the findings', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/validate', {
      message: 'valid',
      warnings: [contractWarning('w1')],
    })
    mockSerializedWorkflow()
    renderPage('/workflows/wf-edit-1/edit')
    await waitForEditor()

    await user.click(await screen.findByRole('button', { name: 'Check' }))
    expect(await screen.findByText('issue w1')).toBeInTheDocument()
    const validateCall = vi
      .mocked(global.fetch)
      .mock.calls.find(
        ([input, init]) => urlOf(input).includes('/validate') && init?.method === 'POST'
      )
    expect(urlOf(validateCall?.[0])).toContain('v1/workflows/wf-edit-1/validate')
    expect(urlOf(validateCall?.[0])).toContain('error_format=json')
    // Nothing was edited since the load, so the findings carry no "not saved yet" note.
    expect(contractOutcomeStore.outcome?.key).toBe('wf-edit-1')
    expect(contractOutcomeStore.outcome?.context).toBeUndefined()
    expect(screen.queryByText('Changes not saved yet')).not.toBeInTheDocument()
  })

  it('drops the contract findings of an earlier Check when the next save starts', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/validate', {
      message: 'valid',
      warnings: [contractWarning('w1')],
    })
    mockSerializedWorkflow()
    renderPage('/workflows/wf-edit-1/edit')
    await waitForEditor()
    await user.click(await screen.findByRole('button', { name: 'Check' }))
    expect(await screen.findByText('issue w1')).toBeInTheDocument()

    mockAPI('PUT', 'v1/workflows/wf-edit-1', nonContractRejection, 400)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('plain failure')).toBeInTheDocument()
    expect(screen.queryByText('issue w1')).not.toBeInTheDocument()
    // The structured rejection replaces the Check outcome: no coverage, and the rejected context.
    expect(contractOutcomeStore.outcome).toEqual({
      key: 'wf-edit-1',
      context: 'rejected',
      coverage: undefined,
      truncated: undefined,
    })
  })

  it('refreshes the history after a warned save without reloading the workflow', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', { message: 'ok', warnings: [contractWarning('w1')] })
    const getSpy = vi.spyOn(workflowsStore, 'getWorkflow')
    const fetchSpy = vi.spyOn(workflowsStore, 'fetchWorkflow')
    renderPage('/workflows/wf-edit-1/edit')
    await waitForEditor()
    fetchSpy.mockClear()

    const refreshed = [
      {
        date: '2026-02-01T00:00:00Z',
        yaml_config: 'states: []\n# v2',
        created_by: { user_id: 'u1', username: 'alice', name: 'Alice' },
      },
    ]
    mockAPI(
      'GET',
      'v1/workflows/id/wf-edit-1',
      createWorkflowFixture({ yaml_config_history: refreshed })
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(workflowsStore.currentWorkflow?.yaml_config_history).toEqual(refreshed)
    )
    expect(getSpy).toHaveBeenCalledWith('wf-edit-1', true)
    expect(fetchSpy).not.toHaveBeenCalled()
    getSpy.mockRestore()
    fetchSpy.mockRestore()
  })

  it('logs a failed history refresh and keeps the warned save on screen', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', { message: 'ok', warnings: [contractWarning('w1')] })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const refreshError = new Error('history unavailable')
    const refreshSpy = vi
      .spyOn(workflowsStore, 'refreshCurrentWorkflowHistory')
      .mockRejectedValueOnce(refreshError)
    renderPage('/workflows/wf-edit-1/edit')
    await waitForEditor()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to refresh the workflow history after a save',
        refreshError
      )
    )
    expect(refreshSpy).toHaveBeenCalledWith('wf-edit-1')
    expect(screen.getByRole('button', { name: 'Run anyway' })).toBeInTheDocument()
    expect(toaster.error).not.toHaveBeenCalled()
    refreshSpy.mockRestore()
    consoleError.mockRestore()
  })

  it('hides Check while workflow contracts are disabled', async () => {
    appInfoStore.configs = [{ id: 'features:workflowAI', settings: { enabled: true } } as any]
    renderPage('/workflows/wf-edit-1/edit')
    await waitForEditor()

    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument()
  })

  it('ignores a history refresh that lands after the page was left', async () => {
    mockAPI('PUT', 'v1/workflows/wf-edit-1', { message: 'ok', warnings: [contractWarning('w1')] })
    let resolveRefresh: (value: Workflow) => void = () => {}
    const original = workflowsStore.getWorkflow.bind(workflowsStore)
    const getSpy = vi
      .spyOn(workflowsStore, 'getWorkflow')
      .mockImplementation((id, skipErrorHandling) =>
        skipErrorHandling
          ? new Promise<Workflow>((resolve) => {
              resolveRefresh = resolve
            })
          : original(id)
      )
    const { unmount } = renderPage('/workflows/wf-edit-1/edit')
    await waitForEditor()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('wf-edit-1', true))

    unmount()
    const other = createWorkflowFixture({ id: 'other-wf' })
    workflowsStore.currentWorkflow = other
    resolveRefresh(createWorkflowFixture({ yaml_config_history: [] }))
    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    expect(workflowsStore.currentWorkflow).toEqual(other)
    getSpy.mockRestore()
  })
})
