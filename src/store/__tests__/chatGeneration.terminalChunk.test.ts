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

const createChat = (historyItem: ChatMessage): Conversation =>
  ({
    id: 'chat-1',
    history: [[historyItem]],
    isWorkflow: false,
  } as unknown as Conversation)

const handleChunk = async (
  historyItem: ChatMessage,
  chunk: Record<string, unknown>
): Promise<{ finalChunk: any; incompleteChunk: string | null }> => {
  const { chatGenerationStore } = await import('@/store/chatGeneration')
  return chatGenerationStore._handleChunk(historyItem, JSON.stringify(chunk))
}

describe('chatGenerationStore._handleChunk terminal-chunk outcome', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('treats an explicitly successful terminal chunk as success', async () => {
    const historyItem = createHistoryItem()

    await handleChunk(historyItem, {
      generated_chunk: 'x',
      generated: 'Hello',
      last: true,
      success: true,
    })

    expect(mockToasterError).not.toHaveBeenCalled()
    expect(historyItem.inProgress).toBe(false)
  })

  it('toasts agent_error.message when the terminal chunk reports success:false with an execution_error', async () => {
    const historyItem = createHistoryItem()

    await handleChunk(historyItem, {
      last: true,
      success: false,
      execution_error: 'agent_token_limit',
      agent_error: { message: 'Token limit reached' },
      generated: 'partial model answer',
    })

    expect(mockToasterError).toHaveBeenCalledWith('Token limit reached')
  })

  it('never shows generated text as the error when agent_error is absent', async () => {
    const historyItem = createHistoryItem()

    await handleChunk(historyItem, {
      last: true,
      success: false,
      execution_error: 'internal_error',
      generated: 'partial model answer',
    })

    expect(mockToasterError).toHaveBeenCalledWith('Oops! Something went wrong')
  })

  it('falls back to the default error message when success:false carries no text', async () => {
    const historyItem = createHistoryItem()

    await handleChunk(historyItem, { last: true, success: false, generated: '' })

    expect(mockToasterError).toHaveBeenCalledWith('Oops! Something went wrong')
    expect(historyItem.inProgress).toBe(false)
  })

  it('treats a terminal chunk without a success flag and without an execution_error as success', async () => {
    const historyItem = createHistoryItem()

    await handleChunk(historyItem, { last: true, generated: 'Answer' })

    expect(mockToasterError).not.toHaveBeenCalled()
    expect(historyItem.inProgress).toBe(false)
  })

  it('surfaces an error when an execution_error is present even though success is unset', async () => {
    const historyItem = createHistoryItem()

    await handleChunk(historyItem, {
      last: true,
      execution_error: 'tool_failure',
      agent_error: { message: 'failed' },
    })

    expect(mockToasterError).toHaveBeenCalledWith('failed')
  })

  it('still finalizes a successful terminal chunk that generated no text', async () => {
    const historyItem = createHistoryItem()

    const { finalChunk } = await handleChunk(historyItem, { last: true, generated: '' })

    expect(finalChunk).not.toBeNull()
    expect(historyItem.inProgress).toBe(false)
    expect(mockToasterError).not.toHaveBeenCalled()
  })

  it('prefers agent_error.message over generated text and never leaks error_details', async () => {
    const historyItem = createHistoryItem()

    await handleChunk(historyItem, {
      last: true,
      success: false,
      agent_error: { message: 'Agent failed' },
      generated: 'raw',
      error_details: { traceback: 'secret' },
    })

    expect(mockToasterError).toHaveBeenCalledTimes(1)
    const [toastArg] = mockToasterError.mock.calls[0]
    expect(toastArg).toBe('Agent failed')
    expect(toastArg).not.toContain('raw')
    expect(toastArg).not.toContain('secret')
  })

  it('flags the in-progress thought as errored so the failure stays visible in the thought list', async () => {
    const historyItem = createHistoryItem({
      thoughts: [{ id: 't1', in_progress: true, message: '' } as any],
    })

    await handleChunk(historyItem, {
      last: true,
      success: false,
      execution_error: 'agent_token_limit',
      generated: 'Token limit reached',
    })

    expect(historyItem.thoughts![0].error).toBeTruthy()
  })

  it('flags the nested in-progress child thought, not an unrelated finished top-level thought', async () => {
    const historyItem = createHistoryItem({
      thoughts: [
        {
          id: 'parent',
          in_progress: false,
          message: '',
          children: [{ id: 'child', in_progress: true, message: '' }],
        } as any,
      ],
    })

    await handleChunk(historyItem, {
      last: true,
      success: false,
      execution_error: 'agent_token_limit',
      generated: 'Token limit reached',
    })

    expect(historyItem.thoughts![0].error).toBeUndefined()
    expect((historyItem.thoughts![0] as any).children[0].error).toBeTruthy()
  })

  it('does not guess a failed thought when none is in progress (the backend flags it)', async () => {
    const historyItem = createHistoryItem({
      thoughts: [
        { id: 't1', in_progress: false, message: 'done' } as any,
        {
          id: 't2',
          in_progress: false,
          message: '',
          children: [{ id: 'c1', in_progress: false, message: '' }],
        } as any,
      ],
    })

    await handleChunk(historyItem, {
      last: true,
      success: false,
      execution_error: 'agent_token_limit',
      generated: 'Token limit reached',
    })

    const [t1, t2] = historyItem.thoughts as any[]
    expect(t1.error).toBeUndefined()
    expect(t2.error).toBeUndefined()
    expect(t2.children[0].error).toBeUndefined()
    expect(mockToasterError).toHaveBeenCalledTimes(1)
  })

  it('keeps the error the backend set on a finished thought through the terminal chunk', async () => {
    const historyItem = createHistoryItem({
      thoughts: [{ id: 't1', in_progress: false, message: 'cut', error: true } as any],
    })

    await handleChunk(historyItem, {
      last: true,
      success: false,
      execution_error: 'agent_token_limit',
      generated: 'Token limit reached',
    })

    expect(historyItem.thoughts![0].error).toBeTruthy()
  })

  it('flags nothing on a successful terminal chunk with a finished thought', async () => {
    const historyItem = createHistoryItem({
      thoughts: [{ id: 't1', in_progress: false, message: 'done' } as any],
    })

    await handleChunk(historyItem, { last: true, success: true, generated: 'Hello' })

    expect(historyItem.thoughts![0].error).toBeUndefined()
    expect(mockToasterError).not.toHaveBeenCalled()
  })

  it('flags every in-progress thought of parallel sub-agents, nested ones included', async () => {
    const historyItem = createHistoryItem({
      thoughts: [
        { id: 'done', in_progress: false, message: '' } as any,
        {
          id: 'agent-a',
          in_progress: true,
          message: '',
          children: [{ id: 'a-child', in_progress: true, message: '' }],
        } as any,
        { id: 'agent-b', in_progress: true, message: '' } as any,
      ],
    })

    await handleChunk(historyItem, {
      last: true,
      success: false,
      execution_error: 'agent_token_limit',
      generated: 'Token limit reached',
    })

    const [done, agentA, agentB] = historyItem.thoughts as any[]
    expect(done.error).toBeUndefined()
    expect(agentA.error).toBeTruthy()
    expect(agentA.children[0].error).toBeTruthy()
    expect(agentB.error).toBeTruthy()
  })

  it('does not throw when an error terminal chunk arrives with no thoughts at all', async () => {
    const historyItem = createHistoryItem()

    await expect(
      handleChunk(historyItem, { last: true, success: false, generated: '' })
    ).resolves.toBeDefined()

    expect(mockToasterError).toHaveBeenCalledTimes(1)
    expect(historyItem.thoughts).toBeUndefined()
  })

  it('leaves the terminal chunk shape and capturedStreamText handling unchanged', async () => {
    const fakeStream = {
      stream: 'Hel',
      streamBuffer: 'lo',
      push: vi.fn(),
      finish: vi.fn(),
    }
    const historyItem = createHistoryItem({ stream: fakeStream as any })

    const { finalChunk, incompleteChunk } = await handleChunk(historyItem, {
      generated_chunk: 'x',
      generated: 'Hello',
      last: true,
      success: true,
    })

    expect(finalChunk.last).toBe(true)
    expect(finalChunk.capturedStreamText).toBe('Hello')
    expect(incompleteChunk).toBeNull()
    expect(fakeStream.finish).toHaveBeenCalledTimes(1)
  })
})

