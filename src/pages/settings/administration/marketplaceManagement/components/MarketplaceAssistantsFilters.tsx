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

import { FC, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import CrossIcon from '@/assets/icons/cross.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'
import Select from '@/components/form/Select/Select'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { assistantsStore } from '@/store/assistants'
import type { FilterOption } from '@/types/filters'
import { checkEmptyFilters } from '@/utils/filters'

import { INITIAL_FILTERS, type AssistantsFilters } from '../hooks/useAssistantsFilters'

const WAIT_TIME_OPTIONS: FilterOption[] = [
  { label: 'All Wait Times', value: '' },
  { label: '< 1 day', value: 'lt_1d' },
  { label: '1–7 days', value: '1_7d' },
  { label: '7–30 days', value: '7_30d' },
  { label: '> 30 days', value: 'gt_30d' },
]

const SORT_OPTIONS: FilterOption[] = [
  { label: 'Default order', value: '' },
  { label: 'Submitted (newest first)', value: 'submitted_desc' },
  { label: 'Submitted (oldest first)', value: 'submitted_asc' },
  { label: 'Name (A–Z)', value: 'name_asc' },
]

interface MarketplaceAssistantsFiltersProps {
  filters: AssistantsFilters
  onFilterChange: (filters: AssistantsFilters) => void
}

const MarketplaceAssistantsFilters: FC<MarketplaceAssistantsFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const { assistantCategories } = useSnapshot(assistantsStore)

  // Local state for the search input to allow debouncing before the parent is notified.
  const [localSearch, setLocalSearch] = useState(filters.search)

  useDebouncedApply(localSearch, 400, () => {
    onFilterChange({ ...filters, search: localSearch })
  })

  const categoryOptions = useMemo<FilterOption[]>(
    () => [
      { label: 'All Categories', value: '' },
      ...assistantCategories.map((c) => ({ label: c.name, value: c.id })),
    ],
    [assistantCategories]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value)
  }

  const handleSelectChange = (field: keyof AssistantsFilters) => (e: { value: unknown }) => {
    const newValue = typeof e.value === 'string' ? e.value : ''
    onFilterChange({ ...filters, [field]: newValue })
  }

  const handleClearAll = () => {
    setLocalSearch('')
    onFilterChange(INITIAL_FILTERS)
  }

  const isFilterEmpty = checkEmptyFilters({
    search: filters.search,
    category: filters.category,
    waitTime: filters.waitTime,
    sortBy: filters.sortBy,
  })

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 items-end pb-1">
      {/* Search input — first in the bar */}
      <div className="w-64 min-w-[16rem] lg:w-80 flex-shrink-0">
        <Input
          data-testid="assts-search-input"
          label="Search"
          placeholder="Search by name or creator"
          value={localSearch}
          onChange={handleSearchChange}
          leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
          className="w-full"
        />
      </div>

      {/* Category */}
      <div className="min-w-[128px] w-40 flex-shrink-0">
        <Select
          data-testid="asstsCategory-select"
          data-value={filters.category}
          label="Category"
          options={categoryOptions}
          value={filters.category}
          onChange={handleSelectChange('category')}
        />
      </div>

      {/* Wait time */}
      <div className="min-w-[128px] w-40 flex-shrink-0">
        <Select
          data-testid="asstsWaitTime-select"
          data-value={filters.waitTime}
          label="Wait time"
          options={WAIT_TIME_OPTIONS}
          value={filters.waitTime}
          onChange={handleSelectChange('waitTime')}
        />
      </div>

      {/* Sort */}
      <div className="min-w-[128px] w-44 flex-shrink-0">
        <Select
          data-testid="asstsSort-select"
          data-value={filters.sortBy}
          label="Sort"
          options={SORT_OPTIONS}
          value={filters.sortBy}
          onChange={handleSelectChange('sortBy')}
        />
      </div>

      {!isFilterEmpty && (
        <div className="flex items-end gap-2 flex-shrink-0">
          <Button
            onClick={handleClearAll}
            variant="tertiary"
            className="h-8 gap-[5px]"
            aria-label="Clear all filters"
          >
            <CrossIcon className="w-3.5 h-3.5" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

export default MarketplaceAssistantsFilters
