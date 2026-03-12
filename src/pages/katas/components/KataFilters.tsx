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
import { useSnapshot } from 'valtio'

import Filters from '@/components/Filters'
import { KATA_PROGRESS_STATUS_VALUES } from '@/constants/katas'
import { katasStore } from '@/store/katas'
import { userStore } from '@/store/user'
import { KataFilters as KataFiltersType, KataLevel, KataStatus } from '@/types/entity/kata'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { checkEmptyFilters } from '@/utils/filters'

interface KataFiltersProps {
  onFilterChange: (filters: Record<string, unknown>) => void
  filters: KataFiltersType
}

const KataFilters: React.FC<KataFiltersProps> = ({ onFilterChange, filters }) => {
  const [rolesOptions, setRolesOptions] = useState<FilterOption[]>([])
  const [tagsOptions, setTagsOptions] = useState<FilterOption[]>([])
  const { availableRoles, availableTags } = useSnapshot(katasStore)
  const { user } = useSnapshot(userStore)
  const isAdmin = user?.isAdmin ?? false

  const areFiltersEmpty = useMemo(() => {
    // For non-admin users, exclude the status field since it's always set to PUBLISHED
    // and is not user-selectable
    // For admin users, only consider status as "not empty" if it's different from default (PUBLISHED)
    const filtersToCheck = { ...filters }

    // For admin users, only consider status as "not empty" if it's different from default (PUBLISHED)
    if (!isAdmin || filtersToCheck.status === KataStatus.PUBLISHED) {
      delete filtersToCheck.status
    }

    return checkEmptyFilters(filtersToCheck)
  }, [filters, isAdmin])

  const levelOptions: FilterOption[] = [
    {
      label: 'All',
      value: null,
    },
    {
      label: 'Beginner',
      value: KataLevel.BEGINNER,
    },
    {
      label: 'Intermediate',
      value: KataLevel.INTERMEDIATE,
    },
    {
      label: 'Advanced',
      value: KataLevel.ADVANCED,
    },
  ]

  const progressStatusOptions: FilterOption[] = [
    {
      label: 'All',
      value: null,
    },
    {
      label: 'Not Started',
      value: KATA_PROGRESS_STATUS_VALUES.NOT_STARTED,
    },
    {
      label: 'In Progress',
      value: KATA_PROGRESS_STATUS_VALUES.IN_PROGRESS,
    },
    {
      label: 'Completed',
      value: KATA_PROGRESS_STATUS_VALUES.COMPLETED,
    },
  ]

  const statusOptions: FilterOption[] = [
    {
      label: 'Published',
      value: KataStatus.PUBLISHED,
    },
    {
      label: 'Draft',
      value: KataStatus.DRAFT,
    },
    {
      label: 'Archived',
      value: KataStatus.ARCHIVED,
    },
  ]

  const loadRolesOptions = useCallback(async () => {
    try {
      await katasStore.fetchKataRoles()
    } catch (error) {
      console.error('Error loading roles options:', error)
    }
  }, [])

  const loadTagsOptions = useCallback(async () => {
    try {
      await katasStore.fetchKataTags()
    } catch (error) {
      console.error('Error loading tags options:', error)
    }
  }, [])

  useEffect(() => {
    const options = availableRoles.map((role) => ({
      label: role.name,
      value: role.id,
      description: role.description,
    }))
    setRolesOptions(options)
  }, [availableRoles])

  useEffect(() => {
    const options = availableTags.map((tag) => ({
      label: tag.name,
      value: tag.id,
      description: tag.description,
    }))
    setTagsOptions(options)
  }, [availableTags])

  const filterDefinitions = useMemo<FilterDefinition[]>(() => {
    const baseFilters: FilterDefinition[] = [
      {
        name: 'level',
        label: 'Level',
        type: FilterDefinitionType.RadioGroup,
        value: filters.level ?? null,
        options: levelOptions,
        config: {
          defaultValue: levelOptions[0],
        },
      },
      {
        name: 'roles',
        label: 'Roles',
        type: FilterDefinitionType.Multiselect,
        value: filters.roles || [],
        options: rolesOptions,
        config: {
          maxSelectedLabels: 3,
          filterPlaceholder: 'Search for roles',
          onFilter: () => {},
        },
      },
      {
        name: 'tags',
        label: 'Tags',
        type: FilterDefinitionType.Multiselect,
        value: filters.tags || [],
        options: tagsOptions,
        config: {
          maxSelectedLabels: 3,
          filterPlaceholder: 'Search for tags',
          onFilter: () => {},
        },
      },
      {
        name: 'progress_status',
        label: 'Progress Status',
        type: FilterDefinitionType.RadioGroup,
        value: filters.progress_status ?? null,
        options: progressStatusOptions,
        config: {
          defaultValue: progressStatusOptions[0],
        },
      },
    ]

    // Add status filter for admins only
    if (isAdmin) {
      baseFilters.push({
        name: 'status',
        label: 'Status',
        type: FilterDefinitionType.RadioGroup,
        value: filters.status ?? KataStatus.PUBLISHED,
        options: statusOptions,
        config: {
          defaultValue: statusOptions[0],
        },
      })
    }

    return baseFilters
  }, [
    filters.level,
    filters.roles,
    filters.tags,
    filters.progress_status,
    filters.status,
    rolesOptions,
    tagsOptions,
    levelOptions,
    progressStatusOptions,
    statusOptions,
    isAdmin,
  ])

  const handleFiltersApply = useCallback(
    (values: Record<string, unknown>) => {
      const appliedFilters: Record<string, unknown> = {
        search: values.search as string | undefined,
        level: values.level === null ? undefined : (values.level as KataLevel),
        roles: values.roles as string[] | undefined,
        tags: values.tags as string[] | undefined,
        progress_status:
          values.progress_status === null ? undefined : (values.progress_status as string),
        status: isAdmin ? (values.status as KataStatus | undefined) : KataStatus.PUBLISHED,
      }

      onFilterChange(appliedFilters)
    },
    [onFilterChange, isAdmin]
  )

  useEffect(() => {
    loadRolesOptions()
  }, [loadRolesOptions])

  useEffect(() => {
    loadTagsOptions()
  }, [loadTagsOptions])

  return (
    <Filters
      refreshOnValuesUpdate
      areFiltersEmpty={areFiltersEmpty}
      searchKey="search"
      searchValue={filters?.search || ''}
      searchPlaceholder="Search"
      onApply={handleFiltersApply}
      filterDefinitions={filterDefinitions}
    />
  )
}

export default KataFilters
