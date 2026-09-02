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

import { A2UI_PROTOCOL_VERSION, CATALOG_ID } from '@/a2ui/config'
import type { A2uiEnvelope } from '@/a2ui/types'
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
  chats: [] as ChatListItem[],
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

const createEmptyStreamReader = () => ({
  read: vi
    .fn()
    .mockResolvedValueOnce({
      done: false,
      value: JSON.stringify({ generated_chunk: 'ok', generated: 'ok', last: true }),
    })
    .mockResolvedValue({ done: true, value: undefined }),
  cancel: vi.fn(),
})

const surfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [{ id: 'root', component: 'Text', text: 'Pick' }],
    },
  },
]

describe('chatGenerationStore a2ui chunk handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('accumulates a2ui envelopes on the history item preserving order', async () => {
    const historyItem = createHistoryItem({ role: 'Assistant' })
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const [first, second] = surfaceEnvelopes()

    await chatGenerationStore._handleChunk(historyItem, JSON.stringify({ a2ui: first }))
    await chatGenerationStore._handleChunk(historyItem, JSON.stringify({ a2ui: second }))

    expect(historyItem.a2uiEnvelopes).toHaveLength(2)
    expect(historyItem.a2uiEnvelopes?.[0]).toEqual(first)
    expect(historyItem.a2uiEnvelopes?.[1]).toEqual(second)
  })

  it('finishes the stream on a terminal chunk that also carries an a2ui envelope', async () => {
    const historyItem = createHistoryItem({ role: 'Assistant' })
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const [envelope] = surfaceEnvelopes()

    const { finalChunk } = await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({ a2ui: envelope, last: true })
    )

    expect(historyItem.a2uiEnvelopes).toHaveLength(1)
    expect(finalChunk).not.toBeNull()
    expect(historyItem.inProgress).toBe(false)
  })
})

describe('a2ui capability declaration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('every assistant chat request declares a2uiSupportedCatalogs', async () => {
    const historyItem = createHistoryItem({ role: 'Assistant', inProgress: false })
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat
    mockGetAssistant.mockResolvedValue({
      id: 'assistant-1',
      name: 'Assistant',
      context: [],
      tools: [],
    })
    mockStream.mockResolvedValueOnce(createEmptyStreamReader())

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore.createChatGeneration({ message: 'Hi', assistantId: 'assistant-1' })

    expect(mockStream).toHaveBeenCalledTimes(1)
    const body = mockStream.mock.calls[0][1] as Record<string, unknown>
    expect(body.a2uiSupportedCatalogs).toEqual([CATALOG_ID])
  })
})

