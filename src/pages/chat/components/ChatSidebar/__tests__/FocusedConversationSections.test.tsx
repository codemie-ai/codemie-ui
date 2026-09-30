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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem } from '@/types/entity/conversation'

import FocusedConversationSections from '../ChatSidebarLists/FocusedConversationSections'

import type { ReactNode } from 'react'

vi.mock('../ChatSidebarLists/ChatSidebarAccordion', () => ({
  default: ({
    children,
    isCollapsible = true,
    title,
  }: {
    children: ReactNode
    isCollapsible?: boolean
    title: string
  }) => (
    <section aria-label={title} data-collapsible={isCollapsible}>
      {children}
    </section>
  ),
}))

vi.mock('../ChatList/ChatList', () => ({
  default: ({ chats }: { chats: ChatListItem[] }) => (
    <ul>
      {chats.map((chat) => (
        <li key={chat.id}>chat:{chat.id}</li>
      ))}
    </ul>
  ),
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

afterEach(cleanup)

describe('FocusedConversationSections', () => {
  it('passes every pinned chat to the list, in order, without batching', () => {
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
      'chat:chat-10chat:chat-8chat:chat-6chat:chat-4chat:chat-2chat:chat-1'
    )
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
