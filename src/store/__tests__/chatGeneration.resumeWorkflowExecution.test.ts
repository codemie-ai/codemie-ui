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

import type { ChatMessage, Conversation } from '@/types/entity/conversation'

const mockSendRequest = vi.fn().mockResolvedValue(undefined)

const mockChatsStore = {
  currentChat: null as Conversation | null,
}

vi.mock('valtio', () => ({
  proxy: vi.fn((obj) => obj),
  ref: vi.fn((v) => v),
}))
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

const makeLastItem = (overrides: Partial<ChatMessage> = {}): ChatMessage =>
  ({
    role: 'User',
    request: 'prev',
    requestRaw: 'prev',
    createdAt: '2026-01-01T00:00:00.000Z',
    inProgress: false,
    assistantId: 'wf-1',
    executionId: 'exec-1',
    assistant: { id: 'wf-1', name: 'WF', iconUrl: '' } as any,
    thoughts: [],
    ...overrides,
  } as ChatMessage)

const makeChat = (lastItem: ChatMessage): Conversation =>
  ({
    id: 'chat-1',
    isWorkflow: true,
    isInterrupted: true,
    history: [[lastItem]],
    assistantIds: [],
    assistantData: [],
  } as unknown as Conversation)

describe('chatGenerationStore.resumeWorkflowExecution — chat history fileNames', () => {
  let chatGenerationStore: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../chatGeneration')
    chatGenerationStore = mod.chatGenerationStore
    chatGenerationStore._sendRequest = mockSendRequest
    mockSendRequest.mockClear()
  })

  it('adds fileNames to the new history item when userInput and files are both provided', async () => {
    const lastItem = makeLastItem()
    const chat = makeChat(lastItem)
    mockChatsStore.currentChat = chat

    await chatGenerationStore.resumeWorkflowExecution('hello', ['url-1', 'url-2'])

    const newItem = chat.history[1][0]
    expect(newItem.fileNames).toEqual(['url-1', 'url-2'])
    expect(newItem.request).toBe('hello')
  })

  it('omits fileNames from the new history item when no files provided with userInput', async () => {
    const lastItem = makeLastItem()
    const chat = makeChat(lastItem)
    mockChatsStore.currentChat = chat

    await chatGenerationStore.resumeWorkflowExecution('hello', [])

    const newItem = chat.history[1][0]
    expect(newItem).not.toHaveProperty('fileNames')
  })

  it('attaches fileNames to lastHistoryItem when only files provided (no userInput)', async () => {
    const lastItem = makeLastItem()
    const chat = makeChat(lastItem)
    mockChatsStore.currentChat = chat

    await chatGenerationStore.resumeWorkflowExecution(undefined, ['url-1'])

    expect(lastItem.fileNames).toEqual(['url-1'])
    expect(chat.history).toHaveLength(1)
  })

  it('does not set fileNames on lastHistoryItem when files array is empty', async () => {
    const lastItem = makeLastItem()
    const chat = makeChat(lastItem)
    mockChatsStore.currentChat = chat

    await chatGenerationStore.resumeWorkflowExecution(undefined, [])

    expect(lastItem.fileNames).toBeUndefined()
  })
})
