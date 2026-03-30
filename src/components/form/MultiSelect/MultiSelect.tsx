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

import isEmpty from 'lodash/isEmpty'
import {
  MultiSelect as PrimeMultiselect,
  MultiSelectChangeEvent,
  MultiSelectPassThroughOptions,
} from 'primereact/multiselect'
import React, {
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
} from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import XMarkSvg from '@/assets/icons/cross.svg?react'
import TooltipButton from '@/components/TooltipButton'
import { useInputWidth } from '@/hooks/useInputWidth'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { cn } from '@/utils/utils'

import ptPreset from './ptPreset'

const DefaultOption = ({ label }: { label: string }) => {
  const optionEl = useRef<HTMLParagraphElement>(null)
  const isTruncated = useIsTruncated(optionEl)

  return (
    <p
      ref={optionEl}
      className="text-sm font-medium truncate"
      data-tooltip-id="react-tooltip"
      data-tooltip-content={isTruncated ? label : ''}
    >
      {label}
    </p>
  )
}

const defaultRenderOption = (option: { label: string }) => <DefaultOption label={option.label} />

export enum MultiSelectSize {
  SMALL = 'small',
  MEDIUM = 'medium',
}

export type MultiSelectProps = {
  label?: string
  value?:
    | string[]
    | string
    | object
    | Record<string, string | { label: string; value: string | number | boolean }>[]
  options: Record<
    string,
    string | undefined | { label: string; value: string | number | boolean }
  >[]
  onChange: (e: MultiSelectChangeEvent) => void
  onFilter?: (filter: string) => void
  disabled?: boolean
  hideLabel?: boolean
  className?: string
  inputClassName?: string
  errorClassName?: string
  id?: string
  name?: string
  placeholder?: string
  singleValue?: boolean
  hint?: string
  error?: string
  fullWidth?: boolean
  size?: MultiSelectSize | `${MultiSelectSize}`
  renderOption?: (option: any) => React.ReactNode
  optionLabel?: string
  optionValue?: string
  loading?: boolean
  showCheckbox?: boolean
  scrollHeight?: string
  required?: boolean
  filterPlaceholder?: string
  max?: number
}

