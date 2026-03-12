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

import { Skill } from '@/types/entity/skill'
import { pluralize } from '@/utils/helpers'
import { cn } from '@/utils/utils'

import SkillCard from './SkillCard'

interface SkillsGridProps {
  skills: Skill[]
  totalCount?: number
  onViewSkill: (skill: Skill) => void
  onExportSkill?: (skill: Skill) => void
  reloadSkills?: () => void
  isMarketplace?: boolean
}

const SkillsGrid: React.FC<SkillsGridProps> = ({
  skills = [],
  totalCount,
  onViewSkill,
  onExportSkill,
  reloadSkills,
  isMarketplace = false,
}) => {
  const totalCountInfo = totalCount
    ? `${totalCount} ${pluralize(totalCount, 'skill').toUpperCase()}`
    : null

  if (!skills || skills.length === 0) {
    return (
      <div className="flex justify-center m-40">
        <h2>No skills found.</h2>
      </div>
    )
  }

  return (
    <section>
      {totalCountInfo && (
        <div className="flex-row px-1 w-full text-xs text-text-secondary font-semibold pb-4 pt-6 bg-surface-base-primary">
          {totalCountInfo}
        </div>
      )}

      <div
        className={cn(
          'min-w-80 grid auto-rows-min grid-cols-1 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3 gap-2.5 justify-items-center pb-20'
        )}
      >
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onView={() => onViewSkill(skill)}
            onExport={onExportSkill ? () => onExportSkill(skill) : undefined}
            reloadSkills={reloadSkills}
            isMarketplace={isMarketplace}
          />
        ))}
      </div>
    </section>
  )
}

export default React.memo(SkillsGrid)
