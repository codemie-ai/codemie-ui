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

import { usePopupWindow } from '../usePopupWindow'

// Toaster is called in usePopupWindow; suppress actual implementation.
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn() },
}))

describe('usePopupWindow', () => {
  let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.useFakeTimers()
    mockPopup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts with isOpen false', () => {
    const { result } = renderHook(() => usePopupWindow())
    expect(result.current.isOpen).toBe(false)
  })

  it('open() sets isOpen true and returns true when popup opens', () => {
    const { result } = renderHook(() => usePopupWindow())
    let opened: boolean
    act(() => {
      opened = result.current.open('https://example.com')
    })
    expect(opened!).toBe(true)
    expect(result.current.isOpen).toBe(true)
    expect(window.open).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'width=600,height=700'
    )
  })

  it('open() accepts custom popup features', () => {
    const { result } = renderHook(() => usePopupWindow())
    act(() => {
      result.current.open('https://example.com', { width: 800, height: 900 })
    })
    expect(window.open).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'width=800,height=900'
    )
  })

  it('open() returns false and fires toast when popup is blocked', async () => {
    const toaster = await import('@/utils/toaster')
    vi.spyOn(window, 'open').mockReturnValue(null)
    const { result } = renderHook(() => usePopupWindow())
    let opened: boolean
    act(() => {
      opened = result.current.open('https://example.com')
    })
    expect(opened!).toBe(false)
    expect(result.current.isOpen).toBe(false)
    expect(toaster.default.error).toHaveBeenCalledWith(expect.stringMatching(/pop-up blocked/i))
  })

  it('close() closes the popup and sets isOpen false', () => {
    const { result } = renderHook(() => usePopupWindow())
    act(() => {
      result.current.open('https://example.com')
    })
    act(() => {
      result.current.close()
    })
    expect(mockPopup.close).toHaveBeenCalled()
    expect(result.current.isOpen).toBe(false)
  })

  it('close() fires onClose callback', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => usePopupWindow({ onClose }))
    act(() => {
      result.current.open('https://example.com')
    })
    act(() => {
      result.current.close()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('detects popup closed by user via polling and fires onClose', async () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => usePopupWindow({ onClose }))
    act(() => {
      result.current.open('https://example.com')
    })

    // Simulate user closing the popup window
    mockPopup.closed = true

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(result.current.isOpen).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('onClose fires only once even if polling ticks multiple times after close', async () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => usePopupWindow({ onClose }))
    act(() => {
      result.current.open('https://example.com')
    })

    mockPopup.closed = true

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('close() called when already closed does not double-fire onClose', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => usePopupWindow({ onClose }))
    act(() => {
      result.current.open('https://example.com')
    })
    act(() => {
      result.current.close()
      result.current.close()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes popup on unmount', () => {
    const { result, unmount } = renderHook(() => usePopupWindow())
    act(() => {
      result.current.open('https://example.com')
    })
    unmount()
    expect(mockPopup.close).toHaveBeenCalled()
  })

  it('does not fire onClose after unmount', async () => {
    const onClose = vi.fn()
    const { result, unmount } = renderHook(() => usePopupWindow({ onClose }))
    act(() => {
      result.current.open('https://example.com')
    })
    // Unmount cleans up the interval — polling stops, popup is closed but onClose is NOT fired
    unmount()
    mockPopup.closed = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
