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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatRequest } from '@/types/chatGeneration'
import type { Conversation, ChatMessage } from '@/types/entity/conversation'
import type { MCPAuthGateServer } from '@/types/entity/mcpAuth'

const mockStream = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockGetAssistant = vi.fn()
const mockUpdateRecentAssistants = vi.fn()
const mockToasterError = vi.fn()
const mockToasterInfo = vi.fn()

const mockChatsStore = {
  currentChat: null as Conversation | null,
  updateChatListItem: vi.fn(),
  updateChat: vi.fn(),
  getChat: vi.fn(),
  refreshWorkflowExecutionIds: vi.fn(),
}

vi.mock('@/utils/api', () => ({
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Oops! Something went wrong',
  default: {
    stream: (...args: unknown[]) => mockStream(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    getAssistant: (...args: unknown[]) => mockGetAssistant(...args),
    updateRecentAssistants: (...args: unknown[]) => mockUpdateRecentAssistants(...args),
  },
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    getExecutionStates: vi.fn(),
    updateWorkflowExecutionStateOutput: vi.fn(),
  },
}))

vi.mock('@/utils/helpers', () => ({
  fileToBase64: vi.fn(),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: (...args: unknown[]) => mockToasterError(...args),
    info: (...args: unknown[]) => mockToasterInfo(...args),
  },
}))

const createPromptRow = (overrides: Partial<MCPAuthGateServer> = {}): MCPAuthGateServer => ({
  mcp_config_id: 'mcp-1',
  mcp_config_name: 'GitHub',
  mcp_server_name: 'GitHub',
  auth_config_id: 'auth-1',
  auth_type: 'oauth2',
  as_hostname: 'login.github.com',
  status: 'authentication_required',
  error_context: null,
  initiate_url: '/v1/mcp-auth/oauth2/initiate',
  recoverable_status: 'authentication_required',
  ...overrides,
})

const createHistoryItem = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'User',
  request: 'Hello',
  requestRaw: 'Hello',
  response: undefined,
  createdAt: '2026-04-30T10:00:00.000Z',
  assistantId: 'assistant-1',
  assistant: {
    id: 'assistant-1',
    name: 'Assistant',
  },
  inProgress: true,
  executionId: null,
  ...overrides,
})

const createChat = (historyItem: ChatMessage): Conversation =>
  ({
    id: 'chat-1',
    name: 'Chat',
    assistantIds: ['assistant-1'],
    assistantData: [],
    history: [[historyItem]],
    initialAssistantId: 'assistant-1',
    isWorkflow: false,
  } as Conversation)

const createRequest = (): ChatRequest =>
  ({
    conversationId: 'chat-1',
    text: 'Hello',
    contentRaw: 'Hello',
    file_names: [],
    llmModel: null,
    history: [],
    historyIndex: 0,
    mcpServerSingleUsage: false,
    workflowExecutionId: null,
    stream: true,
    topK: 10,
    systemPrompt: '',
    backgroundTask: false,
    metadata: null,
    toolsConfig: [],
    outputSchema: null,
  } as ChatRequest)

