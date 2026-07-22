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

import type { ChatMessage } from '@/types/entity/conversation'

import ChatUserMessage from '../ChatUserMessage'

const { mockChatsStore } = vi.hoisted(() => ({
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
    createChatGeneration: vi.fn(),
  },
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => ({
    isSharedPage: false,
    selectedSkills: [],
  })),
}))

vi.mock('@/hooks/useFileUpload', () => ({
  createFileMetadata: vi.fn((name: string) => ({ fileName: name })),
  useFileUpload: vi.fn(() => ({
    openFilePicker: vi.fn(),
    inputProps: { type: 'file', style: { display: 'none' } },
  })),
}))

vi.mock('../ChatUserMessageActions', () => ({
  default: () => <div data-testid="chat-user-message-actions" />,
}))

vi.mock('../EditMessageModal', () => ({
  default: () => null,
}))

vi.mock('@/components/Editor/Editor', () => ({
  default: () => <div data-testid="editor" />,
}))

vi.mock('@/components/File', () => ({
  default: () => <div data-testid="file" />,
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
  },
}))

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'User',
  request: 'Hello',
  requestRaw: 'Hello',
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
    <ChatUserMessage
      message={message}
      indexes={{ historyIndex: 0, messageIndex: 0 }}
      onSubmit={vi.fn()}
    />
  )

describe('ChatUserMessage interactive response chip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a compact chip instead of the raw message for structured responses', () => {
    const message = createMessage({
      request: 'Approve',
      requestRaw: 'Approve',
      interactiveResponse: { request_id: 'r1', kind: 'action', payload: { action: 'approve' } },
    })
    renderMessage(message)
    expect(screen.getByTestId('interactive-response-chip')).toHaveTextContent('✓ Approve')
  })

  it('renders the normal message body without a structured response', () => {
    renderMessage(createMessage())
    expect(screen.queryByTestId('interactive-response-chip')).not.toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
