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
import React, { useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import ChatSvg from '@/assets/icons/chat-new-filled.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import ThumbDownSvg from '@/assets/icons/thumb-down.svg?react'
import ThumbUpFilledSvg from '@/assets/icons/thumb-up-filled.svg?react'
import ThumbUpSvg from '@/assets/icons/thumb-up.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Card from '@/components/Card'
import FavoriteButton from '@/components/FavoriteButton/FavoriteButton'
import RemoveFavoriteConfirmPopup from '@/components/FavoriteButton/RemoveFavoriteConfirmPopup'
import PinAssistantButton from '@/components/PinAssistantButton/PinAssistantButton'
import UnpinAssistantConfirmPopup from '@/components/PinAssistantButton/UnpinAssistantConfirmPopup'
import Tooltip from '@/components/Tooltip'
import { AssistantType } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import { useFavoritesEnabled, usePinnedAssistantsEnabled } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'
import { favoritesStore } from '@/store/favorites'
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
  reloadAssistants?: () => void
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
  reloadAssistants,
}) => {
  const router = useVueRouter()
  const [isFavoritesEnabled] = useFavoritesEnabled()
  const [isPinnedAssistantsEnabled] = usePinnedAssistantsEnabled()
  const { updateRecentAssistants } = useSnapshot(assistantsStore)
  const [showRemoveFavorite, setShowRemoveFavorite] = useState(false)
  const [showUnpinConfirm, setShowUnpinConfirm] = useState(false)

  const isGlobal = assistant.is_global || false

  const toggleLike = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      if (assistant.is_liked) {
        const result = await assistantsStore.removeReaction(assistant.id)
        favoritesStore.patchAssistantReaction(assistant.id, false, false, result)
      } else {
        const result = await assistantsStore.reactToAssistant(assistant.id, 'like')
        favoritesStore.patchAssistantReaction(assistant.id, true, false, result)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const toggleDislike = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      if (assistant.is_disliked) {
        const result = await assistantsStore.removeReaction(assistant.id)
        favoritesStore.patchAssistantReaction(assistant.id, false, false, result)
      } else {
        const result = await assistantsStore.reactToAssistant(assistant.id, 'dislike')
        favoritesStore.patchAssistantReaction(assistant.id, false, true, result)
      }
    } catch (error) {
      console.error('Error toggling dislike:', error)
    }
  }

  const handleChatClick = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      await chatsStore.startNewChat(assistant.id, assistant.name, false)
      updateRecentAssistants(assistant)
      router.push({ name: 'new-chat' })
    },
    [assistant]
  )

  const handlePinToggle = async () => {
    if (assistant.is_pinned) {
      setShowUnpinConfirm(true)
    } else {
      await assistantsStore.pinAssistant(assistant.id)
      favoritesStore.patchAssistantPinned(assistant.id, true)
    }
  }

  const handleUnpinConfirm = async () => {
    await assistantsStore.unpinAssistant(assistant.id)
    favoritesStore.patchAssistantPinned(assistant.id, false)
    setShowUnpinConfirm(false)
  }

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
        <div
          onClick={handleNavigationClick}
          onKeyDown={handleNavigationClick}
          className="flex pl-2 items-center"
        >
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
    <>
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
        topRight={
          !isTemplate ? (
            <div
              className="flex gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {isPinnedAssistantsEnabled && (
                <PinAssistantButton
                  isPinned={assistant.is_pinned ?? false}
                  onToggle={handlePinToggle}
                />
              )}
              {isFavoritesEnabled && (
                <FavoriteButton
                  isFavorited={assistant.is_favorited ?? false}
                  onToggle={() =>
                    assistant.is_favorited
                      ? setShowRemoveFavorite(true)
                      : favoritesStore.addFavorite('assistant', assistant.id)
                  }
                />
              )}
            </div>
          ) : null
        }
      />
      <RemoveFavoriteConfirmPopup
        visible={showRemoveFavorite}
        entityName={assistant.name}
        onCancel={() => setShowRemoveFavorite(false)}
        onConfirm={async () => {
          await favoritesStore.removeFavorite('assistant', assistant.id)
          setShowRemoveFavorite(false)
          reloadAssistants?.()
        }}
      />
      <UnpinAssistantConfirmPopup
        visible={showUnpinConfirm}
        entityName={assistant.name}
        onCancel={() => setShowUnpinConfirm(false)}
        onConfirm={handleUnpinConfirm}
      />
    </>
  )
}

export default React.memo(AssistantCard)
