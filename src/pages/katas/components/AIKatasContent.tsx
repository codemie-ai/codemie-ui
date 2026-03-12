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

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import CheckSvg from '@/assets/icons/check.svg?react'
import DiagramSvg from '@/assets/icons/diagram.svg?react'
import PlaySvg from '@/assets/icons/play.svg?react'
import ThumbDownSvg from '@/assets/icons/thumb-down.svg?react'
import ThumbUpFilledSvg from '@/assets/icons/thumb-up-filled.svg?react'
import ThumbUpSvg from '@/assets/icons/thumb-up.svg?react'
import aiAvatarImage from '@/assets/images/ai-avatar.png'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Tooltip from '@/components/Tooltip'
import { KATA_FILTER_TYPE, KataFilterType, KATA_PROGRESS_STATUS_VALUES } from '@/constants/katas'
import { katasStore } from '@/store/katas'
import { userStore } from '@/store/user'
import {
  AIKataListItem,
  KataLevel,
  KataProgressStatus,
  KataStatus,
  KataFilters as KataFiltersType,
} from '@/types/entity/kata'

import CompleteKataConfirmation from './CompleteKataConfirmation'
import KataActions from './KataActions'

interface AIKatasContentProps {
  filterType: KataFilterType
  filters?: KataFiltersType
  reloadKatas?: () => void
  totalCount?: number
}

