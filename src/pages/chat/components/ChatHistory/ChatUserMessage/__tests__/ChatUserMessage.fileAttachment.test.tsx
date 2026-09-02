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

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@/types/entity/conversation'

import ChatUserMessage from '../ChatUserMessage'

const mockUseChatContext = vi.fn()
const mockEditorProps = vi.hoisted(() => ({ current: null as any }))

const { mockChatsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      isWorkflow: false,
      history: [] as ChatMessage[][],
      assistantData: [{ id: 'assistant-1', name: 'A1', type: 'codemie' }],
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
  useChatContext: () => mockUseChatContext(),
}))

vi.mock('@/hooks/useFileUpload', () => ({
  createFileMetadata: vi.fn((name: string) => ({ fileName: name })),
  useFileUpload: vi.fn(() => ({
    openFilePicker: vi.fn(),
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    hasActiveUploads: false,
    inputProps: { type: 'file', style: { display: 'none' } },
  })),
}))

vi.mock('../ChatUserMessageActions', () => ({
  default: ({ onStartEditing }: { onStartEditing: () => void }) => (
    <button type="button" onClick={onStartEditing}>
      Start edit
    </button>
  ),
}))

vi.mock('../EditMessageModal', () => ({
  default: () => null,
}))

vi.mock('@/components/Editor/Editor', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef((props: any, ref) => {
      mockEditorProps.current = props
      useImperativeHandle(ref, () => ({ focus: vi.fn() }))
      return <div data-testid="editor" />
    }),
  }
})

vi.mock('@/components/File', () => ({
  default: () => <div data-testid="file" />,
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
  },
}))

vi.mock('@/components/Editor/quillModules', () => ({
  getAnyMentions: vi.fn(() => []),
  getAssistantMentions: vi.fn(() => []),
  getMessageTextWithMentions: vi.fn((_, msg) => msg),
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

describe('ChatUserMessage file attachment gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChatContext.mockReturnValue({
      isSharedPage: false,
      selectedSkills: [],
      canAttachFiles: true,
    })
  })

  it('shows Attach File in edit mode when attachments are enabled', () => {
    render(
      <ChatUserMessage
        message={createMessage()}
        indexes={{ historyIndex: 0, messageIndex: 0 }}
        onSubmit={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Start edit'))

    expect(screen.getByText('Attach File')).toBeInTheDocument()
    expect(mockEditorProps.current.onAddFiles).toEqual(expect.any(Function))
  })

  it('hides Attach File and blocks editor uploads when attachments are disabled', () => {
    mockUseChatContext.mockReturnValue({
      isSharedPage: false,
      selectedSkills: [],
      canAttachFiles: false,
    })

    render(
      <ChatUserMessage
        message={createMessage()}
        indexes={{ historyIndex: 0, messageIndex: 0 }}
        onSubmit={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Start edit'))

    expect(screen.queryByText('Attach File')).not.toBeInTheDocument()
    expect(() => mockEditorProps.current.onAddFiles([new File(['x'], 'a.txt')])).not.toThrow()
  })
})
