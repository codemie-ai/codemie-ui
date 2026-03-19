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

import React, { useEffect, useId, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import { cn } from '@/utils/utils'

import { RadioButton } from '../RadioButton'

export interface RadioOption {
  label: string
  value: string | number | boolean | null
  tooltip?: string
}

export interface RadioGroupProps {
  options: RadioOption[]
  value?: string | number | boolean | null
  defaultValue?: string | number | boolean | null
  name: string
  onChange: (value: string | number | boolean | null) => void
  className?: string
  optionClassName?: string
  vertical?: boolean
  label?: string
  required?: boolean
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  defaultValue,
  name,
  onChange,
  className,
  optionClassName,
  vertical = false,
  label,
  required,
}) => {
  const id = useId()
  const [selectedValue, setSelectedValue] = useState<string | number | boolean | null>(
    value ?? defaultValue ?? null
  )

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  useEffect(() => {
    // Set default value on initial render if provided and no value is set
    if (defaultValue !== undefined && value === undefined && selectedValue === null) {
      setSelectedValue(defaultValue)
      onChange(defaultValue)
    }
  }, [defaultValue, value, selectedValue, onChange])

  const handleChange = (optionValue: string | number | boolean | null) => {
    setSelectedValue(optionValue)
    onChange(optionValue)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-text-quaternary">
          {label}
          {required && <span className="text-text-error">*</span>}
        </label>
      )}
      <div className={twMerge('flex', vertical ? 'flex-col gap-4' : 'flex-row gap-4')}>
        {options.map((option, index) => (
          <RadioButton
            id={id}
            key={`${name}-${index}`}
            inputId={`${name}-${index}`}
            name={name}
            value={option.value}
            label={option.label}
            checked={selectedValue === option.value}
            onChange={() => handleChange(option.value)}
            className={optionClassName}
            tooltip={option.tooltip}
          />
        ))}
      </div>
    </div>
  )
}

export default RadioGroup
