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

import { GENERATION_CANCELLED_MESSAGE } from '@/constants/chats'
import { TOOL_CALL_DENIED_MESSAGE, ToolCallAction } from '@/types/chatGeneration'
import type { ChatMessage, Conversation } from '@/types/entity/conversation'
import api from '@/utils/api'
import Stream from '@/utils/stream'
import toaster from '@/utils/toaster'

import {
  RESUME_ERRORS,
  s5BatchPausedConversation,
  s5FirstPendingId,
  s5SecondStepId,
} from './fixtures/toolCallResume.fixtures'

const mockChatsStore = {
  currentChat: null as Conversation | null,
  getChat: vi.fn(),
  updateChatListItem: vi.fn(),
}

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj), ref: vi.fn((v) => v) }))
vi.mock('@/utils/api', () => ({
  default: { stream: vi.fn(), put: vi.fn(), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Error',
}))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getAssistant: vi.fn(), updateRecentAssistants: vi.fn() },
}))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn() } }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/utils/stream', () => ({ default: vi.fn(), streamChunkToObject: vi.fn() }))
vi.mock('@/utils/chatHelpers', () => ({ transformChatHistoryFEtoBE: vi.fn(() => []) }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/constants', () => ({ ROLE_USER: 'User' }))

const PAUSED_RESPONSE = 'Paused response text'
const WAITING_STEP = {
  aborted: false,
  interrupted: true,
  in_progress: false,
  message: 'Tool call is waiting for user approval.',
}
const ALLOWED_STEP = { aborted: false, interrupted: false, in_progress: true, message: '' }
const DENIED_STEP = {
  aborted: true,
  interrupted: false,
  in_progress: false,
  message: TOOL_CALL_DENIED_MESSAGE,
}

const makeChat = (): Conversation => ({
  id: 'chat-1',
  assistantIds: ['assistant-1'],
  assistantData: [],
  history: [
    [
      {
        role: 'Assistant',
        createdAt: '2026-01-01T00:00:00.000Z',
        inProgress: false,
        assistantId: 'assistant-1',
        assistant: { id: 'assistant-1', name: 'A' },
        executionId: null,
        response: PAUSED_RESPONSE,
        thoughts: structuredClone(s5BatchPausedConversation.thoughts) as any,
      } as ChatMessage,
    ],
  ],
})

const findStep = (chat: Conversation, id: string) => {
  const walk = (list: any[]): any => {
    for (const t of list) {
      if (t.id === id) return t
      const sub = walk(t.children ?? [])
      if (sub) return sub
    }
    return null
  }
  return walk(chat.history[0][0].thoughts ?? [])
}

const httpError = (status: number, message: string | null) => ({
  error: { message, details: null, help: null },
  status,
})
const backendError = ({ status, message }: { status: number; message: string }) =>
  httpError(status, message)

const errorToasts = () => vi.mocked(toaster.error).mock.calls.map((c) => c[0])
const tick = () =>
  new Promise((r) => {
    setTimeout(r, 0)
  })

type Row = { name: string; error: any; toast: string; action: 'refetch' | 'restore' }

let chatGenerationStore: typeof import('@/store/chatGeneration').chatGenerationStore
let RESUME_FALLBACK_ERROR_MESSAGE: string
let RESUME_REFETCH_FAILED_MESSAGE: string

const loadStore = async () => {
  const mod = await import('@/store/chatGeneration')
  chatGenerationStore = mod.chatGenerationStore
  RESUME_FALLBACK_ERROR_MESSAGE = mod.RESUME_FALLBACK_ERROR_MESSAGE
  RESUME_REFETCH_FAILED_MESSAGE = mod.RESUME_REFETCH_FAILED_MESSAGE
  chatGenerationStore.chatAbortControllers = {}
  chatGenerationStore.abortRequests = {}
  chatGenerationStore.toolCallChoices = {}
  mockChatsStore.getChat.mockResolvedValue({})
}

// Allow the first step, deny the second: the second click sends the batch.
const decideBoth = async () => {
  await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.ALLOW)
  return chatGenerationStore.decideToolCall(s5SecondStepId, ToolCallAction.DENY)
}

const expectRestored = (chat: Conversation) => {
  expect(findStep(chat, s5FirstPendingId)).toMatchObject(WAITING_STEP)
  expect(findStep(chat, s5SecondStepId)).toMatchObject(WAITING_STEP)
  expect(chatGenerationStore.toolCallChoices).toEqual({})
  expect(chat.history[0][0].inProgress).toBe(false)
  expect(chat.history[0][0].response).toBe(PAUSED_RESPONSE)
}

describe('resume errors before the response headers', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    await loadStore()
  })

  const runResume = async (error: any) => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    vi.mocked(api.stream).mockRejectedValueOnce(error)
    await decideBoth()
    return chat
  }

  const E = RESUME_ERRORS
  const rows: Row[] = [
    {
      name: '404 no pending tool call',
      error: backendError(E.NO_PENDING),
      toast: E.NO_PENDING.message,
      action: 'refetch',
    },
    {
      name: '409 decisions mismatch',
      error: backendError(E.DECISIONS_MISMATCH),
      toast: E.DECISIONS_MISMATCH.message,
      action: 'refetch',
    },
    {
      name: '409 waiting for another assistant',
      error: backendError(E.OTHER_ROOT_ASSISTANT),
      toast: E.OTHER_ROOT_ASSISTANT.message,
      action: 'restore',
    },
    {
      name: '422 not supported',
      error: backendError(E.UNSUPPORTED),
      toast: E.UNSUPPORTED.message,
      action: 'restore',
    },
    {
      name: '422 not streamed',
      error: backendError(E.NOT_STREAMED),
      toast: E.NOT_STREAMED.message,
      action: 'restore',
    },
    {
      name: '401',
      error: httpError(401, 'Unauthorized'),
      toast: 'Unauthorized',
      action: 'restore',
    },
    { name: '403', error: httpError(403, 'Forbidden'), toast: 'Forbidden', action: 'restore' },
    {
      name: 'other 4xx (400)',
      error: httpError(400, 'Bad request'),
      toast: 'Bad request',
      action: 'restore',
    },
    {
      name: 'unknown 409 message',
      error: httpError(409, 'Some other conflict'),
      toast: 'Some other conflict',
      action: 'restore',
    },
    {
      name: '4xx without error.message',
      error: { detail: 'x', status: 422 },
      toast: '__fallback__',
      action: 'restore',
    },
    {
      name: '5xx',
      error: httpError(500, 'Internal error'),
      toast: '__fallback__',
      action: 'refetch',
    },
    {
      name: 'no status (network failure)',
      error: new TypeError('Failed to fetch'),
      toast: '__fallback__',
      action: 'refetch',
    },
    {
      name: 'no status (non-JSON body)',
      error: Object.assign(new SyntaxError('Unexpected token <'), { status: 400 }),
      toast: '__fallback__',
      action: 'refetch',
    },
  ]

  it.each(rows)('$name -> $action', async ({ error, toast, action }) => {
    const chat = await runResume(error)
    const item = chat.history[0][0]
    const expectedToast = toast === '__fallback__' ? RESUME_FALLBACK_ERROR_MESSAGE : toast

    expect(api.stream).toHaveBeenCalledOnce()
    expect(vi.mocked(api.stream).mock.calls[0][4]).toEqual({ errorToast: false })
    expect(errorToasts()).toEqual([expectedToast])
    expect(item.response).toBe(PAUSED_RESPONSE)
    expect(item.inProgress).toBe(false)

    if (action === 'refetch') {
      expect(mockChatsStore.getChat).toHaveBeenCalledWith('chat-1')
      expect(chatGenerationStore.chatAbortControllers['chat-1']).toBeUndefined()
    } else {
      expect(mockChatsStore.getChat).not.toHaveBeenCalled()
      expectRestored(chat)
    }
  })

  it('clears auth prompts before a refetch', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const item = chat.history[0][0] as any
    vi.mocked(api.stream).mockImplementationOnce(async () => {
      item.jiraAuthPrompt = { x: 1 }
      throw backendError(RESUME_ERRORS.NO_PENDING)
    })
    mockChatsStore.getChat.mockImplementationOnce(async () => {
      expect(item.inProgress).toBe(false)
      expect(item.jiraAuthPrompt).toBeNull()
      return {}
    })

    await decideBoth()

    expect(mockChatsStore.getChat).toHaveBeenCalledOnce()
  })

  it('a failed refetch toasts and restores every step of the batch', async () => {
    mockChatsStore.getChat.mockRejectedValueOnce(new Error('network'))

    const chat = await runResume(backendError(RESUME_ERRORS.NO_PENDING))

    expect(errorToasts()).toEqual([RESUME_ERRORS.NO_PENDING.message, RESUME_REFETCH_FAILED_MESSAGE])
    expectRestored(chat)
  })

  it('skips the refetch when the chat is no longer current', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    vi.mocked(api.stream).mockImplementationOnce(async () => {
      mockChatsStore.currentChat = { ...makeChat(), id: 'chat-2' }
      throw backendError(RESUME_ERRORS.NO_PENDING)
    })

    await decideBoth()

    expect(mockChatsStore.getChat).not.toHaveBeenCalled()
    expect(errorToasts()).toEqual([RESUME_ERRORS.NO_PENDING.message])
    expect(chat.history[0][0].inProgress).toBe(false)
  })

  it("deletes the controller entry only while it is this request's controller", async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const otherController = new AbortController()
    vi.mocked(api.stream).mockImplementationOnce(async () => {
      chatGenerationStore.chatAbortControllers['chat-1'] = otherController
      throw backendError(RESUME_ERRORS.NO_PENDING)
    })

    await decideBoth()

    expect(mockChatsStore.getChat).toHaveBeenCalledOnce()
    expect(chatGenerationStore.chatAbortControllers['chat-1']).toBe(otherController)
  })

  it('a pre-header abort shows no toast and refetches', async () => {
    const chat = await runResume(Object.assign(new Error('aborted'), { name: 'AbortError' }))

    expect(errorToasts()).toEqual([])
    expect(chat.history[0][0].inProgress).toBe(false)
    expect(chat.history[0][0].response).toBe(PAUSED_RESPONSE)
    expect(mockChatsStore.getChat).toHaveBeenCalledWith('chat-1')
  })

  it('waits for a pending Stop; a Stop during the wait cancels the send and refetches after it settles (AC6, AC13)', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    let settleAbort!: () => void
    chatGenerationStore.abortRequests['chat-1'] = new Promise<void>((resolve) => {
      settleAbort = resolve
    })

    const sendPromise = decideBoth()
    await tick()
    expect(findStep(chat, s5SecondStepId)).toMatchObject(DENIED_STEP)
    expect(chat.history[0][0].inProgress).toBe(true)
    chatGenerationStore.chatAbortControllers['chat-1'].abort()
    await tick()
    expect(api.stream).not.toHaveBeenCalled()
    expect(mockChatsStore.getChat).not.toHaveBeenCalled()

    settleAbort()
    await sendPromise

    expect(api.stream).not.toHaveBeenCalled()
    expect(errorToasts()).toEqual([])
    expect(chat.history[0][0].inProgress).toBe(false)
    expect(chat.history[0][0].response).toBe(PAUSED_RESPONSE)
    expect(mockChatsStore.getChat).toHaveBeenCalledWith('chat-1')
  })

  it('sends once the pending Stop has settled without an abort', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    chatGenerationStore.abortRequests['chat-1'] = Promise.reject(new Error('abort failed'))
    vi.mocked(api.stream).mockRejectedValueOnce(backendError(RESUME_ERRORS.UNSUPPORTED))

    await decideBoth()

    expect(api.stream).toHaveBeenCalledOnce()
    expect(errorToasts()).toEqual([RESUME_ERRORS.UNSUPPORTED.message])
  })

  it('non-resume requests keep the generic error path and default toast', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    vi.mocked(api.stream).mockRejectedValueOnce(httpError(500, 'boom'))

    await chatGenerationStore._sendRequest(chat, 0, 0, { conversationId: 'chat-1' } as any)

    expect(vi.mocked(api.stream).mock.calls[0][4]).toBeUndefined()
    expect(chat.history[0][0].response).toContain('boom')
    expect(mockChatsStore.getChat).not.toHaveBeenCalled()
  })
})

