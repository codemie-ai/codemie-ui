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

const createChat = (historyItem: ChatMessage, isWorkflow = false): Conversation =>
  ({
    id: 'chat-1',
    history: [[historyItem]],
    isWorkflow,
  } as unknown as Conversation)

describe('chatGenerationStore._sendRequest response-dispatch failures', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('finalizes the message when the stream dispatch throws a non-abort error', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat

    mockStream.mockResolvedValue({
      read: vi.fn().mockRejectedValue(new Error('network error')),
      cancel: vi.fn(),
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await expect(chatGenerationStore._sendRequest(chat, 0, 0, {} as any)).resolves.toBeUndefined()

    expect(historyItem.inProgress).toBe(false)
    expect(historyItem.stream).toBeNull()
    expect(historyItem.response).toContain('Oops! Something went wrong')
    expect(typeof historyItem.processingTime).toBe('number')
  })

  it('finalizes the message when the non-stream dispatch cannot read the response body', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat

    mockStream.mockResolvedValue(new Response('not json at all', { status: 200 }))

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await expect(chatGenerationStore._sendRequest(chat, 0, 0, {} as any)).resolves.toBeUndefined()

    expect(historyItem.inProgress).toBe(false)
  })

  it.each([
    ['an HTTP error status', new Response('{}', { status: 500 })],
    ['an empty generated field', new Response(JSON.stringify({ generated: '' }), { status: 200 })],
  ])('finalizes the message when the non-stream response has %s', async (_label, response) => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat

    mockStream.mockResolvedValue(response)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await expect(chatGenerationStore._sendRequest(chat, 0, 0, {} as any)).resolves.toBeUndefined()

    expect(historyItem.inProgress).toBe(false)
    expect(historyItem.stream).toBeNull()
    expect(historyItem.response).toBe('Oops! Something went wrong')
  })

  it('finalizes the message when the request rejects with a falsy reason', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat

    mockStream.mockRejectedValue(undefined)

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await expect(chatGenerationStore._sendRequest(chat, 0, 0, {} as any)).resolves.toBeUndefined()

    expect(historyItem.inProgress).toBe(false)
    expect(historyItem.response).toContain('Oops! Something went wrong')
  })

  it('leaves abort handling untouched: no error text is written into the response', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat

    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    mockStream.mockResolvedValue({
      read: vi.fn().mockRejectedValue(abortError),
      cancel: vi.fn(),
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore._sendRequest(chat, 0, 0, {} as any)

    expect(historyItem.inProgress).toBe(false)
    expect(historyItem.response ?? '').not.toContain('Oops! Something went wrong')
  })

  it('keeps an already-delivered response when post-processing fails after the turn finished', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem, true)
    mockChatsStore.currentChat = chat

    mockStream.mockResolvedValue(
      new Response(JSON.stringify({ generated: 'done' }), { status: 200 })
    )
    mockChatsStore.getChat.mockImplementation(() => {
      throw new Error('workflow refresh failed')
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await expect(chatGenerationStore._sendRequest(chat, 0, 0, {} as any)).resolves.toBeUndefined()

    expect(historyItem.response).toBe('done')
    expect(historyItem.inProgress).toBe(false)
  })

  it('finalizes an A2UI turn even when it was already removed from the current chat', async () => {
    const historyItem = createHistoryItem({ a2uiAction: { surfaceId: 's1' } as any })
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = { id: 'other-chat', history: [] } as unknown as Conversation

    mockStream.mockResolvedValue({
      read: vi.fn().mockRejectedValue(new Error('network error')),
      cancel: vi.fn(),
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await expect(chatGenerationStore._sendRequest(chat, 0, 0, {} as any)).resolves.toBeUndefined()

    expect(mockToasterError).toHaveBeenCalled()
    expect(historyItem.inProgress).toBe(false)
    expect(historyItem.stream).toBeNull()
  })

  it('rethrows an abort error raised by the dispatch instead of funnelling it into the failure path', async () => {
    const historyItem = createHistoryItem()
    const chat = createChat(historyItem, true)
    mockChatsStore.currentChat = chat

    mockStream.mockResolvedValue(
      new Response(JSON.stringify({ generated: 'done' }), { status: 200 })
    )
    mockChatsStore.getChat.mockImplementation(() => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await expect(chatGenerationStore._sendRequest(chat, 0, 0, {} as any)).rejects.toThrow('aborted')

    expect(historyItem.response).toBe('done')
  })
})
