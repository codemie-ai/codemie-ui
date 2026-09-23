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

import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'

import { chatsStore } from '../chats'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj) }))

const mockApi = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })),
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
vi.mock('@/utils/chatStorageUtils', () => ({
  removeChatStorage: vi.fn(),
  sweepOrphanedChatKeys: vi.fn(),
}))
vi.mock('@/store/recentChats', () => ({
  recentChatsStore: {
    removeRecentChat: vi.fn(),
    removeRecentChatsByFolder: vi.fn(),
    updateRecentChatName: vi.fn(),
  },
}))
vi.mock('@/store/pinOrder', () => ({
  pinOrderStore: {
    recordPin: vi.fn(),
    clearPin: vi.fn(),
    ensurePinOrder: vi.fn(),
    getPinOrder: vi.fn(() => ({})),
  },
}))
const mockMoveOrderStore = vi.hoisted(() => ({
  recordMove: vi.fn(),
  clearMove: vi.fn(),
  getMoveOrder: vi.fn(() => ({})),
}))
vi.mock('@/store/moveOrder', () => ({ moveOrderStore: mockMoveOrderStore }))
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
  mockApi.get.mockResolvedValue({ json: () => Promise.resolve([]) })
  chatsStore.chats = []
})

describe('moveChatToFolder records move order without touching updateDate', () => {
  it('calls moveOrderStore.recordMove for the moved chat', async () => {
    chatsStore.chats = [
      {
        id: 'chat-1',
        name: 'Chat 1',
        pinned: false,
        folder: null,
        updateDate: '2020-01-01T00:00:00.000Z',
      } as any,
    ]

    await chatsStore.moveChatToFolder('chat-1', 'My Folder')

    // moveChatToFolder awaits a getChats() refetch (mocked to return []) as its last step, so
    // the store's chat list is already replaced by the time this resolves — recordMove is what
    // this test actually verifies; the API call itself never carries an updateDate/name field.
    expect(mockMoveOrderStore.recordMove).toHaveBeenCalledWith('chat-1')
    expect(mockApi.put).toHaveBeenCalledWith('v1/conversations/chat-1', { folder: 'My Folder' })
  })

  it('clears move order instead of recording it when moving back to the Chats section', async () => {
    chatsStore.chats = [
      {
        id: 'chat-1',
        name: 'Chat 1',
        pinned: false,
        folder: 'My Folder',
        updateDate: '2020-01-01T00:00:00.000Z',
      } as any,
    ]

    await chatsStore.moveChatToFolder('chat-1', DEFAULT_CHAT_FOLDER)

    // There is no target folder list to head, and Recent orders on activity alone, so the stale
    // entry would only linger in storage.
    expect(mockMoveOrderStore.clearMove).toHaveBeenCalledWith('chat-1')
    expect(mockMoveOrderStore.recordMove).not.toHaveBeenCalled()
    expect(mockApi.put).toHaveBeenCalledWith('v1/conversations/chat-1', { folder: '' })
  })
})

describe('moveChatsToFolder records move order for every moved chat without touching updateDate', () => {
  it('calls moveOrderStore.recordMove for each chat id', async () => {
    chatsStore.chats = [
      { id: 'chat-1', pinned: false, folder: null, updateDate: '2020-01-01T00:00:00.000Z' } as any,
      { id: 'chat-2', pinned: false, folder: null, updateDate: '2020-01-02T00:00:00.000Z' } as any,
    ]

    await chatsStore.moveChatsToFolder(['chat-1', 'chat-2'], 'My Folder')

    expect(mockMoveOrderStore.recordMove).toHaveBeenCalledWith('chat-1')
    expect(mockMoveOrderStore.recordMove).toHaveBeenCalledWith('chat-2')
    expect(mockApi.put).toHaveBeenCalledWith('v1/conversations/folders/move', {
      conversation_ids: ['chat-1', 'chat-2'],
      target_folder: 'My Folder',
    })
  })

  it('clears move order for each chat id when moving back to the Chats section', async () => {
    chatsStore.chats = [
      {
        id: 'chat-1',
        pinned: false,
        folder: 'My Folder',
        updateDate: '2020-01-01T00:00:00.000Z',
      } as any,
      {
        id: 'chat-2',
        pinned: false,
        folder: 'My Folder',
        updateDate: '2020-01-02T00:00:00.000Z',
      } as any,
    ]

    await chatsStore.moveChatsToFolder(['chat-1', 'chat-2'], DEFAULT_CHAT_FOLDER)

    expect(mockMoveOrderStore.clearMove).toHaveBeenCalledWith('chat-1')
    expect(mockMoveOrderStore.clearMove).toHaveBeenCalledWith('chat-2')
    expect(mockMoveOrderStore.recordMove).not.toHaveBeenCalled()
  })

  it('does nothing when given an empty list', async () => {
    await chatsStore.moveChatsToFolder([], 'My Folder')

    expect(mockMoveOrderStore.recordMove).not.toHaveBeenCalled()
    expect(mockApi.put).not.toHaveBeenCalled()
  })
})
