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

import { isValidImportSourceKind, resolveImportDisplay } from '@/constants/chatImportSources'
import { ChatListItem, FolderListItem } from '@/types/entity/conversation'

export { getChatBEMessageIndex } from '@/utils/chatHelpers'

const isLegacyAssistantFolder = (dto: any): boolean => {
  if (!dto.folder || !dto.initial_assistant_id) return false
  const assistantIds: string[] = dto.assistant_ids ?? []
  const idx = assistantIds.indexOf(dto.initial_assistant_id)
  if (idx < 0) return false
  const primaryName = dto.assistant_names?.[idx]
  return typeof primaryName === 'string' && primaryName.length > 0 && dto.folder === primaryName
}

export const transformChatListItemDTO = (dto: any): ChatListItem => {
  const rawFolder = dto.folder || null
  const folder = isLegacyAssistantFolder(dto) ? null : rawFolder
  const importSource = isValidImportSourceKind(dto.import_source) ? dto.import_source : null
  const isImported = typeof dto.import_source === 'string' && dto.import_source.trim().length > 0
  const displaySource = resolveImportDisplay({ importSource, folder })
  const isWorkflow = dto.is_workflow_conversation ?? dto.is_workflow ?? false
  // The list-serialization endpoints derive `workflow_id` from `initial_assistant_id` server-side
  // (rest_api/models/conversation.py: `workflow_id=row.initial_assistant_id if is_workflow else
  // None`), but the conversation-creation response (POST /v1/conversations) returns the raw
  // Conversation row, which has no `workflow_id` field at all. Without this fallback, a
  // just-created workflow chat has `initialWorkflowId: null` until the next list refetch, which
  // made isWorkflowAssociatedFolder (EPMCDME-15012) misclassify its folder as custom in that
  // window — mirror the same derivation here so it's correct from the first render.
  const initialWorkflowId =
    dto.workflow_id ?? (isWorkflow ? dto.initial_assistant_id ?? null : null)

  return {
    id: dto.id,
    name: dto.name ?? null,
    folder,
    pinned: dto.pinned ?? false,
    date: dto.date,
    updateDate: dto.update_date ?? undefined,
    assistantIds: dto.assistant_ids ?? [],
    initialAssistantId: dto.initial_assistant_id ?? null,
    initialWorkflowId,
    isGroup: (dto.assistant_ids?.length ?? 0) > 1,
    isWorkflow,
    iconUrl: dto.assistant_icon ?? displaySource?.iconUrl ?? null,
    importSource,
    isImported,
    assistantNames:
      dto.assistant_names?.length || !displaySource
        ? dto.assistant_names ?? []
        : [displaySource.name],
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
