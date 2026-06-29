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
      startNewChat: vi.fn().mockResolvedValue(undefined),
      isNewChat: false,
    },
  }
})

const { mockAgentWorkspaceStore } = vi.hoisted(() => ({
  mockAgentWorkspaceStore: {
    workspace: null,
    files: [],
    selectedFilePath: null,
    selectedFile: null,
    currentConversationId: null,
    isWorkspaceLoading: false,
    isFilesLoading: false,
    isPreviewLoading: false,
    isDownloading: false,
    error: null,
    openForConversation: vi.fn(),
    listFiles: vi.fn(),
    selectFile: vi.fn(),
    downloadSelectedFile: vi.fn(),
    reset: vi.fn(),
  },
}))

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
    if (store === mockAgentWorkspaceStore) return mockAgentWorkspaceStore
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

vi.mock('@/store/agentWorkspace', () => ({
  agentWorkspaceStore: mockAgentWorkspaceStore,
}))

const mockChat = {
  id: 'chat-123',
  name: 'Test Chat',
  isGroup: false,
  assistantData: [],
  initialAssistantId: 'assistant-abc',
  assistantIds: ['assistant-abc'],
} as unknown as Conversation

const mockNewChat = {
  id: 'chat-new',
  name: 'New Chat',
  isGroup: false,
  assistantData: [],
  initialAssistantId: null,
  assistantIds: [],
} as unknown as Conversation

const mockWorkflowChat = {
  id: 'chat-workflow',
  name: 'Workflow Chat',
  isGroup: false,
  isWorkflow: true,
  assistantData: [],
  initialAssistantId: 'workflow-assistant-id',
  assistantIds: ['workflow-assistant-id'],
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

  it('starts a new chat when New Chat is clicked', async () => {
    render(<ChatHeader />)

    await user.click(screen.getByText('New Chat'))

    expect(mockChatsStore.startNewChat).toHaveBeenCalledWith('', '', false)
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'new-chat' })
    })
  })

  it('starts a new chat with initialAssistantId when New Chat with Same Assistant is clicked', async () => {
    const chatWithAssistant = {
      ...mockChat,
      initialAssistantId: 'assistant-abc',
      assistantIds: ['assistant-xyz'],
    }
    mockChatsStore.currentChat = chatWithAssistant as unknown as Conversation
    render(<ChatHeader />)

    await user.click(screen.getByLabelText('New Chat with Same Assistant'))

    expect(mockChatsStore.startNewChat).toHaveBeenCalledWith('assistant-abc', '', false)
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'new-chat' })
    })
  })

  it('falls back to first assistantId when initialAssistantId is null', async () => {
    const chatWithoutInitialAssistant = {
      ...mockChat,
      initialAssistantId: null,
      assistantIds: ['assistant-fallback'],
    }
    mockChatsStore.currentChat = chatWithoutInitialAssistant as unknown as Conversation
    render(<ChatHeader />)

    await user.click(screen.getByLabelText('New Chat with Same Assistant'))

    expect(mockChatsStore.startNewChat).toHaveBeenCalledWith('assistant-fallback', '', false)
  })

  it('starts new chat in the same folder when current chat has a folder', async () => {
    const chatInFolder = {
      ...mockChat,
      folder: 'my-folder',
    }
    mockChatsStore.currentChat = chatInFolder as unknown as Conversation
    render(<ChatHeader />)

    await user.click(screen.getByLabelText('New Chat with Same Assistant'))

    expect(mockChatsStore.startNewChat).toHaveBeenCalledWith('assistant-abc', 'my-folder', false)
  })

  it('starts new chat with empty folder when current chat has no folder', async () => {
    mockChatsStore.currentChat = mockChat
    render(<ChatHeader />)

    await user.click(screen.getByLabelText('New Chat with Same Assistant'))

    expect(mockChatsStore.startNewChat).toHaveBeenCalledWith('assistant-abc', '', false)
  })

  it('hides New Chat with Same Assistant button for newly created chats with no assistants', () => {
    mockChatsStore.currentChat = mockNewChat
    render(<ChatHeader />)
    expect(screen.queryByLabelText('New Chat with Same Assistant')).not.toBeInTheDocument()
  })

  it('starts a new chat with isWorkflow=true for workflow chats', async () => {
    mockChatsStore.currentChat = mockWorkflowChat
    render(<ChatHeader />)

    await user.click(screen.getByLabelText('New Chat with Same Assistant'))

    expect(mockChatsStore.startNewChat).toHaveBeenCalledWith('workflow-assistant-id', '', true)
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'new-chat' })
    })
  })

  const buttonLabels = [
    'New Chat with Same Assistant',
    'Share Chat',
    'Usage details',
    'Browse files',
    'Chat configuration',
  ]
  const exportButtonLabel = 'Export Conversation'

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
