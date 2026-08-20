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
  openedChatsHistory: [] as Conversation[],
  updateChatListItem: vi.fn(),
  updateChat: vi.fn(),
  getChat: vi.fn(),
  findChat: vi.fn(),
  getConversationName: vi.fn(),
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

const createChat = (
  historyItem: ChatMessage,
  overrides: Partial<Conversation> = {}
): Conversation =>
  ({
    id: 'chat-1',
    name: 'Chat',
    assistantIds: ['assistant-1'],
    assistantData: [],
    history: [[historyItem]],
    initialAssistantId: 'assistant-1',
    isWorkflow: false,
    ...overrides,
  } as Conversation)

describe('chatGenerationStore late MCP auth callback handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('authenticates a row already rolled back to authentication_required', async () => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [createPromptRow({ status: 'authentication_required' })],
    })
    mockChatsStore.currentChat = createChat(historyItem)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.markPromptAuthSuccess('chat-1', 'auth-1')

    expect(mockChatsStore.currentChat?.history[0][0].mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        status: 'authenticated',
        error_context: null,
      }),
    ])
  })

  it('still authenticates a row that is authenticating', async () => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [createPromptRow({ status: 'authenticating' })],
    })
    mockChatsStore.currentChat = createChat(historyItem)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.markPromptAuthSuccess('chat-1', 'auth-1')

    expect(mockChatsStore.currentChat?.history[0][0].mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        status: 'authenticated',
        error_context: null,
      }),
    ])
  })

  it('is a no-op on a row that is already authenticated', async () => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [
        createPromptRow({ status: 'authenticated', error_context: 'stale-context' }),
      ],
    })
    mockChatsStore.currentChat = createChat(historyItem)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.markPromptAuthSuccess('chat-1', 'auth-1')

    expect(mockChatsStore.currentChat?.history[0][0].mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        status: 'authenticated',
        error_context: 'stale-context',
      }),
    ])
  })

  it('lands a late identity-provider error on a row the hint expiry already rolled back', async () => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [createPromptRow({ status: 'authentication_required' })],
    })
    mockChatsStore.currentChat = createChat(historyItem)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.rollbackPromptAuthRow('chat-1', 'auth-1', 'idp_denied')

    expect(mockChatsStore.currentChat?.history[0][0].mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        status: 'authentication_required',
        error_context: 'idp_denied',
      }),
    ])
  })

  it('does not let rollbackPromptAuthRow clobber an already authenticated row', async () => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [createPromptRow({ status: 'authenticated', error_context: null })],
    })
    mockChatsStore.currentChat = createChat(historyItem)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.rollbackPromptAuthRow('chat-1', 'auth-1', 'idp_denied')

    expect(mockChatsStore.currentChat?.history[0][0].mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        status: 'authenticated',
        error_context: null,
      }),
    ])
  })

  it('no-ops both markPromptAuthSuccess and rollbackPromptAuthRow for a workflow chat', async () => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [
        createPromptRow({ status: 'authentication_required', error_context: null }),
      ],
    })
    mockChatsStore.currentChat = createChat(historyItem, { isWorkflow: true })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.markPromptAuthSuccess('chat-1', 'auth-1')
    chatGenerationStore.rollbackPromptAuthRow('chat-1', 'auth-1', 'idp_denied')

    expect(mockChatsStore.currentChat?.history[0][0].mcpAuthPromptRows).toEqual([
      expect.objectContaining({
        status: 'authentication_required',
        error_context: null,
      }),
    ])
  })
  // AC 6 regression pin for the chat consumer. It needed no production change: it
  // guards the retry path this ticket makes newly reachable, where a row the hint
  // expiry rolled back must issue a fresh initiate instead of reopening the auth_url
  // whose PKCE state the first attempt already consumed.
  it('re-runs initiate after a hint expiry rollback and never reuses a consumed auth_url', async () => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [createPromptRow({ status: 'authentication_required' })],
    })
    mockChatsStore.currentChat = createChat(historyItem)
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(window)

    const { chatGenerationStore } = await import('@/store/chatGeneration')

    // First attempt: initiate stores the pending auth_url, continue consumes it.
    mockPost.mockResolvedValueOnce({
      json: async () => ({
        auth_url: 'https://idp.example.com/start?state=first',
        redirect_uri_hostname: 'localhost:8080',
      }),
    })
    await chatGenerationStore.initiatePromptAuth('chat-1', 0, 0, 'mcp-1')
    await chatGenerationStore.continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(historyItem.mcpAuthPromptRows?.[0]).toEqual(
      expect.objectContaining({ status: 'authenticating', pending_initiate: null })
    )

    // The hint expires: the listener's onTimeout rolls the row back with the hint copy,
    // which the hook's own tests assert verbatim.
    chatGenerationStore.rollbackPromptAuthRow('chat-1', 'auth-1', 'sign-in is taking longer')

    // The retry must go back to the backend for a new PKCE state.
    mockPost.mockResolvedValueOnce({
      json: async () => ({
        auth_url: 'https://idp.example.com/start?state=second',
        redirect_uri_hostname: 'localhost:8080',
      }),
    })
    await chatGenerationStore.initiatePromptAuth('chat-1', 0, 0, 'mcp-1')
    await chatGenerationStore.continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(mockPost).toHaveBeenLastCalledWith('v1/mcp-auth/oauth2/initiate', {
      mcp_config_id: 'mcp-1',
    })
    expect(openSpy).toHaveBeenCalledTimes(2)
    expect(openSpy).toHaveBeenLastCalledWith('https://idp.example.com/start?state=second', '_blank')
    expect(historyItem.mcpAuthPromptRows?.[0]).toEqual(
      expect.objectContaining({
        status: 'authenticating',
        pending_initiate: null,
        error_context: null,
      })
    )
  })
})
