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

import { FC, useCallback, useMemo, useState } from 'react'

import Cross18Svg from '@/assets/icons/cross.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'
import Select from '@/components/form/Select'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { ProjectRoleBE } from '@/types/entity/project'
import { SelectOption } from '@/types/filters'

type RoleOptionValue = ProjectRoleBE.PLATFORM_ADMIN | ProjectRoleBE.USER | 'all'

const ROLE_FILTER_OPTIONS: SelectOption<RoleOptionValue>[] = [
  { label: 'All', value: 'all' },
  { label: 'Project Admin', value: ProjectRoleBE.PLATFORM_ADMIN },
  { label: 'User', value: ProjectRoleBE.USER },
]

export interface ProjectMembersFiltersState {
  search: string
  role: RoleOptionValue
}

export const PROJECT_MEMBERS_INITIAL_FILTERS: ProjectMembersFiltersState = {
  search: '',
  role: 'all',
}

interface ProjectMembersFiltersProps {
  onFilterChange: (filters: ProjectMembersFiltersState) => void
}

const ProjectMembersFilters: FC<ProjectMembersFiltersProps> = ({ onFilterChange }) => {
  const [localFilters, setLocalFilters] = useState<ProjectMembersFiltersState>(
    PROJECT_MEMBERS_INITIAL_FILTERS
  )

  const areFiltersEmpty = useMemo(() => {
    return !localFilters.search && localFilters.role === 'all'
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

  const handleClearFilters = () => {
    setLocalFilters(PROJECT_MEMBERS_INITIAL_FILTERS)
    onFilterChange(PROJECT_MEMBERS_INITIAL_FILTERS)
  }

  return (
    <div className="flex gap-3">
      <div className="w-64">
        <Input
          placeholder="Search"
          label="Search"
          value={localFilters.search}
          onChange={handleSearchChange}
          leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
          className="w-full"
        />
      </div>
      <div className="w-48">
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
