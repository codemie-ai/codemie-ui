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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import toaster from '@/utils/toaster'

import ShareAssistantPopup from '../ShareAssistantPopup'

const mockStore = vi.hoisted(() => ({
  getSharedWith: vi.fn().mockResolvedValue([]),
  getSharableUsers: vi.fn().mockResolvedValue([]),
  shareWith: vi.fn().mockResolvedValue(undefined),
  removeShare: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/store/assistants', () => ({ assistantsStore: mockStore }))

const mockAssistant = {
  id: 'asst-1',
  name: 'Test Assistant',
  created_by: { id: 'owner-1', name: 'Owner', email: 'owner@test.com' },
} as any

const ownerUser = { id: 'owner-1', name: 'Owner', email: 'owner@test.com' }
const otherUser = { id: 'user-2', name: 'Alice', email: 'alice@test.com' }
const searchUserB = { id: 'search-b', name: 'Carol', email: 'carol@test.com' }
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'owner-1' } } }))
vi.mock('@/utils/toaster', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

describe('ShareAssistantPopup', () => {
  const onHide = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.getSharedWith.mockResolvedValue([])
    mockStore.getSharableUsers.mockResolvedValue([])
    mockStore.shareWith.mockResolvedValue(undefined)
    mockStore.removeShare.mockResolvedValue(undefined)
  })

  it('renders the header', async () => {
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    expect(await screen.findByText('Share assistant')).toBeInTheDocument()
    expect(screen.getByText('Can chat and view setup; cannot edit')).toBeInTheDocument()
  })

  it('gives each Remove button an accessible name including the user name', async () => {
    mockStore.getSharedWith.mockResolvedValue([otherUser])
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    await waitFor(() => expect(screen.getByText(otherUser.name)).toBeInTheDocument())

    expect(screen.getByRole('button', { name: `Remove ${otherUser.name}` })).toBeInTheDocument()
  })

  it('Save button is disabled when nothing is pending', async () => {
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeDisabled()
  })

  it('Cancel calls onHide without API calls', async () => {
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
    expect(onHide).toHaveBeenCalled()
    expect(mockStore.shareWith).not.toHaveBeenCalled()
    expect(mockStore.removeShare).not.toHaveBeenCalled()
  })

  it('excludes the current user (owner) from People With Access list', async () => {
    mockStore.getSharedWith.mockResolvedValue([ownerUser, otherUser])
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    await waitFor(() => {
      expect(screen.queryByText(ownerUser.name)).not.toBeInTheDocument()
      expect(screen.getByText(otherUser.name)).toBeInTheDocument()
    })
  })

  it('excludes already-shared users from search results', async () => {
    mockStore.getSharedWith.mockResolvedValue([otherUser])
    const alreadySharedInSearch = { id: otherUser.id, name: otherUser.name, email: otherUser.email }
    const eligible = { id: 'search-elliot', name: 'Elliot', email: 'elliot@test.com' }
    mockStore.getSharableUsers.mockResolvedValue([alreadySharedInSearch, eligible])

    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    await waitFor(() => expect(screen.getByText(otherUser.name)).toBeInTheDocument())

    // The filter input only mounts once the MultiSelect panel is open
    fireEvent.click(screen.getByRole('combobox'))
    const filterInput = await screen.findByPlaceholderText('Search')
    fireEvent.change(filterInput, { target: { value: 'li' } })

    // Wait for the results to render, otherwise the assertion below passes before any filtering
    expect(await screen.findByText(eligible.name)).toBeInTheDocument()
    expect(screen.queryAllByText(otherUser.name)).toHaveLength(1) // only in "People With Access"
  })

  it('renders fresh search results in the dropdown after typing a query', async () => {
    mockStore.getSharedWith.mockResolvedValue([])
    mockStore.getSharableUsers.mockResolvedValue([searchUserB])

    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    fireEvent.click(screen.getByRole('combobox'))
    const filterInput = await screen.findByPlaceholderText('Search')
    fireEvent.change(filterInput, { target: { value: 'car' } })

    await waitFor(() => expect(mockStore.getSharableUsers).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(searchUserB.name)).toBeInTheDocument())
  })

  it('shows users the backend matched by email even when the name does not match the query', async () => {
    mockStore.getSharableUsers.mockResolvedValue([searchUserB])

    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    fireEvent.click(screen.getByRole('combobox'))
    const filterInput = await screen.findByPlaceholderText('Search')
    fireEvent.change(filterInput, { target: { value: 'carol@test' } })

    await waitFor(() =>
      expect(mockStore.getSharableUsers).toHaveBeenCalledWith('asst-1', 'carol@test')
    )
    expect(await screen.findByText(searchUserB.name)).toBeInTheDocument()
  })

  it('does not search below the 2-character floor', async () => {
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    fireEvent.click(screen.getByRole('combobox'))
    const filterInput = await screen.findByPlaceholderText('Search')
    fireEvent.change(filterInput, { target: { value: 'a' } })

    await new Promise((r) => {
      setTimeout(r, 400)
    })
    expect(mockStore.getSharableUsers).not.toHaveBeenCalled()
    expect(screen.getByText('Type to search users')).toBeInTheDocument()
  })

  it('still searches at the 2-character floor', async () => {
    mockStore.getSharableUsers.mockResolvedValue([searchUserB])
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    fireEvent.click(screen.getByRole('combobox'))
    const filterInput = await screen.findByPlaceholderText('Search')
    fireEvent.change(filterInput, { target: { value: 'ab' } })

    await waitFor(() => expect(mockStore.getSharableUsers).toHaveBeenCalled())
  })

  it('clears a pending search when deleted back below the floor before the debounce fires', async () => {
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    fireEvent.click(screen.getByRole('combobox'))
    const filterInput = await screen.findByPlaceholderText('Search')
    fireEvent.change(filterInput, { target: { value: 'ab' } })
    fireEvent.change(filterInput, { target: { value: 'a' } })

    await new Promise((r) => {
      setTimeout(r, 400)
    })
    expect(mockStore.getSharableUsers).not.toHaveBeenCalled()
  })

  it('drops an in-flight search result when the query is cleared below the floor', async () => {
    let resolveSearch: (users: unknown[]) => void = () => {}
    mockStore.getSharableUsers.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve
      })
    )
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    fireEvent.click(screen.getByRole('combobox'))
    const filterInput = await screen.findByPlaceholderText('Search')
    fireEvent.change(filterInput, { target: { value: 'ab' } })
    await waitFor(() => expect(mockStore.getSharableUsers).toHaveBeenCalled())

    fireEvent.change(filterInput, { target: { value: '' } })
    resolveSearch([searchUserB])
    await new Promise((r) => {
      setTimeout(r, 0)
    })

    expect(screen.queryByText(searchUserB.name)).not.toBeInTheDocument()
  })

  // Remove now fires the API call immediately, not via Save
  it('calls removeShare immediately when Remove is clicked, without waiting for Save', async () => {
    mockStore.getSharedWith.mockResolvedValue([otherUser])
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    await waitFor(() => expect(screen.getByText(otherUser.name)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Remove/ }))

    await waitFor(() => {
      expect(mockStore.removeShare).toHaveBeenCalledWith(mockAssistant.id, [otherUser.id])
    })
    expect(onHide).not.toHaveBeenCalled()
    expect(screen.queryByText(otherUser.name)).not.toBeInTheDocument()
  })

  it('restores the user in the list and shows an error toast when removeShare fails', async () => {
    mockStore.getSharedWith.mockResolvedValue([otherUser])
    mockStore.removeShare.mockRejectedValue(new Error('network error'))
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    await waitFor(() => expect(screen.getByText(otherUser.name)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Remove/ }))

    await waitFor(() => expect(mockStore.removeShare).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(otherUser.name)).toBeInTheDocument())
    expect(toaster.error).toHaveBeenCalledWith('Failed to remove user. Please try again.')
  })

  it('ignores Cancel while a remove is in flight, and allows it once settled', async () => {
    mockStore.getSharedWith.mockResolvedValue([otherUser])
    let resolveRemove: () => void = () => {}
    mockStore.removeShare.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRemove = resolve
      })
    )
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    await waitFor(() => expect(screen.getByText(otherUser.name)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Remove/ }))
    await waitFor(() => expect(mockStore.removeShare).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
    expect(onHide).not.toHaveBeenCalled()

    resolveRemove()
    await waitFor(() => expect(screen.getByRole('button', { name: /Cancel/ })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
    expect(onHide).toHaveBeenCalled()
  })

  it('shows an error message with a Retry button when getSharedWith rejects', async () => {
    mockStore.getSharedWith.mockRejectedValueOnce(new Error('network error'))
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    expect(
      await screen.findByText('Failed to load the people with access. Please try again.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByText('People With Access')).not.toBeInTheDocument()
    expect(screen.queryByText(otherUser.name)).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('does not fetch shared-with users when the viewer is not the owner', async () => {
    const nonOwnerAssistant = {
      ...mockAssistant,
      created_by: { id: 'someone-else', name: 'Someone Else', email: 'someone@test.com' },
    }
    render(<ShareAssistantPopup visible assistant={nonOwnerAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')
    await new Promise((r) => {
      setTimeout(r, 0)
    })
    expect(mockStore.getSharedWith).not.toHaveBeenCalled()
  })

  it('reloads the list when Retry is clicked after a failed load', async () => {
    mockStore.getSharedWith.mockRejectedValueOnce(new Error('network error'))
    mockStore.getSharedWith.mockResolvedValueOnce([otherUser])
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    const retryButton = await screen.findByRole('button', { name: 'Retry' })
    fireEvent.click(retryButton)

    await waitFor(() => expect(mockStore.getSharedWith).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(otherUser.name)).toBeInTheDocument()
    expect(
      screen.queryByText('Failed to load the people with access. Please try again.')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  const selectSearchUserB = async () => {
    mockStore.getSharableUsers.mockResolvedValue([searchUserB])
    fireEvent.click(screen.getByRole('combobox'))
    const filterInput = await screen.findByPlaceholderText('Search')
    fireEvent.change(filterInput, { target: { value: 'car' } })
    await waitFor(() => expect(mockStore.getSharableUsers).toHaveBeenCalled())
    const option = await screen.findByText(searchUserB.name)
    fireEvent.click(option)
  }

  it('shows the backend rejection message inline and as a single toast when handleShare fails, and keeps the selection', async () => {
    mockStore.shareWith.mockRejectedValue({
      parsedError: { message: 'Assistant uses a personal integration...' },
    })
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    await selectSearchUserB()

    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    expect(await screen.findByText('Assistant uses a personal integration...')).toBeInTheDocument()
    expect(onHide).not.toHaveBeenCalled()
    expect(toaster.error).toHaveBeenCalledTimes(1)
    expect(toaster.error).toHaveBeenCalledWith('Assistant uses a personal integration...')
    expect(screen.getAllByText(searchUserB.name).length).toBeGreaterThan(0)
  })

  it('falls back to the generic message when handleShare fails without a parsedError', async () => {
    mockStore.shareWith.mockRejectedValue(new Error('network error'))
    render(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    await selectSearchUserB()

    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))

    expect(
      await screen.findByText('Failed to add some users. Please try again.')
    ).toBeInTheDocument()
    expect(onHide).not.toHaveBeenCalled()
  })

  it('clears a prior share error when the popup is reopened', async () => {
    mockStore.shareWith.mockRejectedValue({
      parsedError: { message: 'Assistant uses a personal integration...' },
    })
    const { rerender } = render(
      <ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />
    )
    await screen.findByText('Share assistant')

    await selectSearchUserB()
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))
    expect(await screen.findByText('Assistant uses a personal integration...')).toBeInTheDocument()

    rerender(<ShareAssistantPopup visible={false} assistant={mockAssistant} onHide={onHide} />)
    rerender(<ShareAssistantPopup visible assistant={mockAssistant} onHide={onHide} />)
    await screen.findByText('Share assistant')

    expect(screen.queryByText('Assistant uses a personal integration...')).not.toBeInTheDocument()
  })
})
