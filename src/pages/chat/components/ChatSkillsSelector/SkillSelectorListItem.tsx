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

import ExternalSvg from '@/assets/icons/external.svg?react'
import { Checkbox } from '@/components/form/Checkbox'
import { Skill, SkillVisibility } from '@/types/entity/skill'
import { cn, getRootPath } from '@/utils/utils'

interface SkillSelectorListItemProps {
  skill: Skill
  isSelected: boolean
  onToggle: () => void
}

const SkillSelectorListItem: React.FC<SkillSelectorListItemProps> = ({
  skill,
  isSelected,
  onToggle,
}) => {
  const handleOpenDetails = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(`${getRootPath()}/#/skills/${skill.id}`, '_blank')
  }

  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 cursor-pointer hover:bg-surface-hover transition-colors',
        isSelected && 'bg-surface-elevated'
      )}
    >
      <Checkbox checked={isSelected} onChange={onToggle} rootClassName="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">{skill.name}</span>
          {skill.visibility === SkillVisibility.PUBLIC && (
            <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded bg-action-primary-tonal text-action-primary-solid">
              Public
            </span>
          )}
        </div>
        {skill.description && (
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{skill.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-text-tertiary">
          {skill.project && (
            <span className="truncate max-w-32" title={skill.project}>
              Project: {skill.project}
            </span>
          )}
          {skill.created_by?.name && (
            <span className="truncate max-w-32" title={skill.created_by.name}>
              By: {skill.created_by.name}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleOpenDetails}
        className="shrink-0 p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-elevated rounded transition-colors"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Open skill details"
      >
        <ExternalSvg className="w-4 h-4" />
      </button>
    </label>
  )
}

SkillSelectorListItem.displayName = 'SkillSelectorListItem'

export default SkillSelectorListItem
