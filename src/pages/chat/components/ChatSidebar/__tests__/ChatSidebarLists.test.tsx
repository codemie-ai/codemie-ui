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
import { describe, it, expect, vi } from 'vitest'

import ChatSidebarLists from '../ChatSidebarLists/ChatSidebarLists'

vi.hoisted(() => vi.resetModules())

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    chats: [],
    currentChat: null,
    chatFolders: [],
    isChatsLoading: false,
  },
}))

vi.mock('../ChatSidebarLists/ChatSidebarAccordion', () => ({
  default: ({ children, title, headerContentTemplate }: any) => (
    <div data-testid={`accordion-${title.toLowerCase()}`}>
      {headerContentTemplate}
      {children}
    </div>
  ),
}))

vi.mock('../ChatList/ChatList', () => ({
  default: () => <ul />,
}))

vi.mock('../ChatList/DeleteChatPopup', () => ({
  default: () => null,
}))

vi.mock('../ChatList/MoveChatPopup', () => ({
  default: () => null,
}))

vi.mock('../FolderList/FolderFormPopup', () => ({
  default: () => null,
}))

vi.mock('../FolderList/FolderList', () => ({
  default: () => <div data-testid="folder-list" />,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner" />,
}))

vi.mock('@/assets/icons/folder-add.svg?react', () => ({
  default: (props: any) => <span data-testid="folder-add-icon" {...props} />,
}))

describe('ChatSidebarLists', () => {
  it('renders a tree container with role="tree" and aria-label="Chats"', () => {
    render(<ChatSidebarLists />)
    const tree = screen.getByRole('tree')
    expect(tree).toBeInTheDocument()
    expect(tree).toHaveAttribute('aria-label', 'Chats')
  })

  it('renders the create folder button following the shared icon-button pattern', () => {
    render(<ChatSidebarLists />)
    const createFolderButton = screen.getByRole('button', { name: 'Create folder' })
    expect(createFolderButton).toBeInTheDocument()
    // aria-label + shared react-tooltip instead of a native title tooltip
    expect(createFolderButton).not.toHaveAttribute('title')
    expect(createFolderButton).toHaveAttribute('data-tooltip-id', 'react-tooltip')
    expect(createFolderButton).toHaveAttribute('data-tooltip-content', 'Create folder')

    const icon = screen.getByTestId('folder-add-icon')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
