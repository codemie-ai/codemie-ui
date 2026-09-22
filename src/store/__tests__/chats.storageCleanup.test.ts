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
    get: vi.fn().mockResolvedValue({ json: () => Promise.resolve({ id: '', history: [] }) }),
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
const mockPinOrderStore = vi.hoisted(() => ({
  recordPin: vi.fn(),
  clearPin: vi.fn(),
  ensurePinOrder: vi.fn(),
  getPinOrder: vi.fn(() => ({})),
}))
vi.mock('@/store/pinOrder', () => ({ pinOrderStore: mockPinOrderStore }))
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

const apiDelete = api.delete as ReturnType<typeof vi.fn>
const apiGet = api.get as ReturnType<typeof vi.fn>
const storageRemove = storage.remove as ReturnType<typeof vi.fn>

const jsonResponse = (data: unknown = {}) =>
  ({ json: () => Promise.resolve(data) } as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  chatsStore.chats = []
  chatsStore.chatFolders = []
  chatsStore.assistantFolders = []
  chatsStore.currentChat = null
  chatsStore.openedChatsHistory = []
})

describe('getAssistantFolders', () => {
  it('normalizes a null response to an empty list', async () => {
    apiGet.mockResolvedValue(jsonResponse(null))

    await expect(chatsStore.getAssistantFolders()).resolves.toEqual([])

    expect(apiGet).toHaveBeenCalledWith('v1/assistant-folders')
    expect(chatsStore.assistantFolders).toEqual([])
  })
})

describe('deleteAssistantFolder — lifecycle cleanup', () => {
  beforeEach(() => {
    chatsStore.chats = [{ id: 'chat-1' } as any, { id: 'chat-2' } as any]
    chatsStore.openedChatsHistory = [{ id: 'chat-1' } as any, { id: 'chat-2' } as any]
    chatsStore.assistantFolders = [
      { assistant_id: 'assistant-a', name: 'Assistant A' },
      { assistant_id: 'assistant-b', name: 'Assistant B' },
    ]
  })

  it('keeps the empty registration for Delete chats only', async () => {
    // The backend reports folder_deleted: true whenever it removed any chat — its folders are
    // derived, so an emptied one stops existing. Keeping it listed is the sidebar's call.
    apiDelete.mockResolvedValue(
      jsonResponse({ deleted_conversation_ids: ['chat-1'], folder_deleted: true })
    )

    await chatsStore.deleteAssistantFolder('assistant-a', 'delete_chats_only')

    expect(apiDelete).toHaveBeenCalledWith('v1/assistant-folders/assistant-a', undefined, {
      params: { remove_conversations: true },
      skipErrorHandling: true,
    })
    expect(chatsStore.chats.map((chat) => chat.id)).toEqual(['chat-2'])
    expect(chatsStore.assistantFolders.map((folder) => folder.assistant_id)).toEqual([
      'assistant-a',
      'assistant-b',
    ])
  })

  it('removes the registration for Delete folder & chats', async () => {
    apiDelete.mockResolvedValue(
      jsonResponse({ deleted_conversation_ids: ['chat-1'], folder_deleted: true })
    )

    await chatsStore.deleteAssistantFolder('assistant-a', 'delete_folder_and_chats')

    expect(chatsStore.openedChatsHistory.map((chat) => chat.id)).toEqual(['chat-2'])
    expect(chatsStore.assistantFolders.map((folder) => folder.assistant_id)).toEqual([
      'assistant-b',
    ])
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-1')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1')
    expect(mockPinOrderStore.clearPin).toHaveBeenCalledWith('chat-1')
    expect(mockMoveOrderStore.clearMove).toHaveBeenCalledWith('chat-1')
  })

  it.each([
    ['delete_chats_only', false],
    ['delete_folder_and_chats', true],
  ] as const)(
    'falls back to deleting matching conversations after a 404 for %s',
    async (action, folderDeleted) => {
      chatsStore.chats = [
        {
          id: 'chat-assistant-a',
          initialAssistantId: 'assistant-a',
          assistantIds: ['assistant-a'],
          assistantNames: ['Assistant A'],
          folder: null,
          isWorkflow: false,
          importSource: null,
        } as any,
        {
          id: 'chat-assistant-b',
          initialAssistantId: 'assistant-b',
          assistantIds: ['assistant-b'],
          assistantNames: ['Assistant B'],
          folder: null,
          isWorkflow: false,
          importSource: null,
        } as any,
      ]
      apiDelete
        .mockRejectedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(jsonResponse())

      const result = await chatsStore.deleteAssistantFolder('assistant-a', action)

      expect(apiDelete).toHaveBeenNthCalledWith(1, 'v1/assistant-folders/assistant-a', undefined, {
        params: { remove_conversations: true },
        skipErrorHandling: true,
      })
      expect(apiDelete).toHaveBeenNthCalledWith(2, 'v1/conversations/chat-assistant-a')
      expect(apiDelete).toHaveBeenCalledTimes(2)
      expect(result).toEqual({
        deleted_conversation_ids: ['chat-assistant-a'],
        folder_deleted: folderDeleted,
      })
      expect(chatsStore.chats.map((chat) => chat.id)).toEqual(['chat-assistant-b'])
      expect(chatsStore.assistantFolders.map((folder) => folder.assistant_id)).toEqual(
        folderDeleted ? ['assistant-b'] : ['assistant-a', 'assistant-b']
      )
    }
  )

  it('keeps a pinned chat when falling back to client-side matching (mirrors backend pinned guard)', async () => {
    chatsStore.chats = [
      {
        id: 'chat-pinned',
        initialAssistantId: 'assistant-derived',
        assistantIds: ['assistant-derived'],
        assistantNames: ['Derived Assistant'],
        folder: '',
        isWorkflow: false,
        importSource: null,
        pinned: true,
      } as any,
      {
        id: 'chat-unpinned',
        initialAssistantId: 'assistant-derived',
        assistantIds: ['assistant-derived'],
        assistantNames: ['Derived Assistant'],
        folder: '',
        isWorkflow: false,
        importSource: null,
        pinned: false,
      } as any,
    ]
    chatsStore.assistantFolders = []
    apiDelete.mockResolvedValue(jsonResponse())

    const result = await chatsStore.deleteAssistantFolder(
      'assistant-derived',
      'delete_folder_and_chats'
    )

    expect(apiDelete).toHaveBeenCalledTimes(1)
    expect(apiDelete).toHaveBeenCalledWith('v1/conversations/chat-unpinned')
    expect(result.deleted_conversation_ids).toEqual(['chat-unpinned'])
    expect(chatsStore.chats.map((chat) => chat.id)).toEqual(['chat-pinned'])
  })

  it('deletes chats directly when the derived assistant folder is not registered', async () => {
    chatsStore.chats = [
      {
        id: 'chat-derived',
        initialAssistantId: 'assistant-derived',
        assistantIds: ['assistant-derived'],
        assistantNames: ['Derived Assistant'],
        folder: '',
        isWorkflow: false,
        importSource: null,
      } as any,
    ]
    chatsStore.assistantFolders = []
    apiDelete.mockResolvedValue(jsonResponse())

    const result = await chatsStore.deleteAssistantFolder(
      'assistant-derived',
      'delete_folder_and_chats'
    )

    expect(apiDelete).toHaveBeenCalledTimes(1)
    expect(apiDelete).toHaveBeenCalledWith('v1/conversations/chat-derived')
    expect(result).toEqual({
      deleted_conversation_ids: ['chat-derived'],
      folder_deleted: true,
    })
    expect(chatsStore.chats).toEqual([])
  })

  it('keeps a local empty registration for Delete chats only on a derived folder', async () => {
    chatsStore.chats = [
      {
        id: 'chat-derived',
        initialAssistantId: 'assistant-derived',
        assistantIds: ['assistant-derived'],
        assistantNames: ['Derived Assistant'],
        folder: '',
        isWorkflow: false,
        importSource: null,
      } as any,
    ]
    chatsStore.assistantFolders = []
    apiDelete.mockResolvedValue(jsonResponse())

    await chatsStore.deleteAssistantFolder('assistant-derived', 'delete_chats_only')

    expect(chatsStore.assistantFolders).toEqual([
      {
        assistant_id: 'assistant-derived',
        name: 'Derived Assistant',
        icon_url: undefined,
      },
    ])
  })
})

