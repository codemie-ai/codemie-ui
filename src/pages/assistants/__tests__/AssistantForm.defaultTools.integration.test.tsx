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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'
import { ContextType } from '@/types/entity/assistant'
import toaster from '@/utils/toaster'

describe('AssistantForm - disabled_context_tools wiring (Integration)', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
    routeValue.params = { id: 'asst-123' }
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
    context: [{ name: 'repo', context_type: ContextType.CODE, id: '1' }],
    disabled_context_tools: [],
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

  const codebaseToolkitCatalog = [
    {
      toolkit: 'codebase',
      label: 'Codebase Tools',
      tools: [
        {
          name: 'get_repository_file_tree',
          label: 'Get Repo Tree',
          settings_config: false,
        },
      ],
      settings_config: false,
      is_external: false,
    },
  ]

  const mockCommonEndpoints = (assistant: ReturnType<typeof createAssistantFixture>) => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/id/asst-123', assistant)
    mockAPI('GET', 'v1/llm/models', [])
    mockAPI('GET', 'v1/assistants/tools', codebaseToolkitCatalog)
  }

  it('renders the default tool checked, unchecks it, and saves disabled_context_tools in the PUT payload', async () => {
    const assistant = createAssistantFixture()
    mockCommonEndpoints(assistant)
    mockAPI('PUT', 'v1/assistants/asst-123', { ...assistant, id: 'asst-123' })

    renderPage('/assistants/asst-123/edit')

    const checkbox = await screen.findByLabelText('Get Repo Tree')
    await waitFor(() => expect(checkbox).toBeChecked())

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/assistants/asst-123'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"disabled_context_tools":["get_repository_file_tree"]'),
        })
      )
    })
  })

  it('keeps the unchecked default tool unchecked after a failed save and surfaces the backend error', async () => {
    const assistant = createAssistantFixture()
    mockCommonEndpoints(assistant)
    mockAPI(
      'PUT',
      'v1/assistants/asst-123',
      { error: { message: 'Unknown deselected default tools detected: bogus_tool' } },
      400
    )

    renderPage('/assistants/asst-123/edit')

    const checkbox = await screen.findByLabelText('Get Repo Tree')
    await waitFor(() => expect(checkbox).toBeChecked())

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/assistants/asst-123'),
        expect.objectContaining({ method: 'PUT' })
      )
    })

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith(
        'Unknown deselected default tools detected: bogus_tool'
      )
    })

    // The failed save must not reset the author's toggle back to checked.
    expect(screen.getByLabelText('Get Repo Tree')).not.toBeChecked()
  })
})
