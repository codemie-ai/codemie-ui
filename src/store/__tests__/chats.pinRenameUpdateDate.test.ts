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

const mockApi = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) })),
  downloadFileStream: vi.fn(),
}))
vi.mock('@/utils/api', () => ({ default: mockApi }))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(), getObject: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/store/recentChats', () => ({
  recentChatsStore: {
    removeRecentChat: vi.fn(),
    removeRecentChatsByFolder: vi.fn(),
    updateRecentChatName: vi.fn(),
  },
}))
const mockPinOrderStore = vi.hoisted(() => ({
  recordPin: vi.fn(),
  clearPin: vi.fn(),
  ensurePinOrder: vi.fn(),
  getPinOrder: vi.fn(() => ({})),
}))
vi.mock('@/store/pinOrder', () => ({ pinOrderStore: mockPinOrderStore }))
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
  mockApi.put.mockResolvedValue({ json: () => Promise.resolve({}) })
  chatsStore.chats = []
})

describe('pinChat / renameChat leave updateDate untouched', () => {
  it('pinChat does not change updateDate and records the pin in pinOrderStore', async () => {
    chatsStore.chats = [
      {
        id: 'chat-1',
        name: 'Chat 1',
        pinned: false,
        updateDate: '2020-01-01T00:00:00.000Z',
      } as any,
    ]

    await chatsStore.pinChat('chat-1')

    const chat = chatsStore.chats[0]
    expect(chat.pinned).toBe(true)
    expect(chat.updateDate).toBe('2020-01-01T00:00:00.000Z')
    expect(mockPinOrderStore.recordPin).toHaveBeenCalledWith('chat-1')
    expect(mockPinOrderStore.clearPin).not.toHaveBeenCalled()
  })

  it('unpinning a chat clears its pinOrderStore entry instead of touching updateDate', async () => {
    chatsStore.chats = [
      {
        id: 'chat-1',
        name: 'Chat 1',
        pinned: true,
        updateDate: '2020-01-01T00:00:00.000Z',
      } as any,
    ]

    await chatsStore.pinChat('chat-1')

    const chat = chatsStore.chats[0]
    expect(chat.pinned).toBe(false)
    expect(chat.updateDate).toBe('2020-01-01T00:00:00.000Z')
    expect(mockPinOrderStore.clearPin).toHaveBeenCalledWith('chat-1')
    expect(mockPinOrderStore.recordPin).not.toHaveBeenCalled()
  })

  it('renameChat does not change updateDate', async () => {
    chatsStore.chats = [
      { id: 'chat-1', name: 'Old name', updateDate: '2020-01-01T00:00:00.000Z' } as any,
    ]

    await chatsStore.renameChat('chat-1', 'New name')

    const chat = chatsStore.chats[0]
    expect(chat.name).toBe('New name')
    expect(chat.updateDate).toBe('2020-01-01T00:00:00.000Z')
  })
})
