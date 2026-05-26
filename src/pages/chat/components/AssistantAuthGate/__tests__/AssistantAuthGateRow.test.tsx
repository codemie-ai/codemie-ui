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
import { describe, expect, it, vi } from 'vitest'

import type { MCPAuthGateServer } from '@/types/entity/mcpAuth'

import AssistantAuthGateRow from '../AssistantAuthGateRow'

const createRow = (overrides: Partial<MCPAuthGateServer> = {}): MCPAuthGateServer => ({
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

describe('AssistantAuthGateRow', () => {
  it('renders OAuth2 pending redirect confirmation with Continue and Cancel actions', async () => {
    const user = userEvent.setup()
    const onAuthenticate = vi.fn()
    const onContinue = vi.fn()
    const onCancel = vi.fn()

    render(
      <AssistantAuthGateRow
        row={createRow({
          pending_initiate: {
            auth_url: 'https://idp.example.com/start',
            redirect_uri_hostname: 'localhost:8080',
            localhost_warning: true,
          },
        })}
        onAuthenticate={onAuthenticate}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    )

    expect(screen.getByText('login.github.com')).toBeInTheDocument()
    expect(screen.getByText('Redirect URI: localhost:8080')).toBeInTheDocument()
    expect(
      screen.getByText('This auth flow will redirect to your local machine')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Authenticate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-authenticate' })).not.toBeInTheDocument()
    expect(screen.queryByText('Waiting for browser sign-in')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onAuthenticate).not.toHaveBeenCalled()
    expect(onContinue).toHaveBeenCalledWith('mcp-1')
    expect(onCancel).toHaveBeenCalledWith('mcp-1')
  })

  it('renders session-expired pending rows without localhost notice when warning is false', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    const onCancel = vi.fn()

    render(
      <AssistantAuthGateRow
        row={createRow({
          status: 'session_expired',
          recoverable_status: 'session_expired',
          pending_initiate: {
            auth_url: 'https://idp.example.com/start',
            redirect_uri_hostname: 'api.example.com',
            localhost_warning: false,
          },
        })}
        onAuthenticate={vi.fn()}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    )

    expect(screen.getByText('Redirect URI: api.example.com')).toBeInTheDocument()
    expect(
      screen.queryByText('This auth flow will redirect to your local machine')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-authenticate' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onContinue).toHaveBeenCalledWith('mcp-1')
    expect(onCancel).toHaveBeenCalledWith('mcp-1')
  })

  it('preserves non-OAuth2 immediate authentication rendering without redirect metadata', () => {
    render(
      <AssistantAuthGateRow
        row={createRow({
          auth_type: 'saml',
          initiate_url: '/v1/mcp-auth/saml/initiate',
          pending_initiate: null,
        })}
        onAuthenticate={vi.fn()}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Authenticate' })).toBeInTheDocument()
    expect(screen.queryByText(/^Redirect URI:/)).not.toBeInTheDocument()
  })
})
