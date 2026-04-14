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

import isString from 'lodash/isString'
import { MultiSelect as PrimeMultiselect, MultiSelectChangeEvent } from 'primereact/multiselect'
import { forwardRef, useEffect, useState } from 'react'

import MultiSelect from '@/components/form/MultiSelect'
import { budgetsStore } from '@/store/budgets'

import { MultiSelectSize } from '../form/MultiSelect/MultiSelect'

interface BudgetSelectorProps {
  value?: string | string[] | null
  onChange: (value: string | string[]) => void
  disabled?: boolean
  label?: string
  hideLabel?: boolean
  className?: string
  multiple?: boolean
  fullWidth?: boolean
  selectDefault?: boolean
  error?: string
  size?: MultiSelectSize | `${MultiSelectSize}`
}

const BudgetSelector = forwardRef<PrimeMultiselect, BudgetSelectorProps>(
  (
    {
      value,
      onChange,
      disabled = false,
      label,
      hideLabel = false,
      className = '',
      multiple = false,
      fullWidth = false,
      selectDefault = true,
      error,
      size = 'medium',
    },
    ref
  ) => {
    const [availableBudgets, setAvailableBudgets] = useState<
      Array<{ label: string; value: string }>
    >([])

    const loadBudgets = async (search = '') => {
      const budgets = await budgetsStore.fetchAllBudgetOptions(search)

      // Add current value(s) to budgets if not already included
      if (value) {
        const budgetIds = budgets.map((b) => b.value)
        if (isString(value) && !budgetIds.includes(value)) {
          budgets.push({ label: value, value })
        } else if (Array.isArray(value)) {
          value.forEach((v) => {
            if (!budgetIds.includes(v)) budgets.push({ label: v, value: v })
          })
        }
      }

      setAvailableBudgets(budgets)

      // Auto-select first budget only for single select when no value
      if (!value && budgets.length > 0 && !multiple && selectDefault) {
        onChange?.(String(budgets[0].value))
      }
    }

    const handleFilter = (val: string) => {
      const searchValue = val.trim().toLowerCase()
      loadBudgets(searchValue)
    }

    useEffect(() => {
      loadBudgets()
    }, [])

    const handleChange = (e: MultiSelectChangeEvent) => {
      onChange(multiple ? e.value : e.target.value)
    }

    const placeholder = 'Budget'
    const filterPlaceholder = 'Search for budget'

    return (
      <MultiSelect
        size={size}
        label={label ?? 'Select budget:'}
        value={value ?? ''}
        options={availableBudgets}
        onChange={handleChange}
        disabled={disabled}
        hideLabel={hideLabel}
        className={className}
        fullWidth={fullWidth}
        id="budget-selector"
        name="budget-selector"
        placeholder={placeholder}
        filterPlaceholder={filterPlaceholder}
        onFilter={handleFilter}
        showCheckbox={multiple}
        singleValue={!multiple}
        error={error}
        ref={ref}
      />
    )
  }
)

export default BudgetSelector
