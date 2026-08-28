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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { userSettingsStore } from '@/store/userSettings'
import { OAuthStatus } from '@/types/entity/dataSource'
import api from '@/utils/api'

import { useConfluenceConnect } from '../useConfluenceConnect'

const callbackOrigin = () =>
  /^https?:\/\//i.test(api.BASE_URL) ? new URL(api.BASE_URL).origin : window.location.origin

// Simulate the callback page's postMessage to the opener window.
const postCallback = (status: 'success' | 'error', extra: Record<string, unknown> = {}) =>
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'tool_oauth_callback', status, state: 'st', ...extra },
        origin: callbackOrigin(),
      })
    )
  })

describe('useConfluenceConnect', () => {
  let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.useFakeTimers()
    mockPopup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window)
    vi.spyOn(userSettingsStore, 'connectConfluenceOAuth').mockResolvedValue({
      auth_url: 'https://auth.atlassian.com/authorize',
      state: 'st',
      setting_id: 's1',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts IDLE', () => {
    const { result } = renderHook(() => useConfluenceConnect('s1'))
    expect(result.current.status).toBe(OAuthStatus.IDLE)
  })

  it('moves to WAITING and opens the popup on connect', async () => {
    const { result } = renderHook(() => useConfluenceConnect('s1'))
    await act(async () => {
      await result.current.handleConnect()
    })
    expect(userSettingsStore.connectConfluenceOAuth).toHaveBeenCalledWith('s1')
    expect(window.open).toHaveBeenCalledWith(
      'https://auth.atlassian.com/authorize',
      '_blank',
      expect.any(String)
    )
    expect(result.current.status).toBe(OAuthStatus.WAITING)
  })

  it('reaches SUCCESS on a success callback message', async () => {
    const { result } = renderHook(() => useConfluenceConnect('s1'))
    await act(async () => {
      await result.current.handleConnect()
    })
    postCallback('success')
    expect(result.current.status).toBe(OAuthStatus.SUCCESS)
  })

  it('surfaces ERROR on an error callback message', async () => {
    const { result } = renderHook(() => useConfluenceConnect('s1'))
    await act(async () => {
      await result.current.handleConnect()
    })
    postCallback('error', { error: 'Access denied' })
    expect(result.current.status).toBe(OAuthStatus.ERROR)
    expect(result.current.error).toBe('Access denied')
  })

  it('ignores a callback for a different state', async () => {
    const { result } = renderHook(() => useConfluenceConnect('s1'))
    await act(async () => {
      await result.current.handleConnect()
    })
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'tool_oauth_callback', status: 'success', state: 'other' },
          origin: callbackOrigin(),
        })
      )
    })
    expect(result.current.status).toBe(OAuthStatus.WAITING)
  })

  it('refreshStatus seeds SUCCESS when already connected', async () => {
    vi.spyOn(userSettingsStore, 'getConfluenceConnectionStatus').mockResolvedValue({
      status: 'connected',
      username: 'groot',
    })
    const { result } = renderHook(() => useConfluenceConnect('s1'))
    await act(async () => {
      await result.current.refreshStatus()
    })
    expect(result.current.status).toBe(OAuthStatus.SUCCESS)
    expect(result.current.username).toBe('groot')
  })
})
