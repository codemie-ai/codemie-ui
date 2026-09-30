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
import {
  INVALID_AUTH_URL_MESSAGE,
  POPUP_BLOCKED_AUTH_MESSAGE,
  SIGN_IN_WINDOW_CLOSED_MESSAGE,
} from '@/utils/mcpAuthInitiate'

import { useMCPAuthPrompt } from '../useMCPAuthPrompt'

interface ListenerHandlers {
  onSuccess?: (authConfigId: string) => void
  onError?: (authConfigId: string, errorCode: string | undefined) => void
  onTimeout?: (authConfigId: string) => void
}

const {
  listenerCalls,
  listenerHandlers,
  mockPost,
  mockToasterError,
  mockOpenSignInWindow,
  mockWatchSignInWindow,
} = vi.hoisted(() => ({
  listenerCalls: [] as Array<{ trackedAuthConfigIds: string[]; liveAuthConfigIds?: string[] }>,
  listenerHandlers: {} as {
    onSuccess?: (authConfigId: string) => void
    onError?: (authConfigId: string, errorCode: string | undefined) => void
    onTimeout?: (authConfigId: string) => void
  },
  mockPost: vi.fn(),
  mockToasterError: vi.fn(),
  mockOpenSignInWindow: vi.fn(),
  mockWatchSignInWindow: vi.fn(),
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

vi.mock('@/utils/openSignInWindow', () => ({
  openSignInWindow: (...args: unknown[]) => mockOpenSignInWindow(...args),
}))

vi.mock('@/utils/watchSignInWindow', () => ({
  watchSignInWindow: (...args: unknown[]) => mockWatchSignInWindow(...args),
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

const NON_HTTP_AUTH_URL = 'ftp://idp.example.com/start'

const fakeSignInWindow = { closed: false } as Window
const openedResult = { status: 'opened', window: fakeSignInWindow } as const

const samlServer = {
  ...oauth2Server,
  auth_type: 'saml',
  initiate_url: '/v1/mcp-auth/saml/initiate',
  status: 'session_expired',
}

interface WatcherOptions {
  window: Window
  mcpConfigId: string
  onAuthenticated: () => void
  onClosedEarly: () => void
}

const lastWatcherOptions = (): WatcherOptions => mockWatchSignInWindow.mock.calls.at(-1)?.[0]

describe('useMCPAuthPrompt', () => {
  let stopWatcher: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    listenerCalls.length = 0
    listenerHandlers.onSuccess = undefined
    listenerHandlers.onError = undefined
    listenerHandlers.onTimeout = undefined
    stopWatcher = vi.fn()
    mockOpenSignInWindow.mockReset().mockReturnValue({ status: 'blocked' })
    mockWatchSignInWindow.mockReset().mockReturnValue(stopWatcher)
  })

  const initiateSaml = async (
    result: { current: ReturnType<typeof useMCPAuthPrompt> },
    authUrl = 'https://idp.example.com/saml/start'
  ) => {
    await act(async () => {
      await result.current.handleAuthRequiredError(authRequiredResponse([samlServer]))
    })
    mockPost.mockResolvedValueOnce({ json: async () => ({ auth_url: authUrl }) })
    await act(async () => {
      await result.current.initiate('mcp-1')
    })
  }

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

    expect(mockOpenSignInWindow).not.toHaveBeenCalled()
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

    expect(mockOpenSignInWindow).not.toHaveBeenCalled()
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
    mockOpenSignInWindow.mockReturnValue(openedResult)

    await act(async () => {
      await result.current.initiate('mcp-1')
    })

    expect(mockOpenSignInWindow).toHaveBeenCalledWith('https://idp.example.com/saml/start')
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
        error_context: POPUP_BLOCKED_AUTH_MESSAGE,
      })
    )
    expect(result.current.rows[1].pending_initiate).toBeUndefined()

    mockOpenSignInWindow.mockReturnValue(openedResult)
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

    expect(mockOpenSignInWindow).not.toHaveBeenCalled()
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

    // openSignInWindow reports blocked (default mock)
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
    mockOpenSignInWindow.mockReturnValue(openedResult)
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
    mockOpenSignInWindow.mockReturnValue(openedResult)

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

    mockOpenSignInWindow.mockReturnValue(openedResult)
    await act(async () => {
      result.current.continue('mcp-1')
    })

    expect(result.current.rows[0]).toEqual(
      expect.objectContaining({ status: 'authenticating', pending_initiate: null })
    )
    expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual(['auth-1'])
    expect(mockOpenSignInWindow).toHaveBeenCalledTimes(1)

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
    expect(mockOpenSignInWindow).toHaveBeenCalledTimes(1)
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
    mockOpenSignInWindow.mockReturnValue(openedResult)

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

  describe('sign-in window handling', () => {
    it('sets the popup-blocked message and a recoverable status when SAML initiate is blocked', async () => {
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

      await initiateSaml(result)

      expect(result.current.rows[0]).toEqual(
        expect.objectContaining({
          status: 'session_expired',
          error_context: POPUP_BLOCKED_AUTH_MESSAGE,
          recoverable_status: 'session_expired',
        })
      )
      expect(mockWatchSignInWindow).not.toHaveBeenCalled()
      expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual([])
    })

    it('sets the invalid-url message when SAML initiate returns an unusable url', async () => {
      mockOpenSignInWindow.mockReturnValue({ status: 'invalid_url' })
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

      await initiateSaml(result, NON_HTTP_AUTH_URL)

      expect(result.current.rows[0]).toEqual(
        expect.objectContaining({
          status: 'session_expired',
          error_context: INVALID_AUTH_URL_MESSAGE,
          recoverable_status: 'session_expired',
        })
      )
      expect(mockWatchSignInWindow).not.toHaveBeenCalled()
    })

    it('sets the invalid-url message and drops the pending initiate on OAuth2 continue', async () => {
      mockOpenSignInWindow.mockReturnValue({ status: 'invalid_url' })
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await act(async () => {
        await result.current.handleAuthRequiredError(authRequiredResponse([oauth2Server]))
      })
      mockPost.mockResolvedValueOnce({
        json: async () => ({
          auth_url: NON_HTTP_AUTH_URL,
          redirect_uri_hostname: 'api.example.com',
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
          pending_initiate: null,
          error_context: INVALID_AUTH_URL_MESSAGE,
        })
      )
      expect(mockWatchSignInWindow).not.toHaveBeenCalled()
    })

    it('watches the opened window keyed by auth config id', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))

      await initiateSaml(result)

      expect(mockWatchSignInWindow).toHaveBeenCalledWith(
        expect.objectContaining({ window: fakeSignInWindow, mcpConfigId: 'mcp-1' })
      )
    })

    it('marks success once when both the poll and the postMessage report it', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const onAllAuthenticated = vi.fn()
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated }))
      await initiateSaml(result)

      await act(async () => {
        lastWatcherOptions().onAuthenticated()
        listenerHandlers.onSuccess?.('auth-1')
        await Promise.resolve()
      })

      expect(onAllAuthenticated).toHaveBeenCalledTimes(1)
      expect(stopWatcher).toHaveBeenCalled()
      expect(result.current.rows).toEqual([])
    })

    it('stops the watcher when the postMessage reports success', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)

      await act(async () => {
        listenerHandlers.onSuccess?.('auth-1')
        await Promise.resolve()
      })

      expect(stopWatcher).toHaveBeenCalledTimes(1)
    })

    it('stops the watcher when the postMessage reports an error', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)

      act(() => {
        listenerHandlers.onError?.('auth-1', 'access_denied')
      })

      expect(stopWatcher).toHaveBeenCalledTimes(1)
    })

    it('records an early close as a recoverable row with the closed flag', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)

      act(() => {
        lastWatcherOptions().onClosedEarly()
      })

      expect(result.current.rows[0]).toEqual(
        expect.objectContaining({
          status: 'session_expired',
          error_context: SIGN_IN_WINDOW_CLOSED_MESSAGE,
          sign_in_window_closed: true,
        })
      )
      expect(stopWatcher).toHaveBeenCalledTimes(1)
      expect(listenerCalls.at(-1)?.trackedAuthConfigIds).toEqual([])
    })

    it('stops reporting the id as live after an early close so the listener ends its acceptance window', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)
      expect(listenerCalls.at(-1)?.liveAuthConfigIds).toEqual(['auth-1'])

      act(() => {
        lastWatcherOptions().onClosedEarly()
      })

      expect(listenerCalls.at(-1)?.liveAuthConfigIds).toEqual([])
    })

    it('clears the closed flag and the old watcher when the user signs in again', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)
      act(() => {
        lastWatcherOptions().onClosedEarly()
      })
      stopWatcher.mockClear()

      mockPost.mockResolvedValueOnce({
        json: async () => ({ auth_url: 'https://idp.example.com/saml/start-2' }),
      })
      await act(async () => {
        await result.current.initiate('mcp-1')
      })

      expect(result.current.rows[0]).toEqual(
        expect.objectContaining({
          status: 'authenticating',
          error_context: null,
          sign_in_window_closed: false,
        })
      )
      expect(mockWatchSignInWindow).toHaveBeenCalledTimes(2)
    })

    it('stops the previous watcher before watching a re-authentication of the same id', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)
      act(() => {
        listenerHandlers.onTimeout?.('auth-1')
      })

      mockPost.mockResolvedValueOnce({
        json: async () => ({ auth_url: 'https://idp.example.com/saml/start-2' }),
      })
      await act(async () => {
        await result.current.initiate('mcp-1')
      })

      expect(stopWatcher).toHaveBeenCalledTimes(1)
      expect(mockWatchSignInWindow).toHaveBeenCalledTimes(2)
    })

    it('stops the watcher when a pending row is cancelled', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)

      act(() => {
        result.current.cancel('mcp-1')
      })

      expect(stopWatcher).toHaveBeenCalledTimes(1)
    })

    it('stops every watcher when the rows are cleared', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)

      act(() => {
        result.current.clearRows()
      })

      expect(stopWatcher).toHaveBeenCalledTimes(1)
    })

    it('stops every watcher when a new auth-required error replaces the rows', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result } = renderHook(() => useMCPAuthPrompt({ onAllAuthenticated: vi.fn() }))
      await initiateSaml(result)

      await act(async () => {
        await result.current.handleAuthRequiredError(authRequiredResponse([oauth2Server]))
      })

      expect(stopWatcher).toHaveBeenCalledTimes(1)
    })

    it('stops every watcher on unmount', async () => {
      mockOpenSignInWindow.mockReturnValue(openedResult)
      const { result, unmount } = renderHook(() =>
        useMCPAuthPrompt({ onAllAuthenticated: vi.fn() })
      )
      await initiateSaml(result)

      unmount()

      expect(stopWatcher).toHaveBeenCalledTimes(1)
    })
  })
})
