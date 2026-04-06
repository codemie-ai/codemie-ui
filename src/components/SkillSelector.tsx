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

import { MultiSelect as PrimeMultiselect } from 'primereact/multiselect'
import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react'

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import CreateSkillPopup from '@/components/CreateSkillPopup'
import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { MAX_SKILLS_PER_ASSISTANT } from '@/constants/skills'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { SelectOption, useSkillSelector } from '@/hooks/useSkillSelector'
import { Skill } from '@/types/entity/skill'

interface SkillOptionProps {
  option: { label: string; value: string }
  options: SelectOption[]
}

const SkillOption: React.FC<SkillOptionProps> = ({ option, options }) => {
  const optionEl = useRef<HTMLParagraphElement>(null)
  const isTruncated = useIsTruncated(optionEl)
  const fullOption = options.find((opt) => opt.value === option.value)
  const description = fullOption?.description

  return (
    <div className="flex flex-col">
      <div className="text-sm font-medium">{option.label}</div>
      {description && (
        <p
          ref={optionEl}
          data-tooltip-id="react-tooltip"
          data-tooltip-class-name="max-w-2xl"
          data-tooltip-content={isTruncated ? description : ''}
          className="text-xs text-text-secondary mt-0.5 truncate"
        >
          {description}
        </p>
      )}
    </div>
  )
}

export interface SkillSelectorProps {
  value?: (string | undefined)[]
  onChange?: (value: string[]) => void
  project: string
  error?: string
}

const SkillSelector = forwardRef<PrimeMultiselect, SkillSelectorProps>(
  ({ value, onChange, project, error: externalError }, ref) => {
    const { options, loading, refetch } = useSkillSelector(project)
    const [error, setError] = useState('')
    const [isCreatePopupVisible, setIsCreatePopupVisible] = useState(false)
    const createdSkillIdRef = useRef<string | null>(null)

    // Filter out undefined values
    const cleanValue = useMemo(
      () => (value ?? []).filter((v): v is string => v !== undefined),
      [value]
    )

    // Use refs to avoid stale closures in async callback
    const cleanValueRef = useRef(cleanValue)
    cleanValueRef.current = cleanValue
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    const handleChange = (skillIds: string[]) => {
      if (skillIds?.length > MAX_SKILLS_PER_ASSISTANT) {
        setError(`You can select maximum ${MAX_SKILLS_PER_ASSISTANT} skills`)
      } else {
        setError('')
        onChange?.(skillIds)
      }
    }

    const handleSkillPopupClose = useCallback(async () => {
      setIsCreatePopupVisible(false)
      await refetch()

      // If a skill was just created, auto-select it
      const createdSkillId = createdSkillIdRef.current
      if (createdSkillId) {
        createdSkillIdRef.current = null
        const currentValue = cleanValueRef.current
        if (currentValue.length < MAX_SKILLS_PER_ASSISTANT) {
          onChangeRef.current?.([...currentValue, createdSkillId])
        }
      }
    }, [refetch])

    const handleSkillCreated = useCallback((skill: Skill) => {
      // Store the created skill ID for later selection
      createdSkillIdRef.current = skill.id
    }, [])

    return (
      <div className="flex flex-col gap-y-3">
        <div className="flex justify-between items-end">
          <div className="text-xs text-text-quaternary">Skills</div>
          <Button
            variant="secondary"
            disabled={!project}
            onClick={() => setIsCreatePopupVisible(true)}
          >
            <PlusSvg /> Create
          </Button>
        </div>

        <MultiSelect
          showCheckbox
          ref={ref}
          scrollHeight="215px"
          onFilter={() => {}}
          label=""
          placeholder={loading ? 'Loading skills...' : 'Select skills'}
          options={options.map((opt) => ({ label: opt.label, value: opt.value }))}
          value={cleanValue}
          error={error || externalError}
          loading={loading}
          disabled={!project}
          hasVirtualScroll
          onChange={(e) => handleChange(e.value)}
          renderOption={(option) => (
            <SkillOption option={option as SelectOption} options={options} />
          )}
        />

        <InfoBox>Choose up to {MAX_SKILLS_PER_ASSISTANT} skills to enhance your assistant.</InfoBox>

        <CreateSkillPopup
          visible={isCreatePopupVisible}
          onClose={handleSkillPopupClose}
          onSuccess={handleSkillCreated}
          defaultProject={project}
        />
      </div>
    )
  }
)

SkillSelector.displayName = 'SkillSelector'

export default SkillSelector
