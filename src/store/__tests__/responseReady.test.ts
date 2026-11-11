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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatDocumentTitle, PERMISSION_HINT_DELAY_MS } from '@/utils/responseReady'
import toaster from '@/utils/toaster'

import { responseReadyStore } from '../responseReady'

vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
}

describe('responseReadyStore', () => {
  const NotificationMock = vi.fn()

  beforeEach(() => {
    responseReadyStore.pending = false
    NotificationMock.mockClear()
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: Object.assign(NotificationMock, { permission: 'granted', requestPermission: vi.fn() }),
    })
  })

  afterEach(() => {
    setHidden(false)
    delete (window as any).Notification
  })

  it('marks pending and notifies when hidden and permission is granted', () => {
    setHidden(true)
    responseReadyStore.markResponseReady()
    expect(responseReadyStore.pending).toBe(true)
    expect(NotificationMock).toHaveBeenCalledWith('CodeMie', { body: 'AI response is ready' })
  })

  it('is a no-op when the tab is visible', () => {
    setHidden(false)
    responseReadyStore.markResponseReady()
    expect(responseReadyStore.pending).toBe(false)
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('sets pending without notifying when permission is denied', () => {
    setHidden(true)
    ;(window.Notification as any).permission = 'denied'
    expect(() => responseReadyStore.markResponseReady()).not.toThrow()
    expect(responseReadyStore.pending).toBe(true)
    expect(NotificationMock).not.toHaveBeenCalled()
  })

  it('does not throw when the Notification API is unsupported', () => {
    setHidden(true)
    delete (window as any).Notification
    expect(() => responseReadyStore.markResponseReady()).not.toThrow()
    expect(responseReadyStore.pending).toBe(true)
  })

  it('keeps pending and does not throw when the Notification constructor throws', () => {
    setHidden(true)
    NotificationMock.mockImplementationOnce(() => {
      throw new TypeError('Illegal constructor')
    })
    expect(() => responseReadyStore.markResponseReady()).not.toThrow()
    expect(responseReadyStore.pending).toBe(true)
  })

  it('clearResponseReady resets pending', () => {
    responseReadyStore.pending = true
    responseReadyStore.clearResponseReady()
    expect(responseReadyStore.pending).toBe(false)
  })

  it('requestNotificationPermission asks only when permission is default', async () => {
    const request = vi.fn().mockResolvedValue('granted')
    Object.assign(window.Notification as any, { permission: 'default', requestPermission: request })
    await responseReadyStore.requestNotificationPermission()
    expect(request).toHaveBeenCalledTimes(1)

    request.mockClear()
    ;(window.Notification as any).permission = 'denied'
    await responseReadyStore.requestNotificationPermission()
    expect(request).not.toHaveBeenCalled()
  })

  it('requestNotificationPermission swallows a rejected request', async () => {
    const request = vi.fn().mockRejectedValue(new Error('boom'))
    Object.assign(window.Notification as any, { permission: 'default', requestPermission: request })
    await expect(responseReadyStore.requestNotificationPermission()).resolves.toBeUndefined()
  })

  it('does not ask again this session after the prompt was dismissed', async () => {
    const request = vi.fn().mockResolvedValue('default')
    Object.assign(window.Notification as any, { permission: 'default', requestPermission: request })
    await responseReadyStore.requestNotificationPermission()
    await responseReadyStore.requestNotificationPermission()
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe('requestNotificationPermission hint', () => {
  const loadStore = async () => {
    vi.resetModules()
    return import('../responseReady')
  }

  const mockNotification = (permission: string, requestPermission: () => Promise<string>) => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: Object.assign(vi.fn(), { permission, requestPermission }),
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(toaster.info).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (window as any).Notification
  })

  it('shows the hint once when the request stays pending', async () => {
    mockNotification('default', () => new Promise(() => {}))
    const { responseReadyStore: store } = await loadStore()
    const { default: freshToaster } = await import('@/utils/toaster')

    store.requestNotificationPermission()
    vi.advanceTimersByTime(PERMISSION_HINT_DELAY_MS)
    expect(freshToaster.info).toHaveBeenCalledTimes(1)

    store.requestNotificationPermission()
    vi.advanceTimersByTime(PERMISSION_HINT_DELAY_MS)
    expect(freshToaster.info).toHaveBeenCalledTimes(1)
  })

  it('does not show the hint when the request settles before the delay', async () => {
    mockNotification('default', () => Promise.resolve('granted'))
    const { responseReadyStore: store } = await loadStore()
    const { default: freshToaster } = await import('@/utils/toaster')

    await store.requestNotificationPermission()
    vi.advanceTimersByTime(PERMISSION_HINT_DELAY_MS)
    expect(freshToaster.info).not.toHaveBeenCalled()
  })

  it('does not show the hint when permission changed while pending', async () => {
    mockNotification('default', () => new Promise(() => {}))
    const { responseReadyStore: store } = await loadStore()
    const { default: freshToaster } = await import('@/utils/toaster')

    store.requestNotificationPermission()
    ;(window.Notification as any).permission = 'granted'
    vi.advanceTimersByTime(PERMISSION_HINT_DELAY_MS)
    expect(freshToaster.info).not.toHaveBeenCalled()
  })
})

describe('formatDocumentTitle', () => {
  it('prefixes the title when pending', () => {
    expect(formatDocumentTitle('EPAM AI/Run CodeMie - Chats', true)).toBe(
      'Response ready - EPAM AI/Run CodeMie - Chats'
    )
  })

  it('returns the plain title when not pending', () => {
    expect(formatDocumentTitle('EPAM AI/Run CodeMie - Chats', false)).toBe(
      'EPAM AI/Run CodeMie - Chats'
    )
  })
})
