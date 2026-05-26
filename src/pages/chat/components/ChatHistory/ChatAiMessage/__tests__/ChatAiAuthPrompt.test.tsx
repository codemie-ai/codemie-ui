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
import type { MCPAuthGateServer } from '@/types/entity/mcpAuth'

import ChatAiAuthPrompt from '../ChatAiAuthPrompt'
import ChatAiMessage from '../ChatAiMessage'

const {
  mockInitiatePromptAuth,
  mockContinuePromptAuth,
  mockCancelPromptAuth,
  mockEditChatGeneration,
  mockChatsStore,
} = vi.hoisted(() => ({
  mockInitiatePromptAuth: vi.fn(),
  mockContinuePromptAuth: vi.fn(),
  mockCancelPromptAuth: vi.fn(),
  mockEditChatGeneration: vi.fn(),
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      isWorkflow: false,
    },
  },
}))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn(() => mockChatsStore),
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: {
    initiatePromptAuth: (...args: unknown[]) => mockInitiatePromptAuth(...args),
    continuePromptAuth: (...args: unknown[]) => mockContinuePromptAuth(...args),
    cancelPromptAuth: (...args: unknown[]) => mockCancelPromptAuth(...args),
    editChatGeneration: (...args: unknown[]) => mockEditChatGeneration(...args),
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
  default: () => <div data-testid="chat-ai-message-actions" />,
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

const createPromptRow = (overrides: Partial<MCPAuthGateServer> = {}): MCPAuthGateServer => ({
  mcp_config_id: 'mcp-1',
  mcp_config_name: 'GitHub',
  mcp_server_name: 'GitHub',
  auth_config_id: 'auth-1',
  auth_type: 'oauth2',
  as_hostname: 'login.github.com',
  status: 'authentication_required',
  error_context: null,
  initiate_url: '/v1/mcp-auth/oauth2/initiate',
  recoverable_status: 'authentication_required',
  ...overrides,
})

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'User',
  request: 'Hello',
  requestRaw: 'Hello',
  response: 'Regular markdown response',
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

describe('ChatAiAuthPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders inline auth rows for recoverable, authenticating, and config-error states', async () => {
    const user = userEvent.setup()

    render(
      <ChatAiAuthPrompt
        chatId="chat-1"
        historyIndex={3}
        messageIndex={1}
        rows={[
          createPromptRow({
            mcp_config_id: 'mcp-timeout',
            mcp_config_name: 'Azure',
            mcp_server_name: 'Azure',
            auth_config_id: 'auth-timeout',
            status: 'authentication_required',
            error_context: "Authentication didn't complete. Click to try again.",
          }),
          createPromptRow({
            mcp_config_id: 'mcp-expired',
            mcp_config_name: 'Okta',
            mcp_server_name: 'Okta',
            auth_config_id: 'auth-expired',
            status: 'session_expired',
            error_context: 'idp_denied',
            auth_type: 'saml',
            as_hostname: 'sso.example.com',
            initiate_url: '/v1/mcp-auth/saml/initiate',
            recoverable_status: 'session_expired',
          }),
          createPromptRow({
            mcp_config_id: 'mcp-authing',
            mcp_config_name: 'GitHub',
            mcp_server_name: 'GitHub',
            auth_config_id: 'auth-authing',
            status: 'authenticating',
          }),
          createPromptRow({
            mcp_config_id: 'mcp-config-error',
            mcp_config_name: 'Broken Server',
            mcp_server_name: 'Broken Server',
            auth_config_id: 'auth-config-error',
            status: 'config_error',
            error_context: 'Client secret is missing.',
            initiate_url: null,
          }),
        ]}
      />
    )

    expect(screen.getByText('Re-authentication required')).toBeInTheDocument()
    expect(
      screen.getByText('Complete sign-in for the affected MCP server, then resend the failed turn.')
    ).toBeInTheDocument()
    expect(
      screen.getByText("Authentication didn't complete. Click to try again.")
    ).toBeInTheDocument()
    expect(screen.getByText('idp_denied')).toBeInTheDocument()
    expect(screen.getByText('Waiting for browser sign-in')).toBeInTheDocument()
    expect(screen.getByText(/Client secret is missing\./)).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Authenticate' }))
    await user.click(screen.getByRole('button', { name: 'Re-authenticate' }))

    expect(mockInitiatePromptAuth).toHaveBeenNthCalledWith(1, 'chat-1', 3, 1, 'mcp-timeout')
    expect(mockInitiatePromptAuth).toHaveBeenNthCalledWith(2, 'chat-1', 3, 1, 'mcp-expired')
  })

  it('renders a compact success state once every prompt row is authenticated', () => {
    render(
      <ChatAiAuthPrompt
        chatId="chat-1"
        historyIndex={0}
        messageIndex={0}
        rows={[
          createPromptRow({ mcp_config_id: 'mcp-1', status: 'authenticated' }),
          createPromptRow({ mcp_config_id: 'mcp-2', status: 'authenticated' }),
        ]}
      />
    )

    expect(screen.getByTestId('chat-ai-auth-prompt-success')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Re-authenticated successfully. Resend the failed turn or continue the conversation.'
      )
    ).toBeInTheDocument()
    expect(screen.queryByTestId('chat-ai-auth-prompt')).not.toBeInTheDocument()
  })

  it('wires OAuth2 pending Continue and Cancel actions through the chat generation store', async () => {
    const user = userEvent.setup()

    render(
      <ChatAiAuthPrompt
        chatId="chat-1"
        historyIndex={2}
        messageIndex={0}
        rows={[
          createPromptRow({
            pending_initiate: {
              auth_url: 'https://idp.example.com/start',
              redirect_uri_hostname: 'api.example.com:9443',
              localhost_warning: false,
            },
          }),
        ]}
      />
    )

    expect(screen.getByText('Redirect URI: api.example.com:9443')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockInitiatePromptAuth).not.toHaveBeenCalled()
    expect(mockContinuePromptAuth).toHaveBeenCalledWith('chat-1', 2, 0, 'mcp-1')
    expect(mockCancelPromptAuth).toHaveBeenCalledWith('chat-1', 2, 0, 'mcp-1')
  })

  it('replaces Markdown with ChatAiAuthPrompt when prompt rows exist on the message', () => {
    render(
      <ChatAiMessage
        indexes={{ historyIndex: 2, messageIndex: 0 }}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
        message={createMessage({
          response: 'This markdown should not render',
          mcpAuthPromptRows: [createPromptRow()],
        })}
      />
    )

    expect(screen.getByTestId('chat-ai-auth-prompt')).toBeInTheDocument()
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument()
  })
})
