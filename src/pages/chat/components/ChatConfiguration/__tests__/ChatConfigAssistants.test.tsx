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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Assistant } from '@/types/entity/assistant'
import { Conversation } from '@/types/entity/conversation'

import ChatConfigAssistants from '../ChatConfigAssistants/ChatConfigAssistants'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore, mockAssistantsStore } = vi.hoisted(() => {
  return {
    mockChatsStore: {
      currentChat: null as Conversation | null,
    },
    mockAssistantsStore: {
      getAssistant: vi.fn(),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockChatsStore) {
      return { currentChat: mockChatsStore.currentChat }
    }
    if (store === mockAssistantsStore) {
      return { getAssistant: mockAssistantsStore.getAssistant }
    }
    return store
  }),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/store', () => ({
  assistantsStore: mockAssistantsStore,
}))

vi.mock('@/utils/entity', () => ({
  canEdit: vi.fn(() => true),
}))

vi.mock('@/utils/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  copyToClipboard: vi.fn(),
  getRootPath: vi.fn(() => 'http://localhost:3000'),
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => ({
    openConfigForm: vi.fn(),
  })),
}))

const mockAssistant1: Assistant = {
  id: 'assistant-1',
  name: 'Assistant One',
  description: 'First assistant',
  icon_url: 'http://example.com/icon1.png',
  system_prompt: 'You are assistant one',
  model: 'gpt-4',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
} as Assistant

const mockAssistant2: Assistant = {
  id: 'assistant-2',
  name: 'Assistant Two',
  description: 'Second assistant',
  icon_url: 'http://example.com/icon2.png',
  system_prompt: 'You are assistant two',
  model: 'gpt-3.5-turbo',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
} as Assistant

const mockAssistant3: Assistant = {
  id: 'assistant-3',
  name: 'Assistant Three',
  description: 'Third assistant',
  icon_url: 'http://example.com/icon3.png',
  system_prompt: 'You are assistant three',
  model: 'claude-2',
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-03T00:00:00Z',
} as Assistant

describe('ChatConfigAssistants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
    mockAssistantsStore.getAssistant.mockReset()
  })

  it('renders null when there are no assistants and not loading', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [],
    } as unknown as Conversation

    const { container } = render(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('renders null when currentChat is null', async () => {
    mockChatsStore.currentChat = null
    const { container } = render(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('shows spinner while loading assistants', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [{ id: 'assistant-1' }, { id: 'assistant-2' }],
    } as Conversation

    const getAssistantMock = new Promise((resolve) => {
      setTimeout(() => resolve(mockAssistant1), 100)
    })
    mockAssistantsStore.getAssistant.mockImplementation(() => getAssistantMock)

    render(<ChatConfigAssistants />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('renders header with correct text', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [{ id: 'assistant-1' }],
    } as Conversation

    mockAssistantsStore.getAssistant.mockResolvedValue(mockAssistant1)

    render(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(screen.getByText('Connected Assistants')).toBeInTheDocument()
    })

    screen.getByText('Connected Assistants')
  })

  it('fetches and renders single assistant correctly', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [{ id: 'assistant-1' }],
    } as Conversation

    mockAssistantsStore.getAssistant.mockResolvedValue(mockAssistant1)

    render(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(screen.getByText('Assistant One')).toBeInTheDocument()
    })

    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledWith('assistant-1')
    expect(screen.getByText('assistant-1')).toBeInTheDocument()
  })

  it('fetches and renders multiple assistants correctly', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [{ id: 'assistant-1' }, { id: 'assistant-2' }, { id: 'assistant-3' }],
    } as Conversation

    mockAssistantsStore.getAssistant.mockImplementation((id: string) => {
      if (id === 'assistant-1') return Promise.resolve(mockAssistant1)
      if (id === 'assistant-2') return Promise.resolve(mockAssistant2)
      if (id === 'assistant-3') return Promise.resolve(mockAssistant3)
      return Promise.resolve(null)
    })

    render(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(screen.getByText('Assistant One')).toBeInTheDocument()
      expect(screen.getByText('Assistant Two')).toBeInTheDocument()
      expect(screen.getByText('Assistant Three')).toBeInTheDocument()
    })

    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledTimes(3)
    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledWith('assistant-1')
    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledWith('assistant-2')
    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledWith('assistant-3')
  })

  it('updates assistants when currentChat.assistantData changes', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [{ id: 'assistant-1' }],
    } as Conversation

    mockAssistantsStore.getAssistant.mockResolvedValue(mockAssistant1)

    const { rerender } = render(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(screen.getByText('Assistant One')).toBeInTheDocument()
    })

    // Update the assistantData
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [{ id: 'assistant-1' }, { id: 'assistant-2' }],
    } as Conversation

    mockAssistantsStore.getAssistant.mockImplementation((id: string) => {
      if (id === 'assistant-1') return Promise.resolve(mockAssistant1)
      if (id === 'assistant-2') return Promise.resolve(mockAssistant2)
      return Promise.resolve(null)
    })

    rerender(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(screen.getByText('Assistant Two')).toBeInTheDocument()
    })

    expect(screen.getByText('Assistant One')).toBeInTheDocument()
  })

  it('hides spinner after assistants are loaded', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [{ id: 'assistant-1' }],
    } as Conversation

    mockAssistantsStore.getAssistant.mockResolvedValue(mockAssistant1)

    render(<ChatConfigAssistants />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument()
    })

    expect(screen.getByText('Assistant One')).toBeInTheDocument()
  })

  it('handles multiple assistants with one successful fetch', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData: [{ id: 'assistant-1' }, { id: 'assistant-3' }],
    } as Conversation

    mockAssistantsStore.getAssistant.mockImplementation((id: string) => {
      if (id === 'assistant-1') return Promise.resolve(mockAssistant1)
      if (id === 'assistant-3') return Promise.resolve(mockAssistant3)
      return Promise.resolve(null)
    })

    render(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(screen.getByText('Assistant One')).toBeInTheDocument()
    })

    expect(screen.getByText('Assistant Three')).toBeInTheDocument()
  })

  it('calls getAssistant with correct IDs from assistantData', async () => {
    const assistantData = [{ id: 'custom-id-1' }, { id: 'custom-id-2' }, { id: 'custom-id-3' }]

    mockChatsStore.currentChat = {
      id: 'chat-1',
      name: 'Test Chat',
      assistantData,
    } as Conversation

    mockAssistantsStore.getAssistant.mockResolvedValue(mockAssistant1)

    render(<ChatConfigAssistants />)

    await waitFor(() => {
      expect(mockAssistantsStore.getAssistant).toHaveBeenCalledTimes(3)
    })

    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledWith('custom-id-1')
    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledWith('custom-id-2')
    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledWith('custom-id-3')
  })
})
