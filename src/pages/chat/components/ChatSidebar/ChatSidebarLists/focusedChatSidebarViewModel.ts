// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { AVATAR_CHAT_FOLDER } from '@/constants/chats'
import type { AssistantFolderListItem } from '@/types/chats'
import type { ChatListItem, FolderListItem } from '@/types/entity/conversation'

import {
  buildAggregates,
  getValidDateTimestamp,
  sortChatsByMostRecent,
} from './chatSidebarCollectionHelpers'
import {
  classifyFolderListItemName,
  getFolderKindFromKey,
  isWorkflowAssociatedFolder,
} from './chatSidebarFolderHelpers'
import { collectFocusedChats } from './focusedChatSidebarCollections'

import type { FocusedChatGroupMap } from './chatSidebarCollectionHelpers'
import type {
  ChatSidebarLocation,
  FocusedChatSidebarAggregate,
  FocusedChatSidebarViewModel,
  UnifiedChatViewSettings,
} from './chatSidebarTypes'

const buildFolderGroups = (
  sourceFolders: Map<string, ChatListItem[]>,
  locations: Record<string, ChatSidebarLocation>
) => {
  const folders: FocusedChatGroupMap = new Map()
  for (const [name, chats] of sourceFolders) {
    folders.set(name, { name, chats })
    for (const chat of chats) {
      if (!chat.pinned && locations[chat.id]?.section !== 'workflow-runs') {
        locations[chat.id] = { section: 'folder', folderName: name }
      }
    }
  }
  return folders
}

const buildAssistantHistory = (chats: ChatListItem[]) => {
  const history = new Map<string, ChatListItem[]>()
  for (const chat of chats) {
    if (chat.isWorkflow) continue
    const ids = new Set<string>()
    if (chat.initialAssistantId) ids.add(chat.initialAssistantId)
    for (const id of chat.assistantIds ?? []) if (id) ids.add(id)
    for (const id of ids) {
      const group = history.get(id) ?? []
      group.push(chat)
      history.set(id, group)
    }
  }
  for (const group of history.values()) sortChatsByMostRecent(group)
  return history
}

const buildGroups = (assistants: FocusedChatGroupMap, folders: FocusedChatGroupMap) => {
  const assistantGroups: FocusedChatSidebarAggregate[] = buildAggregates(assistants).map(
    (group) => ({
      ...group,
      kind: 'assistant',
    })
  )
  const folderGroups: FocusedChatSidebarAggregate[] = buildAggregates(folders).map((group) => {
    const kind = getFolderKindFromKey(group.id)
    const folderKind =
      kind === 'custom' && isWorkflowAssociatedFolder(group.chats) ? 'workflow' : kind
    return { ...group, kind: 'folder', folderKind }
  })
  return [...assistantGroups, ...folderGroups].sort(
    (a, b) =>
      getValidDateTimestamp(b.latestChat?.updateDate, b.latestChat?.date) -
        getValidDateTimestamp(a.latestChat?.updateDate, a.latestChat?.date) ||
      a.name.localeCompare(b.name)
  )
}

export const buildFocusedChatSidebarViewModel = (
  chats: ChatListItem[],
  settings: UnifiedChatViewSettings,
  assistantFolders: AssistantFolderListItem[] = [],
  chatFolders: FolderListItem[] = []
): FocusedChatSidebarViewModel => {
  const registeredNames = new Map(
    assistantFolders.map((folder) => [folder.assistant_id, folder.name])
  )
  const collections = collectFocusedChats(chats, settings, registeredNames)
  for (const folder of assistantFolders) {
    const existing = collections.assistantChats.get(folder.assistant_id)
    collections.assistantChats.set(folder.assistant_id, {
      name: folder.name,
      chats: existing?.chats ?? [],
      iconUrl: folder.icon_url,
    })
  }
  // A chatFolders entry created via "Create Folder" has no chats yet, so collectFocusedChats
  // above never sees it — it only walks `chats`, not the folder registry. Synthesize an empty
  // group for it here, deduped against every chat's own raw `chat.folder` value (not against
  // sourceFolderChats' keys, which are prefixed for import/legacy-import groups and thus never
  // match a plain custom-folder name — see EPMCDME-15206 plan Task 2).
  const chatFolderNames = new Set(
    chats.map((chat) => chat.folder).filter((name): name is string => !!name)
  )
  for (const folder of chatFolders) {
    if (folder.name === AVATAR_CHAT_FOLDER) continue
    if (classifyFolderListItemName(folder.name).kind !== 'custom') continue
    if (chatFolderNames.has(folder.name)) continue
    collections.sourceFolderChats.set(folder.name, [])
  }
  const folders = buildFolderGroups(collections.sourceFolderChats, collections.chatLocations)
  sortChatsByMostRecent(collections.pinnedChats)
  sortChatsByMostRecent(collections.recentChats)
  sortChatsByMostRecent(collections.workflowChats)
  return {
    pinnedChats: collections.pinnedChats,
    recentChats: collections.recentChats,
    workflowChats: collections.workflowChats,
    groups: buildGroups(collections.assistantChats, folders),
    chatLocations: collections.chatLocations,
    assistantHistory: buildAssistantHistory(chats),
  }
}
