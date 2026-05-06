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

import {
  AUTH_CALLBACK_TIMEOUT_MESSAGE,
  getAuthCallbackTimeoutMs,
  useAuthCallbackListener,
} from '../useAuthCallbackListener'

vi.mock('@/utils/api', () => ({
  default: {
    BASE_URL: 'https://api.example.com/v1',
  },
}))

const dispatchMessage = (origin: string, data: unknown) => {
  window.dispatchEvent(new MessageEvent('message', { origin, data }))
}

describe('useAuthCallbackListener', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    window._env_ = undefined
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    window._env_ = undefined
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
      message: AUTH_CALLBACK_TIMEOUT_MESSAGE,
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
      message: AUTH_CALLBACK_TIMEOUT_MESSAGE,
    })
    expect(onTimeout).toHaveBeenCalledWith('auth-1')
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
    window._env_ = {
      VITE_API_URL: 'https://api.example.com/v1',
      VITE_MCP_AUTH_AUTHENTICATING_TIMEOUT_SECONDS: '2',
    } as typeof window._env_

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
      message: AUTH_CALLBACK_TIMEOUT_MESSAGE,
    })
  })

  it('falls back to 60 seconds when runtime-config timeout is invalid', () => {
    window._env_ = {
      VITE_API_URL: 'https://api.example.com/v1',
      VITE_MCP_AUTH_AUTHENTICATING_TIMEOUT_SECONDS: '0',
    } as typeof window._env_

    expect(getAuthCallbackTimeoutMs()).toBe(60_000)
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
})
