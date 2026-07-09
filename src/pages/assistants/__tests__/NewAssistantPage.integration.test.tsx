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
import { describe, it, expect, beforeEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'
import toaster from '@/utils/toaster'

// handleGenerateClick uses try/finally (no catch); a rejected API promise propagates
// out of react-hook-form's handleSubmit as an unhandled rejection. Tests that
// exercise the error path must suppress it so Vitest does not treat it as a failure.
const suppressUnhandledRejection = () => {
  const vitestHandlers = process.listeners('unhandledRejection')
  process.removeAllListeners('unhandledRejection')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  process.on('unhandledRejection', () => {})
  return () => {
    process.removeAllListeners('unhandledRejection')
    for (const h of vitestHandlers) {
      process.on('unhandledRejection', h)
    }
  }
}

describe('NewAssistantPage - Integration', () => {
  const user = userEvent.setup()

  const createAssistantFixture = (overrides = {}) => ({
    id: 'assistant-1',
    name: 'Test Assistant',
    slug: 'test-assistant',
    description: 'A helpful assistant',
    system_prompt: 'You are a helpful assistant',
    project: 'test-project',
    shared: false,
    is_global: false,
    llm_model_type: '',
    enable_image_generation: false,
    image_generation_model: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    system_prompt_history: [],
    mcp_servers: [],
    guardrail_assignments: [],
    toolkits: [],
    categories: [],
    conversation_starters: [],
    user_abilities: ['read', 'write'],
    ...overrides,
  })

  const createToolkitFixture = (overrides = {}) => ({
    toolkit: 'jira',
    label: 'Jira',
    is_external: false,
    settings_config: true,
    settings: null,
    tools: [
      { name: 'jira_create_issue', label: 'Create Issue', settings_config: true, settings: null },
      { name: 'jira_get_issue', label: 'Get Issue', settings_config: false, settings: null },
    ],
    ...overrides,
  })

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

  const getDialog = () => screen.getByRole('dialog')

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
    // Suppress AI popup by default so most tests don't have to deal with it
    localStorage.setItem('codemie-new-asst-ai-popup', 'false')
    // Pre-mark the assistants page as visited so AutoPopupManager does not
    // render the "Guided Tour Available" first-time page popup alongside tests
    // that open their own dialogs. Key format: {userId}_{VISITED_PAGES_KEY}
    localStorage.setItem('test-user-id_onboarding-visited-pages', JSON.stringify(['assistants']))
    // Default mock for tools (ToolsConfiguration fetches on mount)
    mockAPI('GET', 'v1/assistants/tools', [])
  })

  describe('Page Initialization', () => {
    it('loads Create Assistant page with correct title and action buttons', async () => {
      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      // Page header "Generate with AI" button (not in popup)
      await waitFor(() => {
        const genButtons = screen.getAllByRole('button', { name: /Generate with AI/i })
        expect(genButtons.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('suppresses AI popup when localStorage has false', async () => {
      localStorage.setItem('codemie-new-asst-ai-popup', 'false')

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('pre-populates form fields from URL query params', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/new',
        name: 'new-assistant',
        params: {},
        query: { name: 'My Bot', description: 'A helpful bot', systemPrompt: 'You are helpful' },
        hash: '',
      }

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByDisplayValue('My Bot')).toBeInTheDocument()
      })
    })

    it('loads Clone Assistant page with correct title', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/assistant-1/clone',
        name: 'clone-assistant',
        params: { id: 'assistant-1' },
        query: {},
        hash: '',
      }
      mockAPI('GET', 'v1/assistants/id/assistant-1', createAssistantFixture())

      renderPage('/assistants/assistant-1/clone')

      await waitFor(() => {
        expect(screen.getByText('Clone Assistant')).toBeInTheDocument()
      })
    })

    it('hides "Generate with AI" button in clone mode', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/assistant-1/clone',
        name: 'clone-assistant',
        params: { id: 'assistant-1' },
        query: {},
        hash: '',
      }
      mockAPI('GET', 'v1/assistants/id/assistant-1', createAssistantFixture())

      renderPage('/assistants/assistant-1/clone')

      await waitFor(() => {
        expect(screen.getByText('Clone Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /Generate with AI/i })).not.toBeInTheDocument()
    })

    it('loads Create from Template page with correct title', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/from-template/helpful-bot',
        name: 'new-assistant-from-template',
        params: { slug: 'helpful-bot' },
        query: {},
        hash: '',
      }
      mockAPI(
        'GET',
        'v1/assistants/prebuilt/helpful-bot',
        createAssistantFixture({ slug: 'helpful-bot' })
      )

      renderPage('/assistants/from-template/helpful-bot')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant from Template')).toBeInTheDocument()
      })
    })

    it('pre-populates clone form with original assistant description', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/assistant-1/clone',
        name: 'clone-assistant',
        params: { id: 'assistant-1' },
        query: {},
        hash: '',
      }
      mockAPI(
        'GET',
        'v1/assistants/id/assistant-1',
        createAssistantFixture({ description: 'Original description' })
      )

      renderPage('/assistants/assistant-1/clone')

      await waitFor(() => {
        expect(screen.getByText('Clone Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original description')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('shows validation errors when submitting empty form', async () => {
      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      })
      expect(screen.getByText('Description is required')).toBeInTheDocument()
      expect(screen.getByText('System instructions are required')).toBeInTheDocument()
    })

    it('does not call POST v1/assistants when form validation fails', async () => {
      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('v1/assistants'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('successfully creates assistant and navigates to assistants list', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-assistant-id', assistantId: 'new-assistant-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      // Wait for ProjectSelector to auto-select test-project
      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'My New Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(
        screen.getByPlaceholderText(/system instructions/i),
        'You are a helpful assistant'
      )

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith({
          name: 'assistants',
          query: { tab: 'all' },
        })
      })
    })

    it('shows error toast when create assistant API call fails', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI(
        'POST',
        'v1/assistants',
        { error: 'Failed to create', message: 'Failed to create', assistantId: null },
        422
      )

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(toaster.error).toHaveBeenCalled()
      })

      expect(mockRouterState.push).not.toHaveBeenCalled()
    })
  })

  describe('Missing Integrations Modal', () => {
    const missingIntegrationsResponse = {
      message: 'Missing integrations found',
      assistantId: null,
      validation: {
        has_missing_integrations: true,
        missing_by_credential_type: [
          {
            credential_type: 'jira',
            missing_tools: [
              {
                toolkit: 'jira',
                tool: 'jira_create_issue',
                label: 'Create Issue',
                credential_type: 'jira',
                settings_config_level: 'tool' as const,
              },
            ],
            assistant_id: null,
            assistant_name: null,
          },
        ],
        sub_assistants_missing: [],
        message: 'Missing integrations found',
      },
    }

    const fillAndSubmitForm = async () => {
      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })
      await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')
      await user.click(screen.getByRole('button', { name: 'Save' }))
    }

    it('shows Missing Integrations modal when API returns has_missing_integrations', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', missingIntegrationsResponse)

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await fillAndSubmitForm()

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()
      expect(within(dialog).getAllByText(/Missing Integrations/i).length).toBeGreaterThanOrEqual(1)
      expect(
        within(dialog).getByRole('button', { name: 'Skip Validation & Save' })
      ).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Validate & Save' })).toBeInTheDocument()
    })

    it('closes modal without navigation when Cancel is clicked', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', missingIntegrationsResponse)

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await fillAndSubmitForm()

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      expect(mockRouterState.push).not.toHaveBeenCalled()
    })

    it('navigates to assistants list after clicking Skip Validation & Save', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', missingIntegrationsResponse)

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await fillAndSubmitForm()

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Override for the second POST call (skip validation)
      mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })

      const dialog = getDialog()
      await user.click(within(dialog).getByRole('button', { name: 'Skip Validation & Save' }))

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith({
          name: 'assistants',
          query: { tab: 'all' },
        })
      })
    })
  })

  describe('AI Generation Popup', () => {
    it('auto-shows AI popup on first visit (no localStorage key)', async () => {
      localStorage.removeItem('codemie-new-asst-ai-popup')

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()
      expect(within(dialog).getByText(/Generate Assistant with AI/i)).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Create Manualy' })).toBeInTheDocument()
      expect(
        within(dialog).getByRole('checkbox', { name: /Do not show this popup/i })
      ).toBeInTheDocument()
    })

    it('closes popup when "Create Manualy" is clicked', async () => {
      localStorage.removeItem('codemie-new-asst-ai-popup')

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      await user.click(within(getDialog()).getByRole('button', { name: 'Create Manualy' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('saves "do not show" preference when checkbox is checked before dismissing', async () => {
      localStorage.removeItem('codemie-new-asst-ai-popup')

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()
      await user.click(within(dialog).getByRole('checkbox', { name: /Do not show this popup/i }))
      await user.click(within(dialog).getByRole('button', { name: 'Create Manualy' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      expect(localStorage.getItem('codemie-new-asst-ai-popup')).toBe('false')
    })

    it('opens popup manually via "Generate with AI" page button when suppressed', async () => {
      localStorage.setItem('codemie-new-asst-ai-popup', 'false')

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      // Get the page header "Generate with AI" button (first one, not inside a dialog)
      const genButtons = screen.getAllByRole('button', { name: /Generate with AI/i })
      await user.click(genButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()
      expect(within(dialog).getByText(/Generate Assistant with AI/i)).toBeInTheDocument()
      // In manual mode: shows "Cancel" not "Create Manualy"
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      // No "Do not show" checkbox in manual mode
      expect(
        within(dialog).queryByRole('checkbox', { name: /Do not show this popup/i })
      ).not.toBeInTheDocument()
    })

    it('generates assistant with AI and populates form name field', async () => {
      localStorage.removeItem('codemie-new-asst-ai-popup')
      mockAPI('POST', 'v1/assistants/generate', {
        name: 'Smart Bot',
        description: 'I help with tasks',
        system_prompt: 'You are a smart assistant',
        conversation_starters: ['How can you help?'],
        toolkits: [],
        categories: ['productivity'],
      })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()
      await user.type(
        within(dialog).getByRole('textbox', { name: /What should your assistant do/i }),
        'A project management assistant'
      )

      await user.click(within(dialog).getByRole('button', { name: 'Generate with AI' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/generate'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Smart Bot')).toBeInTheDocument()
      })
    })

    it('keeps popup open when AI generation fails', async () => {
      // handleGenerateClick uses try/finally (no catch); suppress the resulting
      // unhandled rejection so Vitest does not treat it as a test failure.
      const restore = suppressUnhandledRejection()
      try {
        localStorage.removeItem('codemie-new-asst-ai-popup')
        mockAPI('POST', 'v1/assistants/generate', { error: 'AI generation failed' }, 500)

        renderPage('/assistants/new')

        await waitFor(() => expect(screen.getByText('Create Assistant')).toBeInTheDocument())
        await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

        const dialog = getDialog()
        await user.type(
          within(dialog).getByRole('textbox', { name: /What should your assistant do/i }),
          'Test prompt'
        )

        await user.click(within(dialog).getByRole('button', { name: 'Generate with AI' }))

        await waitFor(() =>
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('v1/assistants/generate'),
            expect.anything()
          )
        )

        // Popup stays open after error (generate failed)
        await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
      } finally {
        restore()
      }
    })

    it('sends include_tools: false when Include Tools switch is toggled off', async () => {
      localStorage.removeItem('codemie-new-asst-ai-popup')
      mockAPI('POST', 'v1/assistants/generate', {
        name: 'Bot',
        description: 'A bot',
        system_prompt: 'You are a bot',
        conversation_starters: [],
        toolkits: [],
        categories: [],
      })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()

      // Toggle "Include tools" switch off
      const includeToolsSwitch = within(dialog).getByRole('switch', { name: /Include tools/i })
      await user.click(includeToolsSwitch)

      await user.type(
        within(dialog).getByRole('textbox', { name: /What should your assistant do/i }),
        'Test'
      )

      await user.click(within(dialog).getByRole('button', { name: 'Generate with AI' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/generate'),
          expect.objectContaining({
            body: expect.stringContaining('"include_tools":false'),
          })
        )
      })
    })

    it('does not call generate API when prompt is empty and Generate button clicked', async () => {
      localStorage.removeItem('codemie-new-asst-ai-popup')

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()
      const generateBtn = within(dialog).getByRole('button', { name: 'Generate with AI' })
      await user.click(generateBtn)

      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('v1/assistants/generate'),
        expect.anything()
      )
    })
  })

  describe('Clone Assistant', () => {
    it('loads cloned assistant data with empty name and fetches via GET', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/assistant-1/clone',
        name: 'clone-assistant',
        params: { id: 'assistant-1' },
        query: {},
        hash: '',
      }
      mockAPI(
        'GET',
        'v1/assistants/id/assistant-1',
        createAssistantFixture({
          description: 'Original description',
          system_prompt: 'Original system prompt',
        })
      )

      renderPage('/assistants/assistant-1/clone')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/id/assistant-1'),
          expect.anything()
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Clone Assistant')).toBeInTheDocument()
      })

      // Description is preserved from the original
      await waitFor(() => {
        expect(screen.getByDisplayValue('Original description')).toBeInTheDocument()
      })

      // Name is reset to empty by buildTemplate
      const nameInput = screen.getByPlaceholderText('Name*')
      expect(nameInput).toHaveValue('')
    })

    it('navigates to assistants list after cloning and saving', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/assistant-1/clone',
        name: 'clone-assistant',
        params: { id: 'assistant-1' },
        query: {},
        hash: '',
      }
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI(
        'GET',
        'v1/assistants/id/assistant-1',
        createAssistantFixture({
          description: 'Original description',
          system_prompt: 'Original system prompt',
        })
      )
      mockAPI('POST', 'v1/assistants', { id: 'cloned-id', assistantId: 'cloned-id' })

      renderPage('/assistants/assistant-1/clone')

      await waitFor(() => {
        expect(screen.getByText('Clone Assistant')).toBeInTheDocument()
      })

      // Wait for project auto-selection
      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      const nameInput = screen.getByPlaceholderText('Name*')
      await user.type(nameInput, 'Cloned Assistant')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(mockRouterState.push).toHaveBeenCalledWith({
          name: 'assistants',
          query: { tab: 'all' },
        })
      })
    })
  })

  describe('Create from Template', () => {
    it('fetches template via GET v1/assistants/prebuilt/:slug', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/from-template/helpful-bot',
        name: 'new-assistant-from-template',
        params: { slug: 'helpful-bot' },
        query: {},
        hash: '',
      }
      mockAPI(
        'GET',
        'v1/assistants/prebuilt/helpful-bot',
        createAssistantFixture({ slug: 'helpful-bot' })
      )

      renderPage('/assistants/from-template/helpful-bot')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/prebuilt/helpful-bot'),
          expect.anything()
        )
      })
    })

    it('loads template data and shows correct page title', async () => {
      mockRouterState.currentRoute.value = {
        path: '/assistants/from-template/helpful-bot',
        name: 'new-assistant-from-template',
        params: { slug: 'helpful-bot' },
        query: {},
        hash: '',
      }
      mockAPI(
        'GET',
        'v1/assistants/prebuilt/helpful-bot',
        createAssistantFixture({
          description: 'Template description',
          system_prompt: 'Template system prompt',
          slug: 'helpful-bot',
        })
      )

      renderPage('/assistants/from-template/helpful-bot')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant from Template')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Template description')).toBeInTheDocument()
      })
    })
  })

  describe('Tools Tab', () => {
    it('calls GET v1/assistants/tools on mount', async () => {
      mockAPI('GET', 'v1/assistants/tools', [createToolkitFixture()])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/tools'),
          expect.anything()
        )
      })
    })

    it('displays available toolkit names after tools are loaded', async () => {
      mockAPI('GET', 'v1/assistants/tools', [createToolkitFixture()])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getAllByText('Jira').length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('System Instructions', () => {
    it('generates system instructions with AI and saves them with the assistant', async () => {
      mockAPI('POST', 'v1/assistants/prompt/generate', {
        system_prompt: 'You are a helpful Jira project management assistant.',
      })
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-assistant-id', assistantId: 'new-assistant-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await user.type(await screen.findByPlaceholderText('Name*'), 'Jira Assistant')
      await user.type(
        await screen.findByPlaceholderText(/description/i),
        'A Jira management assistant'
      )

      // [0] = page header button, [1] = system instructions toolbar button
      const genButtons = await screen.findAllByRole('button', { name: /Generate with AI/i })
      await user.click(genButtons[1])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = getDialog()
      await user.type(
        within(dialog).getByLabelText(/Provide a description of your assistant's goals/i),
        'A Jira project management assistant'
      )
      await user.click(within(dialog).getByRole('button', { name: 'Generate with AI' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/prompt/generate'),
          expect.objectContaining({ method: 'POST' })
        )
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByPlaceholderText('System Instructions*')).toHaveValue(
          'You are a helpful Jira project management assistant.'
        )
      })

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining(
              '"system_prompt":"You are a helpful Jira project management assistant."'
            ),
          })
        )
      })
    })

    it('inserts a prompt variable into system instructions and saves it with the assistant', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-assistant-id', assistantId: 'new-assistant-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await user.type(await screen.findByPlaceholderText('Name*'), 'Variable Assistant')
      await user.type(
        await screen.findByPlaceholderText(/description/i),
        'An assistant using variables'
      )

      await user.click(screen.getByRole('button', { name: 'Current User' }))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('System Instructions*')).toHaveDisplayValue(
          /\{\{current_user\}\}/
        )
      })

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('{{current_user}}'),
          })
        )
      })
    })
  })

  describe('Image Generation', () => {
    it('enables image generation toggle and includes it in POST body on save', async () => {
      mockAPI('GET', 'v1/llm_models/image_generation', [])
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-assistant-id', assistantId: 'new-assistant-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'Image Gen Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'Generates images')
      await user.type(
        screen.getByPlaceholderText(/system instructions/i),
        'You generate images on request'
      )

      await user.click(screen.getByRole('switch', { name: 'Enable image generation' }))

      await waitFor(() => {
        expect(screen.getByText('Image generation model:')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"enable_image_generation":true'),
          })
        )
      })
    })
  })

  describe('Assistant Setup', () => {
    it('shows Shared with project switch and sends shared:true when toggled on', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')

      await user.click(screen.getByRole('switch', { name: 'Shared with project' }))

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"shared":true'),
          })
        )
      })
    })

    it('auto-generates slug from assistant name', async () => {
      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await user.type(await screen.findByPlaceholderText('Name*'), 'My Jira Bot')

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Unique human-readable identifier')).toHaveValue(
          'my-jira-bot'
        )
      })
    })

    it('adds a conversation starter and includes it in POST body', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')

      await user.click(screen.getByRole('button', { name: 'Add conversation starter' }))
      await user.type(
        screen.getByRole('textbox', { name: 'Conversation starter 2' }),
        'How can you help?'
      )

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('How can you help?'),
          })
        )
      })
    })

    it('fetches categories from GET v1/assistants/categories on mount', async () => {
      mockAPI('GET', 'v1/assistants/categories', [
        { id: 'cat-1', name: 'Productivity', description: '' },
        { id: 'cat-2', name: 'Development', description: '' },
      ])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/categories'),
          expect.anything()
        )
      })
    })

    it('renders categories MultiSelect placeholder after categories load', async () => {
      mockAPI('GET', 'v1/assistants/categories', [
        { id: 'cat-1', name: 'Productivity', description: '' },
      ])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getAllByLabelText('Categories').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows validation error for invalid logo URL on blur', async () => {
      renderPage('/assistants/new')
      mockAPI('GET', 'v1/user', userWithProject)

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      const logoInput = await screen.findByPlaceholderText('https://example.com/logo.jpg')
      await user.type(logoInput, 'not-a-valid-url')
      await user.click(screen.getByPlaceholderText('Name*'))

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument()
      })
    })

    it('includes temperature and top_p in POST body from Extra Configuration', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')

      await user.type(screen.getByPlaceholderText('0-2'), '0.7')
      await user.type(screen.getByPlaceholderText('0-1'), '0.9')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"temperature":0.7'),
          })
        )
      })
    })

    it('shows validation errors for temperature out of range', async () => {
      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Extra configuration/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /Extra configuration/i }))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('0-2')).toBeInTheDocument()
      })
      await user.type(screen.getByPlaceholderText('0-2'), '5')
      await user.click(screen.getByPlaceholderText('Name*'))

      await waitFor(() => {
        expect(screen.getByText('Temperature must be at most 2')).toBeInTheDocument()
      })
    })
  })

  describe('Context & Data Sources', () => {
    it('calls GET v1/assistants/context when project is selected', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('GET', 'v1/assistants/context', [
        { id: 'ctx-1', name: 'my-repo', context_type: 'code' },
      ])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants/context'),
          expect.anything()
        )
      })
    })

    it('renders Datasource Context selector with correct placeholder', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('GET', 'v1/assistants/context', [])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getAllByLabelText('Select Datasource Context').length).toBeGreaterThanOrEqual(
          1
        )
      })
    })

    it('renders Sub-Assistants selector and calls GET v1/assistants for options', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('GET', 'v1/assistants', {
        data: [],
        total: 0,
        page: 0,
        per_page: 12,
      })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      expect(screen.getAllByLabelText('Select Sub-Assistants').length).toBeGreaterThanOrEqual(1)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.anything()
        )
      })
    })

    it('includes context array in POST body when assistant is saved', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"context"'),
          })
        )
      })
    })
  })

  describe('Skills', () => {
    it('does not show Skills accordion when skills feature flag is disabled', async () => {
      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      expect(
        screen.queryByText('Add specialized knowledge and expertise to your assistant.')
      ).not.toBeInTheDocument()
    })

    it('shows Skills accordion when skills feature flag is enabled via v1/config', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'skills', settings: { enabled: true } }])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(
          screen.getByText('Add specialized knowledge and expertise to your assistant.')
        ).toBeInTheDocument()
      })
    })

    it('calls GET v1/skills when project is selected and skills flag is enabled', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('GET', 'v1/config', [{ id: 'skills', settings: { enabled: true } }])
      mockAPI('GET', 'v1/skills', [
        { id: 'skill-1', name: 'Code Reviewer', description: 'Reviews code' },
      ])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/skills'),
          expect.anything()
        )
      })
    })

    it('includes skill_ids in POST body when assistant is saved', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('GET', 'v1/config', [{ id: 'skills', settings: { enabled: true } }])
      mockAPI('GET', 'v1/skills', [])
      mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"skill_ids"'),
          })
        )
      })
    })

    it('shows Skills selector placeholder after skills are loaded', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('GET', 'v1/config', [{ id: 'skills', settings: { enabled: true } }])
      mockAPI('GET', 'v1/skills', [
        { id: 'skill-1', name: 'Code Reviewer', description: 'Reviews code' },
      ])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Skills/ })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /Skills/ }))

      await waitFor(() => {
        expect(screen.getAllByLabelText('Select skills').length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('Tools Configuration', () => {
    it('calls GET v1/settings/user/available on mount', async () => {
      mockAPI('GET', 'v1/settings/user/available', [])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/settings/user/available'),
          expect.anything()
        )
      })
    })

    it('renders available toolkit names after loading from v1/assistants/tools', async () => {
      mockAPI('GET', 'v1/assistants/tools', [createToolkitFixture()])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getAllByText('Jira').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('includes toolkits in POST body when assistant is saved', async () => {
      mockAPI('GET', 'v1/user', userWithProject)
      mockAPI('POST', 'v1/assistants', { id: 'new-id', assistantId: 'new-id' })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('test-project')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Name*'), 'My Assistant')
      await user.type(screen.getByPlaceholderText(/description/i), 'A useful assistant')
      await user.type(screen.getByPlaceholderText(/system instructions/i), 'You are helpful')

      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/assistants'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"toolkits"'),
          })
        )
      })
    })

    it('does not render MCP Servers section when mcpConnect feature flag is disabled', async () => {
      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('Create Assistant')).toBeInTheDocument()
      })

      expect(screen.queryByText('No MCP Servers Installed')).not.toBeInTheDocument()
    })

    it('renders MCP Servers section with empty state when mcpConnect flag is enabled', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'mcpConnect', settings: { enabled: true } }])

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByText('No MCP Servers Installed')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Browse Catalog' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Manual Setup' })).toBeInTheDocument()
    })

    it('opens MCP Catalog modal and calls GET v1/mcp-configs when Browse Catalog is clicked', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'mcpConnect', settings: { enabled: true } }])
      mockAPI('GET', 'v1/mcp-configs', {
        configs: [
          {
            id: 'mcp-1',
            name: 'GitHub MCP',
            description: 'Access GitHub repositories',
            categories: ['Development'],
            is_active: true,
            is_public: true,
            required_env_vars: [],
            config: { command: 'npx', args: [] },
            logo_url: '',
          },
        ],
        total: 1,
        page: 0,
        per_page: 20,
      })

      renderPage('/assistants/new')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Browse Catalog' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Browse Catalog' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      expect(within(screen.getByRole('dialog')).getByText('Browse MCP Servers')).toBeInTheDocument()

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/mcp-configs'),
          expect.anything()
        )
      })
    })

    it('opens MCP manual setup wizard at Step 1 when Manual Setup is clicked', async () => {
      mockAPI('GET', 'v1/config', [{ id: 'mcpConnect', settings: { enabled: true } }])

      renderPage('/assistants/new')

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'Manual Setup' })).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      await user.click(screen.getByRole('button', { name: 'Manual Setup' }))

      await waitFor(
        () => {
          expect(screen.getByRole('dialog')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      expect(
        within(screen.getByRole('dialog')).getByText('Step 1: Configure MCP Server')
      ).toBeInTheDocument()
    })
  })
})
