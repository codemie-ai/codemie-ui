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

import React, { useMemo, useState } from 'react'

import AttachmentSvg from '@/assets/icons/attachment.svg?react'
import ThumbDownSvg from '@/assets/icons/thumb-down.svg?react'
import ThumbUpFilledSvg from '@/assets/icons/thumb-up-filled.svg?react'
import ThumbUpSvg from '@/assets/icons/thumb-up.svg?react'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Tooltip from '@/components/Tooltip'
import { skillsStore } from '@/store/skills'
import { Skill } from '@/types/entity/skill'

import AttachToAssistantsModal from './AttachToAssistantsModal'
import SkillActions from './SkillActions'
import SkillStatusLabel from './SkillStatusLabel'

interface SkillCardProps {
  skill: Skill
  onView: () => void
  onExport?: () => void
  reloadSkills?: () => void
  isMarketplace?: boolean
}

const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  onView,
  onExport,
  reloadSkills,
  isMarketplace = false,
}) => {
  // Get author name from created_by field (matches assistant structure)
  const authorName = skill.created_by?.name ?? skill.created_by?.username ?? 'Unknown'
  const likesCount = skill.unique_likes_count ?? 0
  const dislikesCount = skill.unique_dislikes_count ?? 0
  const isLiked = skill.is_liked ?? false
  const isDisliked = skill.is_disliked ?? false

  const toggleLike = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      if (isLiked) {
        await skillsStore.removeReaction(skill.id)
      } else {
        await skillsStore.reactToSkill(skill.id, 'like')
      }
      reloadSkills?.()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const toggleDislike = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      if (isDisliked) {
        await skillsStore.removeReaction(skill.id)
      } else {
        await skillsStore.reactToSkill(skill.id, 'dislike')
      }
      reloadSkills?.()
    } catch (error) {
      console.error('Error toggling dislike:', error)
    }
  }

  const tooltipClass = useMemo(() => {
    return 'tooltip-target-' + skill.id
  }, [skill.id])

  const [isAttachModalVisible, setIsAttachModalVisible] = useState(false)

  const handleAttachClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    setIsAttachModalVisible(true)
  }

  const renderActions = () => {
    return (
      <>
        <Tooltip target={'.' + tooltipClass} position="left" showDelay={100} />
        {isMarketplace && (
          <div className="flex h-full pl-4 gap-1 items-center justify-center">
            <Button
              type="tertiary"
              className={tooltipClass}
              data-pr-tooltip={isLiked ? 'Remove like' : 'Like this skill'}
              aria-label={isLiked ? `Remove like ${likesCount}` : `Like ${likesCount}`}
              onClick={toggleLike}
            >
              {isLiked ? (
                <ThumbUpFilledSvg className="w-3 h-3" />
              ) : (
                <ThumbUpSvg className="w-3 h-3" />
              )}
              <span className="text-sm-1">{likesCount}</span>
            </Button>

            <div className="h-3 w-px bg-border-structural mx-1"></div>

            <Button
              type="tertiary"
              className={tooltipClass}
              data-pr-tooltip={isDisliked ? 'Remove dislike' : 'Dislike this skill'}
              aria-label={
                isDisliked ? `Remove dislike ${dislikesCount}` : `Dislike ${dislikesCount}`
              }
              onClick={toggleDislike}
            >
              {isDisliked ? (
                <ThumbUpFilledSvg className="transform rotate-180 flex self-center w-3 h-3" />
              ) : (
                <ThumbDownSvg className="w-3 h-3" />
              )}
              <span className="text-sm-1">{dislikesCount}</span>
            </Button>
          </div>
        )}
        <div className="flex h-full pl-2 gap-1 items-center">
          <Button
            type="tertiary"
            className={tooltipClass}
            data-pr-tooltip="Attach to assistants"
            aria-label="Attach to assistants"
            onClick={handleAttachClick}
          >
            <AttachmentSvg className="w-4 h-4" />
          </Button>
        </div>
        <div
          role="presentation"
          className="flex pl-2 items-center"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <SkillActions
            skill={skill}
            page="list"
            onView={onView}
            onExport={onExport}
            reloadSkills={reloadSkills}
          />
        </div>
      </>
    )
  }

  const renderAvatar = () => {
    return (
      <div className="w-12 h-12 rounded-lg bg-surface-elevated border border-border-secondary flex items-center justify-center shrink-0">
        <span className="text-2xl">📚</span>
      </div>
    )
  }

  const renderStatus = () => {
    return <SkillStatusLabel skill={skill} isMarketplace={isMarketplace} />
  }

  return (
    <>
      <Card
        id={skill.id}
        title={skill.name}
        onClick={onView}
        subtitle={`by ${authorName}`}
        description={skill.description}
        avatar={renderAvatar()}
        actions={renderActions()}
        status={renderStatus()}
      />

      <AttachToAssistantsModal
        isOpen={isAttachModalVisible}
        skill={skill}
        onClose={() => setIsAttachModalVisible(false)}
        onSuccess={() => {
          reloadSkills?.()
        }}
      />
    </>
  )
}

export default React.memo(SkillCard)
