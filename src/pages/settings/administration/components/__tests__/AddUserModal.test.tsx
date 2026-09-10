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

import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AddUserModal from '../AddUserModal'

const { mockSearchUsers } = vi.hoisted(() => ({ mockSearchUsers: vi.fn() }))
vi.mock('@/store/user', () => ({ userStore: { searchUsers: mockSearchUsers } }))

let capturedOnFilter: ((v: string) => void) | undefined
let capturedOnChange: ((e: any) => void) | undefined
let capturedPopupSubmit: (() => void) | undefined
let capturedPopupOnHide: (() => void) | undefined
let capturedOptions: any[] = []
let capturedLoading: boolean = false

vi.mock('@/components/form/MultiSelect', () => ({
  default: ({ onFilter, onChange, options, loading }: any) => {
    capturedOnFilter = onFilter
    capturedOnChange = onChange
    capturedOptions = options ?? []
    capturedLoading = loading ?? false
    return <div />
  },
}))
vi.mock('@/components/Popup', () => ({
  default: ({ children, onSubmit, onHide }: any) => {
    capturedPopupSubmit = onSubmit
    capturedPopupOnHide = onHide
    return <div>{children}</div>
  },
}))

beforeEach(() => {
  mockSearchUsers.mockReset()
  mockSearchUsers.mockResolvedValue([])
  capturedOnFilter = undefined
  capturedOnChange = undefined
  capturedPopupSubmit = undefined
  capturedPopupOnHide = undefined
  capturedOptions = []
  capturedLoading = false
})

describe('AddUserModal debounce', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('suppresses backend calls during rapid typing', async () => {
    vi.useFakeTimers()
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={vi.fn()} />)
    await act(async () => {
      capturedOnFilter?.('a')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    await act(async () => {
      capturedOnFilter?.('ab')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    await act(async () => {
      capturedOnFilter?.('abc')
    })
    expect(mockSearchUsers).not.toHaveBeenCalled()
  })

  it('fires exactly once after the window elapses', async () => {
    vi.useFakeTimers()
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={vi.fn()} />)
    await act(async () => {
      capturedOnFilter?.('a')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    await act(async () => {
      capturedOnFilter?.('ab')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    await act(async () => {
      capturedOnFilter?.('abc')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(mockSearchUsers).toHaveBeenCalledTimes(1)
    expect(mockSearchUsers).toHaveBeenCalledWith('abc', 10)
  })

  it('ignores stale responses when a newer request completes first', async () => {
    let resolveFirst!: (v: any[]) => void
    let resolveSecond!: (v: any[]) => void
    mockSearchUsers
      .mockReturnValueOnce(
        new Promise<any[]>((r) => {
          resolveFirst = r
        })
      )
      .mockReturnValueOnce(
        new Promise<any[]>((r) => {
          resolveSecond = r
        })
      )

    vi.useFakeTimers()
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={vi.fn()} />)

    // Fire first search and let debounce elapse
    await act(async () => {
      capturedOnFilter?.('ab')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    // Fire second search before first resolves and let its debounce elapse
    await act(async () => {
      capturedOnFilter?.('abc')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    // Newer response (abc) resolves first
    await act(async () => {
      resolveSecond([{ id: 'u2', name: 'Fresh User', email: 'fresh@example.com' }])
    })

    // Stale response (ab) resolves second
    await act(async () => {
      resolveFirst([{ id: 'u1', name: 'Stale User', email: 'stale@example.com' }])
    })

    // Options must reflect the fresh response; stale must not overwrite
    expect(capturedOptions).toEqual([{ label: 'Fresh User (fresh@example.com)', value: 'u2' }])
  })

  it('clears loading spinner when query is cleared while a request is in-flight', async () => {
    let resolveInFlight!: (v: any[]) => void
    mockSearchUsers.mockReturnValueOnce(
      new Promise<any[]>((r) => {
        resolveInFlight = r
      })
    )

    vi.useFakeTimers()
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={vi.fn()} />)

    // Start a search and let the debounce fire so the request is in-flight
    await act(async () => {
      capturedOnFilter?.('ab')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(capturedLoading).toBe(true)

    // Clear the query before the in-flight request resolves
    await act(async () => {
      capturedOnFilter?.('')
    })

    // Resolve the in-flight request — its finally block should be a no-op
    await act(async () => {
      resolveInFlight([{ id: 'u1', name: 'Someone', email: 'someone@example.com' }])
    })

    expect(capturedLoading).toBe(false)
  })

  it('clears loading spinner when the modal is closed while a request is in-flight', async () => {
    let resolveInFlight!: (v: any[]) => void
    mockSearchUsers.mockReturnValueOnce(
      new Promise<any[]>((r) => {
        resolveInFlight = r
      })
    )

    vi.useFakeTimers()
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={vi.fn()} />)

    // Start a search and let the debounce fire so the request is in-flight
    await act(async () => {
      capturedOnFilter?.('ab')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(capturedLoading).toBe(true)

    // Close the modal — this triggers resetFormState which should clear the spinner
    await act(async () => {
      capturedPopupOnHide?.()
    })

    // Resolve the in-flight request — its finally block should be a no-op due to invalidated requestId
    await act(async () => {
      resolveInFlight([{ id: 'u1', name: 'Someone', email: 'someone@example.com' }])
    })

    expect(capturedLoading).toBe(false)
  })
})

describe('AddUserModal submit path', () => {
  it('calls props.onSubmit with userId and default role after user selection', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AddUserModal visible onHide={vi.fn()} onSubmit={onSubmit} />)
    await act(async () => {
      capturedOnChange?.({ target: { value: 'user-abc' } })
    })
    await act(async () => {
      capturedPopupSubmit?.()
    })
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ userIdentifier: 'user-abc', role: 'user' })
    )
  })
})
