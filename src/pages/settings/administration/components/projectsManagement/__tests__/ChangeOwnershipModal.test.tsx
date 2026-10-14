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

import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ChangeOwnershipModal from '../ChangeOwnershipModal'

const { mockSearchUsers, mockGetUserById } = vi.hoisted(() => ({
  mockSearchUsers: vi.fn(),
  mockGetUserById: vi.fn(),
}))
vi.mock('@/store/user', () => ({
  userStore: { searchUsers: mockSearchUsers, getUserById: mockGetUserById },
}))

let capturedOnFilter: ((v: string) => void) | undefined
let capturedOnChange: ((e: any) => void) | undefined
let capturedPopupSubmit: (() => void) | undefined
let capturedMultiSelectError: string | undefined
let capturedSubmitDisabled: boolean | undefined

vi.mock('@/components/form/MultiSelect', () => ({
  default: ({ onFilter, onChange, error }: any) => {
    capturedOnFilter = onFilter
    capturedOnChange = onChange
    capturedMultiSelectError = error
    return <div />
  },
}))
vi.mock('@/components/Popup', () => ({
  default: ({ children, onSubmit, submitDisabled }: any) => {
    capturedPopupSubmit = onSubmit
    capturedSubmitDisabled = submitDisabled
    return <div>{children}</div>
  },
}))

beforeEach(() => {
  mockSearchUsers.mockReset()
  mockSearchUsers.mockResolvedValue([])
  mockGetUserById.mockReset()
  capturedOnFilter = undefined
  capturedOnChange = undefined
  capturedPopupSubmit = undefined
  capturedMultiSelectError = undefined
  capturedSubmitDisabled = undefined
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ChangeOwnershipModal — current owner resolution', () => {
  it('renders current owner name once userStore.getUserById resolves', async () => {
    mockGetUserById.mockResolvedValue({
      id: 'owner-1',
      name: 'Owner Name',
      email: 'owner@example.com',
    })

    render(
      <ChangeOwnershipModal visible onHide={vi.fn()} currentOwnerId="owner-1" onSubmit={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByText(/Owner Name \(owner@example.com\)/)).toBeTruthy())
  })

  it('renders a fallback string when getUserById rejects', async () => {
    mockGetUserById.mockRejectedValue(new Error('not found'))

    render(
      <ChangeOwnershipModal visible onHide={vi.fn()} currentOwnerId="owner-1" onSubmit={vi.fn()} />
    )

    await waitFor(() => expect(screen.getByText(/Unknown \(id: owner-1\)/)).toBeTruthy())
  })
})

describe('ChangeOwnershipModal — confirm gating', () => {
  it('keeps Confirm disabled with no selection', async () => {
    mockGetUserById.mockResolvedValue({ id: 'owner-1', name: 'Owner', email: 'owner@example.com' })

    render(
      <ChangeOwnershipModal visible onHide={vi.fn()} currentOwnerId="owner-1" onSubmit={vi.fn()} />
    )

    await waitFor(() => expect(capturedSubmitDisabled).toBe(true))
  })

  it('enables Confirm and calls onSubmit with the selected id on submit', async () => {
    mockGetUserById.mockResolvedValue({ id: 'owner-1', name: 'Owner', email: 'owner@example.com' })
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <ChangeOwnershipModal visible onHide={vi.fn()} currentOwnerId="owner-1" onSubmit={onSubmit} />
    )

    await act(async () => {
      capturedOnChange?.({ target: { value: 'user-new' } })
    })

    expect(capturedSubmitDisabled).toBe(false)

    await act(async () => {
      capturedPopupSubmit?.()
    })

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('user-new', ''))
  })

  it('shows inline "already the project owner" message and keeps Confirm disabled when selecting the current owner', async () => {
    mockGetUserById.mockResolvedValue({ id: 'owner-1', name: 'Owner', email: 'owner@example.com' })
    const onSubmit = vi.fn()

    render(
      <ChangeOwnershipModal visible onHide={vi.fn()} currentOwnerId="owner-1" onSubmit={onSubmit} />
    )

    await act(async () => {
      capturedOnChange?.({ target: { value: 'owner-1' } })
    })

    expect(capturedMultiSelectError).toBe('This user is already the project owner')
    expect(capturedSubmitDisabled).toBe(true)
  })

  it('keeps the selected user and search state when onSubmit rejects', async () => {
    mockGetUserById.mockResolvedValue({ id: 'owner-1', name: 'Owner', email: 'owner@example.com' })
    const onSubmit = vi.fn().mockRejectedValue(new Error('Transfer failed'))

    render(
      <ChangeOwnershipModal visible onHide={vi.fn()} currentOwnerId="owner-1" onSubmit={onSubmit} />
    )

    await act(async () => {
      capturedOnChange?.({ target: { value: 'user-new' } })
    })

    await act(async () => {
      await expect(capturedPopupSubmit?.()).rejects.toThrow('Transfer failed')
    })

    expect(onSubmit).toHaveBeenCalledWith('user-new', '')
    // submitDisabled stays false because selectedUserId was not cleared by a reset.
    expect(capturedSubmitDisabled).toBe(false)
  })

  it('wires MultiSelect onFilter to userStore.searchUsers via the debounce window', async () => {
    mockGetUserById.mockResolvedValue({ id: 'owner-1', name: 'Owner', email: 'owner@example.com' })
    vi.useFakeTimers()

    render(
      <ChangeOwnershipModal visible onHide={vi.fn()} currentOwnerId="owner-1" onSubmit={vi.fn()} />
    )

    await act(async () => {
      capturedOnFilter?.('abc')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(mockSearchUsers).toHaveBeenCalledWith('abc', 10)
  })
})
