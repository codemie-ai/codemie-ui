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

import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import PencilSquareSvg from '@/assets/icons/chat-new-filled.svg?react'
import ArchiveSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
// import HistorySvg from '@/assets/icons/history.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import { AvatarType } from '@/constants/avatar'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useVueRouter } from '@/hooks/useVueRouter'
import { getAssistantEditRoute } from '@/pages/assistants/utils/getAssistantLink'
import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'
import { Assistant } from '@/types/entity/assistant'
import { canEdit } from '@/utils/entity'

import ChatsSidebarSection from './ChatSidebarSection'
import RecentAssistantsPickerPopup from './RecentAssistantsPickerPopup'

const MAX_NAME_LENGTH = 20
const RECENT_ASSISTANTS_BATCH_SIZE = 5
const RECENT_ASSISTANT_ROW_HEIGHT_PX = 36

interface ChatSidebarAssistantsProps {
  onViewChatHistory?: (assistantId: string, assistantName: string, iconUrl?: string | null) => void
}

const truncateName = (assistant: Assistant) => {
  if (assistant.name.length <= MAX_NAME_LENGTH) {
    return assistant.name
  }
  return assistant.name.slice(0, MAX_NAME_LENGTH) + '...'
}

const ChatSidebarAssistants = ({
  onViewChatHistory: _onViewChatHistory,
}: ChatSidebarAssistantsProps) => {
  const router = useVueRouter()
  const { recentAssistants } = useSnapshot(assistantsStore)
  const [isPickerVisible, setIsPickerVisible] = useState(false)
  const [visibleAssistantsCount, setVisibleAssistantsCount] = useState(RECENT_ASSISTANTS_BATCH_SIZE)
  const [hasScrollIntent, setHasScrollIntent] = useState(false)

  const visibleAssistants = recentAssistants.slice(0, visibleAssistantsCount)
  const hasMoreAssistants = visibleAssistants.length < recentAssistants.length
  const loadMoreAssistants = useCallback(() => {
    setVisibleAssistantsCount((count) =>
      Math.min(count + RECENT_ASSISTANTS_BATCH_SIZE, recentAssistants.length)
    )
  }, [recentAssistants.length])
  const sentinelRef = useInfiniteScroll({
    enabled: hasScrollIntent,
    isLoading: false,
    hasMore: hasMoreAssistants,
    onLoadMore: loadMoreAssistants,
  })

  const editAssistant = (assistant: Assistant) => {
    router.push(getAssistantEditRoute(assistant))
  }

  const deleteAssistant = async (assistant: Assistant) => {
    await assistantsStore.deleteRecentAssistant(assistant.id)
    assistantsStore.getRecentAssistants()
  }

  const createChat = async (assistant: Assistant) => {
    await chatsStore.startNewChat(assistant.id, '', false)
    assistantsStore.updateRecentAssistants(assistant)
    router.push({ name: 'new-chat' })
  }

  const getMenuItems = (assistant: Assistant) => [
    {
      title: 'New chat',
      onClick: () => createChat(assistant),
      icon: <PencilSquareSvg className="w-4 h-4" />,
    },
    // Temporarily hidden (EPMCDME-15210) — restore "View chat history" in the next release once its design is finalized.
    // {
    // title: 'View chat history',
    // onClick: () => onViewChatHistory?.(assistant.id, assistant.name, assistant.icon_url),
    // icon: <HistorySvg />,
    // },
    ...(canEdit(assistant) && assistant.type !== 'A2A'
      ? [
          {
            title: 'Edit assistant',
            onClick: () => editAssistant(assistant),
            icon: <EditSvg className="h-4" />,
          },
        ]
      : []),
    {
      title: 'Remove from Recent Assistants',
      onClick: () => deleteAssistant(assistant),
      icon: <ArchiveSvg className="w-4 h-4" />,
    },
  ]

  useEffect(() => {
    assistantsStore.getRecentAssistants()
  }, [])

  return (
    <>
      <ChatsSidebarSection
        title="Recent Assistants"
        headerContent={
          <button
            type="button"
            title="Add Recent Assistants"
            aria-label="Add Recent Assistants"
            className="rounded p-1 text-icon-secondary hover:text-icon-primary"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsPickerVisible(true)
            }}
          >
            <PlusSvg className="size-4" />
          </button>
        }
      >
        <div
          data-testid="recent-assistants-scroll-container"
          className="flex flex-col overflow-y-auto"
          style={{ maxHeight: RECENT_ASSISTANTS_BATCH_SIZE * RECENT_ASSISTANT_ROW_HEIGHT_PX }}
          onScroll={() => setHasScrollIntent(true)}
          onWheel={() => setHasScrollIntent(true)}
          onTouchMove={() => setHasScrollIntent(true)}
        >
          {visibleAssistants.map((assistant) => (
            <div
              key={assistant.id}
              className="flex h-9 shrink-0 min-w-0 items-center justify-between gap-2 px-1.5"
            >
              <button
                type="button"
                aria-label={`Start new chat with ${assistant.name}`}
                onClick={() => createChat(assistant)}
                className="flex min-w-0 flex-1 cursor-pointer items-center justify-start gap-2"
              >
                <Avatar
                  withTooltip
                  type={AvatarType.XS}
                  iconUrl={assistant.icon_url}
                  name={assistant.name}
                />
                <span
                  id={`sidebar-assistant-name-${assistant.id}`}
                  className="block min-w-0 flex-1 truncate text-left text-sm font-normal text-text-primary"
                >
                  {truncateName(assistant)}
                </span>
              </button>

              <div className="flex shrink-0 items-center">
                <NavigationMore
                  renderInRoot
                  placement="right-end"
                  hideOnClickInside
                  className="size-6 shrink-0"
                  buttonClassName="m-0 flex size-6 items-center justify-center p-0"
                  contextId={`sidebar-assistant-name-${assistant.id}`}
                  items={getMenuItems(assistant)}
                />
              </div>
            </div>
          ))}
          {hasMoreAssistants && <div ref={sentinelRef} className="h-px shrink-0" aria-hidden />}
        </div>
      </ChatsSidebarSection>
      <RecentAssistantsPickerPopup
        isVisible={isPickerVisible}
        onHide={() => setIsPickerVisible(false)}
      />
    </>
  )
}

export default ChatSidebarAssistants
