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

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'

import { useWorkflowExecutionPoll } from '../useWorkflowExecutionPoll'

const mockChatsStore = vi.hoisted(() => ({
  currentChat: null as {
    id: string
    isWorkflow?: boolean
    isInterrupted?: boolean
    history: {
      executionId?: string | null
      executionStatus?: string
      inProgress?: boolean
      response?: string
      stream?: { isStreaming: boolean } | null
      generationStopped?: boolean
      thoughts?: {
        id?: string
        message?: string
        in_progress?: boolean
        aborted?: boolean
        interrupted?: boolean
        tool_name?: string
        author_name?: string
        input_text?: string
        output_format?: string
        error?: boolean
      }[]
    }[][]
  } | null,
  openedChatsHistory: [] as (typeof mockChatsStore.currentChat)[],
  refreshWorkflowExecutionIds: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

const setOpenChat = (chat: NonNullable<typeof mockChatsStore.currentChat>) => {
  mockChatsStore.currentChat = chat
  mockChatsStore.openedChatsHistory = [chat]
}

describe('useWorkflowExecutionPoll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.refreshWorkflowExecutionIds.mockReset().mockResolvedValue(undefined)
    vi.useFakeTimers()
    mockChatsStore.currentChat = null
    mockChatsStore.openedChatsHistory = []
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
  })

  it('does not poll when the open chat has no In Progress executionStatus', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'Succeeded', inProgress: false }]],
    })
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('polls refreshWorkflowExecutionIds every 4s while executionStatus is In Progress', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
    })
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledWith('chat-1')
  })

  it.each(WORKFLOW_FINAL_STATUSES)(
    'does not poll a %s run even when a thought is still in_progress (stuck step)',
    async (status) => {
      setOpenChat({
        id: 'chat-1',
        isWorkflow: true,
        history: [
          [
            {
              executionStatus: status,
              inProgress: false,
              executionId: 'exec-1',
              thoughts: [{ id: 's1', in_progress: true }],
            },
          ],
        ],
      })
      renderHook(() => useWorkflowExecutionPoll('chat-1'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000)
      })
      expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
    }
  )

  it('does not poll when executionStatus is missing but a thought is still in_progress', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [
        [
          {
            inProgress: false,
            executionId: 'exec-1',
            thoughts: [{ id: 's1', in_progress: true }],
          },
        ],
      ],
    })
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('does not poll when executionStatus is missing even if the message itself is in_progress', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [
        [
          {
            inProgress: true,
            executionId: 'exec-1',
            thoughts: [{ id: 's1', in_progress: true }],
          },
        ],
      ],
    })
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('does not poll a non-workflow chat even when the message is in_progress', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: false,
      history: [
        [
          {
            inProgress: true,
            executionId: 'exec-1',
          },
        ],
      ],
    })
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('does not poll while a live stream is open even if thoughts are in_progress', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [
        [
          {
            executionId: 'exec-1',
            executionStatus: 'In Progress',
            inProgress: true,
            stream: { isStreaming: true },
            thoughts: [{ in_progress: true }],
          },
        ],
      ],
    })
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('does not poll after the user stopped generation on this page', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [
        [
          {
            executionId: 'exec-1',
            executionStatus: 'In Progress',
            inProgress: false,
            generationStopped: true,
            thoughts: [{ in_progress: true }],
          },
        ],
      ],
    })
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('stops polling after unmount', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'In Progress', inProgress: true }]],
    })
    const { unmount } = renderHook(() => useWorkflowExecutionPoll('chat-1'))
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('does not poll while the tab is hidden, and resumes when visible again', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
    })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })

    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledWith('chat-1')
  })

  it('backs off the polling interval after repeated unchanged fetches', async () => {
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
    })
    renderHook(() => useWorkflowExecutionPoll('chat-1'))

    const gaps = [4000, 4000, 4000, 8000]
    for (const gap of gaps) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await vi.advanceTimersByTimeAsync(gap)
      })
    }
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledTimes(4)
  })

  it('does not back off while refreshWorkflowExecutionIds keeps adding progress', async () => {
    const chat = {
      id: 'chat-1',
      isWorkflow: true,
      history: [
        [
          {
            executionStatus: 'In Progress',
            inProgress: true,
            executionId: 'exec-1',
            thoughts: [] as { in_progress?: boolean }[],
          },
        ],
      ],
    }
    setOpenChat(chat)
    let call = 0
    mockChatsStore.refreshWorkflowExecutionIds.mockImplementation(async () => {
      call += 1
      chat.history[0][0].thoughts = [
        { in_progress: true },
        ...Array(call).fill({ in_progress: true }),
      ]
    })

    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000)
      })
    }
    // stayed at the base 4s interval for all 4 polls -> 4 calls in 16s, no backoff
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledTimes(4)
  })

  type RunningChat = NonNullable<typeof mockChatsStore.currentChat>
  type RunningMessage = RunningChat['history'][number][number]

  it.each<[string, (chat: RunningChat, message: RunningMessage, call: number) => void]>([
    [
      'executionStatus',
      (_chat, message, call) => {
        message.executionStatus = call % 2 ? 'Interrupted' : 'In Progress'
      },
    ],
    [
      'isInterrupted',
      (chat, _message, call) => {
        chat.isInterrupted = call % 2 === 1
      },
    ],
    [
      'the response text',
      (_chat, message, call) => {
        message.response = 'x'.repeat(call)
      },
    ],
    [
      "an existing thought's text",
      (_chat, message, call) => {
        message.thoughts![0]!.message = 'x'.repeat(call)
      },
    ],
    [
      "an existing thought's tool_name",
      (_chat, message, call) => {
        message.thoughts![0]!.tool_name = `tool-${call}`
      },
    ],
    [
      "an existing thought's author_name",
      (_chat, message, call) => {
        message.thoughts![0]!.author_name = `author-${call}`
      },
    ],
    [
      "an existing thought's input_text",
      (_chat, message, call) => {
        message.thoughts![0]!.input_text = `input-${call}`
      },
    ],
    [
      "an existing thought's output_format",
      (_chat, message, call) => {
        message.thoughts![0]!.output_format = call % 2 ? 'markdown' : 'text'
      },
    ],
    [
      "an existing thought's error flag",
      (_chat, message, call) => {
        message.thoughts![0]!.error = call % 2 === 1
      },
    ],
    [
      "an existing thought's in_progress flag",
      (_chat, message, call) => {
        message.thoughts![0]!.in_progress = call % 2 === 0
      },
    ],
    [
      "an existing thought's aborted flag",
      (_chat, message, call) => {
        message.thoughts![0]!.aborted = call % 2 === 1
      },
    ],
    [
      "an existing thought's interrupted flag",
      (_chat, message, call) => {
        message.thoughts![0]!.interrupted = call % 2 === 1
      },
    ],
    [
      "the message's inProgress flag",
      (_chat, message, call) => {
        message.inProgress = call % 2 === 0
      },
    ],
    [
      "the message's executionId",
      (_chat, message, call) => {
        message.executionId = `exec-${call}`
      },
    ],
    [
      'the response text with a same-length edit',
      (_chat, message, call) => {
        message.response = call % 2 ? 'aaaa' : 'bbbb'
      },
    ],
    [
      "an existing thought's text with a same-length edit",
      (_chat, message, call) => {
        message.thoughts![0]!.message = call % 2 ? 'aaaa' : 'bbbb'
      },
    ],
  ])(
    'does not back off while refreshWorkflowExecutionIds keeps changing %s',
    async (_field, mutate) => {
      const message: RunningMessage = {
        executionStatus: 'In Progress',
        inProgress: true,
        executionId: 'exec-1',
        response: '',
        thoughts: [{ id: 's1', message: '', in_progress: true }],
      }
      const chat: RunningChat = { id: 'chat-1', isWorkflow: true, history: [[message]] }
      setOpenChat(chat)
      let call = 0
      mockChatsStore.refreshWorkflowExecutionIds.mockImplementation(async () => {
        call += 1
        mutate(chat, message, call)
      })

      renderHook(() => useWorkflowExecutionPoll('chat-1'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20000)
      })
      // every poll reported a change -> stayed at the base 4s: 5 calls in 20s (backoff would give 4)
      expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledTimes(5)
    }
  )

  it('compares the polled chat by id, unaffected by switching the open chat mid-poll', async () => {
    const chatA = {
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
    }
    const chatB = {
      id: 'chat-2',
      isWorkflow: true,
      history: [[{ executionStatus: 'Succeeded', inProgress: false, executionId: 'exec-2' }]],
    }
    mockChatsStore.currentChat = chatA
    mockChatsStore.openedChatsHistory = [chatA, chatB]
    // the user switches chats while every refresh is in flight; chat-1 itself never changes
    mockChatsStore.refreshWorkflowExecutionIds.mockImplementation(async () => {
      mockChatsStore.currentChat = mockChatsStore.currentChat === chatA ? chatB : chatA
    })

    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16000)
    })
    // three unchanged polls of chat-1 backed off to 8s, so there is no 4th poll at 16s
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledTimes(3)
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledWith('chat-1')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledTimes(4)
  })

  it('lets a refreshWorkflowExecutionIds rejection propagate to usePolling error backoff', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setOpenChat({
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
    })
    mockChatsStore.refreshWorkflowExecutionIds.mockRejectedValueOnce(new Error('network'))

    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error))
  })
})
