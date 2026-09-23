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

import {
  getLegacyImportGroupName,
  IMPORT_SOURCE_DISPLAY,
  ImportSourceKind,
} from '@/constants/chatImportSources'
import { AVATAR_CHAT_FOLDER } from '@/constants/chats'
import type { ChatListItem } from '@/types/entity/conversation'

import type { FolderKind } from './chatSidebarTypes'

export type ImportGroupIdentity =
  | { kind: 'import'; source: ImportSourceKind }
  | { kind: 'legacy-import'; folderName: string }

export const importGroupKey = (identity: ImportGroupIdentity): string =>
  identity.kind === 'import' ? `import:${identity.source}` : `legacy-import:${identity.folderName}`

export const resolveImportGroupIdentity = (chat: ChatListItem): ImportGroupIdentity | null => {
  if (chat.importSource != null) return { kind: 'import', source: chat.importSource }
  const legacyGroupName = getLegacyImportGroupName(chat.folder)
  return legacyGroupName ? { kind: 'legacy-import', folderName: legacyGroupName } : null
}

/** Import capability check. Unknown backend sources stay ungrouped but remain read-only. */
export const isImportedChat = (chat: ChatListItem): boolean =>
  chat.isImported === true || resolveImportGroupIdentity(chat) != null

export const assistantFolderKey = (assistantId: string): string => `assistant:${assistantId}`
export const customFolderKey = (folderName: string): string => `custom:${folderName}`

export const getAssistantIdFromFolderKey = (key: string): string | null =>
  key.startsWith('assistant:') ? key.slice('assistant:'.length) : null

export const getCustomFolderNameFromKey = (key: string): string | null =>
  key.startsWith('custom:') ? key.slice('custom:'.length) : null

export const sidebarFolderKeyFromName = (folderName: string): string => {
  if (folderName === AVATAR_CHAT_FOLDER) return folderName
  const legacyGroupName = getLegacyImportGroupName(folderName)
  return legacyGroupName ? `legacy-import:${legacyGroupName}` : customFolderKey(folderName)
}

/**
 * True when every chat in the folder belongs to the same workflow (EPMCDME-15012). Workflow runs
 * are created with `folder` set to the workflow's own name, the same pollution pattern
 * `isAssistantNameFolder` handles for assistants — but there is no assistant identity to match
 * against here, so the folder's own chat membership is the only available signal. Requiring a
 * single shared `initialWorkflowId` (not just `isWorkflow`) keeps a real custom folder holding
 * chats from several different workflows classified as custom.
 */
export const isWorkflowAssociatedFolder = (chats: ChatListItem[]): boolean => {
  if (chats.length === 0 || !chats.every((chat) => chat.isWorkflow)) return false
  const workflowIds = new Set(chats.map((chat) => chat.initialWorkflowId))
  const [id] = workflowIds
  return workflowIds.size === 1 && id != null && id !== ''
}

export const getFolderKindFromKey = (key: string): FolderKind => {
  if (key.startsWith('assistant:')) return 'assistant'
  if (key.startsWith('custom:')) return 'custom'
  if (key === AVATAR_CHAT_FOLDER) return 'legacy-avatar'
  if (key.startsWith('import:')) return 'import'
  if (key.startsWith('legacy-import:') || getLegacyImportGroupName(key)) return 'legacy-import'
  return 'custom'
}

export const classifyFolderListItemName = (name: string): { key: string; kind: FolderKind } => {
  const key = sidebarFolderKeyFromName(name)
  return { key, kind: getFolderKindFromKey(key) }
}

export const getFolderDisplayName = (key: string): string => {
  if (key.startsWith('custom:')) return key.slice('custom:'.length)
  if (key.startsWith('import:')) {
    const source = key.slice('import:'.length) as ImportSourceKind
    return IMPORT_SOURCE_DISPLAY[source]?.name ?? key
  }
  if (key.startsWith('legacy-import:')) {
    const folderName = key.slice('legacy-import:'.length)
    return getLegacyImportGroupName(folderName) ?? folderName
  }
  return key
}
