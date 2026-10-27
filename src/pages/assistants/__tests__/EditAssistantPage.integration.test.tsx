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

import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  describe('Skills field', () => {
    it('renders a skill name correctly even when the skill is outside the loaded catalog scope', async () => {
      const assistant = createAssistantFixture({
        skills: [
          { id: 'sk-known', name: 'epam-pptx-template' },
          { id: 'sk-hidden', name: 'codemie-speech-presentation-content' },
        ],
      })

      mockAPI('GET', 'v1/config', [{ id: 'skills', settings: { enabled: true } }])
      mockAPI('GET', 'v1/assistants/id/asst-123', assistant)
      mockAPI('GET', 'v1/llm/models', [])
      // Catalog scope omits sk-hidden — reproduces the reported defect condition.
      mockAPI('GET', 'v1/skills', [{ id: 'sk-known', name: 'epam-pptx-template' }])

      renderPage('/assistants/asst-123/edit')

      await screen.findByText(/epam-pptx-template/)
      // Scope to the Skills accordion — the unrelated LLM model select renders "null" with no models
      const skillsSection = document.querySelector<HTMLElement>(
        '[data-onboarding="assistant-skills-accordion"]'
      ) as HTMLElement
      expect(
        within(skillsSection).getByText(/codemie-speech-presentation-content/)
      ).toBeInTheDocument()
      expect(within(skillsSection).queryByText(/^null$/)).not.toBeInTheDocument()
    })
  })

  describe('Optional numeric model params', () => {
    const putBodyOf = () => {
      const call = (global.fetch as any).mock.calls.find(
        ([url, init]) => String(url).includes('v1/assistants/asst-123') && init?.method === 'PUT'
      )
      return call ? JSON.parse(call[1].body) : undefined
    }

    const putBodies = () =>
      (global.fetch as any).mock.calls
        .filter(
          ([url, init]) => String(url).includes('v1/assistants/asst-123') && init?.method === 'PUT'
        )
        .map(([, init]) => JSON.parse(init.body))

    const openEditForm = async (overrides) => {
      mockAPI('GET', 'v1/config', [])
      mockAPI('GET', 'v1/assistants/id/asst-123', createAssistantFixture(overrides))
      mockAPI('GET', 'v1/llm/models', [])
      mockAPI('PUT', 'v1/assistants/asst-123', { id: 'asst-123', assistantId: 'asst-123' })
      renderPage('/assistants/asst-123/edit')
      return screen.findByTestId('assistant-temperature-input')
    }

    const numericInputs = () => ({
      temperature: screen.getByTestId('assistant-temperature-input'),
      topP: screen.getByPlaceholderText('0-1'),
      limit: screen.getByPlaceholderText('30000'),
    })

    it('sends temperature: null and top_p: null in the PUT body when both are cleared', async () => {
      const user = userEvent.setup()
      const temperatureInput = await openEditForm({ temperature: 0.5, top_p: 0.9 })
      expect(temperatureInput).toHaveValue('0.5')

      await user.clear(temperatureInput)
      await user.clear(screen.getByPlaceholderText('0-1'))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(putBodyOf()).toBeDefined())
      expect(putBodyOf()).toHaveProperty('temperature', null)
      expect(putBodyOf()).toHaveProperty('top_p', null)
    })

    it('sends the updated temperature when a value is changed', async () => {
      const user = userEvent.setup()
      const temperatureInput = await openEditForm({ temperature: 0.5 })

      await user.clear(temperatureInput)
      await user.type(temperatureInput, '0.3')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(putBodyOf()).toBeDefined())
      expect(putBodyOf().temperature).toBe(0.3)
    })

    it('sends tools_tokens_size_limit: null in the PUT body when cleared', async () => {
      const user = userEvent.setup()
      await openEditForm({ tools_tokens_size_limit: 30000 })
      const limitInput = screen.getByPlaceholderText('30000')
      expect(limitInput).toHaveValue('30000')

      await user.clear(limitInput)
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(putBodyOf()).toBeDefined())
      expect(putBodyOf()).toHaveProperty('tools_tokens_size_limit', null)
    })

    it('sends top_p: 0 and temperature: 0 in the PUT body', async () => {
      const user = userEvent.setup()
      const temperatureInput = await openEditForm({ temperature: 0.5, top_p: 0.9 })
      const topPInput = screen.getByPlaceholderText('0-1')

      await user.clear(temperatureInput)
      await user.type(temperatureInput, '0')
      await user.clear(topPInput)
      await user.type(topPInput, '0')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(putBodyOf()).toBeDefined())
      expect(putBodyOf().temperature).toBe(0)
      expect(putBodyOf().top_p).toBe(0)
    })

    it('sends a typed tools_tokens_size_limit as a number', async () => {
      const user = userEvent.setup()
      await openEditForm({ tools_tokens_size_limit: undefined })

      await user.type(screen.getByPlaceholderText('30000'), '1000')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(putBodyOf()).toBeDefined())
      expect(putBodyOf().tools_tokens_size_limit).toBe(1000)
    })

    it('persists set → clear → reload for temperature, top_p and tools_tokens_size_limit', async () => {
      const user = userEvent.setup()
      const cleared = { temperature: null, top_p: null, tools_tokens_size_limit: null }

      await openEditForm(cleared)
      let inputs = numericInputs()
      expect(inputs.temperature).toHaveValue('')
      expect(inputs.topP).toHaveValue('')
      expect(inputs.limit).toHaveValue('')

      await user.type(inputs.temperature, '0.4')
      await user.type(inputs.topP, '0.8')
      await user.type(inputs.limit, '1000')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(putBodies()).toHaveLength(1))
      expect(putBodies()[0]).toMatchObject({
        temperature: 0.4,
        top_p: 0.8,
        tools_tokens_size_limit: 1000,
      })

      cleanup()
      await openEditForm({ temperature: 0.4, top_p: 0.8, tools_tokens_size_limit: 1000 })
      inputs = numericInputs()
      await waitFor(() => expect(inputs.temperature).toHaveValue('0.4'))
      expect(inputs.topP).toHaveValue('0.8')
      expect(inputs.limit).toHaveValue('1000')

      await user.clear(inputs.temperature)
      await user.clear(inputs.topP)
      await user.clear(inputs.limit)
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(putBodies()).toHaveLength(2))
      expect(putBodies()[1]).toMatchObject(cleared)

      cleanup()
      await openEditForm(cleared)
      inputs = numericInputs()
      await waitFor(() => expect(inputs.temperature).toHaveValue(''))
      expect(inputs.topP).toHaveValue('')
      expect(inputs.limit).toHaveValue('')
    })
  })
})
