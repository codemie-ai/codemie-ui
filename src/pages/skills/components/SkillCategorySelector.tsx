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

import React, { useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import MultiSelect from '@/components/form/MultiSelect'
import { MAX_SKILL_CATEGORIES } from '@/constants/skills'
import { skillsStore } from '@/store/skills'
import { cn } from '@/utils/utils'

interface SkillCategorySelectorProps {
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  error?: string
  disabled?: boolean
  hideHeader?: boolean
  placeholder?: string
  hint?: string
}

const CategorySelectorOption = ({ label }: { label: string }) => (
  <div className="flex flex-col py-1 overflow-hidden w-full">
    <div className="text-sm font-medium">{label}</div>
  </div>
)

const renderCategorySelectorOption = (option: { label: string }) => (
  <CategorySelectorOption label={option.label} />
)

const SkillCategorySelector: React.FC<SkillCategorySelectorProps> = ({
  selectedCategories,
  onCategoriesChange,
  error,
  disabled = false,
  hideHeader = false,
  placeholder,
  hint,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const { skillCategories } = useSnapshot(skillsStore)

  const categoryOptions = useMemo(() => {
    return skillCategories.map((cat) => ({
      label: cat.label,
      value: cat.value,
    }))
  }, [skillCategories])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        await skillsStore.getSkillCategories()
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCategories()
  }, [])

  return (
    <div className="flex flex-col">
      {!hideHeader && (
        <div className="mb-2">
          <h3 className="text-base font-medium text-text-quaternary">Select Categories</h3>
          {hint && <p className="text-sm text-text-secondary mt-1">{hint}</p>}
        </div>
      )}
      <MultiSelect
        id="skill-categories"
        name="categories"
        value={selectedCategories}
        onChange={(e) => {
          const newCategories = e.value as string[]
          if (newCategories.length <= MAX_SKILL_CATEGORIES) {
            onCategoriesChange(newCategories)
          }
        }}
        options={categoryOptions}
        placeholder={placeholder ?? `Select up to ${MAX_SKILL_CATEGORIES} categories`}
        disabled={disabled}
        className={cn('w-full', error && 'border-failed-secondary')}
        showCheckbox={true}
        scrollHeight="250px"
        renderOption={renderCategorySelectorOption}
        error={error}
        loading={isLoading}
      />
    </div>
  )
}

export default SkillCategorySelector
