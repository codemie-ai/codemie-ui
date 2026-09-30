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

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatOrganizeMode, chatViewSettingsStore } from '@/store/chatViewSettings'

import ChatSidebarLists from '../ChatSidebarLists/ChatSidebarLists'

import type { ReactNode } from 'react'

const mockChatsStore = vi.hoisted(() => ({
  chats: [] as Record<string, unknown>[],
  currentChat: null as Record<string, unknown> | null,
  chatFolders: [] as Record<string, unknown>[],
  assistantFolders: [] as Record<string, unknown>[],
  isChatsLoading: false,
}))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
  proxy: vi.fn((obj: unknown) => obj),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

const mockPinOrderStore = vi.hoisted(() => ({
  getPinOrder: vi.fn(() => ({} as Record<string, string>)),
}))
vi.mock('@/store/pinOrder', () => ({
  pinOrderStore: mockPinOrderStore,
}))

const mockMoveOrderStore = vi.hoisted(() => ({
  getMoveOrder: vi.fn(() => ({} as Record<string, string>)),
}))
vi.mock('@/store/moveOrder', () => ({
  moveOrderStore: mockMoveOrderStore,
}))

vi.mock('../ChatSidebarLists/ChatSidebarAccordion', () => ({
  default: ({
    children,
    headerContentTemplate,
    isExpanded,
    onToggle,
    title,
  }: {
    children: ReactNode
    headerContentTemplate?: ReactNode
    isExpanded?: boolean
    onToggle: () => void
    title: string
  }) => (
    <section data-testid={`${title.toLowerCase()}-section`} data-expanded={isExpanded}>
      <button type="button" onClick={onToggle}>
        {title}
      </button>
      {headerContentTemplate}
      {children}
    </section>
  ),
}))

vi.mock('../ChatList/ChatList', () => ({
  // Registers a real <li> ref per chat via registerChatElement, the same way the real
  // ChatList/ChatListItem does — CR-007 requires the reveal effect in useChatSidebarSections.ts
  // to be exercised through actual DOM registration, not by calling revealChat directly.
  default: ({
    chats,
    currentChatId,
    registerChatElement,
  }: {
    chats: Record<string, unknown>[]
    currentChatId?: string
    registerChatElement?: (chatId: string, element: HTMLLIElement | null) => void
  }) => (
    <div
      data-testid="chat-list"
      data-active-visible={chats.some((chat) => chat.id === currentChatId)}
      data-chat-ids={chats.map((chat) => chat.id).join(',')}
    >
      {chats.map((chat) => (
        <li
          key={chat.id as string}
          data-testid={`chat-row-${chat.id}`}
          ref={(element) => {
            // jsdom doesn't implement scrollIntoView; stub it so the reveal effect's deferred
            // requestAnimationFrame call (which can resolve after an unrelated test has already
            // moved on) never throws for tests that don't care about revealing this row.
            if (element && !element.scrollIntoView) element.scrollIntoView = vi.fn()
            registerChatElement?.(chat.id as string, element)
          }}
        />
      ))}
    </div>
  ),
}))

