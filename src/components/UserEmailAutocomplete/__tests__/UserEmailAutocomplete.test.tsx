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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { userStore } from '@/store/user'

import UserEmailAutocomplete from '../UserEmailAutocomplete'

vi.mock('@/store/user', () => ({
  userStore: {
    searchUsers: vi.fn(),
  },
}))

const searchUsersMock = vi.mocked(userStore.searchUsers)

const mockUsers = [
  { id: 'u1', name: 'Alice Smith', username: 'alice', email: 'alice@example.com' },
  { id: 'u2', name: 'Bob Jones', username: 'bob', email: 'bob@example.com' },
]

const renderComponent = (props: Partial<React.ComponentProps<typeof UserEmailAutocomplete>> = {}) =>
  render(
    <UserEmailAutocomplete
      id="notification_owner_email"
      value=""
      onChange={vi.fn()}
      label="Budget owner"
      {...props}
    />
  )

describe('UserEmailAutocomplete', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.useRealTimers()
    user = userEvent.setup()
    searchUsersMock.mockReset()
    searchUsersMock.mockResolvedValue(mockUsers as never)
  })

  it('renders the label', () => {
    renderComponent()
    expect(screen.getByText('Budget owner')).toBeInTheDocument()
  })

  it('displays an error message when provided', () => {
    renderComponent({ error: 'Enter a valid email address' })
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('shows an existing email value as-is (free-form entry is preserved)', () => {
    renderComponent({ value: 'finops@example.com' })
    expect(screen.getByRole('combobox')).toHaveValue('finops@example.com')
  })

  it('does not search below the minimum query length', async () => {
    renderComponent()
    await user.type(screen.getByRole('combobox'), 'a')

    await waitFor(() => {
      expect(searchUsersMock).not.toHaveBeenCalled()
    })
  })

  it('searches the user directory once the query is long enough', async () => {
    renderComponent()
    await user.type(screen.getByRole('combobox'), 'ali')

    await waitFor(
      () => {
        expect(searchUsersMock).toHaveBeenCalledWith('ali', 10)
      },
      { timeout: 2000 }
    )
  })

  it('offers matching users as suggestions keyed by email', async () => {
    renderComponent()
    await user.type(screen.getByRole('combobox'), 'ali')

    await waitFor(
      () => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
    // The name is shown alongside the email in the dropdown row.
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('stays usable when the directory search fails', async () => {
    searchUsersMock.mockRejectedValue(new Error('network down'))
    renderComponent()

    await user.type(screen.getByRole('combobox'), 'ali')

    await waitFor(
      () => {
        expect(searchUsersMock).toHaveBeenCalled()
      },
      { timeout: 2000 }
    )
    // Field remains editable so a group alias can still be typed.
    expect(screen.getByRole('combobox')).toBeEnabled()
  })
})
