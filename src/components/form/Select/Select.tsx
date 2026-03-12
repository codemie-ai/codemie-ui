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

import { isNil } from 'lodash'
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown'
import { forwardRef, ReactNode, useRef } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { FilterOption } from '@/types/filters'
import { cn } from '@/utils/utils'

interface SelectProps {
  id?: string
  name?: string
  value?: string | number | null
  onChange: (e: DropdownChangeEvent) => void
  options: FilterOption[]
  placeholder?: string
  className?: string
  valueTemplate?: ReactNode
  rootClassName?: string
  classNameValue?: string
  disabled?: boolean
  panelFooterTemplate?: ReactNode
  optionTruncateThreshold?: number
  showClear?: boolean
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'mouse'
  label?: string
  panelClassName?: string
  errorClassName?: string
  error?: string
  allowCustom?: boolean
  required?: boolean
  loading?: boolean
}

const Select = forwardRef<Dropdown, SelectProps>(
  (
    {
      id,
      name,
      value,
      onChange,
      options,
      placeholder,
      className = '',
      rootClassName,
      classNameValue = '',
      disabled = false,
      valueTemplate,
      panelFooterTemplate,
      showClear,
      label,
      panelClassName,
      errorClassName,
      error,
      allowCustom = false,
      required = false,
      loading,
    },
    ref
  ) => {
    const OptionTemplate = (option) => {
      const optionEl = useRef<HTMLParagraphElement>(null)
      const isTruncated = useIsTruncated(optionEl)

      return (
        <p
          ref={optionEl}
          data-tooltip-id="react-tooltip"
          data-tooltip-content={isTruncated ? option.label : ''}
          data-tooltip-class-name="max-w-2xl"
          className="px-2.5 py-1.5 truncate"
        >
          {option.label}
        </p>
      )
    }

    const shouldAddValue =
      allowCustom && !isNil(value) && value !== '' && !options.some((opt) => opt.value === value)
    const enhancedOptions = shouldAddValue ? [...options, { label: String(value), value }] : options

    return (
      <div className={cn('flex flex-col', rootClassName)}>
        <label className="flex flex-col gap-2">
          {label && (
            <div className="text-xs text-text-quaternary">
              {label}
              {required && <span className="text-text-error ml-0.5">*</span>}
            </div>
          )}
          <Dropdown
            showClear={showClear}
            id={id}
            ref={ref}
            name={name}
            value={value}
            options={enhancedOptions}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            panelFooterTemplate={panelFooterTemplate}
            valueTemplate={valueTemplate}
            itemTemplate={OptionTemplate}
            loading={loading}
            className={cn(
              'h-8 gap-2 !px-2 text-sm flex text-text-primary justify-between items-center bg-surface-base-content border border-border-primary rounded-lg transition hover:border-border-secondary cursor-pointer',
              !value && 'text-text-quaternary',
              className
            )}
            panelClassName={cn(
              'bg-surface-base-primary max-w-64 mt-2 border overflow-auto flex bg-surface-base-secondary border-border-specific-panel-outline p-1.5 rounded-lg flex flex-col',
              panelClassName
            )}
            pt={{
              root: (options) => options?.state.overlayVisible && '!border-border-secondary',
              wrapper: { className: 'order-2' },
              item: {
                className: cn('text-sm focus-visible:ring-0 !p-0 rounded-md cursor-pointer'),
              },
              input: {
                className: cn('text-ellipsis overflow-hidden text-text-primary', classNameValue),
              },
              trigger: { className: cn('text-text-primary', classNameValue) },
              footer: { className: 'order-1' },
              clearIcon: { className: 'focus:outline-none' },
            }}
            collapseIcon={<ChevronDownSvg className="text-text-secondary" />}
            dropdownIcon={<ChevronDownSvg className="text-text-secondary" />}
          />
        </label>
        {error && <div className={cn('text-failed-secondary', errorClassName)}>{error}</div>}
      </div>
    )
  }
)

export default Select
