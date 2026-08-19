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
import { premiumModelTipStore, PENDING_CHAT_KEY } from '../premiumModelTip'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj) }))
vi.mock('@/utils/api', () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    downloadFileStream: vi.fn(),
  },
  sanitizeFileName: vi.fn((name: string) => name),
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
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn(), replace: vi.fn() } }))

const mockUserStore = vi.hoisted(() => ({ user: { userId: 'user-1' } }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

const apiGet = api.get as ReturnType<typeof vi.fn>
const apiPost = api.post as ReturnType<typeof vi.fn>

const jsonResponse = (data: unknown) =>
  ({ json: () => Promise.resolve(data) } as unknown as Response)

const fullChatDTO = (id: string) => ({
  id,
  conversation_name: 'Chat',
  llm_model: 'gpt-5',
  folder: null,
  assistant_ids: ['assistant-1'],
  assistant_data: [],
  history: [],
})

beforeEach(() => {
  vi.clearAllMocks()
  chatsStore.chats = []
  chatsStore.openedChatsHistory = []
  chatsStore.currentChat = null
  chatsStore.newChatParams = null
  premiumModelTipStore.dismissedKeys = {}
})

describe('startNewChat re-arms the premium tip', () => {
  beforeEach(() => {
    apiGet.mockResolvedValue(jsonResponse(fullChatDTO('')))
  })

  it('clears a dismissal recorded against the pending chat', async () => {
    premiumModelTipStore.dismiss(`${PENDING_CHAT_KEY}:gpt-5`)

    await chatsStore.startNewChat()

    expect(premiumModelTipStore.dismissedKeys).toEqual({})
  })

  it('leaves a dismissal recorded for a real chat untouched', async () => {
    premiumModelTipStore.dismiss('c9:gpt-5')

    await chatsStore.startNewChat()

    expect(premiumModelTipStore.dismissedKeys).toEqual({ 'c9:gpt-5': true })
  })
})

describe('createChat promotes the pending premium tip dismissal', () => {
  beforeEach(() => {
    apiPost.mockResolvedValue(
      jsonResponse({ id: 'c1', name: 'Chat', folder: null, pinned: false, assistant_ids: [] })
    )
    apiGet.mockImplementation((url: string) => {
      if (url === 'v1/conversations/c1') return Promise.resolve(jsonResponse(fullChatDTO('c1')))
      return Promise.resolve(jsonResponse([]))
    })
  })

  it('re-keys the pending dismissal to the created chat id', async () => {
    premiumModelTipStore.dismiss(`${PENDING_CHAT_KEY}:gpt-5`)

    await chatsStore.createChat()

    expect(premiumModelTipStore.dismissedKeys).toEqual({ 'c1:gpt-5': true })
  })

  it('leaves a dismissal recorded for another real chat untouched', async () => {
    premiumModelTipStore.dismiss(`${PENDING_CHAT_KEY}:gpt-5`)
    premiumModelTipStore.dismiss('c9:gpt-5')

    await chatsStore.createChat()

    expect(premiumModelTipStore.dismissedKeys).toEqual({ 'c1:gpt-5': true, 'c9:gpt-5': true })
  })
})
