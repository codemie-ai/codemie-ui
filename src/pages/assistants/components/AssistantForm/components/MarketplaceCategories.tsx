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
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { assistantsStore } from '@/store'

const MAX_CATEGORIES = 3

interface MarketplaceCategoriesProps {
  value?: string[]
  onChange: (categoryIds: string[]) => void
  isAIGenerated?: boolean
}

const MarketplaceCategories = forwardRef<PrimeMultiselect, MarketplaceCategoriesProps>(
  ({ value, onChange, isAIGenerated = false }, ref) => {
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const { assistantCategories, getAssistantCategories } = useSnapshot(assistantsStore)

    const categoryOptions = useMemo(() => {
      return assistantCategories.map((cat) => ({
        label: cat.name,
        value: cat.id,
        description: cat.description,
      }))
    }, [assistantCategories])

    type Option = (typeof categoryOptions)[0]

    const handleChange = (categoryIds: string[]) => {
      if (categoryIds?.length > MAX_CATEGORIES)
        setError(`You can select maximum ${MAX_CATEGORIES} categories`)
      else {
        setError('')
        onChange(categoryIds)
      }
    }

    useEffect(() => {
      const fetchData = async () => {
        try {
          await getAssistantCategories()
        } catch (err) {
          console.error('Failed to load categories')
        } finally {
          setIsLoading(false)
        }
      }

      fetchData()
    }, [])

    const CategoryOption = (option: Option) => {
      const optionEl = useRef<HTMLParagraphElement>(null)
      const isTruncated = useIsTruncated(optionEl)

      return (
        <div className="flex flex-col">
          <div className="text-sm font-medium">{option.label}</div>
          {option.description && (
            <p
              ref={optionEl}
              data-tooltip-id="react-tooltip"
              data-tooltip-class-name="max-w-2xl"
              data-tooltip-content={isTruncated ? option.description : ''}
              className="text-xs text-text-quaternary mt-0.5 truncate"
            >
              {option.description}
            </p>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-y-3">
        {isAIGenerated && (
          <div className="text-xs pb-2 text-text-quaternary flex items-center gap-2">
            Categories:
            <AIFieldSvg className="w-4 h-4" />
          </div>
        )}
        <MultiSelect
          showCheckbox
          ref={ref}
          scrollHeight="215px"
          onFilter={() => {}}
          label={isAIGenerated ? undefined : 'Categories:'}
          placeholder="Select categories"
          options={categoryOptions}
          value={value ?? []}
          error={error}
          loading={isLoading}
          onChange={(e) => handleChange(e.value)}
          renderOption={(option) => CategoryOption(option as Option)}
        />
        <InfoBox>Choose up to 3 categories that describe your assistant&apos;s use case.</InfoBox>
      </div>
    )
  }
)

export default MarketplaceCategories
