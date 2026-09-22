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

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CHAT_POLL_INTERVAL_MS } from '@/constants/chats'
import { chatGenerationStore } from '@/store/chatGeneration'
import api from '@/utils/api'

import { chatsStore } from '../chats'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj), ref: vi.fn((obj) => obj) }))
vi.mock('@/utils/api', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn(), stream: vi.fn() },
  ABORT_ERROR: 'AbortError',
}))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(), getObject: vi.fn(), remove: vi.fn() },
}))
const mockRouter = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('@/hooks/useVueRouter', () => ({
  router: mockRouter,
  useVueRouter: () => ({ ...mockRouter, currentRoute: { value: { params: {} } } }),
}))

const mockUserStore = vi.hoisted(() => ({ user: { userId: 'user-1' } }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

describe('pollIncompleteChat and stopChatGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    chatsStore.chats = []
    chatsStore.openedChatsHistory = []
    chatsStore.currentChat = null
  })

  it('triggers pollIncompleteChat on getChat if history contains inProgress message', async () => {
    const mockChatResponse = {
      id: 'chat-1',
      conversation_name: 'Active Chat',
      is_workflow_conversation: true,
      history: [
        {
          historyIndex: 0,
          message: 'Hello',
          date: '2026-09-08T12:00:00Z',
        },
        {
          historyIndex: 0,
          message: 'How can I assist?',
          date: '2026-09-08T12:00:01Z',
          in_progress: true,
        },
      ],
    }

    vi.mocked(api.get).mockResolvedValueOnce({
      json: () => Promise.resolve(mockChatResponse),
    } as any)

    const spyPoll = vi.spyOn(chatsStore, 'pollIncompleteChat')

    await chatsStore.getChat('chat-1')

    expect(spyPoll).toHaveBeenCalledWith('chat-1')
  })

  it('polls api and updates history reactively until complete', async () => {
    const initialChat = {
      id: 'chat-1',
      name: 'Active Chat',
      history: [
        [
          {
            request: 'Hello',
            response: 'How can I assist?',
            inProgress: true,
          },
        ],
      ],
    }

    chatsStore.openedChatsHistory = [initialChat as any]
    chatsStore.currentChat = initialChat as any

    const mockCompleteResponse = {
      id: 'chat-1',
      conversation_name: 'Active Chat',
      history: [
        {
          historyIndex: 0,
          message: 'Hello',
          date: '2026-09-08T12:00:00Z',
        },
        {
          historyIndex: 0,
          message: 'Here is the response',
          date: '2026-09-08T12:00:01Z',
          in_progress: false,
        },
      ],
    }

    vi.mocked(api.get).mockResolvedValueOnce({
      json: () => Promise.resolve(mockCompleteResponse),
    } as any)

    chatsStore.pollIncompleteChat('chat-1')

    // Advance fake timers by polling interval
    await vi.advanceTimersByTimeAsync(CHAT_POLL_INTERVAL_MS)

    expect(api.get).toHaveBeenCalledWith('v1/conversations/chat-1')
    expect(initialChat.history[0][0].response).toBe('Here is the response')
    expect(initialChat.history[0][0].inProgress).toBe(false)
  })

  it('stopChatGeneration calls the backend abort endpoint', () => {
    const mockController = { abort: vi.fn() }
    chatGenerationStore.chatAbortControllers['chat-1'] = mockController as any

    vi.mocked(api.post).mockResolvedValue({
      json: () => Promise.resolve({ message: 'Success' }),
    } as any)

    chatGenerationStore.stopChatGeneration('chat-1')

    expect(mockController.abort).toHaveBeenCalled()
    expect(api.post).toHaveBeenCalledWith('v1/conversations/chat-1/abort')
  })

  it('polls api and updates currentChat when chat is not in openedChatsHistory', async () => {
    const fallbackChat = {
      id: 'chat-fallback',
      name: 'Fallback Chat',
      history: [
        [
          {
            request: 'Question',
            response: 'Pending answer',
            inProgress: true,
          },
        ],
      ],
    }

    chatsStore.openedChatsHistory = []
    chatsStore.currentChat = fallbackChat as any

    const mockCompleteResponse = {
      id: 'chat-fallback',
      conversation_name: 'Fallback Chat',
      history: [
        {
          historyIndex: 0,
          message: 'Question',
          date: '2026-09-08T12:00:00Z',
        },
        {
          historyIndex: 0,
          message: 'Answer resolved',
          date: '2026-09-08T12:00:01Z',
          in_progress: false,
        },
      ],
    }

    vi.mocked(api.get).mockResolvedValueOnce({
      json: () => Promise.resolve(mockCompleteResponse),
    } as any)

    chatsStore.pollIncompleteChat('chat-fallback')

    await vi.advanceTimersByTimeAsync(2000)

    expect(api.get).toHaveBeenCalledWith('v1/conversations/chat-fallback')
    expect(fallbackChat.history[0][0].response).toBe('Answer resolved')
    expect(fallbackChat.history[0][0].inProgress).toBe(false)
  })
})
