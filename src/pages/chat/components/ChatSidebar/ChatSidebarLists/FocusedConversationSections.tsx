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

import { FC, useCallback, useEffect, useState } from 'react'

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'

import ChatSidebarAccordion from './ChatSidebarAccordion'
import ChatList from '../ChatList/ChatList'
import ChatListItem, { ChatListItemActions, RegisterChatElement } from '../ChatList/ChatListItem'

const PINNED_ITEMS_BATCH_SIZE = 5
const RECENT_CHATS_BATCH_SIZE = 20

interface FocusedConversationSectionsProps {
  pinnedChats: ChatListItemType[]
  recentChats: ChatListItemType[]
  chatActions: ChatListItemActions
  currentChatId?: string
  revealChatId?: string
  density: ChatListDensity
  isPinnedExpanded: boolean
  isRecentCollapsible?: boolean
  isRecentExpanded?: boolean
  onTogglePinned: () => void
  onToggleRecent?: () => void
  recentTitle?: string
  showRecentWhenEmpty?: boolean
  showRelativeTimestamp?: boolean
  hasMoreRecentChats?: boolean
  isLoadingMoreRecentChats?: boolean
  onLoadMoreRecentChats?: () => void
  registerChatElement: RegisterChatElement
}

const FocusedConversationSections: FC<FocusedConversationSectionsProps> = ({
  pinnedChats,
  recentChats,
  chatActions,
  currentChatId,
  revealChatId,
  density,
  isPinnedExpanded,
  isRecentCollapsible = false,
  isRecentExpanded,
  onTogglePinned,
  onToggleRecent,
  recentTitle = 'Recent',
  showRecentWhenEmpty = false,
  showRelativeTimestamp = false,
  hasMoreRecentChats = false,
  isLoadingMoreRecentChats = false,
  onLoadMoreRecentChats,
  registerChatElement,
}) => {
  const [visiblePinnedItemsCount, setVisiblePinnedItemsCount] = useState(PINNED_ITEMS_BATCH_SIZE)
  const [visibleRecentChatsCount, setVisibleRecentChatsCount] = useState(RECENT_CHATS_BATCH_SIZE)
  const [hasPinnedScrollIntent, setHasPinnedScrollIntent] = useState(false)
  const [hasRecentScrollIntent, setHasRecentScrollIntent] = useState(false)

  useEffect(() => {
    const targetChatId = revealChatId ?? currentChatId
    if (!targetChatId) return
    const currentChatIndex = pinnedChats.findIndex((chat) => chat.id === targetChatId)
    if (currentChatIndex >= 0) {
      setVisiblePinnedItemsCount((count) => Math.max(count, currentChatIndex + 1))
    }
    const currentRecentChatIndex = recentChats.findIndex((chat) => chat.id === targetChatId)
    if (currentRecentChatIndex >= 0) {
      setVisibleRecentChatsCount((count) => Math.max(count, currentRecentChatIndex + 1))
    }
  }, [currentChatId, pinnedChats, recentChats, revealChatId])

  const loadMorePinnedItems = useCallback(() => {
    setVisiblePinnedItemsCount((count) =>
      Math.min(count + PINNED_ITEMS_BATCH_SIZE, pinnedChats.length)
    )
  }, [pinnedChats.length])

  const visiblePinnedChats = pinnedChats.slice(0, visiblePinnedItemsCount)
  const hasMorePinnedItems = visiblePinnedChats.length < pinnedChats.length
  const pinnedSentinelRef = useInfiniteScroll({
    enabled: isPinnedExpanded && hasPinnedScrollIntent,
    isLoading: false,
    hasMore: hasMorePinnedItems,
    onLoadMore: loadMorePinnedItems,
  })

  const visibleRecentChats = recentChats.slice(0, visibleRecentChatsCount)
  const hasMoreLocalRecentChats = visibleRecentChats.length < recentChats.length
  const loadMoreRecentChats = () => {
    if (hasMoreLocalRecentChats) {
      setVisibleRecentChatsCount((count) =>
        Math.min(count + RECENT_CHATS_BATCH_SIZE, recentChats.length)
      )
      return
    }
    onLoadMoreRecentChats?.()
  }

  return (
    <>
      {pinnedChats.length > 0 && (
        <ChatSidebarAccordion
          title="Pinned"
          isExpanded={isPinnedExpanded}
          onToggle={onTogglePinned}
          onScrollIntent={() => setHasPinnedScrollIntent(true)}
          contentClassName="max-h-52"
        >
          <ul>
            {visiblePinnedChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                actions={chatActions}
                currentChatId={currentChatId}
                density={density}
                showRelativeTimestamp={showRelativeTimestamp}
                registerChatElement={registerChatElement}
              />
            ))}
            {hasMorePinnedItems && (
              <li aria-hidden="true">
                <div ref={pinnedSentinelRef} className="h-px" />
              </li>
            )}
          </ul>
        </ChatSidebarAccordion>
      )}

      {(showRecentWhenEmpty || recentChats.length > 0) && (
        <ChatSidebarAccordion
          className={pinnedChats.length > 0 ? 'mt-2' : undefined}
          title={recentTitle}
          count={recentChats.length > 0 ? recentChats.length : undefined}
          isCollapsible={isRecentCollapsible}
          isExpanded={isRecentExpanded}
          onToggle={onToggleRecent}
          onScrollIntent={() => setHasRecentScrollIntent(true)}
          scrollable
        >
          {recentChats.length > 0 || hasMoreRecentChats ? (
            <ChatList
              chats={visibleRecentChats}
              chatActions={chatActions}
              currentChatId={currentChatId}
              onLoadMore={loadMoreRecentChats}
              hasMore={hasMoreLocalRecentChats || hasMoreRecentChats}
              isLoading={isLoadingMoreRecentChats}
              isLazyLoadingEnabled={
                (!isRecentCollapsible || isRecentExpanded) &&
                (hasRecentScrollIntent || (recentChats.length === 0 && hasMoreRecentChats))
              }
              density={density}
              showRelativeTimestamp={showRelativeTimestamp}
              registerChatElement={registerChatElement}
            />
          ) : (
            <p className="px-2 py-2 text-xs text-text-tertiary">No recent chats</p>
          )}
        </ChatSidebarAccordion>
      )}
    </>
  )
}

export default FocusedConversationSections
