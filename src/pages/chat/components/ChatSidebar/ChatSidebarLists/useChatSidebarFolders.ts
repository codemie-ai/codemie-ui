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

import { useCallback, useMemo, useRef, useState } from 'react'

import { ChatListItem, FolderListItem } from '@/types/entity/conversation'

import {
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
  // Remembers the last computed sort timestamp per folder key across renders. When a folder's
  // last chat is removed, its position must not immediately recompute from an empty state (that
  // would drop it — most visibly for Assistant Folders and import groups, which have no entity
  // date to fall back to); it should stay wherever it last was until some other folder's real
  // activity naturally triggers a re-sort (EPMCDME-15009 reopened AC).
  const lastKnownTimestamps = useRef(new Map<string, number>())

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
      new Set(chatFolders.map((folder) => sidebarFolderKeyFromName(folder.name)))
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
    // Sort all folder keys by latest chat activity (descending).
    // foldersToChatsMap entries are pre-sorted by sortChatsByMostRecent, so [0]
    // is always the most-recent chat; fall back to the folder's own timestamp so
    // empty folders sort alongside non-empty ones, not always last.
    const latestChatTimestamp = (key: string): number => {
      const entityTs = folderTimestampMap.get(key) ?? 0
      const chats = foldersToChatsMap[key] ?? []
      if (chats.length === 0) {
        // No chats right now — reuse whatever this folder last sorted at instead of
        // recomputing from scratch, so losing its last chat doesn't move it.
        return lastKnownTimestamps.current.get(key) ?? entityTs
      }
      const chatTs = chats.reduce(
        (max, chat) => Math.max(max, getValidDateTimestamp(chat.updateDate, chat.date)),
        0
      )
      const ts = Math.max(entityTs, chatTs)
      lastKnownTimestamps.current.set(key, ts)
      return ts
    }
    return [...namedFolderKeys, ...additionalFolderKeys].sort(
      (a, b) => latestChatTimestamp(b) - latestChatTimestamp(a) || a.localeCompare(b)
    )
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
