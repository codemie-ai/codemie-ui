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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Conversation } from '@/types/entity/conversation'

// react-resizable-panels is intentionally NOT mocked — the real Separator
// must render with role="separator" for these assertions to be meaningful.
import ChatPage from '../ChatPage'

const { mockChatsStore, mockChatGenerationStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    getChat: vi.fn(),
  },
  mockChatGenerationStore: {
    markPromptAuthSuccess: vi.fn(),
    rollbackPromptAuthRow: vi.fn(),
  },
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({
    currentRoute: { value: { params: { id: 'chat-1' } } },
  })),
}))

vi.mock('@/hooks/useNewIntegrationPopup', () => ({
  useNewIntegrationPopup: vi.fn(() => ({
    showNewIntegration: false,
    selectedCredentialType: null,
    selectedProject: null,
    showNewIntegrationPopup: vi.fn(),
    hideNewIntegrationPopup: vi.fn(),
    onIntegrationSuccess: vi.fn(),
  })),
}))

vi.mock('@/hooks/useAuthCallbackListener', () => ({
  AUTH_CALLBACK_HINT_MESSAGE:
    'Sign-in is taking longer than usual. It can still complete — or click to try again.',
  useAuthCallbackListener: vi.fn(() => ({ authFlows: {} })),
}))

vi.mock('../hooks/useChatConfiguration', () => ({
  useChatConfiguration: vi.fn(() => ({
    isConfigVisible: false,
    toggleConfigVisibility: vi.fn(),
    attemptToggleConfigVisibility: vi.fn(),
    openConfigForm: vi.fn(),
  })),
}))

vi.mock('../hooks/useChatNavigation', () => ({ useChatNavigation: vi.fn() }))
vi.mock('../hooks/useChatInitialPrompt', () => ({ useChatInitialPrompt: vi.fn() }))

vi.mock('../hooks/useChatPromptResize', () => ({
  useChatPromptResize: vi.fn(() => ({
    defaultLayout: undefined,
    debouncedOnLayoutChanged: vi.fn(),
    userId: 'test-user',
  })),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/chatGeneration', () => ({ chatGenerationStore: mockChatGenerationStore }))

vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ renderHeader, children }: any) => (
    <div>
      <div>{renderHeader}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('../components/ChatSidebar/ChatSidebar', () => ({ default: () => <div /> }))
vi.mock('../components/ChatHeader/ChatHeader', () => ({ default: () => <div /> }))
vi.mock('../components/ChatHistory/ChatHistory', () => ({
  default: () => <div data-testid="chat-history" />,
}))
vi.mock('../components/ChatPrompt/ChatPrompt', () => ({
  default: () => <div data-testid="chat-prompt" />,
}))
vi.mock('../components/ChatConfiguration/ChatConfiguration', () => ({ default: () => <div /> }))
vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({ default: () => <div /> }))

describe('ChatPage — resize separator (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = null
  })

  it('renders the resize handle (role=separator) when the chat has history', () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [[{ createdAt: '2026-07-16T00:00:00Z' }]],
      assistantIds: ['assistant-1'],
      assistantData: [],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as unknown as Conversation

    render(<ChatPage />)

    expect(screen.getByRole('separator', { name: 'Resize chat prompt area' })).toBeInTheDocument()
  })

  it('renders the resize handle even when the chat has no history', () => {
    mockChatsStore.currentChat = {
      id: 'chat-1',
      history: [],
      assistantIds: ['assistant-1'],
      assistantData: [],
      initialAssistantId: 'assistant-1',
      isWorkflow: false,
    } as unknown as Conversation

    render(<ChatPage />)

    expect(screen.getByRole('separator', { name: 'Resize chat prompt area' })).toBeInTheDocument()
    // Panel element is always in the DOM (1 match); ChatHistory content absent means no second match.
    expect(screen.queryAllByTestId('chat-history')).toHaveLength(1)
  })
})
