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
import type { ChatListItem } from '@/types/entity/conversation'

import {
  getAssistantIdentity,
  getValidDateTimestamp,
  isAssistantNameFolder,
  sortChatsByMostRecent,
} from './chatSidebarCollectionHelpers'
import {
  assistantFolderKey,
  customFolderKey,
  importGroupKey,
  isImportedChat,
  resolveImportGroupIdentity,
} from './chatSidebarFolderHelpers'

import type {
  ChatSidebarLocation,
  UnifiedChatSidebarViewModel,
  UnifiedChatViewSettings,
} from './chatSidebarTypes'

const getChatLocation = (
  chat: ChatListItem,
  settings: UnifiedChatViewSettings
): ChatSidebarLocation | null => {
  if (chat.pinned) return { section: 'pinned' }
  if (settings.showWorkflowRunsSeparately && chat.isWorkflow) return { section: 'workflow-runs' }
  if (chat.folder === AVATAR_CHAT_FOLDER) {
    return { section: 'folder', folderName: AVATAR_CHAT_FOLDER }
  }
  const importIdentity = resolveImportGroupIdentity(chat)
  if (importIdentity) return { section: 'folder', folderName: importGroupKey(importIdentity) }
  return isImportedChat(chat) ? null : { section: 'recent' }
}

const getFolderKey = (
  chat: ChatListItem,
  registeredNames: ReadonlyMap<string, string>,
  folderLabels: Record<string, string>
) => {
  if (chat.folder === AVATAR_CHAT_FOLDER) return AVATAR_CHAT_FOLDER
  const importIdentity = resolveImportGroupIdentity(chat)
  if (importIdentity) return importGroupKey(importIdentity)
  if (isImportedChat(chat)) return null
  const assistant = getAssistantIdentity(chat, registeredNames)
  if (chat.folder && !isAssistantNameFolder(chat.folder, assistant)) {
    return customFolderKey(chat.folder)
  }
  if (!assistant) return null
  const key = assistantFolderKey(assistant.id)
  folderLabels[key] = assistant.name
  return key
}

const addChatToSection = (
  viewModel: UnifiedChatSidebarViewModel,
  chat: ChatListItem,
  location: ChatSidebarLocation
) => {
  if (location.section === 'workflow-runs') viewModel.workflowChats.push(chat)
  else if (location.section === 'pinned') viewModel.pinnedChats.push(chat)
  else if (location.section === 'recent') viewModel.recentChats.push(chat)
}

const sortPinnedByPinOrder = (chats: ChatListItem[], pinOrder: Record<string, string>) => {
  chats.sort((a, b) => {
    const aTs = getValidDateTimestamp(pinOrder[a.id]) || getValidDateTimestamp(a.updateDate, a.date)
    const bTs = getValidDateTimestamp(pinOrder[b.id]) || getValidDateTimestamp(b.updateDate, b.date)
    return bTs - aTs
  })
}

// Recent/folder lists must keep reflecting real activity, unlike Pinned — so a move only wins
// the sort until something genuinely newer happens (max, not override): right after a move the
// recorded moveOrder timestamp is the newest thing about the chat, so it sorts first; once real
// usage produces a newer updateDate, that naturally takes over again.
const sortByRecencyWithMoveOrder = (chats: ChatListItem[], moveOrder: Record<string, string>) => {
  chats.sort((a, b) => {
    const aTs = Math.max(
      getValidDateTimestamp(a.updateDate, a.date),
      getValidDateTimestamp(moveOrder[a.id])
    )
    const bTs = Math.max(
      getValidDateTimestamp(b.updateDate, b.date),
      getValidDateTimestamp(moveOrder[b.id])
    )
    return bTs - aTs
  })
}

export const buildUnifiedChatSidebarViewModel = (
  chats: ChatListItem[],
  settings: UnifiedChatViewSettings,
  assistantFolders: AssistantFolderListItem[] = [],
  pinOrder: Record<string, string> = {},
  moveOrder: Record<string, string> = {}
): UnifiedChatSidebarViewModel => {
  const viewModel: UnifiedChatSidebarViewModel = {
    pinnedChats: [],
    recentChats: [],
    workflowChats: [],
    foldersToChatsMap: {},
    folderLabels: {},
    chatLocations: {},
  }
  const registeredNames = new Map(
    assistantFolders.map((folder) => [folder.assistant_id, folder.name])
  )
  for (const folder of assistantFolders) {
    const key = assistantFolderKey(folder.assistant_id)
    viewModel.foldersToChatsMap[key] = []
    viewModel.folderLabels[key] = folder.name
  }
  for (const chat of chats) {
    const location = getChatLocation(chat, settings)
    if (location) viewModel.chatLocations[chat.id] = location
    const folderKey = getFolderKey(chat, registeredNames, viewModel.folderLabels)
    if (folderKey) {
      viewModel.foldersToChatsMap[folderKey] ??= []
      viewModel.foldersToChatsMap[folderKey].push(chat)
    }
    if (location) addChatToSection(viewModel, chat, location)
  }

  sortPinnedByPinOrder(viewModel.pinnedChats, pinOrder)
  sortByRecencyWithMoveOrder(viewModel.recentChats, moveOrder)
  sortChatsByMostRecent(viewModel.workflowChats)
  for (const folderChats of Object.values(viewModel.foldersToChatsMap)) {
    sortByRecencyWithMoveOrder(folderChats, moveOrder)
  }
  return viewModel
}
