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

import ChatListItem, { ChatListItemActions } from '../ChatListItem'

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: { renameChat: vi.fn(), pinChat: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({
  default: () => <span data-testid="nav-more-icon" />,
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({
    items,
    contextId,
  }: {
    items?: Array<{ title: string; onClick: () => void }>
    contextId?: string
  }) => {
    const btnId = 'mocked-nav-more'
    return (
      <div>
        <button
          id={btnId}
          aria-haspopup="menu"
          aria-labelledby={contextId ? `${btnId} ${contextId}` : undefined}
        />
        {items?.map((item) => (
          <button
            key={item.title}
            data-testid={`menu-item-${item.title.toLowerCase()}`}
            onClick={item.onClick}
          >
            {item.title}
          </button>
        ))}
      </div>
    )
  },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: () => [false, true],
  useFavoritesEnabled: () => [false],
}))

const announceMock = vi.fn()
vi.mock('@/hooks/useAnnouncementQueue', () => ({
  useAnnouncementQueue: () => ({ announcement: '', announce: announceMock }),
}))

const actions: ChatListItemActions = {
  moveChat: vi.fn(),
  deleteChat: vi.fn(),
}

const chat = {
  id: 'test-chat-id-123',
  name: 'My Test Chat',
  folder: '',
  pinned: false,
  date: '',
  assistantIds: [],
  initialAssistantId: null,
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
}

describe('ChatListItem accessibility', () => {
  it('chat name button has id derived from chat.id', () => {
    const { container } = render(<ChatListItem chat={chat} actions={actions} />)
    const chatNameBtn = container.querySelector(`#chat-name-${chat.id}`)
    expect(chatNameBtn).not.toBeNull()
    expect(chatNameBtn).toHaveAttribute('id', `chat-name-${chat.id}`)
  })

  it('More Options button has aria-labelledby referencing both button id and chat name id', () => {
    const { container } = render(<ChatListItem chat={chat} actions={actions} />)
    const moreBtn = container.querySelector('button[aria-haspopup]') as HTMLElement
    const chatNameId = `chat-name-${chat.id}`
    expect(moreBtn.getAttribute('aria-labelledby')).toBe(`${moreBtn.id} ${chatNameId}`)
  })
})

describe('focus and announcement after pin toggle', () => {
  beforeEach(() => announceMock.mockClear())

  it('moves focus to chat name button after pin', async () => {
    render(<ChatListItem chat={{ ...chat, pinned: false }} actions={actions} />)
    fireEvent.click(screen.getByTestId('menu-item-pin'))
    await waitFor(() => {
      expect(document.getElementById(`chat-name-${chat.id}`)).toHaveFocus()
    })
  })

  it('moves focus to chat name button after unpin', async () => {
    render(<ChatListItem chat={{ ...chat, pinned: true }} actions={actions} />)
    fireEvent.click(screen.getByTestId('menu-item-unpin'))
    await waitFor(() => {
      expect(document.getElementById(`chat-name-${chat.id}`)).toHaveFocus()
    })
  })

  it('announces "Chat pinned" after pin', async () => {
    render(<ChatListItem chat={{ ...chat, pinned: false }} actions={actions} />)
    fireEvent.click(screen.getByTestId('menu-item-pin'))
    await waitFor(() => {
      expect(announceMock).toHaveBeenCalledWith('Chat pinned')
    })
  })

  it('announces "Chat unpinned" after unpin', async () => {
    render(<ChatListItem chat={{ ...chat, pinned: true }} actions={actions} />)
    fireEvent.click(screen.getByTestId('menu-item-unpin'))
    await waitFor(() => {
      expect(announceMock).toHaveBeenCalledWith('Chat unpinned')
    })
  })
})
