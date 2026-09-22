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

import { describe, expect, it } from 'vitest'

import { isImportedChat } from '@/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarFolderHelpers'
import {
  buildFocusedChatSidebarViewModel,
  buildUnifiedChatSidebarViewModel,
  getFolderDisplayName,
  getFolderKindFromKey,
  isWorkflowAssociatedFolder,
} from '@/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarListsHelpers'
import { ChatListItem } from '@/types/entity/conversation'

const createChat = (overrides: Partial<ChatListItem>): ChatListItem => ({
  id: 'chat',
  name: 'Chat',
  folder: null,
  pinned: false,
  date: '2026-07-29T08:00:00.000Z',
  assistantIds: ['assistant-a'],
  initialAssistantId: 'assistant-a',
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
  assistantNames: ['Assistant A'],
  ...overrides,
})

const focusedSettings = {
  showRecentAssistants: true,
  showWorkflowRunsSeparately: false,
}

describe('isImportedChat', () => {
  it('restricts an imported chat even when its source is not in the display allow-list', () => {
    expect(isImportedChat(createChat({ importSource: null, isImported: true }))).toBe(true)
  })

  it('keeps a regular chat eligible for folder actions', () => {
    expect(isImportedChat(createChat({ importSource: null, isImported: false }))).toBe(false)
  })
})

describe('getFolderKindFromKey', () => {
  it('classifies the avatar folder as legacy-avatar', () => {
    expect(getFolderKindFromKey('avatar')).toBe('legacy-avatar')
  })

  it('classifies import:-prefixed keys as import', () => {
    expect(getFolderKindFromKey('import:claude_code')).toBe('import')
    expect(getFolderKindFromKey('import:claude_cli')).toBe('import')
    expect(getFolderKindFromKey('import:codex')).toBe('import')
  })

  it('classifies legacy-import:-prefixed keys as legacy-import', () => {
    expect(getFolderKindFromKey('legacy-import:Claude imports')).toBe('legacy-import')
  })

  it('classifies raw legacy folder names matched by getChatImportSource as legacy-import', () => {
    expect(getFolderKindFromKey('Claude imports')).toBe('legacy-import')
    expect(getFolderKindFromKey('Claude Desktop')).toBe('legacy-import')
  })

  it('classifies unrecognised folders as custom', () => {
    expect(getFolderKindFromKey('My Project')).toBe('custom')
    expect(getFolderKindFromKey('')).toBe('custom')
  })
})

describe('isWorkflowAssociatedFolder', () => {
  it('returns true when every chat belongs to the same workflow', () => {
    const chats = [
      createChat({ id: 'run-1', isWorkflow: true, initialWorkflowId: 'workflow-a' }),
      createChat({ id: 'run-2', isWorkflow: true, initialWorkflowId: 'workflow-a' }),
    ]

    expect(isWorkflowAssociatedFolder(chats)).toBe(true)
  })

  it('returns false when a non-workflow chat is mixed in', () => {
    const chats = [
      createChat({ id: 'run-1', isWorkflow: true, initialWorkflowId: 'workflow-a' }),
      createChat({ id: 'regular', isWorkflow: false }),
    ]

    expect(isWorkflowAssociatedFolder(chats)).toBe(false)
  })

  it('returns false when chats belong to different workflows', () => {
    const chats = [
      createChat({ id: 'run-1', isWorkflow: true, initialWorkflowId: 'workflow-a' }),
      createChat({ id: 'run-2', isWorkflow: true, initialWorkflowId: 'workflow-b' }),
    ]

    expect(isWorkflowAssociatedFolder(chats)).toBe(false)
  })

  it('returns false for an empty folder', () => {
    expect(isWorkflowAssociatedFolder([])).toBe(false)
  })

  it('returns false when every chat has a null initialWorkflowId', () => {
    const chats = [
      createChat({ id: 'run-1', isWorkflow: true, initialWorkflowId: null }),
      createChat({ id: 'run-2', isWorkflow: true, initialWorkflowId: null }),
    ]

    expect(isWorkflowAssociatedFolder(chats)).toBe(false)
  })

  it('returns false when every chat has an empty-string initialWorkflowId', () => {
    const chats = [
      createChat({ id: 'run-1', isWorkflow: true, initialWorkflowId: '' }),
      createChat({ id: 'run-2', isWorkflow: true, initialWorkflowId: '' }),
    ]

    expect(isWorkflowAssociatedFolder(chats)).toBe(false)
  })
})