const AIKatasContent = ({ filterType, totalCount }: AIKatasContentProps) => {
  const { katas, isLoading } = useSnapshot(katasStore)
  const { user } = useSnapshot(userStore)
  const isAdmin = user?.isAdmin ?? false
  const navigate = useNavigate()
  const [kataToComplete, setKataToComplete] = useState<AIKataListItem | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    // Only fetch for non-paginated views (in-progress, completed)
    // The 'all' view is handled by the parent page with pagination
    if (filterType !== KATA_FILTER_TYPE.ALL) {
      const filters: KataFiltersType = {
        status: KataStatus.PUBLISHED,
      }

      // Add progress_status filter based on filterType
      if (filterType === KATA_FILTER_TYPE.IN_PROGRESS) {
        filters.progress_status = KATA_PROGRESS_STATUS_VALUES.IN_PROGRESS
      } else if (filterType === KATA_FILTER_TYPE.COMPLETED) {
        filters.progress_status = KATA_PROGRESS_STATUS_VALUES.COMPLETED
      }

      katasStore.fetchKatas(filters)
    }
  }, [filterType])

  const handleKataClick = (kata: AIKataListItem) => {
    navigate(`/katas/${kata.id}`)
  }

  const handleStartKata = async (event: React.MouseEvent, kata: AIKataListItem) => {
    event.stopPropagation()

    // If kata is not started, start it first
    if (kata.user_progress.status === KataProgressStatus.NOT_STARTED) {
      try {
        await katasStore.startKata(kata.id)
      } catch (error) {
        console.error('Error starting kata:', error)
      }
    }

    navigate(`/katas/${kata.id}`)
  }

  const handleCompleteKata = (event: React.MouseEvent, kata: AIKataListItem) => {
    event.stopPropagation()
    setKataToComplete(kata)
  }

  const confirmCompleteKata = async () => {
    if (!kataToComplete) return

    try {
      setIsCompleting(true)
      await katasStore.completeKata(kataToComplete.id)
      setKataToComplete(null)
    } catch (error) {
      console.error('Error completing kata:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const cancelCompleteKata = () => {
    setKataToComplete(null)
  }

  const formatLevel = (level: KataLevel): string => {
    return level.charAt(0).toUpperCase() + level.slice(1)
  }

  const getLevelColorClasses = (level: KataLevel): string => {
    switch (level) {
      case KataLevel.BEGINNER:
        return 'bg-success-secondary text-success-primary border-success-primary'
      case KataLevel.INTERMEDIATE:
        return 'bg-in-progress-tertiary text-in-progress-primary border-in-progress-secondary'
      case KataLevel.ADVANCED:
        return 'bg-advanced-tertiary text-advanced-primary border-advanced-secondary'
      default:
        return 'bg-not-started-tertiary text-not-started-primary border-border-subtle'
    }
  }

  const getTitle = () => {
    switch (filterType) {
      case KATA_FILTER_TYPE.IN_PROGRESS:
        return 'In Progress Katas'
      case KATA_FILTER_TYPE.COMPLETED:
        return 'Completed Katas'
      default:
        return 'All Katas'
    }
  }

  const getDescription = () => {
    switch (filterType) {
      case KATA_FILTER_TYPE.IN_PROGRESS:
        return 'Continue working on your started AI challenges and tutorials'
      case KATA_FILTER_TYPE.COMPLETED:
        return 'Review your completed AI challenges and achievements'
      default:
        return 'Practice and improve your AI skills with hands-on challenges and tutorials'
    }
  }

  const renderAvatar = (kata: AIKataListItem) => {
    const imageUrl = kata.image_url || aiAvatarImage
    const isCompleted = kata.user_progress.status === KataProgressStatus.COMPLETED

    const completedBadge = isCompleted ? (
      <div className="absolute -top-1 -left-1 bg-success-primary text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-surface-base-primary shadow-lg z-10">
        <CheckSvg className="w-3 h-3" />
      </div>
    ) : null

    const enrollmentBadge =
      kata.enrollment_count > 0 ? (
        <div className="absolute -bottom-1 -right-1 bg-not-started-secondary text-white text-[10px] font-bold rounded-full w-12 h-5 px-1 flex items-center justify-center border-2 border-surface-base-primary gap-0.5">
          <DiagramSvg className="w-3 h-3 shrink-0" />
          <span className="truncate">{kata.enrollment_count}</span>
        </div>
      ) : null

    return (
      <div className="relative">
        <img
          src={imageUrl}
          alt={kata.title}
          className="w-[4.5rem] h-[4.5rem] min-w-[4.5rem] min-h-[4.5rem] rounded-full object-cover border-2 border-border-specific-assistant-avatar bg-white/90 shrink-0"
        />
        {completedBadge}
        {enrollmentBadge}
      </div>
    )
  }

  const toggleLike = async (event: React.MouseEvent, kata: AIKataListItem) => {
    event.stopPropagation()
    try {
      if (kata.user_progress.user_reaction === 'like') {
        await katasStore.removeReaction(kata.id)
      } else {
        await katasStore.reactToKata(kata.id, 'like')
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const toggleDislike = async (event: React.MouseEvent, kata: AIKataListItem) => {
    event.stopPropagation()
    try {
      if (kata.user_progress.user_reaction === 'dislike') {
        await katasStore.removeReaction(kata.id)
      } else {
        await katasStore.reactToKata(kata.id, 'dislike')
      }
    } catch (error) {
      console.error('Error toggling dislike:', error)
    }
  }

  const handleNavigationClick = (event: React.MouseEvent) => {
    event.stopPropagation()
  }

  const tooltipClass = (kata: AIKataListItem) => {
    return 'tooltip-target-' + kata.id
  }

  const getStatusBadgeClasses = (status: KataStatus): string => {
    switch (status) {
      case KataStatus.DRAFT:
        return 'bg-not-started-tertiary text-not-started-primary border-border-subtle'
      case KataStatus.ARCHIVED:
        return 'bg-transparent text-failed-secondary border-failed-secondary'
      default:
        return 'bg-success-secondary text-success-primary border-success-primary'
    }
  }

  const getStatusLabel = (status: KataStatus): string => {
    switch (status) {
      case KataStatus.DRAFT:
        return 'Draft'
      case KataStatus.ARCHIVED:
        return 'Archived'
      default:
        return 'Published'
    }
  }

  const renderActions = (kata: AIKataListItem) => {
    const isInProgress = kata.user_progress.status === KataProgressStatus.IN_PROGRESS
    const isNotStarted = kata.user_progress.status === KataProgressStatus.NOT_STARTED
    const isPublished = kata.status === KataStatus.PUBLISHED
    const isLiked = kata.user_progress.user_reaction === 'like'
    const isDisliked = kata.user_progress.user_reaction === 'dislike'

    return (
      <>
        <Tooltip target={'.' + tooltipClass(kata)} position="left" showDelay={100} />

        {/* Show status badge for unpublished katas */}
        {!isPublished && (
          <div className="flex h-full items-center justify-center gap-3">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-lg border ${getStatusBadgeClasses(
                kata.status
              )}`}
            >
              {getStatusLabel(kata.status)}
            </span>
          </div>
        )}

        {/* Show Start/Complete buttons only for published katas */}
        {isPublished && (
          <>
            {isNotStarted && (
              <Button
                variant="primary"
                onClick={(event) => handleStartKata(event, kata)}
                size="medium"
                className={tooltipClass(kata)}
                data-pr-tooltip="Start kata"
                aria-label="Start kata"
              >
                <PlaySvg />
              </Button>
            )}
            {isInProgress && (
              <Button
                variant="action"
                onClick={(event) => handleCompleteKata(event, kata)}
                size="medium"
                className={`${tooltipClass(
                  kata
                )} border-success-primary hover:bg-success-primary hover:border-success-primary`}
                data-pr-tooltip="Mark as complete"
                aria-label="Mark as complete"
              >
                <CheckSvg className="text-success-primary hover:text-white" />
              </Button>
            )}
            <div className="flex h-full pl-4 gap-1 items-center justify-center">
              <Button
                type="tertiary"
                className={tooltipClass(kata)}
                data-pr-tooltip={isLiked ? 'Remove like' : 'Like this kata'}
                aria-label={
                  isLiked
                    ? `Remove like ${kata.unique_likes_count}`
                    : `Like ${kata.unique_likes_count}`
                }
                onClick={(event) => toggleLike(event, kata)}
              >
                {isLiked ? <ThumbUpFilledSvg /> : <ThumbUpSvg />}
                <span className="text-sm-1">{kata.unique_likes_count}</span>
              </Button>

              <div className="h-[12px] w-px bg-border-structural mx-1"></div>

              <Button
                type="tertiary"
                className={tooltipClass(kata)}
                data-pr-tooltip={isDisliked ? 'Remove dislike' : 'Dislike this kata'}
                aria-label={
                  isDisliked
                    ? `Remove dislike ${kata.unique_dislikes_count}`
                    : `Dislike ${kata.unique_dislikes_count}`
                }
                onClick={(event) => toggleDislike(event, kata)}
              >
                {isDisliked ? (
                  <ThumbUpFilledSvg className="transform rotate-180 flex self-center" />
                ) : (
                  <ThumbDownSvg />
                )}
                <span className="text-sm-1">{kata.unique_dislikes_count}</span>
              </Button>
            </div>
          </>
        )}

        <div
          onClick={handleNavigationClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleNavigationClick(e as unknown as React.MouseEvent)
            }
          }}
          role="button"
          tabIndex={0}
          className="flex pl-2 items-center"
        >
          <KataActions kata={kata} onView={handleKataClick} isAdmin={isAdmin} />
        </div>
      </>
    )
  }

  const renderStatus = (kata: AIKataListItem) => {
    return (
      <>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-lg border ${getLevelColorClasses(
            kata.level
          )}`}
        >
          {formatLevel(kata.level)}
        </span>
        <span className="text-xs text-text-quaternary font-medium">
          {kata.duration_minutes} min
        </span>
      </>
    )
  }

  if (isLoading) {
    return (
      <section
        className={`flex flex-col gap-6 ${filterType !== KATA_FILTER_TYPE.ALL ? 'pt-6' : ''}`}
      >
        {filterType !== KATA_FILTER_TYPE.ALL && (
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-2">{getTitle()}</h2>
            <p className="text-text-tertiary mb-6">{getDescription()}</p>
          </div>
        )}
        <div className="flex items-center justify-center p-8">
          <p className="text-text-tertiary">Loading katas...</p>
        </div>
      </section>
    )
  }

  const showCount =
    filterType === KATA_FILTER_TYPE.ALL && totalCount !== undefined && totalCount > 0

  const getTotalCountInfo = () => {
    if (!showCount || !totalCount) return ''
    const label = totalCount === 1 ? 'KATA' : 'KATAS'
    return `${totalCount} ${label}`
  }

  const totalCountInfo = getTotalCountInfo()

  return (
    <section className={filterType !== KATA_FILTER_TYPE.ALL ? 'pt-6' : ''}>
      {filterType !== KATA_FILTER_TYPE.ALL && (
        <div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">{getTitle()}</h2>
          <p className="text-text-tertiary mb-6">{getDescription()}</p>
        </div>
      )}

      {showCount && (
        <div className="flex-row px-1 w-full text-xs text-text-quaternary font-semibold pb-4 pt-6 bg-surface-base-primary">
          {totalCountInfo}
        </div>
      )}

      {katas.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-text-tertiary">No katas available yet</p>
        </div>
      ) : (
        <div
          className={`min-w-80 grid auto-rows-min grid-cols-1 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3 gap-2.5 justify-items-center ${
            filterType === KATA_FILTER_TYPE.ALL ? 'pb-20' : ''
          }`}
        >
          {katas.map((kata) => (
            <Card
              key={kata.id}
              id={kata.id}
              title={kata.title}
              subtitle={kata.creator_name ? `by ${kata.creator_name}` : undefined}
              description={kata.description}
              avatar={renderAvatar(kata)}
              actions={renderActions(kata)}
              status={renderStatus(kata)}
              onClick={() => handleKataClick(kata)}
            />
          ))}
        </div>
      )}

      <CompleteKataConfirmation
        visible={!!kataToComplete}
        onCancel={cancelCompleteKata}
        onConfirm={confirmCompleteKata}
        isCompleting={isCompleting}
      />
    </section>
  )
}

export default AIKatasContent
