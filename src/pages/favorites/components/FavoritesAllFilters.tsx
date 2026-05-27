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
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { userStore } from '@/store/user'
import { FavoritesFilters } from '@/types/entity/favorites'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { FILTER_ENTITY, checkEmptyFilters, getFilters, setFilters } from '@/utils/filters'
import { createdBy } from '@/utils/helpers'

interface FavoritesAllFiltersProps {
  onFilterChange: (filters: Partial<FavoritesFilters>) => void
}

const FavoritesAllFilters: React.FC<FavoritesAllFiltersProps> = ({ onFilterChange }) => {
  const FILTER_KEY = `${FILTER_ENTITY.FAVORITES}.all`
  const [projectOptions, setProjectOptions] = useState<FilterOption[]>([])
  const [createdByOptions, setCreatedByOptions] = useState<FilterOption[]>([])
  const [isChecked, setIsChecked] = useState(false)

  const savedFilters = useMemo(() => getFilters<Partial<FavoritesFilters>>(FILTER_KEY), [])
  const [filterState, setFilterState] = useState<Partial<FavoritesFilters>>(savedFilters)

  const areFiltersEmpty = useMemo(() => checkEmptyFilters(filterState), [filterState])

  const loadProjectOptions = useCallback(async (value = '') => {
    try {
      const projects = await userStore.getProjects(value)
      setProjectOptions(projects.map((p: string) => ({ label: p, value: p })))
    } catch (error) {
      console.error('Error loading project options:', error)
    }
  }, [])

  const loadCreatedByOptions = useCallback(async () => {
    try {
      const users = await userStore.loadAssistantsUsers({
        scope: ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER,
      })
      setCreatedByOptions(
        users.map((u: any) => ({ label: createdBy(u), value: u.name, id: u.username }))
      )
    } catch (error) {
      console.error('Error loading created by options:', error)
    }
  }, [])

  useEffect(() => {
    loadProjectOptions('')
    loadCreatedByOptions()
  }, [loadProjectOptions, loadCreatedByOptions])

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () => [
      {
        name: 'project',
        label: 'Project',
        type: FilterDefinitionType.Multiselect,
        value: filterState.project ?? [],
        options: projectOptions,
        config: {
          maxSelectedLabels: 3,
          filter: true,
          filterPlaceholder: 'Search for projects',
          onFilter: loadProjectOptions,
        },
      },
      {
        name: CREATED_BY,
        label: 'Created by',
        type: FilterDefinitionType.Custom,
        value: filterState.created_by ?? '',
        options: createdByOptions,
      },
    ],
    [
      filterState.project,
      filterState.created_by,
      projectOptions,
      createdByOptions,
      loadProjectOptions,
    ]
  )

  const handleApply = useCallback(
    (values: Record<string, unknown>) => {
      const next = values as Partial<FavoritesFilters>
      setFilters(FILTER_KEY, next)
      setFilterState(next)
      onFilterChange(next)
    },
    [onFilterChange]
  )

  return (
    <Filters
      refreshOnValuesUpdate
      areFiltersEmpty={areFiltersEmpty}
      searchKey="search"
      searchValue={filterState.search ?? ''}
      searchPlaceholder="Search"
      onApply={handleApply}
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

export default FavoritesAllFilters
