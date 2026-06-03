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

import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'

import { userStore } from '@/store/user'
import { TimePeriod } from '@/types/analytics'

import { DEFAULT_FILTERS } from '../../constants'
import AnalyticsFilters from '../AnalyticsFilters'

vi.mock('@/store/user', () => ({
  userStore: {
    getAnalyticsUsers: vi.fn(),
  },
}))

vi.mock('@/components/ProjectSelector', () => ({
  default: () => <div data-testid="project-selector">ProjectSelector</div>,
}))

describe('AnalyticsFilters - Race Condition Fix', () => {
  const mockOnFiltersChange = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: MockInstance<[message?: any, ...optionalParams: any[]], void>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
    vi.useRealTimers()
  })

  it('should cancel previous request when time period changes rapidly', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const last60DaysUsers = [
      { label: 'User A', value: 'user-a' },
      { label: 'User B', value: 'user-b' },
    ]

    const lastHourUsers = [{ label: 'User C', value: 'user-c' }]

    let callCount = 0
    let firstRequestAborted = false

    const setupSlowRequest = (
      signal: AbortSignal | undefined,
      resolve: (value: typeof last60DaysUsers) => void,
      reject: (reason?: unknown) => void
    ) => {
      const handleAbort = () => {
        firstRequestAborted = true
        reject(new DOMException('Aborted', 'AbortError'))
      }

      const handleTimeout = () => {
        if (!signal?.aborted) {
          resolve(last60DaysUsers)
        }
      }

      if (signal) {
        signal.addEventListener('abort', handleAbort)
      }
      setTimeout(handleTimeout, 500)
    }

    const setupFastRequest = (resolve: (value: typeof lastHourUsers) => void) => {
      setTimeout(() => resolve(lastHourUsers), 50)
    }

    vi.mocked(userStore.getAnalyticsUsers).mockImplementation((_filters, signal) => {
      callCount += 1
      if (callCount === 1) {
        return new Promise((resolve, reject) => {
          setupSlowRequest(signal, resolve, reject)
        })
      }
      return new Promise((resolve) => {
        setupFastRequest(resolve)
      })
    })

    const { rerender } = render(
      <AnalyticsFilters
        filters={{ ...DEFAULT_FILTERS, time_period: TimePeriod.LAST_60_DAYS }}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    // Wait for initial call
    await waitFor(() => {
      expect(vi.mocked(userStore.getAnalyticsUsers)).toHaveBeenCalledTimes(1)
    })

    // Change to last_hour quickly (triggers abort)
    rerender(
      <AnalyticsFilters
        filters={{ ...DEFAULT_FILTERS, time_period: TimePeriod.LAST_HOUR }}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    // Wait for second request
    await waitFor(() => {
      expect(vi.mocked(userStore.getAnalyticsUsers)).toHaveBeenCalledTimes(2)
    })

    // Advance timers to let both requests complete
    await vi.advanceTimersByTimeAsync(600)

    // Verify first request was aborted
    expect(firstRequestAborted).toBe(true)
  })

  it('should handle errors gracefully', async () => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(userStore.getAnalyticsUsers).mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    )

    render(<AnalyticsFilters filters={DEFAULT_FILTERS} onFiltersChange={mockOnFiltersChange} />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading users:', expect.any(Error))
    })
  })

  it('should not log error for AbortError', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(userStore.getAnalyticsUsers).mockImplementation(() =>
      Promise.reject(new DOMException('Aborted', 'AbortError'))
    )

    render(<AnalyticsFilters filters={DEFAULT_FILTERS} onFiltersChange={mockOnFiltersChange} />)

    await waitFor(() => {
      expect(vi.mocked(userStore.getAnalyticsUsers)).toHaveBeenCalled()
    })

    await vi.advanceTimersByTimeAsync(100)

    // Should not have called console.error with our error
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'Error loading users:',
      expect.any(DOMException)
    )
  })
})
