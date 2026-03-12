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

import { AutoComplete } from 'primereact/autocomplete'
import React, { useState, useEffect, useRef, useImperativeHandle, ReactNode } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import { useInputWidth } from '@/hooks/useInputWidth'
import { FilterOption } from '@/types/filters'
import { cn } from '@/utils/utils'

import ptPreset from './ptPreset'
import TooltipButton from '../../TooltipButton'

export interface AutocompleteProps {
  id?: string
  name?: string
  value?: string
  onChange?: (value: string) => void
  options?: FilterOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  allowNew?: boolean
  allowEmpty?: boolean
  label?: string
  hint?: string
  error?: string
  localFilter?: boolean
  minSymbolsToSearch?: number
  isLoadingIconVisible?: boolean
  panelFooterTemplate?: ReactNode
  onSearch?: (query: string) => void
  itemTemplate?: (item: FilterOption) => ReactNode
}

const Autocomplete = React.forwardRef<AutoComplete<FilterOption>, AutocompleteProps>(
  (
    {
      id,
      name,
      value,
      onChange,
      options = [],
      placeholder,
      className = '',
      disabled = false,
      allowNew = false,
      allowEmpty = true,
      label,
      hint,
      error,
      localFilter = true,
      minSymbolsToSearch = 0,
      isLoadingIconVisible,
      panelFooterTemplate,
      onSearch,
      itemTemplate,
    },
    ref
  ) => {
    const autocompleteEl = useRef<AutoComplete<FilterOption> | null>(null)
    const [textValue, setTextValue] = useState<string>('')
    const [filteredOptions, setFilteredOptions] = useState<FilterOption[]>(options)
    const inputWidth = useInputWidth(autocompleteEl)

    useImperativeHandle(ref, () => autocompleteEl.current!, [])

    // Update filtered options when options prop changes
    useEffect(() => {
      setFilteredOptions(options)
    }, [options])

    // Set initial text value based on selected option
    useEffect(() => {
      const selectedOption = options.find((option) => option.value === value)
      setTextValue(selectedOption?.label || '')
    }, [value, options])

    const search = (event: { query: string }) => {
      const query = event.query.toLowerCase()

      if (!localFilter && minSymbolsToSearch <= query.length && onSearch) {
        onSearch(query)
        return
      }

      const selectedOption = options.find((option) => option.value === value)
      if (query === selectedOption?.label?.toLowerCase() || !query) {
        setFilteredOptions([...options])
      } else {
        setFilteredOptions(options.filter((option) => option.label.toLowerCase().includes(query)))
      }
    }

    const updateValue = (newValue: FilterOption | string | null) => {
      if (!newValue) {
        setTextValue('')
        return
      }

      if (typeof newValue === 'string') {
        setTextValue(newValue)
      } else {
        onChange?.(newValue.value ? newValue.value.toString() : '')
        setTextValue(newValue.label)
      }
    }

    const resetText = () => {
      const selectedOption = options.find((option) => option.value === value)
      setTextValue(selectedOption?.label ?? '')
    }

    const handleBlur = () => {
      const isExistingOption = options.some((option) => option.value === textValue)

      const shouldReset =
        (!textValue && !allowEmpty) || (textValue && !allowNew && !isExistingOption)

      if (shouldReset) {
        resetText()
        return
      }

      if (allowEmpty && value && !textValue) onChange?.('')
      else if (allowNew) onChange?.(textValue)
    }
    const handleFocus = (e) => {
      if (autocompleteEl.current && !disabled) {
        autocompleteEl.current.search(e, '')
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && filteredOptions.length > 0) {
        const panel = document.querySelector('.p-autocomplete-panel')
        if (panel) {
          const items = panel.querySelectorAll<HTMLElement>('.p-autocomplete-items > li')
          if (items.length > 0) {
            e.preventDefault()
            if (e.key === 'ArrowDown') {
              items[0].focus()
            } else {
              items[items.length - 1].focus()
            }
          }
        }
      }
    }

    return (
      <div className={cn('flex flex-col gap-[6px] text-text-tertiary w-full', className)}>
        {label && (
          <label htmlFor={id} className="flex gap-1.5 text-xs text-text-quaternary ">
            {label}
            {hint && <TooltipButton content={hint} />}
          </label>
        )}

        <AutoComplete
          ref={autocompleteEl}
          id={id}
          name={name}
          value={textValue}
          suggestions={filteredOptions}
          completeMethod={search}
          onChange={(e) => setTextValue(e.value as unknown as string)}
          onSelect={(e) => updateValue(e.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          field="label"
          dropdown
          panelFooterTemplate={panelFooterTemplate}
          panelStyle={inputWidth ? { width: `${inputWidth}px` } : {}}
          forceSelection={!allowNew}
          disabled={disabled}
          placeholder={placeholder}
          minLength={0}
          invalid={!!error}
          pt={{ ...ptPreset, loadingIcon: { className: isLoadingIconVisible ? '' : 'hidden' } }}
          emptyMessage="No results found"
          dropdownIcon={<ChevronDownSvg />}
          showEmptyMessage
          itemTemplate={itemTemplate}
        />

        {error && <div className="text-text-error text-sm">{error}</div>}
      </div>
    )
  }
)

export default Autocomplete
