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

import { AUTH_CALLBACK_HINT_MESSAGE } from '@/hooks/useAuthCallbackListener'

import { useMCPAuthPrompt } from '../useMCPAuthPrompt'

interface ListenerHandlers {
  onSuccess?: (authConfigId: string) => void
  onError?: (authConfigId: string, errorCode: string | undefined) => void
  onTimeout?: (authConfigId: string) => void
}

const { listenerCalls, listenerHandlers, mockPost, mockToasterError } = vi.hoisted(() => ({
  listenerCalls: [] as Array<{ trackedAuthConfigIds: string[]; liveAuthConfigIds?: string[] }>,
  listenerHandlers: {} as {
    onSuccess?: (authConfigId: string) => void
    onError?: (authConfigId: string, errorCode: string | undefined) => void
    onTimeout?: (authConfigId: string) => void
  },
  mockPost: vi.fn(),
  mockToasterError: vi.fn(),
}))

vi.mock('@/hooks/useAuthCallbackListener', () => ({
  AUTH_CALLBACK_HINT_MESSAGE:
    'Sign-in is taking longer than usual. It can still complete — or click to try again.',
  useAuthCallbackListener: (
    args: { trackedAuthConfigIds: string[]; liveAuthConfigIds?: string[] } & ListenerHandlers
  ) => {
    listenerCalls.push(args)
    listenerHandlers.onSuccess = args.onSuccess
    listenerHandlers.onError = args.onError
    listenerHandlers.onTimeout = args.onTimeout
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
    listenerHandlers.onSuccess = undefined
    listenerHandlers.onError = undefined
    listenerHandlers.onTimeout = undefined
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

  it('reports rows as live in any status and drops them all when the prompt is cleared', async () => {
    const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

    await act(async () => {
      await result.current.handleAuthRequiredError(authRequiredResponse([oauth2Server]))
    })

    // Not authenticating yet, so untracked - but its acceptance window has somewhere to land.
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual([])
    expect(listenerCalls.at(-1)?.liveAuthConfigIds).toEqual(['auth-1'])

    act(() => {
      result.current.clearRows()
    })

    expect(listenerCalls.at(-1)?.liveAuthConfigIds).toEqual([])
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

  it('logs the opened auth tab origin and popup-blocked state on continue', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
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

    // window.open returns null (default mock) -> popup blocked
    await act(async () => {
      result.current.continue('mcp-1')
    })

    expect(infoSpy).toHaveBeenCalledWith(
      '[mcp-auth] opened auth tab',
      expect.objectContaining({
        authUrlOrigin: 'https://idp.example.com',
        windowOrigin: expect.any(String),
        popupBlocked: true,
      })
    )

    infoSpy.mockRestore()
  })

  it('logs the opened auth tab on SAML immediate open with popupBlocked false', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.mocked(window.open).mockReturnValue(window)
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

    await act(async () => {
      await result.current.initiate('mcp-1')
    })

    expect(infoSpy).toHaveBeenCalledWith(
      '[mcp-auth] opened auth tab',
      expect.objectContaining({
        authUrlOrigin: 'https://idp.example.com',
        popupBlocked: false,
      })
    )

    infoSpy.mockRestore()
  })

  it('authenticates a row when success is delivered after the hint expiry (AC 5)', async () => {
    const onAllAuthenticated = vi.fn()
    const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated }))

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

    expect(result.current.rows[0].status).toBe('authenticating')
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual(['auth-1'])

    act(() => {
      listenerHandlers.onTimeout?.('auth-1')
    })

    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        status: 'session_expired',
        error_context: AUTH_CALLBACK_HINT_MESSAGE,
      })
    )
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual([])

    await act(async () => {
      listenerHandlers.onSuccess?.('auth-1')
      await Promise.resolve()
    })

    expect(onAllAuthenticated).toHaveBeenCalledTimes(1)
    expect(result.current.rows).toEqual([])
  })

  it('retries via initiate after a hint expiry without reusing the consumed pending_initiate (AC 6)', async () => {
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

    vi.mocked(window.open).mockReturnValue(window)
    await act(async () => {
      result.current.continue('mcp-1')
    })

    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({ status: 'authenticating', pending_initiate: null })
    )
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual(['auth-1'])
    expect(window.open).toHaveBeenCalledTimes(1)

    act(() => {
      listenerHandlers.onTimeout?.('auth-1')
    })

    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        status: 'authentication_required',
        pending_initiate: null,
        error_context: AUTH_CALLBACK_HINT_MESSAGE,
      })
    )
    expect(mockPost).toHaveBeenCalledTimes(1)

    mockPost.mockResolvedValueOnce({
      json: async () => ({
        auth_url: 'https://idp.example.com/start-2',
        redirect_uri_hostname: 'api.example.com',
      }),
    })

    await act(async () => {
      await result.current.initiate('mcp-1')
    })

    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(mockPost).toHaveBeenLastCalledWith('v1/mcp-auth/oauth2/initiate', {
      mcp_config_id: 'mcp-1',
    })
    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        pending_initiate: {
          auth_url: 'https://idp.example.com/start-2',
          redirect_uri_hostname: 'api.example.com',
          localhost_warning: false,
        },
      })
    )
    // The retry only re-fetches pending metadata; it must not re-open the popup itself.
    expect(window.open).toHaveBeenCalledTimes(1)
  })

  it('lands an error context on the row when onError arrives after a hint expiry', async () => {
    const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

    await act(async () => {
      await result.current.handleAuthRequiredError(
        authRequiredResponse([
          { ...oauth2Server, auth_type: 'saml', initiate_url: '/v1/mcp-auth/saml/initiate' },
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

    act(() => {
      listenerHandlers.onTimeout?.('auth-1')
    })

    act(() => {
      listenerHandlers.onError?.('auth-1', 'access_denied')
    })

    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({
        status: 'authentication_required',
        error_context: 'access_denied',
      })
    )
  })
})
