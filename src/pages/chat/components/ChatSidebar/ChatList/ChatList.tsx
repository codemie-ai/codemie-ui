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

import { forwardRef, memo, useMemo } from 'react'

import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'

import ChatListItem, { ChatListItemActions } from './ChatListItem'

interface ChatListProps {
  currentChatId?: string
  chatActions: ChatListItemActions
  chats: ChatListItemType[]
}

const ChatList = memo(
  forwardRef<HTMLUListElement, ChatListProps>(({ currentChatId, chatActions, chats }, ref) => {
    const { pinnedChats, unpinnedChats } = useMemo(() => {
      const pinnedChats: ChatListItemType[] = []
      const unpinnedChats: ChatListItemType[] = []

      ;(chats as ChatListItemType[]).forEach((chat) =>
        chat.pinned ? pinnedChats.push(chat) : unpinnedChats.push(chat)
      )

      return { pinnedChats, unpinnedChats }
    }, [chats])

    return (
      <ul ref={ref}>
        {pinnedChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            actions={chatActions}
            currentChatId={currentChatId}
          />
        ))}
        {unpinnedChats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            actions={chatActions}
            currentChatId={currentChatId}
          />
        ))}
      </ul>
    )
  })
)

export default ChatList
