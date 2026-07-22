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

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouter } from '@/hooks/__mocks__/useVueRouter'
import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'

import StartNewChatModal from '../StartNewChatModal'

vi.hoisted(() => vi.resetModules())

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => mockRouter }))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
  proxy: vi.fn((obj: unknown) => obj),
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    recentAssistants: [],
    pinnedAssistants: [],
    getRecentAssistants: vi.fn().mockResolvedValue(undefined),
    fetchPinnedAssistants: vi.fn().mockResolvedValue(undefined),
    updateRecentAssistants: vi.fn(),
    getAllAssistantsOptions: vi.fn().mockResolvedValue([]),
  },
  MAX_RECENT_ASSISTANTS: 3,
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    startNewChat: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/components/Popup/Popup', () => ({
  default: ({
    children,
    visible,
    header,
  }: {
    children: React.ReactNode
    visible: boolean
    header: string
    onHide: () => void
  }) =>
    visible ? (
      <div data-testid="popup">
        <div data-testid="popup-header">{header}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/Avatar/Avatar', () => ({
  default: ({ name }: { name?: string }) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('@/assets/icons/search.svg?react', () => ({
  default: () => <svg data-testid="search-icon" />,
}))

vi.mock('@/assets/icons/cross.svg?react', () => ({
  default: () => <svg data-testid="cross-icon" />,
}))

const mockOnHide = vi.fn()
const getDelayedEmptyAssistants = () =>
  new Promise<never[]>((resolve) => {
    setTimeout(resolve, 500, [])
  })

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('StartNewChatModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(assistantsStore).recentAssistants = []
    vi.mocked(assistantsStore).pinnedAssistants = []
    vi.mocked(assistantsStore.getAllAssistantsOptions).mockResolvedValue([])
    vi.mocked(chatsStore.startNewChat).mockResolvedValue(undefined)
  })

  it('renders nothing when not visible', () => {
    render(<StartNewChatModal isVisible={false} onHide={mockOnHide} />)

    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('renders the modal with correct header when visible', () => {
    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.getByTestId('popup')).toBeInTheDocument()
    expect(screen.getByTestId('popup-header')).toHaveTextContent('Start a new chat')
  })

  it('renders search input when visible', () => {
    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.getByPlaceholderText(/Search assistant/i)).toBeInTheDocument()
  })

  it('renders recent assistants section when assistants exist', () => {
    vi.mocked(assistantsStore).recentAssistants = [
      { id: 'a1', name: 'Assistant One', icon_url: null } as any,
      { id: 'a2', name: 'Assistant Two', icon_url: null } as any,
    ]

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.getByText('Recent Assistants')).toBeInTheDocument()
    expect(screen.getAllByText('Assistant One').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Assistant Two').length).toBeGreaterThan(0)
  })

  it('does not render recent assistants section when list is empty', () => {
    vi.mocked(assistantsStore).recentAssistants = []

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.queryByText('Recent Assistants')).not.toBeInTheDocument()
  })

  it('renders pinned assistants section when pinned assistants exist', () => {
    vi.mocked(assistantsStore).pinnedAssistants = [
      { id: 'p1', name: 'Pinned Bot', icon_url: null } as any,
    ]

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.getByText('Pinned Assistants')).toBeInTheDocument()
    expect(screen.getAllByText('Pinned Bot').length).toBeGreaterThan(0)
  })

  it('does not render pinned assistants section when list is empty', () => {
    vi.mocked(assistantsStore).pinnedAssistants = []

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.queryByText('Pinned Assistants')).not.toBeInTheDocument()
  })

  it('starts an assistant chat when an assistant is clicked', async () => {
    vi.mocked(assistantsStore).recentAssistants = [
      { id: 'a1', name: 'Test Bot', icon_url: null } as any,
    ]

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    const button = screen.getByRole('button', { name: /Test Bot/ })
    await userEvent.click(button)

    expect(chatsStore.startNewChat).toHaveBeenCalledWith('a1', 'Test Bot', false)
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'new-chat' })
    expect(mockOnHide).toHaveBeenCalled()
  })

  it('fetches recent and pinned assistants when modal becomes visible', () => {
    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(assistantsStore.getRecentAssistants).toHaveBeenCalled()
    expect(assistantsStore.fetchPinnedAssistants).toHaveBeenCalled()
  })

  it('shows clear button when query is non-empty', async () => {
    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    const input = screen.getByPlaceholderText(/Search assistant/i)
    await userEvent.type(input, 'test')

    expect(screen.getByTestId('cross-icon')).toBeInTheDocument()
  })

  it('does not show clear button when query is empty', () => {
    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.queryByTestId('cross-icon')).not.toBeInTheDocument()
  })

  it('clears query when clear button is clicked', async () => {
    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    const input = screen.getByPlaceholderText(/Search assistant/i)
    await userEvent.type(input, 'test')

    const clearButton = screen.getByTestId('cross-icon').closest('button')!
    await userEvent.click(clearButton)

    expect(input).toHaveValue('')
  })

  it('shows skeleton rows while search is in progress', async () => {
    vi.mocked(assistantsStore).getAllAssistantsOptions = vi.fn(getDelayedEmptyAssistants)

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    const input = screen.getByPlaceholderText(/Search assistant/i)
    await userEvent.type(input, 'bot')

    await waitFor(() => {
      const skeletonItems = document.querySelectorAll('.animate-pulse')
      expect(skeletonItems.length).toBe(3)
    })
  })

  it('shows "No results" when search returns empty list', async () => {
    vi.mocked(assistantsStore).getAllAssistantsOptions = vi.fn().mockResolvedValue([])

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    const input = screen.getByPlaceholderText(/Search assistant/i)
    await userEvent.type(input, 'xyz')

    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument()
    })
  })

  it('stops showing the search skeleton when search fails', async () => {
    const error = new Error('Search failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(assistantsStore.getAllAssistantsOptions).mockRejectedValueOnce(error)

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    const input = screen.getByPlaceholderText(/Search assistant/i)
    await userEvent.type(input, 'broken search')

    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument()
    })
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(0)
    expect(consoleError).toHaveBeenCalledWith(
      '[StartNewChatModal] failed to search assistants:',
      error
    )
  })

  it('keeps the modal open when starting a chat fails', async () => {
    const error = new Error('Start chat failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(assistantsStore).recentAssistants = [
      { id: 'a1', name: 'Test Bot', icon_url: null } as any,
    ]
    vi.mocked(chatsStore.startNewChat).mockRejectedValueOnce(error)

    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    await userEvent.click(screen.getByRole('button', { name: /Test Bot/ }))

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('[StartNewChatModal] failed to start chat:', error)
    })
    expect(screen.getByTestId('popup')).toBeInTheDocument()
    expect(assistantsStore.updateRecentAssistants).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(mockOnHide).not.toHaveBeenCalled()
  })

  it('does not render "New blank chat" button', () => {
    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.queryByText('New blank chat')).not.toBeInTheDocument()
  })

  it('does not render "Browse all assistants" link', () => {
    render(<StartNewChatModal isVisible={true} onHide={mockOnHide} />)

    expect(screen.queryByText('Browse all assistants')).not.toBeInTheDocument()
  })
})
