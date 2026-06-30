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

import { useState, useEffect, useMemo } from 'react'

import ChatSvg from '@/assets/icons/chat-new-filled.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import ThumbUpFilledSvg from '@/assets/icons/thumb-up-filled.svg?react'
import ThumbUpSvg from '@/assets/icons/thumb-up.svg?react'
import Button from '@/components/Button'
import FavoriteButton from '@/components/FavoriteButton/FavoriteButton'
import RemoveFavoriteConfirmPopup from '@/components/FavoriteButton/RemoveFavoriteConfirmPopup'
import PinAssistantButton from '@/components/PinAssistantButton/PinAssistantButton'
import UnpinAssistantConfirmPopup from '@/components/PinAssistantButton/UnpinAssistantConfirmPopup'
import { AssistantType, AssistantReaction } from '@/constants/assistants'
import { useFavoritesEnabled, usePinnedAssistantsEnabled } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore } from '@/store'
import { favoritesStore } from '@/store/favorites'
import { Assistant } from '@/types/entity/assistant'
import { canEdit } from '@/utils/entity'
import { cn } from '@/utils/utils'

import AssistantActions from '../../../AssistantActions/AssistantActions'

interface AssistantDetailsActionsProps {
  isTemplate?: boolean
  assistant: Assistant
  createChat: (assistant: Assistant) => void
  exportAssistant?: (assistant: Assistant) => void
  loadAssistant: () => Promise<void>
}

const AssistantDetailsActions = ({
  isTemplate,
  assistant,
  createChat,
  exportAssistant,
  loadAssistant,
}: AssistantDetailsActionsProps) => {
  const router = useVueRouter()
  const [isFavoritesEnabled] = useFavoritesEnabled()
  const [isPinnedAssistantsEnabled] = usePinnedAssistantsEnabled()
  const [reaction, setReaction] = useState<AssistantReaction | null>(null)
  const [showRemoveFavorite, setShowRemoveFavorite] = useState(false)
  const [isPinned, setIsPinned] = useState(assistant.is_pinned ?? false)
  const [isFavorited, setIsFavorited] = useState(assistant.is_favorited ?? false)
  const [showUnpinConfirm, setShowUnpinConfirm] = useState(false)
  const isReactionsVisible = !isTemplate && assistant?.is_global

  const isRemoteAssistant = assistant.type === AssistantType.A2A
  const canEditAssistant = canEdit(assistant)

  const handleEdit = () => {
    if (isRemoteAssistant) {
      router.push({ name: 'edit-remote-assistant', params: { id: assistant.id } })
    } else {
      router.push({ name: 'edit-assistant', params: { id: assistant.id } })
    }
  }

  useEffect(() => {
    const fetchReactionStatus = async () => {
      try {
        const userReactions = await assistantsStore.getUserReactions()
        // New API returns resource_id (snake_case), old API returned assistant_id
        const assistantReaction = userReactions.find(
          (r) => (r.resource_id || r.resourceId || r.assistant_id) === assistant.id
        )

        if (assistantReaction) setReaction(assistantReaction.reaction)
      } catch (error) {
        console.error('Failed to fetch user reactions:', error)
      }
    }

    fetchReactionStatus()
  }, [])

  const handleReactionToggle = async (event: React.MouseEvent, newReaction: AssistantReaction) => {
    event.stopPropagation()
    const originalReaction = reaction

    const nextReactionState = originalReaction === newReaction ? null : newReaction
    setReaction(nextReactionState)

    try {
      if (nextReactionState === null) await assistantsStore.removeReaction(assistant.id)
      else await assistantsStore.reactToAssistant(assistant.id, newReaction)
    } catch (error) {
      setReaction(originalReaction)
      console.error('Error toggling:', newReaction, error)
    }
  }

  const navigateToCreateAssistantFromTemplate = () => {
    router.push({
      name: 'new-assistant-from-template',
      params: { slug: assistant.slug },
    })
  }

  const buttonStyles = useMemo(() => 'w-[18px] h-[18px]', [])

  return (
    <>
      <div className="flex gap-4 items-center self-center">
        {isTemplate ? (
          <Button type="primary" size="medium" onClick={navigateToCreateAssistantFromTemplate}>
            <PlusSvg /> Create Assistant
          </Button>
        ) : (
          <>
            {canEditAssistant && (
              <Button type="secondary" size="medium" onClick={handleEdit}>
                <EditSvg /> Edit
              </Button>
            )}
            <Button type="primary" size="medium" onClick={() => createChat(assistant)}>
              <ChatSvg /> Chat Now
            </Button>
          </>
        )}

        {!isTemplate && (
          <>
            {isReactionsVisible && (
              <div className="h-7 flex items-center bg-surface-base-secondary relative border border-border-quaternary rounded-lg text-text-accent">
                <button
                  aria-label={reaction === AssistantReaction.LIKE ? 'Remove like' : 'Like'}
                  className="px-3 transition opacity-80 hover:opacity-100"
                  onClick={(e) => handleReactionToggle(e, AssistantReaction.LIKE)}
                >
                  {reaction === AssistantReaction.LIKE ? (
                    <ThumbUpFilledSvg className={cn(buttonStyles)} />
                  ) : (
                    <ThumbUpSvg className={cn(buttonStyles)} />
                  )}
                </button>
                <div className="h-3 w-px bg-text-quaternary" />
                <button
                  aria-label={reaction === AssistantReaction.DISLIKE ? 'Remove dislike' : 'Dislike'}
                  className="px-3 transition opacity-80 hover:opacity-100"
                  onClick={(e) => handleReactionToggle(e, AssistantReaction.DISLIKE)}
                >
                  {reaction === AssistantReaction.DISLIKE ? (
                    <ThumbUpFilledSvg className={cn(buttonStyles, 'transform rotate-180')} />
                  ) : (
                    <ThumbUpSvg className={cn(buttonStyles, 'transform rotate-180')} />
                  )}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              {isPinnedAssistantsEnabled && (
                <PinAssistantButton
                  isPinned={isPinned}
                  onToggle={() => {
                    if (isPinned) {
                      setShowUnpinConfirm(true)
                    } else {
                      assistantsStore.pinAssistant(assistant.id)
                      setIsPinned(true)
                    }
                  }}
                />
              )}
              {isFavoritesEnabled && (
                <FavoriteButton
                  isFavorited={isFavorited}
                  onToggle={() =>
                    isFavorited
                      ? setShowRemoveFavorite(true)
                      : (favoritesStore.addFavorite('assistant', assistant.id),
                        setIsFavorited(true))
                  }
                />
              )}
            </div>
            <AssistantActions
              page="assitant_details"
              assistant={assistant}
              onExport={exportAssistant}
              loadAssistant={loadAssistant}
            />
          </>
        )}
      </div>
      {isPinnedAssistantsEnabled && (
        <UnpinAssistantConfirmPopup
          visible={showUnpinConfirm}
          entityName={assistant.name}
          onCancel={() => setShowUnpinConfirm(false)}
          onConfirm={() => {
            assistantsStore.unpinAssistant(assistant.id)
            setIsPinned(false)
            setShowUnpinConfirm(false)
          }}
        />
      )}
      {isFavoritesEnabled && (
        <RemoveFavoriteConfirmPopup
          visible={showRemoveFavorite}
          entityName={assistant.name}
          onCancel={() => setShowRemoveFavorite(false)}
          onConfirm={() => {
            favoritesStore.removeFavorite('assistant', assistant.id)
            setIsFavorited(false)
            setShowRemoveFavorite(false)
          }}
        />
      )}
    </>
  )
}

export default AssistantDetailsActions
