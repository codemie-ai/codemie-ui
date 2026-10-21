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
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'

const SWITCH_LABEL = /Hide tool outputs from end users/

describe('AssistantForm Tool Output Visibility section - Integration', () => {
  const user = userEvent.setup()

  const userWithProject = {
    user_id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    is_admin: false,
    is_maintainer: false,
    user_type: 'INTERNAL',
    applications: ['test-project'],
    projects: [{ name: 'test-project', display_name: null, is_project_admin: true }],
  }

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    mockRouterState.currentRoute.value = {
      path: '/assistants/new',
      name: 'new-assistant',
      params: {},
      query: {},
      hash: '',
    }
    localStorage.setItem('codemie-new-asst-ai-popup', 'false')
    localStorage.setItem('test-user-id_onboarding-visited-pages', JSON.stringify(['assistants']))
    mockAPI('GET', 'v1/assistants/tools', [])
    mockAPI('GET', 'v1/config', [])
  })

  afterEach(() => {
    const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
    routeValue.params = {}
  })

  it('renders the section and sends hide_tool_outputs true after toggling', async () => {
    mockAPI('GET', 'v1/user', userWithProject)
    mockAPI('POST', 'v1/assistants', { id: 'new-assistant-id', assistantId: 'new-assistant-id' })

    renderPage('/assistants/new')

    await waitFor(() => {
      expect(screen.getByText('test-project')).toBeInTheDocument()
    })

    expect(screen.queryByText('Tool output visibility')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: SWITCH_LABEL })).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Name*'), 'Hidden Assistant')
    await user.type(screen.getByPlaceholderText(/description/i), 'Hidden one')
    await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are hidden')

    expect(screen.getByRole('switch', { name: SWITCH_LABEL })).not.toBeChecked()
    await user.click(screen.getByRole('switch', { name: SWITCH_LABEL }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/assistants'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"hide_tool_outputs":true'),
        })
      )
    })
  })

  it('shows the switch checked when editing an assistant that hides tool outputs', async () => {
    const routeValue = mockRouterState.currentRoute.value as { params: Record<string, string> }
    routeValue.params = { id: 'asst-123' }
    mockAPI('GET', 'v1/assistants/id/asst-123', {
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
      user_abilities: ['read', 'write'],
      hide_tool_outputs: true,
    })
    mockAPI('GET', 'v1/llm/models', [])

    renderPage('/assistants/asst-123/edit')

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: SWITCH_LABEL })).toBeChecked()
    })
  })
})
