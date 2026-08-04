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

describe('chatGenerationStore._handleGenerationStream', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('keeps draining the reader until done after the final chunk, instead of stopping early', async () => {
    const finalChunkValue = JSON.stringify({
      generated_chunk: 'world',
      generated: 'Hello world',
      last: true,
    })

    const read = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: finalChunkValue })
      // Server keeps the connection open past the final chunk (e.g. flushing
      // BackgroundTasks) — a correct client must keep calling read() here.
      .mockResolvedValueOnce({ done: false, value: '' })
      .mockResolvedValueOnce({ done: true, value: undefined })

    const reader = { read, cancel: vi.fn() } as unknown as ReadableStreamDefaultReader

    const historyItem = createHistoryItem()

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const response = await chatGenerationStore._handleGenerationStream(historyItem, reader)

    expect(response.generated).toBe('Hello world')
    // Regression guard: must not break() right after the final chunk — it has
    // to observe reader.read() resolve with done:true before returning.
    expect(read).toHaveBeenCalledTimes(3)
    expect(historyItem.inProgress).toBe(false)
  })

  it('does not reprocess chunks received after the final chunk', async () => {
    const finalChunkValue = JSON.stringify({
      generated_chunk: 'world',
      generated: 'Hello world',
      last: true,
    })

    const read = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: finalChunkValue })
      .mockResolvedValueOnce({ done: false, value: JSON.stringify({ generated_chunk: 'stray' }) })
      .mockResolvedValueOnce({ done: true, value: undefined })

    const reader = { read, cancel: vi.fn() } as unknown as ReadableStreamDefaultReader

    const historyItem = createHistoryItem()

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const response = await chatGenerationStore._handleGenerationStream(historyItem, reader)

    expect(response.generated).toBe('Hello world')
    expect(historyItem.stream?.getStream()).not.toContain('stray')
  })

  it('CR-001: returns the already-completed response instead of throwing when the drain phase errors after the final chunk', async () => {
    const finalChunkValue = JSON.stringify({
      generated_chunk: 'world',
      generated: 'Hello world',
      last: true,
    })

    const drainError = new Error('socket hang up')
    drainError.name = 'Error'

    const read = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: finalChunkValue })
      // Connection drops while draining to `done` — the response was already
      // fully received and must not be discarded.
      .mockRejectedValueOnce(drainError)

    const reader = { read, cancel: vi.fn() } as unknown as ReadableStreamDefaultReader

    const historyItem = createHistoryItem()

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const response = await chatGenerationStore._handleGenerationStream(historyItem, reader)

    expect(response.generated).toBe('Hello world')
  })

  it('CR-001: still rethrows a non-abort error that occurs before the final chunk is received', async () => {
    const preFinalError = new Error('network error')
    preFinalError.name = 'Error'

    const read = vi.fn().mockRejectedValueOnce(preFinalError)
    const reader = { read, cancel: vi.fn() } as unknown as ReadableStreamDefaultReader

    const historyItem = createHistoryItem()

    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await expect(chatGenerationStore._handleGenerationStream(historyItem, reader)).rejects.toThrow(
      'network error'
    )
  })

  it('CR-001: returns the already-completed response when user aborts during drain phase', async () => {
    const finalChunkValue = JSON.stringify({
      generated_chunk: 'world',
      generated: 'Hello world',
      last: true,
    })

    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'

    const read = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: finalChunkValue })
      // User hits Stop during drain (after final chunk received) — the response
      // was already fully received and must not be discarded.
      .mockRejectedValueOnce(abortError)

    const reader = { read, cancel: vi.fn() } as unknown as ReadableStreamDefaultReader

    const historyItem = createHistoryItem()

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const response = await chatGenerationStore._handleGenerationStream(historyItem, reader)

    expect(response.generated).toBe('Hello world')
  })
})
