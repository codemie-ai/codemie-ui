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

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import Filters from '@/components/Filters'
import UserFilter from '@/components/UserFilter'
import {
  INDEX_TYPES,
  INDEX_TYPE_CODE,
  INDEX_STATUSES,
  FILTER_INITIAL_STATE,
} from '@/constants/dataSources'
import { UseTableFiltersReturn } from '@/hooks/useTableFilters'
import { userStore } from '@/store'
import { FilterDefinition, FilterDefinitionType } from '@/types/filters'
import { setFilters, FILTER_ENTITY, getFilters, checkEmptyFilters } from '@/utils/filters'
import { humanize, createdBy } from '@/utils/helpers'
import { getFullIndexType } from '@/utils/indexing'

type FilterValues = {
  name: string
  project: never[]
  index_type: never[]
  created_by: string
  status: string
  start_date: null
  end_date: null
}

interface Props {
  initialValues?: FilterValues
  onApplyFilters: UseTableFiltersReturn['applyFilters']
}

const ALL = { label: 'All', value: '' }

// TODO: update loadCreatedByOptions, loadProjectOptions to setState to store selector fields
const DataSourceFilters: React.FC<Props> = ({
  onApplyFilters,
  initialValues = { ...FILTER_INITIAL_STATE },
}) => {
  const activeFilters = getFilters(`${FILTER_ENTITY.DATASOURCES}`) as FilterValues
  const sourceFilters = activeFilters ?? initialValues
  const [isChecked, setIsChecked] = useState(false)

  // Create merged initial values
  const mergedInitialValues = {
    name: sourceFilters.name || '',
    index_type: Array.isArray(sourceFilters.index_type) ? sourceFilters.index_type : [],
    project: Array.isArray(sourceFilters.project) ? sourceFilters.project : [],
    created_by: sourceFilters.created_by || '',
    status: sourceFilters.status || '',
  }
  const { loadIndexUsers, getProjects } = useSnapshot(userStore) as typeof userStore

  const [createdByOptions, setCreatedByOptions] = useState<
    { label: string; value: string; id: string }[]
  >([])
  const [projectOptions, setProjectOptions] = useState<{ label: string; value: string }[]>([])

  const indexTypeOptions = useMemo(() => {
    return Object.keys(INDEX_TYPES).map((key) => {
      if (INDEX_TYPES[key] === INDEX_TYPES.GIT) {
        return {
          label: humanize(INDEX_TYPE_CODE),
          value: INDEX_TYPE_CODE,
        }
      }
      const option = {
        label: humanize(INDEX_TYPES[key]),
        value: getFullIndexType(INDEX_TYPES[key]),
      }

      // Add NEW badge for X-ray and Azure DevOps Work Item types
      if (
        INDEX_TYPES[key] === INDEX_TYPES.XRAY ||
        INDEX_TYPES[key] === INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM
      ) {
        return { ...option, badge: 'NEW' }
      }

      return option
    })
  }, [])

  const statusOptions = useMemo(() => {
    return [
      ALL,
      ...Object.keys(INDEX_STATUSES).map((key) => ({
        label: humanize(INDEX_STATUSES[key]),
        value: INDEX_STATUSES[key],
      })),
    ]
  }, [])

  const loadCreatedByOptions = useCallback(async () => {
    const users = await loadIndexUsers()
    setCreatedByOptions(
      users.map((user) => ({
        label: createdBy(user),
        value: user.name!,
        id: user.username!,
      }))
    )
  }, [loadIndexUsers])

  const loadProjectOptions = useCallback(
    async (search = '') => {
      const projects = await getProjects(search)
      setProjectOptions(
        projects.map((project: string) => ({
          label: project,
          value: project,
        }))
      )
    },
    [getProjects]
  )

  useEffect(() => {
    loadCreatedByOptions()
    loadProjectOptions()

    setIsChecked(!!sourceFilters.created_by?.length)
  }, [loadCreatedByOptions, loadProjectOptions])

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () => [
      {
        label: 'Type',
        name: 'index_type',
        type: FilterDefinitionType.CheckboxList,
        value: mergedInitialValues.index_type,
        options: indexTypeOptions,
      },
      {
        label: 'Project',
        name: 'project',
        type: FilterDefinitionType.Multiselect,
        value: mergedInitialValues.project,
        options: projectOptions,
        config: {
          maxSelectedLabels: 3,
          filterPlaceholder: 'Search for projects',
          filter: true,
          onFilter: loadProjectOptions,
        },
      },
      {
        label: 'Created by',
        name: 'created_by',
        type: FilterDefinitionType.Custom,
        value: mergedInitialValues.created_by,
        options: createdByOptions,
      },
      {
        label: 'Status',
        name: 'status',
        type: FilterDefinitionType.Select,
        value: mergedInitialValues.status,
        options: statusOptions,
      },
    ],
    [
      mergedInitialValues,
      indexTypeOptions,
      projectOptions,
      createdByOptions,
      statusOptions,
      loadProjectOptions,
    ]
  )

  // Handle applying filters - update URL and localStorage
  const handleApplyFilters = (filters: Record<string, unknown>) => {
    // Update URL with filters
    if (userStore.user?.userId) {
      setFilters(FILTER_ENTITY.DATASOURCES, filters)
    }

    // Call the original onApplyFilters function
    onApplyFilters(filters)
  }

  const areFiltersEmpty = useMemo(() => {
    return checkEmptyFilters(mergedInitialValues)
  }, [mergedInitialValues])

  return (
    <Filters
      searchKey="name"
      onApply={handleApplyFilters}
      areFiltersEmpty={areFiltersEmpty}
      searchValue={mergedInitialValues.name || ''}
      filterDefinitions={filterDefinitions}
      renderCustomFilter={(definition, value, updateValue) => {
        if (definition.name === 'created_by') {
          return (
            <UserFilter
              setIsChecked={setIsChecked}
              isChecked={isChecked}
              definition={definition}
              value={value as string}
              onChange={(newValue) => updateValue(newValue)}
            />
          )
        }
        return null
      }}
    />
  )
}

export default DataSourceFilters
