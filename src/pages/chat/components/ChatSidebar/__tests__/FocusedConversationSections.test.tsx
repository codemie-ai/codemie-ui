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

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem } from '@/types/entity/conversation'

import FocusedConversationSections from '../ChatSidebarLists/FocusedConversationSections'

import type { ReactNode } from 'react'

const infiniteScrollMock = vi.hoisted(() => ({
  options: null as null | {
    enabled: boolean
    onLoadMore: () => void
  },
}))

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: vi.fn((options) => {
    infiniteScrollMock.options = options
    return { current: null }
  }),
}))

vi.mock('../ChatSidebarLists/ChatSidebarAccordion', () => ({
  default: ({
    children,
    isCollapsible = true,
    onScrollIntent,
    title,
  }: {
    children: ReactNode
    isCollapsible?: boolean
    onScrollIntent?: () => void
    title: string
  }) => (
    <section aria-label={title} data-collapsible={isCollapsible}>
      <button type="button" onClick={onScrollIntent}>
        Scroll {title}
      </button>
      {children}
    </section>
  ),
}))

vi.mock('../ChatList/ChatListItem', () => ({
  default: ({ chat }: { chat: ChatListItem }) => <li>chat:{chat.id}</li>,
}))

vi.mock('../ChatList/ChatList', () => ({
  default: () => null,
}))

const createChat = (id: string, hour: number): ChatListItem => ({
  id,
  name: id,
  folder: null,
  pinned: true,
  date: `2026-07-29T${String(hour).padStart(2, '0')}:00:00.000Z`,
  assistantIds: ['assistant-a'],
  initialAssistantId: 'assistant-a',
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
  assistantNames: ['Assistant A'],
})

afterEach(() => {
  cleanup()
  infiniteScrollMock.options = null
})

describe('FocusedConversationSections', () => {
  it('renders individual pinned chat rows and loads them in batches', () => {
    const pinnedChats = [
      createChat('chat-10', 10),
      createChat('chat-8', 8),
      createChat('chat-6', 6),
      createChat('chat-4', 4),
      createChat('chat-2', 2),
      createChat('chat-1', 1),
    ]

    render(
      <FocusedConversationSections
        pinnedChats={pinnedChats}
        recentChats={[]}
        chatActions={{ moveChat: vi.fn(), deleteChat: vi.fn() }}
        density={ChatListDensity.DETAILED}
        isPinnedExpanded
        onTogglePinned={vi.fn()}
        registerChatElement={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Pinned')).toHaveTextContent(
      'chat:chat-10chat:chat-8chat:chat-6chat:chat-4chat:chat-2'
    )
    expect(screen.queryByText('chat:chat-1')).not.toBeInTheDocument()
    expect(infiniteScrollMock.options?.enabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Scroll Pinned' }))

    expect(infiniteScrollMock.options?.enabled).toBe(true)

    act(() => {
      infiniteScrollMock.options?.onLoadMore()
    })

    expect(screen.getByText('chat:chat-1')).toBeInTheDocument()
  })

  it('renders Recent as a non-collapsible section', () => {
    render(
      <FocusedConversationSections
        pinnedChats={[]}
        recentChats={[createChat('recent-chat', 10)]}
        chatActions={{ moveChat: vi.fn(), deleteChat: vi.fn() }}
        density={ChatListDensity.DETAILED}
        isPinnedExpanded
        onTogglePinned={vi.fn()}
        registerChatElement={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Recent')).toHaveAttribute('data-collapsible', 'false')
  })
})
