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
import { describe, it, expect, vi } from 'vitest'

import ChatSidebarLists from '../ChatSidebarLists/ChatSidebarLists'

vi.hoisted(() => vi.resetModules())

// Keep the real `proxy` — the un-mocked accordion pulls stores that build one at
// import time — and stub only the snapshot hook.
vi.mock('valtio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('valtio')>()),
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

vi.mock('../ChatList/ChatList', () => ({
  default: () => <ul />,
}))

vi.mock('../ChatList/DeleteChatPopup', () => ({
  default: () => null,
}))

vi.mock('../ChatList/MoveChatPopup', () => ({
  default: () => null,
}))

// The accordion is deliberately NOT mocked: the defect lives in the interaction
// between the trigger and the PrimeReact header action that wraps it.
vi.mock('../FolderList/FolderFormPopup', () => ({
  default: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div data-testid="folder-form-popup" /> : null,
}))

vi.mock('../FolderList/FolderList', () => ({
  default: () => <div data-testid="folder-list" />,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner" />,
}))

vi.mock('@/assets/icons/folder-add.svg?react', () => ({
  default: () => <span data-testid="folder-add-icon" />,
}))

const foldersHeader = () => {
  const header = document.getElementById('pr_id_1_header_1')
  return header ?? document.querySelectorAll<HTMLElement>('a.p-accordion-header-link')[1]
}

describe('ChatSidebarLists — keyboard activation of the Create Folder trigger', () => {
  it('opens the folder form on Enter without toggling the Folders section', async () => {
    const user = userEvent.setup()
    render(<ChatSidebarLists />)

    const trigger = screen.getByTitle('Create Folder')
    const expandedBefore = foldersHeader().getAttribute('aria-expanded')

    trigger.focus()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('folder-form-popup')).toBeInTheDocument()
    expect(foldersHeader().getAttribute('aria-expanded')).toBe(expandedBefore)
  })

  it('opens the folder form on Space without toggling the Folders section', async () => {
    const user = userEvent.setup()
    render(<ChatSidebarLists />)

    const trigger = screen.getByTitle('Create Folder')
    const expandedBefore = foldersHeader().getAttribute('aria-expanded')

    trigger.focus()
    await user.keyboard(' ')

    expect(screen.getByTestId('folder-form-popup')).toBeInTheDocument()
    expect(foldersHeader().getAttribute('aria-expanded')).toBe(expandedBefore)
  })

  it('still lets the Folders accordion header itself toggle on Enter', async () => {
    const user = userEvent.setup()
    render(<ChatSidebarLists />)

    const header = foldersHeader()
    const expandedBefore = header.getAttribute('aria-expanded')

    header.focus()
    await user.keyboard('{Enter}')

    expect(foldersHeader().getAttribute('aria-expanded')).not.toBe(expandedBefore)
    expect(screen.queryByTestId('folder-form-popup')).not.toBeInTheDocument()
  })
})
