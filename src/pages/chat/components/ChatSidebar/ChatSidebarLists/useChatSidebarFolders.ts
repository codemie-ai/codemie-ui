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

import { useCallback, useMemo, useState } from 'react'

import { ChatListItem, FolderListItem } from '@/types/entity/conversation'

import {
  classifyFolderListItemName,
  FolderKind,
  getFolderKindFromKey,
  getValidDateTimestamp,
  isWorkflowAssociatedFolder,
  sidebarFolderKeyFromName,
} from './chatSidebarListsHelpers'

interface UseChatSidebarFoldersParams {
  chatFolders: readonly FolderListItem[]
  foldersToChatsMap: Record<string, ChatListItem[]>
}

export const useChatSidebarFolders = ({
  chatFolders,
  foldersToChatsMap,
}: UseChatSidebarFoldersParams) => {
  const [activeFolders, setActiveFolders] = useState<string[]>([])

  const setActiveFolder = useCallback((folder: string | null) => {
    setActiveFolders((current) => {
      if (folder === null) return []
      return current.includes(folder) ? current : [...current, folder]
    })
  }, [])

  const folders = useMemo(() => {
    // Deduplicate named folder keys; Set preserves insertion order, keeping the
    // first occurrence of any legacy-import alias (safe: aliases share the same key).
    const namedFolderKeys = Array.from(
      new Set(
        chatFolders
          .map((folder) => classifyFolderListItemName(folder.name))
          .filter(({ key, kind }) => {
            if (kind !== 'import' && kind !== 'legacy-import') return true
            return (foldersToChatsMap[key] ?? []).length > 0
          })
          .map(({ key }) => key)
      )
    )
    const namedFolderSet = new Set(namedFolderKeys)
    const additionalFolderKeys = Object.keys(foldersToChatsMap).filter(
      (key) => !namedFolderSet.has(key)
    )
    // Build a per-key timestamp map for empty-folder fallback. Multiple legacy
    // alias names may map to the same key; take the max to avoid stale ordering.
    const folderTimestampMap = new Map<string, number>()
    for (const folder of chatFolders) {
      const key = sidebarFolderKeyFromName(folder.name)
      const ts = getValidDateTimestamp(folder.updateDate, folder.date)
      folderTimestampMap.set(key, Math.max(folderTimestampMap.get(key) ?? 0, ts))
    }
    const rankFolder = (key: string): [number, number] => {
      const chats = foldersToChatsMap[key] ?? []
      if (chats.length === 0) return [1, folderTimestampMap.get(key) ?? 0]
      const chatTs = chats.reduce(
        (max, chat) => Math.max(max, getValidDateTimestamp(chat.updateDate, chat.date)),
        0
      )
      return [0, chatTs]
    }
    const allFolderKeys = [...namedFolderKeys, ...additionalFolderKeys]
    const ranks = new Map(allFolderKeys.map((key) => [key, rankFolder(key)] as const))
    return allFolderKeys.sort((a, b) => {
      const [groupA, tsA] = ranks.get(a) ?? [1, 0]
      const [groupB, tsB] = ranks.get(b) ?? [1, 0]
      return groupA - groupB || tsB - tsA || a.localeCompare(b)
    })
  }, [chatFolders, foldersToChatsMap])

  const folderKinds = useMemo(
    () =>
      Object.fromEntries(
        folders.map((name) => {
          const kind = getFolderKindFromKey(name)
          const resolvedKind =
            kind === 'custom' && isWorkflowAssociatedFolder(foldersToChatsMap[name] ?? [])
              ? 'workflow'
              : kind
          return [name, resolvedKind]
        })
      ) as Record<string, FolderKind>,
    [folders, foldersToChatsMap]
  )

  const activeFolderIndices = useMemo(
    () =>
      activeFolders
        .map((activeFolder) => folders.findIndex((folder) => folder === activeFolder))
        .filter((index) => index >= 0),
    [activeFolders, folders]
  )

  return {
    folders,
    folderKinds,
    activeFolderIndices,
    setActiveFolder,
    setActiveFolders,
  }
}