describe('getFolderDisplayName', () => {
  it('returns the display name for import:-prefixed keys', () => {
    expect(getFolderDisplayName('import:claude_code')).toBe('Claude Code')
    expect(getFolderDisplayName('import:claude_cli')).toBe('Claude CLI')
    expect(getFolderDisplayName('import:codex')).toBe('Codex')
  })

  it('returns the import source name for legacy-import:-prefixed keys', () => {
    expect(getFolderDisplayName('legacy-import:Claude imports')).toBe('Claude Imports')
    expect(getFolderDisplayName('legacy-import:codemie-code')).toBe('codemie-code')
  })

  it('returns the raw name for unknown legacy-import:-prefixed keys', () => {
    expect(getFolderDisplayName('legacy-import:Unknown folder')).toBe('Unknown folder')
  })

  it('returns the raw key for custom folders', () => {
    expect(getFolderDisplayName('My Project')).toBe('My Project')
  })
})

describe('buildUnifiedChatSidebarViewModel', () => {
  it('keeps a registered Assistant Folder visible when it has no chats', () => {
    const viewModel = buildUnifiedChatSidebarViewModel([], focusedSettings, [
      { assistant_id: 'assistant-a', name: 'Assistant A', icon_url: '/assistant-a.svg' },
    ])

    expect(viewModel.foldersToChatsMap['assistant:assistant-a']).toEqual([])
    expect(viewModel.folderLabels['assistant:assistant-a']).toBe('Assistant A')
  })

  it('uses a registered Assistant Folder name when the chat has no assistant name', () => {
    const chat = createChat({ id: 'registered-chat', assistantNames: [] })
    const folder = {
      assistant_id: 'assistant-a',
      name: 'Registered Assistant',
      icon_url: null,
    }

    const viewModel = buildUnifiedChatSidebarViewModel([chat], focusedSettings, [folder])

    expect(viewModel.foldersToChatsMap['assistant:assistant-a']).toEqual([chat])
    expect(viewModel.folderLabels['assistant:assistant-a']).toBe('Registered Assistant')
  })

  it('merges a legacy folder=assistant.name chat into the Assistant Folder instead of a spurious Custom Folder', () => {
    const pollutedChat = createChat({ id: 'polluted-chat', folder: 'Assistant A' })

    const viewModel = buildUnifiedChatSidebarViewModel([pollutedChat], focusedSettings)

    expect(viewModel.foldersToChatsMap['assistant:assistant-a']).toEqual([pollutedChat])
    expect(viewModel.foldersToChatsMap['custom:Assistant A']).toBeUndefined()
  })

  it('keeps a chat with an unresolved assistant in Recent without creating an Assistant Folder', () => {
    const orphanChat = createChat({
      id: 'orphan-chat',
      assistantNames: [],
    })

    const viewModel = buildUnifiedChatSidebarViewModel([orphanChat], focusedSettings)

    expect(viewModel.recentChats).toEqual([orphanChat])
    expect(viewModel.foldersToChatsMap['assistant:assistant-a']).toBeUndefined()
    expect(viewModel.chatLocations[orphanChat.id]).toEqual({ section: 'recent' })
  })

  it('shows pinned chats regardless of showRecentAssistants setting', () => {
    const pinned = createChat({ id: 'pinned', pinned: true })

    const withAssistants = buildUnifiedChatSidebarViewModel([pinned], {
      ...focusedSettings,
      showRecentAssistants: true,
    })
    const withoutAssistants = buildUnifiedChatSidebarViewModel([pinned], {
      ...focusedSettings,
      showRecentAssistants: false,
    })

    expect(withAssistants.pinnedChats).toEqual([pinned])
    expect(withoutAssistants.pinnedChats).toEqual([pinned])
    expect(withoutAssistants.chatLocations.pinned).toEqual({ section: 'pinned' })
  })

  it('moves a pinned workflow chat into Pinned instead of Workflows (EPMCDME-15010)', () => {
    const pinnedWorkflow = createChat({
      id: 'pinned-workflow',
      pinned: true,
      isWorkflow: true,
      initialWorkflowId: 'workflow-a',
    })

    const viewModel = buildUnifiedChatSidebarViewModel(
      [pinnedWorkflow],
      { ...focusedSettings, showWorkflowRunsSeparately: true },
      []
    )

    expect(viewModel.pinnedChats).toEqual([pinnedWorkflow])
    expect(viewModel.workflowChats).toEqual([])
    expect(viewModel.chatLocations[pinnedWorkflow.id]).toEqual({ section: 'pinned' })
  })

  it('keeps regular folder chats in Recent and excludes pinned and CLI-imported chats', () => {
    const regularFolderChat = createChat({
      id: 'regular-folder',
      folder: 'Project',
      date: '2026-07-29T11:00:00.000Z',
    })
    const unfiledChat = createChat({
      id: 'unfiled',
      date: '2026-07-29T10:00:00.000Z',
    })
    const pinnedFolderChat = createChat({
      id: 'pinned-folder',
      folder: 'Project',
      pinned: true,
    })
    const importedChat = createChat({
      id: 'cli-import',
      folder: 'Claude imports',
    })

    const viewModel = buildUnifiedChatSidebarViewModel(
      [regularFolderChat, unfiledChat, pinnedFolderChat, importedChat],
      focusedSettings
    )

    expect(viewModel.recentChats.map((chat) => chat.id)).toEqual(['regular-folder', 'unfiled'])
    expect(viewModel.pinnedChats).toEqual([pinnedFolderChat])
    expect(viewModel.foldersToChatsMap['custom:Project'].map((chat) => chat.id)).toEqual([
      'regular-folder',
      'pinned-folder',
    ])
    expect(viewModel.foldersToChatsMap['legacy-import:Claude Imports']).toEqual([importedChat])
    expect(viewModel.chatLocations['regular-folder']).toEqual({ section: 'recent' })
    expect(viewModel.chatLocations['cli-import']).toEqual({
      section: 'folder',
      folderName: 'legacy-import:Claude Imports',
    })
  })

  it('does not expose an imported chat with an unknown source in Recent or an Assistant Folder', () => {
    const importedChat = createChat({
      id: 'unknown-import',
      importSource: null,
      isImported: true,
    })

    const viewModel = buildUnifiedChatSidebarViewModel([importedChat], focusedSettings)

    expect(viewModel.recentChats).toEqual([])
    expect(viewModel.foldersToChatsMap['assistant:assistant-a']).toBeUndefined()
    expect(viewModel.chatLocations[importedChat.id]).toBeUndefined()
  })

  it('combines Claude legacy aliases while keeping codemie-code separate', () => {
    const claudeDesktop = createChat({ id: 'claude-desktop', folder: 'Claude Desktop' })
    const claudeImports = createChat({ id: 'claude-imports', folder: 'Claude Imports' })
    const claudeShort = createChat({ id: 'claude-short', folder: 'claude' })
    const codemieCode = createChat({ id: 'codemie-code', folder: 'codemie-code' })

    const viewModel = buildUnifiedChatSidebarViewModel(
      [claudeDesktop, claudeImports, claudeShort, codemieCode],
      focusedSettings
    )

    expect(viewModel.foldersToChatsMap['legacy-import:Claude Imports']).toEqual([
      claudeDesktop,
      claudeImports,
      claudeShort,
    ])
    expect(viewModel.foldersToChatsMap['legacy-import:codemie-code']).toEqual([codemieCode])
  })

  describe('pinned section ordering', () => {
    it('sorts pinned chats by pin-order, not by updateDate', () => {
      const olderPin = createChat({
        id: 'older-pin',
        pinned: true,
        updateDate: '2026-07-01T00:00:00.000Z',
      })
      const newerPin = createChat({
        id: 'newer-pin',
        pinned: true,
        updateDate: '2026-01-01T00:00:00.000Z',
      })

      const viewModel = buildUnifiedChatSidebarViewModel(
        [olderPin, newerPin],
        focusedSettings,
        [],
        {
          'older-pin': '2026-08-01T00:00:00.000Z',
          'newer-pin': '2026-09-01T00:00:00.000Z',
        }
      )

      expect(viewModel.pinnedChats.map((chat) => chat.id)).toEqual(['newer-pin', 'older-pin'])
    })

    it('does not reorder the Pinned section when a pinned chat gets a fresh updateDate from real usage', () => {
      const firstPinned = createChat({
        id: 'first-pinned',
        pinned: true,
        updateDate: '2026-01-01T00:00:00.000Z',
      })
      const secondPinned = createChat({
        id: 'second-pinned',
        pinned: true,
        updateDate: '2026-01-02T00:00:00.000Z',
      })
      const pinOrder = {
        'first-pinned': '2026-08-01T00:00:00.000Z',
        'second-pinned': '2026-08-02T00:00:00.000Z',
      }

      // second-pinned was pinned more recently, so it sorts first regardless of which chat has
      // the newer updateDate from actual message activity.
      const beforeActivity = buildUnifiedChatSidebarViewModel(
        [firstPinned, secondPinned],
        focusedSettings,
        [],
        pinOrder
      )
      expect(beforeActivity.pinnedChats.map((chat) => chat.id)).toEqual([
        'second-pinned',
        'first-pinned',
      ])

      const firstPinnedAfterUsage = { ...firstPinned, updateDate: '2026-09-01T00:00:00.000Z' }
      const afterActivity = buildUnifiedChatSidebarViewModel(
        [firstPinnedAfterUsage, secondPinned],
        focusedSettings,
        [],
        pinOrder
      )
      expect(afterActivity.pinnedChats.map((chat) => chat.id)).toEqual([
        'second-pinned',
        'first-pinned',
      ])
    })

    it('unpinning a chat preserves the relative order of the remaining pinned chats', () => {
      const chatA = createChat({ id: 'chat-a', pinned: true })
      const chatB = createChat({ id: 'chat-b', pinned: true })
      const chatC = createChat({ id: 'chat-c', pinned: true })
      const pinOrder = {
        'chat-a': '2026-08-01T00:00:00.000Z',
        'chat-b': '2026-08-02T00:00:00.000Z',
        'chat-c': '2026-08-03T00:00:00.000Z',
      }

      const beforeUnpin = buildUnifiedChatSidebarViewModel(
        [chatA, chatB, chatC],
        focusedSettings,
        [],
        pinOrder
      )
      expect(beforeUnpin.pinnedChats.map((chat) => chat.id)).toEqual(['chat-c', 'chat-b', 'chat-a'])

      // Unpinning chat-b removes it from the pinned set (and its pinOrder entry, mirroring
      // pinOrderStore.clearPin) — chat-a and chat-c must keep their prior relative order.
      const chatBUnpinned = { ...chatB, pinned: false }
      const { 'chat-b': _removed, ...pinOrderAfterUnpin } = pinOrder
      const afterUnpin = buildUnifiedChatSidebarViewModel(
        [chatA, chatBUnpinned, chatC],
        focusedSettings,
        [],
        pinOrderAfterUnpin
      )
      expect(afterUnpin.pinnedChats.map((chat) => chat.id)).toEqual(['chat-c', 'chat-a'])
    })

    it('falls back to updateDate for a pinned chat with no recorded pin-order entry', () => {
      const withEntry = createChat({
        id: 'with-entry',
        pinned: true,
        updateDate: '2026-01-01T00:00:00.000Z',
      })
      const withoutEntry = createChat({
        id: 'without-entry',
        pinned: true,
        updateDate: '2026-06-01T00:00:00.000Z',
      })

      const viewModel = buildUnifiedChatSidebarViewModel(
        [withEntry, withoutEntry],
        focusedSettings,
        [],
        {
          'with-entry': '2026-02-01T00:00:00.000Z',
        }
      )

      // without-entry has no pin-order record, so it falls back to its own updateDate
      // (2026-06) which is newer than with-entry's recorded pin (2026-02).
      expect(viewModel.pinnedChats.map((chat) => chat.id)).toEqual(['without-entry', 'with-entry'])
    })
  })

  describe('move order', () => {
    it('a moved chat sorts to the top of its target folder despite an older updateDate', () => {
      const staleMoved = createChat({
        id: 'stale-moved',
        folder: 'Project',
        updateDate: '2026-01-01T00:00:00.000Z',
      })
      const activeResident = createChat({
        id: 'active-resident',
        folder: 'Project',
        updateDate: '2026-06-01T00:00:00.000Z',
      })

      const viewModel = buildUnifiedChatSidebarViewModel(
        [staleMoved, activeResident],
        focusedSettings,
        [],
        {},
        { 'stale-moved': '2026-08-01T00:00:00.000Z' }
      )

      expect(viewModel.foldersToChatsMap['custom:Project'].map((chat) => chat.id)).toEqual([
        'stale-moved',
        'active-resident',
      ])
    })

    it('a moved chat sorts to the top of Recent when moved back to the Chats section', () => {
      const staleMoved = createChat({
        id: 'stale-moved',
        folder: null,
        updateDate: '2026-01-01T00:00:00.000Z',
      })
      const activeChat = createChat({
        id: 'active-chat',
        folder: null,
        updateDate: '2026-06-01T00:00:00.000Z',
      })

      const viewModel = buildUnifiedChatSidebarViewModel(
        [staleMoved, activeChat],
        focusedSettings,
        [],
        {},
        { 'stale-moved': '2026-08-01T00:00:00.000Z' }
      )

      expect(viewModel.recentChats.map((chat) => chat.id)).toEqual(['stale-moved', 'active-chat'])
    })

    it('genuinely newer activity elsewhere in the folder outranks a stale moveOrder entry', () => {
      const movedEarlier = createChat({
        id: 'moved-earlier',
        folder: 'Project',
        updateDate: '2026-01-01T00:00:00.000Z',
      })
      const newlyActive = createChat({
        id: 'newly-active',
        folder: 'Project',
        updateDate: '2026-09-01T00:00:00.000Z',
      })

      const viewModel = buildUnifiedChatSidebarViewModel(
        [movedEarlier, newlyActive],
        focusedSettings,
        [],
        {},
        { 'moved-earlier': '2026-08-01T00:00:00.000Z' }
      )

      // newly-active's real updateDate (Sep) is newer than moved-earlier's frozen moveOrder
      // timestamp (Aug) — normal recency sorting takes back over instead of moveOrder
      // permanently pinning the moved chat to the top.
      expect(viewModel.foldersToChatsMap['custom:Project'].map((chat) => chat.id)).toEqual([
        'newly-active',
        'moved-earlier',
      ])
    })
  })
})

