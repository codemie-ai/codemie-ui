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

import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

const { mockChatsStore, mockAppInfoStore, mockProjectsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    filteredModels: [] as ModelOption[],
    updateChat: vi.fn(),
    getModelsForCurrentChat: vi.fn(),
  },
  mockAppInfoStore: {
    llmModels: [] as ModelOption[],
    llmRouters: [] as ModelOption[],
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

const MODELS: ModelOption[] = [
  { label: 'Old Default', value: 'old-default', isDefault: true },
  { label: 'New Default', value: 'new-default', isDefault: false },
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

describe('ChatPromptLlmSelector — live project default', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.llmModels = []
    mockAppInfoStore.llmRouters = []
    mockChatsStore.filteredModels = MODELS
    mockChatsStore.getModelsForCurrentChat.mockResolvedValue(MODELS)
    mockProjectsStore.getProject.mockResolvedValue({ default_model: 'new-default' })
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(cleanup)

  it('shows the live project default once fetched, even though modelsToDisplay still flags the old one', async () => {
    mockChatsStore.currentChat = chat(null)

    render(<ChatPromptLlmSelector />)

    // No explicit chat model is set, so the trigger keeps its literal "Default"
    // label regardless of which model is the live default underneath it.
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument()

    await waitFor(() => {
      const recommendedRow = document.getElementById('chat-llm-selector-option-recommended')
      expect(recommendedRow).toHaveTextContent('New Default')
    })

    // The old default is no longer deduped into the recommended row, so it now
    // renders as its own plain option.
    expect(screen.getByRole('option', { name: /^Old Default$/ })).toBeInTheDocument()
  })

  it('keeps showing an explicitly selected model after the project default changes (AC4)', async () => {
    mockChatsStore.currentChat = chat('old-default')

    render(<ChatPromptLlmSelector />)

    await waitFor(() => {
      expect(mockProjectsStore.getProject).toHaveBeenCalled()
    })

    const trigger = screen.getByRole('button', { name: 'Old Default' })
    expect(trigger).toBeInTheDocument()

    const selectedOption = screen.getByRole('option', { name: /Old Default/ })
    const check = selectedOption.querySelector('[data-testid="llm-option-check"]')
    expect(check?.className).not.toContain('invisible')
  })
})
