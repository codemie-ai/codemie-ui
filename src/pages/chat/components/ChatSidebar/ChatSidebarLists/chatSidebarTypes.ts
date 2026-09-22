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

import type { ChatViewSettings } from '@/store/chatViewSettings'
import type { ChatListItem } from '@/types/entity/conversation'

export type FolderKind =
  | 'assistant'
  | 'custom'
  | 'import'
  | 'legacy-import'
  | 'legacy-avatar'
  | 'workflow'

export type UnifiedChatViewSettings = Pick<
  ChatViewSettings,
  'showRecentAssistants' | 'showWorkflowRunsSeparately'
>

export type ChatSidebarSection =
  | 'hidden'
  | 'pinned'
  | 'recent'
  | 'workflow-runs'
  | 'assistant'
  | 'folder'

export interface ChatSidebarLocation {
  section: ChatSidebarSection
  assistantId?: string
  folderName?: string
}

export interface UnifiedChatSidebarViewModel {
  pinnedChats: ChatListItem[]
  recentChats: ChatListItem[]
  workflowChats: ChatListItem[]
  foldersToChatsMap: Record<string, ChatListItem[]>
  folderLabels: Record<string, string>
  chatLocations: Record<string, ChatSidebarLocation>
}

export interface ChatSidebarAggregate {
  id: string
  name: string
  chats: ChatListItem[]
  latestChat?: ChatListItem
  iconUrl?: string | null
}

export interface FocusedChatSidebarAggregate extends ChatSidebarAggregate {
  kind: 'assistant' | 'folder'
  folderKind?: FolderKind
}

export interface FocusedChatSidebarViewModel {
  pinnedChats: ChatListItem[]
  recentChats: ChatListItem[]
  workflowChats: ChatListItem[]
  groups: FocusedChatSidebarAggregate[]
  chatLocations: Record<string, ChatSidebarLocation>
  assistantHistory: Map<string, ChatListItem[]>
}
