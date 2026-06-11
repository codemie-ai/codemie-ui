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

const { mockStore } = vi.hoisted(() => ({
  mockStore: {
    user: null as { isAdmin: boolean } | null,
    getAnalyticsUsers: vi.fn(),
  },
}))

vi.mock('@/store/user', () => ({ userStore: mockStore }))

let capturedProjectsOnChange: ((value: string | string[]) => void) | undefined

vi.mock('@/components/ProjectSelector', () => ({
  default: ({ onChange }: { onChange?: (value: string | string[]) => void }) => {
    capturedProjectsOnChange = onChange
    return <div data-testid="project-selector">ProjectSelector</div>
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store: unknown) => store),
  subscribe: vi.fn(),
}))

let capturedOnSearchChange: ((term: string) => void) | undefined

vi.mock('../AnalyticsUserFilter', () => ({
  default: ({ onSearchChange }: { onSearchChange?: (term: string) => void }) => {
    capturedOnSearchChange = onSearchChange
    return <div data-testid="user-filter" />
  },
}))

describe('AnalyticsFilters - Race Condition Fix', () => {
  const mockOnFiltersChange = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleErrorSpy: MockInstance<[message?: any, ...optionalParams: any[]], void>

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.user = null
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

describe('AnalyticsFilters - Admin Server-Side Search', () => {
  const mockOnFiltersChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnSearchChange = undefined
    mockStore.user = { isAdmin: true }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any)._env_ = { VITE_ENABLE_USER_MANAGEMENT: 'true' }
    vi.mocked(userStore.getAnalyticsUsers).mockResolvedValue([])
  })

  afterEach(() => {
    mockStore.user = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any)._env_
    vi.useRealTimers()
  })

  it('should not call API on initial render when admin (empty list until search)', async () => {
    render(<AnalyticsFilters filters={DEFAULT_FILTERS} onFiltersChange={mockOnFiltersChange} />)

    await waitFor(() => {
      expect(capturedOnSearchChange).toBeDefined()
    })

    expect(vi.mocked(userStore.getAnalyticsUsers)).not.toHaveBeenCalled()
  })

  it('should pass search term to getAnalyticsUsers when admin types 2+ chars', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(<AnalyticsFilters filters={DEFAULT_FILTERS} onFiltersChange={mockOnFiltersChange} />)

    await waitFor(() => {
      expect(capturedOnSearchChange).toBeDefined()
    })

    capturedOnSearchChange!('ab')

    await vi.advanceTimersByTimeAsync(600)

    await waitFor(() => {
      expect(vi.mocked(userStore.getAnalyticsUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'ab' }),
        expect.anything()
      )
    })
  })

  it('should not call API when admin types less than 2 chars', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(<AnalyticsFilters filters={DEFAULT_FILTERS} onFiltersChange={mockOnFiltersChange} />)

    await waitFor(() => {
      expect(capturedOnSearchChange).toBeDefined()
    })

    capturedOnSearchChange!('a')

    await vi.advanceTimersByTimeAsync(600)

    expect(vi.mocked(userStore.getAnalyticsUsers)).not.toHaveBeenCalled()
  })

  it('should preserve selected users when admin changes project selection (EPMCDME-12721)', async () => {
    capturedProjectsOnChange = undefined

    render(
      <AnalyticsFilters
        filters={{ ...DEFAULT_FILTERS, users: ['user-123'] }}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    await waitFor(() => {
      expect(capturedProjectsOnChange).toBeDefined()
    })

    mockOnFiltersChange.mockClear()

    capturedProjectsOnChange!(['proj-1'])

    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          projects: ['proj-1'],
          users: ['user-123'],
        })
      )
    })
  })

  it('should clear user options and not call API when admin clears the search', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    render(<AnalyticsFilters filters={DEFAULT_FILTERS} onFiltersChange={mockOnFiltersChange} />)

    await waitFor(() => {
      expect(capturedOnSearchChange).toBeDefined()
    })

    // Search first
    capturedOnSearchChange!('ab')
    await vi.advanceTimersByTimeAsync(600)
    await waitFor(() => expect(vi.mocked(userStore.getAnalyticsUsers)).toHaveBeenCalledTimes(1))

    vi.mocked(userStore.getAnalyticsUsers).mockClear()

    // Clear search
    capturedOnSearchChange!('')
    await vi.advanceTimersByTimeAsync(600)

    // loadUsers should be called immediately on empty, but it returns early (no API call)
    expect(vi.mocked(userStore.getAnalyticsUsers)).not.toHaveBeenCalled()
  })
})
