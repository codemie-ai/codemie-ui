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

import {
  AvatarStores,
  resolveChatAvatar,
  resolveGroupChatAvatars,
  ResolvedChatAvatar,
} from '@/pages/chat/hooks/useChatItemAvatar'
import { ChatListItem } from '@/types/entity/conversation'

const getFallbackAvatarKey = (avatar: ResolvedChatAvatar) => {
  if (avatar.iconUrl) return `icon:${avatar.iconUrl}`
  return `name:${avatar.name ?? ''}`
}

export const resolveFocusedAggregateAvatars = (
  chats: ChatListItem[],
  avatarStores: AvatarStores
) => {
  const avatarItems: ResolvedChatAvatar[] = []
  const seenAvatars = new Set<string>()

  for (const chat of chats) {
    const resolvedAvatars = chat.isGroup
      ? resolveGroupChatAvatars(chat, avatarStores)
      : [resolveChatAvatar(chat, avatarStores)]

    resolvedAvatars.forEach((avatar, index) => {
      const entityType = chat.isWorkflow ? 'workflow' : 'assistant'
      const entityId = chat.isGroup
        ? chat.assistantIds[index]
        : chat.initialWorkflowId ?? chat.initialAssistantId ?? chat.assistantIds[0]
      const key = entityId?.trim() ? `${entityType}:${entityId}` : getFallbackAvatarKey(avatar)

      if (seenAvatars.has(key)) return
      seenAvatars.add(key)
      avatarItems.push(avatar)
    })
  }

  return avatarItems
}
