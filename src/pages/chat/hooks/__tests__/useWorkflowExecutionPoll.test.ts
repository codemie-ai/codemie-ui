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

import { useWorkflowExecutionPoll } from '../useWorkflowExecutionPoll'

const mockChatsStore = vi.hoisted(() => ({
  currentChat: null as {
    id: string
    isWorkflow?: boolean
    history: {
      executionStatus?: string
      inProgress?: boolean
      executionId?: string
      stream?: { isStreaming: boolean } | null
      generationStopped?: boolean
      thoughts?: { in_progress?: boolean }[]
    }[][]
  } | null,
  refreshWorkflowExecutionIds: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

describe('useWorkflowExecutionPoll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockChatsStore.currentChat = null
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('does not poll when the open chat has no In Progress executionStatus', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'Succeeded', inProgress: false }]],
    }
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('polls refreshWorkflowExecutionIds every 4s while executionStatus is In Progress', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'In Progress', inProgress: true, executionId: 'exec-1' }]],
    }
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledWith('chat-1')
  })

  it('does not poll while a live stream is open even if thoughts are in_progress', async () => {
    mockChatsStore.currentChat = {
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
    }
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('polls when executionStatus is missing but a thought is still in_progress', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      history: [
        [
          {
            executionId: 'exec-1',
            inProgress: true,
            thoughts: [{ in_progress: true }],
          },
        ],
      ],
    }
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).toHaveBeenCalledWith('chat-1')
  })

  it('does not poll after the user stopped generation on this page', async () => {
    mockChatsStore.currentChat = {
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
    }
    renderHook(() => useWorkflowExecutionPoll('chat-1'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })

  it('stops polling after unmount', async () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      isWorkflow: true,
      history: [[{ executionStatus: 'In Progress', inProgress: true }]],
    }
    const { unmount } = renderHook(() => useWorkflowExecutionPoll('chat-1'))
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000)
    })
    expect(mockChatsStore.refreshWorkflowExecutionIds).not.toHaveBeenCalled()
  })
})
