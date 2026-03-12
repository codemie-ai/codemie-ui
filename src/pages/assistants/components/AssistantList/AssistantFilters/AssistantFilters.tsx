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

import isNil from 'lodash/isNil'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import Filters from '@/components/Filters'
import UserFilter from '@/components/UserFilter'
import { CATEGORIES, CREATED_BY, NOT_SHARED, SHARED, GLOBAL } from '@/constants'
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { assistantsStore } from '@/store/assistants'
import { userStore } from '@/store/user'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { checkEmptyFilters } from '@/utils/filters'
import { createdBy } from '@/utils/helpers'

interface AssistantFilters {
  search?: string
  project?: string[]
  created_by?: string
  is_global?: boolean | null
  shared?: boolean | null
  categories?: string[]
}

interface AssistantFiltersProps {
  onFilterChange: (filters: Record<string, unknown>) => void
  filters: AssistantFilters
  activeScope: string
}

const AssistantFilters: React.FC<AssistantFiltersProps> = ({
  onFilterChange,
  filters,
  activeScope,
}) => {
  const [projectOptions, setProjectOptions] = useState<FilterOption[]>([])
  const [isChecked, setIsChecked] = useState(false)
  const [createdByOptions, setCreatedByOptions] = useState<FilterOption[]>([])
  const [categoriesOptions, setCategoriesOptions] = useState<FilterOption[]>([])
  const { assistantCategories } = useSnapshot(assistantsStore)

  const areFiltersEmpty = useMemo(() => {
    return checkEmptyFilters(filters)
  }, [filters])

  const statusOptions: FilterOption[] = [
    {
      label: 'All',
      value: null,
    },
    {
      label: 'With Project',
      value: SHARED,
    },
    {
      label: 'Not Shared',
      value: NOT_SHARED,
    },
  ]

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
      const users = await userStore.loadAssistantsUsers({
        scope: ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER,
      })
      const options = users.map((user: any) => ({
        label: createdBy(user),
        value: user.name,
        id: user.username,
      }))
      setCreatedByOptions(options)
    } catch (error) {
      console.error('Error loading created by options:', error)
    }
  }, [])

  useEffect(() => {
    const options = assistantCategories.map((category: any) => ({
      label: category.name,
      value: category.id,
      description: category.description,
    }))
    setCategoriesOptions(options)
  }, [assistantCategories])

  const getStatusInitialValue = useCallback(() => {
    if (filters.is_global) {
      return GLOBAL
    }
    if (isNil(filters.shared)) {
      return null
    }
    return filters.shared ? SHARED : NOT_SHARED
  }, [filters.is_global, filters.shared])

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () =>
      [
        {
          name: 'project',
          label: 'Project',
          type: FilterDefinitionType.Multiselect,
          value: filters.project || [],
          options: projectOptions,
          config: {
            maxSelectedLabels: 3,
            filter: true,
            filterPlaceholder: 'Search for projects',
            onFilter: loadProjectOptions,
          },
        },
        {
          name: CATEGORIES,
          label: 'Categories',
          type: FilterDefinitionType.Multiselect,
          value: filters.categories || [],
          options: categoriesOptions,
          config: {
            maxSelectedLabels: 3,
            filter: true,
            filterPlaceholder: 'Search for categories',
            onFilter: () => {},
          },
        },
        {
          name: CREATED_BY,
          label: 'Created by',
          type: FilterDefinitionType.Custom,
          value: filters.created_by || '',
          options: createdByOptions || [],
        },
        {
          name: 'status',
          label: 'Shared',
          type: FilterDefinitionType.RadioGroup,
          value: getStatusInitialValue(),
          options: statusOptions,
          config: {
            defaultValue: statusOptions[0],
          },
        },
      ].filter((definition) => {
        if (activeScope === ASSISTANT_INDEX_SCOPES.MARKETPLACE) {
          return definition.name === CREATED_BY || definition.name === CATEGORIES
        }
        return definition
      }),
    [
      filters.project,
      filters.created_by,
      filters.categories,
      projectOptions,
      createdByOptions,
      categoriesOptions,
      getStatusInitialValue,
      loadProjectOptions,
      activeScope,
    ]
  )

  const handleFiltersApply = useCallback(
    (values: Record<string, unknown>) => {
      const { status, ...filterValues } = values
      const statusValues: Record<string, unknown> = {}

      if (status === GLOBAL) {
        statusValues.is_global = true
      } else if (status === SHARED) {
        statusValues.shared = true
      } else if (status === NOT_SHARED) {
        statusValues.shared = false
      }

      const appliedFilters = {
        ...filterValues,
        ...statusValues,
      }

      onFilterChange(appliedFilters)
    },
    [onFilterChange]
  )

  useEffect(() => {
    const loadData = async () => {
      await loadProjectOptions('')
      await loadCreatedByOptions()
    }
    loadData()
  }, [loadProjectOptions, loadCreatedByOptions])

  return (
    <Filters
      refreshOnValuesUpdate
      key={activeScope}
      areFiltersEmpty={areFiltersEmpty}
      searchKey="search"
      searchValue={filters?.search || ''}
      searchPlaceholder="Search"
      onApply={handleFiltersApply}
      filterDefinitions={filterDefinitions}
      renderCustomFilter={(definition, _value, updateValue) => {
        if (definition.name === 'created_by') {
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

export default AssistantFilters