const MultiSelect = forwardRef<PrimeMultiselect | null, MultiSelectProps>(
  (
    {
      label,
      value,
      options,
      className,
      inputClassName,
      errorClassName,
      onChange,
      onFilter,
      disabled = false,
      hideLabel = false,
      id,
      name,
      placeholder,
      singleValue = false,
      hint,
      error,
      fullWidth = false,
      size = MultiSelectSize.SMALL,
      renderOption,
      optionLabel = 'label',
      optionValue = 'value',
      loading = false,
      showCheckbox = false,
      scrollHeight = '200px',
      required = false,
      filterPlaceholder,
      max,
    },
    ref
  ) => {
    const selectRef = React.useRef<PrimeMultiselect>(null)
    const inputWidth = useInputWidth(selectRef)

    const preparedValue = useMemo((): Array<
      string | Record<string, string | { label: string; value: string | number | boolean }>
    > => {
      if (value === undefined || value === null) {
        return []
      }
      if (typeof value === 'string') {
        if (value.trim() === '') {
          return []
        }
        return [value]
      }
      if (Array.isArray(value)) {
        return value
      }
      return []
    }, [value])

    const getValue = useCallback(
      (v: string | string[]) => {
        if (singleValue) {
          return Array.isArray(v) ? v[0] : v
        }
        return Array.isArray(v) ? v : [v]
      },
      [singleValue]
    )

    const handleChange = (e: MultiSelectChangeEvent) => {
      if (singleValue) {
        selectRef.current?.hide()
      }
      if (singleValue && preparedValue.includes(e.selectedOption.value)) {
        return null
      }

      // Check if max limit is reached and trying to add more items
      if (max !== undefined && Array.isArray(e.value) && e.value.length > max) {
        return null
      }

      const newValue = getValue(e.selectedOption.value)

      return onChange({
        ...e,
        target: {
          ...e.target,
          value: newValue,
        },
      })
    }
    useImperativeHandle(ref, () => selectRef.current!, [])

    const handleOutsideClick = useCallback((event: MouseEvent | TouchEvent) => {
      if (!selectRef.current) return

      const multiselectEl = selectRef.current.getElement()
      const panelEl = document.querySelector('.p-multiselect-panel')

      if (
        multiselectEl &&
        !multiselectEl.contains(event.target as Node) &&
        (!panelEl || !panelEl.contains(event.target as Node))
      ) {
        selectRef.current.hide()
      }
    }, [])

    // Handle escape key to close dropdown
    const handleEscapeKey = useCallback((event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectRef.current) {
        selectRef.current.hide()
      }
    }, [])

    useEffect(() => {
      // Use capture phase to ensure we catch the event before modal overlays
      document.addEventListener('mousedown', handleOutsideClick, true)
      document.addEventListener('touchstart', handleOutsideClick, true)
      document.addEventListener('keydown', handleEscapeKey)

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick, true)
        document.removeEventListener('touchstart', handleOutsideClick, true)
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }, [handleOutsideClick, handleEscapeKey])

    const mappedSizeClassname = {
      [MultiSelectSize.SMALL]: 'h-8 max-h-8',
      [MultiSelectSize.MEDIUM]: 'h-[44px] py-[5px]',
    }[size]

    const preparedPreset = useMemo<MultiSelectPassThroughOptions>(() => {
      const errorBorderClass = error ? '!border-failed-secondary' : ''

      if (!showCheckbox) {
        return {
          ...ptPreset!,
          label: {
            className: 'text-text-tertiary',
          },
          checkboxContainer: {
            className: '!hidden',
          },
          root: {
            className: errorBorderClass,
          },
        }
      }
      return {
        ...ptPreset!,
        checkbox: {
          ...ptPreset?.checkbox,
          root: {
            className: 'mr-2',
          },
        },
        label: {
          className: 'text-text-tertiary',
        },
        root: {
          className: errorBorderClass,
        },
      }
    }, [showCheckbox, error])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !disabled) {
        const root = selectRef.current
        const panel = document.querySelector<HTMLElement>('.p-multiselect-items')
        if (panel) {
          const items = panel.querySelectorAll<HTMLElement>('.p-multiselect-item')
          if (items.length > 0) {
            e.preventDefault()
            const listboxInputEl = root?.getInput()
            if (e.key === 'ArrowDown') {
              listboxInputEl?.focus()
            } else if (listboxInputEl) {
              root?.getInput()?.focus()
            }
          }
        }
      }
    }

    return (
      <div className={cn('relative flex flex-col', fullWidth && 'flex-grow', className)}>
        {label && !hideLabel && (
          <label htmlFor={id} className="text-xs pb-2 text-text-quaternary flex items-center">
            {label}
            {required && <span className="text-text-error input-label-required ml-0.5">*</span>}
            {hint && <TooltipButton className="ml-1" content={hint} iconClassName="h-4" />}
          </label>
        )}
        <PrimeMultiselect
          pt={preparedPreset}
          ref={selectRef}
          id={id}
          name={name}
          value={preparedValue}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onFilter={(e) => onFilter?.(e.filter)}
          multiple={!singleValue}
          className={cn(className, mappedSizeClassname, inputClassName)}
          panelStyle={inputWidth ? { width: `${inputWidth}px` } : {}}
          showSelectAll={false}
          filter={typeof onFilter === 'function'}
          panelHeaderTemplate={onFilter ? null : <div />}
          itemTemplate={renderOption ?? defaultRenderOption}
          optionLabel={optionLabel}
          optionValue={optionValue}
          loading={loading}
          scrollHeight={scrollHeight}
          onKeyDown={handleKeyDown}
          filterPlaceholder={filterPlaceholder ?? 'Search'}
          dropdownIcon={<ChevronDownSvg />}
          aria-label={label || placeholder}
        >
          {!isEmpty(value) && !singleValue && (
            <div
              className="absolute right-[34px] top-1/2 -translate-y-1/2 cursor-pointer text-text-secondary hover:text-text-accent-hover"
              onClick={(e) => onChange({ ...e, value: [] } as unknown as MultiSelectChangeEvent)}
            >
              <XMarkSvg className="w-[20px] h-[20px]" />
            </div>
          )}
        </PrimeMultiselect>
        {error && (
          <div
            className={cn('text-sm text-failed-secondary input-error-message mt-2', errorClassName)}
          >
            {error}
          </div>
        )}
      </div>
    )
  }
)

export default MultiSelect
