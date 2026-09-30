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

import { FC } from 'react'

import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'

import ChatSidebarAccordion from './ChatSidebarAccordion'
import ChatList from '../ChatList/ChatList'
import { ChatListItemActions, RegisterChatElement } from '../ChatList/ChatListItem'

interface FocusedConversationSectionsProps {
  pinnedChats: ChatListItemType[]
  recentChats: ChatListItemType[]
  chatActions: ChatListItemActions
  currentChatId?: string
  density: ChatListDensity
  isPinnedExpanded: boolean
  isRecentCollapsible?: boolean
  isRecentExpanded?: boolean
  onTogglePinned: () => void
  onToggleRecent?: () => void
  recentTitle?: string
  showRecentWhenEmpty?: boolean
  showRelativeTimestamp?: boolean
  registerChatElement: RegisterChatElement
}

const FocusedConversationSections: FC<FocusedConversationSectionsProps> = ({
  pinnedChats,
  recentChats,
  chatActions,
  currentChatId,
  density,
  isPinnedExpanded,
  isRecentCollapsible = false,
  isRecentExpanded,
  onTogglePinned,
  onToggleRecent,
  recentTitle = 'Recent',
  showRecentWhenEmpty = false,
  showRelativeTimestamp = false,
  registerChatElement,
}) => (
  <>
    {pinnedChats.length > 0 && (
      <ChatSidebarAccordion
        title="Pinned"
        count={pinnedChats.length}
        isExpanded={isPinnedExpanded}
        onToggle={onTogglePinned}
        contentClassName="max-h-52"
      >
        <ChatList
          chats={pinnedChats}
          chatActions={chatActions}
          currentChatId={currentChatId}
          density={density}
          showRelativeTimestamp={showRelativeTimestamp}
          registerChatElement={registerChatElement}
        />
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
        scrollable
      >
        {recentChats.length > 0 ? (
          <ChatList
            chats={recentChats}
            chatActions={chatActions}
            currentChatId={currentChatId}
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

export default FocusedConversationSections
