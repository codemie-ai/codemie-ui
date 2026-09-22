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
    <li data-chat-id={chat.id}>
      <span>{chat.name}</span>
      {chat.pinned && <span>PINNED</span>}
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

  it('renders all chats in the order they are provided', () => {
    const { container } = render(<ChatList chatActions={mockChatActions} chats={mockChats} />)

    const listItems = container.querySelectorAll('[data-chat-id]')
    expect(listItems).toHaveLength(3)
    expect(listItems[0]).toHaveAttribute('data-chat-id', 'chat1')
    expect(listItems[1]).toHaveAttribute('data-chat-id', 'chat2')
    expect(listItems[2]).toHaveAttribute('data-chat-id', 'chat3')
  })

  it('renders all chat names correctly', () => {
    const { container } = render(<ChatList chatActions={mockChatActions} chats={mockChats} />)

    mockChats.forEach((chat) => {
      expect(container.querySelector(`[data-chat-id="${chat.id}"]`)).toHaveTextContent(chat.name!)
    })
  })

  it('correctly handles refs', () => {
    const ref = React.createRef<HTMLUListElement>()

    render(<ChatList ref={ref} chatActions={mockChatActions} chats={mockChats} />)

    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('UL')
  })

  it('re-renders correctly when chats list changes', () => {
    const { container, rerender } = render(
      <ChatList chatActions={mockChatActions} chats={[mockChats[0]]} />
    )

    expect(container.querySelectorAll('[data-chat-id]')).toHaveLength(1)

    rerender(<ChatList chatActions={mockChatActions} chats={mockChats} />)

    expect(container.querySelectorAll('[data-chat-id]')).toHaveLength(3)
  })
})
