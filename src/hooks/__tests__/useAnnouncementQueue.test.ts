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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAnnouncementQueue } from '../useAnnouncementQueue'

// requestAnimationFrame is driven by the fake timer clock so the tests control when the message
// lands, exactly as they control the gap between queued messages.
const flushFrame = () => act(() => vi.advanceTimersByTime(16))

const flushGap = (gapMs: number) => act(() => vi.advanceTimersByTime(gapMs))

describe('useAnnouncementQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with an empty announcement', () => {
    const { result } = renderHook(() => useAnnouncementQueue())

    expect(result.current.announcement).toBe('')
  })

  it('publishes a queued message', () => {
    const { result } = renderHook(() => useAnnouncementQueue())

    act(() => result.current.announce('Row added. 2 rows total.'))
    flushFrame()

    expect(result.current.announcement).toBe('Row added. 2 rows total.')
  })

  it('ignores an empty message', () => {
    const { result } = renderHook(() => useAnnouncementQueue())

    act(() => result.current.announce(''))
    flushFrame()

    expect(result.current.announcement).toBe('')
  })

  it('plays queued messages one at a time, a gap apart', () => {
    const { result } = renderHook(() => useAnnouncementQueue({ gapMs: 1000 }))

    act(() => {
      result.current.announce('first')
      result.current.announce('second')
    })
    flushFrame()

    expect(result.current.announcement).toBe('first')

    flushGap(1000)
    flushFrame()

    expect(result.current.announcement).toBe('second')
  })

  it('re-announces a repeated identical message by clearing the region first', () => {
    const { result } = renderHook(() => useAnnouncementQueue({ gapMs: 1000 }))
    const message = 'Row removed. 1 row total.'

    act(() => result.current.announce(message))
    flushFrame()

    expect(result.current.announcement).toBe(message)

    act(() => result.current.announce(message))
    // Land exactly on the gap timer: it empties the region and schedules the repeat one frame later.
    act(() => vi.advanceTimersByTime(1000 - 16))

    // The region is emptied before the repeat is written, which is the DOM change that makes a
    // screen reader speak the same text twice.
    expect(result.current.announcement).toBe('')

    flushFrame()

    expect(result.current.announcement).toBe(message)
  })

  it('keeps only the most recent messages when the queue overflows', () => {
    const { result } = renderHook(() => useAnnouncementQueue({ gapMs: 1000, maxQueueSize: 2 }))

    act(() => {
      // 'first' leaves the queue immediately, so the two-slot queue then holds 'second'..'fourth'
      // and drops the oldest of those.
      result.current.announce('first')
      result.current.announce('second')
      result.current.announce('third')
      result.current.announce('fourth')
    })
    flushFrame()

    expect(result.current.announcement).toBe('first')

    flushGap(1000)
    flushFrame()

    expect(result.current.announcement).toBe('third')

    flushGap(1000)
    flushFrame()

    expect(result.current.announcement).toBe('fourth')
  })

  it('does not schedule work after unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const cancelFrameSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const { result, unmount } = renderHook(() => useAnnouncementQueue({ gapMs: 1000 }))

    act(() => {
      result.current.announce('first')
      result.current.announce('second')
    })

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(cancelFrameSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
    cancelFrameSpy.mockRestore()
  })
})
