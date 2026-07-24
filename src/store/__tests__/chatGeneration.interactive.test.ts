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

import type { Conversation, ChatMessage, ChatListItem } from '@/types/entity/conversation'
import type { InteractiveResponse } from '@/types/entity/interactive'

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

const sampleResponse: InteractiveResponse = {
  request_id: 'r1',
  kind: 'action',
  payload: { action: 'approve' },
}

describe('chatGenerationStore interactive elements', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('stores interactive_request chunk on the history item', async () => {
    const historyItem = createHistoryItem({ role: 'Assistant' })
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({
        interactive_request: {
          request_id: 'r1',
          surface: [{ type: 'button', id: 'ok', label: 'OK' }],
        },
      })
    )
    expect(historyItem.interactiveRequest?.request_id).toBe('r1')
  })

  it('submitInteractiveResponse pushes chip message and sends structured payload', async () => {
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
    await chatGenerationStore.submitInteractiveResponse(sampleResponse, '✓ Approve')

    const lastGroup = chat.history.at(-1)
    const userMessage = lastGroup?.[0]
    expect(userMessage?.interactiveResponse?.request_id).toBe('r1')
    expect(userMessage?.request).toBe('✓ Approve')

    expect(mockStream).toHaveBeenCalledTimes(1)
    const body = mockStream.mock.calls[0][1] as Record<string, unknown>
    expect(body.interactiveResponse).toEqual(sampleResponse)
    expect(body.text).toBe('✓ Approve')
  })

  it('isInteractiveRequestAnswered derives state from history', async () => {
    const { isInteractiveRequestAnswered } = await import('@/utils/interactive')
    const answered = createHistoryItem({
      role: 'User',
      interactiveResponse: sampleResponse,
    })
    const chatWithAnswer = createChat(answered)
    const chatWithout = createChat(createHistoryItem())
    expect(isInteractiveRequestAnswered(chatWithAnswer, 'r1')).toBe(true)
    expect(isInteractiveRequestAnswered(chatWithout, 'r1')).toBe(false)
  })
})

describe('submitInteractiveResponse assistantId resolution', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('resolves assistantId from the message owning the request_id, not the tail', async () => {
    const owner = createHistoryItem({
      role: 'Assistant',
      assistantId: 'asst-OWNER',
      interactiveRequest: {
        request_id: 'r1',
        surface: [{ type: 'button', id: 'ok', label: 'OK' }],
      },
      inProgress: false,
    })
    const laterChip = createHistoryItem({
      role: 'User',
      assistantId: 'asst-WRONG',
      request: 'unrelated',
      inProgress: false,
    })
    const chat = {
      id: 'chat-1',
      assistantIds: ['asst-OWNER'],
      assistantData: [],
      history: [[owner], [laterChip]],
      initialAssistantId: 'asst-OWNER',
      isWorkflow: false,
    } as unknown as Conversation
    mockChatsStore.currentChat = chat
    mockGetAssistant.mockResolvedValue({ id: 'asst-OWNER', name: 'Owner', context: [], tools: [] })
    mockStream.mockResolvedValueOnce(createEmptyStreamReader())

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore.submitInteractiveResponse(sampleResponse, '✓ OK')

    expect(mockGetAssistant).toHaveBeenCalledWith('asst-OWNER', expect.anything())
  })
})

describe('interactive optimistic rollback on error', () => {
  it('removes the optimistic chip turn and toasts the error when an interactive submit fails', async () => {
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const formTurn = createHistoryItem({ role: 'Assistant', request: 'form' })
    const chip = createHistoryItem({
      role: 'User',
      request: '✓ Approve',
      interactiveResponse: sampleResponse,
      inProgress: true,
    })
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [[formTurn], [chip]],
    } as unknown as Conversation

    chatGenerationStore._handleRequestError(chip, { message: 'Boom' }, new Date())

    // The optimistic chip turn is dropped entirely (no stray plain-text ghost),
    // leaving only the form turn, and the error surfaces via a toast.
    expect(mockChatsStore.currentChat.history).toHaveLength(1)
    expect(mockChatsStore.currentChat.history[0][0]).toBe(formTurn)
    expect(mockToasterError).toHaveBeenCalled()
  })
})

describe('processing time on the streamed finalization path', () => {
  const createStreamReader = (chunk: Record<string, unknown>) => ({
    read: vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: JSON.stringify(chunk) })
      .mockResolvedValue({ done: true, value: undefined }),
    cancel: vi.fn(),
  })

  it('records processingTime for an interactive-only turn that carries no text', async () => {
    const historyItem = createHistoryItem({ role: 'Assistant' })
    const chat = createChat(historyItem)
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleStreamResponse(
      createStreamReader({ generated: '', generated_chunk: '', last: true }) as never,
      historyItem,
      chat,
      new Date()
    )

    expect(typeof historyItem.processingTime).toBe('number')
    expect(historyItem.inProgress).toBe(false)
  })

  it('still records processingTime for a regular text response', async () => {
    const historyItem = createHistoryItem({ role: 'Assistant' })
    const chat = createChat(historyItem)
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleStreamResponse(
      createStreamReader({
        generated: 'Hi there',
        generated_chunk: 'Hi there',
        last: true,
      }) as never,
      historyItem,
      chat,
      new Date()
    )

    expect(historyItem.response).toBe('Hi there')
    expect(typeof historyItem.processingTime).toBe('number')
  })

  it('leaves processingTime unset when the stream ends without a terminal chunk', async () => {
    const historyItem = createHistoryItem({ role: 'Assistant' })
    const chat = createChat(historyItem)
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    // A server-side cut, proxy timeout or dropped connection ends the reader without ever
    // sending `last: true`. Such a turn never finished, so it must not be labelled as if
    // it had — otherwise a truncated bubble is indistinguishable from a completed one.
    await chatGenerationStore._handleStreamResponse(
      {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        cancel: vi.fn(),
      } as never,
      historyItem,
      chat,
      new Date()
    )

    expect(historyItem.processingTime).toBeUndefined()
  })
})

describe('_handleChunk stream termination', () => {
  it('finishes the stream on a terminal chunk that also carries an interactive request', async () => {
    const historyItem = createHistoryItem({ role: 'Assistant' })
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    const { finalChunk } = await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({
        interactive_request: {
          request_id: 'r1',
          surface: [{ type: 'button', id: 'ok', label: 'OK' }],
        },
        last: true,
      })
    )

    expect(historyItem.interactiveRequest?.request_id).toBe('r1')
    expect(finalChunk).not.toBeNull()
    expect(historyItem.inProgress).toBe(false)
  })
})
