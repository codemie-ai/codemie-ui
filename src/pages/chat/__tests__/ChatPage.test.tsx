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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTH_CALLBACK_TIMEOUT_MESSAGE } from '@/hooks/useAuthCallbackListener'
import type { Conversation } from '@/types/entity/conversation'

import ChatPage from '../ChatPage'

vi.hoisted(() => vi.resetModules())

const mockRouter = {
  currentRoute: {
    value: {
      params: { id: 'chat-1' },
    },
  },
}

const mockChatConfiguration = {
  isConfigVisible: false,
  toggleConfigVisibility: vi.fn(),
  attemptToggleConfigVisibility: vi.fn(),
  openConfigForm: vi.fn(),
}

const { mockChatsStore, mockChatGenerationStore, mockUseAuthCallbackListener } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    getChat: vi.fn(),
  },
  mockChatGenerationStore: {
    markPromptAuthSuccess: vi.fn(),
    rollbackPromptAuthRow: vi.fn(),
  },
  mockUseAuthCallbackListener: vi.fn((_options?: any) => ({ authFlows: {} })),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('@/hooks/useNewIntegrationPopup', () => ({
  useNewIntegrationPopup: vi.fn(() => ({
    showNewIntegration: false,
    selectedCredentialType: null,
    selectedProject: null,
    showNewIntegrationPopup: vi.fn(),
    hideNewIntegrationPopup: vi.fn(),
    onIntegrationSuccess: vi.fn(),
  })),
}))

vi.mock('@/hooks/useAuthCallbackListener', () => ({
  AUTH_CALLBACK_TIMEOUT_MESSAGE: "Authentication didn't complete. Click to try again.",
  useAuthCallbackListener: (options?: any) => mockUseAuthCallbackListener(options),
}))

vi.mock('../hooks/useChatConfiguration', () => ({
  useChatConfiguration: vi.fn(() => mockChatConfiguration),
}))

vi.mock('../hooks/useChatNavigation', () => ({
  useChatNavigation: vi.fn(),
}))

vi.mock('../hooks/useChatInitialPrompt', () => ({
  useChatInitialPrompt: vi.fn(),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: mockChatGenerationStore,
}))

vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ renderHeader, children }: any) => (
    <div>
      <div data-testid="page-header">{renderHeader}</div>
      <div data-testid="page-layout">{children}</div>
    </div>
  ),
}))

vi.mock('../components/ChatSidebar/ChatSidebar', () => ({
  default: () => <div data-testid="chat-sidebar" />,
}))

vi.mock('../components/ChatHeader/ChatHeader', () => ({
  default: () => <div data-testid="chat-header" />,
}))

vi.mock('../components/ChatHistory/ChatHistory', () => ({
  default: () => <div data-testid="chat-history" />,
}))

vi.mock('../components/ChatPrompt/ChatPrompt', () => ({
  default: () => <div data-testid="chat-prompt" />,
}))

vi.mock('../components/ChatConfiguration/ChatConfiguration', () => ({
  default: () => <div data-testid="chat-configuration" />,
}))

vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({
  default: () => <div data-testid="new-integration-popup" />,
}))

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
  })

  it('loads the chat and keeps the composer available', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [[{ createdAt: '2026-04-29T00:00:00Z' }]],
      assistantIds: ['assistant-1'],
      assistantData: [],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as unknown as Conversation

    render(<ChatPage />)

    expect(mockChatsStore.getChat).toHaveBeenCalledWith('chat-1', {
      saveAsRecent: true,
    })
    expect(screen.getByTestId('chat-history')).toBeInTheDocument()
    expect(screen.getByTestId('chat-prompt')).toBeInTheDocument()
  })

  it('tracks authenticating conversation prompt rows for callback listening', () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [
        [
          {
            createdAt: '2026-04-29T00:00:00Z',
            mcpAuthPromptRows: [
              {
                mcp_config_id: 'mcp-4',
                mcp_config_name: 'Gitlab',
                mcp_server_name: 'Gitlab',
                auth_config_id: 'auth-4',
                status: 'authenticating',
              },
              {
                mcp_config_id: 'mcp-5',
                mcp_config_name: 'Azure',
                mcp_server_name: 'Azure',
                auth_config_id: 'auth-5',
                status: 'authentication_required',
              },
            ],
          },
        ],
      ],
      assistantIds: ['assistant-1'],
      assistantData: [],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as unknown as Conversation

    render(<ChatPage />)

    expect(mockUseAuthCallbackListener).toHaveBeenCalledWith(
      expect.objectContaining({
        trackedAuthConfigIds: ['auth-4'],
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        onTimeout: expect.any(Function),
      })
    )
  })

  it('routes conversation prompt callback success to chatGenerationStore', () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [],
      assistantIds: ['assistant-1'],
      assistantData: [],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as unknown as Conversation

    render(<ChatPage />)

    const listenerOptions = mockUseAuthCallbackListener.mock.lastCall?.[0]
    listenerOptions.onSuccess('auth-2')

    expect(mockChatGenerationStore.markPromptAuthSuccess).toHaveBeenCalledWith('chat-1', 'auth-2')
  })

  it('routes conversation prompt callback errors and timeouts to chatGenerationStore', () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [],
      assistantIds: ['assistant-1'],
      assistantData: [],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as unknown as Conversation

    render(<ChatPage />)

    const listenerOptions = mockUseAuthCallbackListener.mock.lastCall?.[0]
    listenerOptions.onError('auth-2', 'idp_denied')
    listenerOptions.onTimeout('auth-2')

    expect(mockChatGenerationStore.rollbackPromptAuthRow).toHaveBeenNthCalledWith(
      1,
      'chat-1',
      'auth-2',
      'idp_denied'
    )
    expect(mockChatGenerationStore.rollbackPromptAuthRow).toHaveBeenNthCalledWith(
      2,
      'chat-1',
      'auth-2',
      AUTH_CALLBACK_TIMEOUT_MESSAGE
    )
  })

  it('keeps the composer available while a conversation prompt auth row is unresolved', () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [
        [
          {
            createdAt: '2026-04-29T00:00:00Z',
            mcpAuthPromptRows: [
              {
                mcp_config_id: 'mcp-1',
                mcp_config_name: 'EPAM Presale test 02',
                mcp_server_name: 'EPAM Presale test 02',
                auth_config_id: 'auth-1',
                status: 'session_expired',
              },
            ],
          },
        ],
      ],
      assistantIds: ['assistant-1'],
      assistantData: [],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as unknown as Conversation

    render(<ChatPage />)

    expect(screen.getByTestId('chat-prompt')).toBeInTheDocument()
  })

  it('keeps the composer visible for workflow chats', () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [[{ createdAt: '2026-04-29T00:00:00Z' }]],
      assistantIds: ['workflow-1'],
      assistantData: [],
      initialAssistantId: 'workflow-1',
      isWorkflow: true,
    } as unknown as Conversation

    render(<ChatPage />)

    expect(screen.getByTestId('chat-history')).toBeInTheDocument()
    expect(screen.getByTestId('chat-prompt')).toBeInTheDocument()
  })
})
