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

import { ROLE_ASSISTANT } from '@/constants'
import { Conversation, ChatListItem, FolderListItem } from '@/types/entity/conversation'

export const transformChatListItemDTO = (dto: any): ChatListItem => {
  return {
    id: dto.id,
    name: dto.name ?? null,
    folder: dto.folder ?? null,
    pinned: dto.pinned ?? false,
    date: dto.date,
    assistantIds: dto.assistant_ids ?? [],
    initialAssistantId: dto.initial_assistant_id ?? null,
    isGroup: false,
    isWorkflow: dto.is_workflow_conversation ?? dto.is_workflow ?? false,
  }
}

export const transformChatListItemDTOs = (dtos: any[]): ChatListItem[] => {
  return (dtos ?? []).map?.(transformChatListItemDTO)
}

export const transformFolderListItemDTO = (dto: any): FolderListItem => {
  return {
    id: dto.id,
    date: dto.date,
    updateDate: dto.update_date ?? dto.date,
    name: dto.folder_name,
    userId: dto.user_id,
    userAbilities: dto.user_abilities ?? [],
  }
}

export const transformFolderListItemsDTOs = (dtos: any[]): FolderListItem[] => {
  return (dtos ?? []).map(transformFolderListItemDTO)
}

export const getChatBEMessageIndex = (
  chat: Conversation,
  historyIndexFE: number,
  messageIndexFE: number,
  role = ROLE_ASSISTANT
) => {
  // Early return if chat or history is empty
  if (!chat || !chat.history || chat.history.length === 0) return -1

  // Create a flattened copy of the chat history and sort by date
  const sortedFlatHistory = [...chat.history]
    .flat()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // If historyIndex is out of bounds, return -1
  if (historyIndexFE < 0 || historyIndexFE >= chat.history.length) return -1

  // If messageIndex is out of bounds, return -1
  if (messageIndexFE < 0 || messageIndexFE >= chat.history[historyIndexFE].length) return -1

  // Get the message from FE indexing
  const targetMessage = chat.history[historyIndexFE][messageIndexFE]

  // Find this message in the sorted flat array by comparing essential properties
  // Using date as the primary identifier since it should be unique
  const relativeIndex = sortedFlatHistory.findIndex(
    (msg) => msg.createdAt === targetMessage.createdAt && msg.message === targetMessage.message
  )

  if (role === ROLE_ASSISTANT) {
    return relativeIndex * 2 + 1
  }
  return relativeIndex * 2
}
