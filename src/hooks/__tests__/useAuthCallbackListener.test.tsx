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

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import {
  AUTH_CALLBACK_ACCEPTANCE_MS,
  AUTH_CALLBACK_HINT_MESSAGE,
  getAuthCallbackAcceptanceMs,
  getAuthCallbackHintMs,
  useAuthCallbackListener,
} from '../useAuthCallbackListener'

vi.mock('@/utils/api', () => ({
  default: {
    BASE_URL: 'https://api.example.com/v1',
  },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    getMcpAuthOrigin: vi.fn(() => null),
    getMcpAuthTimeoutSeconds: vi.fn(() => null),
  },
}))

const dispatchMessage = (origin: string, data: unknown) => {
  window.dispatchEvent(new MessageEvent('message', { origin, data }))
}

describe('useAuthCallbackListener', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('marks tracked ids as authenticating', () => {
    const { result } = renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'] })
    )

    expect(result.current.authFlows['auth-1']).toEqual({ status: 'authenticating' })
  })

  it('ignores non-matching origins and malformed payloads', () => {
    const { result } = renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'] })
    )

    act(() => {
      dispatchMessage('https://frontend.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
      dispatchMessage('https://api.example.com', { type: 'mcp_auth_callback', status: 'success' })
      dispatchMessage('https://api.example.com', { type: 'other', auth_config_id: 'auth-1' })
      dispatchMessage('https://api.example.com', null)
    })

    expect(result.current.authFlows['auth-1']).toEqual({ status: 'authenticating' })
  })

  it('ignores unrelated auth_config_id values', () => {
    const { result } = renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'] })
    )

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'error',
        auth_config_id: 'auth-2',
        error: 'runtime_error',
      })
    })

    expect(result.current.authFlows['auth-1']).toEqual({ status: 'authenticating' })
    expect(result.current.authFlows['auth-2']).toBeUndefined()
  })

  it('updates only the targeted flow on success, clears timeout, and emits onSuccess', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useAuthCallbackListener({
        trackedAuthConfigIds: ['auth-1', 'auth-2'],
        timeoutMs: 1000,
        onSuccess,
      })
    )

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(result.current.authFlows['auth-1']).toEqual({ status: 'authentication_required' })
    expect(result.current.authFlows['auth-2']).toEqual({ status: 'authenticating' })
    expect(onSuccess).toHaveBeenCalledWith('auth-1')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(result.current.authFlows['auth-1']).toEqual({ status: 'authentication_required' })
    expect(result.current.authFlows['auth-2']).toEqual({
      status: 'authentication_required',
      message: AUTH_CALLBACK_HINT_MESSAGE,
    })
  })

  it('updates only the targeted flow on error, clears timeout, and emits onError', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'], timeoutMs: 1000, onError })
    )

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'error',
        auth_config_id: 'auth-1',
        error: 'session_expired',
      })
    })

    expect(result.current.authFlows['auth-1']).toEqual({
      status: 'error',
      error: 'session_expired',
    })
    expect(onError).toHaveBeenCalledWith('auth-1', 'session_expired')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(result.current.authFlows['auth-1']).toEqual({
      status: 'error',
      error: 'session_expired',
    })
  })

  it('times out authenticating flows back to authentication_required with retry copy and emits onTimeout', async () => {
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'], timeoutMs: 1000, onTimeout })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(result.current.authFlows['auth-1']).toEqual({
      status: 'authentication_required',
      message: AUTH_CALLBACK_HINT_MESSAGE,
    })
    expect(onTimeout).toHaveBeenCalledWith('auth-1')
  })

  it('sends no beacon at hint expiry and exactly one beacon at acceptance expiry', async () => {
    const sendBeacon = vi.fn((_url: string, _data?: BodyInit | null) => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const onTimeout = vi.fn()
    renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'], timeoutMs: 1000, onTimeout })
    )

    // Hint expiry (1000ms): the spinner clears but no diagnostics are sent yet.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    // Acceptance expiry (600_000ms total, mirroring the 600s backend PKCE/callback-state TTL):
    // exactly one beacon, carrying the full acceptance wait.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000 - 1000)
    })

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const [url, body] = sendBeacon.mock.calls[0]
    expect(url).toBe('https://api.example.com/v1/v1/mcp-auth/oauth2/callback-diagnostics')

    // Switch to real timers so the Blob's FileReader-based read can resolve;
    // the timeout itself already fired above under fake timers.
    vi.useRealTimers()
    const bodyText =
      typeof body === 'string'
        ? body
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsText(body as unknown as Blob)
          })
    const parsedBody = JSON.parse(bodyText)
    expect(parsedBody).toEqual({
      result: 'timeout',
      auth_config_id: 'auth-1',
      opener_present: false,
      waited_ms: 600_000,
      phase: 'awaiting_callback',
    })

    vi.unstubAllGlobals()
  })

  it('does not change timeout behaviour when the beacon transport throws', async () => {
    const sendBeacon = vi.fn(() => {
      throw new Error('beacon failed')
    })
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'], timeoutMs: 1000, onTimeout })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(result.current.authFlows['auth-1']).toEqual({
      status: 'authentication_required',
      message: AUTH_CALLBACK_HINT_MESSAGE,
    })
    expect(onTimeout).toHaveBeenCalledWith('auth-1')

    // Acceptance expiry throws inside the beacon transport; the throw is swallowed
    // and does not surface as an unhandled error or change the already-settled state.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000 - 1000)
    })

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(result.current.authFlows['auth-1']).toEqual({
      status: 'authentication_required',
      message: AUTH_CALLBACK_HINT_MESSAGE,
    })

    vi.unstubAllGlobals()
  })

  it('does not send a diagnostics beacon on the success path', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const onSuccess = vi.fn()
    renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'], timeoutMs: 1000, onSuccess })
    )

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('does not send a diagnostics beacon on the identity-provider error path', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const onError = vi.fn()
    renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'], timeoutMs: 1000, onError })
    )

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'error',
        auth_config_id: 'auth-1',
        error: 'session_expired',
      })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('clamps waited_ms to the backend ceiling for a timeout longer than an hour', async () => {
    // The backend rejects waited_ms above 3_600_000 with a 422, and the beacon swallows its own
    // failures - so an unclamped value would silently drop exactly the long-wait record this
    // beacon exists to produce.
    const sendBeacon = vi.fn((_url: string, _data?: BodyInit | null) => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'], timeoutMs: 7_200_000 })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_200_000)
    })

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const [, body] = sendBeacon.mock.calls[0]

    vi.useRealTimers()
    const bodyText =
      typeof body === 'string'
        ? body
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsText(body as unknown as Blob)
          })
    expect(JSON.parse(bodyText).waited_ms).toBe(3_600_000)

    vi.unstubAllGlobals()
  })

  it('accepts a success delivered after the hint timer fires but before the acceptance deadline', async () => {
    const onSuccess = vi.fn()
    const { rerender } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000, onSuccess }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    // A consumer rolls the row back out of trackedAuthConfigIds once it sees the hint expire.
    rerender({ trackedAuthConfigIds: [] })

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('auth-1')
  })

  it('sends no beacon and clears both timers when a success arrives during retention', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const onSuccess = vi.fn()
    const { rerender } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000, onSuccess }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    rerender({ trackedAuthConfigIds: [] })

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    // If the acceptance timer survived the success, it would fire here and send a beacon.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000 - 1000)
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('drops a callback dispatched after the acceptance deadline as untracked', async () => {
    const onSuccess = vi.fn()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000, onSuccess }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    rerender({ trackedAuthConfigIds: [] })

    // Reach the acceptance deadline (600_000ms total) so retention is purged.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600_000 - 1000)
    })

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[mcp-auth] Ignoring auth callback for untracked auth_config_id',
      expect.objectContaining({ authConfigId: 'auth-1' })
    )

    warnSpy.mockRestore()
  })

  it('invokes nothing for a callback dispatched after unmount, even during retention', async () => {
    const onSuccess = vi.fn()
    const { unmount, rerender } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000, onSuccess }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    rerender({ trackedAuthConfigIds: [] })

    unmount()

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('sends no beacon and accepts nothing once a flow is untracked before its hint fires', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const onSuccess = vi.fn()
    const { rerender } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000, onSuccess }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    // Cancelled, cleared or switched away from while the spinner was still up:
    // both stages are torn down, so no flow is left to beacon about or to accept.
    rerender({ trackedAuthConfigIds: [] })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_CALLBACK_ACCEPTANCE_MS + 1000)
    })

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(sendBeacon).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('sends no beacon and accepts nothing once a hint-expired flow is cancelled', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const onSuccess = vi.fn()
    const { rerender } = renderHook(
      ({ trackedAuthConfigIds, liveAuthConfigIds }) =>
        useAuthCallbackListener({
          trackedAuthConfigIds,
          liveAuthConfigIds,
          contextKey: 'chat-a',
          timeoutMs: 1000,
          onSuccess,
        }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'], liveAuthConfigIds: ['auth-1'] } }
    )

    // The hint expires and the consumer rolls the row back: the id leaves the tracked
    // set, but its row - and with it the acceptance window - is still on screen.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    rerender({ trackedAuthConfigIds: [], liveAuthConfigIds: ['auth-1'] })

    // The user then cancels. The rollback already consumed the untrack transition, so
    // losing the row from its own context is the only signal that the flow is abandoned.
    rerender({ trackedAuthConfigIds: [], liveAuthConfigIds: [] })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_CALLBACK_ACCEPTANCE_MS + 1000)
    })

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(sendBeacon).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('applies a late success to the originating chat after a chat switch', async () => {
    const onSuccessForOriginatingChat = vi.fn()
    const onSuccessForCurrentChat = vi.fn()

    const { rerender } = renderHook(
      ({ trackedAuthConfigIds, liveAuthConfigIds, contextKey, onSuccess }) =>
        useAuthCallbackListener({
          trackedAuthConfigIds,
          liveAuthConfigIds,
          contextKey,
          timeoutMs: 1000,
          onSuccess,
        }),
      {
        initialProps: {
          trackedAuthConfigIds: ['auth-1'],
          liveAuthConfigIds: ['auth-1'],
          contextKey: 'chat-a',
          onSuccess: onSuccessForOriginatingChat,
        },
      }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    rerender({
      trackedAuthConfigIds: [],
      liveAuthConfigIds: ['auth-1'],
      contextKey: 'chat-a',
      onSuccess: onSuccessForOriginatingChat,
    })

    // The user switches chats, which rebinds the handlers to the chat now on screen.
    rerender({
      trackedAuthConfigIds: [],
      liveAuthConfigIds: [],
      contextKey: 'chat-b',
      onSuccess: onSuccessForCurrentChat,
    })

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(onSuccessForOriginatingChat).toHaveBeenCalledTimes(1)
    expect(onSuccessForOriginatingChat).toHaveBeenCalledWith('auth-1')
    expect(onSuccessForCurrentChat).not.toHaveBeenCalled()
  })

  it('keeps a retried id accepted past the first attempt acceptance deadline', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const onSuccess = vi.fn()
    const { rerender } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000, onSuccess }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    // First attempt: the hint expires and the consumer rolls the row back.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    rerender({ trackedAuthConfigIds: [] })

    // The user retries the same server; that attempt's hint expires too.
    rerender({ trackedAuthConfigIds: ['auth-1'] })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    rerender({ trackedAuthConfigIds: [] })

    // Past the first attempt's deadline: re-tracking replaced its timer instead of
    // orphaning it, so nothing fires and the retry's retention is still intact.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_CALLBACK_ACCEPTANCE_MS - 1500)
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    act(() => {
      dispatchMessage('https://api.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('auth-1')

    // The retry's own deadline passes with the flow already settled.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_CALLBACK_ACCEPTANCE_MS)
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('sends exactly one beacon for an id retried after a hint expiry', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const { rerender } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000 }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    rerender({ trackedAuthConfigIds: [] })
    rerender({ trackedAuthConfigIds: ['auth-1'] })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    rerender({ trackedAuthConfigIds: [] })

    // Both attempts' deadlines elapse; only the live attempt may report.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_CALLBACK_ACCEPTANCE_MS + 2000)
    })

    expect(sendBeacon).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('leaves no acceptance timer armed after unmount, including for a retried id', async () => {
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    const { rerender, unmount } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000 }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    rerender({ trackedAuthConfigIds: [] })
    rerender({ trackedAuthConfigIds: ['auth-1'] })

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_CALLBACK_ACCEPTANCE_MS + 2000)
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('removes untracked ids and clears their timers on rerender', async () => {
    const { result, rerender } = renderHook(
      ({ trackedAuthConfigIds }) =>
        useAuthCallbackListener({ trackedAuthConfigIds, timeoutMs: 1000 }),
      { initialProps: { trackedAuthConfigIds: ['auth-1'] } }
    )

    expect(result.current.authFlows['auth-1']).toEqual({ status: 'authenticating' })

    rerender({ trackedAuthConfigIds: [] })

    expect(result.current.authFlows['auth-1']).toBeUndefined()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(result.current.authFlows['auth-1']).toBeUndefined()
  })

  it('uses the runtime-config timeout when timeoutMs is not provided', async () => {
    vi.mocked(appInfoStore.getMcpAuthTimeoutSeconds).mockReturnValue('2')

    const { result } = renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'] })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999)
    })

    expect(result.current.authFlows['auth-1']).toEqual({ status: 'authenticating' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(result.current.authFlows['auth-1']).toEqual({
      status: 'authentication_required',
      message: AUTH_CALLBACK_HINT_MESSAGE,
    })
  })

  it('falls back to 60 seconds when runtime-config timeout is invalid', () => {
    vi.mocked(appInfoStore.getMcpAuthTimeoutSeconds).mockReturnValue('0')

    expect(getAuthCallbackHintMs()).toBe(60_000)
  })

  it('uses the backend acceptance minimum by default', () => {
    expect(getAuthCallbackAcceptanceMs(getAuthCallbackHintMs())).toBe(600_000)
  })

  it('widens, never clamps, the acceptance deadline to match a longer configured hint', () => {
    vi.mocked(appInfoStore.getMcpAuthTimeoutSeconds).mockReturnValue('900')

    expect(getAuthCallbackAcceptanceMs(getAuthCallbackHintMs())).toBe(900_000)
  })

  it('arms the acceptance deadline the helper derives from the runtime-config hint', async () => {
    vi.mocked(appInfoStore.getMcpAuthTimeoutSeconds).mockReturnValue('900')
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    renderHook(() => useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'] }))

    // A 900s configured hint widens the window, so the 600s floor passes silently.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_CALLBACK_ACCEPTANCE_MS)
    })

    expect(sendBeacon).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000)
    })

    expect(sendBeacon).toHaveBeenCalledTimes(1)

    vi.mocked(appInfoStore.getMcpAuthTimeoutSeconds).mockReturnValue(null)
    vi.unstubAllGlobals()
  })

  it('clears pending timeouts on unmount', async () => {
    const onTimeout = vi.fn()
    const { unmount } = renderHook(() =>
      useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'], timeoutMs: 1000, onTimeout })
    )

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(onTimeout).not.toHaveBeenCalled()
  })

  it('logs listener origin context on setup', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    renderHook(() => useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'] }))

    expect(infoSpy).toHaveBeenCalledWith(
      '[mcp-auth] listener ready',
      expect.objectContaining({
        apiOrigin: 'https://api.example.com',
        windowOrigin: expect.any(String),
      })
    )

    infoSpy.mockRestore()
  })

  it('logs observed mcp_auth_callback messages even when dropped for a bad origin', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    renderHook(() => useAuthCallbackListener({ trackedAuthConfigIds: ['auth-1'] }))

    act(() => {
      dispatchMessage('https://evil.example.com', {
        type: 'mcp_auth_callback',
        status: 'success',
        auth_config_id: 'auth-1',
      })
    })

    expect(infoSpy).toHaveBeenCalledWith(
      '[mcp-auth] message observed',
      expect.objectContaining({
        origin: 'https://evil.example.com',
        expectedApiOrigin: 'https://api.example.com',
        authConfigId: 'auth-1',
        tracked: true,
      })
    )

    infoSpy.mockRestore()
  })
})
