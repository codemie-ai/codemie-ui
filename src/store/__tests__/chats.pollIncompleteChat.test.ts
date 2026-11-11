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

import { CHAT_POLL_INTERVAL_MS, MAX_CHAT_POLL_ATTEMPTS } from '@/constants/chats'
import { pausedHistoryItemBackend } from '@/store/__tests__/fixtures/toolCallResume.fixtures'
import { chatGenerationStore } from '@/store/chatGeneration'
import { responseReadyStore } from '@/store/responseReady'
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

const advancePolls = async (count: number): Promise<void> => {
  if (count <= 0) return
  await vi.runOnlyPendingTimersAsync()
  await advancePolls(count - 1)
}

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

  it('does not trigger pollIncompleteChat on getChat for an in-progress workflow chat', async () => {
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

    expect(spyPoll).not.toHaveBeenCalled()
  })

  it('calls pollIncompleteChat for a non-workflow in-progress chat when setOpenChat returns falsy', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          id: 'chat-2',
          conversation_name: 'Non-workflow',
          is_workflow_conversation: false,
          history: [
            { historyIndex: 0, message: 'Hi', date: '2026-09-25T12:00:00Z' },
            {
              historyIndex: 0,
              message: 'Pending',
              date: '2026-09-25T12:00:01Z',
              in_progress: true,
            },
          ],
        }),
    } as any)
    vi.spyOn(chatsStore, 'setOpenChat').mockReturnValueOnce(undefined as any)
    const spyPoll = vi.spyOn(chatsStore, 'pollIncompleteChat')

    await chatsStore.getChat('chat-2')

    expect(spyPoll).toHaveBeenCalledWith('chat-2')
  })

  it('reconnects the stream instead of polling for a non-workflow in-progress chat with an openedChat', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          id: 'chat-3',
          conversation_name: 'Non-workflow open',
          is_workflow_conversation: false,
          history: [
            { historyIndex: 0, message: 'Hi', date: '2026-09-25T12:00:00Z' },
            {
              historyIndex: 0,
              message: 'Pending',
              date: '2026-09-25T12:00:01Z',
              in_progress: true,
            },
          ],
        }),
    } as any)
    const spyPoll = vi.spyOn(chatsStore, 'pollIncompleteChat')
    const spyReconnect = vi
      .spyOn(chatGenerationStore, 'reconnectChatStream')
      .mockResolvedValue(undefined)

    await chatsStore.getChat('chat-3')
    await vi.waitFor(() => expect(spyReconnect).toHaveBeenCalled())

    expect(spyPoll).not.toHaveBeenCalled()
  })

  it('starts no reattach for a paused entry loaded with in_progress=false (AC15)', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          id: 'chat-paused',
          conversation_name: 'Paused',
          is_workflow_conversation: false,
          history: [
            { historyIndex: 0, role: 'User', message: 'go', date: '2026-01-01T00:00:00.000Z' },
            { ...pausedHistoryItemBackend, historyIndex: 0 },
          ],
        }),
    } as any)
    const spyPoll = vi.spyOn(chatsStore, 'pollIncompleteChat')
    const spyReconnect = vi
      .spyOn(chatGenerationStore, 'reconnectChatStream')
      .mockResolvedValue(undefined)

    const opened = await chatsStore.getChat('chat-paused')
    await vi.runOnlyPendingTimersAsync()

    expect(opened?.history.at(-1)?.[0].inProgress).toBe(false)
    expect(spyReconnect).not.toHaveBeenCalled()
    expect(spyPoll).not.toHaveBeenCalled()
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

  it('polls api immediately without delay when immediate=true', async () => {
    const immediateChat = {
      id: 'chat-immediate',
      name: 'Immediate Chat',
      history: [
        [
          {
            request: 'Fast question',
            response: '',
            inProgress: true,
          },
        ],
      ],
    }

    chatsStore.openedChatsHistory = [immediateChat as any]
    chatsStore.currentChat = immediateChat as any

    const mockResponse = {
      id: 'chat-immediate',
      conversation_name: 'Immediate Chat',
      history: [
        { historyIndex: 0, message: 'Fast question', date: '2026-09-23T12:00:00Z' },
        {
          historyIndex: 0,
          message: 'Immediate answer',
          date: '2026-09-23T12:00:01Z',
          in_progress: false,
        },
      ],
    }

    vi.mocked(api.get).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse),
    } as any)

    chatsStore.pollIncompleteChat('chat-immediate', true)

    await vi.advanceTimersByTimeAsync(0)

    expect(api.get).toHaveBeenCalledWith('v1/conversations/chat-immediate')
    expect(chatsStore.currentChat?.history[0][0].response).toBe('Immediate answer')
    expect(chatsStore.currentChat?.history[0][0].inProgress).toBe(false)
  })

  it('resets inProgress flags when exceeding MAX_CHAT_POLL_ATTEMPTS', async () => {
    const stuckChat = {
      id: 'chat-stuck',
      name: 'Stuck Chat',
      history: [
        [
          {
            request: 'Stuck request',
            response: '',
            inProgress: true,
          },
        ],
      ],
    }

    chatsStore.openedChatsHistory = [stuckChat as any]
    chatsStore.currentChat = stuckChat as any

    const stillInProgressResponse = {
      id: 'chat-stuck',
      conversation_name: 'Stuck Chat',
      history: [
        { historyIndex: 0, message: 'Stuck request', date: '2026-09-23T12:00:00Z' },
        { historyIndex: 0, message: '', date: '2026-09-23T12:00:01Z', in_progress: true },
      ],
    }

    vi.mocked(api.get).mockResolvedValue({
      json: () => Promise.resolve(stillInProgressResponse),
    } as any)

    chatsStore.pollIncompleteChat('chat-stuck', true)

    // Advance poll attempts until max attempts exceeded
    await advancePolls(152)

    expect(chatsStore.currentChat?.history[0][0].inProgress).toBe(false)
  })

  describe('response-ready signal', () => {
    const openRunningChat = () => {
      const chat = {
        id: 'chat-r',
        name: 'Running',
        history: [[{ request: 'Hi', response: '', inProgress: true }]],
      }
      chatsStore.openedChatsHistory = [chat as any]
      chatsStore.currentChat = chat as any
    }

    const backendChat = (assistantMessage: string, inProgress: boolean, status?: string) => ({
      id: 'chat-r',
      conversation_name: 'Running',
      history: [
        { historyIndex: 0, message: 'Hi', date: '2026-10-15T12:00:00Z' },
        {
          historyIndex: 0,
          message: assistantMessage,
          date: '2026-10-15T12:00:01Z',
          in_progress: inProgress,
          status,
        },
      ],
    })

    it.each(['error', 'interrupted'])(
      'does not mark ready when the finished turn has status %s',
      async (status) => {
        const markSpy = vi.spyOn(responseReadyStore, 'markResponseReady')
        openRunningChat()
        vi.mocked(api.get).mockResolvedValueOnce({
          json: () => Promise.resolve(backendChat('Rate limit exceeded', false, status)),
        } as any)

        chatsStore.pollIncompleteChat('chat-r')
        await vi.advanceTimersByTimeAsync(CHAT_POLL_INTERVAL_MS)

        expect(markSpy).not.toHaveBeenCalled()
        markSpy.mockRestore()
      }
    )

    it('marks the response ready once when polling sees the chat complete', async () => {
      const markSpy = vi.spyOn(responseReadyStore, 'markResponseReady')
      openRunningChat()
      vi.mocked(api.get).mockResolvedValueOnce({
        json: () => Promise.resolve(backendChat('Done', false)),
      } as any)

      chatsStore.pollIncompleteChat('chat-r')
      await vi.advanceTimersByTimeAsync(CHAT_POLL_INTERVAL_MS)

      expect(markSpy).toHaveBeenCalledTimes(1)
      markSpy.mockRestore()
    })

    it('does not mark ready when the finished message carries no response', async () => {
      const markSpy = vi.spyOn(responseReadyStore, 'markResponseReady')
      openRunningChat()
      vi.mocked(api.get).mockResolvedValueOnce({
        json: () => Promise.resolve(backendChat('', false)),
      } as any)

      chatsStore.pollIncompleteChat('chat-r')
      await vi.advanceTimersByTimeAsync(CHAT_POLL_INTERVAL_MS)

      expect(markSpy).not.toHaveBeenCalled()
      markSpy.mockRestore()
    })

    it('does not mark ready when the poll gives up on a still-running chat', async () => {
      const markSpy = vi.spyOn(responseReadyStore, 'markResponseReady')
      openRunningChat()
      vi.mocked(api.get).mockResolvedValue({
        json: () => Promise.resolve(backendChat('', true)),
      } as any)

      chatsStore.pollIncompleteChat('chat-r', true)
      await advancePolls(MAX_CHAT_POLL_ATTEMPTS + 2)

      expect(markSpy).not.toHaveBeenCalled()
      markSpy.mockRestore()
      vi.mocked(api.get).mockReset()
    })
  })
})