describe('buildFocusedChatSidebarViewModel', () => {
  it('builds an empty registered Assistant Folder without a fake latest chat', () => {
    const viewModel = buildFocusedChatSidebarViewModel([], focusedSettings, [
      { assistant_id: 'assistant-a', name: 'Assistant A', icon_url: '/assistant-a.svg' },
    ])

    expect(viewModel.groups).toEqual([
      {
        id: 'assistant-a',
        name: 'Assistant A',
        chats: [],
        latestChat: undefined,
        iconUrl: '/assistant-a.svg',
        kind: 'assistant',
      },
    ])
  })

  it('keeps a chat with an unresolved assistant in Recent without creating an assistant group', () => {
    const orphanChat = createChat({
      id: 'orphan-chat',
      assistantNames: [],
    })

    const viewModel = buildFocusedChatSidebarViewModel([orphanChat], focusedSettings)

    expect(viewModel.recentChats).toEqual([orphanChat])
    expect(viewModel.groups).toEqual([])
    expect(viewModel.chatLocations[orphanChat.id]).toEqual({ section: 'recent' })
  })

  it('keeps an imported chat with an unknown source out of Focused Recent and assistant groups', () => {
    const importedChat = createChat({
      id: 'unknown-import',
      importSource: null,
      isImported: true,
    })

    const viewModel = buildFocusedChatSidebarViewModel([importedChat], focusedSettings)

    expect(viewModel.recentChats).toEqual([])
    expect(viewModel.groups).toEqual([])
    expect(viewModel.chatLocations[importedChat.id]).toBeUndefined()
  })

  it('uses a registered Assistant Folder name when the chat has no assistant name', () => {
    const chat = createChat({ id: 'registered-chat', assistantNames: [] })
    const folder = {
      assistant_id: 'assistant-a',
      name: 'Registered Assistant',
      icon_url: '/registered.svg',
    }

    const viewModel = buildFocusedChatSidebarViewModel([chat], focusedSettings, [folder])

    expect(viewModel.groups).toEqual([
      expect.objectContaining({
        id: 'assistant-a',
        name: 'Registered Assistant',
        chats: [chat],
        kind: 'assistant',
      }),
    ])
    expect(viewModel.chatLocations[chat.id]).toEqual({
      section: 'assistant',
      assistantId: 'assistant-a',
    })
  })

  it('merges a legacy folder=assistant.name chat into the assistant group instead of a spurious folder group', () => {
    const pollutedChat = createChat({ id: 'polluted-chat', folder: 'Assistant A' })

    const viewModel = buildFocusedChatSidebarViewModel([pollutedChat], focusedSettings)

    expect(viewModel.groups).toEqual([
      expect.objectContaining({ id: 'assistant-a', kind: 'assistant', chats: [pollutedChat] }),
    ])
    expect(viewModel.groups.some((g) => g.kind === 'folder')).toBe(false)
  })

  it('keeps every named folder separate from assistant groups', () => {
    const chats = [
      createChat({ id: 'unfiled-a' }),
      createChat({ id: 'mono-folder-a', folder: 'Mono folder' }),
      createChat({ id: 'mixed-a', folder: 'Mixed folder' }),
      createChat({
        id: 'mixed-b',
        folder: 'Mixed folder',
        assistantIds: ['assistant-b'],
        initialAssistantId: 'assistant-b',
        assistantNames: ['Assistant B'],
      }),
    ]

    const viewModel = buildFocusedChatSidebarViewModel(chats, focusedSettings)
    const assistantGroup = viewModel.groups.find((group) => group.kind === 'assistant')
    const folderGroups = viewModel.groups.filter((group) => group.kind === 'folder')

    expect(viewModel.recentChats).toHaveLength(4)
    expect(assistantGroup?.name).toBe('Assistant A')
    expect(assistantGroup?.chats.map((chat) => chat.id)).toEqual(['unfiled-a'])
    expect(folderGroups).toHaveLength(2)
    expect(folderGroups.find((group) => group.name === 'Mono folder')?.chats).toHaveLength(1)
    expect(folderGroups.find((group) => group.name === 'Mixed folder')?.chats).toHaveLength(2)
  })

  it('keeps a pinned chat as a chat and does not add an annotated assistant row', () => {
    const chats = [
      createChat({ id: 'pinned-a', pinned: true }),
      createChat({ id: 'recent-a', date: '2026-07-29T09:00:00.000Z' }),
    ]

    const viewModel = buildFocusedChatSidebarViewModel(chats, focusedSettings)

    expect(viewModel.pinnedChats.map((chat) => chat.id)).toEqual(['pinned-a'])
    expect(viewModel.groups).toHaveLength(1)
    expect(viewModel.groups[0].chats.map((chat) => chat.id)).toEqual(['recent-a', 'pinned-a'])
    expect(viewModel.recentChats.map((chat) => chat.id)).toEqual(['recent-a'])
  })

  it('shows two pinned folder chats as individual rows without aggregation', () => {
    const chats = [
      createChat({
        id: 'older-pinned',
        folder: 'Project',
        pinned: true,
        date: '2026-07-29T08:00:00.000Z',
      }),
      createChat({
        id: 'newer-pinned',
        folder: 'Project',
        pinned: true,
        date: '2026-07-29T10:00:00.000Z',
      }),
      createChat({
        id: 'recent-in-folder',
        folder: 'Project',
        date: '2026-07-29T09:00:00.000Z',
      }),
    ]

    const viewModel = buildFocusedChatSidebarViewModel(chats, focusedSettings)

    expect(viewModel.pinnedChats.map((chat) => chat.id)).toEqual(['newer-pinned', 'older-pinned'])
    expect(viewModel.chatLocations['newer-pinned']).toEqual({ section: 'pinned' })
    expect(viewModel.chatLocations['older-pinned']).toEqual({ section: 'pinned' })
    expect(viewModel.groups.find((group) => group.name === 'Project')?.chats).toHaveLength(3)
  })

  it('keeps a single pinned folder chat as an individual pinned chat', () => {
    const pinnedChat = createChat({
      id: 'only-pinned',
      folder: 'Project',
      pinned: true,
    })

    const viewModel = buildFocusedChatSidebarViewModel([pinnedChat], focusedSettings)

    expect(viewModel.pinnedChats).toEqual([pinnedChat])
    expect(viewModel.chatLocations[pinnedChat.id]).toEqual({ section: 'pinned' })
  })

  it('does not create an annotated assistant row for a pinned chat without an assistant', () => {
    const pinnedChat = createChat({
      id: 'pinned-without-assistant',
      pinned: true,
      assistantIds: [],
      initialAssistantId: null,
      assistantNames: [''],
    })

    const viewModel = buildFocusedChatSidebarViewModel([pinnedChat], focusedSettings)

    expect(viewModel.pinnedChats).toEqual([pinnedChat])
    expect(viewModel.groups).toEqual([])
  })

  it('keeps workflows as named chats instead of assistant groups', () => {
    const pinnedWorkflow = createChat({
      id: 'pinned-workflow',
      name: 'Deploy workflow run',
      pinned: true,
      isWorkflow: true,
      initialWorkflowId: 'workflow-a',
      assistantIds: ['workflow-a'],
      assistantNames: [''],
    })

    const viewModel = buildFocusedChatSidebarViewModel([pinnedWorkflow], focusedSettings)

    expect(viewModel.pinnedChats).toEqual([pinnedWorkflow])
    expect(viewModel.groups).toEqual([])
  })

  it('keeps a folder containing a workflow as a folder group', () => {
    const folderWorkflow = createChat({
      id: 'folder-workflow',
      name: 'Workflow chat',
      folder: 'Release workflows',
      isWorkflow: true,
      initialWorkflowId: 'workflow-a',
      assistantIds: ['workflow-a'],
      assistantNames: [''],
    })

    const viewModel = buildFocusedChatSidebarViewModel([folderWorkflow], focusedSettings)

    expect(viewModel.groups).toHaveLength(1)
    expect(viewModel.groups[0]).toMatchObject({
      kind: 'folder',
      name: 'Release workflows',
      folderKind: 'workflow',
    })
  })

  it('moves a pinned workflow chat into Pinned instead of Workflows (EPMCDME-15010)', () => {
    const pinnedWorkflow = createChat({
      id: 'pinned-workflow-focused',
      pinned: true,
      isWorkflow: true,
      initialWorkflowId: 'workflow-a',
    })

    const viewModel = buildFocusedChatSidebarViewModel([pinnedWorkflow], {
      ...focusedSettings,
      showWorkflowRunsSeparately: true,
    })

    expect(viewModel.pinnedChats).toEqual([pinnedWorkflow])
    expect(viewModel.workflowChats).toEqual([])
    expect(viewModel.chatLocations[pinnedWorkflow.id]).toEqual({ section: 'pinned' })
  })

  it('excludes workflow chats from Recent and groups when runs are separated', () => {
    const workflowChat = createChat({
      id: 'workflow',
      isWorkflow: true,
      initialWorkflowId: 'workflow-a',
    })

    const viewModel = buildFocusedChatSidebarViewModel([workflowChat], {
      ...focusedSettings,
      showWorkflowRunsSeparately: true,
    })

    expect(viewModel.workflowChats).toEqual([workflowChat])
    expect(viewModel.recentChats).toEqual([])
    expect(viewModel.groups).toEqual([])
  })

  it('sets folderKind on focused folder groups', () => {
    const chats = [
      createChat({ id: 'custom-chat', folder: 'My Project' }),
      createChat({ id: 'import-chat', folder: 'Claude imports' }),
    ]

    const viewModel = buildFocusedChatSidebarViewModel(chats, focusedSettings)
    const folderGroups = viewModel.groups.filter((g) => g.kind === 'folder')

    const customGroup = folderGroups.find((g) => g.name === 'My Project')
    const importGroup = folderGroups.find((g) => g.id === 'legacy-import:Claude Imports')

    expect(customGroup?.folderKind).toBe('custom')
    expect(importGroup?.folderKind).toBe('legacy-import')
  })

  describe('assistantHistory', () => {
    it('includes chats in custom folders for the participating assistant', () => {
      const noFolder = createChat({ id: 'no-folder', folder: null })
      const inFolder = createChat({ id: 'in-folder', folder: 'Project' })

      const viewModel = buildFocusedChatSidebarViewModel([noFolder, inFolder], focusedSettings)
      const history = viewModel.assistantHistory.get('assistant-a')

      expect(history?.map((c) => c.id).sort()).toEqual(['in-folder', 'no-folder'])
    })

    it('groups aggregate only contains the no-folder chat; history contains both', () => {
      const noFolder = createChat({ id: 'no-folder', folder: null })
      const inFolder = createChat({ id: 'in-folder', folder: 'Project' })

      const viewModel = buildFocusedChatSidebarViewModel([noFolder, inFolder], focusedSettings)
      const assistantGroup = viewModel.groups.find((g) => g.kind === 'assistant')

      expect(assistantGroup?.chats.map((c) => c.id)).toEqual(['no-folder'])
      expect(
        viewModel.assistantHistory
          .get('assistant-a')
          ?.map((c) => c.id)
          .sort()
      ).toEqual(['in-folder', 'no-folder'])
    })

    it('includes secondary participation in group chats', () => {
      const groupChat = createChat({
        id: 'group-chat',
        isGroup: true,
        assistantIds: ['assistant-a', 'assistant-b'],
        initialAssistantId: 'assistant-b',
        assistantNames: ['Assistant A', 'Assistant B'],
      })

      const viewModel = buildFocusedChatSidebarViewModel([groupChat], focusedSettings)

      expect(viewModel.assistantHistory.get('assistant-a')?.map((c) => c.id)).toEqual([
        'group-chat',
      ])
      expect(viewModel.assistantHistory.get('assistant-b')?.map((c) => c.id)).toEqual([
        'group-chat',
      ])
    })

    it('excludes workflow chats from assistantHistory', () => {
      const workflow = createChat({
        id: 'wf',
        isWorkflow: true,
        initialWorkflowId: 'workflow-a',
        assistantIds: ['workflow-a'],
      })

      const viewModel = buildFocusedChatSidebarViewModel([workflow], focusedSettings)

      expect(viewModel.assistantHistory.get('workflow-a')).toBeUndefined()
    })
  })
})
