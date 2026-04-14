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

import React, { FC, useState, useCallback, useMemo } from 'react'

import CrossIcon from '@/assets/icons/cross.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import BudgetSelector from '@/components/BudgetSelector'
import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'
import Select from '@/components/form/Select/Select'
import ProjectSelector from '@/components/ProjectSelector/ProjectSelector'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import {
  FILTER_INITIAL_STATE,
  UsersManagementFilters as IUsersManagementFilters,
} from '@/pages/settings/administration/usersManagement/constants'
import { FilterOption } from '@/types/filters'
import { checkEmptyFilters } from '@/utils/filters'

const PLATFORM_ROLE_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'all' },
  { label: 'User', value: 'user' },
  { label: 'Project Admin', value: 'platform_admin' },
  { label: 'Super Admin', value: 'super_admin' },
]

interface UsersManagementFiltersProps {
  onFilterChange: (filters: IUsersManagementFilters) => void
  filters: IUsersManagementFilters
  hasSelection?: boolean
}

const isBudgetManagementEnabled = window._env_?.VITE_ENABLE_BUDGET_MANAGEMENT === 'true'

const UsersManagementFilters: FC<UsersManagementFiltersProps> = ({
  onFilterChange,
  filters,
  hasSelection,
}) => {
  const [localFilters, setLocalFilters] = useState(filters)

  const areFiltersEmpty = useMemo(() => {
    return checkEmptyFilters(filters)
  }, [filters])

  const applyFilters = useCallback(() => {
    onFilterChange(localFilters)
  }, [localFilters, onFilterChange])

  useDebouncedApply(localFilters.search, 500, applyFilters)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters({ ...localFilters, search: e.target.value })
  }

  const handleProjectsChange = (value: string | string[]) => {
    const projects = Array.isArray(value) ? value : [value]
    const newFilters = { ...localFilters, projects }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleBudgetsChange = (value: string | string[]) => {
    const budgets = Array.isArray(value) ? value : [value]
    const newFilters = { ...localFilters, budgets }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handlePlatformRoleChange = (e: any) => {
    const newFilters = { ...localFilters, platform_role: e.value === 'all' ? null : e.value }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    setLocalFilters(FILTER_INITIAL_STATE)
    onFilterChange(FILTER_INITIAL_STATE)
  }

  return (
    <div className="flex gap-4">
      <div className="w-48">
        <Input
          label="Search"
          placeholder="Search"
          value={localFilters.search}
          onChange={handleSearchChange}
          leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
          className="w-full"
        />
      </div>

      <div className="w-48">
        <ProjectSelector
          label="Project"
          fullWidth
          multiple
          value={localFilters.projects ?? []}
          onChange={handleProjectsChange}
          size="small"
        />
      </div>

      {isBudgetManagementEnabled && (
        <div className="w-48">
          <BudgetSelector
            label="Budget"
            fullWidth
            multiple
            value={localFilters.budgets ?? []}
            onChange={handleBudgetsChange}
            size="small"
          />
        </div>
      )}

      <div className="w-36">
        <Select
          label="Platform Role"
          placeholder="Platform Role"
          options={PLATFORM_ROLE_OPTIONS}
          value={localFilters.platform_role ?? 'all'}
          onChange={handlePlatformRoleChange}
        />
      </div>

      {!areFiltersEmpty && (
        <div className="flex items-end">
          <Button onClick={handleClearFilters} variant="tertiary" className="gap-[5px] h-8">
            <CrossIcon className="w-3.5 h-3.5" /> {!hasSelection && 'Clear All'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default UsersManagementFilters
