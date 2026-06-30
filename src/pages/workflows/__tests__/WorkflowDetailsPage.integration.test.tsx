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

import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { clickMenuOption } from '@/test-utils/component-interactions'
import { mockAPI, renderPage } from '@/test-utils/integration'
import type {
  ExtendedWorkflowExecution,
  Workflow,
  WorkflowExecutionState,
} from '@/types/entity/workflow'

describe('WorkflowDetailsPage - Integration', () => {
  const user = userEvent.setup()

  const createWorkflowFixture = (overrides: Partial<Workflow> = {}): Workflow => ({
    id: 'wf-123',
    slug: 'my-workflow',
    name: 'My Workflow',
    yaml_config: 'nodes:\n  - id: start\n    type: START',
    yaml_config_history: [],
    update_date: '2026-01-01T00:00:00Z',
    user_abilities: ['read', 'write', 'delete'],
    ...overrides,
  })

  const createExecutionFixture = (
    overrides: Partial<ExtendedWorkflowExecution> = {}
  ): ExtendedWorkflowExecution => ({
    id: null,
    date: '2026-01-15T10:00:00Z',
    update_date: '2026-01-15T10:05:00Z',
    workflow_id: 'wf-123',
    execution_id: 'exec-1',
    conversation_id: '',
    overall_status: 'Succeeded',
    output: null,
    name: null,
    prompt: 'Starting prompt text',
    file_name: null,
    file_names: null,
    created_by: { name: 'Jane Doe', username: 'jane.doe', email: '@', id: 'u-1' },
    tokens_usage: { money_spent: 0.0012, input_tokens: 1500, output_tokens: 200 },
    index: 1,
    ...overrides,
  })

  const createExecutionsResponse = (executions = [createExecutionFixture()]) => ({
    data: executions,
    pagination: { page: 0, pages: 1, total: executions.length },
  })

  const createStateFixture = (
    overrides: Partial<WorkflowExecutionState & { type?: string }> = {}
  ): WorkflowExecutionState & { type?: string } => ({
    id: 'state-1',
    date: null,
    update_date: null,
    execution_id: 'exec-1',
    name: 'LLM Step',
    status: 'Succeeded',
    type: 'ASSISTANT',
    started_at: '2026-01-15T10:00:00Z',
    completed_at: '2026-01-15T10:01:00Z',
    output: null,
    error: null,
    thoughts: [],
    task: 'Process the input',
    preceding_state_ids: null,
    state_id: null,
    ...overrides,
  })

  const mockBaseAPIs = (executionOverrides: Partial<ExtendedWorkflowExecution> = {}) => {
    const execution = createExecutionFixture(executionOverrides)
    mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
    mockAPI('GET', 'v1/workflows/wf-123/executions', createExecutionsResponse([execution]))
    mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', execution)
    mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
      data: [],
      pagination: { page: 0, pages: 0, total: 0 },
    })
  }

  const mockBaseAPIsWithStates = (
    states: (WorkflowExecutionState & { type?: string })[] = [createStateFixture()]
  ) => {
    mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
    mockAPI('GET', 'v1/workflows/wf-123/executions', createExecutionsResponse())
    mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', createExecutionFixture())
    mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
      data: states,
      pagination: { page: 0, pages: 1, total: states.length },
    })
  }

  beforeEach(() => {
    ;(mockRouterState as any).params = { workflowId: 'wf-123', executionId: 'exec-1' }
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
  })

  afterEach(() => {
    ;(mockRouterState as any).params = {}
  })

  const waitForPageLoaded = async () => {
    await waitFor(() => expect(screen.getByText('My Workflow')).toBeInTheDocument())
    await waitFor(() => expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument())
  }

  describe('Initial Page Load', () => {
    it('shows sidebar heading, active execution and marks it as current', async () => {
      mockBaseAPIs()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getAllByText('My Workflow').length).toBeGreaterThan(0)
        expect(screen.getByText('Workflow Execution History')).toBeInTheDocument()
        expect(screen.getByText('Succeeded')).toBeInTheDocument()
      })

      expect(document.querySelector('[aria-current="page"]')).toBeInTheDocument()
    })
  })

  describe('Execution Sidebar', () => {
    it('shows empty state when no executions', async () => {
      ;(mockRouterState as any).params = { workflowId: 'wf-123' }
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
      mockAPI('GET', 'v1/workflows/wf-123/executions', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })

      renderPage('/workflows/wf-123')

      await waitFor(() => {
        expect(screen.getByText("You don't have any executions yet")).toBeInTheDocument()
      })
    })

    it('navigates to execution when sidebar item clicked', async () => {
      const exec2 = createExecutionFixture({ execution_id: 'exec-2', overall_status: 'Failed' })
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
      mockAPI(
        'GET',
        'v1/workflows/wf-123/executions',
        createExecutionsResponse([createExecutionFixture(), exec2])
      )
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', createExecutionFixture())
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Failed'))

      expect(mockRouterState.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'workflow-execution',
          params: expect.objectContaining({ executionId: 'exec-2' }),
        })
      )
    })

    it('groups recent executions under Last 7 days', async () => {
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const recentExecution = createExecutionFixture({ date: recentDate, update_date: recentDate })
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
      mockAPI('GET', 'v1/workflows/wf-123/executions', createExecutionsResponse([recentExecution]))
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', recentExecution)
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getByText('Last 7 days')).toBeInTheDocument()
      })
    })

    it('shows disabled Remove for chat executions with tooltip', async () => {
      const chatExecution = createExecutionFixture({ conversation_id: 'chat-123' })
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
      mockAPI('GET', 'v1/workflows/wf-123/executions', createExecutionsResponse([chatExecution]))
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', chatExecution)
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getByRole('button', { name: 'More options' }))

      await waitFor(() => {
        const removeButton = screen.getByRole('menuitem', { name: 'Remove' })
        expect(removeButton).toBeDisabled()
      })
    })
  })

  describe('Execution Header Actions', () => {
    it('aborts execution when header Abort clicked', async () => {
      mockBaseAPIs({ overall_status: 'In Progress' })
      mockAPI('PUT', 'v1/workflows/wf-123/executions/exec-1/abort', {})

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      const abortButton = await waitFor(() => screen.getAllByRole('button', { name: 'Abort' })[0])
      expect(abortButton).toBeInTheDocument()

      await user.click(abortButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions/exec-1/abort'),
          expect.objectContaining({ method: 'PUT' })
        )
      })
    })

    it('does not show Abort button when execution is Succeeded', async () => {
      mockBaseAPIs({ overall_status: 'Succeeded' })
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      expect(screen.queryByRole('button', { name: 'Abort' })).not.toBeInTheDocument()
    })

    it('shows execution id and status when Info popup opened', async () => {
      mockBaseAPIs()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getByRole('button', { name: 'Info' }))

      await waitFor(() => {
        expect(screen.getByText('Execution Info')).toBeInTheDocument()
        expect(screen.getByText('exec-1')).toBeInTheDocument()
        expect(screen.getAllByText('Succeeded').length).toBeGreaterThan(0)
      })
    })

    it('exports execution by calling the export API', async () => {
      mockBaseAPIs()
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/export', {})

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      const exportButton = document.querySelector(
        '[data-tooltip-content="Export as .md or .html"]'
      ) as HTMLElement
      await user.click(exportButton)

      await waitFor(() => {
        expect(screen.getByText('Export Workflow Execution')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Export' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions/exec-1/export'),
          expect.anything()
        )
      })
    })

    it('exports with html format when HTML selected', async () => {
      mockBaseAPIs()
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/export', {})

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      const exportButton = document.querySelector(
        '[data-tooltip-content="Export as .md or .html"]'
      ) as HTMLElement
      await user.click(exportButton)

      await waitFor(() => {
        expect(screen.getByText('HTML (.html)')).toBeInTheDocument()
      })

      await user.click(screen.getByText('HTML (.html)'))
      await user.click(screen.getByRole('button', { name: 'Export' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('output_format=html'),
          expect.anything()
        )
      })
    })

    it('creates new execution and navigates to it', async () => {
      mockBaseAPIs()
      mockAPI('POST', 'v1/workflows/wf-123/executions', {
        execution_id: 'exec-new',
        workflow_id: 'wf-123',
        overall_status: 'In Progress',
        date: '2026-01-15T11:00:00Z',
        update_date: '2026-01-15T11:00:00Z',
        conversation_id: '',
        output: null,
        name: null,
        prompt: '',
        file_name: null,
        file_names: null,
        created_by: null,
        tokens_usage: null,
        id: null,
        index: 2,
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getAllByRole('button', { name: /run workflow/i })[0])

      await waitFor(() => {
        expect(screen.getByText('New Workflow Execution')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({ executionId: 'exec-new' }),
          })
        )
      })
    })

    it('navigates to new chat when Run Chat clicked', async () => {
      mockBaseAPIs()
      mockAPI('GET', 'v1/conversations/new', {
        id: 'new-chat-1',
        conversation_name: 'New Chat',
        history: [],
        assistant_ids: [],
        assistant_data: [],
      })
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getAllByRole('button', { name: /run chat/i })[0])

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'new-chat' })
        )
      })
    })
  })

  describe('Clear and Delete Executions', () => {
    it('clears all executions on confirm and navigates away', async () => {
      mockBaseAPIs()
      mockAPI('DELETE', 'v1/workflows/wf-123/executions', {})

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      const clearButton = document.querySelector(
        '[data-tooltip-content="Clear all executions"]'
      ) as HTMLElement
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    it('cancels clear all — modal closes and no delete called', async () => {
      mockBaseAPIs()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      const clearButton = document.querySelector(
        '[data-tooltip-content="Clear all executions"]'
      ) as HTMLElement
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('v1/workflows/wf-123/executions'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('deletes last execution and navigates to workflows list', async () => {
      mockBaseAPIs()
      mockAPI('DELETE', 'v1/workflows/wf-123/executions/exec-1', {})

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await clickMenuOption('More options', 'Remove', user)

      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions/exec-1'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith(
          expect.objectContaining({ name: expect.stringContaining('workflow') })
        )
      })
    })

    it('deletes non-active execution — item removed from list', async () => {
      const exec2 = createExecutionFixture({ execution_id: 'exec-2', overall_status: 'Failed' })
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
      mockAPI(
        'GET',
        'v1/workflows/wf-123/executions',
        createExecutionsResponse([createExecutionFixture(), exec2])
      )
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', createExecutionFixture())
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })
      mockAPI('DELETE', 'v1/workflows/wf-123/executions/exec-2', {})

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument()
      })

      const menuButtons = screen.getAllByRole('button', { name: 'More options' })
      await user.click(menuButtons[menuButtons.length - 1])

      await waitFor(() => {
        expect(screen.getAllByRole('menuitem', { name: 'Remove' }).length).toBeGreaterThan(0)
      })

      const removeItems = screen.getAllByRole('menuitem', { name: 'Remove' })
      await user.click(removeItems[0])

      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions/exec-2'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })
  })

  describe('Workflow Drawer', () => {
    it('shows Starting Prompt item and execution prompt text', async () => {
      mockBaseAPIsWithStates()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getByText('Starting Prompt')).toBeInTheDocument()
        expect(screen.getByText('Starting prompt text')).toBeInTheDocument()
      })
    })

    it('can be collapsed and expanded, hiding and restoring items', async () => {
      mockBaseAPIsWithStates()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => expect(screen.getByText('Starting Prompt')).toBeInTheDocument())

      const toggleButton = screen.getByRole('button', { name: 'Toggle drawer' })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')

      await user.click(toggleButton)

      await waitFor(() => {
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
        expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
      })

      await user.click(toggleButton)

      await waitFor(() => {
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('shows state items in drawer list and fetches output when selected', async () => {
      mockBaseAPIsWithStates()
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states/state-1/output', {
        output: 'State result output',
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getByText('LLM Step')).toBeInTheDocument()
      })

      await user.click(screen.getByText('LLM Step'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions/exec-1/states/state-1/output'),
          expect.anything()
        )
      })
    })

    it('shows See transition and Call history buttons when state selected', async () => {
      mockBaseAPIsWithStates()
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states/state-1/output', {
        output: '',
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getByText('LLM Step')).toBeInTheDocument()
      })

      await user.click(screen.getByText('LLM Step'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /see transition/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /call history/i })).toBeInTheDocument()
      })
    })

    it('opens transition popup with diff view', async () => {
      mockBaseAPIsWithStates()
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states/state-1/output', { output: '' })
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/transitions/from/state-1', {
        workflow_context: { key: 'after' },
      })
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/transitions/to/state-1', {
        workflow_context: { key: 'before' },
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getByText('LLM Step')).toBeInTheDocument()
      })

      await user.click(screen.getByText('LLM Step'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /see transition/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /see transition/i }))

      await waitFor(() => {
        expect(screen.getByText(/state transition/i)).toBeInTheDocument()
      })
    })

    it('shows first-state info message in transition popup when no previous context', async () => {
      mockBaseAPIsWithStates()
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states/state-1/output', { output: '' })
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/transitions/from/state-1', {
        workflow_context: { key: 'value' },
      })
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/transitions/to/state-1', null, 404)

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => expect(screen.getByText('LLM Step')).toBeInTheDocument())

      await user.click(screen.getByText('LLM Step'))

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /see transition/i })).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: /see transition/i }))

      await waitFor(() => {
        expect(screen.getByText(/first state|no previous context/i)).toBeInTheDocument()
      })
    })

    it('opens call history popup', async () => {
      const stateWithThoughts = createStateFixture({
        thoughts: [{ id: 'th-1', message: 'thought message', in_progress: false }],
      })
      mockBaseAPIsWithStates([stateWithThoughts])
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states/state-1/output', { output: '' })
      mockAPI('POST', 'v1/workflows/wf-123/executions/exec-1/thoughts', [
        { id: 'th-1', message: 'thought message', in_progress: false },
      ])

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => expect(screen.getByText('LLM Step')).toBeInTheDocument())

      await user.click(screen.getByText('LLM Step'))

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /call history/i })).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: /call history/i }))

      await waitFor(() => {
        expect(screen.getByText(/calls history/i)).toBeInTheDocument()
      })
    })

    it('shows empty drawer state with Run buttons when no executions exist', async () => {
      ;(mockRouterState as any).params = { workflowId: 'wf-123' }
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
      mockAPI('GET', 'v1/workflows/wf-123/executions', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })

      renderPage('/workflows/wf-123')

      await waitFor(() => {
        expect(screen.getByText("You don't have any executions yet")).toBeInTheDocument()
        expect(screen.getByText(/start workflow to see execution states/i)).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /run chat/i })[0]).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /run workflow/i })[0]).toBeInTheDocument()
      })
    })
  })

  describe('State Controls (Interrupted Execution)', () => {
    const mockInterruptedSetup = () => {
      const interruptedExecution = createExecutionFixture({ overall_status: 'Interrupted' })
      const interruptedState = createStateFixture({ id: 'state-int', status: 'Interrupted' })
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
      mockAPI(
        'GET',
        'v1/workflows/wf-123/executions',
        createExecutionsResponse([interruptedExecution])
      )
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', interruptedExecution)
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
        data: [interruptedState],
        pagination: { page: 0, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states/state-int/output', {
        output: 'Current state output',
      })
      return { interruptedExecution, interruptedState }
    }

    it('resumes execution when Continue clicked', async () => {
      mockInterruptedSetup()
      mockAPI('PUT', 'v1/workflows/wf-123/executions/exec-1/resume', {
        execution_id: 'exec-1',
        workflow_id: 'wf-123',
        overall_status: 'In Progress',
        date: '2026-01-15T10:00:00Z',
        update_date: '2026-01-15T10:06:00Z',
        conversation_id: '',
        output: null,
        name: null,
        prompt: null,
        file_name: null,
        file_names: null,
        created_by: null,
        tokens_usage: null,
        id: null,
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => expect(screen.getByText('LLM Step')).toBeInTheDocument())

      await user.click(screen.getByText('LLM Step'))

      const continueButton = await waitFor(
        () => screen.getAllByRole('button', { name: 'Continue' })[0]
      )
      expect(continueButton).toBeInTheDocument()

      await user.click(continueButton)

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('v1/workflows/wf-123/executions/exec-1/resume'),
            expect.objectContaining({ method: 'PUT' })
          )
        },
        { timeout: 5000 }
      )
    })

    it('opens and submits Continue with message popup', async () => {
      mockInterruptedSetup()
      mockAPI('PUT', 'v1/workflows/wf-123/executions/exec-1/resume', {
        execution_id: 'exec-1',
        workflow_id: 'wf-123',
        overall_status: 'In Progress',
        date: '2026-01-15T10:00:00Z',
        update_date: '2026-01-15T10:06:00Z',
        conversation_id: '',
        output: null,
        name: null,
        prompt: null,
        file_name: null,
        file_names: null,
        created_by: null,
        tokens_usage: null,
        id: null,
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => expect(screen.getByText('LLM Step')).toBeInTheDocument())

      await user.click(screen.getByText('LLM Step'))

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Continue options' })).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: 'Continue options' }))

      await waitFor(() => expect(screen.getByText('Continue with message')).toBeInTheDocument())

      await user.click(screen.getByText('Continue with message'))

      await waitFor(() => expect(screen.getByText('Workflow interrupted')).toBeInTheDocument())

      const continueInPopup = screen.getAllByRole('button', { name: 'Continue' })
      await user.click(continueInPopup[continueInPopup.length - 1])

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('v1/workflows/wf-123/executions/exec-1/resume'),
            expect.objectContaining({ method: 'PUT' })
          )
        },
        { timeout: 5000 }
      )
    })

    it('aborts interrupted execution from state controls', async () => {
      mockInterruptedSetup()
      mockAPI('PUT', 'v1/workflows/wf-123/executions/exec-1/abort', {})

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => expect(screen.getByText('LLM Step')).toBeInTheDocument())

      await user.click(screen.getByText('LLM Step'))

      const abortButton = await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: 'Abort' })
        return buttons[buttons.length - 1]
      })
      expect(abortButton).toBeInTheDocument()

      await user.click(abortButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions/exec-1/abort'),
          expect.objectContaining({ method: 'PUT' })
        )
      })
    })

    it('saves edited output with correct value via API', async () => {
      mockInterruptedSetup()
      mockAPI('PUT', 'v1/workflows/wf-123/executions/exec-1/output', {})
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states/state-int/output', {
        output: 'Updated output',
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => expect(screen.getByText('LLM Step')).toBeInTheDocument())

      await user.click(screen.getByText('LLM Step'))

      const editButton = await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: 'Edit' })
        return buttons[buttons.length - 1]
      })
      await user.click(editButton)

      await waitFor(() => expect(screen.getByText(/edit output/i)).toBeInTheDocument())

      await waitFor(
        () => expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument(),
        { timeout: 2000 }
      )

      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'modified output text')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/wf-123/executions/exec-1/output'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('modified output text'),
          })
        )
      })
    })
  })

  describe('Configuration Panel', () => {
    it('opens configuration panel with Configure button for editable workflows', async () => {
      mockBaseAPIs()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getByRole('button', { name: /configuration/i }))

      await waitFor(() => {
        expect(screen.getByText('Configure Workflow')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^configure$/i })).toBeInTheDocument()
      })
    })

    it('does not show Configure button for read-only workflows', async () => {
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture({ user_abilities: ['read'] }))
      mockAPI('GET', 'v1/workflows/wf-123/executions', createExecutionsResponse())
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', createExecutionFixture())
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getByRole('button', { name: /configuration/i }))

      await waitFor(() => {
        expect(screen.getByText('Configure Workflow')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /^configure$/i })).not.toBeInTheDocument()
    })

    it('opens edit form when Configure clicked in panel', async () => {
      mockBaseAPIs()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getByRole('button', { name: /configuration/i }))

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /^configure$/i })).toBeInTheDocument()
      )

      await user.click(screen.getByRole('button', { name: /^configure$/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument()
      })
    })

    it('closes configuration panel on second click', async () => {
      mockBaseAPIs()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      const configButton = screen.getByRole('button', { name: /configuration/i })
      await user.click(configButton)

      await waitFor(() => {
        expect(screen.getByText('Configure Workflow')).toBeInTheDocument()
      })

      await user.click(configButton)

      await waitFor(() => {
        expect(screen.queryByText('Configure Workflow')).not.toBeInTheDocument()
      })
    })

    it('navigates to edit-workflow when Edit YAML button clicked in panel', async () => {
      mockBaseAPIs()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getByRole('button', { name: /configuration/i }))

      await waitFor(() => {
        expect(screen.getByText('Configure Workflow')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /^edit$/i })
      await user.click(editButtons[editButtons.length - 1])

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'edit-workflow',
            params: expect.objectContaining({ id: 'wf-123' }),
          })
        )
      })
    })
  })

  describe('Header Navigation', () => {
    it('navigates to edit-workflow when Edit button clicked in header', async () => {
      mockBaseAPIs()
      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      await user.click(screen.getAllByRole('button', { name: /^edit$/i })[0])

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'edit-workflow',
            params: expect.objectContaining({ id: 'wf-123' }),
          })
        )
      })
    })

    it('does not show Edit button in header for read-only workflows', async () => {
      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture({ user_abilities: ['read'] }))
      mockAPI('GET', 'v1/workflows/wf-123/executions', createExecutionsResponse())
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', createExecutionFixture())
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitForPageLoaded()

      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
    })
  })

  describe('Polling', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('updates execution status after polling interval', async () => {
      userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
      mockAPI(
        'GET',
        'v1/workflows/wf-123/executions',
        createExecutionsResponse([createExecutionFixture({ overall_status: 'In Progress' })])
      )
      mockAPI(
        'GET',
        'v1/workflows/wf-123/executions/exec-1',
        createExecutionFixture({ overall_status: 'In Progress' })
      )
      mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
        data: [],
        pagination: { page: 0, pages: 0, total: 0 },
      })

      renderPage('/workflows/wf-123/workflow-executions/exec-1')

      await waitFor(() => {
        expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0)
      })

      mockAPI(
        'GET',
        'v1/workflows/wf-123/executions/exec-1',
        createExecutionFixture({ overall_status: 'Succeeded' })
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4100)
      })

      await waitFor(() => {
        expect(screen.getAllByText('Succeeded').length).toBeGreaterThan(0)
      })
    })
  })
})
