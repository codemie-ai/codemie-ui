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

import { usePolling } from '../usePolling'

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('does not start polling when enabled is false', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: false,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('starts polling when enabled is true', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 5000,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('polls multiple times at specified intervals', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 2000,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('stops polling when enabled changes to false', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ enabled }) =>
        usePolling({
          fetchFn,
          enabled,
          interval: 5000,
        }),
      {
        initialProps: { enabled: true },
      }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    act(() => {
      rerender({ enabled: false })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('resumes polling when enabled changes back to true', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ enabled }) =>
        usePolling({
          fetchFn,
          enabled,
          interval: 3000,
        }),
      {
        initialProps: { enabled: true },
      }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    act(() => {
      rerender({ enabled: false })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    act(() => {
      rerender({ enabled: true })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('maintains interval on successful fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 5000,
        intervalIncrement: 2000,
        maxInterval: 30000,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('increases interval on error but does not exceed maxInterval', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockRejectedValueOnce(new Error('Fetch failed'))

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 5000,
        intervalIncrement: 3000,
        maxInterval: 10000,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)

    consoleErrorSpy.mockRestore()
  })

  it('increases interval on error and resets to initial value on success', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 5000,
        intervalIncrement: 2000,
        maxInterval: 30000,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(4)

    consoleErrorSpy.mockRestore()
  })

  it('logs error when fetch fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 5000,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('does not call fetchFn if previous fetch is still in progress', async () => {
    let resolveFirstFetch: () => void
    const firstFetchPromise = new Promise<void>((resolve) => {
      resolveFirstFetch = resolve
    })

    const fetchFn = vi
      .fn()
      .mockImplementationOnce(() => firstFetchPromise)
      .mockResolvedValue(undefined)

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 5000,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirstFetch!()
    })
  })

  it('cleans up interval on unmount', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    const { unmount } = renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 5000,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    act(() => {
      unmount()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('resets interval to initial value when disabled and re-enabled', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockResolvedValueOnce(undefined)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = renderHook(
      ({ enabled }) =>
        usePolling({
          fetchFn,
          enabled,
          interval: 5000,
          intervalIncrement: 2000,
          maxInterval: 30000,
        }),
      {
        initialProps: { enabled: true },
      }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    act(() => {
      rerender({ enabled: false })
    })

    act(() => {
      rerender({ enabled: true })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)

    consoleErrorSpy.mockRestore()
  })

  it('uses default values when optional parameters are not provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
      })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('handles rapid enable/disable toggling', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ enabled }) =>
        usePolling({
          fetchFn,
          enabled,
          interval: 5000,
        }),
      {
        initialProps: { enabled: true },
      }
    )

    act(() => {
      rerender({ enabled: false })
      rerender({ enabled: true })
      rerender({ enabled: false })
      rerender({ enabled: true })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('updates interval when interval prop changes', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ interval }) =>
        usePolling({
          fetchFn,
          enabled: true,
          interval,
        }),
      {
        initialProps: { interval: 5000 },
      }
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    act(() => {
      rerender({ interval: 3000 })
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('backs off after threshold consecutive unchanged results and resets on a changed result', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 4000,
        idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
      })
    )

    const gaps = [4000, 4000, 4000, 8000, 16000, 30000, 30000]
    for (let i = 0; i < gaps.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await vi.advanceTimersByTimeAsync(gaps[i])
      })
      expect(fetchFn).toHaveBeenCalledTimes(i + 1)
    }

    // the 7th result was `true`: interval reset to base
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(8)
  })

  it('never backs off when fetchFn resolves undefined', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)
    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 4000,
        idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
      })
    )
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000)
      })
    }
    expect(fetchFn).toHaveBeenCalledTimes(5)
  })

  it('uses additive error backoff during idle backoff, then resumes idle rules on the next success', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(false) // counter 1, interval stays 4000
      .mockResolvedValueOnce(false) // counter 2, interval stays 4000
      .mockResolvedValueOnce(false) // counter 3 >= threshold, interval -> 8000
      .mockRejectedValueOnce(new Error('network')) // error backoff: 8000+2000=10000, counter unchanged
      .mockResolvedValueOnce(false) // counter 4 >= threshold, interval -> min(10000*2,30000)=20000
      .mockResolvedValueOnce(true) // change: counter reset, interval -> 4000
      .mockResolvedValue(false)

    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 4000,
        intervalIncrement: 2000,
        maxInterval: 30000,
        idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
      })
    )

    const advance = async (ms: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
      })
    }

    await advance(4000 + 4000 + 4000 + 8000)
    expect(fetchFn).toHaveBeenCalledTimes(4)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error))

    // error: 8000 + 2000 = 10000
    await advance(9999)
    expect(fetchFn).toHaveBeenCalledTimes(4)
    await advance(1)
    expect(fetchFn).toHaveBeenCalledTimes(5)

    // unchanged success after the error follows idle rules: 10000 * 2 = 20000
    await advance(19999)
    expect(fetchFn).toHaveBeenCalledTimes(5)
    await advance(1)
    expect(fetchFn).toHaveBeenCalledTimes(6)

    // changed success resets to the base interval
    await advance(4000)
    expect(fetchFn).toHaveBeenCalledTimes(7)
  })

  it('does not start polling while mounted hidden, and fetches immediately once visible', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)
    setVisibility('hidden')

    renderHook(() => usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(fetchFn).not.toHaveBeenCalled()

    await act(async () => {
      setVisibility('visible')
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('does not start polling when enabled flips to true while hidden, and starts once visible', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)
    const { rerender } = renderHook(
      ({ enabled }) => usePolling({ fetchFn, enabled, interval: 4000, pauseWhenHidden: true }),
      { initialProps: { enabled: false } }
    )
    await act(async () => {
      setVisibility('hidden')
    })

    rerender({ enabled: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(fetchFn).not.toHaveBeenCalled()

    await act(async () => {
      setVisibility('visible')
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('skips the immediate re-fetch on becoming visible if the last fetch was under one interval ago', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)
    renderHook(() => usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      setVisibility('hidden')
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      setVisibility('visible')
    })
    expect(fetchFn).toHaveBeenCalledTimes(1) // last fetch was 1s ago, under the 4s interval

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('does not restart the timer while hidden even if a fetch was still in flight when the tab hid', async () => {
    let resolveFetch: () => void = () => {}
    const fetchFn = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFetch = resolve
        })
    )
    renderHook(() => usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    setVisibility('hidden')
    await act(async () => {
      resolveFetch()
      await Promise.resolve()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('does not restart the timer while hidden when a fetch in flight at hide time fails and changes the interval', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let rejectFetch: (error: Error) => void = () => {}
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFetch = reject
          })
      )
      .mockResolvedValue(undefined)
    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 4000,
        intervalIncrement: 2000,
        pauseWhenHidden: true,
      })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    setVisibility('hidden')
    await act(async () => {
      rejectFetch(new Error('network'))
      await Promise.resolve()
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('resets idle backoff to the base interval and fetches immediately when the tab becomes visible', async () => {
    const fetchFn = vi.fn().mockResolvedValue(false)
    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 4000,
        pauseWhenHidden: true,
        idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
      })
    )

    // three unchanged results: interval backs off to 8000
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)

    await act(async () => {
      setVisibility('hidden')
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)

    // last fetch was 10s ago, over one interval: immediate fetch
    await act(async () => {
      setVisibility('visible')
    })
    expect(fetchFn).toHaveBeenCalledTimes(4)

    // timer restarted at the base 4000 with the idle counter reset, not at the backed-off 8000
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3999)
    })
    expect(fetchFn).toHaveBeenCalledTimes(4)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(fetchFn).toHaveBeenCalledTimes(5)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(6)
  })

  it('ignores the result of a fetch in flight from before the tab hid once it becomes visible again', async () => {
    let resolveFetch: (value: boolean) => void = () => {}
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveFetch = resolve
          })
      )
      .mockResolvedValue(false)
    renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 4000,
        pauseWhenHidden: true,
        idleBackoff: { threshold: 1, multiplier: 2, maxInterval: 30000 },
      })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      setVisibility('hidden')
      await vi.advanceTimersByTimeAsync(1000)
      setVisibility('visible')
    })

    // the stale result is dropped; only the queued refetch counts toward idle backoff (4000 -> 8000)
    await act(async () => {
      resolveFetch(false)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7999)
    })
    expect(fetchFn).toHaveBeenCalledTimes(2)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('keeps idle backoff when the caller passes a new idleBackoff object on every render', async () => {
    const fetchFn = vi.fn().mockResolvedValue(false)
    const { rerender } = renderHook(() =>
      usePolling({
        fetchFn,
        enabled: true,
        interval: 4000,
        idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
      })
    )

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000)
      })
      rerender()
    }
    expect(fetchFn).toHaveBeenCalledTimes(3)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7999)
    })
    expect(fetchFn).toHaveBeenCalledTimes(3)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(fetchFn).toHaveBeenCalledTimes(4)
  })

  it('queues the immediate visible re-fetch when a fetch is still in flight, and fires it once that fetch resolves', async () => {
    let resolveFetch: () => void = () => {}
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFetch = resolve
          })
      )
      .mockResolvedValue(undefined)

    renderHook(() => usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1) // first fetch in flight, unresolved

    await act(async () => {
      setVisibility('hidden')
      setVisibility('visible')
    })
    // still in flight: the visible-triggered refetch must be queued, not dropped
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFetch()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchFn).toHaveBeenCalledTimes(2) // queued refetch fires once the in-flight fetch resolves
  })

  it('drops the queued visible re-fetch when the tab hides again before the in-flight fetch resolves', async () => {
    let resolveFetch: () => void = () => {}
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFetch = resolve
          })
      )
      .mockResolvedValue(undefined)

    renderHook(() => usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      setVisibility('hidden')
      setVisibility('visible') // queues a refetch behind the in-flight fetch
      setVisibility('hidden')
    })

    await act(async () => {
      resolveFetch()
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('drops the queued visible re-fetch when the hook unmounts before the in-flight fetch resolves', async () => {
    let resolveFetch: () => void = () => {}
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFetch = resolve
          })
      )
      .mockResolvedValue(undefined)

    const { unmount } = renderHook(() =>
      usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    await act(async () => {
      setVisibility('hidden')
      setVisibility('visible') // queues a refetch behind the in-flight fetch
    })
    unmount()

    await act(async () => {
      resolveFetch()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('does not let a fetch started with a previous fetchFn reschedule the timer of the new one', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let rejectFetchA: (error: Error) => void = () => {}
    const fetchA = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFetchA = reject
        })
    )
    const fetchB = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ fetchFn }) =>
        usePolling({ fetchFn, enabled: true, interval: 4000, intervalIncrement: 2000 }),
      { initialProps: { fetchFn: fetchA as () => Promise<unknown> } }
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchA).toHaveBeenCalledTimes(1) // in flight

    rerender({ fetchFn: fetchB })
    // A fails after B's timer started; its error backoff must not replace B's timer
    await act(async () => {
      rejectFetchA(new Error('network'))
      await Promise.resolve()
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', expect.any(Error))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000)
    })
    expect(fetchA).toHaveBeenCalledTimes(1)
    expect(fetchB).toHaveBeenCalledTimes(3) // still at B's base 4000 interval
  })

  it('queues the new generation immediate refetch behind a stale in-flight fetch instead of overlapping it', async () => {
    let resolveFetchA: () => void = () => {}
    const fetchA = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFetchA = resolve
        })
    )
    const fetchB = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ fetchFn }) =>
        usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }),
      { initialProps: { fetchFn: fetchA as () => Promise<unknown> } }
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchA).toHaveBeenCalledTimes(1) // in flight, unresolved

    rerender({ fetchFn: fetchB })

    // Tab hides and becomes visible again under the new generation while A's fetch is still in
    // flight: B's immediate refetch must be queued, not started alongside A.
    await act(async () => {
      setVisibility('hidden')
      setVisibility('visible')
    })
    expect(fetchB).not.toHaveBeenCalled()

    // B's own timer ticking while A is still in flight must not overlap it either.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchB).not.toHaveBeenCalled()

    // A resolves late: the queued refetch fires against B, never A.
    await act(async () => {
      resolveFetchA()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchA).toHaveBeenCalledTimes(1)
    expect(fetchB).toHaveBeenCalledTimes(1)

    // B's regular timer still drives further polling.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchB).toHaveBeenCalledTimes(2)
    expect(fetchA).toHaveBeenCalledTimes(1)
  })

  it('does not start a new generation fetch while a previous generation fetch is still in flight', async () => {
    let resolveFetchA: () => void = () => {}
    const fetchA = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFetchA = resolve
        })
    )
    const fetchB = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ fetchFn, enabled }) => usePolling({ fetchFn, enabled, interval: 4000 }),
      { initialProps: { fetchFn: fetchA as () => Promise<unknown>, enabled: true } }
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchA).toHaveBeenCalledTimes(1) // in flight, unresolved

    // enabled toggles off and on while A is in flight: a new generation, same guard
    rerender({ fetchFn: fetchB, enabled: false })
    rerender({ fetchFn: fetchB, enabled: true })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000)
    })
    expect(fetchB).not.toHaveBeenCalled()

    await act(async () => {
      resolveFetchA()
      await Promise.resolve()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchB).toHaveBeenCalledTimes(1)
    expect(fetchA).toHaveBeenCalledTimes(1)
  })

  it('resets the idle backoff counter (not just on disable) when fetchFn changes while enabled stays true', async () => {
    const fetchA = vi.fn().mockResolvedValue(false)
    const fetchB = vi.fn().mockResolvedValue(false)

    const { rerender } = renderHook(
      ({ fetchFn }) =>
        usePolling({
          fetchFn,
          enabled: true,
          interval: 4000,
          idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
        }),
      { initialProps: { fetchFn: fetchA as () => Promise<unknown> } }
    )

    // Two unchanged results under A: idle count -> 2, below the threshold, interval stays 4000.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchA).toHaveBeenCalledTimes(2)

    act(() => {
      rerender({ fetchFn: fetchB })
    })

    // First poll under B, a target that has never been polled before.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchB).toHaveBeenCalledTimes(1)

    // With a leaked idle count of 2, this single unchanged result would trip the threshold and
    // back the interval off to 8000. With the counter correctly reset for B, it stays at 4000.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3999)
    })
    expect(fetchB).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(fetchB).toHaveBeenCalledTimes(2)
  })

  it('resets the last-fetch timestamp (not just the interval) when fetchFn changes while enabled stays true', async () => {
    const fetchA = vi.fn().mockResolvedValue(undefined)
    const fetchB = vi.fn().mockResolvedValue(undefined)

    const { rerender } = renderHook(
      ({ fetchFn }) =>
        usePolling({ fetchFn, enabled: true, interval: 4000, pauseWhenHidden: true }),
      { initialProps: { fetchFn: fetchA as () => Promise<unknown> } }
    )

    // A fetches once, recording a recent lastFetchAt.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchA).toHaveBeenCalledTimes(1)

    // Switch targets (e.g. a new chat opened) immediately after -- B has never been fetched.
    act(() => {
      rerender({ fetchFn: fetchB })
    })

    // Tab hides and returns visible right away, well under one interval since A's last fetch.
    await act(async () => {
      setVisibility('hidden')
      setVisibility('visible')
    })

    // B has never been fetched, so becoming visible must trigger an immediate fetch for it
    // regardless of how recently A -- a different target -- was last fetched.
    expect(fetchB).toHaveBeenCalledTimes(1)
  })

  it('resets the idle backoff counter (not just the interval) when disabled and re-enabled', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(false) // idleCount 1
      .mockResolvedValueOnce(false) // idleCount 2
      .mockResolvedValueOnce(false) // idleCount 3 >= threshold, would back off if not for disable
      .mockResolvedValueOnce(false) // first poll after re-enable
      .mockResolvedValueOnce(false)

    const { rerender } = renderHook(
      ({ enabled }) =>
        usePolling({
          fetchFn,
          enabled,
          interval: 4000,
          idleBackoff: { threshold: 3, multiplier: 2, maxInterval: 30000 },
        }),
      { initialProps: { enabled: true } }
    )

    const gaps = [4000, 4000, 4000]
    // eslint-disable-next-line no-restricted-syntax
    for (const gap of gaps) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await vi.advanceTimersByTimeAsync(gap)
      })
    }
    expect(fetchFn).toHaveBeenCalledTimes(3)

    act(() => {
      rerender({ enabled: false })
    })
    act(() => {
      rerender({ enabled: true })
    })

    // first poll after re-enable: with the idle counter reset, this alone must not trigger backoff
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(4)

    // next poll still arrives at the base 4s cadence, not an already-backed-off interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000)
    })
    expect(fetchFn).toHaveBeenCalledTimes(5)
  })

  it('removes the visibilitychange listener on unmount and when enabled turns false', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined)
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { rerender, unmount } = renderHook(
      ({ enabled }) => usePolling({ fetchFn, enabled, interval: 4000, pauseWhenHidden: true }),
      { initialProps: { enabled: true } }
    )
    expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

    act(() => rerender({ enabled: false }))
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

    addSpy.mockClear()
    act(() => rerender({ enabled: true }))
    expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

    unmount()
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })
})
