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
import storage from '@/utils/storage'

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

const apiDelete = api.delete as ReturnType<typeof vi.fn>
const storageRemove = storage.remove as ReturnType<typeof vi.fn>

const jsonResponse = (data: unknown = {}) =>
  ({ json: () => Promise.resolve(data) } as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  chatsStore.chats = []
  chatsStore.chatFolders = []
  chatsStore.currentChat = null
  chatsStore.openedChatsHistory = []
})

describe('deleteChat — storage cleanup', () => {
  it('removes chat-skills and chat-tools-config for the deleted chat', async () => {
    apiDelete.mockResolvedValue(jsonResponse())
    await chatsStore.deleteChat('chat-abc')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-abc')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-abc')
  })
})

describe('deleteAllConversations — storage cleanup', () => {
  it('removes storage for all chats that were in the list', async () => {
    chatsStore.chats = [{ id: 'chat-1' } as any, { id: 'chat-2' } as any]
    apiDelete.mockResolvedValue(jsonResponse())
    await chatsStore.deleteAllConversations()
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-1')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-2')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-2')
  })

  it('does nothing for storage when no chats exist', async () => {
    chatsStore.chats = []
    apiDelete.mockResolvedValue(jsonResponse())
    await chatsStore.deleteAllConversations()
    expect(storageRemove).not.toHaveBeenCalled()
  })
})

describe('deleteChatFolder with deleteChats=true — storage cleanup', () => {
  it('removes storage for chats that belong to the deleted folder', async () => {
    chatsStore.chats = [
      { id: 'chat-1', folder: 'my-folder' } as any,
      { id: 'chat-2', folder: 'other-folder' } as any,
    ]
    apiDelete.mockResolvedValue(jsonResponse())
    // getChats and getFolders are called after delete — stub them
    const getChats = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])
    const getFolders = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    await chatsStore.deleteChatFolder('my-folder', true)
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-1')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1')
    expect(storageRemove).not.toHaveBeenCalledWith('user-1', 'chat-skills-chat-2')
    getChats.mockRestore()
    getFolders.mockRestore()
  })

  it('does not remove storage when deleteChats=false', async () => {
    chatsStore.chats = [{ id: 'chat-1', folder: 'my-folder' } as any]
    apiDelete.mockResolvedValue(jsonResponse())
    const getChats = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])
    const getFolders = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    await chatsStore.deleteChatFolder('my-folder', false)
    expect(storageRemove).not.toHaveBeenCalled()
    getChats.mockRestore()
    getFolders.mockRestore()
  })
})
