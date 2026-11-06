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

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { FC } from 'react'
import { useSnapshot } from 'valtio'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  pausedHistoryItemBackend,
  s5BatchPausedConversation,
  s5FirstPendingId,
  s5SecondStepId,
} from '@/store/__tests__/fixtures/toolCallResume.fixtures'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import { TOOL_CALL_DENIED_MESSAGE, ToolCallAction } from '@/types/chatGeneration'
import type { ChatMessage, Thought } from '@/types/entity/conversation'
import { transformChatBEtoFE } from '@/utils/chatHelpers'

import ChatAiMessage from '../ChatAiMessage'

// Real Valtio on both stores. The chat store is a bare `proxy()` holding the paused entry, the
// chat generation store is the production one with only the network call stubbed, so a click
// runs the exact AC2 chain: decideToolCall -> toolCallChoices mutation -> useSnapshot re-render.
vi.mock('@/store/chats', async () => {
  const { proxy } = await vi.importActual<typeof import('valtio')>('valtio')
  return {
    chatsStore: proxy({
      currentChat: { id: 'chat-1', isWorkflow: false, history: [] as ChatMessage[][] },
      configs: [],
      openedChatsHistory: [],
    }),
  }
})
vi.mock('@/store/appInfo', async () => {
  const { proxy } = await vi.importActual<typeof import('valtio')>('valtio')
  return { appInfoStore: proxy({ configs: [] }) }
})
vi.mock('@/store/assistants', () => ({ assistantsStore: {} }))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/api', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn(), stream: vi.fn() },
  ABORT_ERROR: 'AbortError',
}))
vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(), getObject: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/utils/stream', () => ({ default: vi.fn(), streamChunkToObject: vi.fn() }))
vi.mock('@/utils/mcpAuth', () => ({ parseMCPAuthRequiredErrorPayload: vi.fn() }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/hooks/useVueRouter', () => ({
  router: { push: vi.fn(), replace: vi.fn() },
  useVueRouter: vi.fn(() => ({ push: vi.fn() })),
}))
vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => ({
    selectedAssistant: null,
    openConfigForm: vi.fn(),
    closeConfig: vi.fn(),
    isSharedPage: false,
    hideToolOutputs: false,
  })),
}))
vi.mock('@/components/Avatar/Avatar', () => ({ default: () => <div /> }))
vi.mock('@/components/markdown/Markdown', () => ({ default: () => <div /> }))
vi.mock('@/components/markdown/TextBlock', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))
vi.mock('../ChatAiMessageActions', () => ({ default: () => <div /> }))
vi.mock('../ThinkingLoader', () => ({ default: () => <div /> }))
vi.mock('../ChatA2uiBlock', () => ({ default: () => null }))
vi.mock('../../ChatUserMessage/EditMessageModal', () => ({ default: () => null }))

const store = chatsStore as unknown as {
  currentChat: { id: string; isWorkflow: boolean; history: ChatMessage[][] }
}

const T = (v: any): Thought => structuredClone(v) as Thought

const batchMessage = (): ChatMessage =>
  ({
    role: 'Assistant',
    response: 'r',
    createdAt: '2026-01-01T00:00:00Z',
    assistant: { id: 'a1', name: 'A' },
    assistantId: 'a1',
    inProgress: false,
    stream: null,
    executionId: null,
    thoughts: s5BatchPausedConversation.thoughts.map(T),
  } as ChatMessage)

// Mirrors ChatHistory: the message comes off the chats snapshot and is the last history item.
const Harness: FC = () => {
  const snapshot = useSnapshot(chatsStore) as unknown as typeof store
  const historyIndex = snapshot.currentChat.history.length - 1
  const message = snapshot.currentChat.history[historyIndex][0]
  return (
    <ChatAiMessage
      indexes={{ historyIndex, messageIndex: 0 }}
      message={message}
      totalMessages={1}
      onChangeMessageIndex={() => undefined}
    />
  )
}

const allowButtons = () => screen.queryAllByRole('button', { name: /allow/i })
const denyButtons = () => screen.queryAllByRole('button', { name: /deny/i })
const stepElement = (id: string) =>
  document.querySelector(`[data-thought-id="${id}"]`) as HTMLElement

describe('ChatAiMessage tool confirmation against real Valtio stores', () => {
  let sendRequest: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn() as unknown as Element['scrollIntoView']
    chatGenerationStore.toolCallChoices = {}
    store.currentChat.history = [[batchMessage()]]
    sendRequest = vi.spyOn(chatGenerationStore, '_sendRequest').mockResolvedValue(undefined)
  })

  it('relabels a clicked step and drops its buttons without a manual rerender (AC2)', async () => {
    render(<Harness />)
    expect(allowButtons()).toHaveLength(2)

    fireEvent.click(within(stepElement(s5FirstPendingId)).getByRole('button', { name: /allow/i }))

    expect(await screen.findByText('Allowed')).toBeInTheDocument()
    expect(allowButtons()).toHaveLength(1)
    expect(
      within(stepElement(s5SecondStepId)).getByRole('button', { name: /allow/i })
    ).toBeEnabled()
    expect(chatGenerationStore.toolCallChoices).toEqual({
      [s5FirstPendingId]: ToolCallAction.ALLOW,
    })
    expect(sendRequest).not.toHaveBeenCalled()
  })

  it('sends the batch on the last click and clears every label and choice (AC2, AC3)', async () => {
    render(<Harness />)
    fireEvent.click(within(stepElement(s5FirstPendingId)).getByRole('button', { name: /allow/i }))
    await screen.findByText('Allowed')

    fireEvent.click(within(stepElement(s5SecondStepId)).getByRole('button', { name: /deny/i }))

    await waitFor(() => expect(screen.queryByText('Allowed')).not.toBeInTheDocument())
    expect(screen.queryByText('Denied')).not.toBeInTheDocument()
    expect(allowButtons()).toHaveLength(0)
    expect(denyButtons()).toHaveLength(0)
    // On-send states reached the store entry the view renders from (rule 6)
    const entry = store.currentChat.history[0][0]
    expect(entry.inProgress).toBe(true)
    expect(entry.thoughts![2].children![0]).toMatchObject({
      aborted: true,
      interrupted: false,
      message: TOOL_CALL_DENIED_MESSAGE,
    })
    expect(chatGenerationStore.toolCallChoices).toEqual({})
    expect(sendRequest).toHaveBeenCalledTimes(1)
    expect(sendRequest.mock.calls[0][3]).toMatchObject({
      resume: {
        decisions: [
          { thought_id: s5FirstPendingId, action: ToolCallAction.ALLOW },
          { thought_id: s5SecondStepId, action: ToolCallAction.DENY },
        ],
      },
    })
  })

  it('shows active Allow/Deny on a paused entry loaded from GET /v1/conversations (AC15)', () => {
    const chat = transformChatBEtoFE({
      id: 'chat-1',
      conversation_name: 'Paused',
      assistant_ids: ['a1'],
      initial_assistant_id: 'a1',
      assistant_data: [],
      history: [
        { historyIndex: 0, role: 'User', message: 'go', date: '2026-01-01T00:00:00.000Z' },
        { ...pausedHistoryItemBackend, historyIndex: 0 },
      ],
    } as any)
    store.currentChat.history = chat.history

    render(<Harness />)

    expect(allowButtons()).toHaveLength(2)
    expect(denyButtons()).toHaveLength(2)
    allowButtons().forEach((button) => expect(button).toBeEnabled())
    denyButtons().forEach((button) => expect(button).toBeEnabled())
  })
})
