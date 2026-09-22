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
import type { ChatListItem } from '@/types/entity/conversation'

import { getAssistantIdentity, isAssistantNameFolder } from './chatSidebarCollectionHelpers'
import {
  importGroupKey,
  isImportedChat,
  resolveImportGroupIdentity,
} from './chatSidebarFolderHelpers'

import type { FocusedChatGroupMap } from './chatSidebarCollectionHelpers'
import type { ChatSidebarLocation, UnifiedChatViewSettings } from './chatSidebarTypes'

export interface FocusedChatCollections {
  pinnedChats: ChatListItem[]
  recentChats: ChatListItem[]
  workflowChats: ChatListItem[]
  assistantChats: FocusedChatGroupMap
  sourceFolderChats: Map<string, ChatListItem[]>
  chatLocations: Record<string, ChatSidebarLocation>
}

const addToGroup = (groups: FocusedChatGroupMap, id: string, name: string, chat: ChatListItem) => {
  const group = groups.get(id) ?? { name, chats: [] }
  group.chats.push(chat)
  groups.set(id, group)
}

const addToFolder = (folders: Map<string, ChatListItem[]>, key: string, chat: ChatListItem) => {
  const group = folders.get(key) ?? []
  group.push(chat)
  folders.set(key, group)
}

const collectListMembership = (
  chat: ChatListItem,
  settings: UnifiedChatViewSettings,
  collections: FocusedChatCollections
) => {
  if (chat.pinned) {
    collections.pinnedChats.push(chat)
    collections.chatLocations[chat.id] = { section: 'pinned' }
    return
  }
  if (settings.showWorkflowRunsSeparately && chat.isWorkflow) {
    collections.workflowChats.push(chat)
    collections.chatLocations[chat.id] = { section: 'workflow-runs' }
    return
  }
  if (!isImportedChat(chat)) collections.recentChats.push(chat)
}

const collectAssistant = (
  collections: FocusedChatCollections,
  chat: ChatListItem,
  registeredNames: ReadonlyMap<string, string>
) => {
  const assistant = getAssistantIdentity(chat, registeredNames)
  if (!assistant) {
    if (!chat.pinned) collections.chatLocations[chat.id] = { section: 'recent' }
    return
  }
  addToGroup(collections.assistantChats, assistant.id, assistant.name, chat)
  if (!chat.pinned) {
    collections.chatLocations[chat.id] = { section: 'assistant', assistantId: assistant.id }
  }
}

export const collectFocusedChats = (
  chats: ChatListItem[],
  settings: UnifiedChatViewSettings,
  registeredNames: ReadonlyMap<string, string>
): FocusedChatCollections => {
  const collections: FocusedChatCollections = {
    pinnedChats: [],
    recentChats: [],
    workflowChats: [],
    assistantChats: new Map(),
    sourceFolderChats: new Map(),
    chatLocations: {},
  }
  for (const chat of chats) {
    collectListMembership(chat, settings, collections)
    if (chat.folder === AVATAR_CHAT_FOLDER) {
      addToFolder(collections.sourceFolderChats, AVATAR_CHAT_FOLDER, chat)
      continue
    }
    const importIdentity = resolveImportGroupIdentity(chat)
    if (importIdentity) {
      addToFolder(collections.sourceFolderChats, importGroupKey(importIdentity), chat)
      continue
    }
    if (isImportedChat(chat)) continue
    const assistant = getAssistantIdentity(chat, registeredNames)
    if (chat.folder && !isAssistantNameFolder(chat.folder, assistant)) {
      addToFolder(collections.sourceFolderChats, chat.folder, chat)
      continue
    }
    if (!chat.isWorkflow) collectAssistant(collections, chat, registeredNames)
  }
  return collections
}
