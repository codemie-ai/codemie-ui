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

import { responseReadyStore } from '@/store/responseReady'
import type { ChatMessage, Conversation } from '@/types/entity/conversation'

const mockChatsStore = {
  currentChat: null as Conversation | null,
  openedChatsHistory: [] as Conversation[],
  updateChatListItem: vi.fn(),
  updateChat: vi.fn(),
  getChat: vi.fn(),
  findChat: vi.fn(),
  getConversationName: vi.fn(),
  refreshWorkflowExecutionIds: vi.fn(),
  pollIncompleteChat: vi.fn(),
}

vi.mock('@/utils/api', () => ({
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Oops! Something went wrong',
  default: { stream: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: { getAssistant: vi.fn(), updateRecentAssistants: vi.fn() },
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    getExecutionStates: vi.fn(),
    updateWorkflowExecutionStateOutput: vi.fn(),
  },
}))

vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))

vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))

const createHistoryItem = (): ChatMessage =>
  ({
    id: 'm1',
    inProgress: true,
    stream: null,
    response: '',
    thoughts: [],
  } as unknown as ChatMessage)

const createChat = (isWorkflow = false): Conversation =>
  ({ id: 'c1', name: '', history: [], isWorkflow, isInterrupted: false } as unknown as Conversation)

const readerFrom = (...results: Array<Record<string, unknown> | Error>) => {
  const read = vi.fn()
  results.forEach((result) => {
    if (result instanceof Error) read.mockRejectedValueOnce(result)
    else read.mockResolvedValueOnce(result)
  })
  return { read, cancel: vi.fn() } as unknown as ReadableStreamDefaultReader
}

const finalChunk = {
  done: false,
  value: JSON.stringify({ generated_chunk: 'Hi', generated: 'Hi', last: true }),
}

describe('chatGenerationStore._handleStreamResponse response-ready signal', () => {
  let markSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
    markSpy = vi.spyOn(responseReadyStore, 'markResponseReady')
  })

  afterEach(() => {
    markSpy.mockRestore()
  })

  it('marks the response ready once after a successful stream', async () => {
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const reader = readerFrom(finalChunk, { done: true, value: undefined })

    const response = await chatGenerationStore._handleStreamResponse(
      reader,
      createHistoryItem(),
      createChat(),
      new Date()
    )

    expect(response.generated).toBe('Hi')
    expect(markSpy).toHaveBeenCalledTimes(1)
  })

  it('does not mark the response ready when the stream errors', async () => {
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const reader = readerFrom(Object.assign(new Error('network down'), { name: 'NetworkError' }))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      chatGenerationStore._handleStreamResponse(
        reader,
        createHistoryItem(),
        createChat(),
        new Date()
      )
    ).rejects.toThrow('network down')
    expect(markSpy).not.toHaveBeenCalled()
  })

  it.each([
    [
      'execution_error',
      { generated: 'Rate limit exceeded', last: true, execution_error: 'rate_limit_error' },
    ],
    ['error thought', { thought: { id: 't1', message: 'Blocked', error: true }, last: true }],
  ])('does not mark the response ready on a failed final chunk (%s)', async (_name, chunk) => {
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const reader = readerFrom({ done: false, value: JSON.stringify(chunk) })

    await chatGenerationStore._handleStreamResponse(
      reader,
      createHistoryItem(),
      createChat(),
      new Date()
    )

    expect(markSpy).not.toHaveBeenCalled()
  })

  it('does not mark the response ready when the user aborts', async () => {
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const reader = readerFrom(Object.assign(new Error('aborted'), { name: 'AbortError' }))

    const response = await chatGenerationStore._handleStreamResponse(
      reader,
      createHistoryItem(),
      createChat(),
      new Date()
    )

    expect(response.aborted).toBe(true)
    expect(markSpy).not.toHaveBeenCalled()
  })

  it('does not mark the response ready when a workflow generation is stopped', async () => {
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const reader = readerFrom(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const historyItem = createHistoryItem()

    const response = await chatGenerationStore._handleStreamResponse(
      reader,
      historyItem,
      createChat(true),
      new Date()
    )

    expect(response.aborted).toBe(true)
    expect(historyItem.generationStopped).toBe(true)
    expect(markSpy).not.toHaveBeenCalled()
  })
})
