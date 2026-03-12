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

import React, { useMemo } from 'react'

import Spinner from '@/components/Spinner'
import { Skill } from '@/types/entity/skill'

import SkillSelectorListItem from './SkillSelectorListItem'

interface SkillSelectorListProps {
  skills: Skill[]
  selectedIds: string[]
  onToggle: (skillId: string) => void
  loading?: boolean
}

const SkillSelectorList: React.FC<SkillSelectorListProps> = ({
  skills,
  selectedIds,
  onToggle,
  loading = false,
}) => {
  // Use Set for O(1) lookup instead of Array.includes() O(n)
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner rootClassName="min-h-0" className="w-6 h-6" />
      </div>
    )
  }

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-text-secondary">
        <p className="text-sm">No skills available</p>
        <p className="text-xs mt-1">Create skills in the Skills page to use them here</p>
      </div>
    )
  }

  return (
    <div className="max-h-64 overflow-y-auto border border-border-primary rounded-lg divide-y divide-border-primary">
      {skills.map((skill) => (
        <SkillSelectorListItem
          key={skill.id}
          skill={skill}
          isSelected={selectedIdsSet.has(skill.id)}
          onToggle={() => onToggle(skill.id)}
        />
      ))}
    </div>
  )
}

SkillSelectorList.displayName = 'SkillSelectorList'

export default SkillSelectorList
