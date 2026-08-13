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
import api from '@/utils/api'
import toaster from '@/utils/toaster'

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
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn(), replace: vi.fn() } }))

const mockUserStore = vi.hoisted(() => ({ user: { userId: 'user-1' } }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

const apiPost = api.post as ReturnType<typeof vi.fn>
const toasterError = toaster.error as ReturnType<typeof vi.fn>

const jsonResponse = (data: unknown = {}) =>
  ({ json: () => Promise.resolve(data) } as unknown as Response)

beforeEach(() => {
  vi.clearAllMocks()
  chatsStore.chats = []
  chatsStore.chatFolders = []
  chatsStore.currentChat = null
})

describe('createFolder — whitespace trim', () => {
  it('trims leading/trailing whitespace before posting', async () => {
    apiPost.mockResolvedValue(jsonResponse())
    const getFolders = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    await chatsStore.createFolder('  FAQ  ')
    expect(apiPost).toHaveBeenCalledWith('v1/conversations/folder', { folder: 'FAQ' })
    getFolders.mockRestore()
  })

  it('rejects a whitespace-only folder name without calling the API', async () => {
    await chatsStore.createFolder('   ')
    expect(apiPost).not.toHaveBeenCalled()
    expect(toasterError).toHaveBeenCalledWith('Folder name cannot be empty')
  })

  it('rejects a trimmed name colliding with DEFAULT_CHAT_FOLDER without calling the API', async () => {
    await chatsStore.createFolder(`  ${DEFAULT_CHAT_FOLDER}  `)
    expect(apiPost).not.toHaveBeenCalled()
    expect(toasterError).toHaveBeenCalledWith('Folder name is reserved')
  })
})

describe('renameChatFolder — whitespace trim', () => {
  it('trims both old and new folder names before the PUT call', async () => {
    const apiPut = api.put as ReturnType<typeof vi.fn>
    apiPut.mockResolvedValue(jsonResponse())
    const getFolders = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    const getChats = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])
    await chatsStore.renameChatFolder('  Old  ', '  New  ')
    expect(apiPut).toHaveBeenCalledWith(`v1/conversations/folder/${encodeURIComponent('Old')}`, {
      folder: 'New',
    })
    getFolders.mockRestore()
    getChats.mockRestore()
  })

  it('rejects a whitespace-only new folder name without calling the API', async () => {
    const apiPut = api.put as ReturnType<typeof vi.fn>
    await chatsStore.renameChatFolder('Old', '   ')
    expect(apiPut).not.toHaveBeenCalled()
    expect(toasterError).toHaveBeenCalledWith('Folder name cannot be empty')
  })

  it('rejects a trimmed new name colliding with DEFAULT_CHAT_FOLDER without calling the API', async () => {
    const apiPut = api.put as ReturnType<typeof vi.fn>
    await chatsStore.renameChatFolder('Old', `  ${DEFAULT_CHAT_FOLDER}  `)
    expect(apiPut).not.toHaveBeenCalled()
    expect(toasterError).toHaveBeenCalledWith('Folder name is reserved')
  })
})

describe('moveChatToFolder — whitespace trim', () => {
  it('trims the target folder before sending it in the PUT body', async () => {
    chatsStore.chats = [{ id: 'chat-1', folder: '' } as any]
    const apiPut = api.put as ReturnType<typeof vi.fn>
    apiPut.mockResolvedValue(jsonResponse())
    const getChats = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])
    await chatsStore.moveChatToFolder('chat-1', '  FAQ  ')
    expect(apiPut).toHaveBeenCalledWith('v1/conversations/chat-1', { folder: 'FAQ' })
    getChats.mockRestore()
  })
})

vi.mock('@/utils/chatHelpers', async () => {
  const actual = await vi.importActual<typeof import('@/utils/chatHelpers')>('@/utils/chatHelpers')
  return { ...actual, transformChatBEtoFE: vi.fn((dto) => dto) }
})

describe('startNewChat — whitespace trim', () => {
  it('trims the folder before building the URL params and storing newChatParams', async () => {
    const apiGet = api.get as ReturnType<typeof vi.fn>
    apiGet.mockResolvedValue(jsonResponse({ id: 'chat-1' }))
    await chatsStore.startNewChat('assistant-1', '  FAQ  ', false)
    expect(apiGet).toHaveBeenCalledWith(
      expect.stringContaining(`folder=${encodeURIComponent('FAQ')}`)
    )
    expect(chatsStore.newChatParams?.folder).toBe('FAQ')
  })
})

describe('createChat — whitespace trim', () => {
  it('trims newChatParams.folder before posting', async () => {
    chatsStore.newChatParams = {
      assistantId: 'assistant-1',
      folder: '  FAQ  ',
      isWorkflow: false,
    }
    const apiPostChat = api.post as ReturnType<typeof vi.fn>
    apiPostChat.mockResolvedValue(jsonResponse({ id: 'chat-1' }))
    const apiGetChat = api.get as ReturnType<typeof vi.fn>
    apiGetChat.mockResolvedValue(jsonResponse({ id: 'chat-1' }))
    const getChats = vi.spyOn(chatsStore, 'getChats').mockResolvedValue([])
    const getFolders = vi.spyOn(chatsStore, 'getFolders').mockResolvedValue([])
    const getChat = vi.spyOn(chatsStore, 'getChat').mockResolvedValue({ id: 'chat-1' } as any)
    await chatsStore.createChat()
    expect(apiPostChat).toHaveBeenCalledWith(
      'v1/conversations',
      expect.objectContaining({ folder: 'FAQ' })
    )
    getChats.mockRestore()
    getFolders.mockRestore()
    getChat.mockRestore()
  })
})
