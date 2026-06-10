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
import { describe, it, expect, beforeEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'

describe('AssistantsListPage - Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
  })

  const createAssistantFixture = (overrides = {}) => ({
    id: 'assistant-1',
    name: 'Test Assistant',
    slug: 'test-assistant',
    description: 'Test description',
    is_global: false,
    shared: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    system_prompt: 'You are a helpful assistant',
    llm_model_type: 'gpt-4',
    mcp_servers: [],
    system_prompt_history: [],
    guardrail_assignments: [],
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
    it('loads and displays assistants list on PROJECT tab', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: {
          page: 0,
          per_page: 12,
          pages: 1,
          total: 1,
        },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('1 ASSISTANT')).toBeInTheDocument()
      })
    })

    it('shows empty state when no assistants found', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText(/no assistants/i)).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation', () => {
    it('loads and displays marketplace assistants on MARKETPLACE tab', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [
          createAssistantFixture({
            id: 'marketplace-1',
            name: 'Marketplace Assistant',
            is_global: true,
          }),
        ],
        pagination: {
          page: 0,
          per_page: 12,
          pages: 1,
          total: 5,
        },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants/marketplace')

      await waitFor(() => {
        expect(screen.getByText('Marketplace Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('5 ASSISTANTS')).toBeInTheDocument()
      })
    })

    it('loads and displays favorites when feature flag enabled', async () => {
      mockAPI('GET', 'v1/config', [
        {
          id: 'features:favorites',
          settings: { enabled: true },
        },
      ])
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('GET', 'v1/preferences/test-user-id/favorites/assistants', {
        data: [
          createAssistantFixture({
            id: 'fav-assistant-1',
            name: 'Favorite Assistant',
            is_favorited: true,
          }),
        ],
        page: 0,
        per_page: 12,
        pages: 1,
        total: 3,
      })

      renderPage('/assistants/favorites')

      await waitFor(() => {
        expect(screen.getByText('Favorite Assistant')).toBeInTheDocument()
      })
    })

    it('navigates to templates tab and loads prebuilt assistants', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/prebuilt', [
        createAssistantFixture({
          id: 'template-1',
          name: 'Template Assistant',
        }),
      ])

      renderPage('/assistants/templates')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/prebuilt'),
          expect.anything()
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Template Assistant')).toBeInTheDocument()
      })
    })
  })

  describe('Create Actions', () => {
    it('navigates to create assistant page when Create Assistant button clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Assistant' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Create Assistant' }))

      expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'new-assistant' })
    })

    it('navigates to create remote assistant page when button clicked and config enabled', async () => {
      mockAPI('GET', 'v1/config', [
        {
          id: 'remoteAssistant',
          settings: { enabled: true },
        },
      ])
      mockAPI('GET', 'v1/assistants', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Remote Assistant' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Create Remote Assistant' }))

      expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'new-remote-assistant' })
    })

    it('hides Create Remote Assistant button when config flag disabled', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create Assistant' })).toBeInTheDocument()
      })

      expect(
        screen.queryByRole('button', { name: 'Create Remote Assistant' })
      ).not.toBeInTheDocument()
    })
  })

  describe('Card Interactions', () => {
    it('navigates to assistant details when card clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Test Assistant'))

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'assistant',
            params: expect.objectContaining({ id: 'assistant-1' }),
          })
        )
      })
    })

    it('starts chat when chat button clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/conversations/new', {
        id: 'new-chat-123',
        conversation_name: 'New Chat',
        history: [],
        assistant_ids: ['assistant-1'],
      })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      const chatButton = screen.getByRole('button', { name: 'Start chat with Test Assistant' })
      await user.click(chatButton)

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

  describe('Context Menu Actions', () => {
    it('deletes assistant when delete action confirmed', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture({ user_abilities: ['read', 'write', 'delete'] })],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('DELETE', 'v1/assistants/assistant-1', { success: true })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const confirmButton = await screen.findByRole('button', { name: /^Delete$/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/assistant-1'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('shows modal close after delete error', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture({ user_abilities: ['read', 'write', 'delete'] })],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('DELETE', 'v1/assistants/assistant-1', { error: 'Failed to delete' }, 422)

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      const confirmButton = await screen.findByRole('button', { name: /^Delete$/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/assistant-1'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('navigates to edit page when edit action clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'edit-assistant',
          params: expect.objectContaining({ id: 'assistant-1' }),
        })
      )
    })

    it('navigates to clone page when clone action clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Clone' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Clone' }))

      expect(mockRouterState.push).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'clone-assistant',
          params: expect.objectContaining({ id: 'assistant-1' }),
        })
      )
    })

    it.skip('opens export popup when export action clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      const menuButton = await screen.findByRole('button', { name: 'More options' })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Export' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('menuitem', { name: 'Export' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByText(/export assistant/i)).toBeInTheDocument()
      })
    })
  })

  describe('Reactions and Preferences', () => {
    it('toggles like when like button clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture({ is_global: true })],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('POST', 'v1/assistants/assistant-1/reactions', { like_count: 1, dislike_count: 0 })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      const likeButton = screen.getByRole('button', { name: 'Like Test Assistant, 0' })
      await user.click(likeButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/assistant-1/reactions'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Remove like from Test Assistant, 1' })
        ).toBeInTheDocument()
      })
    })

    it('pins assistant when pin button clicked (no confirmation)', async () => {
      mockAPI('GET', 'v1/config', [
        {
          id: 'features:pinnedAssistants',
          settings: { enabled: true },
        },
      ])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('PUT', 'v1/preferences/test-user-id', { success: true })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

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

    it('adds favorite when favorite button clicked (no confirmation)', async () => {
      mockAPI('GET', 'v1/config', [
        {
          id: 'features:favorites',
          settings: { enabled: true },
        },
      ])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        name: 'Test User',
        username: 'testuser',
        applications: [],
      })
      mockAPI('PUT', 'v1/preferences/test-user-id', { success: true })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

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
  })

  describe('Filters and Pagination', () => {
    it('applies filters and reloads assistants list', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [createAssistantFixture()],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Test Assistant')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search')
      await user.clear(searchInput)
      await user.type(searchInput, 'AI')

      mockAPI('GET', 'v1/assistants', {
        data: [
          createAssistantFixture({
            id: 'ai-assistant',
            name: 'AI Assistant',
          }),
        ],
        pagination: { page: 0, per_page: 12, pages: 1, total: 1 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      await new Promise((resolve) => {
        setTimeout(resolve, 1100)
      })

      const isAssistantsCall = (call: any[]) => call[0].includes('v1/assistants')

      await waitFor(() => {
        const { calls } = (global.fetch as any).mock
        const assistantsCalls = calls.filter(isAssistantsCall)
        expect(assistantsCalls.length).toBeGreaterThan(1)
      })

      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      })
    })

    it('changes page when pagination button clicked', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants', {
        data: [
          createAssistantFixture({ id: '1', name: 'Assistant 1' }),
          createAssistantFixture({ id: '2', name: 'Assistant 2' }),
        ],
        pagination: { page: 0, per_page: 12, pages: 3, total: 30 },
      })
      mockAPI('GET', 'v1/user/reactions', { items: [] })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Assistant 1')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
      })

      mockAPI('GET', 'v1/assistants', {
        data: [
          createAssistantFixture({ id: '13', name: 'Assistant 13' }),
          createAssistantFixture({ id: '14', name: 'Assistant 14' }),
        ],
        pagination: { page: 1, per_page: 12, pages: 3, total: 30 },
      })

      await user.click(screen.getByRole('button', { name: 'Page 2' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.anything()
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Assistant 13')).toBeInTheDocument()
      })
    })
  })
})
