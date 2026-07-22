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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import storage from '@/utils/storage'

import { chatGenerationStore } from '../chatGeneration'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj), ref: vi.fn((v) => v) }))
vi.mock('@/utils/api', () => ({
  default: { stream: vi.fn(), put: vi.fn(), get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Error',
}))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getAssistant: vi.fn(), updateRecentAssistants: vi.fn() },
}))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))
vi.mock('@/utils/stream', () => ({ default: vi.fn(), streamChunkToObject: vi.fn() }))
vi.mock('@/utils/chatHelpers', () => ({ transformChatHistoryFEtoBE: vi.fn(() => []) }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(), remove: vi.fn() },
}))

const mockChatsStore = vi.hoisted(() => ({
  currentChat: null as any,
  isNewChat: false,
  createChat: vi.fn(),
  updateChat: vi.fn(),
}))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

const storagePut = storage.put as ReturnType<typeof vi.fn>

const setupIsNewChat = (newChatId = 'new-id') => {
  mockChatsStore.currentChat = { id: 'old-id', llmModel: null, isWorkflow: false, history: [] }
  mockChatsStore.isNewChat = true
  mockChatsStore.createChat.mockImplementation(() => {
    mockChatsStore.isNewChat = false
    // null currentChat causes the recursive createChatGeneration call to bail early
    mockChatsStore.currentChat = { id: newChatId, llmModel: null }
    return Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockChatsStore.currentChat = null
  mockChatsStore.isNewChat = false
})

describe('chatGeneration storage guards (isNewChat branch)', () => {
  it('does not write chat-skills when skillIds is []', async () => {
    setupIsNewChat()
    await chatGenerationStore.createChatGeneration({ skillIds: [] }).catch(() => {})
    expect(storagePut).not.toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('chat-skills-'),
      expect.anything()
    )
  })

  it('does not write chat-skills when skillIds is undefined', async () => {
    setupIsNewChat()
    await chatGenerationStore.createChatGeneration({}).catch(() => {})
    expect(storagePut).not.toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('chat-skills-'),
      expect.anything()
    )
  })

  it('writes chat-skills when skillIds is non-empty', async () => {
    setupIsNewChat('new-id')
    await chatGenerationStore.createChatGeneration({ skillIds: ['skill-a'] }).catch(() => {})
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-skills-new-id', ['skill-a'])
  })

  it('does not write chat-tools-config when dynamicToolsConfig is all-null', async () => {
    setupIsNewChat()
    await chatGenerationStore
      .createChatGeneration({
        dynamicToolsConfig: { enableWebSearch: null, enableCodeInterpreter: null },
      })
      .catch(() => {})
    expect(storagePut).not.toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('chat-tools-config-'),
      expect.anything()
    )
  })

  it('does not write chat-tools-config when dynamicToolsConfig is undefined', async () => {
    setupIsNewChat()
    await chatGenerationStore.createChatGeneration({}).catch(() => {})
    expect(storagePut).not.toHaveBeenCalledWith(
      'user-1',
      expect.stringContaining('chat-tools-config-'),
      expect.anything()
    )
  })

  it('writes chat-tools-config when enableWebSearch is non-null', async () => {
    setupIsNewChat('new-id')
    await chatGenerationStore
      .createChatGeneration({
        dynamicToolsConfig: { enableWebSearch: true, enableCodeInterpreter: null },
      })
      .catch(() => {})
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-tools-config-new-id', {
      enableWebSearch: true,
      enableCodeInterpreter: null,
    })
  })

  it('silently swallows QuotaExceededError on chat-skills write', async () => {
    setupIsNewChat('new-id')
    storagePut.mockImplementation((_userId: string, key: string) => {
      if (key.includes('chat-skills-')) throw new DOMException('quota', 'QuotaExceededError')
    })
    let caughtError: unknown
    await chatGenerationStore.createChatGeneration({ skillIds: ['skill-a'] }).catch((e) => {
      caughtError = e
    })
    // QuotaExceededError must not propagate; subsequent recursive call may reject for other reasons
    expect(caughtError).not.toBeInstanceOf(DOMException)
  })
})
