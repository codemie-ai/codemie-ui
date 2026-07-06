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

import { OAuthStatus } from '@/types/entity/dataSource'

import { useOAuth } from '../useOAuth'

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

describe('useOAuth', () => {
  const mockInitiate = vi.fn()
  const mockGetStatus = vi.fn()
  let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.useFakeTimers()
    mockPopup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window)
    mockInitiate.mockResolvedValue({
      auth_url: 'https://accounts.google.com/auth',
      state: 'state-abc',
    })
    mockGetStatus.mockResolvedValue({ status: 'pending' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts in IDLE state', () => {
    const { result } = renderHook(() =>
      useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus })
    )
    expect(result.current.status).toBe(OAuthStatus.IDLE)
    expect(result.current.user).toBe('')
    expect(result.current.error).toBe('')
  })

  it('moves to WAITING after handleSignIn opens the popup', async () => {
    const { result } = renderHook(() =>
      useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus })
    )
    await act(async () => {
      await result.current.handleSignIn()
    })
    expect(result.current.status).toBe(OAuthStatus.WAITING)
    expect(window.open).toHaveBeenCalledWith(
      'https://accounts.google.com/auth',
      '_blank',
      'width=600,height=700'
    )
  })

  it('moves to SUCCESS when status poll returns success', async () => {
    mockGetStatus.mockResolvedValue({ status: 'success', email: 'user@example.com' })
    const { result } = renderHook(() =>
      useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus, pollInterval: 100 })
    )
    await act(async () => {
      await result.current.handleSignIn()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(result.current.status).toBe(OAuthStatus.SUCCESS)
    expect(result.current.user).toBe('user@example.com')
  })

  it('moves to ERROR when status poll returns error', async () => {
    mockGetStatus.mockResolvedValue({ status: 'error', message: 'Access denied' })
    const { result } = renderHook(() =>
      useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus, pollInterval: 100 })
    )
    await act(async () => {
      await result.current.handleSignIn()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(result.current.status).toBe(OAuthStatus.ERROR)
    expect(result.current.error).toBe('Access denied')
  })

  it('cancel() from WAITING reverts to IDLE', async () => {
    const { result } = renderHook(() =>
      useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus })
    )
    await act(async () => {
      await result.current.handleSignIn()
    })
    act(() => {
      result.current.cancel()
    })
    expect(result.current.status).toBe(OAuthStatus.IDLE)
  })

  it('initialises to SUCCESS from initialStatus prop', () => {
    const { result } = renderHook(() =>
      useOAuth({
        initiate: mockInitiate,
        getStatus: mockGetStatus,
        initialStatus: OAuthStatus.SUCCESS,
        initialUserEmail: 'existing@example.com',
      })
    )
    expect(result.current.status).toBe(OAuthStatus.SUCCESS)
    expect(result.current.user).toBe('existing@example.com')
  })

  it('handleReauthenticate() reverts to original email on failure', async () => {
    mockGetStatus.mockResolvedValue({ status: 'error', message: 'Denied' })
    const { result } = renderHook(() =>
      useOAuth({
        initiate: mockInitiate,
        getStatus: mockGetStatus,
        pollInterval: 100,
        initialStatus: OAuthStatus.SUCCESS,
        initialUserEmail: 'original@example.com',
      })
    )
    await act(async () => {
      await result.current.handleReauthenticate()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(result.current.status).toBe(OAuthStatus.SUCCESS)
    expect(result.current.user).toBe('original@example.com')
  })

  it('detects popup closure and calls cancel()', async () => {
    const { result } = renderHook(() =>
      useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus, pollInterval: 2000 })
    )
    await act(async () => {
      await result.current.handleSignIn()
    })
    mockPopup.closed = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(result.current.status).toBe(OAuthStatus.IDLE)
  })

  it('moves to ERROR and fires a toast when popup is blocked', async () => {
    const toaster = await import('@/utils/toaster')
    vi.spyOn(window, 'open').mockReturnValue(null)
    const { result } = renderHook(() =>
      useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus })
    )
    await act(async () => {
      await result.current.handleSignIn()
    })
    expect(result.current.status).toBe(OAuthStatus.ERROR)
    // Error message is delivered via toast (in usePopupWindow), not inline error state
    expect(result.current.error).toBe('')
    expect(toaster.default.error).toHaveBeenCalledWith(expect.stringMatching(/pop-up blocked/i))
  })
})
