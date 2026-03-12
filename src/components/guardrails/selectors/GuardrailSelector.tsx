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

import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { guardrailStore } from '@/store/guardrail'
import { cn } from '@/utils/utils'

export type GuardrailSelectorOption = {
  id: string
  name: string
}

export interface GuardrailSelectorProps {
  disabled?: boolean
  singleValue?: boolean
  label?: string
  description?: string
  placeholder?: string
  className?: string
  errorClassName?: string

  value?: GuardrailSelectorOption[]
  onChange: (value: GuardrailSelectorOption[]) => void

  project?: string
  initialOptions?: GuardrailSelectorOption[]
  excludeIds?: string[]

  error?: string
}

const GuardrailSelector = forwardRef<TMultiSelect, GuardrailSelectorProps>(
  (
    {
      disabled = false,
      singleValue = false,
      label,
      description,
      placeholder = 'Select Guardrail',
      className,
      errorClassName,
      value = [],
      onChange,
      project,
      initialOptions,
      excludeIds = [],
      error,
    },
    ref
  ) => {
    const [options, setOptions] = useState<GuardrailSelectorOption[]>(initialOptions ?? [])
    const [initialValue] = useState(value)

    const fetchGuardrailOptions = async (search = '') => {
      try {
        const formattedOptions = (
          await guardrailStore.fetchGuardrails({ search, project })
        ).data.map((guardrail) => ({
          id: guardrail.guardrailId,
          name: guardrail.name,
        }))

        setOptions(formattedOptions)
      } catch (error) {
        console.error('Error fetching guardrail options:', error)
        setOptions([])
      }
    }

    const multiselectOptions = useMemo(() => {
      const selectedValues = Array.isArray(value) ? value : []

      const hiddenOptions = selectedValues.filter(
        (selectedItem) => !options.find((option) => option.id === selectedItem.id)
      )

      const selectedIds = new Set(selectedValues.map((v) => v.id))
      const filteredOptions = options.filter(
        (option) => !excludeIds.includes(option.id) || selectedIds.has(option.id)
      )

      return [...filteredOptions, ...hiddenOptions]
    }, [options, value, excludeIds])

    const resetValue = () => {
      onChange(initialValue)
    }

    useEffect(() => {
      if (initialOptions) {
        const formattedOptions: GuardrailSelectorOption[] = initialOptions.map((guardrail) => ({
          id: guardrail.id,
          name: guardrail.name,
        }))

        setOptions(formattedOptions)
      } else {
        resetValue()
        fetchGuardrailOptions()
      }
    }, [project, initialOptions])

    const handleFilter = (filterValue: string) => {
      fetchGuardrailOptions(filterValue)
    }

    const OptionTemplate = (option: GuardrailSelectorOption): ReactNode => {
      const optionEl = useRef<HTMLParagraphElement>(null)
      const isTruncated = useIsTruncated(optionEl)

      return (
        <div className="flex items-center gap-2">
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

    const handleChange = (selectedOptions: { value: string[] | string }) => {
      if (
        singleValue &&
        (!selectedOptions.value ||
          (Array.isArray(selectedOptions.value) && selectedOptions.value.length === 0))
      ) {
        return
      }

      let valueArray: string[]
      if (Array.isArray(selectedOptions.value)) {
        valueArray = selectedOptions.value
      } else if (selectedOptions.value) {
        valueArray = [selectedOptions.value]
      } else {
        valueArray = []
      }

      if (singleValue && valueArray.length > 1) {
        valueArray = [valueArray[valueArray.length - 1]]
      }

      const newValue: GuardrailSelectorOption[] = valueArray.map((id) => {
        const option = multiselectOptions.find((opt) => opt.id === id)
        return {
          id,
          name: option?.name ?? '',
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
          inputClassName="min-h-[32px] max-h-[32px]"
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
        />
      </div>
    )
  }
)

export default GuardrailSelector
