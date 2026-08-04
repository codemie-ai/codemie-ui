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

import { forwardRef, memo, type Ref } from 'react'

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'

import ChatListItem, { ChatListItemActions } from './ChatListItem'

interface ChatListProps {
  currentChatId?: string
  chatActions: ChatListItemActions
  chats: ChatListItemType[]
  hideAvatar?: boolean
  id?: string
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
  isLazyLoadingEnabled?: boolean
}

const ChatListInner = (
  {
    currentChatId,
    chatActions,
    chats,
    hideAvatar,
    id,
    onLoadMore = () => undefined,
    hasMore = false,
    isLoading = false,
    isLazyLoadingEnabled = false,
  }: ChatListProps,
  ref: Ref<HTMLUListElement>
) => {
  const shouldHideAvatar = hideAvatar === true
  const sentinelRef = useInfiniteScroll({
    enabled: isLazyLoadingEnabled,
    isLoading,
    hasMore,
    onLoadMore,
  })

  return (
    <ul ref={ref} id={id}>
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          actions={chatActions}
          currentChatId={currentChatId}
          hideAvatar={shouldHideAvatar}
        />
      ))}
      {hasMore && (
        <li aria-hidden="true">
          <div ref={sentinelRef} className="h-px" />
        </li>
      )}
    </ul>
  )
}

const ChatList = memo(forwardRef<HTMLUListElement, ChatListProps>(ChatListInner))

export default ChatList
