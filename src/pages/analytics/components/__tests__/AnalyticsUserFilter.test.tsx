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

import AnalyticsUserFilter from '../AnalyticsUserFilter'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: {
      userId: 'user-123',
      username: 'testuser',
      name: 'Test User',
      isAdmin: false,
      isMaintainer: false,
    },
  },
}))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

describe('AnalyticsUserFilter', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
    // Reset to admin user for existing tests (checkbox should be visible)
    mockUserStore.user = {
      userId: 'user-123',
      username: 'testuser',
      name: 'Test User',
      isAdmin: true,
      isMaintainer: false,
    }
  })

  it('should preserve Me checkbox when userOptions refresh without current user', async () => {
    const user = userEvent.setup()
    const initialOptions = [
      { label: 'Test User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    const { rerender } = render(
      <AnalyticsUserFilter
        value={[]}
        onChange={mockOnChange}
        userOptions={initialOptions}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    // Step 1: Enable Me checkbox
    const meCheckbox = screen.getByLabelText('Me')
    await user.click(meCheckbox)

    // Verify Me checkbox is checked and onChange was called with current user
    expect(meCheckbox).toBeChecked()
    expect(mockOnChange).toHaveBeenCalledWith(['user-123'])

    // Step 2: Simulate userOptions refresh without current user (project filter applied)
    const optionsWithoutCurrentUser = [{ label: 'Other User', value: 'user-456' }]

    rerender(
      <AnalyticsUserFilter
        value={['user-123']}
        onChange={mockOnChange}
        userOptions={optionsWithoutCurrentUser}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    // Once the current user has been identified, the Me checkbox stays
    // checked AND enabled even when the user is absent from the current
    // search results, so the user can still toggle it off.
    await waitFor(() => {
      expect(meCheckbox).toBeChecked()
      expect(meCheckbox).not.toBeDisabled()
    })
  })

  it('should add current user to selection when Me is checked', async () => {
    const user = userEvent.setup()
    const options = [
      { label: 'Test User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    render(
      <AnalyticsUserFilter
        value={['user-456']}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    const meCheckbox = screen.getByLabelText('Me')
    await user.click(meCheckbox)

    // Should add current user to existing selection
    expect(mockOnChange).toHaveBeenCalledWith(['user-456', 'user-123'])
  })

  it('should remove only current user when Me is unchecked', async () => {
    const user = userEvent.setup()
    const options = [
      { label: 'Test User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    render(
      <AnalyticsUserFilter
        value={['user-123', 'user-456']}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    const meCheckbox = screen.getByLabelText('Me')
    await user.click(meCheckbox)

    // Should remove only current user
    expect(mockOnChange).toHaveBeenCalledWith(['user-456'])
  })

  it('should keep Me checkbox enabled across userOptions refresh cycles once identified', async () => {
    const options = [
      { label: 'Test User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    const { rerender } = render(
      <AnalyticsUserFilter
        value={['user-123']}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    const meCheckbox = screen.getByLabelText('Me')
    expect(meCheckbox).toBeChecked()
    expect(meCheckbox).not.toBeDisabled()

    // Simulate project filter - current user not in project
    rerender(
      <AnalyticsUserFilter
        value={['user-123']}
        onChange={mockOnChange}
        userOptions={[{ label: 'Other User', value: 'user-456' }]}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    await waitFor(() => {
      expect(meCheckbox).toBeChecked()
      expect(meCheckbox).not.toBeDisabled()
    })

    // Simulate removing project filter - current user returns
    rerender(
      <AnalyticsUserFilter
        value={['user-123']}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    await waitFor(() => {
      expect(meCheckbox).toBeChecked()
      expect(meCheckbox).not.toBeDisabled()
    })
  })

  it('should not re-add current user when manually unchecked via dropdown', async () => {
    const user = userEvent.setup()
    const options = [
      { label: 'Test User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    const { rerender } = render(
      <AnalyticsUserFilter
        value={[]}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    // Step 1: Check Me checkbox
    const meCheckbox = screen.getByLabelText('Me')
    await user.click(meCheckbox)
    expect(mockOnChange).toHaveBeenCalledWith(['user-123'])

    // Step 2: User selects another user via dropdown
    rerender(
      <AnalyticsUserFilter
        value={['user-123', 'user-456']}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    mockOnChange.mockClear()

    // Step 3: User unchecks current user via dropdown
    rerender(
      <AnalyticsUserFilter
        value={['user-456']}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    // Bug: After unchecking, the component re-adds current user automatically
    // Expected: User should stay unchecked, Me checkbox should uncheck
    await waitFor(() => {
      expect(meCheckbox).not.toBeChecked()
    })

    // Should NOT re-add current user
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('should show Me checkbox when user is admin', () => {
    mockUserStore.user = {
      userId: 'user-123',
      username: 'adminuser',
      name: 'Admin User',
      isAdmin: true,
      isMaintainer: false,
    }

    const options = [
      { label: 'Admin User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    render(
      <AnalyticsUserFilter
        value={[]}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    const meCheckbox = screen.getByLabelText('Me')
    expect(meCheckbox).toBeInTheDocument()
  })

  it('should show Me checkbox when user is maintainer', () => {
    mockUserStore.user = {
      userId: 'user-123',
      username: 'maintaineruser',
      name: 'Maintainer User',
      isAdmin: false,
      isMaintainer: true,
    }

    const options = [
      { label: 'Maintainer User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    render(
      <AnalyticsUserFilter
        value={[]}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={true}
      />
    )

    const meCheckbox = screen.getByLabelText('Me')
    expect(meCheckbox).toBeInTheDocument()
  })

  it('should hide Me checkbox when user is neither admin nor maintainer', () => {
    mockUserStore.user = {
      userId: 'user-123',
      username: 'regularuser',
      name: 'Regular User',
      isAdmin: false,
      isMaintainer: false,
    }

    const options = [
      { label: 'Regular User', value: 'user-123' },
      { label: 'Other User', value: 'user-456' },
    ]

    render(
      <AnalyticsUserFilter
        value={[]}
        onChange={mockOnChange}
        userOptions={options}
        isLoadingOptions={false}
        showMeCheckbox={false}
      />
    )

    const meCheckbox = screen.queryByLabelText('Me')
    expect(meCheckbox).not.toBeInTheDocument()
  })
})