describe('submitA2uiAction', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('pushes an optimistic chip and sends the action envelope + data model', async () => {
    const historyItem = createHistoryItem({
      role: 'Assistant',
      inProgress: false,
      a2uiEnvelopes: surfaceEnvelopes(),
    })
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat
    mockGetAssistant.mockResolvedValue({
      id: 'assistant-1',
      name: 'Assistant',
      context: [],
      tools: [],
    })
    mockStream.mockResolvedValueOnce(createEmptyStreamReader())

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore.submitA2uiAction('s1', 'approve', 'btn', { name: 'Ada' }, 'name: Ada')

    const lastGroup = chat.history.at(-1)
    const userMessage = lastGroup?.[0]
    expect(userMessage?.request).toBe('name: Ada')
    expect(userMessage?.a2uiAction?.action).toEqual({
      name: 'approve',
      surfaceId: 's1',
      sourceComponentId: 'btn',
    })
    expect(userMessage?.a2uiDataModel).toEqual({ name: 'Ada' })

    expect(mockStream).toHaveBeenCalledTimes(1)
    const body = mockStream.mock.calls[0][1] as Record<string, unknown>
    expect(body.a2uiAction).toEqual({
      version: A2UI_PROTOCOL_VERSION,
      action: { name: 'approve', surfaceId: 's1', sourceComponentId: 'btn' },
    })
    expect(body.a2uiDataModel).toEqual({ name: 'Ada' })
    expect(body.text).toBe('name: Ada')
    expect(body.a2uiSupportedCatalogs).toEqual([CATALOG_ID])
  })

  it('attributes the turn to the assistant that owns the surface, not the tail', async () => {
    const owner = createHistoryItem({
      role: 'Assistant',
      assistantId: 'asst-OWNER',
      a2uiEnvelopes: surfaceEnvelopes('surface-7'),
      inProgress: false,
    })
    const later = createHistoryItem({
      role: 'User',
      assistantId: 'asst-WRONG',
      request: 'unrelated',
      inProgress: false,
    })
    const chat = {
      id: 'chat-1',
      assistantIds: ['asst-OWNER'],
      assistantData: [],
      history: [[owner], [later]],
      initialAssistantId: 'asst-OWNER',
      isWorkflow: false,
    } as unknown as Conversation
    mockChatsStore.currentChat = chat
    mockGetAssistant.mockResolvedValue({ id: 'asst-OWNER', name: 'Owner', context: [], tools: [] })
    mockStream.mockResolvedValueOnce(createEmptyStreamReader())

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore.submitA2uiAction('surface-7', 'approve', 'btn', {}, 'approve')

    expect(mockGetAssistant).toHaveBeenCalledWith('asst-OWNER', expect.anything())
  })

  it('passes replaceHistoryIndex through as the turn to replace', async () => {
    const owner = createHistoryItem({
      role: 'Assistant',
      inProgress: false,
      a2uiEnvelopes: surfaceEnvelopes(),
    })
    const oldChip = createHistoryItem({ role: 'User', request: 'old answer', inProgress: false })
    const chat = {
      id: 'chat-1',
      assistantIds: ['assistant-1'],
      assistantData: [],
      history: [[owner], [oldChip]],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as unknown as Conversation
    mockChatsStore.currentChat = chat
    mockGetAssistant.mockResolvedValue({
      id: 'assistant-1',
      name: 'Assistant',
      context: [],
      tools: [],
    })
    mockStream.mockResolvedValueOnce(createEmptyStreamReader())

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore.submitA2uiAction('s1', 'approve', 'btn', {}, 'redo', 1)

    expect(mockStream).toHaveBeenCalledTimes(1)
    const body = mockStream.mock.calls[0][1] as Record<string, unknown>
    expect(body.historyIndex).toBe(1)
    // The new chip is appended to the replaced turn's group, not a new group.
    expect(chat.history).toHaveLength(2)
    expect(chat.history[1].at(-1)?.request).toBe('redo')
  })

  // `_handleRequestError` only covers failures AFTER the optimistic chip exists.
  // Anything that throws earlier (e.g. the assistant lookup) would otherwise
  // escape as an unhandled rejection into the fire-and-forget caller.
  it('reports a failure raised before the optimistic chip is created', async () => {
    const owner = createHistoryItem({
      role: 'Assistant',
      inProgress: false,
      a2uiEnvelopes: surfaceEnvelopes(),
    })
    mockChatsStore.currentChat = createChat(owner)
    mockGetAssistant.mockRejectedValue({ message: 'Assistant is gone' })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await expect(
      chatGenerationStore.submitA2uiAction('s1', 'approve', 'btn', {}, 'name: Ada')
    ).resolves.toBeUndefined()

    expect(mockStream).not.toHaveBeenCalled()
    expect(mockToasterError).toHaveBeenCalled()
    // No ghost turn is left behind.
    expect(mockChatsStore.currentChat?.history).toHaveLength(1)
  })
})

describe('a2ui optimistic rollback on error', () => {
  it('removes the optimistic chip turn and toasts when an a2ui submit fails', async () => {
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const formTurn = createHistoryItem({ role: 'Assistant', request: 'form' })
    const chip = createHistoryItem({
      role: 'User',
      request: 'name: Ada',
      a2uiAction: {
        version: A2UI_PROTOCOL_VERSION,
        action: { name: 'approve', surfaceId: 's1' },
      },
      inProgress: true,
    })
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [[formTurn], [chip]],
    } as unknown as Conversation

    chatGenerationStore._handleRequestError(chip, { message: 'Boom' }, new Date())

    expect(mockChatsStore.currentChat.history).toHaveLength(1)
    expect(mockChatsStore.currentChat.history[0][0]).toBe(formTurn)
    expect(mockToasterError).toHaveBeenCalled()
  })
})
