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

import api from '@/utils/api'

import { chatsStore } from '../chats'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj) }))
vi.mock('@/utils/api', () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    downloadFileStream: vi.fn(),
  },
}))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(), getObject: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/utils/chatStorageUtils', () => ({
  removeChatStorage: vi.fn(),
  sweepOrphanedChatKeys: vi.fn(),
}))
vi.mock('@/store/recentChats', () => ({
  recentChatsStore: { removeRecentChat: vi.fn(), removeRecentChatsByFolder: vi.fn() },
}))
vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    removeExecutionsByConversationId: vi.fn(),
    removeAllChatLinkedExecutions: vi.fn(),
  },
}))
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn() } }))

const mockUserStore = vi.hoisted(() => ({ user: { userId: 'user-1' } }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

const apiGet = api.get as ReturnType<typeof vi.fn>

const jsonResponse = (data: unknown) =>
  ({ json: () => Promise.resolve(data) } as unknown as Response)

const chatDTO = (overrides: Record<string, unknown> = {}) => ({
  id: 'chat-1',
  name: 'LLM Generated Title',
  folder: null,
  pinned: false,
  date: '2026-08-06T10:00:00.000Z',
  assistant_ids: ['assistant-1'],
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  chatsStore.chats = []
  chatsStore.isInitialDataFetched = false
})

// Regression (CR-002, found 2026-08-06): getChats() replaces chatsStore.chats
// wholesale with fresh backend DTOs. transformChatListItemDTO never sets
// pendingRename (it's a frontend-only field the backend doesn't know about),
// so a refresh landing while a rename poll is in flight silently dropped the
// mask and re-flashed the raw truncated prompt text. getChats() must carry
// pendingRename forward for any chat still mid-poll.
describe('getChats — preserves pendingRename across list refresh (CR-002)', () => {
  it('carries pendingRename forward for a chat that was mid-poll before the refresh', async () => {
    chatsStore.chats = [{ id: 'chat-1', name: 'Hello there', pendingRename: true } as any]
    apiGet.mockResolvedValue(jsonResponse([chatDTO()]))

    const result = await chatsStore.getChats()

    expect(result[0].pendingRename).toBe(true)
    expect(chatsStore.chats[0].pendingRename).toBe(true)
  })

  it('does not set pendingRename on a chat that was not mid-poll', async () => {
    chatsStore.chats = [{ id: 'chat-1', name: 'Old name' } as any]
    apiGet.mockResolvedValue(jsonResponse([chatDTO()]))

    const result = await chatsStore.getChats()

    expect(result[0].pendingRename).toBeFalsy()
  })

  it('does not set pendingRename on chats absent from the previous list (e.g. brand new)', async () => {
    chatsStore.chats = []
    apiGet.mockResolvedValue(jsonResponse([chatDTO({ id: 'chat-2' })]))

    const result = await chatsStore.getChats()

    expect(result[0].pendingRename).toBeFalsy()
  })

  it('only masks the specific chat that was mid-poll, not siblings', async () => {
    chatsStore.chats = [
      { id: 'chat-1', pendingRename: true } as any,
      { id: 'chat-2', pendingRename: false } as any,
    ]
    apiGet.mockResolvedValue(jsonResponse([chatDTO({ id: 'chat-1' }), chatDTO({ id: 'chat-2' })]))

    const result = await chatsStore.getChats()

    expect(result.find((c) => c.id === 'chat-1')?.pendingRename).toBe(true)
    expect(result.find((c) => c.id === 'chat-2')?.pendingRename).toBeFalsy()
  })
})
