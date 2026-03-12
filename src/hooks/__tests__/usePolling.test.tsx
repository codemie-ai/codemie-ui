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

describe('usePolling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
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
})
