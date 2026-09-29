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
import { clearSharedFileGrants, resolveSharedFileToken } from '@/utils/sharedFileGrants'

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

const sharedResponse = (overrides: Record<string, unknown> = {}) => ({
  conversation: {
    id: 'chat-1',
    name: 'Shared chat',
    assistant_ids: [],
    history: [],
  },
  shared_by: 'alice',
  share_token: 'tok-abc',
  shared_file_urls: { 'enc-token-1': 'enc-token-1?share_token=tok-abc' },
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  clearSharedFileGrants()
})

// EPMCDME-12708: a shared conversation returns file references as bare tokens; the download
// grant travels in shared_file_urls and every file request has to be resolved through it.
describe('getSharedChat — share file grants', () => {
  it('stores the grants returned alongside the conversation', async () => {
    apiGet.mockResolvedValue(jsonResponse(sharedResponse()))

    await chatsStore.getSharedChat('tok-abc')

    expect(resolveSharedFileToken('enc-token-1')).toBe('enc-token-1?share_token=tok-abc')
  })

  it('still opens the conversation when the backend sends no grants', async () => {
    apiGet.mockResolvedValue(jsonResponse(sharedResponse({ shared_file_urls: undefined })))

    const chat = await chatsStore.getSharedChat('tok-abc')

    expect(chat.id).toBe('chat-1')
    expect(resolveSharedFileToken('enc-token-1')).toBe('enc-token-1')
  })

  it('drops the grants when the shared page unmounts', async () => {
    apiGet.mockResolvedValue(jsonResponse(sharedResponse()))
    await chatsStore.getSharedChat('tok-abc')

    chatsStore.clearCurrentChat()

    expect(resolveSharedFileToken('enc-token-1')).toBe('enc-token-1')
  })
})
