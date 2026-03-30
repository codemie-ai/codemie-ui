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

import { type MultiSelect as TMultiSelect } from 'primereact/multiselect'
import React, { useState, useEffect, forwardRef, useContext, useRef } from 'react'
import { useSnapshot } from 'valtio'

import Avatar from '@/components/Avatar/Avatar'
import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { AssistantIndexScope } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { assistantsStore } from '@/store'
import { cn } from '@/utils/utils'

import { AssistantFormContext } from './AssistantForm/AssistantForm'

export interface AssistantOption {
  id: string
  name: string
  iconUrl?: string
  icon_url?: string // Support snake_case from API
  project?: string
  created_by?: {
    id: string
    name?: string
    username?: string
    email?: string
  }
  [k: string]: any
}

interface AssistantSelectorProps {
  disabled?: boolean
  singleValue?: boolean
  hideHeader?: boolean
  placeholder?: string

  value?: AssistantOption[]
  onChange: (value: AssistantOption[]) => void

  scope?: AssistantIndexScope
  project?: string
  error?: string

  className?: string
  selectClassName?: string
  errorClassName?: string
  initialOptions?: AssistantOption[]
  enlargedLabel?: boolean
}

// Extracted AssistantOption component to comply with Rules of Hooks
const AssistantOptionComponent: React.FC<{ option: AssistantOption }> = ({ option }) => {
  const optionEl = useRef<HTMLParagraphElement>(null)
  const isTruncated = useIsTruncated(optionEl)

  const createdByName = option.created_by?.name ?? option.created_by?.username ?? ''
  const hasMetadata = option.project || createdByName

  return (
    <div className="flex items-center gap-2 w-full overflow-hidden">
      <Avatar
        iconUrl={option.iconUrl ?? option.icon_url}
        name={option.name}
        type={AvatarType.DROPDOWN}
      />
      <div className="flex flex-col min-w-0 flex-1">
        <p
          ref={optionEl}
          className="truncate text-sm font-medium"
          data-tooltip-id="react-tooltip"
          data-tooltip-content={isTruncated ? option.name : ''}
        >
          {option.name}
        </p>
        {hasMetadata && (
          <p className="text-xs text-text-tertiary truncate">
            {option.project && <span>{option.project}</span>}
            {option.project && createdByName && <span> • </span>}
            {createdByName && <span>by {createdByName}</span>}
          </p>
        )}
      </div>
    </div>
  )
}

const AssistantSelector: React.FC<AssistantSelectorProps> = forwardRef<
  TMultiSelect,
  AssistantSelectorProps
>(
  (
    {
      disabled,
      singleValue = false,
      hideHeader,
      placeholder,
      value = [],
      onChange,
      scope,
      project,
      error,
      className,
      selectClassName,
      errorClassName,
      initialOptions,
      enlargedLabel = false,
    },
    ref
  ) => {
    const [options, setOptions] = useState<AssistantOption[]>([])
    const [initialValue] = useState(value)

    const assistantsSnapshot = useSnapshot(assistantsStore)
    const { assistant } = useContext(AssistantFormContext)

    const getAssistantOptions = async (searchTerm = '') => {
      try {
        // This should be replaced with the actual API call from your store
        const assistants =
          (await assistantsSnapshot.getAssistantOptions?.(searchTerm, { project }, scope)) || []

        const formattedOptions = assistants.map((assistant) => ({
          id: assistant.id,
          name: assistant.name,
          iconUrl: assistant.icon_url,
          project: assistant.project,
          created_by: assistant.created_by,
        }))

        setOptions(formattedOptions)
      } catch (error) {
        console.error('Error fetching assistant options:', error)
        setOptions([])
      }
    }

    const getMultiselectOptions = () => {
      // Include selected values that might not be in the options list
      const hiddenOptions = value.filter(
        (selectedItem) => !options.find((option) => option.id === selectedItem.id)
      )
      return [...options, ...hiddenOptions].filter((option) => option.id !== assistant?.id)
    }

    const resetValue = () => {
      onChange(initialValue)
    }

    useEffect(() => {
      if (initialOptions) {
        const formattedOptions = initialOptions.map((assistant) => ({
          id: assistant.id,
          name: assistant.name,
          iconUrl: assistant.iconUrl,
          project: assistant.project,
          created_by: assistant.created_by,
        }))
        setOptions(formattedOptions)
      }
    }, [initialOptions])

    useEffect(() => {
      if (initialOptions) {
        return
      }
      resetValue()
      getAssistantOptions()
    }, [project]) // Run when project changes

    const handleFilter = (filterValue: string) => {
      getAssistantOptions(filterValue)
    }

    // Custom option renderer for MultiSelect
    const Option = (option: AssistantOption): React.ReactNode => {
      return <AssistantOptionComponent option={option} />
    }

    const handleChange = (selectedOptions: { value: string[] }) => {
      const options = getMultiselectOptions()
      const newValue = selectedOptions.value.map((id) => {
        const option = options.find((option) => option.id === id)
        return {
          id,
          name: option?.name || '',
          iconUrl: option?.iconUrl || '',
          project: option?.project,
          created_by: option?.created_by,
        }
      })

      onChange(newValue)
    }
    const preparedValue = value.map((item) => item.id) || []

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {!hideHeader && (
          <>
            <div
              className={cn(
                enlargedLabel ? 'text-sm leading-6 text-white' : 'text-xs text-text-quaternary'
              )}
            >
              Sub-Assistants
            </div>
            <InfoBox className="mb-2">
              Important note: Including Assistants that have Sub-Assistants is not supported.
            </InfoBox>
          </>
        )}
        <div className="flex gap-2">
          <MultiSelect
            ref={ref}
            key={project}
            disabled={disabled}
            value={preparedValue}
            onChange={handleChange}
            options={getMultiselectOptions()}
            label=""
            className="max-w-full"
            inputClassName={selectClassName}
            errorClassName={errorClassName}
            placeholder={placeholder ?? 'Select Sub-Assistants'}
            onFilter={handleFilter}
            renderOption={Option}
            error={error}
            fullWidth
            size="medium"
            optionLabel="name"
            optionValue="id"
            singleValue={singleValue}
            showCheckbox={!singleValue}
          />
        </div>
      </div>
    )
  }
)

export default AssistantSelector
