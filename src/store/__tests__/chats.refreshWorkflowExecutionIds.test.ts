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

import type { Conversation } from '@/types/entity/conversation'
import api from '@/utils/api'

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

const openWorkflowChat = () => {
  chatsStore.openedChatsHistory = [
    {
      id: 'chat-1',
      name: 'WF',
      isWorkflow: true,
      assistantIds: [],
      assistantData: [],
      history: [
        [
          {
            role: 'Assistant',
            request: 'hi',
            response: '',
            createdAt: '2024-01-01',
            assistant: { id: 'a1', name: 'WF' },
            inProgress: true,
            thoughts: [{ id: 's1', message: '', in_progress: true, interrupted: false }],
            executionId: 'exec-1',
            executionStatus: 'In Progress',
            workflowExecutionRef: true,
          },
        ],
      ],
    } as Conversation,
  ]
  const [openChat] = chatsStore.openedChatsHistory
  chatsStore.currentChat = openChat
}

beforeEach(() => {
  vi.clearAllMocks()
  chatsStore.chats = []
  chatsStore.openedChatsHistory = []
  chatsStore.currentChat = null
})

describe('refreshWorkflowExecutionIds', () => {
  it('patches thoughts, response, and inProgress in place without replacing the open chat', async () => {
    openWorkflowChat()
    const openRef = chatsStore.openedChatsHistory[0]
    apiGet.mockResolvedValue(
      jsonResponse({
        id: 'chat-1',
        conversation_name: 'WF',
        assistant_ids: [],
        initial_assistant_id: '',
        assistant_data: [],
        is_workflow: true,
        history: [
          { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
          {
            historyIndex: 0,
            message: 'final',
            date: '2024-01-01',
            executionId: 'exec-1',
            workflowExecutionRef: true,
            executionStatus: 'Succeeded',
            thoughts: [
              {
                id: 's1',
                author_name: 'Find Items Todo',
                author_type: 'WorkflowState',
                message: 'done',
                in_progress: false,
                interrupted: false,
              },
            ],
          },
        ],
      })
    )

    await chatsStore.refreshWorkflowExecutionIds('chat-1')

    expect(chatsStore.openedChatsHistory[0]).toBe(openRef)
    const message = openRef!.history[0]![0]!
    expect(message.response).toBe('final')
    expect(message.inProgress).toBe(false)
    expect(message.executionStatus).toBe('Succeeded')
    expect(message.thoughts![0]!.in_progress).toBe(false)
    expect(message.thoughts![0]!.message).toBe('done')
  })

  it('replaces thoughts even when the fresh payload has an empty thoughts array', async () => {
    openWorkflowChat()
    apiGet.mockResolvedValue(
      jsonResponse({
        id: 'chat-1',
        conversation_name: 'WF',
        assistant_ids: [],
        initial_assistant_id: '',
        assistant_data: [],
        is_workflow: true,
        history: [
          { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
          {
            historyIndex: 0,
            message: '',
            date: '2024-01-01',
            executionId: 'exec-1',
            workflowExecutionRef: true,
            executionStatus: 'In Progress',
            thoughts: [],
          },
        ],
      })
    )

    await chatsStore.refreshWorkflowExecutionIds('chat-1')

    expect(chatsStore.openedChatsHistory[0]!.history[0]![0]!.thoughts).toEqual([])
    expect(chatsStore.openedChatsHistory[0]!.history[0]![0]!.inProgress).toBe(true)
  })

  it('does not replace thoughts while a live stream is open', async () => {
    openWorkflowChat()
    const message = chatsStore.openedChatsHistory[0]!.history[0]![0]!
    const liveThoughts = [
      {
        id: 'sse-tick-3',
        author_name: 'Tick 3 Of 100',
        message: '',
        in_progress: false,
        interrupted: false,
        children: [{ id: 'sse-thoughts', author_name: 'Codemie Thoughts', message: 'x' }],
      },
    ]
    message.thoughts = liveThoughts
    message.stream = { isStreaming: true } as Conversation['history'][0][0]['stream']

    apiGet.mockResolvedValue(
      jsonResponse({
        id: 'chat-1',
        conversation_name: 'WF',
        assistant_ids: [],
        initial_assistant_id: '',
        assistant_data: [],
        is_workflow: true,
        history: [
          { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
          {
            historyIndex: 0,
            message: '',
            date: '2024-01-01',
            executionId: 'exec-1',
            workflowExecutionRef: true,
            executionStatus: 'In Progress',
            thoughts: [
              {
                id: 'state-3',
                author_name: 'tick 3 of 100',
                author_type: 'WorkflowState',
                message: 'done',
                in_progress: false,
                interrupted: false,
              },
            ],
          },
        ],
      })
    )

    await chatsStore.refreshWorkflowExecutionIds('chat-1')

    expect(message.thoughts).toBe(liveThoughts)
    expect(message.thoughts![0]!.author_name).toBe('Tick 3 Of 100')
    expect(message.executionId).toBe('exec-1')
  })

  it('does not wipe a finished local response when GET is still In Progress with an empty message', async () => {
    openWorkflowChat()
    const message = chatsStore.openedChatsHistory[0]!.history[0]![0]!
    message.response = 'streamed final answer'
    message.inProgress = false
    message.thoughts = [{ id: 's1', message: 'done', in_progress: false, interrupted: false }]

    apiGet.mockResolvedValue(
      jsonResponse({
        id: 'chat-1',
        conversation_name: 'WF',
        assistant_ids: [],
        initial_assistant_id: '',
        assistant_data: [],
        is_workflow: true,
        history: [
          { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
          {
            historyIndex: 0,
            message: '',
            date: '2024-01-01',
            executionId: 'exec-1',
            workflowExecutionRef: true,
            executionStatus: 'In Progress',
            thoughts: [
              {
                id: 's1',
                author_name: 'Find Items Todo',
                author_type: 'WorkflowState',
                message: '',
                in_progress: true,
                interrupted: false,
              },
            ],
          },
        ],
      })
    )

    await chatsStore.refreshWorkflowExecutionIds('chat-1')

    expect(message.response).toBe('streamed final answer')
    expect(message.inProgress).toBe(false)
  })

  it('does not restore in-progress GET thoughts over a finished local answer', async () => {
    openWorkflowChat()
    const message = chatsStore.openedChatsHistory[0]!.history[0]![0]!
    const localThoughts = [{ id: 's1', message: 'done', in_progress: false, interrupted: false }]
    message.response = 'streamed final answer'
    message.inProgress = false
    message.executionStatus = 'Succeeded'
    message.thoughts = localThoughts

    apiGet.mockResolvedValue(
      jsonResponse({
        id: 'chat-1',
        conversation_name: 'WF',
        assistant_ids: [],
        initial_assistant_id: '',
        assistant_data: [],
        is_workflow: true,
        history: [
          { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
          {
            historyIndex: 0,
            message: '',
            date: '2024-01-01',
            executionId: 'exec-1',
            workflowExecutionRef: true,
            executionStatus: 'In Progress',
            thoughts: [
              {
                id: 's1',
                author_name: 'Find Items Todo',
                author_type: 'WorkflowState',
                message: '',
                in_progress: true,
                interrupted: false,
              },
            ],
          },
        ],
      })
    )

    await chatsStore.refreshWorkflowExecutionIds('chat-1')

    expect(message.response).toBe('streamed final answer')
    expect(message.inProgress).toBe(false)
    expect(message.executionStatus).toBe('Succeeded')
    expect(message.thoughts).toBe(localThoughts)
    expect(message.thoughts![0]!.in_progress).toBe(false)
  })

  it('does not restore in-progress thoughts after the user stopped generation', async () => {
    openWorkflowChat()
    const message = chatsStore.openedChatsHistory[0]!.history[0]![0]!
    message.generationStopped = true
    message.inProgress = false
    message.thoughts = [{ id: 's1', message: 'stopped locally', in_progress: false }]

    apiGet.mockResolvedValue(
      jsonResponse({
        id: 'chat-1',
        conversation_name: 'WF',
        assistant_ids: [],
        initial_assistant_id: '',
        assistant_data: [],
        is_workflow: true,
        history: [
          { historyIndex: 0, message: 'hi', date: '2024-01-01', executionId: null },
          {
            historyIndex: 0,
            message: '',
            date: '2024-01-01',
            executionId: 'exec-1',
            workflowExecutionRef: true,
            executionStatus: 'In Progress',
            thoughts: [
              {
                id: 's1',
                author_name: 'Find Items Todo',
                author_type: 'WorkflowState',
                message: 'still running',
                in_progress: true,
                interrupted: false,
              },
            ],
          },
        ],
      })
    )

    await chatsStore.refreshWorkflowExecutionIds('chat-1')

    expect(message.inProgress).toBe(false)
    expect(message.generationStopped).toBe(true)
    expect(message.thoughts).toEqual([{ id: 's1', message: 'stopped locally', in_progress: false }])
  })
})

describe('setOpenChat', () => {
  it('does not clobber an in-progress open chat when setOpenChat receives a fresh payload', () => {
    openWorkflowChat()
    const openRef = chatsStore.openedChatsHistory[0]!
    const result = chatsStore.setOpenChat({
      ...openRef,
      history: [[{ ...openRef.history[0]![0]!, response: 'stale getChat', inProgress: false }]],
    } as Conversation)
    expect(result).toBe(openRef)
    expect(openRef.history[0]![0]!.inProgress).toBe(true)
    expect(openRef.history[0]![0]!.response).toBe('')
  })
})
