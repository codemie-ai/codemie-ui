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

import type { Conversation, ChatMessage, ChatListItem } from '@/types/entity/conversation'

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

const OPTIMISTIC_NAME = 'Hello'

const createHistoryItem = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'Assistant',
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
    name: OPTIMISTIC_NAME,
    assistantIds: ['assistant-1'],
    assistantData: [],
    history: [[historyItem]],
    initialAssistantId: 'assistant-1',
    isWorkflow: false,
    ...overrides,
  } as Conversation)

const emptyDoneReader = () =>
  ({
    read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
    cancel: vi.fn(),
  } as unknown as ReadableStreamDefaultReader)

describe('chatGenerationStore rename-after-stream polling', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useFakeTimers()
    mockChatsStore.currentChat = null
    mockChatsStore.openedChatsHistory = []
    mockChatsStore.findChat.mockReturnValue({ id: 'chat-1', name: OPTIMISTIC_NAME } as ChatListItem)
    mockChatsStore.getConversationName.mockResolvedValue(OPTIMISTIC_NAME)
    mockChatsStore.refreshWorkflowExecutionIds.mockResolvedValue(undefined)
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('picks up the LLM-generated name once the backend rename lands', async () => {
    const historyItem = createHistoryItem()
    // isGroup now reflects assistant_ids.length > 1 (see transformChatBEtoFE)
    // and gates the group icon's visibility. Regression guard: rename polling
    // must not be gated on isGroup either way.
    const chat = createChat(historyItem, { isGroup: true })
    mockChatsStore.openedChatsHistory = [chat]
    mockChatsStore.getConversationName.mockResolvedValueOnce('LLM Generated Title')

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const promise = chatGenerationStore._handleStreamResponse(
      emptyDoneReader(),
      historyItem,
      chat,
      new Date()
    )
    await vi.advanceTimersByTimeAsync(0)
    await promise

    await vi.advanceTimersByTimeAsync(1000)

    expect(mockChatsStore.getConversationName).toHaveBeenCalledWith('chat-1')
    // pendingRename is set true earlier, by _updateChatNameIfNeeded (exercised
    // via createChatGeneration, not this direct _handleStreamResponse call) —
    // here we only assert the poll's own success transition clears it.
    expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
      id: 'chat-1',
      name: 'LLM Generated Title',
      pendingRename: false,
    })
    expect(chat.name).toBe('LLM Generated Title')
  })

  it('gives up silently after the max attempts when the name never changes (flag off)', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem)
    mockChatsStore.openedChatsHistory = [chat]

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const promise = chatGenerationStore._handleStreamResponse(
      emptyDoneReader(),
      historyItem,
      chat,
      new Date()
    )
    await vi.advanceTimersByTimeAsync(0)
    await promise

    await vi.advanceTimersByTimeAsync(30_000)

    expect(mockChatsStore.getConversationName).toHaveBeenCalledTimes(8)
    expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
      id: 'chat-1',
      pendingRename: false,
    })
    expect(mockChatsStore.updateChatListItem).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.anything() })
    )
    expect(mockToasterError).not.toHaveBeenCalled()
  })

  it('CR-004: retries after a transient getConversationName fetch error instead of giving up for good', async () => {
    mockChatsStore.getConversationName
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce('LLM Generated Title')

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore._pollForRenamedChat('chat-1', OPTIMISTIC_NAME)

    await vi.advanceTimersByTimeAsync(15_000)

    expect(mockChatsStore.getConversationName).toHaveBeenCalledTimes(2)
    expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
      id: 'chat-1',
      name: 'LLM Generated Title',
      pendingRename: false,
    })
  })

  it('CR-004: still stops after MAX_RENAME_POLL_ATTEMPTS even when every attempt errors', async () => {
    mockChatsStore.getConversationName.mockRejectedValue(new Error('down'))

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore._pollForRenamedChat('chat-1', OPTIMISTIC_NAME)

    await vi.advanceTimersByTimeAsync(30_000)

    expect(mockChatsStore.getConversationName).toHaveBeenCalledTimes(8)
    expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
      id: 'chat-1',
      pendingRename: false,
    })
  })

  it('does not clobber a name the user manually changed while polling', async () => {
    mockChatsStore.findChat.mockReturnValue({
      id: 'chat-1',
      name: 'User renamed this',
    } as ChatListItem)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore._pollForRenamedChat('chat-1', OPTIMISTIC_NAME)

    await vi.advanceTimersByTimeAsync(15_000)

    expect(mockChatsStore.getConversationName).not.toHaveBeenCalled()
    // Drops the placeholder mask so the manually-typed name isn't hidden behind it.
    expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
      id: 'chat-1',
      pendingRename: false,
    })
  })

  it('CR-002: does not clobber a manual rename that lands while the getConversationName fetch is in flight', async () => {
    // Guard passes on entry (name still equals optimisticName)...
    mockChatsStore.findChat.mockReturnValue({ id: 'chat-1', name: OPTIMISTIC_NAME } as ChatListItem)
    // ...but the user renames the chat during the awaited network round-trip,
    // before getConversationName resolves.
    mockChatsStore.getConversationName.mockImplementation(async () => {
      mockChatsStore.findChat.mockReturnValue({
        id: 'chat-1',
        name: 'User renamed mid-flight',
      } as ChatListItem)
      return 'LLM Generated Title'
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore._pollForRenamedChat('chat-1', OPTIMISTIC_NAME)

    await vi.advanceTimersByTimeAsync(15_000)

    expect(mockChatsStore.getConversationName).toHaveBeenCalled()
    expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
      id: 'chat-1',
      pendingRename: false,
    })
    expect(mockChatsStore.updateChatListItem).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.anything() })
    )
  })

  it('stops polling if the chat was deleted mid-poll', async () => {
    mockChatsStore.findChat.mockReturnValue(undefined)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore._pollForRenamedChat('chat-1', OPTIMISTIC_NAME)

    await vi.advanceTimersByTimeAsync(15_000)

    expect(mockChatsStore.getConversationName).not.toHaveBeenCalled()
  })

  it('does not poll for workflow chats', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem, { isWorkflow: true })
    mockChatsStore.openedChatsHistory = [chat]

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const promise = chatGenerationStore._handleStreamResponse(
      emptyDoneReader(),
      historyItem,
      chat,
      new Date()
    )
    await vi.advanceTimersByTimeAsync(0)
    await promise

    await vi.advanceTimersByTimeAsync(15_000)

    expect(mockChatsStore.getConversationName).not.toHaveBeenCalled()
  })

  it('does not poll when the resolved message is not the first one in the chat', async () => {
    const firstHistoryItem = createHistoryItem({ request: 'First' })
    const secondHistoryItem = createHistoryItem({ request: 'Second' })
    const chat = createChat(firstHistoryItem)
    chat.history.push([secondHistoryItem])
    mockChatsStore.openedChatsHistory = [chat]

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const promise = chatGenerationStore._handleStreamResponse(
      emptyDoneReader(),
      secondHistoryItem,
      chat,
      new Date()
    )
    await vi.advanceTimersByTimeAsync(0)
    await promise

    await vi.advanceTimersByTimeAsync(15_000)

    expect(mockChatsStore.getConversationName).not.toHaveBeenCalled()
  })

  // Regression (found 2026-08-06): pendingRename was only set true once the
  // stream finished, inside _handleStreamResponse. But the raw truncated
  // optimistic name is set here, in _updateChatNameIfNeeded, which runs
  // BEFORE the stream even starts — so the sidebar flashed the raw prompt
  // text for the entire generation, then flipped to the placeholder, then
  // finally to the LLM name. pendingRename must go true at the same time as
  // the optimistic name itself, so the placeholder covers the whole window.
  it('masks the optimistic name behind the placeholder the moment it is set, before the stream runs', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem, { name: '' })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore._updateChatNameIfNeeded(chat, 'Hello there', 0, 0)

    expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
      id: 'chat-1',
      pendingRename: true,
    })
  })

  it('does not mask workflow chats (their poll never runs to unmask them)', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem, { name: '', isWorkflow: true })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore._updateChatNameIfNeeded(chat, 'Hello there', 0, 0)

    expect(mockChatsStore.updateChatListItem).not.toHaveBeenCalledWith(
      expect.objectContaining({ pendingRename: true })
    )
  })

  // Regression (CR-001, found 2026-08-06): pendingRename is set true
  // synchronously by _updateChatNameIfNeeded, before the request runs. It was
  // only ever cleared by the rename poll, kicked off from _handleStreamResponse
  // after a *successful* stream. If the initial request fails before that,
  // _handleStreamResponse never runs, so nothing cleared the flag — the
  // sidebar got stuck on the placeholder forever. _sendRequest now clears it
  // on both error exits.
  describe('CR-001: pendingRename does not get stuck true when the first-message request fails', () => {
    const createSendRequestData = () =>
      ({
        conversationId: 'chat-1',
        text: 'Hello there',
        contentRaw: 'Hello there',
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
      } as any)

    it('clears pendingRename when api.stream() throws a generic error on the first message', async () => {
      const historyItem = createHistoryItem()
      const chat = createChat(historyItem, { name: '' })
      mockStream.mockRejectedValueOnce({
        error: { message: 'Generation failed', details: '', help: '' },
      })

      const { chatGenerationStore } = await import('@/store/chatGeneration')
      await chatGenerationStore._sendRequest(chat, 0, 0, createSendRequestData())

      expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
        id: 'chat-1',
        pendingRename: false,
      })
    })

    it('clears pendingRename when the first message hits the MCP-auth-required branch', async () => {
      const historyItem = createHistoryItem()
      const chat = createChat(historyItem, { name: '' })
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
            error_context: null,
            initiate_url: '/v1/mcp-auth/oauth2/initiate',
          },
        ],
      })

      const { chatGenerationStore } = await import('@/store/chatGeneration')
      await chatGenerationStore._sendRequest(chat, 0, 0, createSendRequestData())

      expect(mockChatsStore.updateChatListItem).toHaveBeenCalledWith({
        id: 'chat-1',
        pendingRename: false,
      })
    })

    it('does not touch pendingRename on a request failure for a non-first message', async () => {
      const firstHistoryItem = createHistoryItem({ request: 'First' })
      const secondHistoryItem = createHistoryItem({ request: 'Second' })
      const chat = createChat(firstHistoryItem)
      chat.history.push([secondHistoryItem])
      mockStream.mockRejectedValueOnce({
        error: { message: 'Generation failed', details: '', help: '' },
      })

      const { chatGenerationStore } = await import('@/store/chatGeneration')
      await chatGenerationStore._sendRequest(chat, 1, 0, createSendRequestData())

      expect(mockChatsStore.updateChatListItem).not.toHaveBeenCalledWith(
        expect.objectContaining({ pendingRename: expect.anything() })
      )
    })

    it('does not touch pendingRename on a request failure for a workflow chat', async () => {
      const historyItem = createHistoryItem()
      const chat = createChat(historyItem, { name: '', isWorkflow: true })
      mockStream.mockRejectedValueOnce({
        error: { message: 'Generation failed', details: '', help: '' },
      })

      const { chatGenerationStore } = await import('@/store/chatGeneration')
      await chatGenerationStore._sendRequest(chat, 0, 0, createSendRequestData())

      expect(mockChatsStore.updateChatListItem).not.toHaveBeenCalledWith(
        expect.objectContaining({ pendingRename: expect.anything() })
      )
    })
  })
})
