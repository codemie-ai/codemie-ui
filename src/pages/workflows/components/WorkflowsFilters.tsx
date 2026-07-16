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
import { CREATED_BY } from '@/constants'
import { useProjectDisplayNames } from '@/hooks/useProjectDisplayNames'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import {
  INITIAL_WORKFLOWS_FILTERS,
  WORKFLOW_LIST_SCOPE,
  WorkflowListScope,
} from '@/pages/workflows/constants'
import { assistantsStore } from '@/store'
import { userStore } from '@/store/user'
import { workflowsStore } from '@/store/workflows'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { FILTER_ENTITY, getFilters, setFilters, updateUrlWithFilters } from '@/utils/filters'
import { createdBy } from '@/utils/helpers'
import { getProjectDisplayName } from '@/utils/projectDisplayName'
import { makeCleanObject } from '@/utils/utils'

interface WorkflowsFilters {
  name?: string
  project?: string[]
  shared?: string
  created_by?: string
  categories?: string[]
}

interface WorkflowsFiltersProps {
  scope: WorkflowListScope
  onApply?: (filters: Record<string, unknown>) => void
}

const WorkflowsFilters: React.FC<WorkflowsFiltersProps> = ({ scope, onApply }) => {
  const router = useVueRouter()
  const route = useVueRoute()
  const { assistantCategories } = useSnapshot(assistantsStore)
  const { workflowTemplates } = useSnapshot(workflowsStore)
  const [projectOptions, setProjectOptions] = useState<FilterOption[]>([])
  const [createdByOptions, setCreatedByOptions] = useState<FilterOption[]>([])
  const [isCreatedByMeChecked, setIsCreatedByMeChecked] = useState(false)

  // initialFilterValues is an IIFE that creates new array references on every render.
  // Stabilize the project list so useProjectDisplayNames doesn't re-run the effect every render.
  const persistedProject = useMemo(() => {
    const { project = INITIAL_WORKFLOWS_FILTERS.project } = getFilters<WorkflowsFilters>(
      `${FILTER_ENTITY.WORKFLOWS}.${scope}`
    )
    if (Array.isArray(project)) return project
    return project ? [project] : []
  }, [scope])

  const projectDisplayNames = useProjectDisplayNames(persistedProject)

  const resolvedProjectOptions = useMemo(() => {
    const existing = new Set(projectOptions.map((o) => o.value))
    const extras = persistedProject
      .filter((name): name is string => !!name && !existing.has(name))
      .map((name) => ({ label: projectDisplayNames.get(name) ?? name, value: name }))
    return [...projectOptions, ...extras]
  }, [projectOptions, persistedProject, projectDisplayNames])

  const categoriesOptions = useMemo<FilterOption[]>(
    () => assistantCategories.map((c) => ({ label: c.name, value: c.id })),
    [assistantCategories]
  )

  const initialFilterValues = (() => {
    const {
      name = INITIAL_WORKFLOWS_FILTERS.name,
      project = INITIAL_WORKFLOWS_FILTERS.project,
      shared = INITIAL_WORKFLOWS_FILTERS.shared,
      created_by = INITIAL_WORKFLOWS_FILTERS.created_by,
      categories = INITIAL_WORKFLOWS_FILTERS.categories,
    } = getFilters<WorkflowsFilters>(`${FILTER_ENTITY.WORKFLOWS}.${scope}`)

    return {
      name,
      project: Array.isArray(project) ? project : [project],
      shared: shared === '' ? '' : String(shared),
      created_by: created_by || '',
      categories: Array.isArray(categories) ? categories : [],
    }
  })()

  const loadProjectOptions = useCallback(async (value = '') => {
    try {
      const projects = await userStore.getProjects(value)
      const options = projects.map((project) => ({
        label: getProjectDisplayName(project),
        value: project.name,
      }))
      setProjectOptions(options)
    } catch (error) {
      console.error('Error loading project options:', error)
    }
  }, [])

  const loadCreatedByOptions = useCallback(async (marketplaceScope = false) => {
    try {
      const users = await userStore.loadWorkflowsUsers(
        marketplaceScope ? { scope: 'marketplace' } : {}
      )
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
    if (scope === WORKFLOW_LIST_SCOPE.TEMPLATES) {
      if (!workflowsStore.workflowsTemplatesLoaded && !workflowsStore.workflowsTemplatesLoading) {
        workflowsStore.indexWorkflowTemplates()
      }
    } else if (scope === 'marketplace') {
      assistantsStore.getAssistantCategories()
      loadCreatedByOptions(true)
    } else {
      loadProjectOptions('')
      if (scope === WORKFLOW_LIST_SCOPE.ALL || scope === WORKFLOW_LIST_SCOPE.FAVORITES) {
        loadCreatedByOptions()
      }
    }
  }, [loadProjectOptions, loadCreatedByOptions, scope])

  useEffect(() => {
    if (scope !== WORKFLOW_LIST_SCOPE.TEMPLATES) return
    const seen = new Map<string, FilterOption>()
    for (const t of workflowTemplates) {
      const author = (t as any).created_by
      if (author?.name && !seen.has(author.name)) {
        seen.set(author.name, {
          label: createdBy(author),
          value: author.name,
          id: author.username ?? '',
        })
      }
    }
    setCreatedByOptions(Array.from(seen.values()))
  }, [workflowTemplates, scope])

  useEffect(() => {
    if (!onApply) {
      workflowsStore.setWorkflowsFilters(initialFilterValues)
      if (initialFilterValues.name && route.query?.name !== initialFilterValues.name) {
        updateUrlWithFilters(initialFilterValues)
      }
    }
  }, [initialFilterValues, onApply, route.query?.name])

  useEffect(() => {
    if (!onApply) {
      const page = route.query.page ? Number(route.query.page) - 1 : 0
      const perPage = route.query.perPage ? Number(route.query.perPage) : undefined
      workflowsStore.setWorkflowsPagination(page, perPage)
      workflowsStore.setWorkflowsFilters(initialFilterValues)
    }
  }, [onApply])

  const statusOptions: FilterOption[] = [
    { label: 'All', value: '' },
    { label: 'With Project', value: 'true' },
    { label: 'Not Shared', value: 'false' },
  ]

  const filterDefinitions = useMemo<FilterDefinition[]>(
    () =>
      [
        {
          name: 'categories',
          label: 'Categories',
          type: FilterDefinitionType.Multiselect,
          value: initialFilterValues.categories || [],
          options: categoriesOptions,
          config: {
            maxSelectedLabels: 3,
          },
        },
        {
          name: 'project',
          label: 'Project',
          type: FilterDefinitionType.Multiselect,
          value: initialFilterValues.project || [],
          options: resolvedProjectOptions,
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
        if (scope === WORKFLOW_LIST_SCOPE.TEMPLATES) {
          return false
        }
        if (scope === 'marketplace') {
          return definition.name === 'categories' || definition.name === CREATED_BY
        }
        if (definition.name === 'categories') {
          return false
        }
        if (scope === 'my' && definition.name === CREATED_BY) {
          return false
        }
        return true
      }),
    [
      initialFilterValues.categories,
      initialFilterValues.project,
      initialFilterValues.created_by,
      initialFilterValues.shared,
      categoriesOptions,
      resolvedProjectOptions,
      createdByOptions,
      loadProjectOptions,
      scope,
    ]
  )

  const handleApply = useCallback(
    async (filters: Record<string, unknown>) => {
      const cleanFilters = makeCleanObject(filters)

      if (onApply) {
        onApply(cleanFilters)
        return
      }

      const newQuery = { ...route.query }
      delete newQuery.name
      delete newQuery.project
      delete newQuery.shared
      delete newQuery.created_by
      delete newQuery.categories

      router.push({
        path: route.path,
        query: {
          ...newQuery,
          page: '1',
          ...cleanFilters,
        },
      })

      workflowsStore.setWorkflowsFilters(filters)
      setFilters<WorkflowsFilters>(`${FILTER_ENTITY.WORKFLOWS}.${scope}`, filters)

      if (scope !== WORKFLOW_LIST_SCOPE.TEMPLATES) {
        const perPage = route.query.perPage ? Number(route.query.perPage) : undefined
        workflowsStore.setWorkflowsPagination(0, perPage)
        workflowsStore.indexWorkflows()
      }
    },
    [router, route, scope, onApply]
  )

  const areFiltersEmpty = useMemo(() => {
    return (
      !initialFilterValues.name &&
      (!initialFilterValues.project || initialFilterValues.project.length === 0) &&
      initialFilterValues.shared === '' &&
      !initialFilterValues.created_by &&
      (!initialFilterValues.categories || initialFilterValues.categories.length === 0)
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
