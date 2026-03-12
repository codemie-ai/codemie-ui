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
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'

import ChatList from '../ChatList/ChatList'

vi.hoisted(() => vi.resetModules())

vi.mock('../ChatList/ChatListItem', () => ({
  default: ({ chat }: { chat: ChatListItemType }) => (
    <li data-testid={`chat-item-${chat.id}`}>
      <span data-testid={`chat-name-${chat.id}`}>{chat.name}</span>
      {chat.pinned && <span data-testid={`pinned-${chat.id}`}>PINNED</span>}
    </li>
  ),
}))

const mockChats = [
  {
    id: 'chat1',
    name: 'Regular Chat',
    pinned: false,
    isGroup: false,
    date: new Date().toISOString(),
  },
  {
    id: 'chat2',
    name: 'Pinned Chat',
    pinned: true,
    isGroup: false,
    date: new Date().toISOString(),
  },
  {
    id: 'chat3',
    name: 'Another Regular Chat',
    pinned: false,
    isGroup: true,
    date: new Date().toISOString(),
  },
  {
    id: 'chat4',
    name: 'Another Pinned Chat',
    pinned: true,
    isGroup: true,
    date: new Date().toISOString(),
  },
] as ChatListItemType[]

const mockChatActions = {
  moveChat: vi.fn(),
  deleteChat: vi.fn(),
}

describe('ChatList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty list when no chats are provided', () => {
    render(<ChatList chatActions={mockChatActions} chats={[]} />)
    const listElement = screen.getByRole('list')
    expect(listElement).toBeInTheDocument()
    expect(listElement.children.length).toBe(0)
  })

  it('renders all chats correctly', () => {
    render(<ChatList chatActions={mockChatActions} chats={mockChats} />)

    mockChats.forEach((chat) => {
      expect(screen.getByTestId(`chat-item-${chat.id}`)).toBeInTheDocument()
      expect(screen.getByTestId(`chat-name-${chat.id}`)).toHaveTextContent(chat.name!)
    })
  })

  it('renders pinned chats first', () => {
    render(<ChatList chatActions={mockChatActions} chats={mockChats} />)

    const listItems = screen.getAllByRole('listitem')

    // The first two items should be the pinned chats
    expect(listItems[0]).toHaveAttribute('data-testid', 'chat-item-chat2')
    expect(listItems[1]).toHaveAttribute('data-testid', 'chat-item-chat4')

    // The next items should be the unpinned chats
    expect(listItems[2]).toHaveAttribute('data-testid', 'chat-item-chat1')
    expect(listItems[3]).toHaveAttribute('data-testid', 'chat-item-chat3')
  })

  it('preserves the order of chats within their pinned/unpinned groups', () => {
    // Create chats with specific dates to test ordering
    const orderedChats = [
      {
        id: 'chat1',
        name: 'Oldest Unpinned',
        pinned: false,
        date: new Date(2021, 0, 1).toISOString(),
      },
      {
        id: 'chat2',
        name: 'Newest Unpinned',
        pinned: false,
        date: new Date(2021, 0, 2).toISOString(),
      },
      {
        id: 'chat3',
        name: 'Oldest Pinned',
        pinned: true,
        date: new Date(2021, 0, 3).toISOString(),
      },
      {
        id: 'chat4',
        name: 'Newest Pinned',
        pinned: true,
        date: new Date(2021, 0, 4).toISOString(),
      },
    ] as ChatListItemType[]

    render(<ChatList chatActions={mockChatActions} chats={orderedChats} />)

    const listItems = screen.getAllByRole('listitem')

    // Pinned chats should be first, in their original order
    expect(listItems[0]).toHaveAttribute('data-testid', 'chat-item-chat3')
    expect(listItems[1]).toHaveAttribute('data-testid', 'chat-item-chat4')

    // Unpinned chats should follow, in their original order
    expect(listItems[2]).toHaveAttribute('data-testid', 'chat-item-chat1')
    expect(listItems[3]).toHaveAttribute('data-testid', 'chat-item-chat2')
  })

  it('correctly handles refs', () => {
    // Create a ref to pass to the component
    const ref = React.createRef<HTMLUListElement>()

    render(<ChatList ref={ref} chatActions={mockChatActions} chats={mockChats} />)

    // Check if the ref was set correctly
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('UL')
  })

  it('handles mixed addition of pinned and unpinned chats', () => {
    // Start with some chats
    const { rerender } = render(
      <ChatList chatActions={mockChatActions} chats={[mockChats[0], mockChats[2]]} />
    )

    // Check initial rendering
    expect(screen.getAllByRole('listitem').length).toBe(2)
    expect(screen.queryByTestId('chat-item-chat1')).toBeInTheDocument()
    expect(screen.queryByTestId('chat-item-chat3')).toBeInTheDocument()

    // Add more chats including pinned ones
    rerender(<ChatList chatActions={mockChatActions} chats={mockChats} />)

    // Check updated rendering with pinned chats first
    const updatedListItems = screen.getAllByRole('listitem')
    expect(updatedListItems.length).toBe(4)
    expect(updatedListItems[0]).toHaveAttribute('data-testid', 'chat-item-chat2')
    expect(updatedListItems[1]).toHaveAttribute('data-testid', 'chat-item-chat4')
  })
})
