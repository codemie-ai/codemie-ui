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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Assistant } from '@/types/entity/assistant'
import { Conversation } from '@/types/entity/conversation'

import ChatConfiguration from '../ChatConfiguration'

vi.hoisted(() => vi.resetModules())

const {
  mockChatContext,
  mockChatsStore,
  mockAssistantsStore,
  mockAppInfoStore,
  mockUserStore,
  mockCanEdit,
} = vi.hoisted(() => {
  return {
    mockChatContext: {
      isConfigVisible: false,
      isConfigFormVisible: false,
      selectedAssistant: null as Assistant | null,
      isLoading: false,
      selectedSkills: [],
      setSelectedSkills: vi.fn(),
      closeConfigForm: vi.fn(),
      openConfigForm: vi.fn(),
    },
    mockChatsStore: {
      currentChat: null as Conversation | null,
      updateChat: vi.fn(),
    },
    mockAssistantsStore: {
      getAssistant: vi.fn(),
      updateAssistant: vi.fn(),
      assistantCategories: [],
    },
    mockAppInfoStore: {
      llmModels: [
        { label: 'GPT-4', value: 'gpt-4', isDefault: true },
        { label: 'GPT-3.5', value: 'gpt-3.5-turbo', isDefault: false },
      ],
      getLLMModels: vi.fn(),
    },
    mockUserStore: {
      user: {
        userId: 'user-123',
        id: 'user-123',
        name: 'Test User',
      },
    },
    mockCanEdit: vi.fn(),
  }
})

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => mockChatContext),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockChatsStore) return mockChatsStore
    if (store === mockAssistantsStore) return mockAssistantsStore
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/store', () => ({
  assistantsStore: mockAssistantsStore,
  userStore: mockUserStore,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/utils/entity', () => ({
  canEdit: mockCanEdit,
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false, true]),
}))

vi.mock('@/pages/assistants/components/AssistantForm/AssistantForm', () => ({
  default: ({ assistant }: any) => (
    <div data-testid="assistant-form">
      <div data-testid="form-assistant-name">{assistant?.name}</div>
    </div>
  ),
}))

const mockShowNewIntegrationPopup = vi.fn()

const mockChat: Conversation = {
  id: 'chat-123',
  name: 'Test Chat',
  llmModel: 'gpt-4',
  isGroup: false,
  assistantData: [],
} as unknown as Conversation

const mockAssistant: Assistant = {
  id: 'assistant-123',
  name: 'Test Assistant',
  description: 'Test Description',
  icon_url: 'http://example.com/icon.png',
  system_prompt: 'You are a helpful assistant',
  model: 'gpt-4',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
} as Assistant

describe('ChatConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatContext.isConfigVisible = false
    mockChatContext.isConfigFormVisible = false
    mockChatContext.selectedAssistant = null
    mockChatContext.isLoading = false
    mockChatsStore.currentChat = mockChat
    mockAssistantsStore.getAssistant = vi.fn()
    mockCanEdit.mockReturnValue(true)
  })

  it('renders sidebar with collapsed state initially', () => {
    mockChatContext.isConfigVisible = false
    const { container } = render(
      <ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />
    )

    const aside = container.querySelector('aside')
    expect(aside).toHaveClass('w-0')
    expect(screen.queryByText('General')).not.toBeInTheDocument()
  })

  it('expands sidebar and shows general settings when config is visible', () => {
    mockChatContext.isConfigVisible = true
    const { container } = render(
      <ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />
    )

    const aside = container.querySelector('aside')
    expect(aside).toHaveClass('w-96')
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('LLM Model')).toBeInTheDocument()
  })

  it('switches from general view to assistant form with loading state', async () => {
    mockChatContext.isConfigVisible = true
    mockChatContext.isConfigFormVisible = false
    const { rerender } = render(
      <ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />
    )

    expect(screen.getByText('General')).toBeInTheDocument()

    // Simulate opening assistant config form in loading state
    mockChatContext.isConfigFormVisible = true
    mockChatContext.isLoading = true
    mockChatContext.selectedAssistant = null
    rerender(<ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(screen.queryByText('General')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('switches from general view to assistant form with loaded assistant', async () => {
    mockChatContext.isConfigVisible = true
    mockChatContext.isConfigFormVisible = false
    const { rerender } = render(
      <ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />
    )

    expect(screen.getByText('General')).toBeInTheDocument()

    // Simulate opening assistant config form with loaded assistant
    mockChatContext.isConfigFormVisible = true
    mockChatContext.isLoading = false
    mockChatContext.selectedAssistant = mockAssistant
    rerender(<ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(screen.queryByText('General')).not.toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument()
    expect(screen.getByTestId('assistant-form')).toBeInTheDocument()
    expect(screen.getByTestId('form-assistant-name')).toHaveTextContent('Test Assistant')
  })

  it('shows assistant list when chat has connected assistants', () => {
    mockChatContext.isConfigVisible = true
    mockChatsStore.currentChat = {
      ...mockChat,
      assistantData: [{ id: 'assistant-1' }],
    } as Conversation

    const mockConnectedAssistant = {
      id: 'assistant-1',
      name: 'Test Assistant',
    }
    mockAssistantsStore.getAssistant.mockResolvedValue(mockConnectedAssistant)

    render(<ChatConfiguration showNewIntegrationPopup={mockShowNewIntegrationPopup} />)

    expect(screen.getByText('General')).toBeInTheDocument()
  })
})
