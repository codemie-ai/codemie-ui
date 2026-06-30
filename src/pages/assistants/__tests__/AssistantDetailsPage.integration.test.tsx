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

import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { userSettingsStore } from '@/store/userSettings'
import { renderPage, mockAPI } from '@/test-utils/integration'

describe('AssistantDetailsPage - Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    mockRouterState.back.mockClear()
    // AssistantDetailsPage reads assistantId from router.currentRoute.value.params.id
    const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
    routeValue.params = { id: 'asst-123' }
  })

  afterEach(() => {
    const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
    routeValue.params = {}
    history.stack = []
    history.currentIndex = -1
  })

  const createAssistantFixture = (overrides = {}) => ({
    id: 'asst-123',
    name: 'Test Assistant',
    slug: 'test-assistant',
    description: 'A helpful assistant',
    type: 'codemie',
    is_global: false,
    shared: false,
    project: 'test-proj',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    system_prompt: 'You are a helpful assistant',
    llm_model_type: 'gpt-4',
    mcp_servers: [],
    system_prompt_history: [],
    guardrail_assignments: [],
    toolkits: [],
    skills: [],
    nested_assistants: [],
    context: [],
    conversation_starters: [],
    prompt_variables: [],
    is_liked: false,
    is_disliked: false,
    is_favorited: false,
    is_pinned: false,
    unique_likes_count: 0,
    unique_dislikes_count: 0,
    user_abilities: ['read', 'write'],
    ...overrides,
  })

  describe('Initial Page Load', () => {
    it('loads and displays assistant name with Chat Now and Edit buttons', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Chat Now' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    it('renders template mode with Create Assistant button instead of Chat Now', async () => {
      const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
      routeValue.params = { id: 'template-slug' }
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/prebuilt/template-slug',
        createAssistantFixture({ id: 'tpl-1', name: 'Template Assistant' })
      )

      renderPage('/assistants/templates/template-slug')

      await waitFor(() => {
        expect(screen.getByText('Template Assistant')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Create Assistant' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Chat Now' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    })
  })

  describe('Chat Actions', () => {
    it('starts new chat and navigates when Chat Now clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/conversations/new', {
        id: 'new-chat-123',
        history: [],
        assistant_ids: ['asst-123'],
      })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Chat Now' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Chat Now' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/conversations/new'),
          expect.anything()
        )
      })

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'new-chat' })
      })
    })
  })

  describe('Edit Actions', () => {
    it('navigates to edit page when Edit button clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Edit' }))

      // EPMCDME-10841: with a project+slug, Edit navigates via the human-readable URL
      // (a string path) instead of the GUID route { name: 'edit-assistant', params: { id } }.
      expect(mockRouterState.push).toHaveBeenCalledWith('/assistants/test-proj/test-assistant/edit')
    })

    it('navigates to create from template when Create Assistant clicked', async () => {
      const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
      routeValue.params = { id: 'template-slug' }
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/prebuilt/template-slug',
        createAssistantFixture({ slug: 'template-slug' })
      )

      renderPage('/assistants/templates/template-slug')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Assistant' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Create Assistant' }))

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'new-assistant-from-template',
        params: { slug: 'template-slug' },
      })
    })
  })

  describe('Context Menu Actions', () => {
    it('clones assistant when Clone action clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Clone' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Clone' }))

      expect(mockRouterState.push).toHaveBeenCalledWith({
        name: 'clone-assistant',
        params: { id: 'asst-123' },
      })
    })

    it('deletes assistant when Delete action confirmed and navigates to assistants list', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({ user_abilities: ['read', 'write', 'delete'] })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('DELETE', 'v1/assistants/asst-123', {})

      renderPage('/assistants/asst-123')

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(screen.getByText('Delete this Assistant?')).toBeInTheDocument()

      const confirmButton = await screen.findByRole('button', { name: /^Delete$/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/asst-123'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'assistants' })
      })
    })

    it('cancels delete when Cancel clicked and dialog closes without navigation', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({ user_abilities: ['read', 'write', 'delete'] })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(mockRouterState.push).not.toHaveBeenCalledWith({ name: 'assistants' })
    })

    it('removes assistant from marketplace when Unpublish confirmed', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture({ is_global: true }))
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('POST', 'v1/assistants/asst-123/marketplace/unpublish', {
        id: 'asst-123',
        is_global: false,
      })

      renderPage('/assistants/asst-123')

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: 'Remove from Marketplace' })
        ).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Remove from Marketplace' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(screen.getByText('Remove from Marketplace?')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Unpublish' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/asst-123/marketplace/unpublish'),
          expect.anything()
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('opens Publish to Marketplace modal when Publish action clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture({ is_global: false }))
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('POST', 'v1/assistants/asst-123/marketplace/publish/validate', {
        sub_assistants: [],
        inline_credentials: [],
        prompt_variables: [],
      })
      mockAPI('GET', 'v1/assistants/categories', [])

      renderPage('/assistants/asst-123')

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Publish to Marketplace' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Publish to Marketplace' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(screen.getByText('Publish to Marketplace')).toBeInTheDocument()
    })
  })

  describe('Navigation (Back Button)', () => {
    it('calls router.back() when previous route is a different assistant-details page', async () => {
      // renderPage triggers useHistoryStack.updateStack() on mount, pushing one entry.
      // Set only the parent entry so after mount: stack=[parent, current], currentIndex=1,
      // prevRoute=parent (different id) → router.back() is called.
      history.stack = [{ name: 'assistant', params: { id: 'parent-asst' }, query: {} }]
      history.currentIndex = 0

      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Back' }))

      expect(mockRouterState.back).toHaveBeenCalled()
    })

    it('does not call router.back() when no previous assistant-details in history', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Back' }))

      expect(mockRouterState.back).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('renders empty page content when assistant fails to load', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', { error: 'Not found' }, 404)

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/id/asst-123'),
          expect.anything()
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Chat Now' })).not.toBeInTheDocument()
        expect(screen.queryByText('Test Assistant')).not.toBeInTheDocument()
      })
    })

    it('closes dialog without navigation when delete API fails', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({ user_abilities: ['read', 'write', 'delete'] })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('DELETE', 'v1/assistants/asst-123', { error: 'Internal server error' }, 500)

      renderPage('/assistants/asst-123')

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.click(await screen.findByRole('button', { name: /^Delete$/i }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/asst-123'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      expect(mockRouterState.push).not.toHaveBeenCalledWith({ name: 'assistants' })
    })
  })

  describe('Pin and Unpin', () => {
    it('pins assistant when Pin assistant button clicked', async () => {
      mockAPI('GET', 'v1/config', [
        { id: 'features:pinnedAssistants', settings: { enabled: true } },
      ])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('PUT', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        pinned_assistants: ['asst-123'],
        favorites: { assistants: [], workflows: [], skills: [] },
      })

      renderPage('/assistants/asst-123')

      const pinButton = await screen.findByRole('button', { name: 'Pin assistant' })
      await user.click(pinButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/preferences/test-user-id'),
          expect.objectContaining({ method: 'PUT' })
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Unpin assistant' })).toBeInTheDocument()
      })
    })

    it('shows unpin confirmation dialog when Unpin assistant button clicked', async () => {
      mockAPI('GET', 'v1/config', [
        { id: 'features:pinnedAssistants', settings: { enabled: true } },
      ])
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('GET', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        pinned_assistants: ['asst-123'],
        favorites: { assistants: [], workflows: [], skills: [] },
      })
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      const unpinButton = await screen.findByRole('button', { name: 'Unpin assistant' })
      await user.click(unpinButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(screen.getByText('Remove from sidebar')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Test Assistant will be removed from your sidebar shortcuts. You can pin it again at any time. Are you sure?'
        )
      ).toBeInTheDocument()
    })

    it('unpins assistant when unpin confirmation is confirmed', async () => {
      mockAPI('GET', 'v1/config', [
        { id: 'features:pinnedAssistants', settings: { enabled: true } },
      ])
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('GET', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        pinned_assistants: ['asst-123'],
        favorites: { assistants: [], workflows: [], skills: [] },
      })
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('PUT', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        pinned_assistants: [],
        favorites: { assistants: [], workflows: [], skills: [] },
      })

      renderPage('/assistants/asst-123')

      const unpinButton = await screen.findByRole('button', { name: 'Unpin assistant' })
      await user.click(unpinButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Remove' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/preferences/test-user-id'),
          expect.objectContaining({ method: 'PUT' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Pin assistant' })).toBeInTheDocument()
      })
    })
  })

  describe('Feature Flags (Config)', () => {
    it('hides Pin button when features:pinnedAssistants is disabled', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: 'Pin assistant' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Unpin assistant' })).not.toBeInTheDocument()
    })

    it('shows Pin button when features:pinnedAssistants is enabled', async () => {
      mockAPI('GET', 'v1/config', [
        { id: 'features:pinnedAssistants', settings: { enabled: true } },
      ])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Pin assistant' })).toBeInTheDocument()
      })
    })

    it('hides Favorites button when features:favorites is disabled', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: 'Add to favorites' })).not.toBeInTheDocument()
    })

    it('shows Favorites button when features:favorites is enabled', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument()
      })
    })

    it('hides Pin and Favorites buttons on marketplace assistant when both flags disabled', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({ is_global: true, user_abilities: ['read'] })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: 'Pin assistant' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add to favorites' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Like' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Dislike' })).toBeInTheDocument()
    })

    it('hides Pin and Favorites buttons on template when both flags disabled', async () => {
      const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
      routeValue.params = { id: 'template-slug' }
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/prebuilt/template-slug',
        createAssistantFixture({ id: 'tpl-1', name: 'Template Assistant' })
      )

      renderPage('/assistants/templates/template-slug')

      await waitFor(() => {
        expect(screen.getByText('Template Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: 'Pin assistant' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add to favorites' })).not.toBeInTheDocument()
    })
  })

  describe('Reactions (Marketplace)', () => {
    it('shows like and dislike buttons for marketplace assistant', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({ is_global: true, user_abilities: ['read'] })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Like' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Dislike' })).toBeInTheDocument()
    })

    it('does not show reaction buttons for project assistant', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture({ is_global: false }))
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: 'Like' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Dislike' })).not.toBeInTheDocument()
    })

    it('toggles like reaction and updates button label', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({ is_global: true, user_abilities: ['read'] })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('POST', 'v1/assistants/asst-123/reactions', { like_count: 1, dislike_count: 0 })

      renderPage('/assistants/asst-123')

      const likeButton = await screen.findByRole('button', { name: 'Like' })
      await user.click(likeButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/asst-123/reactions'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Remove like' })).toBeInTheDocument()
      })
    })
  })

  describe('Remote Assistant (A2A)', () => {
    it('renders RemoteAssistantDetails with capabilities when assistant type is A2A', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({
          type: 'A2A',
          agent_card: {
            url: 'https://remote-agent.example.com',
            capabilities: {
              streaming: true,
              pushNotifications: false,
              stateTransitionHistory: true,
            },
            defaultInputModes: ['text'],
            defaultOutputModes: ['text'],
          },
        })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.getByText('Streaming')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('State History')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Clone' })).not.toBeInTheDocument()
    })
  })

  describe('Prompt Variables', () => {
    it('shows Prompt Variables section when assistant has prompt variables', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({
          prompt_variables: [
            {
              key: 'USER_NAME',
              default_value: 'default-user',
              description: '',
              is_sensitive: false,
            },
          ],
        })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/assistants/asst-123/users/prompt-variables', { variables_config: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Prompt Variables')).toBeInTheDocument()
        expect(screen.getByText('USER_NAME')).toBeInTheDocument()
      })
    })

    it('does not show Prompt Variables section when assistant has no prompt variables', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture({ prompt_variables: [] }))
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByText('Prompt Variables')).not.toBeInTheDocument()
    })

    it('fetches user variable overrides and displays custom value', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({
          prompt_variables: [
            {
              key: 'API_ENDPOINT',
              default_value: 'https://default.example.com',
              description: '',
              is_sensitive: false,
            },
          ],
        })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/assistants/asst-123/users/prompt-variables', {
        variables_config: [
          {
            variable_key: 'API_ENDPOINT',
            variable_value: 'https://my-custom.example.com',
            is_sensitive: false,
          },
        ],
      })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/asst-123/users/prompt-variables'),
          expect.anything()
        )
      })

      await waitFor(() => {
        expect(screen.getByText('https://my-custom.example.com')).toBeInTheDocument()
      })
    })

    it('masks value for sensitive prompt variable', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({
          prompt_variables: [
            { key: 'API_KEY', default_value: 'secret-value', description: '', is_sensitive: true },
          ],
        })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/assistants/asst-123/users/prompt-variables', { variables_config: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Prompt Variables')).toBeInTheDocument()
        expect(screen.getByText('••••••••••')).toBeInTheDocument()
      })
      expect(screen.queryByText('secret-value')).not.toBeInTheDocument()
    })
  })

  describe('User Mapping (Integration Settings)', () => {
    beforeEach(() => {
      userSettingsStore.isSettingsIndexed = false
      userSettingsStore.settings = {}
    })

    const createAssistantWithToolkit = (overrides = {}) =>
      createAssistantFixture({
        is_global: true,
        toolkits: [{ toolkit: 'jira', label: 'Jira', settings_config: true, tools: [] }],
        ...overrides,
      })

    it('does not show integration settings for non-global (project) assistant', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/id/asst-123',
        createAssistantFixture({
          is_global: false,
          toolkits: [{ toolkit: 'jira', label: 'Jira', settings_config: true, tools: [] }],
        })
      )
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByText('Your Integration Settings')).not.toBeInTheDocument()
    })

    it('does not show integration settings in template mode', async () => {
      const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
      routeValue.params = { id: 'template-slug' }
      mockAPI('GET', 'v1/config', [])
      mockAPI(
        'GET',
        'v1/assistants/prebuilt/template-slug',
        createAssistantFixture({
          id: 'tpl-1',
          is_global: true,
          toolkits: [{ toolkit: 'jira', label: 'Jira', settings_config: true, tools: [] }],
        })
      )

      renderPage('/assistants/templates/template-slug')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByText('Your Integration Settings')).not.toBeInTheDocument()
    })

    it('shows Your Integration Settings for global assistant with configurable toolkits', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantWithToolkit())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/settings/user/available', [])
      mockAPI('GET', 'v1/assistants/tools', [])

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Your Integration Settings')).toBeInTheDocument()
      })

      expect(screen.getByRole('heading', { name: 'Jira', level: 4 })).toBeInTheDocument()
      expect(screen.getByText('Connected tool:')).toBeInTheDocument()
    })

    it('shows Add Integration button when no settings are available for the toolkit', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantWithToolkit())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/settings/user/available', [])
      mockAPI('GET', 'v1/assistants/tools', [])

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Your Integration Settings')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Add Integration' })).toBeInTheDocument()
    })

    it('shows Default integration dropdown when settings are available', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantWithToolkit())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/settings/user/available', [
        {
          id: 'setting-1',
          alias: 'My Jira',
          credential_type: 'JIRA',
          setting_type: 'user',
          project_name: 'test-proj',
        },
      ])
      mockAPI('GET', 'v1/assistants/tools', [])

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Your Integration Settings')).toBeInTheDocument()
      })

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add Integration' })).not.toBeInTheDocument()
    })

    it('saves integration settings after selecting an integration and clicking Save', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantWithToolkit())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/settings/user/available', [
        {
          id: 'setting-1',
          alias: 'My Jira',
          credential_type: 'JIRA',
          setting_type: 'user',
          project_name: 'test-proj',
        },
      ])
      mockAPI('GET', 'v1/assistants/tools', [])
      mockAPI('POST', 'v1/assistants/asst-123/users/mapping', { tools_config: [] })

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Your Integration Settings')).toBeInTheDocument()
      })

      const dropdown = screen.getByRole('combobox')
      fireEvent.click(dropdown)

      await waitFor(() => {
        expect(screen.getByText('My Jira (user)')).toBeInTheDocument()
      })
      await user.click(screen.getByText('My Jira (user)'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/asst-123/users/mapping'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
      })
    })

    it('refetches mapping and hides Save/Cancel buttons when Cancel clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantWithToolkit())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/settings/user/available', [
        {
          id: 'setting-1',
          alias: 'My Jira',
          credential_type: 'JIRA',
          setting_type: 'user',
          project_name: 'test-proj',
        },
      ])
      mockAPI('GET', 'v1/assistants/tools', [])

      renderPage('/assistants/asst-123')

      await waitFor(() => {
        expect(screen.getByText('Your Integration Settings')).toBeInTheDocument()
      })

      const dropdown = screen.getByRole('combobox')
      fireEvent.click(dropdown)

      await waitFor(() => {
        expect(screen.getByText('My Jira (user)')).toBeInTheDocument()
      })
      await user.click(screen.getByText('My Jira (user)'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/asst-123/users/mapping'),
          expect.anything()
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Favorites', () => {
    it('adds assistant to favorites when Add to favorites button clicked', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('PUT', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        pinned_assistants: [],
        favorites: { assistants: ['asst-123'], workflows: [], skills: [] },
      })

      renderPage('/assistants/asst-123')

      const favoriteButton = await screen.findByRole('button', { name: 'Add to favorites' })
      await user.click(favoriteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/preferences/test-user-id'),
          expect.objectContaining({ method: 'PUT' })
        )
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument()
      })
    })

    it('shows remove favorites confirmation when Remove from favorites clicked', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('GET', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        pinned_assistants: [],
        favorites: { assistants: ['asst-123'], workflows: [], skills: [] },
      })
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/asst-123')

      const removeButton = await screen.findByRole('button', { name: 'Remove from favorites' })
      await user.click(removeButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(screen.getByText('Remove from favorites')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Test Assistant will be removed from your favorites. You can add it back at any time. Are you sure?'
        )
      ).toBeInTheDocument()
    })

    it('removes assistant from favorites when confirmation is confirmed', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('GET', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        pinned_assistants: [],
        favorites: { assistants: ['asst-123'], workflows: [], skills: [] },
      })
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('PUT', 'v1/preferences/test-user-id', {
        user_id: 'test-user-id',
        pinned_assistants: [],
        favorites: { assistants: [], workflows: [], skills: [] },
      })

      renderPage('/assistants/asst-123')

      const removeButton = await screen.findByRole('button', { name: 'Remove from favorites' })
      await user.click(removeButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Remove' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/preferences/test-user-id'),
          expect.objectContaining({ method: 'PUT' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument()
      })
    })
  })
})
