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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { reportCallbackDiagnostics } from '../mcpAuthDiagnostics'
import { fetchMCPAuthStatus } from '../mcpAuthStatus'
import { watchSignInWindow } from '../watchSignInWindow'

vi.mock('../mcpAuthStatus', () => ({ fetchMCPAuthStatus: vi.fn() }))
vi.mock('../mcpAuthDiagnostics', () => ({ reportCallbackDiagnostics: vi.fn() }))

const statusOf = (status: string) => ({ status } as Awaited<ReturnType<typeof fetchMCPAuthStatus>>)

describe('watchSignInWindow', () => {
  const fakeWindow = { closed: false } as Window
  const onAuthenticated = vi.fn()
  const onClosedEarly = vi.fn()

  const watch = () =>
    watchSignInWindow({ window: fakeWindow, mcpConfigId: 'cfg-1', onAuthenticated, onClosedEarly })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    ;(fakeWindow as { closed: boolean }).closed = false
    vi.mocked(fetchMCPAuthStatus).mockResolvedValue(statusOf('authentication_required'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('calls onAuthenticated once and stops polling when status turns authenticated', async () => {
    vi.mocked(fetchMCPAuthStatus).mockResolvedValue(statusOf('authenticated'))
    watch()

    await vi.advanceTimersByTimeAsync(3000)
    expect(fetchMCPAuthStatus).toHaveBeenCalledWith('cfg-1')
    expect(onAuthenticated).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMCPAuthStatus).toHaveBeenCalledTimes(1)
    expect(onAuthenticated).toHaveBeenCalledTimes(1)
  })

  it('checks status once on close, then reports closed-early when unauthenticated', async () => {
    watch()
    ;(fakeWindow as { closed: boolean }).closed = true

    await vi.advanceTimersByTimeAsync(500)

    expect(fetchMCPAuthStatus).toHaveBeenCalledTimes(1)
    expect(onClosedEarly).toHaveBeenCalledTimes(1)
    expect(onAuthenticated).not.toHaveBeenCalled()
    expect(reportCallbackDiagnostics).toHaveBeenCalledWith({
      result: 'error',
      phase: 'window_closed_before_callback',
      waitedMs: 500,
    })

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMCPAuthStatus).toHaveBeenCalledTimes(1)
  })

  it('reports authenticated instead of closed-early when the window closed after success', async () => {
    vi.mocked(fetchMCPAuthStatus).mockResolvedValue(statusOf('authenticated'))
    watch()
    ;(fakeWindow as { closed: boolean }).closed = true

    await vi.advanceTimersByTimeAsync(500)

    expect(onAuthenticated).toHaveBeenCalledTimes(1)
    expect(onClosedEarly).not.toHaveBeenCalled()
    expect(reportCallbackDiagnostics).not.toHaveBeenCalled()
  })

  it('retries the final status check after a transient failure instead of reporting closed-early', async () => {
    vi.mocked(fetchMCPAuthStatus)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(statusOf('authenticated'))
    watch()
    ;(fakeWindow as { closed: boolean }).closed = true

    await vi.advanceTimersByTimeAsync(1500)

    expect(fetchMCPAuthStatus).toHaveBeenCalledTimes(2)
    expect(onAuthenticated).toHaveBeenCalledTimes(1)
    expect(onClosedEarly).not.toHaveBeenCalled()
    expect(reportCallbackDiagnostics).not.toHaveBeenCalled()
  })

  it('reports closed-early once every final status check has failed', async () => {
    vi.mocked(fetchMCPAuthStatus).mockRejectedValue(new Error('network'))
    watch()
    ;(fakeWindow as { closed: boolean }).closed = true

    await vi.advanceTimersByTimeAsync(2500)

    expect(fetchMCPAuthStatus).toHaveBeenCalledTimes(3)
    expect(onClosedEarly).toHaveBeenCalledTimes(1)
    expect(onAuthenticated).not.toHaveBeenCalled()
    expect(reportCallbackDiagnostics).toHaveBeenCalledWith({
      result: 'error',
      phase: 'window_closed_before_callback',
      waitedMs: 2500,
    })

    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchMCPAuthStatus).toHaveBeenCalledTimes(3)
  })

  it('does not retry the final status check when stop() is called while it is failing', async () => {
    vi.mocked(fetchMCPAuthStatus).mockRejectedValue(new Error('network'))
    const stop = watch()
    ;(fakeWindow as { closed: boolean }).closed = true
    await vi.advanceTimersByTimeAsync(500)

    stop()
    await vi.advanceTimersByTimeAsync(30_000)

    expect(fetchMCPAuthStatus).toHaveBeenCalledTimes(1)
    expect(onClosedEarly).not.toHaveBeenCalled()
  })

  // Pins the accepted limit for identity-provider errors: the callback page can only post an
  // error to an opener, which is cut, so the watcher has no error channel. The user sees the
  // generic closed-early message (or the 60 s hint), never the IdP error code.
  it('reports an identity-provider error only as the generic closed-early outcome', async () => {
    watch()

    await vi.advanceTimersByTimeAsync(9000)
    expect(onAuthenticated).not.toHaveBeenCalled()
    expect(onClosedEarly).not.toHaveBeenCalled()
    ;(fakeWindow as { closed: boolean }).closed = true
    await vi.advanceTimersByTimeAsync(500)

    expect(onClosedEarly).toHaveBeenCalledTimes(1)
    expect(onClosedEarly).toHaveBeenCalledWith()
  })

  it('swallows a failed status fetch and keeps polling', async () => {
    vi.mocked(fetchMCPAuthStatus).mockRejectedValueOnce(new Error('network'))
    watch()

    await vi.advanceTimersByTimeAsync(3000)
    expect(onAuthenticated).not.toHaveBeenCalled()

    vi.mocked(fetchMCPAuthStatus).mockResolvedValue(statusOf('authenticated'))
    await vi.advanceTimersByTimeAsync(3000)
    expect(onAuthenticated).toHaveBeenCalledTimes(1)
  })

  it('fires nothing after the 600 s cap', async () => {
    watch()
    await vi.advanceTimersByTimeAsync(600_000)
    vi.mocked(fetchMCPAuthStatus).mockClear()
    ;(fakeWindow as { closed: boolean }).closed = true
    vi.mocked(fetchMCPAuthStatus).mockResolvedValue(statusOf('authenticated'))
    await vi.advanceTimersByTimeAsync(60_000)

    expect(fetchMCPAuthStatus).not.toHaveBeenCalled()
    expect(onAuthenticated).not.toHaveBeenCalled()
    expect(onClosedEarly).not.toHaveBeenCalled()
  })

  it('fires nothing after stop()', async () => {
    vi.mocked(fetchMCPAuthStatus).mockResolvedValue(statusOf('authenticated'))
    const stop = watch()
    stop()
    ;(fakeWindow as { closed: boolean }).closed = true

    await vi.advanceTimersByTimeAsync(60_000)

    expect(fetchMCPAuthStatus).not.toHaveBeenCalled()
    expect(onAuthenticated).not.toHaveBeenCalled()
    expect(onClosedEarly).not.toHaveBeenCalled()
  })

  it('ignores an in-flight status result that resolves after stop()', async () => {
    let resolveStatus: (value: ReturnType<typeof statusOf>) => void = () => undefined
    vi.mocked(fetchMCPAuthStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve
      })
    )
    const stop = watch()
    await vi.advanceTimersByTimeAsync(3000)

    stop()
    resolveStatus(statusOf('authenticated'))
    await vi.advanceTimersByTimeAsync(0)

    expect(onAuthenticated).not.toHaveBeenCalled()
  })
})
