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
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Conversation } from '@/types/entity/conversation'

import ChatHeader from '../ChatHeader'

vi.hoisted(() => vi.resetModules())

const mockRouter = {
  push: vi.fn(),
}

const mockChatContext = {
  isConfigVisible: false,
  toggleConfigVisibility: vi.fn(),
  attemptToggleConfigVisibility: vi.fn(),
  openConfigForm: vi.fn(),
}

const { mockAppInfoStore, mockChatsStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      sidebarExpanded: false,
      configs: [],
      isConfigFetched: true,
    },
    mockChatsStore: {
      currentChat: null as Conversation | null,
      createChat: vi.fn(),
      getMetrics: vi.fn(),
      exportChat: vi.fn(),
    },
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => mockChatContext),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    if (store === mockChatsStore) return mockChatsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

const mockChat = {
  id: 'chat-123',
  name: 'Test Chat',
  isGroup: false,
  assistantData: [],
} as unknown as Conversation

const mockGroupChat = {
  id: 'chat-456',
  name: 'Group Chat',
  isGroup: true,
  assistantData: [
    { id: 'assistant-1', name: 'Assistant One', iconUrl: 'icon1.png' },
    { id: 'assistant-2', name: 'Assistant Two', iconUrl: 'icon2.png' },
    { id: 'assistant-3', name: 'Assistant Three', iconUrl: 'icon3.png' },
  ],
} as unknown as Conversation

const mockGroupChatWithMany = {
  id: 'chat-789',
  name: 'Group Chat Many',
  isGroup: true,
  assistantData: [
    { id: 'assistant-1', name: 'Assistant One', iconUrl: 'icon1.png' },
    { id: 'assistant-2', name: 'Assistant Two', iconUrl: 'icon2.png' },
    { id: 'assistant-3', name: 'Assistant Three', iconUrl: 'icon3.png' },
    { id: 'assistant-4', name: 'Assistant Four', iconUrl: 'icon4.png' },
    { id: 'assistant-5', name: 'Assistant Five', iconUrl: 'icon5.png' },
  ],
} as unknown as Conversation

describe('ChatHeader', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockAppInfoStore.sidebarExpanded = false
    mockChatsStore.currentChat = null
    mockChatContext.isConfigVisible = false
  })

  it('renders without crashing', () => {
    const { container } = render(<ChatHeader />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('shows New Chat button when sidebar is not expanded', () => {
    mockAppInfoStore.sidebarExpanded = false
    render(<ChatHeader />)
    expect(screen.getByText('New Chat')).toBeInTheDocument()
  })

  it('hides New Chat button when sidebar is expanded', () => {
    mockAppInfoStore.sidebarExpanded = true
    render(<ChatHeader />)
    expect(screen.queryByText('New Chat')).not.toBeInTheDocument()
  })

  it('calls createChat and navigates when New Chat is clicked', async () => {
    const newChat = { id: 'new-chat-123', name: 'New Chat' }
    mockChatsStore.createChat = vi.fn().mockResolvedValue(newChat)
    render(<ChatHeader />)

    await user.click(screen.getByText('New Chat'))

    expect(mockChatsStore.createChat).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({
        name: 'chats',
        params: { id: 'new-chat-123' },
      })
    })
  })

  const buttonLabels = ['Share Chat', 'Usage details', 'Open chat configuration']
  const exportButtonLabel =
    'Export conversation - Choose from multiple file formats including JSON, DOCX, and PDF'

  it('does not show chat actions when currentChat is null', () => {
    mockChatsStore.currentChat = null
    render(<ChatHeader />)

    buttonLabels.forEach((buttonLabel) => {
      expect(screen.queryByLabelText(buttonLabel)).not.toBeInTheDocument()
    })
    expect(screen.queryByLabelText(exportButtonLabel)).not.toBeInTheDocument()
  })

  it('renders data overlay and action buttons when chat exists', () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatHeader />)

    buttonLabels.forEach((buttonLabel) => {
      expect(screen.getByLabelText(buttonLabel)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(exportButtonLabel)).toBeInTheDocument()
  })

  it('renders export conversation button when chat exists', () => {
    mockChatsStore.currentChat = mockChat
    const { container } = render(<ChatHeader />)

    const exportButton = container.querySelector('[data-tooltip-content="Export Conversation"]')
    expect(exportButton).toBeInTheDocument()
  })

  it('renders Configuration button when chat exists', () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatHeader />)
    expect(screen.getByText('Configuration')).toBeInTheDocument()
  })

  it('calls attemptToggleConfigVisibility when Configuration button is clicked', async () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatHeader />)

    await user.click(screen.getByText('Configuration'))

    expect(mockChatContext.attemptToggleConfigVisibility).toHaveBeenCalled()
  })

  it('does not show assistant avatars for non-group chat', () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatHeader />)
    expect(screen.queryByText('Assistant One')).not.toBeInTheDocument()
  })

  it('shows only first 3 assistant avatars', () => {
    mockChatsStore.currentChat = mockGroupChatWithMany
    render(<ChatHeader />)

    const { assistantData } = mockGroupChatWithMany
    expect(screen.getByLabelText(assistantData[0].name)).toBeInTheDocument()
    expect(screen.getByLabelText(assistantData[1].name)).toBeInTheDocument()
    expect(screen.getByLabelText(assistantData[2].name)).toBeInTheDocument()
    expect(screen.queryByLabelText(assistantData[3].name)).not.toBeInTheDocument()
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('does not show assistants section when isGroup is true but no assistants', () => {
    mockChatsStore.currentChat = { ...mockGroupChat, assistantData: [] }
    render(<ChatHeader />)
    expect(screen.queryByText('...')).not.toBeInTheDocument()
  })

  it('renders separator between buttons', () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatHeader />)
    expect(screen.getByText('|')).toBeInTheDocument()
  })
})
