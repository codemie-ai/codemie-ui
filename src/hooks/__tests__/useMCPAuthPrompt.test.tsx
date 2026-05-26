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

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMCPAuthPrompt } from '../useMCPAuthPrompt'

const { listenerCalls, mockPost, mockToasterError } = vi.hoisted(() => ({
  listenerCalls: [] as Array<{ trackedAuthConfigIds: string[] }>,
  mockPost: vi.fn(),
  mockToasterError: vi.fn(),
}))

vi.mock('@/hooks/useAuthCallbackListener', () => ({
  AUTH_CALLBACK_TIMEOUT_MESSAGE: "Authentication didn't complete. Click to try again.",
  useAuthCallbackListener: (args: { trackedAuthConfigIds: string[] }) => {
    listenerCalls.push(args)
  },
}))

vi.mock('@/utils/api', () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: (...args: unknown[]) => mockToasterError(...args),
  },
}))

const authRequiredResponse = (servers: unknown[]): Response =>
  new Response(JSON.stringify({ error: 'authentication_required', servers }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  })

const oauth2Server = {
  mcp_config_id: 'mcp-1',
  mcp_config_name: 'GitHub',
  mcp_server_name: 'GitHub',
  auth_config_id: 'auth-1',
  auth_type: 'oauth2',
  as_hostname: 'login.github.com',
  status: 'authentication_required',
  error_context: null,
  initiate_url: '/v1/mcp-auth/oauth2/initiate',
}

describe('useMCPAuthPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listenerCalls.length = 0
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('stores OAuth2 pending redirect metadata and excludes it from callback tracking', async () => {
    const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

    await act(async () => {
      await result.current.handleAuthRequiredError(authRequiredResponse([oauth2Server]))
    })
    mockPost.mockResolvedValueOnce({
      json: async () => ({
        auth_url: 'https://idp.example.com/start',
        redirect_uri_hostname: 'api.example.com',
      }),
    })

    await act(async () => {
      await result.current.initiate('mcp-1')
    })

    expect(window.open).not.toHaveBeenCalled()
    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        status: 'authentication_required',
        pending_initiate: {
          auth_url: 'https://idp.example.com/start',
          redirect_uri_hostname: 'api.example.com',
          localhost_warning: false,
        },
      })
    )
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual([])
  })

  it('fails OAuth2 initiate closed when redirect metadata is missing', async () => {
    const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

    await act(async () => {
      await result.current.handleAuthRequiredError(authRequiredResponse([oauth2Server]))
    })
    mockPost.mockResolvedValueOnce({
      json: async () => ({ auth_url: 'https://idp.example.com/start' }),
    })

    await act(async () => {
      await result.current.initiate('mcp-1')
    })

    expect(window.open).not.toHaveBeenCalled()
    expect(mockToasterError).toHaveBeenCalledWith(
      'Authentication response did not include a redirect URI hostname. Retry authentication.'
    )
    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        pending_initiate: null,
        error_context:
          'Authentication response did not include a redirect URI hostname. Retry authentication.',
      })
    )
  })

  it('keeps SAML rows on immediate-open and tracking behavior', async () => {
    const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

    await act(async () => {
      await result.current.handleAuthRequiredError(
        authRequiredResponse([
          {
            ...oauth2Server,
            auth_type: 'saml',
            initiate_url: '/v1/mcp-auth/saml/initiate',
            status: 'session_expired',
          },
        ])
      )
    })
    mockPost.mockResolvedValueOnce({
      json: async () => ({ auth_url: 'https://idp.example.com/saml/start' }),
    })
    vi.mocked(window.open).mockReturnValue(window)

    await act(async () => {
      await result.current.initiate('mcp-1')
    })

    expect(window.open).toHaveBeenCalledWith('https://idp.example.com/saml/start', '_blank')
    expect(result.current.rows[0].status).toBe('authenticating')
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual(['auth-1'])
  })

  it('continues or cancels OAuth2 pending rows with row-isolated state changes', async () => {
    const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

    await act(async () => {
      await result.current.handleAuthRequiredError(
        authRequiredResponse([
          oauth2Server,
          { ...oauth2Server, mcp_config_id: 'mcp-2', auth_config_id: 'auth-2' },
        ])
      )
    })
    mockPost.mockResolvedValueOnce({
      json: async () => ({
        auth_url: 'https://idp.example.com/start',
        redirect_uri_hostname: 'localhost',
        localhost_warning: true,
      }),
    })

    await act(async () => {
      await result.current.initiate('mcp-1')
    })
    await act(async () => {
      result.current.continue('mcp-1')
    })

    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        status: 'authentication_required',
        pending_initiate: expect.any(Object),
        error_context: 'Browser blocked the sign-in window. Allow popups and try again.',
      })
    )
    expect(result.current.rows[1].pending_initiate).toBeUndefined()

    vi.mocked(window.open).mockReturnValue(window)
    await act(async () => {
      result.current.continue('mcp-1')
    })

    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        status: 'authenticating',
        pending_initiate: null,
        error_context: null,
      })
    )
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual(['auth-1'])

    await act(async () => {
      result.current.cancel('mcp-1')
    })
    expect(result.current.rows[0].status).toBe('authenticating')
  })

  it('cancels OAuth2 pending rows before Continue without adding callback tracking', async () => {
    const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

    await act(async () => {
      await result.current.handleAuthRequiredError(authRequiredResponse([oauth2Server]))
    })
    mockPost.mockResolvedValueOnce({
      json: async () => ({
        auth_url: 'https://idp.example.com/start',
        redirect_uri_hostname: 'api.example.com',
        localhost_warning: false,
      }),
    })

    await act(async () => {
      await result.current.initiate('mcp-1')
    })
    await act(async () => {
      result.current.cancel('mcp-1')
    })

    expect(window.open).not.toHaveBeenCalled()
    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        status: 'authentication_required',
        pending_initiate: null,
        recoverable_status: 'authentication_required',
      })
    )
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual([])
  })
})
