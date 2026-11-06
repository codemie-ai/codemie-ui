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

import { TOOL_CALL_DENIED_MESSAGE, ToolCallAction } from '@/types/chatGeneration'
import type { ChatMessage, Conversation } from '@/types/entity/conversation'
import api from '@/utils/api'

import {
  RESUME_ERRORS,
  s5BatchPausedConversation,
  s5FirstPendingId,
  s5SecondStepId,
} from './fixtures/toolCallResume.fixtures'

const mockChatsStore = { currentChat: null as Conversation | null, updateChatListItem: vi.fn() }

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

const WAITING_MESSAGE = 'Tool call is waiting for user approval.'

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
        thoughts: [
          {
            id: 'thought-1',
            author_name: 'search_confluence',
            author_type: 'Tool',
            message: WAITING_MESSAGE,
            in_progress: false,
            error: false,
            interrupted: true,
            aborted: false,
          },
        ],
      } as ChatMessage,
    ],
  ],
})

const makeBatchChat = (): Conversation => {
  const chat = makeChat()
  chat.history[0][0].thoughts = structuredClone(s5BatchPausedConversation.thoughts) as any
  return chat
}

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

describe('chatGenerationStore.decideToolCall', () => {
  let chatGenerationStore: typeof import('@/store/chatGeneration').chatGenerationStore

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
    chatGenerationStore = (await import('@/store/chatGeneration')).chatGenerationStore
    chatGenerationStore.toolCallChoices = {}
  })

  const setup = (chat: Conversation) => {
    mockChatsStore.currentChat = chat
    const spy = vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)
    return spy
  }

  const sentData = (spy: ReturnType<typeof setup>) =>
    spy.mock.calls[0][3] as import('@/types/chatGeneration').ChatRequest

  it('records the first choice locally and sends nothing (AC2)', async () => {
    const chat = makeBatchChat()
    const spy = setup(chat)

    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.ALLOW)

    expect(chatGenerationStore.toolCallChoices).toEqual({ [s5FirstPendingId]: 'allow' })
    expect(spy).not.toHaveBeenCalled()
    expect(api.stream).not.toHaveBeenCalled()
    expect(findStep(chat, s5FirstPendingId).interrupted).toBe(true)
    expect(chat.history[0][0].inProgress).toBe(false)
  })

  it('the last click sends one batch covering every waiting step in collector order (AC3)', async () => {
    const chat = makeBatchChat()
    const spy = setup(chat)

    await chatGenerationStore.decideToolCall(s5SecondStepId, ToolCallAction.DENY)
    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.ALLOW)

    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0].slice(0, 3)).toEqual([chat, 0, 0])
    const data = sentData(spy)
    expect(data.conversationId).toBe('chat-1')
    expect(data.resume?.decisions).toEqual([
      { thought_id: s5FirstPendingId, action: 'allow' },
      { thought_id: s5SecondStepId, action: 'deny' },
    ])
    expect(chatGenerationStore._prepareRequestData(chat, 'assistant-1', data)).toEqual({
      endpoint: 'v1/assistants/assistant-1/model/tool-call/resume',
      requestData: { conversation_id: 'chat-1', stream: true, decisions: data.resume?.decisions },
    })
  })

  it('sends the decisions body for a single waiting step too (AC3, AC10)', async () => {
    const chat = makeChat()
    const spy = setup(chat)

    await chatGenerationStore.decideToolCall('thought-1', ToolCallAction.DENY)

    expect(spy).toHaveBeenCalledOnce()
    expect(sentData(spy).resume?.decisions).toEqual([{ thought_id: 'thought-1', action: 'deny' }])
  })

  it('applies the decided states, marks the entry in progress and clears the choices on send (AC4, AC13)', async () => {
    const chat = makeBatchChat()
    const msg = chat.history[0][0] as any
    msg.jiraAuthPrompt = { x: 1 }
    setup(chat)

    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.ALLOW)
    await chatGenerationStore.decideToolCall(s5SecondStepId, ToolCallAction.DENY)

    expect(findStep(chat, s5FirstPendingId)).toMatchObject({
      aborted: false,
      interrupted: false,
      in_progress: true,
      message: '',
    })
    expect(findStep(chat, s5SecondStepId)).toMatchObject({
      aborted: true,
      interrupted: false,
      in_progress: false,
      message: TOOL_CALL_DENIED_MESSAGE,
    })
    expect(msg.inProgress).toBe(true)
    expect(msg.jiraAuthPrompt).toBeNull()
    expect(chatGenerationStore.toolCallChoices).toEqual({})
  })

  it('builds the undo from the prior step fields before the on-send update', async () => {
    const chat = makeBatchChat()
    const spy = setup(chat)

    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.ALLOW)
    await chatGenerationStore.decideToolCall(s5SecondStepId, ToolCallAction.DENY)

    expect(sentData(spy).resume?.undo).toEqual([
      {
        thought_id: s5FirstPendingId,
        aborted: false,
        interrupted: true,
        in_progress: false,
        message: WAITING_MESSAGE,
      },
      {
        thought_id: s5SecondStepId,
        aborted: false,
        interrupted: true,
        in_progress: false,
        message: WAITING_MESSAGE,
      },
    ])
  })

  it('a repeated click after the send sends nothing (AC13)', async () => {
    const chat = makeBatchChat()
    const spy = setup(chat)

    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.ALLOW)
    await chatGenerationStore.decideToolCall(s5SecondStepId, ToolCallAction.DENY)
    chat.history[0][0].inProgress = false
    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.DENY)
    await chatGenerationStore.decideToolCall(s5SecondStepId, ToolCallAction.ALLOW)

    expect(spy).toHaveBeenCalledOnce()
    expect(chatGenerationStore.toolCallChoices).toEqual({})
    expect(findStep(chat, s5FirstPendingId).in_progress).toBe(true)
  })

  it('a second click on an already chosen step keeps the first choice', async () => {
    const chat = makeBatchChat()
    const spy = setup(chat)

    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.ALLOW)
    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.DENY)

    expect(chatGenerationStore.toolCallChoices).toEqual({ [s5FirstPendingId]: 'allow' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('is a no-op while the message streams or is in progress (rule 4)', async () => {
    const chat = makeChat()
    ;(chat.history[0][0] as any).stream = {}
    const spy = setup(chat)
    await chatGenerationStore.decideToolCall('thought-1', ToolCallAction.ALLOW)

    chat.history[0][0].stream = null
    chat.history[0][0].inProgress = true
    await chatGenerationStore.decideToolCall('thought-1', ToolCallAction.ALLOW)

    expect(spy).not.toHaveBeenCalled()
    expect(chatGenerationStore.toolCallChoices).toEqual({})
  })

  it('is a no-op for an id that is not a waiting step', async () => {
    const chat = makeBatchChat()
    const spy = setup(chat)

    await chatGenerationStore.decideToolCall('thought-does-not-exist', ToolCallAction.ALLOW)
    await chatGenerationStore.decideToolCall(
      'd862cdce-7de3-4b37-99ff-699fd86375a7',
      ToolCallAction.ALLOW
    )

    expect(spy).not.toHaveBeenCalled()
    expect(chatGenerationStore.toolCallChoices).toEqual({})
  })

  it('returns early when there is no current chat', async () => {
    const spy = setup(makeChat())
    mockChatsStore.currentChat = null

    await chatGenerationStore.decideToolCall('thought-1', ToolCallAction.ALLOW)

    expect(spy).not.toHaveBeenCalled()
  })

  it('after a Restore a new round of clicks sends again (AC14)', async () => {
    const chat = makeBatchChat()
    mockChatsStore.currentChat = chat
    chatGenerationStore.chatAbortControllers = {}
    vi.mocked(api.stream).mockRejectedValueOnce({
      error: { message: RESUME_ERRORS.UNSUPPORTED.message, details: null, help: null },
      status: RESUME_ERRORS.UNSUPPORTED.status,
    })

    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.ALLOW)
    await chatGenerationStore.decideToolCall(s5SecondStepId, ToolCallAction.DENY)

    expect(api.stream).toHaveBeenCalledOnce()
    expect(chatGenerationStore.toolCallChoices).toEqual({})
    expect(chat.history[0][0].inProgress).toBe(false)
    expect(findStep(chat, s5SecondStepId)).toMatchObject({
      aborted: false,
      interrupted: true,
      in_progress: false,
      message: WAITING_MESSAGE,
    })

    const spy = vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)
    await chatGenerationStore.decideToolCall(s5SecondStepId, ToolCallAction.ALLOW)
    await chatGenerationStore.decideToolCall(s5FirstPendingId, ToolCallAction.DENY)

    expect(spy).toHaveBeenCalledOnce()
    expect(sentData(spy).resume?.decisions).toEqual([
      { thought_id: s5FirstPendingId, action: 'deny' },
      { thought_id: s5SecondStepId, action: 'allow' },
    ])
  })
})
