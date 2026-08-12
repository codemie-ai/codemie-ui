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
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { ChatMessage, Thought as ThoughtType, ThoughtAuthorType } from '@/types/entity/conversation'
import type { InteractiveRequest } from '@/types/entity/interactive'

import ChatAiMessage from '../ChatAiMessage'

const { mockChatContext, mockChatsStore } = vi.hoisted(() => ({
  mockChatContext: {
    selectedAssistant: null,
    openConfigForm: vi.fn(),
    closeConfig: vi.fn(),
    isSharedPage: false,
    hideToolOutputs: false,
  },
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
    submitInteractiveResponse: vi.fn(),
    editChatGeneration: vi.fn(),
    initiatePromptAuth: vi.fn(),
    continuePromptAuth: vi.fn(),
    cancelPromptAuth: vi.fn(),
  },
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: { configs: [] } }))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => mockChatContext),
}))

vi.mock('@/components/Avatar/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}))

vi.mock('@/components/markdown/Markdown', () => ({
  default: ({ content }: { content?: string }) => <div data-testid="markdown">{content}</div>,
}))

vi.mock('@/components/Thought/Thought', () => ({
  default: ({ thought }: { thought: ThoughtType }) => (
    <div data-testid="thought">{thought.author_name}</div>
  ),
}))

vi.mock('../ChatAiMessageActions', () => ({
  default: () => <div data-testid="message-actions" />,
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
    info: vi.fn(),
  },
}))

// --- Helpers for processing-metadata tests ---

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'Assistant',
  request: 'Hello',
  requestRaw: 'Hello',
  response: 'Done',
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

const renderMessage = (message: ChatMessage) =>
  render(
    <ChatAiMessage
      indexes={{ historyIndex: 0, messageIndex: 0 }}
      message={message}
      totalMessages={1}
      onChangeMessageIndex={vi.fn()}
    />
  )

// --- Helpers for tool-outputs tests ---

const createMockThought = (id: string): ThoughtType => ({
  id,
  author_name: `Tool ${id}`,
  author_type: ThoughtAuthorType.Tool,
  message: 'result',
  in_progress: false,
})

const createMockMessage = (overrides?: Partial<ChatMessage>): ChatMessage =>
  ({
    role: 'Assistant',
    response: 'Final answer',
    createdAt: '2026-01-01T00:00:00Z',
    assistant: { id: 'a1', name: 'TestAssistant' },
    assistantId: 'a1',
    inProgress: false,
    executionId: null,
    ...overrides,
  } as ChatMessage)

const defaultIndexes = { historyIndex: 0, messageIndex: 0 }

// ---

describe('ChatAiMessage processing metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat.history = []
  })

  it('renders the processing duration for a completed message', () => {
    renderMessage(createMessage({ processingTime: 3.2 }))
    expect(screen.getByText(/Processed in: 3\.20s/)).toBeInTheDocument()
  })

  it('renders the processing duration when the response completed in under a millisecond', () => {
    renderMessage(createMessage({ processingTime: 0 }))
    expect(screen.getByText(/Processed in: 0\.00s/)).toBeInTheDocument()
  })

  it('omits the duration but keeps the timestamp when no processing time is known', () => {
    renderMessage(createMessage({ processingTime: undefined }))
    expect(screen.queryByText(/Processed in:/)).not.toBeInTheDocument()
    expect(screen.getByText(/Apr 30/)).toBeInTheDocument()
  })

  it('renders the processing duration for a checkbox-only response with no assistant text', () => {
    const checkboxRequest: InteractiveRequest = {
      request_id: 'r1',
      surface: [
        { type: 'text', content: 'Select one or more checkboxes:' },
        { type: 'checkbox', id: 'newsletter', label: 'Subscribe to newsletter' },
        { type: 'checkbox', id: 'terms', label: 'I agree to the terms' },
        { type: 'button', id: 'submit', label: 'Submit' },
      ],
    }
    const message = createMessage({
      response: undefined,
      processingTime: 1.5,
      interactiveRequest: checkboxRequest,
    })
    mockChatsStore.currentChat.history = [[message]]

    renderMessage(message)

    expect(screen.getByText(/Processed in: 1\.50s/)).toBeInTheDocument()
    expect(screen.getByLabelText('I agree to the terms')).toBeInTheDocument()
  })
})

describe('ChatAiMessage — tool outputs visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatContext.hideToolOutputs = false
  })

  it('renders thoughts when hideToolOutputs is false (default)', () => {
    const message = createMockMessage({
      thoughts: [createMockThought('t1'), createMockThought('t2')],
    })

    render(
      <ChatAiMessage
        indexes={defaultIndexes}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )

    expect(screen.queryAllByTestId('thought')).toHaveLength(2)
    expect(screen.getByText('Tool t1')).toBeInTheDocument()
    expect(screen.getByText('Tool t2')).toBeInTheDocument()
  })

  it('hides thoughts when hideToolOutputs is true', () => {
    mockChatContext.hideToolOutputs = true
    const message = createMockMessage({
      thoughts: [createMockThought('t1')],
    })

    render(
      <ChatAiMessage
        indexes={defaultIndexes}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )

    expect(screen.queryByTestId('thought')).not.toBeInTheDocument()
  })

  it('does not render the thoughts container when thoughts array is empty', () => {
    const message = createMockMessage({ thoughts: [] })

    render(
      <ChatAiMessage
        indexes={defaultIndexes}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )

    expect(screen.queryByTestId('thought')).not.toBeInTheDocument()
  })

  it('does not render the thoughts container when thoughts is undefined', () => {
    const message = createMockMessage({ thoughts: undefined })

    render(
      <ChatAiMessage
        indexes={defaultIndexes}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )

    expect(screen.queryByTestId('thought')).not.toBeInTheDocument()
  })

  it('always renders the final response regardless of hideToolOutputs', () => {
    mockChatContext.hideToolOutputs = true
    const message = createMockMessage({
      thoughts: [createMockThought('t1')],
      response: 'The final answer',
    })

    render(
      <ChatAiMessage
        indexes={defaultIndexes}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )

    expect(screen.getByTestId('markdown')).toBeInTheDocument()
    expect(screen.queryByTestId('thought')).not.toBeInTheDocument()
  })
})
