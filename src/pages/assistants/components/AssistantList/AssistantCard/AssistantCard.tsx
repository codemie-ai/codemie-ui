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

import { classNames } from 'primereact/utils'
import React, { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import ChatSvg from '@/assets/icons/chat-new-filled.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import ThumbDownSvg from '@/assets/icons/thumb-down.svg?react'
import ThumbUpFilledSvg from '@/assets/icons/thumb-up-filled.svg?react'
import ThumbUpSvg from '@/assets/icons/thumb-up.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Tooltip from '@/components/Tooltip'
import { AssistantType } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'
import { Assistant } from '@/types/entity/assistant'
import { createdBy } from '@/utils/helpers'

import StatusLabel from './StatusLabel'

interface AssistantCardProps {
  assistant: Assistant
  isTemplate?: boolean
  isGlobal?: boolean
  navigation?: React.ReactNode
  isShared?: boolean
  isOwned?: boolean
  description?: string
  name?: string
  onViewAssistant: (assistant: Assistant) => void
}

const AssistantCard: React.FC<AssistantCardProps> = ({
  assistant,
  isTemplate = false,
  navigation,
  isShared,
  isOwned,
  description,
  name,
  onViewAssistant,
}) => {
  const router = useVueRouter()
  const { updateRecentAssistants } = useSnapshot(assistantsStore)
  const { createChat } = useSnapshot(chatsStore)
  const isGlobal = assistant.is_global || false

  const toggleLike = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      if (assistant.is_liked) {
        await assistantsStore.removeReaction(assistant.id)
      } else {
        await assistantsStore.reactToAssistant(assistant.id, 'like')
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const toggleDislike = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      if (assistant.is_disliked) {
        await assistantsStore.removeReaction(assistant.id)
      } else {
        await assistantsStore.reactToAssistant(assistant.id, 'dislike')
      }
    } catch (error) {
      console.error('Error toggling dislike:', error)
    }
  }

  const handleChatClick = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      const newChat = await createChat(assistant.id, assistant.name, false)
      updateRecentAssistants(assistant)
      router.push({ name: 'chats', params: { id: newChat.id } })
    },
    [assistant]
  )

  const handleNavigationClick = (event) => {
    event.stopPropagation()
  }

  const handleCreateAssistant = (event, assistant) => {
    event.stopPropagation()

    router.push({
      name: 'new-assistant-from-template',
      params: { slug: assistant.slug },
    })
  }

  const tooltipClass = useMemo(() => {
    const id = assistant.id || assistant.slug
    return 'tooltip-target-' + id
  }, [assistant.id])

  const renderActions = () => {
    return (
      <>
        <Tooltip target={'.' + tooltipClass} position="left" showDelay={100} />
        {isTemplate ? (
          <Button
            variant="action"
            onClick={(event) => handleCreateAssistant(event, assistant)}
            size="medium"
            className={classNames(tooltipClass)}
            data-pr-tooltip="Create Assistant"
            aria-label={`Create assistant from ${assistant.name}`}
          >
            <PlusSvg className="text-text-accent" />
          </Button>
        ) : (
          <Button
            variant="action"
            onClick={handleChatClick}
            size="medium"
            className={classNames(tooltipClass)}
            data-pr-tooltip="Start chat"
            aria-label={`Start chat with ${assistant.name}`}
          >
            <ChatSvg className="text-text-accent" />
          </Button>
        )}
        {isGlobal && (
          <div className="flex h-full pl-4 gap-1 items-center justify-center">
            <Button
              type="tertiary"
              className={tooltipClass}
              data-pr-tooltip={assistant.is_liked ? 'Remove like' : 'Like this assistant'}
              aria-label={
                assistant.is_liked
                  ? `Remove like from ${assistant.name}, ${assistant.unique_likes_count}`
                  : `Like ${assistant.name}, ${assistant.unique_likes_count}`
              }
              onClick={toggleLike}
            >
              {assistant.is_liked ? (
                <ThumbUpFilledSvg className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ThumbUpSvg className="w-3 h-3" aria-hidden="true" />
              )}
              <span className="text-sm-1" aria-hidden="true">
                {assistant.unique_likes_count}
              </span>
            </Button>

            <div className="h-[12px] w-px bg-border-structural mx-1" aria-hidden="true"></div>

            <Button
              type="tertiary"
              className={tooltipClass}
              data-pr-tooltip={assistant.is_disliked ? 'Remove dislike' : 'Dislike this assistant'}
              aria-label={
                assistant.is_disliked
                  ? `Remove dislike from ${assistant.name}, ${assistant.unique_dislikes_count}`
                  : `Dislike ${assistant.name}, ${assistant.unique_dislikes_count}`
              }
              onClick={toggleDislike}
            >
              {assistant.is_disliked ? (
                <ThumbUpFilledSvg
                  className="transform rotate-180 flex self-center w-3 h-3"
                  aria-hidden="true"
                />
              ) : (
                <ThumbDownSvg className="w-3 h-3" aria-hidden="true" />
              )}
              <span className="text-sm-1" aria-hidden="true">
                {assistant.unique_dislikes_count}
              </span>
            </Button>
          </div>
        )}
        <div onClick={handleNavigationClick} className="flex pl-2 items-center">
          {navigation}
        </div>
      </>
    )
  }

  const renderAvatar = () => {
    return (
      <Avatar
        iconUrl={assistant.icon_url}
        name={assistant.name}
        type={AvatarType.MEDIUM}
        className="shrink-0"
      />
    )
  }

  const renderStatus = () => {
    return <StatusLabel assistant={assistant} isShared={isShared} isOwned={isOwned} />
  }

  const label = useMemo(() => {
    if (assistant.type === AssistantType.A2A) {
      return assistant.type
    }

    if (assistant.type === AssistantType.BEDROCK) {
      return 'AWS'
    }

    return ''
  }, [assistant.type])

  return (
    <Card
      label={label}
      id={assistant.id || assistant.slug}
      title={name || assistant.name}
      onClick={() => onViewAssistant(assistant)}
      subtitle={'by ' + createdBy(assistant.created_by)}
      description={description || assistant.description}
      avatar={renderAvatar()}
      actions={renderActions()}
      status={renderStatus()}
    />
  )
}

export default React.memo(AssistantCard)
