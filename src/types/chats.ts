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

export type ChatExportFormat = 'docx' | 'pdf' | 'pptx' | 'json'

export interface AssistantFolderListItem {
  assistant_id: string
  name: string
  icon_url?: string | null
}

export type AssistantFolderDeleteAction = 'delete_chats_only' | 'delete_folder_and_chats'

export interface AssistantFolderDeleteResponse {
  deleted_conversation_ids: string[]
  folder_deleted: boolean
}

export interface SearchResultItem {
  id: string // Assistant, chat, or folder ID
  name: string // Assistant, chat, or folder name
  updated_at: string | null // ISO timestamp when the result has one
  type: 'assistant' | 'chat' | 'folder' // Discriminator
  folder?: string // Parent folder name (for chats only)
  icon_url?: string | null // Assistant avatar (for assistant results only)
}

export interface SearchResults {
  items: SearchResultItem[] // Combined assistants, chats, and folders (up to 20 per type)
}

export interface SearchHistoryItem {
  value: string // The search query string
  searchedAt: string // ISO timestamp for sorting/cleanup
}

// ===== Recent Chats =====

export interface RecentChat {
  id: string
  name: string
  folder?: string
  openedAt: string
}

export type TimePeriod = 'today' | 'last7Days' | 'last30Days' | 'earlier'

export interface GroupedRecentChats {
  today: RecentChat[]
  last7Days: RecentChat[]
  last30Days: RecentChat[]
  earlier: RecentChat[]
}

export interface TimePeriodLabel {
  label: string
  key: TimePeriod
}
