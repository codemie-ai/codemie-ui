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

beforeEach(() => {
  vi.clearAllMocks()
  chatsStore.chats = []
})

describe('updateChatListItem', () => {
  it('updates the matching entry in chats, not a bogus numeric key on the store', () => {
    chatsStore.chats = [
      { id: 'chat-1', name: 'Old name' } as any,
      { id: 'chat-2', name: 'Other chat' } as any,
    ]

    chatsStore.updateChatListItem({ id: 'chat-1', name: 'LLM Generated Title' })

    expect(chatsStore.chats[0].name).toBe('LLM Generated Title')
    expect(chatsStore.chats[1].name).toBe('Other chat')
    // Regression guard: the fixed indexing must never leak a numeric key onto
    // the store object itself (the original bug wrote to `chatsStore[0]`).
    expect(Object.prototype.hasOwnProperty.call(chatsStore, '0')).toBe(false)
  })

  it('leaves the list untouched when the id is not found', () => {
    chatsStore.chats = [{ id: 'chat-1', name: 'Old name' } as any]

    chatsStore.updateChatListItem({ id: 'missing-chat', name: 'New name' })

    expect(chatsStore.chats).toEqual([{ id: 'chat-1', name: 'Old name' }])
  })
})
