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

import { getChatImportSource } from '@/constants/chatImportSources'
import { ChatListItem, FolderListItem } from '@/types/entity/conversation'

export { getChatBEMessageIndex } from '@/utils/chatHelpers'

export const transformChatListItemDTO = (dto: any): ChatListItem => {
  const folder = dto.folder || null
  const importSource = getChatImportSource(folder)

  return {
    id: dto.id,
    name: dto.name ?? null,
    folder,
    pinned: dto.pinned ?? false,
    date: dto.date,
    updateDate: dto.update_date ?? undefined,
    assistantIds: dto.assistant_ids ?? [],
    initialAssistantId: dto.initial_assistant_id ?? null,
    initialWorkflowId: dto.workflow_id ?? null,
    isGroup: (dto.assistant_ids?.length ?? 0) > 1,
    isWorkflow: dto.is_workflow_conversation ?? dto.is_workflow ?? false,
    iconUrl: dto.assistant_icon ?? importSource?.iconUrl ?? null,
    assistantNames:
      dto.assistant_names?.length || !importSource
        ? dto.assistant_names ?? []
        : [importSource.name],
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
    name: dto.folder_name ?? '',
    userId: dto.user_id,
    userAbilities: dto.user_abilities ?? [],
  }
}

export const transformFolderListItemsDTOs = (dtos: any[]): FolderListItem[] => {
  return (dtos ?? []).map(transformFolderListItemDTO)
}
