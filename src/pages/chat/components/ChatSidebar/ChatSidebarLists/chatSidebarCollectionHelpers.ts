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

import type { ChatListItem } from '@/types/entity/conversation'

import type { ChatSidebarAggregate } from './chatSidebarTypes'

export type FocusedChatGroupMap = Map<
  string,
  { name: string; chats: ChatListItem[]; iconUrl?: string | null }
>

export const getValidDateTimestamp = (...values: (string | null | undefined)[]) => {
  for (const value of values) {
    if (!value) continue
    const timestamp = Date.parse(value)
    if (!Number.isNaN(timestamp)) return timestamp
  }
  return 0
}

export const sortChatsByMostRecent = (chats: ChatListItem[]) => {
  chats.sort(
    (a, b) =>
      getValidDateTimestamp(b.updateDate, b.date) - getValidDateTimestamp(a.updateDate, a.date)
  )
}

export const getAssistantIdentity = (
  chat: ChatListItem,
  registeredAssistantNames: ReadonlyMap<string, string> = new Map()
) => {
  if (chat.isWorkflow) return null
  const assistantIds = chat.assistantIds ?? []
  const assistantId = chat.initialAssistantId?.trim() || assistantIds.find((id) => id.trim())
  if (!assistantId) return null
  const initialAssistantIndex = chat.initialAssistantId
    ? assistantIds.indexOf(chat.initialAssistantId)
    : -1
  const candidate =
    (initialAssistantIndex >= 0 ? chat.assistantNames?.[initialAssistantIndex] : undefined) ??
    chat.assistantNames?.find((name) => name.trim())
  const name = registeredAssistantNames.get(assistantId)?.trim() || candidate?.trim()
  return name ? { id: assistantId, name } : null
}

/**
 * True when `folderName` is legacy-polluted data — a folder created by sending the
 * assistant's own name as the folder argument (see EPMCDME-13270 §2.1/§3.3.3). Such a
 * chat must fall through to Assistant Folder classification instead of Custom Folder,
 * or the same assistant renders as two separate sidebar groups.
 */
export const isAssistantNameFolder = (
  folderName: string,
  assistant: { id: string; name: string } | null
): boolean => !!assistant && folderName === assistant.name

export const buildAggregates = (groupedChats: FocusedChatGroupMap): ChatSidebarAggregate[] => {
  const aggregates = Array.from(groupedChats, ([id, group]) => {
    sortChatsByMostRecent(group.chats)
    return { id, ...group, latestChat: group.chats[0] }
  })
  return aggregates.sort(
    (a, b) =>
      getValidDateTimestamp(b.latestChat?.updateDate, b.latestChat?.date) -
        getValidDateTimestamp(a.latestChat?.updateDate, a.latestChat?.date) ||
      a.name.localeCompare(b.name)
  )
}
