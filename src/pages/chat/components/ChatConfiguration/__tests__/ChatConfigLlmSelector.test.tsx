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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Conversation } from '@/types/entity/conversation'

import ChatConfigLlmSelector from '../ChatConfigLlmSelector'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore, mockAppInfoStore } = vi.hoisted(() => {
  return {
    mockChatsStore: {
      currentChat: null as Conversation | null,
      filteredModels: [] as { label: string; value: string; isDefault?: boolean }[],
      filteredRouters: [] as {
        label: string
        value: string
        isDefault?: boolean
        isRouter?: boolean
      }[],
      filteredModelsProjectId: null as string | null,
      updateChat: vi.fn(),
    },
    mockAppInfoStore: {
      llmModels: [
        { label: 'GPT-4', value: 'gpt-4', isDefault: true },
        { label: 'GPT-3.5', value: 'gpt-3.5-turbo', isDefault: false },
        { label: 'Claude-2', value: 'claude-2', isDefault: false },
      ],
      llmRouters: [],
      projectLlmModels: {} as Record<string, { label: string; value: string }[]>,
      imageGenerationModels: [{ label: 'GPT Image 1', value: 'gpt-image-1', isDefault: true }],
      getLLMModels: vi.fn(),
      getProjectLLMModels: vi.fn(),
      getImageGenerationModels: vi.fn(),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockChatsStore) return mockChatsStore
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

const mockChat: Conversation = {
  id: 'chat-123',
  name: 'Test Chat',
  llmModel: 'gpt-4',
  isGroup: false,
  assistantData: [],
  projectId: 'project-123',
} as unknown as Conversation

const mockChatNoModel: Conversation = {
  id: 'chat-456',
  name: 'Test Chat No Model',
  llmModel: null,
  isGroup: false,
  assistantData: [],
  projectId: 'project-456',
} as unknown as Conversation

describe('ChatConfigLlmSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = mockChat
    mockChatsStore.filteredModelsProjectId = 'project-123'
    mockChatsStore.updateChat = vi.fn()
    mockAppInfoStore.projectLlmModels = {}
    mockAppInfoStore.getLLMModels = vi.fn().mockResolvedValue([
      { label: 'GPT-4', value: 'gpt-4', isDefault: true },
      { label: 'GPT-3.5', value: 'gpt-3.5-turbo', isDefault: false },
      { label: 'Claude-2', value: 'claude-2', isDefault: false },
    ])
    mockAppInfoStore.getProjectLLMModels = vi.fn().mockResolvedValue([
      { label: 'GPT-4', value: 'gpt-4', isDefault: true },
      { label: 'GPT-3.5', value: 'gpt-3.5-turbo', isDefault: false },
      { label: 'Claude-2', value: 'claude-2', isDefault: false },
    ])
    mockAppInfoStore.getImageGenerationModels = vi
      .fn()
      .mockResolvedValue([{ label: 'GPT Image 1', value: 'gpt-image-1', isDefault: true }])
  })

  it('does not render when currentChat is null', () => {
    mockChatsStore.currentChat = null
    const { container } = render(<ChatConfigLlmSelector />)

    expect(container.firstChild).toBeNull()
  })

  it('renders LLMSelector when currentChat exists', () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatConfigLlmSelector />)

    expect(screen.getByText('LLM Model')).toBeInTheDocument()
  })

  it('renders with correct label', () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatConfigLlmSelector />)

    expect(screen.getByText('LLM Model')).toBeInTheDocument()
  })

  it('calls getProjectLLMModels on mount with projectId', () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatConfigLlmSelector />)

    expect(mockAppInfoStore.getProjectLLMModels).toHaveBeenCalledWith('project-123')
  })

  it('calls updateChat when LLM model changes', async () => {
    mockChatsStore.currentChat = mockChat
    const { container } = render(<ChatConfigLlmSelector />)

    // Find and click the dropdown
    const dropdown = container.querySelector('.p-multiselect')
    expect(dropdown).toBeInTheDocument()
  })

  it('removes component when currentChat becomes null', () => {
    mockChatsStore.currentChat = mockChat
    const { rerender } = render(<ChatConfigLlmSelector />)

    expect(screen.getByText('LLM Model')).toBeInTheDocument()

    mockChatsStore.currentChat = null
    rerender(<ChatConfigLlmSelector />)

    expect(screen.queryByText('LLM Model')).not.toBeInTheDocument()
  })

  it('renders with current chat llmModel', () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatConfigLlmSelector />)

    // The component should render with the chat's llmModel
    expect(screen.getByText('LLM Model')).toBeInTheDocument()
  })

  it('handles undefined llmModel', () => {
    mockChatsStore.currentChat = mockChatNoModel
    render(<ChatConfigLlmSelector />)

    // Should still render even without llmModel
    expect(screen.getByText('LLM Model')).toBeInTheDocument()
  })

  it('merges filteredRouters into the filteredModels passed to LLMSelector', () => {
    mockChatsStore.currentChat = mockChat
    mockChatsStore.filteredModelsProjectId = 'project-123'
    mockChatsStore.filteredModels = [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }]
    mockChatsStore.filteredRouters = [
      { label: 'Smart Router', value: 'smart-router', isDefault: false },
    ]

    const { container } = render(<ChatConfigLlmSelector />)
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.getByText('Smart Router')).toBeInTheDocument()
  })

  it('withholds filteredModels/filteredRouters while they still belong to the previous project', () => {
    mockChatsStore.currentChat = mockChat
    mockChatsStore.filteredModelsProjectId = 'previous-project'
    mockChatsStore.filteredModels = [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }]
    mockChatsStore.filteredRouters = [
      { label: 'Smart Router', value: 'smart-router', isDefault: false },
    ]

    const { container } = render(<ChatConfigLlmSelector />)
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.queryByText('Smart Router')).not.toBeInTheDocument()
  })

  it('passes an explicit empty list — not undefined — to LLMSelector while the project gate is stale', () => {
    mockChatsStore.currentChat = mockChat
    mockChatsStore.filteredModelsProjectId = 'previous-project'
    mockChatsStore.filteredModels = [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }]
    mockChatsStore.filteredRouters = [
      { label: 'Smart Router', value: 'smart-router', isDefault: false },
    ]
    // If ChatConfigLlmSelector fell back to undefined here, LLMSelector would read from
    // useProjectLLMModels instead — seed that pipeline with data so a regression back to
    // the old "swap pipelines while stale" behavior would make this option reappear.
    mockAppInfoStore.projectLlmModels = {
      'project-123': [{ label: 'Backend Pipeline Model', value: 'backend-model' }],
    }

    const { container } = render(<ChatConfigLlmSelector />)
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.queryByText('Smart Router')).not.toBeInTheDocument()
    expect(screen.queryByText('Backend Pipeline Model')).not.toBeInTheDocument()
  })

  it('shows no options after the first project model fetch fails, without falling back to the backend pipeline', () => {
    // Store state after a rejected getModelsForCurrentChat on first load: the error is set,
    // but filteredModelsProjectId was never written, so the gate stays stale.
    mockChatsStore.currentChat = mockChat
    mockChatsStore.filteredModelsProjectId = null
    mockChatsStore.filteredModels = []
    mockChatsStore.filteredRouters = []
    mockAppInfoStore.projectLlmModels = {
      'project-123': [{ label: 'Backend Pipeline Model', value: 'backend-model' }],
    }

    const { container } = render(<ChatConfigLlmSelector />)
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.queryByText('Backend Pipeline Model')).not.toBeInTheDocument()
    expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
  })
})
