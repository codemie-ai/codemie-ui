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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Conversation, ChatMessage } from '@/types/entity/conversation'
import type { MCPAuthGateServer } from '@/types/entity/mcpAuth'
import {
  INVALID_AUTH_URL_MESSAGE,
  POPUP_BLOCKED_AUTH_MESSAGE,
  SIGN_IN_WINDOW_CLOSED_MESSAGE,
} from '@/utils/mcpAuthInitiate'

const mockStream = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockGetAssistant = vi.fn()
const mockUpdateRecentAssistants = vi.fn()
const mockToasterError = vi.fn()
const mockToasterInfo = vi.fn()
const mockOpenSignInWindow = vi.fn()
const mockWatchSignInWindow = vi.fn()

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

vi.mock('@/utils/openSignInWindow', () => ({
  openSignInWindow: (...args: unknown[]) => mockOpenSignInWindow(...args),
}))

vi.mock('@/utils/watchSignInWindow', () => ({
  watchSignInWindow: (...args: unknown[]) => mockWatchSignInWindow(...args),
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

const fakeSignInWindow = { closed: false } as unknown as Window
const HINT_MESSAGE = 'sign-in is taking longer'

describe('chatGenerationStore late MCP auth callback handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    mockOpenSignInWindow.mockReturnValue({ status: 'opened', window: fakeSignInWindow })
    mockWatchSignInWindow.mockReturnValue(vi.fn())
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
    chatGenerationStore.showPromptAuthHint('chat-1', 'auth-1', 'sign-in is taking longer')

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
    expect(mockOpenSignInWindow).toHaveBeenCalledTimes(2)
    expect(mockOpenSignInWindow).toHaveBeenLastCalledWith(
      'https://idp.example.com/start?state=second'
    )
    expect(historyItem.mcpAuthPromptRows?.[0]).toEqual(
      expect.objectContaining({
        status: 'authenticating',
        pending_initiate: null,
        error_context: null,
      })
    )
  })
})