describe('chatGenerationStore._handleStreamResponse on an error terminal chunk', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    chatGenerationStore.chatAbortControllers = {}
  })

  it('delivers the error text, finalizes the turn and keeps the thought error past finishThoughts', async () => {
    const errorText = 'Agent run failed: token limit reached'
    const historyItem = createHistoryItem({
      thoughts: [
        {
          id: 't1',
          in_progress: true,
          message: 'Calling the sub-agent',
          children: [{ id: 't2', in_progress: true, message: 'Nested sub-agent' }],
        },
      ],
    })
    const chat = createChat(historyItem)
    mockChatsStore.currentChat = chat

    const read = vi
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: JSON.stringify({
          generated: 'partial model answer',
          agent_error: { message: errorText },
          last: true,
          success: false,
          execution_error: 'AGENT_TOKEN_LIMIT',
        }),
      })
      .mockResolvedValueOnce({ done: true, value: undefined })

    const reader = { read, cancel: vi.fn() } as unknown as ReadableStreamDefaultReader

    const { chatGenerationStore } = await import('@/store/chatGeneration')
    await chatGenerationStore._handleStreamResponse(
      reader,
      historyItem,
      chat,
      new Date(Date.now() - 1000)
    )

    expect(historyItem.response).toBe('partial model answer')
    expect(historyItem.inProgress).toBe(false)
    expect(historyItem.stream).toBeNull()
    expect(historyItem.processingTime).toBeGreaterThan(0)
    expect(mockToasterError).toHaveBeenCalledWith(errorText)

    // finishThoughts() only clears in_progress, so the flag set before it must survive —
    // which also pins the call order: flagging after finishThoughts would find nothing live.
    const [topThought] = historyItem.thoughts!
    expect(topThought.in_progress).toBe(false)
    expect(topThought.error).toBe(errorText)
    expect(topThought.children![0].error).toBe(errorText)
  })
})
