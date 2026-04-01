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

import {
  MultiSelect as PrimeMultiselect,
  MultiSelectChangeEvent,
  MultiSelectPassThroughOptions,
} from 'primereact/multiselect'
import React, {
  useCallback,
  useMemo,
  useState,
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

import { ChipWrapper } from './ChipWrapper'
import ptPreset from './ptPreset'
import { useMultiSelectLogic } from './useMultiSelectLogic'

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

export type MultiSelectOptionType = Record<
  string,
  string | undefined | { label: string; value: string | number | boolean }
>

export type MultiSelectProps = {
  label?: string
  value?: string[] | string | object | MultiSelectOptionType[]
  options: MultiSelectOptionType[]
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderOption?: (option: any) => React.ReactNode // Intentionally flexible - accepts various option shapes (GuardrailSelectorOption, AssistantOption, WorkflowSelectorOption, etc.)
  optionLabel?: string
  optionValue?: string
  loading?: boolean
  showCheckbox?: boolean
  scrollHeight?: string
  required?: boolean
  filterPlaceholder?: string
  max?: number
  display?: 'comma' | 'chip'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedItemTemplate?: ((option: any) => React.ReactNode) | null // Intentionally flexible - same reasoning as renderOption
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
      display,
      selectedItemTemplate,
    },
    ref
  ) => {
    const selectRef = React.useRef<PrimeMultiselect>(null)
    const inputWidth = useInputWidth(selectRef)

    const { preparedValue, handleChange } = useMultiSelectLogic({
      value,
      singleValue,
      max,
      onChange,
    })

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
      const labelClassName =
        display === 'chip' ? 'flex flex-wrap gap-2 text-text-unfocused' : 'text-text-unfocused'
      const errorBorderClass = error ? '!border-failed-secondary' : ''

      if (!showCheckbox) {
        return {
          ...ptPreset!,
          label: {
            className: labelClassName,
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
          className: labelClassName,
        },
        root: {
          className: errorBorderClass,
        },
      }
    }, [showCheckbox, display, error])

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

    const [selectedSnapshot, setSelectedSnapshot] = useState<typeof preparedValue>(preparedValue)
    const [isPanelOpen, setIsPanelOpen] = useState(false)

    useEffect(() => {
      if (!isPanelOpen) {
        setSelectedSnapshot(preparedValue)
      }
    }, [preparedValue, isPanelOpen])

    const sortedOptions = useMemo(() => {
      const sorted = [...options].sort((a, b) =>
        String(a[optionLabel] ?? '').localeCompare(String(b[optionLabel] ?? ''))
      )
      const selected = sorted.filter((o) => selectedSnapshot.includes(o[optionValue] as string))
      const unselected = sorted.filter((o) => !selectedSnapshot.includes(o[optionValue] as string))
      return [...selected, ...unselected]
    }, [options, optionLabel, optionValue, selectedSnapshot])

    const preparedSelectedItemTemplate = useMemo(() => {
      if (display !== 'chip') return selectedItemTemplate

      if (preparedValue.length === 0) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (option: any) => (
        <ChipWrapper
          option={option}
          selectedItemTemplate={selectedItemTemplate}
          preparedValue={preparedValue}
          onChange={onChange}
        />
      )
    }, [display, selectedItemTemplate, preparedValue, onChange])

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
          options={sortedOptions}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => handleChange(e, selectRef)}
          onShow={() => setIsPanelOpen(true)}
          onHide={() => {
            setIsPanelOpen(false)
            setSelectedSnapshot(preparedValue)
          }}
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
          display={display}
          selectedItemTemplate={preparedSelectedItemTemplate ?? undefined}
        >
          {preparedValue.length > 0 && !singleValue && (
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