describe('chatGenerationStore MCP sign-in window', () => {
  const pendingInitiate = {
    auth_url: 'https://idp.example.com/start',
    redirect_uri_hostname: 'localhost:8080',
    localhost_warning: false,
  }
  const stops: ReturnType<typeof vi.fn>[] = []

  const setupChat = (rowOverrides: Partial<MCPAuthGateServer> = {}) => {
    const historyItem = createHistoryItem({
      mcpAuthPromptRows: [createPromptRow(rowOverrides)],
    })
    mockChatsStore.currentChat = createChat(historyItem)
    return historyItem
  }

  const getStore = async () => (await import('@/store/chatGeneration')).chatGenerationStore
  const row = (historyItem: ChatMessage) => historyItem.mcpAuthPromptRows?.[0]
  const lastWatchOptions = () => mockWatchSignInWindow.mock.calls.at(-1)?.[0]

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    stops.length = 0
    mockChatsStore.currentChat = null
    mockOpenSignInWindow.mockReturnValue({ status: 'opened', window: fakeSignInWindow })
    mockWatchSignInWindow.mockImplementation(() => {
      const stop = vi.fn()
      stops.push(stop)
      return stop
    })
  })

  it('opens the window once, outside the row mapper, and starts watching it', async () => {
    const historyItem = setupChat({ pending_initiate: pendingInitiate })
    const store = await getStore()
    mockOpenSignInWindow.mockImplementation(() => {
      // A pure mapper must not have run yet: the row is still awaiting confirmation.
      expect(row(historyItem)?.status).toBe('authentication_required')
      return { status: 'opened', window: fakeSignInWindow }
    })

    await store.continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(mockOpenSignInWindow).toHaveBeenCalledTimes(1)
    expect(mockOpenSignInWindow).toHaveBeenCalledWith(pendingInitiate.auth_url)
    expect(mockWatchSignInWindow).toHaveBeenCalledWith(
      expect.objectContaining({ window: fakeSignInWindow, mcpConfigId: 'mcp-1' })
    )
    expect(row(historyItem)).toEqual(
      expect.objectContaining({
        status: 'authenticating',
        pending_initiate: null,
        error_context: null,
        sign_in_window_closed: false,
      })
    )
  })

  it('reports a blocked window on continuePromptAuth and keeps the confirmation', async () => {
    const historyItem = setupChat({ pending_initiate: pendingInitiate })
    mockOpenSignInWindow.mockReturnValue({ status: 'blocked' })

    await (await getStore()).continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(row(historyItem)).toEqual(
      expect.objectContaining({
        status: 'authentication_required',
        pending_initiate: pendingInitiate,
        error_context: POPUP_BLOCKED_AUTH_MESSAGE,
      })
    )
    expect(mockWatchSignInWindow).not.toHaveBeenCalled()
  })

  it('drops the confirmation when continuePromptAuth gets an invalid url', async () => {
    const historyItem = setupChat({
      pending_initiate: { ...pendingInitiate, auth_url: 'ftp://idp.example.com/start' },
    })
    mockOpenSignInWindow.mockReturnValue({ status: 'invalid_url' })

    await (await getStore()).continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(row(historyItem)).toEqual(
      expect.objectContaining({
        pending_initiate: null,
        error_context: INVALID_AUTH_URL_MESSAGE,
      })
    )
  })

  it('reports a blocked window on initiatePromptAuth for a non-oauth2 row', async () => {
    const historyItem = setupChat({ auth_type: 'saml' })
    mockOpenSignInWindow.mockReturnValue({ status: 'blocked' })
    mockPost.mockResolvedValueOnce({ json: async () => ({ auth_url: pendingInitiate.auth_url }) })

    await (await getStore()).initiatePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(row(historyItem)).toEqual(
      expect.objectContaining({
        status: 'authentication_required',
        error_context: POPUP_BLOCKED_AUTH_MESSAGE,
      })
    )
  })

  it('opens and watches directly on initiatePromptAuth for a non-oauth2 row', async () => {
    const historyItem = setupChat({ auth_type: 'saml' })
    mockPost.mockResolvedValueOnce({ json: async () => ({ auth_url: pendingInitiate.auth_url }) })

    await (await getStore()).initiatePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(mockOpenSignInWindow).toHaveBeenCalledWith(pendingInitiate.auth_url)
    expect(row(historyItem)?.status).toBe('authenticating')
    expect(mockWatchSignInWindow).toHaveBeenCalledTimes(1)
  })

  it('marks a recoverable row closed when the window closes early', async () => {
    const historyItem = setupChat({ pending_initiate: pendingInitiate })
    const store = await getStore()
    await store.continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    lastWatchOptions().onClosedEarly()

    expect(row(historyItem)).toEqual(
      expect.objectContaining({
        status: 'authentication_required',
        error_context: SIGN_IN_WINDOW_CLOSED_MESSAGE,
        sign_in_window_closed: true,
      })
    )
  })

  it('clears the closed flag when a new flow starts', async () => {
    const historyItem = setupChat({
      sign_in_window_closed: true,
      error_context: SIGN_IN_WINDOW_CLOSED_MESSAGE,
      pending_initiate: pendingInitiate,
    })

    await (await getStore()).continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(row(historyItem)).toEqual(
      expect.objectContaining({ sign_in_window_closed: false, error_context: null })
    )
  })

  it('stops the watcher once when the poll reports success twice', async () => {
    const historyItem = setupChat({ pending_initiate: pendingInitiate })
    const store = await getStore()
    await store.continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    lastWatchOptions().onAuthenticated()
    store.markPromptAuthSuccess('chat-1', 'auth-1')

    expect(row(historyItem)?.status).toBe('authenticated')
    expect(stops[0]).toHaveBeenCalledTimes(1)
  })

  it('stops the previous watcher when the same row starts a new flow', async () => {
    setupChat({ pending_initiate: pendingInitiate })
    const store = await getStore()
    await store.continuePromptAuth('chat-1', 0, 0, 'mcp-1')
    const row0 = mockChatsStore.currentChat!.history[0][0].mcpAuthPromptRows![0]
    row0.pending_initiate = pendingInitiate
    row0.status = 'authentication_required'

    await store.continuePromptAuth('chat-1', 0, 0, 'mcp-1')

    expect(stops[0]).toHaveBeenCalledTimes(1)
    expect(stops[1]).not.toHaveBeenCalled()
  })

  describe('watcher lifecycle', () => {
    const startFlow = async (overrides: Partial<MCPAuthGateServer> = {}) => {
      const historyItem = setupChat({ pending_initiate: pendingInitiate, ...overrides })
      const store = await getStore()
      await store.continuePromptAuth('chat-1', 0, 0, 'mcp-1')
      return { historyItem, store }
    }

    it('stops the watcher on success', async () => {
      const { store } = await startFlow()
      store.markPromptAuthSuccess('chat-1', 'auth-1')
      expect(stops[0]).toHaveBeenCalledTimes(1)
    })

    it('stops the watcher on error', async () => {
      const { store } = await startFlow()
      store.rollbackPromptAuthRow('chat-1', 'auth-1', 'idp_denied')
      expect(stops[0]).toHaveBeenCalledTimes(1)
    })

    it('stops the watcher on early close', async () => {
      await startFlow()
      lastWatchOptions().onClosedEarly()
      expect(stops[0]).toHaveBeenCalledTimes(1)
    })

    it('stops the watcher on cancel', async () => {
      const { store, historyItem } = await startFlow()
      row(historyItem)!.pending_initiate = pendingInitiate

      store.cancelPromptAuth('chat-1', 0, 0, 'mcp-1')

      expect(stops[0]).toHaveBeenCalledTimes(1)
    })

    it('stops the watcher when the row is removed from the message', async () => {
      const { store } = await startFlow()

      await store._removeOptimisticTurn(mockChatsStore.currentChat!.history[0][0])

      expect(stops[0]).toHaveBeenCalledTimes(1)
    })

    it('keeps the watcher running when the hint expires and still marks success afterwards', async () => {
      const { store, historyItem } = await startFlow()

      store.showPromptAuthHint('chat-1', 'auth-1', HINT_MESSAGE)

      expect(row(historyItem)).toEqual(
        expect.objectContaining({ status: 'authentication_required', error_context: HINT_MESSAGE })
      )
      expect(stops[0]).not.toHaveBeenCalled()

      lastWatchOptions().onAuthenticated()

      expect(row(historyItem)).toEqual(
        expect.objectContaining({ status: 'authenticated', error_context: null })
      )
      expect(stops[0]).toHaveBeenCalledTimes(1)
    })

    it('does not let the hint clobber an already authenticated row', async () => {
      const { store, historyItem } = await startFlow()
      store.markPromptAuthSuccess('chat-1', 'auth-1')

      store.showPromptAuthHint('chat-1', 'auth-1', HINT_MESSAGE)

      expect(row(historyItem)?.status).toBe('authenticated')
    })

    describe('after the user switched to another chat', () => {
      const switchAwayFromOpenedChat = () => {
        const openedChat = mockChatsStore.currentChat!
        mockChatsStore.openedChatsHistory = [openedChat]
        mockChatsStore.currentChat = createChat(createHistoryItem(), { id: 'chat-2' })
      }

      afterEach(() => {
        mockChatsStore.openedChatsHistory = []
      })

      it('lands a watcher success on the chat that opened the window, ready when the user is back', async () => {
        const { store, historyItem } = await startFlow()
        const openedChat = mockChatsStore.currentChat!
        switchAwayFromOpenedChat()

        lastWatchOptions().onAuthenticated()
        mockChatsStore.currentChat = openedChat

        expect(row(historyItem)?.status).toBe('authenticated')
        expect(store.getAuthenticatingPromptIds('chat-1')).toEqual([])
      })

      it('lands an early close on the chat that opened the window', async () => {
        const { historyItem } = await startFlow()
        switchAwayFromOpenedChat()

        lastWatchOptions().onClosedEarly()

        expect(row(historyItem)).toEqual(
          expect.objectContaining({
            error_context: SIGN_IN_WINDOW_CLOSED_MESSAGE,
            sign_in_window_closed: true,
          })
        )
      })

      it('lands an error rollback on the chat that opened the window', async () => {
        const { store, historyItem } = await startFlow()
        switchAwayFromOpenedChat()

        store.rollbackPromptAuthRow('chat-1', 'auth-1', 'idp_denied')

        expect(row(historyItem)).toEqual(
          expect.objectContaining({
            status: 'authentication_required',
            error_context: 'idp_denied',
          })
        )
      })

      it('drops the outcome quietly when the chat that opened the window is gone', async () => {
        await startFlow()
        mockChatsStore.currentChat = createChat(createHistoryItem(), { id: 'chat-2' })

        expect(() => lastWatchOptions().onAuthenticated()).not.toThrow()
      })
    })
  })
})
