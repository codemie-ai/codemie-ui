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
import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { MAX_SKILL_CATEGORIES } from '@/constants/skills'
import { skillsStore } from '@/store/skills'

interface SkillCategoriesProps {
  value?: string[]
  error?: string
  onChange: (categoryIds: string[]) => void
}

const CategoryOption = ({ label }: { label: string }) => (
  <div className="flex flex-col">
    <div className="text-sm font-medium">{label}</div>
  </div>
)

const renderCategoryOption = (option: { label: string }) => <CategoryOption label={option.label} />

const SkillCategories = forwardRef<PrimeMultiselect, SkillCategoriesProps>(
  ({ value, error: formError, onChange }, ref) => {
    const [isLoading, setIsLoading] = useState(true)
    const [localError, setLocalError] = useState('')
    const { skillCategories } = useSnapshot(skillsStore)

    // Ensure value is always an array
    const controlledValue = value ?? []

    const categoryOptions = useMemo(() => {
      return skillCategories.map((cat) => ({
        label: cat.label,
        value: cat.value,
      }))
    }, [skillCategories])

    const handleChange = (categoryIds: string[]) => {
      if (categoryIds?.length > MAX_SKILL_CATEGORIES) {
        setLocalError(`You can select maximum ${MAX_SKILL_CATEGORIES} categories`)
      } else {
        setLocalError('')
        onChange(categoryIds)
      }
    }

    const displayError = localError || formError

    useEffect(() => {
      const fetchData = async () => {
        try {
          await skillsStore.getSkillCategories()
        } catch (err) {
          console.error('Failed to load categories:', err)
        } finally {
          setIsLoading(false)
        }
      }

      fetchData()
    }, [])

    return (
      <div className="flex flex-col gap-y-3">
        <MultiSelect
          showCheckbox
          ref={ref}
          scrollHeight="215px"
          label="Categories:"
          placeholder="Select categories"
          options={categoryOptions}
          value={controlledValue}
          error={displayError}
          loading={isLoading}
          onChange={(e) => handleChange(e.value)}
          renderOption={renderCategoryOption}
        />
        <InfoBox>Choose up to {MAX_SKILL_CATEGORIES} categories that describe your skill.</InfoBox>
      </div>
    )
  }
)

SkillCategories.displayName = 'SkillCategories'

export default SkillCategories
