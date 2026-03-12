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
import { Accordion, AccordionTab } from 'primereact/accordion'
import React, { useState, useEffect, FormEvent, useMemo, useCallback, useRef } from 'react'

import ChevronDownIcon from '@/assets/icons/chevron-down.svg?react'
import ChevronRightIcon from '@/assets/icons/chevron-right.svg?react'
import CrossIcon from '@/assets/icons/cross.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import Autocomplete from '@/components/form/Autocomplete'
import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input'
import MultiSelect from '@/components/form/MultiSelect'
import RadioGroup from '@/components/form/RadioGroup/RadioGroup'
import Select from '@/components/form/Select'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { FilterDefinition, FilterDefinitionType, FiltersProps } from '@/types/filters'
import { createEmptyFilters } from '@/utils/filters'
import { humanize } from '@/utils/helpers'

import { MultiSelectProps } from '../form/MultiSelect/MultiSelect'

const Filters: React.FC<FiltersProps> = ({
  onApply,
  filterDefinitions,
  searchKey,
  searchPlaceholder = 'Search',
  searchValue = '',
  renderCustomFilter,
  areFiltersEmpty,
  refreshOnValuesUpdate,
}) => {
  const filterValuesFromProps = useMemo(() => {
    const initialFilters: Record<string, unknown> = {}

    if (searchValue) {
      initialFilters[searchKey] = searchValue
    }

    filterDefinitions.forEach((definition) => {
      const value = JSON.parse(JSON.stringify(definition.value))
      const isMultiselect = definition.type === FilterDefinitionType.Multiselect
      const isArrayValue = Array.isArray(value)

      if (isMultiselect && !isArrayValue) {
        initialFilters[definition.name] = [value]
      } else {
        initialFilters[definition.name] = value
      }
    })

    return initialFilters
  }, [filterDefinitions, searchValue, searchKey])
  const [filters, setFilters] = useState<Record<string, unknown>>(filterValuesFromProps)

  useEffect(() => {
    if (refreshOnValuesUpdate) {
      setFilters(filterValuesFromProps)
    }
  }, [filterValuesFromProps])

  const handleInputChange = useCallback((name: string, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, [])

  const handleSelectChange = (name: string, value: unknown) => {
    const isAllOption = typeof value === 'object' && (value as { value: string }).value === ''
    if (isAllOption) {
      setFilters((prev) => ({
        ...prev,
        [name]: null,
      }))
    } else {
      setFilters((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const updateCheckboxList = (
    selectedList: string[],
    value: string,
    checked: boolean
  ): string[] => {
    return checked ? [...selectedList, value] : selectedList.filter((v) => v !== value)
  }

  const clear = (e: React.MouseEvent) => {
    e.preventDefault()
    const resetFilters = createEmptyFilters(filters)

    setFilters(resetFilters)
  }

  const apply = (e?: FormEvent) => {
    if (e) e.preventDefault()
    onApply(filters)
  }

  useDebouncedApply(filters[searchKey], 1000, () => {
    apply()
  })

  const filtersWithoutSearch = useMemo(() => {
    const newFilters = { ...filters }
    delete newFilters[searchKey]
    return JSON.stringify(newFilters)
  }, [filters, searchKey])
  const prevFiltersRef = useRef(filtersWithoutSearch)

  useEffect(() => {
    if (prevFiltersRef.current === filtersWithoutSearch) {
      return
    }
    prevFiltersRef.current = filtersWithoutSearch
    apply()
  }, [filtersWithoutSearch])

  const getHiddenOptions = (options: MultiSelectProps['options'], filterValue: string[]) => {
    return filterValue.filter((value) => !options.find((opt) => opt.value?.toString() === value))
  }

  const mapToMultiselectOptions = (
    definitions: FilterDefinition[],
    filters: Record<string, string[]>
  ): Record<string, MultiSelectProps['options']> => {
    return definitions.reduce<Record<string, MultiSelectProps['options']>>((acc, def) => {
      if (def.type !== FilterDefinitionType.Multiselect) return acc

      const options = def.options || []
      const filterValue = filters[def.name] || []
      const hiddenOptions = getHiddenOptions(
        options as unknown as MultiSelectProps['options'],
        filterValue
      )

      acc[def.name] = [
        ...(options as unknown as MultiSelectProps['options']),
        ...hiddenOptions.map((val) => ({ label: val, value: val })),
      ]

      return acc
    }, {})
  }

  const multiselectOptions = useMemo<Record<string, MultiSelectProps['options']>>(
    () => mapToMultiselectOptions(filterDefinitions, filters as Record<string, string[]>),
    [filterDefinitions, filters]
  )

  return (
    <form onSubmit={apply}>
      <div className="flex flex-row justify-between items-center leading-7 mb-4">
        <h3 className="text-sm-1 tracking-wide text-text-quaternary uppercase font-semibold">
          Filters
        </h3>
        {!areFiltersEmpty && (
          <Button onClick={clear} variant="tertiary" className="ml-auto gap-[5px]">
            <CrossIcon className="w-3.5 h-3.5" /> Clear all
          </Button>
        )}
      </div>
      <div className="mb-4">
        <Input
          isFilterInput
          fullWidth
          rootClass="mb-6"
          className="bg-surface-base-content flex"
          id={`search-${searchKey}`}
          value={(filters[searchKey] as string) || ''}
          name="filter"
          onChange={(e) => handleInputChange(searchKey, e.target.value)}
          placeholder={searchPlaceholder}
          leftIcon={
            <div className="cursor-pointer" onClick={apply} aria-hidden="true">
              <SearchIcon className="text-text-quaternary" />
            </div>
          }
        />
        <Accordion
          multiple
          collapseIcon={
            <ChevronDownIcon className="flex basis-[13px] text-text-heading group-hover:text-text-accent-hover transition-colors" />
          }
          expandIcon={
            <ChevronRightIcon className="flex basis-[13px] text-text-heading group-hover:text-text-accent-hover transition-colors" />
          }
          activeIndex={Array.from({ length: filterDefinitions.length }, (_, i) => i)}
        >
          {filterDefinitions.map((definition) => (
            <AccordionTab
              unstyled
              key={definition.name}
              headerClassName="pb-6"
              pt={{ header: { className: 'group' } }}
              className="[&>.p-accordion-header-link]:hover:no-underline tracking-wide"
              header={
                <span className="pl-[8px] text-sm-1 leading-normal font-semibold text-text-heading group-hover:text-text-accent-hover transition-colors">
                  {definition.label ? definition.label.toUpperCase() : ''}
                </span>
              }
            >
              <div className="mb-6">
                {definition.type === FilterDefinitionType.CheckboxList &&
                  definition.options.map((option) => {
                    return (
                      <div key={option.value as string} className="mb-2 flex items-center gap-2">
                        <Checkbox
                          label={option.label}
                          onChange={(checked) =>
                            handleInputChange(
                              definition.name,
                              updateCheckboxList(
                                filters[definition.name] as string[],
                                option.value as string,
                                checked!
                              )
                            )
                          }
                          checked={(filters[definition.name] as string[])?.includes(
                            option.value as string
                          )}
                        />
                        {option.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-600 text-white leading-none">
                            {option.badge}
                          </span>
                        )}
                      </div>
                    )
                  })}
                {definition.type === FilterDefinitionType.RadioGroup && (
                  <RadioGroup
                    options={definition.options}
                    value={
                      (filters[definition.name] as string | number | boolean | null) ??
                      (definition.value as string | number | boolean | null)
                    }
                    defaultValue={
                      definition.config?.defaultValue as string | number | boolean | null
                    }
                    name={definition.name}
                    onChange={(value) => handleInputChange(definition.name, value)}
                    vertical
                  />
                )}
                {definition.type === FilterDefinitionType.Select && (
                  <Select
                    id={definition.name}
                    value={(filters[definition.name] as string) || ''}
                    onChange={(e) => handleSelectChange(definition.name, e.target.value)}
                    options={definition.options}
                    placeholder={
                      definition.placeholder ?? definition.label ?? humanize(definition.name)
                    }
                    className="w-full h-[35px]"
                  />
                )}
                {definition.type === FilterDefinitionType.Multiselect && (
                  <div className="relative w-full">
                    <MultiSelect
                      showCheckbox
                      value={(filters[definition.name] as string[]) || []}
                      onChange={(value) => handleInputChange(definition.name, value.value)}
                      options={multiselectOptions[definition.name]}
                      placeholder={
                        definition.placeholder ?? definition.label ?? humanize(definition.name)
                      }
                      className="w-full h-[35px] tracking-normal"
                      scrollHeight="200px"
                      renderOption={
                        definition.config?.renderOption as (option: any) => React.ReactNode
                      }
                      onFilter={
                        definition.config?.onFilter as ((filter: string) => void) | undefined
                      }
                      filterPlaceholder={definition.config?.filterPlaceholder as string | undefined}
                      {...(definition.config as Pick<MultiSelectProps, 'label' | 'id' | 'name'>)}
                    />
                    {!isEmpty((filters[definition.name] as string[]) || []) && (
                      <div className="multiselect-clear !top-[10px] !right-[29px]">
                        <CrossIcon
                          className="w-3.5 h-3.5"
                          onClick={() => handleInputChange(definition.name, [])}
                        />
                      </div>
                    )}
                  </div>
                )}
                {definition.type === FilterDefinitionType.Autocomplete && (
                  <Autocomplete
                    id={definition.name}
                    value={(filters[definition.name] as string) || ''}
                    onChange={(value) => handleInputChange(definition.name, value)}
                    options={definition.options}
                    placeholder={definition.label ?? humanize(definition.name)}
                    allowNew={true}
                    className="w-full h-[35px]"
                  />
                )}
                {definition.type === FilterDefinitionType.Custom &&
                  renderCustomFilter &&
                  renderCustomFilter(definition, filters[definition.name], (value) =>
                    handleInputChange(definition.name, value)
                  )}
              </div>
            </AccordionTab>
          ))}
        </Accordion>
      </div>
    </form>
  )
}

export default Filters
