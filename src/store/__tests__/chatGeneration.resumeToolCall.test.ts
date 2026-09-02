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

import { ToolCallAction } from '@/types/chatGeneration'
import type { ChatMessage, Conversation } from '@/types/entity/conversation'

const mockChatsStore = { currentChat: null as Conversation | null }

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
            message: 'Tool call is waiting for user approval.',
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

describe('chatGenerationStore.resumeToolCall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
  })

  it('clears the interrupted flag on the target thought', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('thought-1', ToolCallAction.ALLOW)

    expect(chat.history[0][0].thoughts![0].interrupted).toBe(false)
  })

  it('sets inProgress=true on the last message', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('thought-1', ToolCallAction.ALLOW)

    expect(chat.history[0][0].inProgress).toBe(true)
  })

  it('calls _sendRequest with toolCallAction and conversationId', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const spy = vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('thought-1', ToolCallAction.DENY)

    expect(spy).toHaveBeenCalledOnce()
    const [, , , data] = spy.mock.calls[0] as [any, any, any, Record<string, unknown>]
    expect(data.toolCallAction).toBe(ToolCallAction.DENY)
    expect(data.conversationId).toBe('chat-1')
  })

  it('returns early without calling _sendRequest when there is no current chat', async () => {
    mockChatsStore.currentChat = null
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const spy = vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('thought-1', ToolCallAction.ALLOW)

    expect(spy).not.toHaveBeenCalled()
  })

  it('returns early without calling _sendRequest when the thought id does not match', async () => {
    const chat = makeChat()
    mockChatsStore.currentChat = chat
    const { chatGenerationStore } = await import('@/store/chatGeneration')
    const spy = vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)

    await chatGenerationStore.resumeToolCall('thought-does-not-exist', ToolCallAction.ALLOW)

    expect(spy).not.toHaveBeenCalled()
  })
})
