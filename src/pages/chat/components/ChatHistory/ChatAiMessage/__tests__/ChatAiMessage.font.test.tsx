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

import { readFileSync } from 'fs'
import { resolve } from 'path'

import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeAll, vi } from 'vitest'

import type { ChatMessage } from '@/types/entity/conversation'

import ChatAiMessage from '../ChatAiMessage'

const { mockChatsStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: { id: 'chat-1', isWorkflow: false, history: [] as ChatMessage[][] },
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockChatsStore),
  subscribe: vi.fn(),
}))
vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: { submitInteractiveResponse: vi.fn(), editChatGeneration: vi.fn() },
}))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: vi.fn(() => ({ push: vi.fn() })) }))
vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => ({
    selectedAssistant: null,
    openConfigForm: vi.fn(),
    closeConfig: vi.fn(),
    isSharedPage: false,
  })),
}))
vi.mock('@/components/Avatar/Avatar', () => ({ default: () => <div /> }))
vi.mock('@/components/markdown/Markdown', () => ({ default: () => <div /> }))
vi.mock('@/components/Thought/Thought', () => ({ default: () => <div /> }))
vi.mock('../ThinkingLoader', () => ({ default: () => <div /> }))
vi.mock('../../ChatUserMessage/EditMessageModal', () => ({ default: () => null }))
vi.mock('@/utils/helpers', () => ({ formatDateTime: vi.fn(() => 'Apr 30') }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn() } }))
vi.mock('../ChatAiMessageActions', () => ({
  default: ({ onStartEditing }: { onStartEditing: () => void }) => (
    <button data-testid="start-editing" onClick={onStartEditing} />
  ),
}))

describe('ChatAiMessage edit textarea carries CSS class', () => {
  it('textarea carries the ai-message-edit-textarea CSS class when editing is active', () => {
    const message: Partial<ChatMessage> = {
      role: 'Assistant',
      request: 'q',
      requestRaw: 'q',
      response: 'answer',
      createdAt: '2026-08-05T00:00:00.000Z',
      assistantId: 'a-1',
      inProgress: false,
      executionId: null,
    }
    const { getByTestId, container } = render(
      <ChatAiMessage
        indexes={{ historyIndex: 0, messageIndex: 0 }}
        message={message as ChatMessage}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )

    fireEvent.click(getByTestId('start-editing'))

    const textarea = container.querySelector('textarea')
    expect(textarea?.classList.contains('ai-message-edit-textarea')).toBe(true)
  })
})

describe('ChatAiMessage.scss font-family wiring', () => {
  let scssContent: string

  beforeAll(() => {
    scssContent = readFileSync(resolve(__dirname, '../ChatAiMessage.scss'), 'utf-8')
  })

  it('uses the shared --font-family-body-sans custom property', () => {
    expect(scssContent).toContain('font-family: var(--font-family-body-sans)')
  })

  it('does not duplicate the Geist fallback list locally', () => {
    expect(scssContent).not.toContain('Geist, Arial, Helvetica, sans-serif')
  })
})