vi.mock('../FolderList/FolderList', () => ({
  default: ({
    activeFolderIndices,
    currentChatId,
    folders,
    foldersToChatsMap,
    setActiveFolders,
  }: {
    activeFolderIndices: number[]
    currentChatId?: string
    folders: string[]
    foldersToChatsMap: Record<string, Record<string, unknown>[]>
    setActiveFolders?: (folders: string[]) => void
  }) => (
    <div
      data-testid="folder-list"
      data-active-folder-indices={activeFolderIndices.join(',')}
      data-active-visible={Object.values(foldersToChatsMap)
        .flat()
        .some((chat) => chat.id === currentChatId)}
      data-folder-names={folders.join(',')}
    >
      {folders.map((folder) => (
        <button
          key={folder}
          type="button"
          data-testid={`expand-folder-${folder}`}
          onClick={() => setActiveFolders?.([folder])}
        >
          {folder}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../ChatList/DeleteChatPopup', () => ({ default: () => null }))
vi.mock('../ChatList/MoveChatPopup', () => ({ default: () => null }))
vi.mock('../FolderList/FolderFormPopup', () => ({
  default: ({
    isVisible,
    onCreate,
  }: {
    isVisible: boolean
    onCreate?: (folderName: string) => void
  }) =>
    isVisible ? (
      <div data-testid="folder-form-popup">
        <button
          type="button"
          onClick={() => {
            mockChatsStore.chatFolders = [...mockChatsStore.chatFolders, { name: 'New Folder' }]
            onCreate?.('New Folder')
          }}
        >
          Submit folder
        </button>
      </div>
    ) : null,
}))

afterEach(cleanup)

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

// revealChat waits two frames, then runs one step per frame before reading the registered
// element and scrolling — see useChatSidebarNavigation.ts.
const nextFrames = (count: number): Promise<void> =>
  count === 0 ? Promise.resolve() : nextFrame().then(() => nextFrames(count - 1))

const flushScrollFrames = async () => {
  await act(() => nextFrames(6))
}

// revealChat only scrolls a row that is out of its list's view.
const placeRowOutOfView = (row: HTMLElement) => {
  const list = row.parentElement as HTMLElement
  list.style.overflowY = 'auto'
  list.getBoundingClientRect = () => ({ top: 0, bottom: 100 } as DOMRect)
  row.getBoundingClientRect = () => ({ top: 200, bottom: 230 } as DOMRect)
  row.scrollIntoView = vi.fn()
}

describe('ChatSidebarLists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.chats = []
    mockChatsStore.currentChat = null
    mockChatsStore.chatFolders = []
    mockChatsStore.assistantFolders = []
    mockChatsStore.isChatsLoading = false
    mockPinOrderStore.getPinOrder.mockReturnValue({})
    mockMoveOrderStore.getMoveOrder.mockReturnValue({})
  })

  it("opens the current chat's folder while keeping the chat listed in Recent", async () => {
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
      expect(screen.getByTestId('recent chats-section')).toHaveAttribute('data-expanded', 'false')
      expect(screen.getByTestId('folders-section')).toHaveAttribute('data-expanded', 'true')
      expect(screen.getByTestId('chat-list')).toHaveAttribute('data-chat-ids', 'chat-1')
      expect(screen.getByTestId('folder-list')).toHaveAttribute('data-active-folder-indices', '0')
      expect(screen.getByTestId('folder-list')).toHaveAttribute('data-active-visible', 'true')
    })
  })

  it("opens only the current chat's folder, and a clicked folder replaces it", async () => {
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
    mockChatsStore.chatFolders = [
      { name: 'Project', updateDate: '2026-07-16T09:00:00.000Z' },
      { name: 'Archive', updateDate: '2026-07-10T09:00:00.000Z' },
    ]

    render(<ChatSidebarLists />)

    await waitFor(() => {
      expect(screen.getByTestId('folders-section')).toHaveAttribute('data-expanded', 'true')
      // The current chat lives in "Project": only that folder opens.
      expect(screen.getByTestId('folder-list')).toHaveAttribute('data-active-folder-indices', '0')
    })

    fireEvent.click(screen.getByTestId('expand-folder-custom:Archive'))

    await waitFor(() => {
      expect(screen.getByTestId('folder-list')).toHaveAttribute('data-active-folder-indices', '1')
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

  it('sorts an empty folder below folders that have chat activity', () => {
    mockChatsStore.chatFolders = [
      { name: 'No Activity', updateDate: '2026-07-16T09:00:00.000Z' },
      { name: 'Has Activity', updateDate: '2026-07-14T09:00:00.000Z' },
    ]
    mockChatsStore.chats = [
      {
        id: 'chat-1',
        pinned: false,
        folder: 'Has Activity',
        updateDate: '2026-07-15T09:00:00.000Z',
        date: '2026-07-15T09:00:00.000Z',
      },
    ]

    render(<ChatSidebarLists />)

    // No Activity has the newer updateDate (T16) but no chats, so it sinks below Has Activity
    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'custom:Has Activity,custom:No Activity'
    )
  })

  it('ranks a folder that has chats by chat activity alone, ignoring its own updateDate', () => {
    mockChatsStore.chatFolders = [
      { name: 'NewEntity', updateDate: '2026-07-18T09:00:00.000Z' },
      { name: 'NewChat', updateDate: '2026-07-14T09:00:00.000Z' },
    ]
    mockChatsStore.chats = [
      {
        id: 'chat-a',
        pinned: false,
        folder: 'NewEntity',
        updateDate: '2026-07-15T09:00:00.000Z',
        date: '2026-07-15T09:00:00.000Z',
      },
      {
        id: 'chat-b',
        pinned: false,
        folder: 'NewChat',
        updateDate: '2026-07-17T09:00:00.000Z',
        date: '2026-07-17T09:00:00.000Z',
      },
    ]

    render(<ChatSidebarLists />)

    // NewEntity has the newer updateDate (T18) but the older chat (T15), so NewChat ranks above
    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'custom:NewChat,custom:NewEntity'
    )
  })

  it('sorts custom and assistant folders together by chat activity, not by type', () => {
    mockChatsStore.chatFolders = [{ name: 'My Custom', updateDate: '2026-07-10T09:00:00.000Z' }]
    mockChatsStore.assistantFolders = [{ assistant_id: 'asst-1', name: 'My Assistant' }]
    mockChatsStore.chats = [
      {
        id: 'chat-custom',
        pinned: false,
        folder: 'My Custom',
        updateDate: '2026-07-09T09:00:00.000Z',
        date: '2026-07-09T09:00:00.000Z',
      },
      {
        id: 'chat-asst',
        pinned: false,
        folder: null,
        assistantIds: ['asst-1'],
        initialAssistantId: 'asst-1',
        assistantNames: ['My Assistant'],
        updateDate: '2026-07-16T09:00:00.000Z',
        date: '2026-07-16T09:00:00.000Z',
      },
    ]

    render(<ChatSidebarLists />)

    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'assistant:asst-1,custom:My Custom'
    )
  })

  it('sorts an emptied Assistant Folder below folders with known activity', () => {
    mockChatsStore.chatFolders = [{ name: 'Old Custom', updateDate: '2026-06-01T09:00:00.000Z' }]
    mockChatsStore.assistantFolders = [{ assistant_id: 'asst-1', name: 'My Assistant' }]
    const assistantChat = {
      id: 'chat-asst',
      pinned: false,
      folder: null,
      assistantIds: ['asst-1'],
      initialAssistantId: 'asst-1',
      assistantNames: ['My Assistant'],
      updateDate: '2026-07-16T09:00:00.000Z',
      date: '2026-07-16T09:00:00.000Z',
    }
    mockChatsStore.chats = [assistantChat]

    const { rerender } = render(<ChatSidebarLists />)

    // Assistant Folder's only chat is the most recent activity, so it sorts above the old
    // custom folder.
    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'assistant:asst-1,custom:Old Custom'
    )

    // Its last (and only) chat gets deleted — the Assistant Folder registration itself
    // persists (it isn't auto-removed), it just has zero chats now.
    mockChatsStore.chats = []
    rerender(<ChatSidebarLists />)

    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'custom:Old Custom,assistant:asst-1'
    )
  })

  it('deduplicates registered Claude legacy aliases as one import folder', () => {
    mockChatsStore.chatFolders = [
      { name: 'Claude Desktop', updateDate: '2026-07-16T09:00:00.000Z' },
      { name: 'Claude Imports', updateDate: '2026-07-15T09:00:00.000Z' },
      { name: 'claude', updateDate: '2026-07-14T09:00:00.000Z' },
      { name: 'codemie-code', updateDate: '2026-07-13T09:00:00.000Z' },
    ]
    mockChatsStore.chats = [
      {
        id: 'chat-claude',
        pinned: false,
        folder: 'claude',
        updateDate: '2026-07-16T09:00:00.000Z',
      },
      {
        id: 'chat-codemie-code',
        pinned: false,
        folder: 'codemie-code',
        updateDate: '2026-07-13T09:00:00.000Z',
      },
    ]

    render(<ChatSidebarLists />)

    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'legacy-import:Claude Imports,legacy-import:codemie-code'
    )
  })

  it('hides an empty import-kind folder registered with no chats', () => {
    mockChatsStore.chatFolders = [
      { name: 'Claude Imports', updateDate: '2026-07-15T09:00:00.000Z' },
      { name: 'Old Custom', updateDate: '2026-07-14T09:00:00.000Z' },
    ]
    mockChatsStore.chats = []

    render(<ChatSidebarLists />)

    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'custom:Old Custom'
    )
  })

  it('renders only the live Claude CLI folder when a zero-chat Claude Imports record also exists', () => {
    mockChatsStore.chatFolders = [
      { name: 'Claude Imports', updateDate: '2026-07-15T09:00:00.000Z' },
    ]
    mockChatsStore.chats = [
      {
        id: 'chat-cli',
        pinned: false,
        folder: null,
        importSource: 'claude_cli',
        updateDate: '2026-07-16T09:00:00.000Z',
      },
    ]

    render(<ChatSidebarLists />)

    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'import:claude_cli'
    )
  })

  it('renders the Pinned section ordered by pinOrderStore, not by updateDate', () => {
    mockChatsStore.chats = [
      {
        id: 'pinned-older-updateDate',
        pinned: true,
        folder: null,
        updateDate: '2026-07-20T09:00:00.000Z',
      },
      {
        id: 'pinned-newer-updateDate',
        pinned: true,
        folder: null,
        updateDate: '2026-07-10T09:00:00.000Z',
      },
    ]
    // pinned-newer-updateDate was pinned more recently than pinned-older-updateDate, even
    // though its updateDate is older — pinOrderStore's map must be what drives the Pinned
    // section order, proving the wiring from ChatSidebarLists.tsx into the view model.
    mockPinOrderStore.getPinOrder.mockReturnValue({
      'pinned-older-updateDate': '2026-08-01T00:00:00.000Z',
      'pinned-newer-updateDate': '2026-08-02T00:00:00.000Z',
    })

    render(<ChatSidebarLists />)

    expect(screen.getByTestId('pinned-section')).toHaveAttribute('data-expanded', 'true')
    const pinnedList = screen
      .getByTestId('pinned-section')
      .querySelector('[data-testid="chat-list"]')
    expect(pinnedList).toHaveAttribute(
      'data-chat-ids',
      'pinned-newer-updateDate,pinned-older-updateDate'
    )
    expect(mockPinOrderStore.getPinOrder).toHaveBeenCalled()
  })

  it('renders Recent ordered by activity alone, ignoring a recent moveOrder entry', () => {
    mockChatsStore.chats = [
      {
        id: 'stale-moved-chat',
        pinned: false,
        folder: 'My Custom',
        updateDate: '2026-07-01T09:00:00.000Z',
      },
      {
        id: 'active-chat',
        pinned: false,
        folder: null,
        updateDate: '2026-07-20T09:00:00.000Z',
      },
    ]
    // stale-moved-chat was moved into a folder most recently, but a move is not activity — the
    // moveOrder map still reaches the view model (it drives folder lists) and must leave Recent,
    // where foldered chats also appear, ordered by updateDate alone.
    mockMoveOrderStore.getMoveOrder.mockReturnValue({
      'stale-moved-chat': '2026-08-01T00:00:00.000Z',
    })

    render(<ChatSidebarLists />)

    expect(screen.getByTestId('chat-list')).toHaveAttribute(
      'data-chat-ids',
      'active-chat,stale-moved-chat'
    )
    expect(mockMoveOrderStore.getMoveOrder).toHaveBeenCalled()
  })

  describe('Reveals the resolved chat into view (EPMCDME-15211 CR-007/CR-008)', () => {
    it("scrolls the resolved chat's row into view once its element registers through real ChatList wiring", async () => {
      const activeChat = {
        id: 'chat-1',
        name: 'Active chat',
        pinned: false,
        folder: null,
        updateDate: '2026-07-16T09:00:00.000Z',
      }
      mockChatsStore.chats = [activeChat]
      mockChatsStore.currentChat = activeChat

      render(<ChatSidebarLists />)

      const chatRow = screen.getByTestId('chat-row-chat-1')
      placeRowOutOfView(chatRow)

      await flushScrollFrames()

      expect(chatRow.scrollIntoView).toHaveBeenCalled()
    })

    it('retries the reveal once the row registers late instead of skipping it permanently (CR-008)', async () => {
      mockChatsStore.chats = []
      mockChatsStore.currentChat = { id: 'chat-1', pinned: false, folder: null }

      const { rerender } = render(<ChatSidebarLists />)

      // First pass: the chat's row hasn't rendered yet (e.g. still loading), so revealChat finds
      // nothing — the guard must not lock in on this miss.
      await flushScrollFrames()
      expect(screen.queryByTestId('chat-row-chat-1')).not.toBeInTheDocument()

      const activeChat = {
        id: 'chat-1',
        name: 'Active chat',
        pinned: false,
        folder: null,
        updateDate: '2026-07-16T09:00:00.000Z',
      }
      mockChatsStore.chats = [activeChat]
      mockChatsStore.currentChat = activeChat
      rerender(<ChatSidebarLists />)

      const chatRow = screen.getByTestId('chat-row-chat-1')
      placeRowOutOfView(chatRow)

      await flushScrollFrames()

      expect(chatRow.scrollIntoView).toHaveBeenCalled()
    })
  })

  it('resorts folders to the destination when the most-recently-active chat is moved, with no reload (EPMCDME-15165)', () => {
    mockChatsStore.chatFolders = [
      { name: 'Folder A', updateDate: '2026-07-01T09:00:00.000Z' },
      { name: 'Folder B', updateDate: '2026-07-01T09:00:00.000Z' },
    ]
    const movedChat = {
      id: 'chat-1',
      pinned: false,
      folder: 'Folder A',
      updateDate: '2026-07-10T09:00:00.000Z',
    }
    mockChatsStore.chats = [movedChat]

    const { rerender } = render(<ChatSidebarLists />)

    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'custom:Folder A,custom:Folder B'
    )

    mockChatsStore.chats = [{ ...movedChat, folder: 'Folder B' }]
    rerender(<ChatSidebarLists />)

    expect(screen.getByTestId('folder-list')).toHaveAttribute(
      'data-folder-names',
      'custom:Folder B,custom:Folder A'
    )
  })

  describe('Focused mode folder creation (EPMCDME-15206)', () => {
    beforeEach(() => {
      chatViewSettingsStore.organizeBy = ChatOrganizeMode.FOCUSED
    })

    afterEach(() => {
      chatViewSettingsStore.organizeBy = ChatOrganizeMode.UNIFIED
    })

    it('shows the Folders section with the Create Folder button when there are no folders', () => {
      render(<ChatSidebarLists />)

      const foldersSection = screen.getByTestId('folders-section')
      expect(
        within(foldersSection).getByRole('button', { name: 'Create Folder' })
      ).toBeInTheDocument()
    })

    it('opens the folder form from the Folders header button', () => {
      render(<ChatSidebarLists />)

      fireEvent.click(screen.getByRole('button', { name: 'Create Folder' }))

      expect(screen.getByTestId('folder-form-popup')).toBeInTheDocument()
    })

    it('shows the created folder, expands Folders and collapses Recent and Workflows', () => {
      chatViewSettingsStore.showWorkflowRunsSeparately = true
      mockChatsStore.chats = [
        {
          id: 'workflow-run',
          pinned: false,
          isWorkflow: true,
          initialWorkflowId: 'workflow-1',
          updateDate: '2026-07-20T09:00:00.000Z',
        },
      ]

      try {
        render(<ChatSidebarLists />)

        fireEvent.click(screen.getByRole('button', { name: 'Recent Chats' }))
        expect(screen.getByTestId('recent chats-section')).toHaveAttribute('data-expanded', 'true')

        fireEvent.click(screen.getByRole('button', { name: 'Create Folder' }))
        fireEvent.click(screen.getByRole('button', { name: 'Submit folder' }))

        const foldersSection = screen.getByTestId('folders-section')
        expect(foldersSection).toHaveAttribute('data-expanded', 'true')
        expect(within(foldersSection).getByText('New Folder')).toBeInTheDocument()
        expect(screen.getByTestId('recent chats-section')).toHaveAttribute('data-expanded', 'false')
        expect(screen.getByTestId('workflows-section')).toHaveAttribute('data-expanded', 'false')
      } finally {
        chatViewSettingsStore.showWorkflowRunsSeparately = false
      }
    })

    it('opens the drill-down of an empty custom folder', () => {
      mockChatsStore.chatFolders = [{ name: 'Empty Folder' }]

      render(<ChatSidebarLists />)

      fireEvent.click(screen.getByRole('button', { name: 'Folders' }))
      fireEvent.click(screen.getByText('Empty Folder'))

      expect(screen.queryByTestId('folders-section')).not.toBeInTheDocument()
      expect(screen.getByText('Empty Folder')).toBeInTheDocument()
      expect(screen.queryAllByTestId('chat-list').every((list) => !list.dataset.chatIds)).toBe(true)
    })
  })
})
