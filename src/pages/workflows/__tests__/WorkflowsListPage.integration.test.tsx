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
import { preferencesStore } from '@/store/preferences'
import { clickMenuOption, selectMultiSelectOptions } from '@/test-utils/component-interactions'
import { mockAPI, renderPage } from '@/test-utils/integration'
import type { PaginatedResponse } from '@/types/common'
import type { Workflow } from '@/types/entity/workflow'

describe('WorkflowsListPage - Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    preferencesStore.preferences = null
  })

  // Test Utilities
  const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  const waitForWorkflowLoaded = (name: string) =>
    waitFor(() => {
      expect(screen.getByText(name)).toBeInTheDocument()
    })

  const submitFilterViaSearch = async (user: ReturnType<typeof userEvent.setup>) => {
    const searchInput = screen.getByPlaceholderText('Search')
    await user.click(searchInput)
    await user.keyboard('{Enter}')
  }

  const createWorkflowFixture = (overrides: Partial<Workflow> = {}): Workflow => ({
    id: 'workflow-1',
    name: 'Test Workflow',
    slug: 'test-workflow',
    description: 'Test workflow description',
    is_global: false,
    shared: false,
    is_favorited: false,
    update_date: '2024-01-01T00:00:00Z',
    yaml_config: 'test: config',
    yaml_config_history: [],
    user_abilities: ['read', 'write', 'delete'],
    unique_users_count: 5,
    ...overrides,
  })

  const createWorkflowsResponse = (
    workflows: Workflow[] = [createWorkflowFixture()]
  ): PaginatedResponse<Workflow> => ({
    data: workflows,
    pagination: {
      page: 0,
      per_page: 12,
      pages: 1,
      total: workflows.length,
    },
  })

  describe('Initial Page Load', () => {
    it('loads and displays workflows on ALL tab', async () => {
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.getByText('1 WORKFLOW')).toBeInTheDocument()
      })
    })

    it('loads and displays workflows on MY tab with filter_by_user=true', async () => {
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/my')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('filter_by_user=true'),
          expect.anything()
        )
      })
    })

    it('loads and displays marketplace workflows on MARKETPLACE tab', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({
            id: 'marketplace-1',
            is_global: true,
            name: 'Marketplace Workflow',
          }),
        ])
      )

      renderPage('/workflows/marketplace')

      await waitFor(() => {
        expect(screen.getByText('Marketplace Workflow')).toBeInTheDocument()
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('scope=marketplace'),
          expect.anything()
        )
      })
    })

    it('shows empty state when no workflows found', async () => {
      mockAPI('GET', 'v1/workflows', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText(/no workflows found/i)).toBeInTheDocument()
      })
    })

    it('displays pluralized count correctly - singular', async () => {
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse([createWorkflowFixture()]))

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('1 WORKFLOW')).toBeInTheDocument()
      })
    })

    it('displays pluralized count correctly - plural', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ id: '1' }),
          createWorkflowFixture({ id: '2' }),
        ])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('2 WORKFLOWS')).toBeInTheDocument()
      })
    })
  })

  describe('Create Workflow Button', () => {
    it('navigates to new workflow page when Create Workflow clicked', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const createButton = screen.getByRole('button', { name: /create workflow/i })
      await user.click(createButton)

      expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'new-workflow' })
    })
  })

  describe('Workflow Display', () => {
    it('displays workflow name', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ name: 'Display Test Workflow' })])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Display Test Workflow')).toBeInTheDocument()
      })
    })

    it('displays workflow description when present', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ description: 'This is a test description' }),
        ])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('This is a test description')).toBeInTheDocument()
      })
    })

    it('does not display description section when null', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ description: undefined })])
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      expect(screen.queryByText(/test description/i)).not.toBeInTheDocument()
    })

    it('shows marketplace usage count for global workflows', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ is_global: true, unique_users_count: 5 })])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText(/5 total uses/i)).toBeInTheDocument()
      })
    })

    it('does not show marketplace usage for private workflows', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ is_global: false })])
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      expect(screen.queryByText(/total uses/i)).not.toBeInTheDocument()
    })

    it('shows Shared with Project text when workflow is shared', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ shared: true })])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Shared with Project')).toBeInTheDocument()
      })
    })

    it('shows Not shared text when workflow is not shared', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ shared: false })])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Not shared')).toBeInTheDocument()
      })
    })

    it('displays author name when present', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({
            created_by: {
              name: 'Jane Smith',
              username: 'jane.smith',
              user_id: 'user-2',
              id: 'user-2',
            },
          }),
        ])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('by Jane Smith')).toBeInTheDocument()
      })
    })

    it('displays "by System" when author is null', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ created_by: undefined })])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('by System')).toBeInTheDocument()
      })
    })

    it('shows singular "1 total use" for one use', async () => {
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ is_global: true, unique_users_count: 1 })])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('1 total use')).toBeInTheDocument()
      })
    })
  })

  describe('Workflow Actions', () => {
    it('navigates to workflow details when card clicked', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ id: 'workflow-1', name: 'Detail Workflow' }),
        ])
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Detail Workflow')

      const workflowName = screen.getByText('Detail Workflow')
      await user.click(workflowName)

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'view-workflow',
          })
        )
      })
    })

    it('starts new chat when Start Chat button clicked', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ id: 'workflow-1', name: 'Chat Workflow' }),
        ])
      )
      mockAPI('GET', 'v1/conversations/new', {
        id: '',
        name: 'New Chat',
        history: [],
        assistant: null,
      })

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Chat Workflow')

      const startChatButton = screen.getByRole('button', { name: 'Start Chat' })
      await user.click(startChatButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/conversations/new'),
          expect.anything()
        )
        expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'new-chat' })
      })
    })

    it('opens execution popup when Start Execution button clicked', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({
            id: 'workflow-1',
            name: 'Execution Workflow',
            start_hint: 'Please describe your task',
          }),
        ])
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Execution Workflow')

      const buttons = screen.getAllByRole('button', { name: 'Start Execution' })
      await user.click(buttons[0])

      await waitFor(() => {
        expect(screen.getByText('New Workflow Execution')).toBeInTheDocument()
      })
    })

    it('creates execution and navigates when form submitted', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({
            id: 'workflow-1',
            start_hint: 'Describe your task',
          }),
        ])
      )
      mockAPI('POST', 'v1/workflows/workflow-1/executions', {
        workflow_id: 'workflow-1',
        execution_id: 'exec-123',
      })

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const startExecutionButtons = screen.getAllByRole('button', { name: 'Start Execution' })
      await user.click(startExecutionButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('New Workflow Execution')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      const editorDiv = await waitFor(() => {
        const editor = dialog.querySelector('.workflow-execution-editor [contenteditable="true"]')
        if (!editor) throw new Error('Editor not found')
        return editor as HTMLElement
      })

      await user.click(editorDiv)
      await user.type(editorDiv, 'Run the data processing task')

      const createButton = screen.getByRole('button', { name: 'Create' })
      await user.click(createButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/workflow-1/executions'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith({
          name: 'workflow-execution',
          params: { workflowId: 'workflow-1', executionId: 'exec-123' },
        })
      })
    })
  })

  describe('Context Menu', () => {
    it('navigates to details when View Details menu item clicked', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ id: 'workflow-1' })])
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'View Details', user)

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'view-workflow',
        params: { workflowId: 'workflow-1' },
      })
    })

    it('navigates to edit when Edit menu item clicked', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ id: 'workflow-1', user_abilities: ['write'] }),
        ])
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Edit', user)

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'edit-workflow',
        params: { id: 'workflow-1' },
      })
    })

    it('shows delete confirmation and deletes workflow when confirmed', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ id: 'workflow-1', user_abilities: ['delete'] }),
        ])
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Delete', user)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      mockAPI('DELETE', 'v1/workflows/workflow-1', {})
      mockAPI('GET', 'v1/workflows', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      const deleteButton = await screen.findByRole('button', { name: /^Delete$/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/workflow-1'),
          expect.objectContaining({ method: 'DELETE' })
        )
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('copies workflow link when Copy Link menu item clicked', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse([createWorkflowFixture()]))

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Copy Link', user)
    })

    it('navigates to clone workflow when Clone menu item clicked', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse([createWorkflowFixture()]))

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Clone', user)

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'clone-workflow',
        params: { id: 'workflow-1' },
      })
    })

    it('cancels delete when Cancel clicked in confirmation modal', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ user_abilities: ['delete'] })])
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Delete', user)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('v1/workflows/workflow-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Pagination', () => {
    it('navigates to page 2 when page button clicked', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', {
        data: [createWorkflowFixture({ id: '1', name: 'Workflow 1' })],
        pagination: { page: 0, per_page: 12, pages: 3, total: 36 },
      })

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Workflow 1')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
      })

      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ id: '13', name: 'Page 2 Workflow' })])
      )

      await user.click(screen.getByRole('button', { name: 'Page 2' }))

      await waitFor(() => {
        expect(screen.getByText('Page 2 Workflow')).toBeInTheDocument()
      })
      expect(screen.queryByText('Workflow 1')).not.toBeInTheDocument()

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ page: '2', perPage: '12' }),
        })
      )
    })

    it('Previous page button navigates correctly', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', {
        data: [createWorkflowFixture({ name: 'Page 2 Workflow' })],
        pagination: { page: 1, per_page: 12, pages: 3, total: 36 },
      })

      renderPage('/workflows/all?page=2')

      await waitFor(() => {
        expect(screen.getByText('Page 2 Workflow')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
      })

      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ name: 'Page 1 Workflow' })])
      )

      await user.click(screen.getByRole('button', { name: 'Previous page' }))

      await waitFor(() => {
        expect(screen.getByText('Page 1 Workflow')).toBeInTheDocument()
      })
      expect(screen.queryByText('Page 2 Workflow')).not.toBeInTheDocument()

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ page: '1' }),
        })
      )
    })

    it('Next page button navigates correctly', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', {
        data: [createWorkflowFixture({ name: 'Page 1 Workflow' })],
        pagination: { page: 0, per_page: 12, pages: 3, total: 36 },
      })

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Page 1 Workflow')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
      })

      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ name: 'Page 2 Workflow' })])
      )

      await user.click(screen.getByRole('button', { name: 'Next page' }))

      await waitFor(() => {
        expect(screen.getByText('Page 2 Workflow')).toBeInTheDocument()
      })
      expect(screen.queryByText('Page 1 Workflow')).not.toBeInTheDocument()

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ page: '2' }),
        })
      )
    })

    it('Previous page button absent on first page', async () => {
      mockAPI('GET', 'v1/workflows', {
        data: [createWorkflowFixture()],
        pagination: { page: 0, per_page: 12, pages: 3, total: 36 },
      })

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    })

    it('Next page button absent on last page', async () => {
      mockAPI('GET', 'v1/workflows', {
        data: [createWorkflowFixture()],
        pagination: { page: 2, per_page: 12, pages: 3, total: 36 },
      })

      renderPage('/workflows/all?page=3')

      await waitForWorkflowLoaded('Test Workflow')

      expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    })
  })

  describe('Filters', () => {
    it('applies search filter with debounce and displays filtered results', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const searchInput = screen.getByPlaceholderText('Search')
      await user.clear(searchInput)
      await user.type(searchInput, 'matching')

      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ name: 'Matching Workflow' })])
      )

      await vi.advanceTimersByTimeAsync(1100)

      await waitFor(() => {
        expect(screen.getByText('Matching Workflow')).toBeInTheDocument()
      })
      expect(screen.queryByText('Test Workflow')).not.toBeInTheDocument()

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ name: 'matching', page: '1' }),
        })
      )
    })

    it('displays empty state when search returns no results', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const searchInput = screen.getByPlaceholderText('Search')
      await user.type(searchInput, 'nonexistent-workflow-xyz')

      mockAPI('GET', 'v1/workflows', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      await vi.advanceTimersByTimeAsync(1100)

      await waitFor(() => {
        expect(screen.getByText(/no workflows found/i)).toBeInTheDocument()
      })
      expect(screen.queryByText('Test Workflow')).not.toBeInTheDocument()
    })

    it('resets to page 1 when applying search filter', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', {
        data: [createWorkflowFixture()],
        pagination: { page: 1, per_page: 12, pages: 3, total: 36 },
      })

      renderPage('/workflows/all?page=2')

      await waitForWorkflowLoaded('Test Workflow')

      const searchInput = screen.getByPlaceholderText('Search')
      await user.type(searchInput, 'test')

      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      await vi.advanceTimersByTimeAsync(1100)

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({
              page: '1',
            }),
          })
        )
      })
    })

    it('Project filter applies correctly', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_admin: false,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: ['Project A', 'Project B', 'Project C'],
      })

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.getByText('PROJECT')).toBeInTheDocument()
      })

      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ name: 'Project A Workflow' })])
      )

      await selectMultiSelectOptions('Project', ['Project A', 'Project B'], { user })

      await submitFilterViaSearch(user)

      await waitFor(() => {
        expect(screen.getByText('Project A Workflow')).toBeInTheDocument()
      })

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            project: ['Project A', 'Project B'],
            page: '1',
          }),
        })
      )
    })

    it('Created by filter applies correctly', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())
      mockAPI('GET', 'v1/users/workflows-users', [
        { username: 'user1', name: 'User One', email: 'user1@example.com' },
        { username: 'user2', name: 'User Two', email: 'user2@example.com' },
      ])

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.getByText('CREATED BY')).toBeInTheDocument()
      })

      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ name: 'My Workflow' })])
      )

      const meCheckbox = screen.getByLabelText('Me')
      await user.click(meCheckbox)

      await submitFilterViaSearch(user)

      await waitFor(() => {
        expect(screen.getByText('My Workflow')).toBeInTheDocument()
      })

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            created_by: expect.any(String),
          }),
        })
      )
    })

    it('Shared filter applies correctly - With Project', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.getByText('SHARED')).toBeInTheDocument()
        expect(screen.getByText('With Project')).toBeInTheDocument()
      })

      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ name: 'Shared Workflow', shared: true })])
      )

      await user.click(screen.getByText('With Project'))

      await submitFilterViaSearch(user)

      await waitFor(() => {
        expect(screen.getByText('Shared Workflow')).toBeInTheDocument()
      })

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            shared: 'true',
          }),
        })
      )
    })

    it('Shared filter applies correctly - Not Shared', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.getByText('SHARED')).toBeInTheDocument()
        expect(screen.getByText('Not Shared')).toBeInTheDocument()
      })

      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ name: 'Private Workflow', shared: false }),
        ])
      )

      await user.click(screen.getByText('Not Shared'))

      await submitFilterViaSearch(user)

      await waitFor(() => {
        expect(screen.getByText('Private Workflow')).toBeInTheDocument()
      })

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            shared: 'false',
          }),
        })
      )
    })

    it('Multiple filters apply together', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.getByText('SHARED')).toBeInTheDocument()
        expect(screen.getByText('With Project')).toBeInTheDocument()
      })

      await user.click(screen.getByText('With Project'))

      const searchInput = screen.getByPlaceholderText('Search')
      await user.clear(searchInput)
      await user.type(searchInput, 'test')

      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      await vi.advanceTimersByTimeAsync(1100)

      await waitFor(() => {
        const { calls } = mockRouterState.push.mock
        const lastCall = calls[calls.length - 1]
        if (lastCall?.[0]) {
          const query = lastCall[0].query || {}
          expect(query.name).toBe('test')
          expect(query.shared).toBe('true')
        }
      })
    })

    it('Clear all button resets all filters', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const searchInput = screen.getByPlaceholderText('Search')
      await user.type(searchInput, 'test-query')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
      })

      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      const clearButton = screen.getByRole('button', { name: /clear all/i })
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search')).toHaveValue('')
        expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Favorites', () => {
    it('adds workflow to favorites when favorite button clicked', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ id: 'workflow-1', is_favorited: false })])
      )
      mockAPI('PUT', 'v1/preferences/test-user-id', {})

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const favoriteButton = await waitFor(() =>
        screen.getByRole('button', { name: 'Add to favorites' })
      )
      await user.click(favoriteButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument()
      })
    })

    it('shows confirmation popup when removing workflow from favorites', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        navigation_expanded: true,
        sidebar_expanded: true,
        pinned_assistants: [],
        favorites: { assistants: [], skills: [], workflows: ['workflow-1'] },
      })
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ id: 'workflow-1' })])
      )

      await preferencesStore.fetchPreferences('test-user-id')
      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const favoriteButton = await waitFor(() =>
        screen.getByRole('button', { name: 'Remove from favorites' })
      )
      await user.click(favoriteButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Remove from favorites')).toBeInTheDocument()
        expect(
          screen.getByText(/Test Workflow will be removed from your favorites/i)
        ).toBeInTheDocument()
      })
    })

    it('removes workflow from favorites when confirmed in popup', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        navigation_expanded: true,
        sidebar_expanded: true,
        pinned_assistants: [],
        favorites: { assistants: [], skills: [], workflows: ['workflow-1'] },
      })
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ id: 'workflow-1' })])
      )
      mockAPI('PUT', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        navigation_expanded: true,
        sidebar_expanded: true,
        pinned_assistants: [],
        favorites: { assistants: [], skills: [], workflows: [] },
      })

      await preferencesStore.fetchPreferences('test-user-id')
      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const favoriteButton = await waitFor(() =>
        screen.getByRole('button', { name: 'Remove from favorites' })
      )
      await user.click(favoriteButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const removeButton = await screen.findByRole('button', { name: /^Remove$/i })

      await user.click(removeButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/preferences/test-user-id'),
          expect.objectContaining({ method: 'PUT' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument()
      })
    })

    it('cancels remove from favorites when cancel clicked', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        navigation_expanded: true,
        sidebar_expanded: true,
        pinned_assistants: [],
        favorites: { assistants: [], skills: [], workflows: ['workflow-1'] },
      })
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ id: 'workflow-1' })])
      )

      await preferencesStore.fetchPreferences('test-user-id')
      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      const favoriteButton = await waitFor(() =>
        screen.getByRole('button', { name: 'Remove from favorites' })
      )

      await user.click(favoriteButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument()
    })
  })

  describe('Feature Flags', () => {
    it('displays all navigation tabs when favorites disabled', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: false } }])
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('My Workflows')).toBeInTheDocument()
        expect(screen.getByText('All Workflows')).toBeInTheDocument()
        expect(screen.getByText('Marketplace')).toBeInTheDocument()
        expect(screen.getByText('Templates')).toBeInTheDocument()
        expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
      })
    })

    it('shows Favorites tab when feature flag enabled', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Favorites')).toBeInTheDocument()
      })
    })

    it('shows FavoriteButton when favorites feature enabled', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ is_favorited: false })])
      )

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument()
      })
    })

    it('shows filled favorite button when workflow is favorited', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        navigation_expanded: true,
        sidebar_expanded: true,
        pinned_assistants: [],
        favorites: { assistants: [], skills: [], workflows: ['workflow-1'] },
      })
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([createWorkflowFixture({ is_favorited: true })])
      )

      await preferencesStore.fetchPreferences('test-user-id')
      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Add to favorites' })).not.toBeInTheDocument()
      })
    })

    it('does NOT show FavoriteButton when favorites disabled', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: false } }])
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse([createWorkflowFixture()]))

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Add to favorites' })).not.toBeInTheDocument()
        expect(
          screen.queryByRole('button', { name: 'Remove from favorites' })
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('Templates', () => {
    beforeEach(() => {
      ;(mockRouterState as any).path = '/workflows/templates'
    })

    afterEach(() => {
      ;(mockRouterState as any).path = '/'
    })

    it('loads and displays templates list', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt', [
        {
          id: 'tmpl-1',
          slug: 'data-pipeline',
          name: 'Data Pipeline',
          description: 'A data pipeline template',
        },
      ])

      renderPage('/workflows/templates')

      await waitFor(() => {
        expect(screen.getByText('Data Pipeline')).toBeInTheDocument()
        expect(screen.getByText('1 TEMPLATE')).toBeInTheDocument()
      })
    })

    it('navigates to template detail when template card clicked', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows/prebuilt', [
        {
          id: 'tmpl-1',
          slug: 'data-pipeline',
          name: 'Data Pipeline',
          description: 'A data pipeline template',
        },
      ])

      renderPage('/workflows/templates')

      await waitFor(() => {
        expect(screen.getByText('Data Pipeline')).toBeInTheDocument()
      })

      const templateCard = screen.getByText('Data Pipeline')
      await user.click(templateCard)

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'view-workflow-template',
        params: { slug: 'data-pipeline' },
      })
    })

    it('navigates to create workflow from template when Create Workflow button clicked', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/workflows/prebuilt', [
        {
          id: 'tmpl-1',
          slug: 'data-pipeline',
          name: 'Data Pipeline',
          description: 'A data pipeline template',
        },
      ])

      renderPage('/workflows/templates')

      await waitFor(() => {
        expect(screen.getByText('Data Pipeline')).toBeInTheDocument()
      })

      const createButtons = screen.getAllByRole('button', { name: /create workflow/i })
      const templateCreateButton = createButtons.find((btn) =>
        btn.closest('article')?.textContent?.includes('Data Pipeline')
      )

      if (templateCreateButton) {
        await user.click(templateCreateButton)

        expect(mockRouterState.push).toHaveBeenCalledWith({
          name: 'new-workflow-from-template',
          params: { slug: 'data-pipeline' },
        })
      }
    })

    it('shows empty state when no templates found', async () => {
      mockAPI('GET', 'v1/workflows/prebuilt', [])

      renderPage('/workflows/templates')

      await waitFor(() => {
        expect(screen.getByText(/no templates found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Scope-Specific Behavior', () => {
    it('renders per-page selector when pagination exists', async () => {
      mockAPI('GET', 'v1/workflows', {
        data: [createWorkflowFixture()],
        pagination: { page: 0, per_page: 12, pages: 3, total: 36 },
      })

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.getByText('Show:')).toBeInTheDocument()
      })

      const perPageSelect = document.getElementById('per-page')
      expect(perPageSelect).toBeTruthy()
    })

    it('MY scope applies filter_by_user parameter', async () => {
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/my')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('filter_by_user=true'),
          expect.anything()
        )
      })

      expect(screen.getByPlaceholderText('Search')).toHaveValue('')
    })

    it('hides Created By filter on MY scope', async () => {
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/my')

      await waitForWorkflowLoaded('Test Workflow')

      expect(screen.queryByText('CREATED BY')).not.toBeInTheDocument()
    })

    it('shows only Categories and Created By filters on MARKETPLACE scope', async () => {
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())
      mockAPI('GET', 'v1/assistants/categories', [
        { id: 'cat-1', name: 'AI Tools', description: 'AI-related tools' },
      ])
      mockAPI('GET', 'v1/users/workflows-users', [])

      renderPage('/workflows/marketplace')

      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument()
        expect(screen.getByText('CATEGORIES')).toBeInTheDocument()
        expect(screen.getByText('CREATED BY')).toBeInTheDocument()
        expect(screen.queryByText('PROJECT')).not.toBeInTheDocument()
        expect(screen.queryByText('SHARED')).not.toBeInTheDocument()
      })
    })
  })

  describe('Publish to Marketplace', () => {
    it('opens publish modal and shows form after validation', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ is_global: false, user_abilities: ['write'] }),
        ])
      )
      mockAPI('POST', 'v1/workflows/workflow-1/marketplace/publish/validate', {
        inline_credentials: [],
      })
      mockAPI('GET', 'v1/assistants/categories', [
        { id: 'cat-1', name: 'AI Tools', description: 'AI-related tools' },
      ])

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Publish to Marketplace', user)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(
          screen.queryByText('Validating your workflow configuration...')
        ).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
      })
    })

    it('shows error when publishing without selecting category', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ is_global: false, user_abilities: ['write'] }),
        ])
      )
      mockAPI('POST', 'v1/workflows/workflow-1/marketplace/publish/validate', {
        inline_credentials: [],
      })
      mockAPI('GET', 'v1/assistants/categories', [
        { id: 'cat-1', name: 'AI Tools', description: 'AI-related tools' },
      ])

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Publish to Marketplace', user)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
      })

      const publishButton = screen.getByRole('button', { name: 'Publish' })
      await user.click(publishButton)

      await waitFor(() => {
        expect(screen.getByText('Please select at least one category')).toBeInTheDocument()
      })

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('shows inline credentials warning when validation returns credentials', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ is_global: false, user_abilities: ['write'] }),
        ])
      )
      mockAPI('POST', 'v1/workflows/workflow-1/marketplace/publish/validate', {
        inline_credentials: [{ key: 'API_KEY', value: 'secret' }],
      })
      mockAPI('GET', 'v1/assistants/categories', [
        { id: 'cat-1', name: 'AI Tools', description: 'AI-related tools' },
      ])

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Publish to Marketplace', user)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
      })

      expect(
        screen.getByText('This workflow contains inline credentials that will be used by users.')
      ).toBeInTheDocument()
    })

    it('publishes workflow to marketplace when form submitted', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ is_global: false, user_abilities: ['write'] }),
        ])
      )
      mockAPI('POST', 'v1/workflows/workflow-1/marketplace/publish/validate', {
        inline_credentials: [],
      })
      mockAPI('GET', 'v1/assistants/categories', [
        { id: 'cat-1', name: 'AI Tools', description: 'AI-related tools' },
      ])
      mockAPI('POST', 'v1/workflows/workflow-1/marketplace/publish', {})
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Publish to Marketplace', user)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
      })

      await selectMultiSelectOptions('Select up to 3 categories', ['AI Tools'], {
        user,
        closeAfter: false,
      })

      const publishButton = await waitFor(() => screen.getByRole('button', { name: 'Publish' }))
      await user.click(publishButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/workflow-1/marketplace/publish'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('closes modal when validation fails', async () => {
      const user = setupUser()
      mockAPI(
        'GET',
        'v1/workflows',
        createWorkflowsResponse([
          createWorkflowFixture({ is_global: false, user_abilities: ['write'] }),
        ])
      )

      mockAPI(
        'POST',
        'v1/workflows/workflow-1/marketplace/publish/validate',
        { message: 'Invalid workflow config', details: 'Missing required field' },
        400
      )

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Test Workflow')

      await clickMenuOption('More options', 'Publish to Marketplace', user)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Remove from Marketplace', () => {
    it('opens confirmation and unpublishes workflow', async () => {
      const user = setupUser()
      const globalWorkflow = createWorkflowFixture({
        id: 'workflow-1',
        name: 'Global Workflow',
        is_global: true,
        user_abilities: ['read', 'write', 'delete'],
      })
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse([globalWorkflow]))
      mockAPI('POST', 'v1/workflows/workflow-1/marketplace/unpublish', {})

      renderPage('/workflows/all')

      await waitForWorkflowLoaded('Global Workflow')

      // Mock the refresh call that happens after unpublish
      mockAPI('GET', 'v1/workflows', createWorkflowsResponse())

      const moreButton = await waitFor(() => screen.getByRole('button', { name: 'More options' }))
      await user.click(moreButton)

      await waitFor(() => {
        const menuItems = screen.queryAllByRole('menuitem')
        expect(menuItems.length).toBeGreaterThan(0)
      })

      const menuItems = screen.getAllByRole('menuitem')
      const removeItem = menuItems.find((item) =>
        item.textContent?.includes('Remove from Marketplace')
      )

      if (!removeItem) {
        throw new Error(`Menu items found: ${menuItems.map((i) => i.textContent).join(', ')}`)
      }

      await user.click(removeItem)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Remove from Marketplace?')).toBeInTheDocument()
      })

      const unpublishButton = await screen.findByRole('button', { name: 'Unpublish' })
      await user.click(unpublishButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/workflows/workflow-1/marketplace/unpublish'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Favorites List Loading', () => {
    it('loads favorites list via fetchFavoriteWorkflows', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/preferences/test-user-id/favorites/workflows', {
        data: [createWorkflowFixture({ name: 'Favorite Workflow', is_favorited: true })],
        page: 0,
        per_page: 12,
        pages: 1,
        total: 1,
      })

      renderPage('/workflows/favorites')

      await waitFor(() => {
        expect(screen.getByText('Favorite Workflow')).toBeInTheDocument()
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/preferences/test-user-id/favorites/workflows'),
        expect.anything()
      )
    })

    it('applies filters in favorites scope via onApply callback', async () => {
      const user = setupUser()
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/preferences/test-user-id/favorites/workflows', {
        data: [createWorkflowFixture({ name: 'Favorite Workflow' })],
        page: 0,
        per_page: 12,
        pages: 1,
        total: 1,
      })

      renderPage('/workflows/favorites')

      await waitFor(() => {
        expect(screen.getByText('Favorite Workflow')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search')
      await user.type(searchInput, 'mySearch')

      mockAPI('GET', 'v1/preferences/test-user-id/favorites/workflows', {
        data: [createWorkflowFixture({ name: 'Searched Favorite' })],
        page: 0,
        per_page: 12,
        pages: 1,
        total: 1,
      })

      await vi.advanceTimersByTimeAsync(1100)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=mySearch'),
          expect.anything()
        )
      })
    })
  })
})
