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

import React, { useState, useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import MultiSelect from '@/components/form/MultiSelect'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { assistantsStore } from '@/store'

interface Category {
  id: string
  name: string
  description: string
}

interface CategorySelectorProps {
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  error?: string
  disabled?: boolean
  hideHeader?: boolean
  placeholder?: string
  hint?: string
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories,
  onCategoriesChange,
  error,
  disabled = false,
  hideHeader = false,
  placeholder,
  hint,
}) => {
  const [categoriesOptions, setCategoriesOptions] = useState<
    Array<{ value: string; label: string; description: string }>
  >([])
  const { assistantCategories } = useSnapshot(assistantsStore)

  useEffect(() => {
    const options = assistantCategories.map((category: Category) => ({
      value: category.id,
      label: category.name,
      description: category.description,
    }))
    setCategoriesOptions(options)
  }, [assistantCategories])

  const Option = (option) => {
    const optionEl = useRef<HTMLDivElement>(null)
    const isTruncated = useIsTruncated(optionEl)

    return (
      <div className="flex flex-col py-1 overflow-hidden w-full">
        <div className="text-sm font-medium">{option.label}</div>
        <div
          ref={optionEl}
          className="text-xs text-text-quaternary mt-0.5 truncate"
          data-tooltip-id="react-tooltip"
          data-tooltip-content={isTruncated ? option.description : ''}
        >
          {option.description}
        </div>
      </div>
    )
  }

  return (
    <div className="category-selector">
      {!hideHeader && (
        <div className="mb-2">
          <h3 className="text-base font-medium text-text-quaternary">Select Categories</h3>
          {hint && <p className="text-sm text-text-quaternary mt-1">{hint}</p>}
        </div>
      )}
      <MultiSelect
        id="assistant-categories"
        name="categories"
        value={selectedCategories}
        onChange={(e) => {
          const newCategories = e.value as string[]
          if (newCategories.length <= 3) {
            onCategoriesChange(newCategories)
          }
        }}
        options={categoriesOptions}
        placeholder={placeholder || 'Select up to 3 categories'}
        disabled={disabled}
        className={`w-full ${error ? 'border-border-error' : ''}`}
        showCheckbox={true}
        scrollHeight="250px"
        renderOption={Option}
        error={error}
      />
    </div>
  )
}

export default CategorySelector
