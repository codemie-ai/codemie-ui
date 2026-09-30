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

import { forwardRef, memo, useCallback, useContext, useLayoutEffect, type Ref } from 'react'

import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'

import ChatListItem, {
  ChatListItemActions,
  getChatRowHeightRem,
  RegisterChatElement,
} from './ChatListItem'
import { ChatListScrollerRegistryContext } from './chatListVirtualization'
import { getRootFontSizePx, useSidebarVirtualList } from './useSidebarVirtualList'

interface ChatListProps {
  currentChatId?: string
  chatActions: ChatListItemActions
  chats: ChatListItemType[]
  hideAvatar?: boolean | ((chat: ChatListItemType) => boolean)
  id?: string
  density?: ChatListDensity
  showRelativeTimestamp?: boolean
  registerChatElement?: RegisterChatElement
}

const ChatListInner = (
  {
    currentChatId,
    chatActions,
    chats,
    hideAvatar,
    id,
    density = ChatListDensity.DETAILED,
    showRelativeTimestamp = false,
    registerChatElement,
  }: ChatListProps,
  ref: Ref<HTMLUListElement>
) => {
  const registerScroller = useContext(ChatListScrollerRegistryContext)

  const estimateSize = useCallback(
    (index: number) =>
      getChatRowHeightRem(chats[index], density, showRelativeTimestamp) * getRootFontSizePx(),
    [chats, density, showRelativeTimestamp]
  )
  const getItemKey = useCallback((index: number) => chats[index].id, [chats])
  const {
    listRef,
    isVirtual,
    isAwaitingScrollElement,
    virtualizer,
    virtualItems,
    paddingTop,
    paddingBottom,
    measureRow,
  } = useSidebarVirtualList({ count: chats.length, estimateSize, getItemKey })

  const setListRef = useCallback(
    (element: HTMLUListElement | null) => {
      listRef.current = element
      if (typeof ref === 'function') ref(element)
      else if (ref) (ref as { current: HTMLUListElement | null }).current = element
    },
    [listRef, ref]
  )

  useLayoutEffect(() => {
    const unregister =
      isVirtual && registerScroller
        ? registerScroller({
            listId: id,
            scrollToChat: (chatId, align) => {
              const index = chats.findIndex((chat) => chat.id === chatId)
              if (index < 0) return false
              virtualizer.scrollToIndex(index, { align })
              return true
            },
          })
        : undefined
    return unregister
  }, [chats, id, isVirtual, registerScroller, virtualizer])

  const registerRow = useCallback<RegisterChatElement>(
    (chatId, element) => {
      registerChatElement?.(chatId, element)
      measureRow(element)
    },
    [measureRow, registerChatElement]
  )

  const renderRow = (chat: ChatListItemType, virtualIndex?: number) => (
    <ChatListItem
      key={chat.id}
      chat={chat}
      actions={chatActions}
      currentChatId={currentChatId}
      hideAvatar={typeof hideAvatar === 'function' ? hideAvatar(chat) : hideAvatar === true}
      density={density}
      showRelativeTimestamp={showRelativeTimestamp}
      registerChatElement={registerRow}
      virtualIndex={virtualIndex}
    />
  )

  let rows = isAwaitingScrollElement ? [] : chats.map((chat) => renderRow(chat))
  if (isVirtual) rows = virtualItems.map((item) => renderRow(chats[item.index], item.index))

  return (
    <ul ref={setListRef} id={id}>
      {paddingTop > 0 && <li aria-hidden="true" style={{ height: paddingTop }} />}
      {rows}
      {paddingBottom > 0 && <li aria-hidden="true" style={{ height: paddingBottom }} />}
    </ul>
  )
}

const ChatList = memo(forwardRef<HTMLUListElement, ChatListProps>(ChatListInner))

export default ChatList
