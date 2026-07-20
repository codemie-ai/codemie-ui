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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'

describe('EditAssistantPage - Integration', () => {
  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
    routeValue.params = { id: 'asst-123' }
    // ToolsConfiguration fetches toolkits on mount — mock to prevent null crash
    mockAPI('GET', 'v1/assistants/tools', [])
  })

  afterEach(() => {
    const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
    routeValue.params = {}
    vi.clearAllMocks()
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

  describe('Header Display', () => {
    it('displays assistant name in page header', async () => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture())
      mockAPI('GET', 'v1/llm/models', [])

      renderPage('/assistants/asst-123/edit')

      await waitFor(() => {
        // Verify the page loads and displays the header with title
        expect(screen.getByText('Edit Assistant')).toBeInTheDocument()
      })

      // Verify assistant name appears in the header (as subtitle below "Edit Assistant")
      // Uses waitFor because the subtitle loads after the async assistant fetch resolves
      await waitFor(() => {
        const headerSubtitle = screen.getAllByText('Test Assistant')[0]
        expect(headerSubtitle).toHaveClass('text-text-quaternary')
      })

      // Verify at least the back button exists (full form may still be loading)
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    })
  })
})
