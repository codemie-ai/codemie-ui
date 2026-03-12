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

import Filters from '@/components/Filters'
import UserFilter from '@/components/UserFilter'
import { CREATED_BY } from '@/constants'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import { INITIAL_WORKFLOWS_FILTERS, WorkflowListScope } from '@/pages/workflows/constants'
import { userStore } from '@/store/user'
import { workflowsStore } from '@/store/workflows'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'
import { createdBy } from '@/utils/helpers'
import { makeCleanObject } from '@/utils/utils'

interface WorkflowsFilters {
  name?: string
  project?: string[]
  shared?: string
  created_by?: string
}

interface WorkflowsFiltersProps {
  scope: WorkflowListScope
}

const WorkflowsFilters: React.FC<WorkflowsFiltersProps> = ({ scope }) => {
  const router = useVueRouter()
  const route = useVueRoute()
  const [projectOptions, setProjectOptions] = useState<FilterOption[]>([])
  const [createdByOptions, setCreatedByOptions] = useState<FilterOption[]>([])
  const [isCreatedByMeChecked, setIsCreatedByMeChecked] = useState(false)

  const initialFilterValues = (() => {
    const {
      name = INITIAL_WORKFLOWS_FILTERS.name,
      project = INITIAL_WORKFLOWS_FILTERS.project,
      shared = INITIAL_WORKFLOWS_FILTERS.shared,
      created_by = INITIAL_WORKFLOWS_FILTERS.created_by,
    } = getFilters<WorkflowsFilters>(`${FILTER_ENTITY.WORKFLOWS}.${scope}`)

    return {
      name,
      project: Array.isArray(project) ? project : [project],
      shared: shared === '' ? '' : String(shared),
      created_by: created_by || '',
    }
  })()

  const loadProjectOptions = useCallback(async (value = '') => {
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
      const users = await userStore.loadWorkflowsUsers()
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
    loadProjectOptions('')
    // Only load created by options on "All Workflows" page
    if (scope === 'all') {
      loadCreatedByOptions()
    }
  }, [loadProjectOptions, loadCreatedByOptions, scope])

  useEffect(() => {
    workflowsStore.setWorkflowsFilters(initialFilterValues)
  }, [initialFilterValues])

  useEffect(() => {
    const page = route.query.page ? Number(route.query.page) - 1 : 0
    const perPage = route.query.perPage ? Number(route.query.perPage) : undefined
    workflowsStore.setWorkflowsPagination(page, perPage)
    workflowsStore.setWorkflowsFilters(initialFilterValues)
  }, [])

  const statusOptions: FilterOption[] = [
    { label: 'All', value: '' },
    { label: 'With Project', value: 'true' },
    { label: 'Not Shared', value: 'false' },
  ]

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () =>
      [
        {
          name: 'project',
          label: 'Project',
          type: FilterDefinitionType.Multiselect,
          value: initialFilterValues.project || [],
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
          value: initialFilterValues.created_by || '',
          options: createdByOptions || [],
        },
        {
          name: 'shared',
          label: 'Shared',
          type: FilterDefinitionType.RadioGroup,
          value: initialFilterValues.shared,
          options: statusOptions,
          config: {
            defaultValue: statusOptions[0],
          },
        },
      ].filter((definition) => {
        // Hide "Created By" filter on "My Workflows" page since it already filters by current user
        if (scope === 'my' && definition.name === CREATED_BY) {
          return false
        }
        return true
      }),
    [
      initialFilterValues.project,
      initialFilterValues.created_by,
      initialFilterValues.shared,
      projectOptions,
      createdByOptions,
      loadProjectOptions,
      scope,
    ]
  )

  const handleApply = useCallback(
    async (filters: Record<string, unknown>) => {
      const cleanFilters = makeCleanObject(filters)
      const newQuery = { ...route.query }
      delete newQuery.name
      delete newQuery.project
      delete newQuery.shared
      delete newQuery.created_by

      router.push({
        path: route.path,
        query: {
          ...newQuery,
          page: '1',
          ...cleanFilters,
        },
      })

      const perPage = route.query.perPage ? Number(route.query.perPage) : undefined
      workflowsStore.setWorkflowsPagination(0, perPage)
      workflowsStore.setWorkflowsFilters(filters)
      setFilters<WorkflowsFilters>(`${FILTER_ENTITY.WORKFLOWS}.${scope}`, filters)
      workflowsStore.indexWorkflows()
    },
    [router, route, scope]
  )

  const areFiltersEmpty = useMemo(() => {
    return (
      !initialFilterValues.name &&
      (!initialFilterValues.project || initialFilterValues.project.length === 0) &&
      initialFilterValues.shared === '' &&
      !initialFilterValues.created_by
    )
  }, [initialFilterValues])

  const renderCustomFilter = useCallback(
    (definition: FilterDefinition, value: unknown, onChange: (value: any) => void) => {
      if (definition.name === CREATED_BY) {
        return (
          <UserFilter
            definition={definition}
            value={value as string}
            onChange={onChange}
            isChecked={isCreatedByMeChecked}
            setIsChecked={setIsCreatedByMeChecked}
          />
        )
      }
      return null
    },
    [isCreatedByMeChecked]
  )

  return (
    <Filters
      areFiltersEmpty={areFiltersEmpty}
      searchKey="name"
      searchValue={initialFilterValues.name}
      searchPlaceholder="Search"
      onApply={handleApply}
      filterDefinitions={filterDefinitions}
      renderCustomFilter={renderCustomFilter}
    />
  )
}

export default WorkflowsFilters
