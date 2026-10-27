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

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrimeReactProvider } from 'primereact/api'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'
import { mockAPI } from '@/test-utils/integration'

import ChatPromptLlmSelector from '../../ChatPrompt/ChatPromptLlmSelector'
import ChatConfigLlmSelector from '../ChatConfigLlmSelector'

const globalCatalog = [
  { base_name: 'gpt-4o', deployment_name: 'gpt-4o', label: 'GPT-4o', default: true },
  {
    base_name: 'gpt-4.1-mini',
    deployment_name: 'gpt-4.1-mini-2025-04-14',
    label: 'GPT-4.1 Mini',
  },
  { base_name: 'alpha-only', deployment_name: 'alpha-only', label: 'Alpha Only' },
  { base_name: 'beta-only', deployment_name: 'beta-only', label: 'Beta Only' },
]

const project = (name: string, allowed_models: string[]) => ({
  name,
  allowed_models,
  default_model: null,
})

function renderChatSelectors() {
  return render(
    <PrimeReactProvider value={{ cssTransition: false }}>
      <ChatConfigLlmSelector />
      <ChatPromptLlmSelector />
    </PrimeReactProvider>
  )
}

function openConfiguration() {
  const combobox = screen.getByRole('combobox', { name: 'LLM Model' })
  fireEvent.click(combobox.closest('.p-multiselect')!)
  return combobox
}

// Both pickers render Recommended / Premium / Router in a separate meta line inside the row;
// compare model names only so the parity check survives row-markup changes.
function optionNames() {
  return screen.getAllByRole('option').map((option) => {
    const row = option.cloneNode(true) as HTMLElement
    row.querySelectorAll('[data-testid="llm-option-meta"]').forEach((meta) => meta.remove())
    return row.textContent?.trim()
  })
}

