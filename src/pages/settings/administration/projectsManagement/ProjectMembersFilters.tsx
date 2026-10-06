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

import { OverlayPanel } from 'primereact/overlaypanel'
import { FC, useCallback, useMemo, useRef, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import Cross18Svg from '@/assets/icons/cross.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input/Input'
import Select from '@/components/form/Select'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import {
  BUDGET_CATEGORY_OPTIONS,
  BudgetCategory,
  getBudgetCategoryLabel,
} from '@/types/entity/budget'
import { ProjectRoleBE } from '@/types/entity/project'
import { SelectOption } from '@/types/filters'

type RoleOptionValue = ProjectRoleBE.PLATFORM_ADMIN | ProjectRoleBE.USER | 'all'
export type BudgetUsageRange = 'low' | 'medium' | 'high'
export type ModelSettingsFilterValue = 'all' | 'project' | 'custom'

export interface BudgetUsageFilter {
  categories: BudgetCategory[]
  usageRanges: BudgetUsageRange[]
  overrideOnly: boolean
}

const ALL_BUDGET_CATEGORIES = BUDGET_CATEGORY_OPTIONS.map((option) => option.value)
const ALL_USAGE_RANGES: BudgetUsageRange[] = ['low', 'medium', 'high']

const createDefaultBudgetUsageFilter = (): BudgetUsageFilter => ({
  categories: [...ALL_BUDGET_CATEGORIES],
  usageRanges: [...ALL_USAGE_RANGES],
  overrideOnly: false,
})

export const isDefaultBudgetUsageFilter = (filter: BudgetUsageFilter): boolean =>
  !filter.overrideOnly &&
  filter.categories.length === ALL_BUDGET_CATEGORIES.length &&
  filter.categories.every((category) => ALL_BUDGET_CATEGORIES.includes(category)) &&
  filter.usageRanges.length === ALL_USAGE_RANGES.length &&
  filter.usageRanges.every((range) => ALL_USAGE_RANGES.includes(range))

const getBudgetUsageSummary = (filter: BudgetUsageFilter): string => {
  if (isDefaultBudgetUsageFilter(filter)) return 'All'

  const parts: string[] = []
  if (filter.categories.length !== ALL_BUDGET_CATEGORIES.length) {
    parts.push(filter.categories.map(getBudgetCategoryLabel).join(', '))
  }
  if (filter.usageRanges.length !== ALL_USAGE_RANGES.length) {
    parts.push(
      filter.usageRanges
        .map((range) => ({ low: '<50%', medium: '50–70%', high: '>70%' }[range]))
        .join(', ')
    )
  }
  if (filter.overrideOnly) parts.push(parts.length ? 'Override' : 'Override only')

  return parts.join(' · ') || 'All'
}

const ROLE_FILTER_OPTIONS: SelectOption<RoleOptionValue>[] = [
  { label: 'All', value: 'all' },
  { label: 'Project Admin', value: ProjectRoleBE.PLATFORM_ADMIN },
  { label: 'User', value: ProjectRoleBE.USER },
]

const MODEL_SETTINGS_FILTER_OPTIONS: SelectOption<ModelSettingsFilterValue>[] = [
  { label: 'All', value: 'all' },
  { label: 'Project', value: 'project' },
  { label: 'Custom', value: 'custom' },
]

export interface ProjectMembersFiltersState {
  search: string
  role: RoleOptionValue
  budgetUsage: BudgetUsageFilter
  modelSettings: ModelSettingsFilterValue
}

export const PROJECT_MEMBERS_INITIAL_FILTERS: ProjectMembersFiltersState = {
  search: '',
  role: 'all',
  budgetUsage: createDefaultBudgetUsageFilter(),
  modelSettings: 'all',
}

interface ProjectMembersFiltersProps {
  onFilterChange: (filters: ProjectMembersFiltersState) => void
  isModelsConfigEnabled?: boolean
}

const ProjectMembersFilters: FC<ProjectMembersFiltersProps> = ({
  onFilterChange,
  isModelsConfigEnabled = false,
}) => {
  const budgetUsagePanelRef = useRef<OverlayPanel>(null)
  const [localFilters, setLocalFilters] = useState<ProjectMembersFiltersState>(
    PROJECT_MEMBERS_INITIAL_FILTERS
  )

  const areFiltersEmpty = useMemo(() => {
    return (
      !localFilters.search &&
      localFilters.role === 'all' &&
      isDefaultBudgetUsageFilter(localFilters.budgetUsage)
    )
  }, [localFilters])

  const applyFilters = useCallback(() => {
    onFilterChange(localFilters)
  }, [localFilters, onFilterChange])

  useDebouncedApply(localFilters.search, 500, applyFilters)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters((prev) => ({ ...prev, search: e.target.value }))
  }

  const handleRoleFilterChange = (e: { value: RoleOptionValue }) => {
    const newFilters = { ...localFilters, role: e.value }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleModelSettingsChange = (e: { value: ModelSettingsFilterValue }) => {
    const newFilters = { ...localFilters, modelSettings: e.value }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleBudgetCategoryChange = (category: BudgetCategory) => {
    const selected = localFilters.budgetUsage.categories.includes(category)
    if (selected && localFilters.budgetUsage.categories.length === 1) return

    const newFilters = {
      ...localFilters,
      budgetUsage: {
        ...localFilters.budgetUsage,
        categories: selected
          ? localFilters.budgetUsage.categories.filter((value) => value !== category)
          : [...localFilters.budgetUsage.categories, category],
      },
    }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleUsageRangeChange = (range: BudgetUsageRange) => {
    const selected = localFilters.budgetUsage.usageRanges.includes(range)
    if (selected && localFilters.budgetUsage.usageRanges.length === 1) return

    const newFilters = {
      ...localFilters,
      budgetUsage: {
        ...localFilters.budgetUsage,
        usageRanges: selected
          ? localFilters.budgetUsage.usageRanges.filter((value) => value !== range)
          : [...localFilters.budgetUsage.usageRanges, range],
      },
    }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleOverrideOnlyChange = () => {
    const newFilters = {
      ...localFilters,
      budgetUsage: {
        ...localFilters.budgetUsage,
        overrideOnly: !localFilters.budgetUsage.overrideOnly,
      },
    }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    const initialFilters = {
      ...PROJECT_MEMBERS_INITIAL_FILTERS,
      budgetUsage: createDefaultBudgetUsageFilter(),
    }
    setLocalFilters(initialFilters)
    onFilterChange(initialFilters)
  }

  return (
    <div className="flex gap-3 flex-wrap items-end">
      <div className="flex-1 min-w-40">
        <Input
          placeholder="Search"
          label="Search"
          value={localFilters.search}
          onChange={handleSearchChange}
          leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
          className="w-full"
        />
      </div>
      <div className="min-w-44">
        <Select
          id="role-filter"
          name="role-filter"
          label="Project Role"
          value={localFilters.role}
          onChange={handleRoleFilterChange}
          options={ROLE_FILTER_OPTIONS}
          placeholder="Filter by role"
        />
      </div>
      <div className="min-w-44">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-text-quaternary" htmlFor="budget-usage-filter">
            Budget usage
          </label>
          <button
            id="budget-usage-filter"
            type="button"
            className="h-8 gap-2 !px-2 text-sm flex text-text-primary justify-between items-center bg-surface-base-content border border-border-primary rounded-lg transition hover:border-border-secondary cursor-pointer"
            onClick={(event) => budgetUsagePanelRef.current?.toggle(event)}
            aria-haspopup="dialog"
            title={getBudgetUsageSummary(localFilters.budgetUsage)}
          >
            <span className="truncate">{getBudgetUsageSummary(localFilters.budgetUsage)}</span>
            <ChevronDownSvg className="shrink-0" />
          </button>
        </div>
        <OverlayPanel
          ref={budgetUsagePanelRef}
          className="bg-surface-base-secondary p-3 rounded-lg border border-border-specific-panel-outline shadow-xl !w-[420px] max-w-[calc(100vw-2rem)]"
        >
          <div className="grid grid-cols-2 divide-x divide-border-structural">
            <div className="pr-4">
              <div className="text-xs text-text-quaternary mb-2">Budget category</div>
              <div className="flex flex-col gap-2">
                {BUDGET_CATEGORY_OPTIONS.map(({ label, value }) => (
                  <Checkbox
                    key={value}
                    id={`budget-category-${value}`}
                    label={label}
                    checked={localFilters.budgetUsage.categories.includes(value)}
                    onChange={() => handleBudgetCategoryChange(value)}
                  />
                ))}
              </div>
            </div>
            <div className="pl-4">
              <div className="text-xs text-text-quaternary mb-2">Usage</div>
              <div className="flex flex-col gap-2">
                {[
                  ['low', '<50%'],
                  ['medium', '50–70%'],
                  ['high', '>70%'],
                ].map(([value, label]) => (
                  <Checkbox
                    key={value}
                    id={`budget-usage-${value}`}
                    label={label}
                    checked={localFilters.budgetUsage.usageRanges.includes(
                      value as BudgetUsageRange
                    )}
                    onChange={() => handleUsageRangeChange(value as BudgetUsageRange)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border-structural mt-3 pt-3">
            <div className="text-xs text-text-quaternary mb-2">Override</div>
            <Checkbox
              id="budget-override-only"
              label="Override only"
              checked={localFilters.budgetUsage.overrideOnly}
              onChange={handleOverrideOnlyChange}
            />
          </div>
        </OverlayPanel>
      </div>
      {isModelsConfigEnabled && (
        <div className="min-w-44">
          <Select
            id="model-settings-filter"
            name="model-settings-filter"
            label="Model settings"
            value={localFilters.modelSettings}
            onChange={handleModelSettingsChange}
            options={MODEL_SETTINGS_FILTER_OPTIONS}
            placeholder="Filter by model settings"
          />
        </div>
      )}
      {!areFiltersEmpty && (
        <div className="flex items-end">
          <Button onClick={handleClearFilters} variant="tertiary" className="gap-[5px] h-9">
            <Cross18Svg className="w-3.5 h-3.5" /> Clear All
          </Button>
        </div>
      )}
    </div>
  )
}

export default ProjectMembersFilters
