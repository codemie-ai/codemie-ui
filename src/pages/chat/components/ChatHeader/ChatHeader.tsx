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
import { useSnapshot } from 'valtio'

import ChatNewSvg from '@/assets/icons/chat-new.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import Plus from '@/assets/icons/plus.svg?react'
import SidebarSvg from '@/assets/icons/sidebar.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import DataOverlayButton from '@/components/DataOverlayButton/DataOverlayButton'
import { AvatarType } from '@/constants/avatar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'
import { ChatMetrics } from '@/types/entity/conversation'
import { cn } from '@/utils/utils'

import ChatHeaderClearButton from './ChatHeaderClearButton'
import ChatHeaderDownloadConversationButton from './ChatHeaderDownloadConversationButton'
import ChatHeaderShareButton from './ChatHeaderShareButton/ChatHeaderShareButton'
import { useChatContext } from '../../hooks/useChatContext'

const ChatHeader: FC = () => {
  const router = useVueRouter()
  const { isConfigVisible, attemptToggleConfigVisibility } = useChatContext()
  const { sidebarExpanded } = useSnapshot(appInfoStore)
  const { currentChat, createChat, getMetrics } = useSnapshot(chatsStore) as typeof chatsStore

  const handleCreateChat = async () => {
    const chat = await createChat('', '', false)
    router.push({ name: 'chats', params: { id: chat.id } })
  }

  const handleCreateChatWithSameAssistant = async () => {
    const lastAssistantMessage = currentChat?.history
      ?.slice()
      .reverse()
      .flat()
      .find((msg) => msg.role === 'Assistant')
    const assistantId =
      lastAssistantMessage?.assistantId ??
      currentChat?.initialAssistantId ??
      currentChat?.assistantIds?.[0] ??
      ''
    const isWorkflow = currentChat?.isWorkflow ?? false
    const folder = currentChat?.folder ?? ''
    const chat = await createChat(assistantId, folder, isWorkflow)
    router.push({ name: 'chats', params: { id: chat.id } })
  }

  const hasAssistant =
    !!currentChat?.initialAssistantId || !!currentChat?.assistantIds?.length

  const handleViewWorkflowDetails = () => {
    if (currentChat?.initialAssistantId) {
      router.push({ name: 'view-workflow', params: { id: currentChat.initialAssistantId } })
    }
  }

  const handleAvatarClick = () => {
    if (currentChat?.isWorkflow) {
      handleViewWorkflowDetails()
    } else {
      attemptToggleConfigVisibility()
    }
  }

  return (
    <div className="flex justify-between items-center grow">
      {!sidebarExpanded && (
        <Button onClick={handleCreateChat} className="mr-4">
          <Plus />
          New Chat
        </Button>
      )}

      {currentChat?.isGroup && !!currentChat?.assistantData.length && (
        <div className="flex items-center gap-2">
          {currentChat.assistantData.slice(0, 3).map((assistant) => (
            <Avatar
              key={assistant.id}
              iconUrl={assistant.iconUrl}
              name={assistant.name}
              type={AvatarType.SMALL}
              onClick={handleAvatarClick}
              withTooltip
            />
          ))}
          {currentChat.assistantData.length > 3 ? <div className="mr-2">...</div> : null}
        </div>
      )}

      {currentChat && (
        <div className="flex gap-2 ml-auto">
          {hasAssistant && (
            <Button
              type="secondary"
              data-tooltip-id="react-tooltip"
              data-tooltip-content="New Chat with Same Assistant"
              aria-label="New Chat with Same Assistant"
              onClick={handleCreateChatWithSameAssistant}
            >
              <ChatNewSvg aria-hidden="true" />
            </Button>
          )}

          <DataOverlayButton<ChatMetrics>
            title="Usage details"
            subtitle="Chat totals, auto-updated"
            data={() => getMetrics(currentChat.id)}
            render={(data) => ({
              'Input tokens used': data.total_input_tokens ?? 0,
              'Output tokens used': data.total_output_tokens ?? 0,
              'Money spent (approx)': `$${data.total_money_spent?.toFixed(4) ?? '0'}`,
            })}
          />

          <ChatHeaderShareButton />

          <ChatHeaderDownloadConversationButton />

          <ChatHeaderClearButton />

          <div className="mx-2 my-auto text-border-primary">|</div>

          {currentChat.isWorkflow ? (
            <Button
              variant="secondary"
              aria-label="View workflow details"
              onClick={handleViewWorkflowDetails}
            >
              <InfoSvg className="text-text-accent" />
              Workflow Details
            </Button>
          ) : (
            <Button
              variant="secondary"
              aria-label="Open chat configuration"
              onClick={attemptToggleConfigVisibility}
            >
              <SidebarSvg
                className={cn('text-text-accent transition', {
                  'rotate-180': isConfigVisible,
                })}
              />
              Configuration
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default ChatHeader
