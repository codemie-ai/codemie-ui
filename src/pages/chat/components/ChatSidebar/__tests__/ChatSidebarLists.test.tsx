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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ChatSidebarLists from '../ChatSidebarLists/ChatSidebarLists'

import type { ReactNode } from 'react'

const mockChatsStore = vi.hoisted(() => ({
  chats: [] as Record<string, unknown>[],
  currentChat: null as Record<string, unknown> | null,
  chatFolders: [] as Record<string, unknown>[],
  isChatsLoading: false,
}))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
  proxy: vi.fn((obj: unknown) => obj),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('../ChatSidebarLists/ChatSidebarAccordion', () => ({
  default: ({
    children,
    isExpanded,
    onToggle,
    title,
  }: {
    children: ReactNode
    isExpanded?: boolean
    onToggle: () => void
    title: string
  }) => (
    <section data-testid={`${title.toLowerCase()}-section`} data-expanded={isExpanded}>
      <button type="button" onClick={onToggle}>
        {title}
      </button>
      {children}
    </section>
  ),
}))

vi.mock('../ChatList/ChatList', () => ({
  default: ({
    chats,
    currentChatId,
  }: {
    chats: Record<string, unknown>[]
    currentChatId?: string
  }) => (
    <div
      data-testid="chat-list"
      data-active-visible={chats.some((chat) => chat.id === currentChatId)}
      data-chat-ids={chats.map((chat) => chat.id).join(',')}
    />
  ),
}))

vi.mock('../FolderList/FolderList', () => ({
  default: ({
    activeFolderIndex,
    currentChatId,
    folders,
    foldersToChatsMap,
  }: {
    activeFolderIndex: number | null
    currentChatId?: string
    folders: string[]
    foldersToChatsMap: Record<string, Record<string, unknown>[]>
  }) => (
    <div
      data-testid="folder-list"
      data-active-folder-index={activeFolderIndex}
      data-active-visible={Object.values(foldersToChatsMap)
        .flat()
        .some((chat) => chat.id === currentChatId)}
      data-folder-names={folders.join(',')}
    />
  ),
}))

vi.mock('../ChatList/DeleteChatPopup', () => ({ default: () => null }))
vi.mock('../ChatList/MoveChatPopup', () => ({ default: () => null }))
vi.mock('../FolderList/FolderFormPopup', () => ({ default: () => null }))

afterEach(cleanup)

describe('ChatSidebarLists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.chats = []
    mockChatsStore.currentChat = null
    mockChatsStore.chatFolders = []
    mockChatsStore.isChatsLoading = false
  })

  it('shows a folder chat in Recent and keeps Recent expanded', async () => {
    const activeChat = {
      id: 'chat-1',
      name: 'Active chat',
      pinned: false,
      folder: 'Project',
      date: '2026-07-16T08:00:00.000Z',
      updateDate: '2026-07-16T09:00:00.000Z',
    }
    mockChatsStore.chats = [activeChat]
    mockChatsStore.currentChat = activeChat
    mockChatsStore.chatFolders = [{ name: 'Project', updateDate: '2026-07-16T09:00:00.000Z' }]

    render(<ChatSidebarLists />)

    await waitFor(() => {
      expect(screen.getByTestId('recent-section')).toHaveAttribute('data-expanded', 'true')
      expect(screen.getByTestId('folders-section')).toHaveAttribute('data-expanded', 'false')
      expect(screen.getByTestId('chat-list')).toHaveAttribute('data-active-visible', 'true')
    })
  })

  it('sorts recent chats by the first valid update or creation date', () => {
    mockChatsStore.chats = [
      {
        id: 'oldest-chat',
        pinned: false,
        folder: null,
        updateDate: 'invalid-date',
        date: '2026-07-14T09:00:00.000Z',
      },
      {
        id: 'middle-chat',
        pinned: false,
        folder: null,
        updateDate: '2026-07-15T09:00:00.000Z',
        date: '2026-07-13T09:00:00.000Z',
      },
      {
        id: 'newest-chat',
        pinned: false,
        folder: null,
        updateDate: '',
        date: '2026-07-16T09:00:00.000Z',
      },
    ]

    render(<ChatSidebarLists />)

    expect(screen.getByTestId('chat-list')).toHaveAttribute(
      'data-chat-ids',
      'newest-chat,middle-chat,oldest-chat'
    )
  })

  it('sorts folders with missing update dates after dated folders', () => {
    mockChatsStore.chatFolders = [
      { name: 'No date', updateDate: '' },
      { name: 'Older', updateDate: '2026-07-14T09:00:00.000Z' },
      { name: 'Newer', updateDate: '2026-07-16T09:00:00.000Z' },
    ]

    render(<ChatSidebarLists />)

    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'Newer,Older,No date'
    )
  })
})
