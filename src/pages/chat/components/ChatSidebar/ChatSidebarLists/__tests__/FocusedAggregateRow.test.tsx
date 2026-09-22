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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockRouter } from '@/hooks/__mocks__/useVueRouter'
import { chatsStore } from '@/store/chats'
import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem } from '@/types/entity/conversation'

import FocusedAggregateRow from '../FocusedAggregateRow'

import type { FocusedChatSidebarAggregate } from '../chatSidebarListsHelpers'

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
  proxy: vi.fn((obj: unknown) => obj),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    chats: [],
    startNewChat: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/components/NavigationMore/NavigationMore', () => ({
  default: ({ items }: { items: any[] }) => (
    <div data-testid="navigation-more" data-items-count={items?.length ?? 0}>
      {items?.map((item: any) => (
        <button key={item.title} type="button" onClick={item.onClick}>
          {item.title}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Avatar/AvatarGroup', () => ({
  default: () => <div data-testid="avatar-group" />,
}))

vi.mock('../AddChatsToFolderPopup', () => ({ default: () => null }))
vi.mock('../FolderList/AssistantFolderDeletePopup', () => ({ default: () => null }))
vi.mock('../FolderList/DeleteFolderPopup', () => ({ default: () => null }))
vi.mock('../FolderList/FolderFormPopup', () => ({ default: () => null }))

const createChat = (overrides: Partial<ChatListItem> = {}): ChatListItem => ({
  id: 'run-1',
  name: 'Workflow run',
  folder: 'Release workflows',
  pinned: false,
  date: '2026-07-29T08:00:00.000Z',
  assistantIds: [],
  initialAssistantId: null,
  initialWorkflowId: 'workflow-a',
  isGroup: false,
  isWorkflow: true,
  assistantNames: [''],
  ...overrides,
})

const renderAggregate = (aggregate: FocusedChatSidebarAggregate) =>
  render(
    <FocusedAggregateRow
      aggregate={aggregate}
      density={ChatListDensity.DETAILED}
      onSelect={vi.fn()}
    />
  )

describe('FocusedAggregateRow — workflow-associated folder menu (EPMCDME-15012)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows New chat + Rename/Delete (not Add chats...) for a workflow-kind folder aggregate', () => {
    const aggregate: FocusedChatSidebarAggregate = {
      id: 'custom:Release workflows',
      name: 'Release workflows',
      chats: [createChat()],
      kind: 'folder',
      folderKind: 'workflow',
    }

    renderAggregate(aggregate)

    const menu = screen.getByTestId('navigation-more')
    expect(menu).toHaveAttribute('data-items-count', '3')
    expect(screen.getByRole('button', { name: 'New chat' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add chats...' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename folder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete...' })).toBeInTheDocument()
  })

  it('starts a new chat with the folder\'s workflow when "New chat" is clicked', async () => {
    const aggregate: FocusedChatSidebarAggregate = {
      id: 'custom:Release workflows',
      name: 'Release workflows',
      chats: [createChat({ initialWorkflowId: 'workflow-a' })],
      kind: 'folder',
      folderKind: 'workflow',
    }

    renderAggregate(aggregate)
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))

    expect(chatsStore.startNewChat).toHaveBeenCalledWith('workflow-a', 'Release workflows', true)
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith({ name: 'new-chat' }))
  })

  it('shows the same 3-item menu with Add chats... for a plain custom folder aggregate (regression)', () => {
    const aggregate: FocusedChatSidebarAggregate = {
      id: 'custom:My Project',
      name: 'My Project',
      chats: [createChat({ isWorkflow: false, initialWorkflowId: null })],
      kind: 'folder',
      folderKind: 'custom',
    }

    renderAggregate(aggregate)

    const menu = screen.getByTestId('navigation-more')
    expect(menu).toHaveAttribute('data-items-count', '3')
    expect(screen.getByRole('button', { name: 'Add chats...' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New chat' })).not.toBeInTheDocument()
  })

  it('shows no menu for an import-kind folder aggregate', () => {
    const aggregate: FocusedChatSidebarAggregate = {
      id: 'import:claude_code',
      name: 'Claude Code',
      chats: [],
      kind: 'folder',
      folderKind: 'import',
    }

    renderAggregate(aggregate)

    expect(screen.queryByTestId('navigation-more')).not.toBeInTheDocument()
  })
})
