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

import React from 'react'

import NotSharedSvg from '@/assets/icons/shared-no.svg?react'
import SharedSvg from '@/assets/icons/shared-yes.svg?react'
import { Skill, SkillVisibility } from '@/types/entity/skill'

interface SkillStatusLabelProps {
  skill: Skill
  isMarketplace?: boolean
}

const STATUS_TEXT = {
  PROJECT: 'Shared with Project',
  PRIVATE: 'Not shared',
}

const SkillStatusLabel: React.FC<SkillStatusLabelProps> = ({ skill, isMarketplace = false }) => {
  const assistantsCount = skill.assistants_count ?? 0

  const getVisibilityIcon = () => {
    if (
      skill.visibility === SkillVisibility.PROJECT ||
      skill.visibility === SkillVisibility.PUBLIC
    ) {
      return <SharedSvg />
    }
    return <NotSharedSvg />
  }

  const getVisibilityText = (): string => {
    if (
      skill.visibility === SkillVisibility.PROJECT ||
      skill.visibility === SkillVisibility.PUBLIC
    ) {
      return STATUS_TEXT.PROJECT
    }
    return STATUS_TEXT.PRIVATE
  }

  if (isMarketplace) {
    // Marketplace: show only assistants count
    const assistantText = `${assistantsCount} assistant${assistantsCount === 1 ? '' : 's'}`
    return (
      <div
        role="status"
        aria-label={assistantText}
        className="flex flex-row items-center text-xs gap-3 whitespace-nowrap"
      >
        <span className="text-text-secondary">{assistantText}</span>
      </div>
    )
  }

  // Regular: show only visibility status
  const visibilityText = getVisibilityText()
  return (
    <div
      role="status"
      aria-label={visibilityText}
      className="flex flex-row items-center text-xs gap-3 whitespace-nowrap"
    >
      {getVisibilityIcon()}
      <span>{visibilityText}</span>
    </div>
  )
}

const MemoizedSkillStatusLabel = React.memo(SkillStatusLabel)
MemoizedSkillStatusLabel.displayName = 'SkillStatusLabel'

export default MemoizedSkillStatusLabel
