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

import React, { useState, useEffect, useCallback, useMemo } from 'react'

import Filters from '@/components/Filters'
import UserFilter from '@/components/UserFilter'
import { CREATED_BY } from '@/constants'
import { SKILL_INDEX_SCOPES } from '@/constants/skills'
import { skillsStore } from '@/store/skills'
import { userStore } from '@/store/user'
import { SkillsFilters, SkillVisibility } from '@/types/entity/skill'
import { User } from '@/types/entity/user'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { checkEmptyFilters } from '@/utils/filters'
import { createdBy } from '@/utils/helpers'

interface SkillsFiltersProps {
  onFilterChange: (filters: Record<string, unknown>) => void
  filters: SkillsFilters
  activeScope: string
}

// For Project Skills tab: exclude Public (Public goes to Marketplace)
const VISIBILITY_OPTIONS: FilterOption[] = [
  { label: 'All', value: null },
  { label: 'Private', value: SkillVisibility.PRIVATE },
  { label: 'Project', value: SkillVisibility.PROJECT },
]

const SkillsFiltersComponent: React.FC<SkillsFiltersProps> = ({
  onFilterChange,
  filters,
  activeScope,
}) => {
  const [projectOptions, setProjectOptions] = useState<FilterOption[]>([])
  const [isChecked, setIsChecked] = useState(false)
  const [createdByOptions, setCreatedByOptions] = useState<FilterOption[]>([])
  const [categoryOptions, setCategoryOptions] = useState<FilterOption[]>([])

  const areFiltersEmpty = useMemo(() => {
    return checkEmptyFilters(filters)
  }, [filters])

  const loadProjectOptions = useCallback(async (value: string) => {
    try {
      const projects = await userStore.getProjects(value)
      const options = projects.map((project: string) => ({
        label: project,
        value: project,
      }))
      setProjectOptions(options)
    } catch (error) {
      console.error('Error loading project options:', error)
    }
  }, [])

  const loadCreatedByOptions = useCallback(async () => {
    try {
      const users = await userStore.loadSkillsUsers()
      const options = users.map((u: User) => ({
        label: createdBy(u),
        value: u.name,
        id: u.username,
      }))
      setCreatedByOptions(options)
    } catch (error) {
      console.error('Error loading created by options:', error)
    }
  }, [])

  const loadCategoryOptions = useCallback(async () => {
    try {
      const categories = await skillsStore.getSkillCategories()
      const options = categories.map((category) => ({
        label: category.label,
        value: category.value,
      }))
      setCategoryOptions(options)
    } catch (error) {
      console.error('Error loading category options:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      await loadProjectOptions('')
      await loadCreatedByOptions()
      await loadCategoryOptions()
    }
    loadData()
  }, [loadProjectOptions, loadCreatedByOptions, loadCategoryOptions])

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () =>
      [
        {
          name: 'project',
          label: 'Project',
          type: FilterDefinitionType.Multiselect,
          value: filters.project ?? [],
          options: projectOptions,
          config: {
            maxSelectedLabels: 3,
            filter: true,
            filterPlaceholder: 'Search for projects',
            onFilter: loadProjectOptions,
          },
        },
        {
          name: 'categories',
          label: 'Categories',
          type: FilterDefinitionType.Multiselect,
          value: filters.categories ?? [],
          options: categoryOptions,
          config: {
            maxSelectedLabels: 3,
          },
        },
        {
          name: CREATED_BY,
          label: 'Created by',
          type: FilterDefinitionType.Custom,
          value: filters.created_by ?? '',
          options: createdByOptions ?? [],
        },
        {
          name: 'visibility',
          label: 'Visibility',
          type: FilterDefinitionType.RadioGroup,
          value: filters.visibility ?? null,
          options: VISIBILITY_OPTIONS,
          config: {
            defaultValue: null,
          },
        },
      ].filter((definition) => {
        // For Marketplace, show only Created by and Categories
        if (activeScope === SKILL_INDEX_SCOPES.MARKETPLACE) {
          return definition.name === CREATED_BY || definition.name === 'categories'
        }
        return true
      }),
    [
      filters.project,
      filters.categories,
      filters.visibility,
      filters.created_by,
      projectOptions,
      createdByOptions,
      categoryOptions,
      loadProjectOptions,
      activeScope,
    ]
  )

  const handleFiltersApply = useCallback(
    (values: Record<string, unknown>) => {
      onFilterChange(values)
    },
    [onFilterChange]
  )

  return (
    <Filters
      refreshOnValuesUpdate
      key={activeScope}
      areFiltersEmpty={areFiltersEmpty}
      searchKey="search"
      searchValue={filters?.search ?? ''}
      searchPlaceholder="Search"
      onApply={handleFiltersApply}
      filterDefinitions={filterDefinitions}
      renderCustomFilter={(definition, _value, updateValue) => {
        if (definition.name === CREATED_BY) {
          return (
            <UserFilter
              setIsChecked={setIsChecked}
              isChecked={isChecked}
              definition={definition}
              value={definition.value as string}
              onChange={(newValue) => updateValue(newValue)}
            />
          )
        }
        return null
      }}
    />
  )
}

export default SkillsFiltersComponent