describe('resume outcomes after the request was sent', () => {
  const PARTIAL_TEXT = 'partial streamed text'
  const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' })

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    await loadStore()
    vi.mocked(Stream).mockImplementation(function () {
      return {
        isStreaming: false,
        notification: null,
        start: vi.fn(),
        finish: vi.fn(),
        getStream: vi.fn(() => PARTIAL_TEXT),
      }
    } as any)
  })

  const setup = () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    return { chat, item: chat.history[0][0] }
  }

  const readerOf = (read: () => Promise<any>) => ({ read: vi.fn(read) } as any)

  it('a gate payload shows the gate UI, keeps the response and restores the batch (AC14)', async () => {
    const { chat, item } = setup()
    vi.mocked(api.stream).mockRejectedValueOnce({
      error: 'jira_auth_required',
      setting_id: 'setting-1',
      integration_name: 'Jira',
    })

    await decideBoth()

    expect(item.jiraAuthPrompt).toEqual({ settingId: 'setting-1', integrationName: 'Jira' })
    expectRestored(chat)
    expect(errorToasts()).toEqual([])
    expect(mockChatsStore.getChat).not.toHaveBeenCalled()
  })

  it('a stream that throws after a 200 is an ordinary turn error: no restore, no refetch (AC8)', async () => {
    const { chat, item } = setup()
    vi.mocked(api.stream).mockResolvedValueOnce(
      readerOf(() => Promise.reject(new TypeError('network')))
    )

    // The response-handling failure goes to the ordinary failure path (EPMCDME-14855): the turn
    // ends with the error text, and the resume undo never runs.
    await decideBoth()

    expect(errorToasts()).toEqual([])
    expect(mockChatsStore.getChat).not.toHaveBeenCalled()
    expect(item.response).not.toBe(PAUSED_RESPONSE)
    expect(item.response).toBeTruthy()
    expect(item.inProgress).toBe(false)
    // The decided steps are not restored to waiting; the ended turn stops the allowed one spinning.
    expect(findStep(chat, s5FirstPendingId)).toMatchObject({
      ...ALLOWED_STEP,
      in_progress: false,
    })
    expect(findStep(chat, s5SecondStepId)).toMatchObject(DENIED_STEP)
  })

  it('a stream with a terminal chunk finishes normally without settling', async () => {
    const { chat, item } = setup()
    const reads = [{ done: false, value: 'chunk' }, { done: true }]
    vi.mocked(api.stream).mockResolvedValueOnce(readerOf(() => Promise.resolve(reads.shift())))
    vi.spyOn(chatGenerationStore, '_processStreamChunk').mockImplementation(
      async (_item, _value, state: any) => {
        state.response = { last: true, generated: 'next pause' }
        state.receivedFinalChunk = true
      }
    )

    await decideBoth()

    expect(errorToasts()).toEqual([])
    expect(mockChatsStore.getChat).not.toHaveBeenCalled()
    expect(item.response).toBe('next pause')
    expect(item.inProgress).toBe(false)
    expect(item.stream).toBeNull()
    expect(findStep(chat, s5FirstPendingId).interrupted).toBe(false)
    expect(findStep(chat, s5SecondStepId)).toMatchObject(DENIED_STEP)
  })

  it('Stop after a 200 is an ordinary Stop: one toast, no refetch, no restore', async () => {
    const { chat, item } = setup()
    vi.mocked(api.post).mockReturnValueOnce(Promise.resolve({}) as any)
    let readCalled!: () => void
    const readStarted = new Promise<void>((resolve) => {
      readCalled = resolve
    })
    vi.mocked(api.stream).mockImplementationOnce(async (_url, _data, controller: any) =>
      readerOf(
        () =>
          new Promise((_resolve, reject) => {
            controller.signal.addEventListener('abort', () => reject(abortError()))
            readCalled()
          })
      )
    )

    const sendPromise = decideBoth()
    await readStarted
    chatGenerationStore.stopChatGeneration('chat-1')
    await sendPromise

    expect(errorToasts()).toEqual([GENERATION_CANCELLED_MESSAGE])
    expect(mockChatsStore.getChat).not.toHaveBeenCalled()
    expect(item.inProgress).toBe(false)
    expect(item.stream).toBeNull()
    expect(findStep(chat, s5SecondStepId)).toMatchObject(DENIED_STEP)
    expect(chatGenerationStore.toolCallChoices).toEqual({})
  })

  it('stopChatGeneration keeps its /abort promise per chat', () => {
    setup()
    const abortPromise = Promise.resolve()
    vi.mocked(api.post).mockReturnValueOnce(abortPromise as any)
    chatGenerationStore.chatAbortControllers['chat-1'] = new AbortController()

    chatGenerationStore.stopChatGeneration('chat-1')

    expect(chatGenerationStore.abortRequests['chat-1']).toBe(abortPromise)
  })

  describe('the stream writer after Stop ends the inactive window (spec rule 4)', () => {
    it('abort with no partial text in a workflow chat nulls the stream', async () => {
      const { chat, item } = setup()
      chat.isWorkflow = true
      vi.mocked(Stream).mockImplementation(function () {
        return { isStreaming: false, start: vi.fn(), finish: vi.fn(), getStream: vi.fn(() => '') }
      } as any)

      await chatGenerationStore._handleStreamResponse(
        readerOf(() => Promise.reject(abortError())),
        item,
        chat,
        new Date()
      )

      expect(item.stream).toBeNull()
    })

    it('a drain throw keeps the stream, as on main', async () => {
      const { chat, item } = setup()

      await expect(
        chatGenerationStore._handleStreamResponse(
          readerOf(() => Promise.reject(new TypeError('network'))),
          item,
          chat,
          new Date()
        )
      ).rejects.toThrow('network')

      expect(item.stream).not.toBeNull()
    })

    it("a cut stream with no terminal chunk keeps today's behaviour", async () => {
      const { chat, item } = setup()
      item.inProgress = true

      await chatGenerationStore._handleStreamResponse(
        readerOf(() => Promise.resolve({ done: true })),
        item,
        chat,
        new Date()
      )

      expect(item.stream).not.toBeNull()
      expect(item.inProgress).toBe(true)
    })
  })
})
