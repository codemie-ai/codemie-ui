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

import { FC, useEffect, useMemo } from 'react'

import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { MAX_SKILLS_PER_ASSISTANT } from '@/constants/skills'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'

import { useChatConfigSkills } from '../../hooks/useChatConfigSkills'
import { useChatContext } from '../../hooks/useChatContext'

export type SkillOption = {
  label: string
  value: string
  description?: string
}

const ChatConfigSkillsSelector: FC = () => {
  const [isSkillsEnabled] = useFeatureFlag('skills')
  const { selectedSkills, setSelectedSkills } = useChatContext()
  const { skills, loading, searchSkills, initialLoad } = useChatConfigSkills()

  // Load skills when component mounts (config panel opens)
  useEffect(() => {
    if (isSkillsEnabled) {
      initialLoad()
    }
  }, [isSkillsEnabled, initialLoad])

  const options = useMemo(() => {
    return skills.map((skill) => ({
      label: skill.name,
      value: skill.id,
      description: skill.description,
    }))
  }, [skills])

  const multiselectOptions = useMemo(() => {
    const hiddenOptions = selectedSkills.filter(
      (selectedSkill) => !options.find((option) => option.value === selectedSkill.value)
    )
    return [...options, ...hiddenOptions]
  }, [options, selectedSkills])

  const selectedSkillIds = useMemo(() => selectedSkills.map((s) => s.value), [selectedSkills])

  const handleChange = (selectedOptions: { value: string[] }) => {
    if (selectedOptions.value.length > MAX_SKILLS_PER_ASSISTANT) {
      return
    }

    const newSkills = selectedOptions.value.map((skillId) => {
      const option = multiselectOptions.find((opt) => opt.value === skillId)
      return {
        value: skillId,
        label: option?.label || '',
        description: option?.description,
      }
    })

    setSelectedSkills(newSkills)
  }

  const handleFilter = (query: string) => {
    searchSkills(query)
  }

  // Hide if skills feature is disabled
  if (!isSkillsEnabled) {
    return null
  }

  return (
    <div className="mt-6">
      <div className="text-xs text-text-quaternary mb-2">Skills</div>
      <MultiSelect
        showCheckbox
        scrollHeight="215px"
        placeholder={loading ? 'Loading skills...' : 'Select skills'}
        options={multiselectOptions}
        value={selectedSkillIds}
        loading={loading}
        onChange={handleChange}
        onFilter={handleFilter}
        filterPlaceholder="Search skills..."
        optionLabel="label"
        optionValue="value"
        renderOption={(option) => {
          const skillOption = option as SkillOption
          return (
            <div className="flex flex-col">
              <div className="text-sm font-medium">{skillOption.label}</div>
              {skillOption.description && (
                <p className="text-xs text-text-secondary mt-0.5 truncate">
                  {skillOption.description}
                </p>
              )}
            </div>
          )
        }}
      />
      <InfoBox className="mt-3">
        Choose up to {MAX_SKILLS_PER_ASSISTANT} skills to enhance your assistant for this chat.
      </InfoBox>
    </div>
  )
}

ChatConfigSkillsSelector.displayName = 'ChatConfigSkillsSelector'

export default ChatConfigSkillsSelector
