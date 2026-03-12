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
import { useState, useEffect, forwardRef, useRef, useMemo, ReactNode } from 'react'

import Avatar from '@/components/Avatar/Avatar'
import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { AvatarType } from '@/constants/avatar'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { workflowsStore } from '@/store/workflows'
import { cn } from '@/utils/utils'

export type WorkflowSelectorOption = {
  id: string
  name: string
  iconUrl?: string
}

export interface WorkflowSelectorProps {
  disabled?: boolean
  singleValue?: boolean
  label?: string
  description?: string
  placeholder?: string
  className?: string
  selectClassName?: string
  errorClassName?: string

  value?: WorkflowSelectorOption[]
  onChange: (value: WorkflowSelectorOption[]) => void

  project?: string
  initialOptions?: WorkflowSelectorOption[]

  error?: string
}

const WorkflowSelector = forwardRef<TMultiSelect, WorkflowSelectorProps>(
  (
    {
      disabled = false,
      singleValue = false,
      label,
      description,
      placeholder = 'Select Workflows',
      className,
      selectClassName,
      errorClassName,
      value = [],
      onChange,
      project,
      initialOptions,
      error,
    },
    ref
  ) => {
    const [options, setOptions] = useState<WorkflowSelectorOption[]>([])
    const [initialValue] = useState(value)

    const fetchWorkflowOptions = async (search: string = '') => {
      try {
        const formattedOptions: WorkflowSelectorOption[] = (
          await workflowsStore.getWorkflowOptions({ search, project })
        ).map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
          iconUrl: workflow.icon_url ?? '',
        }))

        setOptions(formattedOptions)
      } catch (error) {
        console.error('Error fetching workflow options:', error)
        setOptions([])
      }
    }

    const multiselectOptions = useMemo(() => {
      const selectedValues = Array.isArray(value) ? value : []

      // Include selected values that might not be in the options list
      const hiddenOptions = selectedValues.filter(
        (selectedItem) => !options.find((option) => option.id === selectedItem.id)
      )

      return [...options, ...hiddenOptions]
    }, [options, value])

    const resetValue = () => {
      onChange(initialValue)
    }

    useEffect(() => {
      if (initialOptions) {
        const formattedOptions: WorkflowSelectorOption[] = initialOptions.map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
          iconUrl: workflow.iconUrl,
        }))

        setOptions(formattedOptions)
      } else {
        fetchWorkflowOptions()
      }
    }, [initialOptions])

    useEffect(() => {
      if (initialOptions) {
        return
      }
      resetValue()
      fetchWorkflowOptions()
    }, [project])

    const handleFilter = (filterValue: string) => {
      fetchWorkflowOptions(filterValue)
    }

    const OptionTemplate = (option: WorkflowSelectorOption): ReactNode => {
      const optionEl = useRef<HTMLParagraphElement>(null)
      const isTruncated = useIsTruncated(optionEl)

      return (
        <div className="flex items-center gap-2 ">
          <Avatar iconUrl={option.iconUrl} name={option.name} type={AvatarType.DROPDOWN} />
          <p
            ref={optionEl}
            className="truncate"
            data-tooltip-id="react-tooltip"
            data-tooltip-content={isTruncated ? option.name : ''}
          >
            {option.name}
          </p>
        </div>
      )
    }

    const handleChange = (selectedOptions: { value: string[] }) => {
      const newValue: WorkflowSelectorOption[] = selectedOptions.value.map((id) => {
        const option = multiselectOptions.find((opt) => opt.id === id)
        return {
          id,
          name: option?.name ?? '',
          iconUrl: option?.iconUrl ?? '',
        }
      })

      onChange(newValue)
    }

    const preparedValue = value.map((item) => item.id)

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {label && <div className="text-xs text-text-quaternary">{label}</div>}

        {description && <InfoBox className="mb-2">{description}</InfoBox>}

        <MultiSelect
          ref={ref}
          disabled={disabled}
          value={preparedValue}
          onChange={handleChange}
          options={multiselectOptions}
          label=""
          className="max-w-full"
          inputClassName={selectClassName}
          placeholder={placeholder}
          onFilter={handleFilter}
          renderOption={OptionTemplate}
          error={error}
          errorClassName={errorClassName}
          fullWidth
          size="medium"
          optionLabel="name"
          optionValue="id"
          singleValue={singleValue}
          showCheckbox={!singleValue}
        />
      </div>
    )
  }
)

export default WorkflowSelector