describe('startNewChat — pending skills cleanup', () => {
  it('clears the "" sentinel chat-skills entry so it cannot leak onto the next placeholder chat', async () => {
    apiGet.mockResolvedValue(jsonResponse({ id: '', history: [] }))
    await chatsStore.startNewChat()
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-')
  })
})

describe('deleteChat — storage cleanup', () => {
  it('removes chat-skills and chat-tools-config for the deleted chat', async () => {
    apiDelete.mockResolvedValue(jsonResponse())
    await chatsStore.deleteChat('chat-abc')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-abc')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-abc')
    expect(mockPinOrderStore.clearPin).toHaveBeenCalledWith('chat-abc')
    expect(mockMoveOrderStore.clearMove).toHaveBeenCalledWith('chat-abc')
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
    expect(mockPinOrderStore.clearPin).toHaveBeenCalledWith('chat-1')
    expect(mockPinOrderStore.clearPin).toHaveBeenCalledWith('chat-2')
    expect(mockMoveOrderStore.clearMove).toHaveBeenCalledWith('chat-1')
    expect(mockMoveOrderStore.clearMove).toHaveBeenCalledWith('chat-2')
  })

  it('does nothing for storage when no chats exist', async () => {
    chatsStore.chats = []
    apiDelete.mockResolvedValue(jsonResponse())
    await chatsStore.deleteAllConversations()
    expect(storageRemove).not.toHaveBeenCalled()
    expect(mockPinOrderStore.clearPin).not.toHaveBeenCalled()
    expect(mockMoveOrderStore.clearMove).not.toHaveBeenCalled()
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
    expect(apiDelete).toHaveBeenCalledWith(
      'v1/conversations/folder/my-folder?remove_conversations=true'
    )
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-chat-1')
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1')
    expect(storageRemove).not.toHaveBeenCalledWith('user-1', 'chat-skills-chat-2')
    expect(mockPinOrderStore.clearPin).toHaveBeenCalledWith('chat-1')
    expect(mockPinOrderStore.clearPin).not.toHaveBeenCalledWith('chat-2')
    expect(mockMoveOrderStore.clearMove).toHaveBeenCalledWith('chat-1')
    expect(mockMoveOrderStore.clearMove).not.toHaveBeenCalledWith('chat-2')
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
    expect(mockPinOrderStore.clearPin).not.toHaveBeenCalled()
    expect(mockMoveOrderStore.clearMove).not.toHaveBeenCalled()
    getChats.mockRestore()
    getFolders.mockRestore()
  })
})