describe('chatGenerationStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('converts MCP auth payload failures into inline prompt rows without generic response text', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat

    mockStream.mockRejectedValueOnce({
      error: 'authentication_required',
      servers: [
        {
          mcp_config_id: 'mcp-1',
          mcp_config_name: 'GitHub',
          mcp_server_name: 'GitHub',
          auth_config_id: 'auth-1',
          auth_type: 'oauth2',
          as_hostname: 'login.github.com',
          status: 'authentication_required',
          error_context: 'Connect GitHub to continue.',
          initiate_url: '/v1/mcp-auth/oauth2/initiate',
        },
        {
          mcp_config_id: 'mcp-2',
          mcp_config_name: 'Okta',
          mcp_server_name: 'Okta',
          auth_config_id: 'auth-2',
          auth_type: 'saml',
          as_hostname: 'sso.example.com',
          status: 'session_expired',
          error_context: 'SAML session expired',
          initiate_url: '/v1/mcp-auth/saml/initiate',
        },
      ],
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore._sendRequest(chat, 0, 0, createRequest())

    expect(historyItem.response).toBeUndefined()
    expect(historyItem.loginUrl).toBeUndefined()
    expect(historyItem.inProgress).toBe(false)
    expect(historyItem.mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        mcp_config_id: 'mcp-1',
        mcp_server_name: 'GitHub',
        status: 'authentication_required',
        error_context: 'Connect GitHub to continue.',
        recoverable_status: 'authentication_required',
      }),
      expect.objectContaining({
        mcp_config_id: 'mcp-2',
        mcp_server_name: 'Okta',
        status: 'session_expired',
        error_context: 'SAML session expired',
        recoverable_status: 'session_expired',
      }),
    ])
    expect(chat.history).toHaveLength(1)
    expect(chat.history[0][0].request).toBe('Hello')
  })

  it('keeps non-auth failures on the generic error path', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat

    mockStream.mockRejectedValueOnce({
      error: {
        message: 'Generation failed',
        details: 'Tool call crashed',
        help: 'Retry later',
        login_url: '/login',
      },
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore._sendRequest(chat, 0, 0, createRequest())

    expect(historyItem.response).toContain('Generation failed')
    expect(historyItem.loginUrl).toBe('/login')
    expect(historyItem.mcpAuthPromptRows).toBeNull()
    expect(historyItem.inProgress).toBe(false)
  })

  it('returns only authenticating conversation prompt auth_config_ids for the current chat', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      assistantIds: ['assistant-1'],
      assistantData: [],
      history: [
        [
          createHistoryItem({
            mcpAuthPromptRows: [
              createPromptRow({
                mcp_config_id: 'mcp-1',
                auth_config_id: 'auth-1',
                status: 'authenticating',
              }),
              createPromptRow({
                mcp_config_id: 'mcp-2',
                auth_config_id: 'auth-2',
                status: 'authentication_required',
              }),
            ],
          }),
        ],
        [
          createHistoryItem({
            mcpAuthPromptRows: [
              createPromptRow({
                mcp_config_id: 'mcp-3',
                auth_config_id: 'auth-3',
                status: 'authenticating',
              }),
              createPromptRow({
                mcp_config_id: 'mcp-4',
                auth_config_id: 'auth-1',
                status: 'authenticating',
              }),
            ],
          }),
        ],
      ],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as Conversation

    const { chatGenerationStore } = await import('@/store/chatGeneration')

    expect(chatGenerationStore.getAuthenticatingPromptIds('chat-1')).toEqual(['auth-1', 'auth-3'])
  })

  it('initiates prompt auth only for the targeted row and keeps other rows unchanged', async () => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [
        createPromptRow({
          mcp_config_id: 'mcp-1',
          auth_config_id: 'auth-1',
          status: 'session_expired',
          recoverable_status: 'session_expired',
        }),
        createPromptRow({
          mcp_config_id: 'mcp-2',
          auth_config_id: 'auth-2',
          status: 'authentication_required',
          recoverable_status: 'authentication_required',
        }),
      ],
    })
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat
    mockPost.mockResolvedValueOnce({
      json: async () => ({ auth_url: 'https://idp.example.com/start' }),
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore.initiatePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(mockPost).toHaveBeenCalledWith('v1/mcp-auth/oauth2/initiate', {
      mcp_config_id: 'mcp-1',
    })
    expect(window.open).toHaveBeenCalledWith('https://idp.example.com/start', '_blank')
    expect(historyItem.mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        mcp_config_id: 'mcp-1',
        status: 'authenticating',
        recoverable_status: 'session_expired',
      }),
      expect.objectContaining({
        mcp_config_id: 'mcp-2',
        status: 'authentication_required',
      }),
    ])
  })

  it('marks only the targeted authenticating prompt row as authenticated on callback success', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      assistantIds: ['assistant-1'],
      assistantData: [],
      history: [
        [
          createHistoryItem({
            mcpAuthPromptRows: [
              createPromptRow({
                mcp_config_id: 'mcp-1',
                auth_config_id: 'auth-1',
                status: 'authenticating',
              }),
              createPromptRow({
                mcp_config_id: 'mcp-2',
                auth_config_id: 'auth-2',
                status: 'authentication_required',
              }),
            ],
          }),
        ],
      ],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as Conversation

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.markPromptAuthSuccess('chat-1', 'auth-1')

    expect(mockChatsStore.currentChat?.history[0][0].mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        mcp_config_id: 'mcp-1',
        status: 'authenticated',
        error_context: null,
      }),
      expect.objectContaining({
        mcp_config_id: 'mcp-2',
        status: 'authentication_required',
      }),
    ])
  })

  it('restores only the targeted prompt row to its recoverable status on callback error or timeout', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      assistantIds: ['assistant-1'],
      assistantData: [],
      history: [
        [
          createHistoryItem({
            mcpAuthPromptRows: [
              createPromptRow({
                mcp_config_id: 'mcp-1',
                auth_config_id: 'auth-1',
                status: 'authenticating',
                recoverable_status: 'session_expired',
              }),
              createPromptRow({
                mcp_config_id: 'mcp-2',
                auth_config_id: 'auth-2',
                status: 'authenticating',
                recoverable_status: 'authentication_required',
              }),
            ],
          }),
        ],
      ],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as Conversation

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.rollbackPromptAuthRow('chat-1', 'auth-1', 'idp_denied')
    chatGenerationStore.rollbackPromptAuthRow(
      'chat-1',
      'auth-2',
      "Authentication didn't complete. Click to try again."
    )

    expect(mockChatsStore.currentChat?.history[0][0].mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        mcp_config_id: 'mcp-1',
        status: 'session_expired',
        error_context: 'idp_denied',
      }),
      expect.objectContaining({
        mcp_config_id: 'mcp-2',
        status: 'authentication_required',
        error_context: "Authentication didn't complete. Click to try again.",
      }),
    ])
  })
})
