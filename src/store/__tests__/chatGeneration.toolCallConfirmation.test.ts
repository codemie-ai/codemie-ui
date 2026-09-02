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

import type { ChatMessage } from '@/types/entity/conversation'

const mockChatsStore = {
  currentChat: null,
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
vi.mock('@/utils/chatHelpers', () => ({ transformChatHistoryFEtoBE: vi.fn(() => []) }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/constants', () => ({ ROLE_USER: 'User' }))

const makeHistoryItem = (): ChatMessage => ({
  role: 'Assistant',
  createdAt: '2026-01-01T00:00:00.000Z',
  inProgress: true,
  assistantId: 'assistant-1',
  assistant: { id: 'assistant-1', name: 'Assistant' },
  executionId: null,
  stream: {
    isStreaming: true,
    stream: '',
    streamBuffer: '',
    start: vi.fn(),
    finish: vi.fn(),
    push: vi.fn(),
    getStream: vi.fn(() => ''),
    notification: null,
  } as any,
})

describe('chatGenerationStore interrupted thought handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockChatsStore.currentChat = null
  })

  it('sets thought.interrupted=true on historyItem when thought chunk has interrupted: true', async () => {
    const historyItem = makeHistoryItem()
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({
        thought: {
          id: 'thought-1',
          author_name: 'search_confluence',
          author_type: 'Tool',
          message: 'Tool call is waiting for user approval.',
          interrupted: true,
          in_progress: false,
        },
      })
    )

    expect(historyItem.thoughts![0].interrupted).toBe(true)
    expect(historyItem.thoughts![0].author_name).toBe('search_confluence')
  })

  it('marks inProgress=false on terminal chunk after interrupted thought', async () => {
    const historyItem = makeHistoryItem()
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({
        thought: {
          id: 'thought-1',
          author_name: 'search_confluence',
          interrupted: true,
          in_progress: false,
          message: '',
        },
      })
    )
    await chatGenerationStore._handleChunk(historyItem, JSON.stringify({ last: true }))

    expect(historyItem.inProgress).toBe(false)
  })

  it('does not set interrupted when thought chunk has interrupted: false', async () => {
    const historyItem = makeHistoryItem()
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({
        thought: {
          id: 'thought-1',
          author_name: 'search_confluence',
          interrupted: false,
          in_progress: false,
          message: '',
        },
      })
    )

    expect(historyItem.thoughts![0].interrupted).toBeFalsy()
  })

  it('sets thought.aborted=true when thought chunk has aborted: true', async () => {
    const historyItem = makeHistoryItem()
    const { chatGenerationStore } = await import('@/store/chatGeneration')

    await chatGenerationStore._handleChunk(
      historyItem,
      JSON.stringify({
        thought: {
          id: 'thought-1',
          author_name: 'search_confluence',
          aborted: true,
          in_progress: false,
          message: '',
        },
      })
    )

    expect(historyItem.thoughts![0].aborted).toBe(true)
  })
})
