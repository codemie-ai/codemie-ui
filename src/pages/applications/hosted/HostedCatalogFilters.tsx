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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import Filters from '@/components/Filters'
import UserFilter from '@/components/UserFilter'
import { CREATED_BY } from '@/constants'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { useProjectOptions } from '@/hooks/useProjectOptions'
import { useResolvedProjectOptions } from '@/hooks/useResolvedProjectOptions'
import { userStore } from '@/store/user'
import type { User } from '@/types/entity/user'
import { FilterDefinitionType, type FilterDefinition, type FilterOption } from '@/types/filters'
import { createdBy } from '@/utils/helpers'

import {
  HOSTED_COLLECTIONS,
  hasHostedFilters,
  readHostedCatalogSearch,
  type HostedCollectionId,
  type HostedFilterKey,
} from './hostedCollections'

interface Props {
  query: string
  scope: HostedCollectionId
}

const MAX_FILTER_LENGTH = 200

const SHARED_OPTIONS: FilterOption[] = [
  { label: 'All', value: null },
  { label: 'Not shared', value: 'private' },
  { label: 'With people', value: 'people' },
  { label: 'With project', value: 'project' },
]
const STATUS_OPTIONS: FilterOption[] = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Unpublished', value: 'unpublished' },
]
/** Every URL filter the bar can write; a tab keeps only the ones it declares. */
const FILTER_KEYS: HostedFilterKey[] = ['project', 'created_by', 'shared', 'status']

const text = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, MAX_FILTER_LENGTH) : ''

const HostedCatalogFilters = ({ query, scope }: Props) => {
  const [search, setSearch] = useSearchParams()
  const accepted = HOSTED_COLLECTIONS[scope].filters
  const catalogSearch = readHostedCatalogSearch(search, scope)
  const { project, createdBy: creator, shared, status } = catalogSearch
  const projectKey = JSON.stringify(project)
  // Stable while the selected projects stay the same.
  const selectedProjects = useMemo<string[]>(() => JSON.parse(projectKey), [projectKey])

  const { projectOptions, loadProjectOptions } = useProjectOptions()
  const resolvedProjectOptions = useResolvedProjectOptions(projectOptions, selectedProjects)
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [createdByOptions, setCreatedByOptions] = useState<FilterOption[]>([])

  const applyProjectSearch = useCallback(async () => {
    await loadProjectOptions(projectSearchTerm)
    setIsLoadingProjects(false)
  }, [projectSearchTerm, loadProjectOptions])
  const handleProjectFilter = useCallback((value: string) => {
    setIsLoadingProjects(true)
    setProjectSearchTerm(value)
  }, [])
  useDebouncedApply(projectSearchTerm, 1000, applyProjectSearch)

  useEffect(() => {
    loadProjectOptions('')
  }, [loadProjectOptions])

  // Creators belong to the tab: each scope lists the people whose apps it shows.
  useEffect(() => {
    let current = true
    userStore.loadHostedApplicationsUsers(HOSTED_COLLECTIONS[scope].scope).then((users: User[]) => {
      if (!current) return
      // The API matches `created_by` against the display name, as skills do.
      setCreatedByOptions(
        users
          .filter((user) => !!user.name)
          .map((user) => ({ label: createdBy(user), value: user.name!, id: user.username }))
      )
    })
    return () => {
      current = false
    }
  }, [scope])

  const definitions = useMemo<FilterDefinition[]>(() => {
    const byKey: Record<HostedFilterKey, FilterDefinition> = {
      project: {
        name: 'project',
        label: 'Project',
        type: FilterDefinitionType.Multiselect,
        value: selectedProjects,
        options: resolvedProjectOptions,
        config: {
          maxSelectedLabels: 3,
          filter: true,
          filterPlaceholder: 'Search for projects',
          onFilter: handleProjectFilter,
          loading: isLoadingProjects,
          emptyFilterMessage: isLoadingProjects ? 'Loading...' : undefined,
        },
      },
      created_by: {
        name: CREATED_BY,
        label: 'Created by',
        type: FilterDefinitionType.Custom,
        value: creator ?? '',
        options: createdByOptions,
      },
      shared: {
        name: 'shared',
        label: 'Shared',
        type: FilterDefinitionType.RadioGroup,
        value: shared ?? null,
        options: SHARED_OPTIONS,
        config: { defaultValue: null },
      },
      status: {
        name: 'status',
        label: 'Status',
        type: FilterDefinitionType.RadioGroup,
        value: status ?? null,
        options: STATUS_OPTIONS,
        config: { defaultValue: null },
      },
    }
    return accepted.map((key) => byKey[key])
  }, [
    accepted,
    selectedProjects,
    resolvedProjectOptions,
    handleProjectFilter,
    isLoadingProjects,
    creator,
    createdByOptions,
    shared,
    status,
  ])

  const apply = (values: Record<string, unknown>) =>
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous)
        const setText = (key: string, value: string) =>
          value ? next.set(key, value) : next.delete(key)
        setText('q', text(values.q))
        // Keys the tab does not declare are dropped, so they are never sent.
        for (const key of FILTER_KEYS) {
          next.delete(key)
          if (!accepted.includes(key)) continue
          if (key === 'project') {
            const projects = Array.isArray(values.project) ? values.project : []
            for (const name of new Set(projects.map(text).filter(Boolean)))
              next.append('project', name)
          } else setText(key, text(values[key]))
        }
        return next
      },
      { replace: true }
    )

  return (
    <Filters
      key={scope}
      refreshOnValuesUpdate
      searchKey="q"
      searchValue={query}
      searchPlaceholder="Search"
      filterDefinitions={definitions}
      onApply={apply}
      areFiltersEmpty={!query && !hasHostedFilters(scope, catalogSearch)}
      renderCustomFilter={(definition, _value, updateValue) =>
        definition.name === CREATED_BY ? (
          <UserFilter
            setIsChecked={setIsChecked}
            isChecked={isChecked}
            definition={definition}
            value={definition.value as string}
            onChange={(value) => updateValue(value)}
          />
        ) : null
      }
    />
  )
}
export default HostedCatalogFilters
