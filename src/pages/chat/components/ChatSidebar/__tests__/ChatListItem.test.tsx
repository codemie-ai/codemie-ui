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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockRouter } from '@/hooks/__mocks__/useVueRouter'
import { chatsStore } from '@/store/chats'
import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'

import ChatListItem from '../ChatList/ChatListItem'

vi.hoisted(() => vi.resetModules())

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => mockRouter }))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    openChat: { id: 'chat1' },
    renameChat: vi.fn().mockResolvedValue(undefined),
    pinChat: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
}))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <div data-testid="archive-icon">ArchiveIcon</div>,
}))

vi.mock('@/assets/icons/pin.svg?react', () => ({
  default: () => <div data-testid="pin-icon">PinIcon</div>,
}))

vi.mock('@/assets/icons/pinned.svg?react', () => ({
  default: () => <div data-testid="pinned-icon">PinnedIcon</div>,
}))

vi.mock('@/assets/icons/edit.svg?react', () => ({
  default: () => <div data-testid="edit-icon">EditIcon</div>,
}))

vi.mock('@/assets/icons/shared-yes.svg?react', () => ({
  default: () => <div data-testid="people-icon">PeopleIcon</div>,
}))

vi.mock('@/assets/icons/folder-move.svg?react', () => ({
  default: () => <div data-testid="folder-icon">FolderIcon</div>,
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: { items: any[] }) => (
    <div data-testid="navigation-more">
      {items.map((item) => (
        <button
          key={item.title}
          data-testid={`menu-item-${item.title.toLowerCase().replace(' ', '-')}`}
          onClick={item.onClick}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}))

const mockChat = {
  id: 'chat1',
  name: 'Test Chat',
  pinned: false,
  isGroup: false,
  date: new Date().toISOString(),
} as ChatListItemType

const mockActions = {
  moveChat: vi.fn(),
  deleteChat: vi.fn(),
}

describe('ChatListItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders chat item correctly', () => {
    render(<ChatListItem chat={mockChat} actions={mockActions} />)

    expect(screen.getByText('Test Chat')).toBeInTheDocument()
    expect(screen.getByTestId('navigation-more')).toBeInTheDocument()
  })

  it('shows pinned icon for pinned chats', () => {
    render(<ChatListItem chat={{ ...mockChat, pinned: true }} actions={mockActions} />)

    expect(screen.getByText('Test Chat')).toBeInTheDocument()
    expect(screen.getByTestId('pinned-icon')).toBeInTheDocument()
  })

  it('shows people icon for group chats', () => {
    render(<ChatListItem chat={{ ...mockChat, isGroup: true }} actions={mockActions} />)

    expect(screen.getByText('Test Chat')).toBeInTheDocument()
    expect(screen.getByTestId('people-icon')).toBeInTheDocument()
  })

  it('truncates long chat names', () => {
    render(
      <ChatListItem
        actions={mockActions}
        chat={{ ...mockChat, name: 'This is a very long chat name'.repeat(5) }}
      />
    )

    const displayedName = screen.getByText(/This is a very long chat name/)
    expect(displayedName.textContent?.length).toBeLessThanOrEqual(53) // 50 + '...'
    expect(displayedName.textContent?.endsWith('...')).toBe(true)
  })

  it('opens chat when clicked', async () => {
    render(<ChatListItem chat={mockChat} actions={mockActions} />)

    const chatButton = screen.getAllByRole('button')[0]
    await userEvent.click(chatButton)

    expect(mockRouter.push).toHaveBeenCalled()
  })

  it('uses correct route name for avatar chats', async () => {
    render(<ChatListItem chat={{ ...mockChat, folder: 'avatar' }} actions={mockActions} />)

    const chatButton = screen.getByText('Test Chat')
    await userEvent.click(chatButton!)

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'avatar-chat',
      params: { id: mockChat.id },
    })
  })

  it('calls moveChat when "Move to folder" is clicked', async () => {
    render(<ChatListItem chat={mockChat} actions={mockActions} />)

    await userEvent.click(screen.getByTestId('menu-item-move-to folder'))

    expect(mockActions.moveChat).toHaveBeenCalledWith(mockChat)
  })

  it('calls deleteChat when "Delete" is clicked', async () => {
    render(<ChatListItem chat={mockChat} actions={mockActions} />)

    await userEvent.click(screen.getByTestId('menu-item-delete'))

    expect(mockActions.deleteChat).toHaveBeenCalledWith(mockChat)
  })

  it('calls pinChat when "Pin" is clicked', async () => {
    render(<ChatListItem chat={mockChat} actions={mockActions} />)

    await userEvent.click(screen.getByTestId('menu-item-pin'))

    expect(chatsStore.pinChat).toHaveBeenCalledWith('chat1')
  })

  it('calls pinChat when "Unpin" is clicked on a pinned chat', async () => {
    render(<ChatListItem chat={{ ...mockChat, pinned: true }} actions={mockActions} />)

    await userEvent.click(screen.getByTestId('menu-item-unpin'))

    expect(chatsStore.pinChat).toHaveBeenCalledWith('chat1')
  })

  it('enters edit mode when "Rename" is clicked', async () => {
    render(<ChatListItem chat={mockChat} actions={mockActions} />)

    await userEvent.click(screen.getByTestId('menu-item-rename'))

    const inputElement = screen.getByRole('textbox')
    expect(inputElement).toHaveValue('Test Chat')
    expect(inputElement).toHaveAttribute('type', 'text')
  })

  it('calls renameChat when edit is completed with enter key', async () => {
    render(<ChatListItem chat={mockChat} actions={mockActions} />)

    // Enter edit mode
    await userEvent.click(screen.getByTestId('menu-item-rename'))

    // Remove original name, enter new and press Enter
    const inputElement = screen.getByRole('textbox')
    await userEvent.type(inputElement, 'Updated Chat Name', {
      initialSelectionStart: 0,
      initialSelectionEnd: 10,
    })
    await userEvent.keyboard('{Enter}')

    // Verify rename was called
    expect(chatsStore.renameChat).toHaveBeenCalledWith('chat1', 'Updated Chat Name')
  })

  it('calls renameChat when edit is completed with blur event', async () => {
    render(<ChatListItem chat={mockChat} actions={mockActions} />)

    // Enter edit mode
    await userEvent.click(screen.getByTestId('menu-item-rename'))

    // Remove original name, enter new and unfocus
    const inputElement = screen.getByDisplayValue('Test Chat')
    await userEvent.type(inputElement, 'Updated Chat Name', {
      initialSelectionStart: 0,
      initialSelectionEnd: 10,
    })
    await userEvent.click(document.body)

    // Verify rename was called
    expect(chatsStore.renameChat).toHaveBeenCalledWith('chat1', 'Updated Chat Name')
  })

  it('shows default name when chat has no name', () => {
    const noNameChat = { ...mockChat, name: null }
    render(<ChatListItem chat={noNameChat} actions={mockActions} />)

    expect(screen.getByText('New chat')).toBeInTheDocument()
  })
})