describe('ChatConfigLlmSelector model availability', () => {
  let previousOffsetParent: PropertyDescriptor | undefined

  beforeEach(() => {
    previousOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return this.parentElement
      },
    })
    appInfoStore.configs = [{ id: 'idpProvider', settings: { value: 'local' } }]
    appInfoStore.llmModels = []
    appInfoStore.llmRouters = []
    appInfoStore.projectLlmModels = {}
    chatsStore.clearCurrentChat()
    chatsStore.filteredModels = []
    chatsStore.filteredRouters = []
    chatsStore.filteredModelsProjectId = null
    chatsStore.chats = []
    chatsStore.isNewChat = false
  })

  afterEach(() => {
    cleanup()
    if (previousOffsetParent) {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', previousOffsetParent)
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'offsetParent')
    }
  })

  it.each([
    ['empty', []],
    [
      'stale alpha-scoped',
      [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'alpha-only', label: 'Alpha Only' },
      ],
    ],
  ])(
    'shows the full project-less catalog with %s cached filtered options',
    async (_label, filteredModels) => {
      mockAPI('GET', 'v1/llm_models', globalCatalog)
      await appInfoStore.getLLMModels()
      chatsStore.currentChat = {
        id: '',
        llmModel: null,
        project: null,
        projectId: undefined,
        assistantIds: [],
        assistantData: [],
        history: [],
      }
      chatsStore.filteredModels = filteredModels
      chatsStore.isNewChat = true

      renderChatSelectors()
      const configuration = openConfiguration()

      expect(screen.getByRole('option', { name: 'Beta Only' })).toBeInTheDocument()
      expect(screen.getAllByRole('option', { name: 'GPT-4.1 Mini' })).toHaveLength(1)
      const configurationOptions = optionNames()

      fireEvent.keyDown(configuration, { key: 'Escape' })
      fireEvent.click(screen.getByRole('button', { name: 'Default' }))
      expect(screen.getByRole('option', { name: 'Beta Only' })).toBeInTheDocument()
      expect(screen.getAllByRole('option', { name: 'GPT-4.1 Mini' })).toHaveLength(1)
      expect(optionNames()).toEqual(expect.arrayContaining(configurationOptions))
    }
  )

  it('reveals beta membership models after an alpha chat transitions to New Chat', async () => {
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    await appInfoStore.getLLMModels()
    chatsStore.currentChat = {
      id: 'alpha-chat',
      llmModel: null,
      project: 'demo-15915-alpha',
      projectId: 'demo-15915-alpha',
      assistantIds: [],
      assistantData: [],
      history: [],
    }
    chatsStore.filteredModels = [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'alpha-only', label: 'Alpha Only' },
    ]
    chatsStore.filteredModelsProjectId = 'demo-15915-alpha'
    renderChatSelectors()
    const configuration = openConfiguration()
    expect(screen.getByRole('option', { name: 'Alpha Only' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Beta Only' })).not.toBeInTheDocument()
    fireEvent.keyDown(configuration, { key: 'Escape' })

    act(() => {
      chatsStore.currentChat = {
        id: '',
        llmModel: null,
        project: null,
        projectId: undefined,
        assistantIds: [],
        assistantData: [],
        history: [],
      }
      chatsStore.isNewChat = true
    })
    cleanup()
    renderChatSelectors()
    const newChatConfiguration = openConfiguration()
    const configurationModels = optionNames().filter((label) => label !== 'Default')

    expect(screen.getByRole('option', { name: 'Beta Only' })).toBeInTheDocument()
    fireEvent.keyDown(newChatConfiguration, { key: 'Escape' })
    const promptTrigger = screen.getByRole('button', { name: 'Default' })
    fireEvent.click(promptTrigger)
    const promptModels = optionNames().filter((label) => label !== 'Default')

    expect(new Set(configurationModels)).toEqual(new Set(promptModels))
    expect(promptModels).toContain('Alpha Only')
    expect(promptModels).toContain('Beta Only')
    expect(promptModels.filter((label) => label === 'GPT-4.1 Mini')).toHaveLength(1)
  })

  it('keeps a project value visible while scoped models are loading and when resolved empty', async () => {
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    await appInfoStore.getLLMModels()
    chatsStore.currentChat = {
      id: 'beta-chat',
      llmModel: 'gpt-4o',
      project: 'demo-15915-beta',
      projectId: 'demo-15915-beta',
      assistantIds: [],
      assistantData: [],
      history: [],
    }
    chatsStore.filteredModels = []

    renderChatSelectors()
    openConfiguration()
    expect(screen.queryByRole('option', { name: 'GPT-4o' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Beta Only' })).not.toBeInTheDocument()

    mockAPI('GET', 'v1/llm_models', [], { project_id: 'demo-15915-beta' })
    await appInfoStore.getProjectLLMModels('demo-15915-beta')
    // No catalog data is available for this project (chatsStore's own Set-filtered fetch
    // resolved empty, and there is no second pipeline left to borrow a friendly label from —
    // see docs/superpowers/plans/2026-10-22-epmcdme-15676-single-model-pipeline.md). The
    // invariant this test guards is that the chat's own llmModel is preserved, not reset to
    // the default, while the project's list is still empty; the combobox shows the raw stored
    // value since no option matches it to resolve a label from.
    expect(chatsStore.currentChat?.llmModel).toBe('gpt-4o')
    expect(screen.getByRole('combobox', { name: 'LLM Model' })).toHaveValue('gpt-4o')
    fireEvent.click(screen.getByRole('combobox', { name: 'LLM Model' }).closest('.p-multiselect')!)
    expect(screen.queryByRole('option', { name: 'GPT-4o' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Beta Only' })).not.toBeInTheDocument()
  })

  it('keeps a project value visible when the scoped fetch resolves genuinely empty (gate satisfied)', async () => {
    // Distinct from the test above: here filteredModelsProjectId matches the chat's project,
    // so hasCurrentProjectModels is TRUE — the project's own fetch succeeded and simply found
    // no allowed models, rather than the gate being stale/false. mergedFilteredModels takes the
    // other branch of its ternary but must land on the same outcome: LLMSelector's models.length
    // guard skips the invalid-value reset either way, so the chat's own llmModel is still
    // preserved, not cleared.
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    await appInfoStore.getLLMModels()
    chatsStore.currentChat = {
      id: 'beta-chat',
      llmModel: 'gpt-4o',
      project: 'demo-15915-beta',
      projectId: 'demo-15915-beta',
      assistantIds: [],
      assistantData: [],
      history: [],
    }
    chatsStore.filteredModels = []
    chatsStore.filteredRouters = []
    chatsStore.filteredModelsProjectId = 'demo-15915-beta'

    renderChatSelectors()
    openConfiguration()
    expect(chatsStore.currentChat?.llmModel).toBe('gpt-4o')
    expect(screen.getByRole('combobox', { name: 'LLM Model' })).toHaveValue('gpt-4o')
    expect(screen.queryByRole('option', { name: 'GPT-4o' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Beta Only' })).not.toBeInTheDocument()
  })

  it('keeps project chats restricted to the scoped model response when loaded', async () => {
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    await appInfoStore.getLLMModels()
    chatsStore.currentChat = {
      id: 'beta-chat',
      llmModel: null,
      project: 'demo-15915-beta',
      projectId: 'demo-15915-beta',
      assistantIds: [],
      assistantData: [],
      history: [],
    }
    mockAPI('GET', 'v1/llm_models', [globalCatalog[3]], { project_id: 'demo-15915-beta' })
    await appInfoStore.getProjectLLMModels('demo-15915-beta')
    mockAPI('GET', 'v1/projects/demo-15915-beta', project('demo-15915-beta', ['beta-only']))
    // Exercise the Set-filter pipeline directly (the one chatsStore.getModelsForCurrentChat
    // actually populates) rather than only the backend pipeline's already-mapped data —
    // filteredModelsProjectId must match for the gate (hasCurrentProjectModels) to pass.
    chatsStore.filteredModels = appInfoStore.projectLlmModels['demo-15915-beta']
    chatsStore.filteredModelsProjectId = 'demo-15915-beta'

    renderChatSelectors()
    openConfiguration()
    expect(screen.getByRole('option', { name: 'Beta Only' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'GPT-4o' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Alpha Only' })).not.toBeInTheDocument()
  })

  it('keeps a selected project-less model across reopen, prompt control, and saved-chat reload', async () => {
    const user = userEvent.setup()
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    await appInfoStore.getLLMModels()
    chatsStore.currentChat = {
      id: 'saved-chat',
      llmModel: null,
      project: null,
      assistantIds: [],
      assistantData: [],
      history: [],
    }

    renderChatSelectors()
    const configuration = openConfiguration()
    await user.click(screen.getByRole('option', { name: 'Beta Only' }))
    await waitFor(() => expect(chatsStore.currentChat?.llmModel).toBe('beta-only'))
    fireEvent.click(configuration.closest('.p-multiselect')!)
    expect(screen.getByRole('option', { name: 'Beta Only', selected: true })).toBeInTheDocument()
    fireEvent.keyDown(configuration, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Beta Only' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Beta Only' }))
    await user.click(screen.getByRole('option', { name: 'Alpha Only' }))
    expect(chatsStore.currentChat?.llmModel).toBe('alpha-only')

    const savedChat = {
      id: 'saved-chat',
      conversation_name: 'saved-chat',
      llm_model: 'beta-only',
      project: null,
      history: [],
      assistant_ids: [],
      assistant_data: [],
      is_workflow_conversation: false,
    }
    mockAPI('GET', 'v1/conversations/saved-chat', savedChat)
    await chatsStore.getChat('saved-chat')
    expect(chatsStore.currentChat?.llmModel).toBe('beta-only')

    openConfiguration()
    expect(screen.getByRole('option', { name: 'Beta Only', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alpha Only', selected: false })).toBeInTheDocument()
  })

  it('includes a router in the Configuration panel and makes it selectable', async () => {
    const user = userEvent.setup()
    // ChatPromptLlmSelector (rendered alongside) refetches chatsStore.getModelsForCurrentChat
    // on mount for a project chat, which would otherwise race and overwrite a hand-set
    // filteredRouters fixture. Driving the router through the real catalog + project
    // allow-list response keeps that refetch consistent instead of fighting it.
    const routerCatalog = [
      ...globalCatalog,
      { base_name: 'router-beta', label: 'Router Beta', is_router: true },
    ]
    mockAPI('GET', 'v1/llm_models', routerCatalog)
    await appInfoStore.getLLMModels()
    mockAPI(
      'GET',
      'v1/projects/demo-router-project',
      project('demo-router-project', ['gpt-4o', 'router-beta'])
    )
    chatsStore.currentChat = {
      id: 'router-chat',
      llmModel: null,
      project: 'demo-router-project',
      projectId: 'demo-router-project',
      assistantIds: [],
      assistantData: [],
      history: [],
    }
    await chatsStore.getModelsForCurrentChat()

    renderChatSelectors()
    openConfiguration()

    expect(screen.getByRole('option', { name: /^Router Beta/ })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /^Router Beta/ }))
    await waitFor(() => expect(chatsStore.currentChat?.llmModel).toBe('router-beta'))
  })

  it('shows multiple routers at once in the Configuration panel', () => {
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    chatsStore.currentChat = {
      id: 'multi-router-chat',
      llmModel: null,
      project: 'demo-router-project',
      projectId: 'demo-router-project',
      assistantIds: [],
      assistantData: [],
      history: [],
    }
    chatsStore.filteredModels = [{ value: 'gpt-4o', label: 'GPT-4o' }]
    chatsStore.filteredRouters = [
      { value: 'router-beta', label: 'Router Beta', isDefault: false, tiers: {} as any },
      { value: 'router-gamma', label: 'Router Gamma', isDefault: false, tiers: {} as any },
    ]
    chatsStore.filteredModelsProjectId = 'demo-router-project'

    renderChatSelectors()
    openConfiguration()

    expect(screen.getByRole('option', { name: /^Router Beta/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^Router Gamma/ })).toBeInTheDocument()
  })

  it('renders a premium router with its premium marker in the Configuration panel', () => {
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    chatsStore.currentChat = {
      id: 'premium-router-chat',
      llmModel: null,
      project: 'demo-router-project',
      projectId: 'demo-router-project',
      assistantIds: [],
      assistantData: [],
      history: [],
    }
    chatsStore.filteredModels = [{ value: 'gpt-4o', label: 'GPT-4o' }]
    chatsStore.filteredRouters = [
      {
        value: 'router-premium',
        label: 'Router Premium',
        isDefault: false,
        isPremium: true,
        tiers: {} as any,
      },
    ]
    chatsStore.filteredModelsProjectId = 'demo-router-project'

    renderChatSelectors()
    openConfiguration()

    const option = screen.getByRole('option', { name: /^Router Premium/ })
    expect(option).toBeInTheDocument()
    expect(option.textContent).toContain('Premium')
  })

  it('hides the previous project models and routers while the new project list is still loading', () => {
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    chatsStore.filteredModels = [{ value: 'old-model', label: 'Old Model' }]
    chatsStore.filteredRouters = [
      { value: 'old-router', label: 'Old Router', isDefault: false, tiers: {} as any },
    ]
    chatsStore.filteredModelsProjectId = 'previous-project'
    chatsStore.currentChat = {
      id: 'switching-chat',
      llmModel: null,
      project: 'next-project',
      projectId: 'next-project',
      assistantIds: [],
      assistantData: [],
      history: [],
    }

    renderChatSelectors()
    openConfiguration()

    expect(screen.queryByRole('option', { name: 'Old Model' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^Old Router/ })).not.toBeInTheDocument()
  })

  it('still shows routers for a project-less chat via the global list', async () => {
    mockAPI('GET', 'v1/llm_models', globalCatalog)
    await appInfoStore.getLLMModels()
    // getLLMModels() derives llmRouters from the (router-less) mocked response; set the
    // global router afterwards so it isn't immediately overwritten.
    appInfoStore.llmRouters = [
      { value: 'global-router', label: 'Global Router', isDefault: false, tiers: {} as any },
    ]
    chatsStore.currentChat = {
      id: 'global-chat',
      llmModel: null,
      project: null,
      projectId: undefined,
      assistantIds: [],
      assistantData: [],
      history: [],
    }
    chatsStore.isNewChat = true

    renderChatSelectors()
    openConfiguration()

    expect(screen.getByRole('option', { name: /^Global Router/ })).toBeInTheDocument()
  })
})
