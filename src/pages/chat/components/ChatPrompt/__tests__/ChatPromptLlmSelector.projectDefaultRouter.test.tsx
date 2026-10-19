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

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LLMRouterOption, ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

const { mockChatsStore, mockAppInfoStore, mockProjectsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    filteredModels: [] as ModelOption[],
    filteredRouters: [] as LLMRouterOption[],
    filteredModelsProjectId: null as string | null,
    updateChat: vi.fn(),
    getModelsForCurrentChat: vi.fn(),
  },
  mockAppInfoStore: {
    llmModels: [] as ModelOption[],
    llmRouters: [] as LLMRouterOption[],
    getLLMModels: vi.fn(),
  },
  mockProjectsStore: {
    getProject: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockChatsStore) return mockChatsStore
    if (store === mockAppInfoStore) return mockAppInfoStore
    if (store === mockProjectsStore) return mockProjectsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/projects', () => ({ projectsStore: mockProjectsStore }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), success: vi.fn() } }))

vi.mock('primereact/overlaypanel', () => ({
  OverlayPanel: React.forwardRef<any, any>(({ children, onShow }, ref) => {
    React.useImperativeHandle(ref, () => ({
      toggle: () => onShow?.(),
      show: () => onShow?.(),
      hide: vi.fn(),
    }))
    return <div data-testid="overlay-panel">{children}</div>
  }),
}))

// Not marked isDefault — defaultRouter (the globally-default router) must stay
// null so this scenario exercises the project-default-is-a-router path, not
// the pre-existing "a router wins globally" guard.
const ROUTER: LLMRouterOption = {
  value: 'smart-router',
  label: 'Smart Router',
  isPremium: false,
  tiers: {
    simple: { model: 'gpt-4', label: 'GPT-4' },
    medium: { model: 'gpt-4', label: 'GPT-4' },
    complex: { model: 'gpt-4', label: 'GPT-4' },
    reasoning: { model: 'gpt-4', label: 'GPT-4' },
  },
}

const MODELS: ModelOption[] = [
  { label: 'GPT-4', value: 'gpt-4', isDefault: true },
  { label: 'Claude-2', value: 'claude-2', isDefault: false },
]

const chat = (llmModel: string | null): Conversation =>
  ({
    id: 'chat-1',
    name: 'Chat',
    llmModel,
    project: 'proj',
    projectId: 'proj',
    isGroup: false,
    assistantData: [],
  } as unknown as Conversation)

describe('ChatPromptLlmSelector — project default stored as a router (CR-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjectsStore.getProject.mockReset()
    mockAppInfoStore.llmModels = []
    mockAppInfoStore.llmRouters = [ROUTER]
    mockChatsStore.filteredModels = MODELS
    mockChatsStore.filteredRouters = [ROUTER]
    mockChatsStore.filteredModelsProjectId = 'proj'
    mockChatsStore.getModelsForCurrentChat.mockResolvedValue(MODELS)
    mockProjectsStore.getProject.mockResolvedValue({ default_model: 'smart-router' })
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(cleanup)

  it('resolves the router live as the recommended default instead of falling back', async () => {
    mockChatsStore.currentChat = chat(null)

    render(<ChatPromptLlmSelector />)

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      expect(recommendedRow).toHaveTextContent('Smart Router')
    })

    // Not the generic isDefault model fallback.
    expect(screen.queryByRole('option', { name: /^GPT-4$/ })).toBeInTheDocument()
    const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
    expect(recommendedRow).not.toHaveTextContent('GPT-4')
  })

  it('does not also render the router as a duplicate plain row', async () => {
    mockChatsStore.currentChat = chat(null)

    render(<ChatPromptLlmSelector />)

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      expect(recommendedRow).toHaveTextContent('Smart Router')
    })

    expect(document.getElementById('chat-llm-selector-router-option-smart-router')).toBeNull()
  })

  it('still lets the global router-default guard win when a router is marked isDefault', async () => {
    mockAppInfoStore.llmRouters = [{ ...ROUTER, isDefault: true, value: 'global-router' }]
    mockChatsStore.filteredRouters = mockAppInfoStore.llmRouters
    mockProjectsStore.getProject.mockResolvedValue({ default_model: 'smart-router' })
    mockChatsStore.currentChat = chat(null)

    render(<ChatPromptLlmSelector />)

    await waitFor(() => {
      expect(mockProjectsStore.getProject).toHaveBeenCalled()
    })

    // defaultRouter guard still returns null for defaultModel first — no recommended row at all.
    expect(document.getElementById('chat-llm-selector-option-recommended')).toBeNull()
    expect(screen.getByRole('option', { name: /Smart Router Recommended/ })).toBeInTheDocument()
  })
})
