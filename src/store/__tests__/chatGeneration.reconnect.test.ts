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

import type { Conversation } from '@/types/entity/conversation'

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
  pollIncompleteChat: vi.fn(),
  stopChatCompletionPoll: vi.fn(),
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

const createMockChat = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-test-123',
  name: 'Test Conversation',
  assistantID: 'assistant-1',
  assistantIds: ['assistant-1'],
  assistantData: [],
  folder: '',
  isWorkflow: false,
  isInterrupted: false,
  history: [
    [
      {
        role: 'User',
        request: 'Hello',
        requestRaw: 'Hello',
        createdAt: '2026-04-30T10:00:00.000Z',
        inProgress: false,
        assistantId: 'assistant-1',
        assistant: { id: 'assistant-1', name: 'Assistant' },
        executionId: null,
      },
      {
        role: 'Assistant',
        request: 'Hello',
        requestRaw: 'Hello',
        response: undefined,
        createdAt: '2026-04-30T10:00:01.000Z',
        inProgress: true,
        assistantId: 'assistant-1',
        assistant: { id: 'assistant-1', name: 'Assistant' },
        executionId: null,
      },
    ],
  ],
  ...overrides,
})

describe('chatGenerationStore.reconnectChatStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips if chat has no in-progress message', async () => {
    const { chatGenerationStore } = await import('../chatGeneration')
    const chat = createMockChat()
    chat.history[0][1].inProgress = false

    await chatGenerationStore.reconnectChatStream(chat)
    expect(mockStream).not.toHaveBeenCalled()
  })

  it('skips if chat is workflow', async () => {
    const { chatGenerationStore } = await import('../chatGeneration')
    const chat = createMockChat({ isWorkflow: true })

    await chatGenerationStore.reconnectChatStream(chat)
    expect(mockStream).not.toHaveBeenCalled()
  })

  it('skips if already reconnecting or generating', async () => {
    const { chatGenerationStore } = await import('../chatGeneration')
    const chat = createMockChat()
    chatGenerationStore.chatAbortControllers[chat.id] = new AbortController()

    await chatGenerationStore.reconnectChatStream(chat)
    expect(mockStream).not.toHaveBeenCalled()

    delete chatGenerationStore.chatAbortControllers[chat.id]
  })

  it('attaches to stream endpoint and cleans up abort controller', async () => {
    const { chatGenerationStore } = await import('../chatGeneration')
    const chat = createMockChat()

    // Mock stream returning a reader with terminal chunk
    const chunkData = JSON.stringify({
      generated_chunk: 'Hello',
      last: true,
    })
    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunkData })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    }
    mockStream.mockResolvedValue(mockReader)

    await chatGenerationStore.reconnectChatStream(chat)

    expect(mockStream).toHaveBeenCalledWith(
      `v1/conversations/${chat.id}/stream`,
      undefined,
      expect.any(Object),
      'GET'
    )
    expect(chatGenerationStore.chatAbortControllers[chat.id]).toBeUndefined()
    expect(chat.history[0][1].inProgress).toBe(false)
    expect(mockChatsStore.pollIncompleteChat).not.toHaveBeenCalled()
  })

  it('triggers immediate pollIncompleteChat and preserves inProgress when stream closes without chunks', async () => {
    const { chatGenerationStore } = await import('../chatGeneration')
    const chat = createMockChat()

    // Mock stream returning a reader that closes immediately (empty stream)
    const mockReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
    }
    mockStream.mockResolvedValue(mockReader)

    await chatGenerationStore.reconnectChatStream(chat)

    expect(mockChatsStore.pollIncompleteChat).toHaveBeenCalledWith(chat.id, true)
    expect(chatGenerationStore.chatAbortControllers[chat.id]).toBeUndefined()
    expect(chat.history[0][1].inProgress).toBe(true)
  })

  it('falls back to pollIncompleteChat when streaming throws an error', async () => {
    const { chatGenerationStore } = await import('../chatGeneration')
    const chat = createMockChat()

    mockStream.mockRejectedValue(new Error('Network error'))

    await chatGenerationStore.reconnectChatStream(chat)

    expect(mockChatsStore.pollIncompleteChat).toHaveBeenCalledWith(chat.id, true)
    expect(chatGenerationStore.chatAbortControllers[chat.id]).toBeUndefined()
  })

  it('sets processingTime from server time_elapsed in final stream chunk', async () => {
    const { chatGenerationStore } = await import('../chatGeneration')
    const chat = createMockChat()
    chat.history[0][1].createdAt = '2026-09-09T12:25:00.000' // naive without Z

    const chunkData = JSON.stringify({
      generated_chunk: 'Hello',
      last: true,
      time_elapsed: 27.01,
    })
    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunkData })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    }
    mockStream.mockResolvedValue(mockReader)

    await chatGenerationStore.reconnectChatStream(chat)

    expect(chat.history[0][1].processingTime).toBe(27.01)
  })
})

describe('parseUtcDate', () => {
  it('appends Z to naive ISO datetime strings without timezone info', async () => {
    const { parseUtcDate } = await import('../chatGeneration')
    const parsed = parseUtcDate('2026-09-09T12:25:00.000000')
    expect(parsed.toISOString()).toBe('2026-09-09T12:25:00.000Z')
  })

  it('preserves existing Z or offset in ISO strings', async () => {
    const { parseUtcDate } = await import('../chatGeneration')
    const parsedZ = parseUtcDate('2026-09-09T12:25:00.000Z')
    expect(parsedZ.toISOString()).toBe('2026-09-09T12:25:00.000Z')

    const parsedOffset = parseUtcDate('2026-09-09T14:25:00.000+02:00')
    expect(parsedOffset.toISOString()).toBe('2026-09-09T12:25:00.000Z')
  })

  it('returns valid Date when input is empty or undefined', async () => {
    const { parseUtcDate } = await import('../chatGeneration')
    expect(parseUtcDate(undefined)).toBeInstanceOf(Date)
    expect(parseUtcDate('')).toBeInstanceOf(Date)
  })
})
