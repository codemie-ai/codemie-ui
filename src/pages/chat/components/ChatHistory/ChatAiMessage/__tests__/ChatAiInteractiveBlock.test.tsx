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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { ChatMessage } from '@/types/entity/conversation'
import type { InteractiveRequest } from '@/types/entity/interactive'

import ChatAiMessage from '../ChatAiMessage'

const { mockSubmitInteractiveResponse, mockChatsStore } = vi.hoisted(() => ({
  mockSubmitInteractiveResponse: vi.fn(),
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      isWorkflow: false,
      history: [] as ChatMessage[][],
    },
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn(() => mockChatsStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: {
    submitInteractiveResponse: (...args: unknown[]) => mockSubmitInteractiveResponse(...args),
    editChatGeneration: vi.fn(),
  },
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => ({
    selectedAssistant: null,
    openConfigForm: vi.fn(),
    closeConfig: vi.fn(),
    isSharedPage: false,
  })),
}))

vi.mock('@/components/Avatar/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}))

vi.mock('@/components/markdown/Markdown', () => ({
  default: ({ content }: { content?: string }) => <div data-testid="markdown">{content}</div>,
}))

vi.mock('@/components/Thought/Thought', () => ({
  default: () => <div data-testid="thought" />,
}))

vi.mock('../ChatAiMessageActions', () => ({
  default: ({ onStartEditing }: { onStartEditing: () => void }) => (
    <button data-testid="edit-action" onClick={onStartEditing}>
      edit
    </button>
  ),
}))

vi.mock('../ThinkingLoader', () => ({
  default: () => <div data-testid="thinking-loader" />,
}))

vi.mock('../../ChatUserMessage/EditMessageModal', () => ({
  default: () => null,
}))

vi.mock('@/utils/helpers', () => ({
  formatDateTime: vi.fn(() => 'Apr 30'),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
  },
}))

const interactiveRequest: InteractiveRequest = {
  request_id: 'r1',
  surface: [
    {
      type: 'row',
      children: [
        { type: 'button', id: 'approve', label: 'Approve' },
        { type: 'button', id: 'reject', label: 'Reject' },
      ],
    },
  ],
}

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'Assistant',
  request: 'Hello',
  requestRaw: 'Hello',
  response: 'Pick an action',
  createdAt: '2026-04-30T10:00:00.000Z',
  assistantId: 'assistant-1',
  assistant: {
    id: 'assistant-1',
    name: 'Assistant',
  },
  inProgress: false,
  executionId: null,
  ...overrides,
})

const renderMessage = (message: ChatMessage, historyIndex = 0) =>
  render(
    <ChatAiMessage
      indexes={{ historyIndex, messageIndex: 0 }}
      message={message}
      totalMessages={1}
      onChangeMessageIndex={vi.fn()}
    />
  )

describe('ChatAiMessage interactive block', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat.history = []
  })

  it('renders the interactive surface for a message with interactiveRequest', () => {
    const message = createMessage({ interactiveRequest })
    mockChatsStore.currentChat.history = [[message]]
    renderMessage(message)
    expect(screen.getByTestId('interactive-surface')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled()
  })

  it('submits the structured response through the store on click', async () => {
    const user = userEvent.setup()
    const message = createMessage({ interactiveRequest })
    mockChatsStore.currentChat.history = [[message]]
    renderMessage(message)
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    expect(mockSubmitInteractiveResponse).toHaveBeenCalledWith(
      { request_id: 'r1', kind: 'submit', payload: { action: 'approve', answers: {} } },
      expect.stringContaining('Approve'),
      undefined
    )
  })

  it('renders an answered form read-only (locked) until it is unlocked', () => {
    const message = createMessage({ interactiveRequest })
    const chip = createMessage({
      role: 'User',
      request: '✓ Approve',
      interactiveResponse: {
        request_id: 'r1',
        kind: 'submit',
        payload: { action: 'approve', answers: {} },
      },
    })
    mockChatsStore.currentChat.history = [[message], [chip]]
    renderMessage(message, 0)
    // Locked by default; the previously chosen action is still marked.
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
    expect(screen.getByTestId('interactive-selected-approve')).toBeInTheDocument()
  })

  it('unlocking an answered form via Edit re-enables it and re-answer replaces its turn', async () => {
    const user = userEvent.setup()
    const message = createMessage({ interactiveRequest })
    const chip = createMessage({
      role: 'User',
      request: '✓ Approve',
      interactiveResponse: {
        request_id: 'r1',
        kind: 'submit',
        payload: { action: 'approve', answers: {} },
      },
    })
    const newerTurn = createMessage({ role: 'User', request: 'something else' })
    // Even with a newer turn after the answer, Edit unlocks it (edit-parity), and
    // re-answering replaces the answer turn (index 1).
    mockChatsStore.currentChat.history = [[message], [chip], [newerTurn]]
    renderMessage(message, 0)
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled()
    await user.click(screen.getByTestId('edit-action'))
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Reject' }))
    expect(mockSubmitInteractiveResponse).toHaveBeenCalledWith(
      { request_id: 'r1', kind: 'submit', payload: { action: 'reject', answers: {} } },
      expect.any(String),
      1
    )
  })

  it('disables an unanswered block that is not the last turn (stale state)', () => {
    const message = createMessage({ interactiveRequest })
    const newerTurn = createMessage({ role: 'User', request: 'something else' })
    mockChatsStore.currentChat.history = [[message], [newerTurn]]
    renderMessage(message, 0)
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
  })

  it('does not render the surface without interactiveRequest', () => {
    const message = createMessage()
    mockChatsStore.currentChat.history = [[message]]
    renderMessage(message)
    expect(screen.queryByTestId('interactive-surface')).not.toBeInTheDocument()
  })
})
