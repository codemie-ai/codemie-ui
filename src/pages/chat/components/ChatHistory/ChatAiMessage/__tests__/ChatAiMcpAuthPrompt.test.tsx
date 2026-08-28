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

import type { MCPAuthGateServer } from '@/types/entity/mcpAuth'

import ChatAiMcpAuthPrompt from '../ChatAiMcpAuthPrompt'

const { mockInitiatePromptAuth, mockContinuePromptAuth, mockCancelPromptAuth } = vi.hoisted(() => ({
  mockInitiatePromptAuth: vi.fn(),
  mockContinuePromptAuth: vi.fn(),
  mockCancelPromptAuth: vi.fn(),
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: {
    initiatePromptAuth: (...args: unknown[]) => mockInitiatePromptAuth(...args),
    continuePromptAuth: (...args: unknown[]) => mockContinuePromptAuth(...args),
    cancelPromptAuth: (...args: unknown[]) => mockCancelPromptAuth(...args),
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

describe('ChatAiMcpAuthPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders inline auth rows for recoverable, authenticating, and config-error states', async () => {
    const user = userEvent.setup()

    render(
      <ChatAiMcpAuthPrompt
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
            error_context:
              'Sign-in is taking longer than usual. It can still complete — or click to try again.',
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
      screen.getByText(
        'Sign-in is taking longer than usual. It can still complete — or click to try again.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('idp_denied')).toBeInTheDocument()
    expect(
      screen.getByText('Waiting for browser sign-in — a long sign-in is normal.')
    ).toBeInTheDocument()
    expect(screen.getByText(/Client secret is missing\./)).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Authenticate' }))
    await user.click(screen.getByRole('button', { name: 'Re-authenticate' }))

    expect(mockInitiatePromptAuth).toHaveBeenNthCalledWith(1, 'chat-1', 3, 1, 'mcp-timeout')
    expect(mockInitiatePromptAuth).toHaveBeenNthCalledWith(2, 'chat-1', 3, 1, 'mcp-expired')
  })

  it('renders a compact success state once every prompt row is authenticated', () => {
    render(
      <ChatAiMcpAuthPrompt
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
      <ChatAiMcpAuthPrompt
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
})
