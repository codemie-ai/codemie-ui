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

import React, { FC, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import Filters from '@/components/Filters'
import UserFilter from '@/components/UserFilter'
import { CREATED_BY } from '@/constants'
import { useProjectOptions } from '@/hooks/useProjectOptions'
import { useResolvedProjectOptions } from '@/hooks/useResolvedProjectOptions'
import { userStore } from '@/store/user'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { createdBy, humanize } from '@/utils/helpers'
import {
  IntegrationScope,
  SCOPE_ALL,
  SCOPE_LABEL,
  ScopeFilterValue,
} from '@/utils/integrationScope'

export const SCOPE_NOTICE = 'scope_notice'
export const SCOPE_HINT = 'scope_hint'
const SCOPE_HINT_TEXT = 'Pick a scope to filter by Global or Created by.'

const SCOPE_OPTIONS: FilterOption[] = [
  { label: 'All', value: SCOPE_ALL },
  { label: SCOPE_LABEL[IntegrationScope.USER], value: IntegrationScope.USER },
  { label: SCOPE_LABEL[IntegrationScope.PROJECT], value: IntegrationScope.PROJECT },
]

const GLOBAL_OPTIONS: FilterOption[] = [
  { label: 'All', value: null },
  { label: 'Global', value: 'true' },
  { label: 'Non Global', value: 'false' },
]

interface IntegrationsFiltersProps {
  portalSidebarRef: React.RefObject<HTMLDivElement | null>
  /** Changing it remounts the sidebar so it picks up filters applied from outside. */
  filtersKey: number
  filters: Record<string, any>
  scope: { visible: boolean; value: ScopeFilterValue }
  /** Explains a Type the last Scope change removed; null when nothing was removed. */
  notice: string | null
  typeOptions: FilterOption[]
  areFiltersEmpty: boolean
  onApply: (applied: Record<string, unknown>) => void
}

const IntegrationsFilters: FC<IntegrationsFiltersProps> = ({
  portalSidebarRef,
  filtersKey,
  filters,
  scope,
  notice,
  typeOptions,
  areFiltersEmpty,
  onApply,
}) => {
  const { projectOptions, loadProjectOptions } = useProjectOptions()
  const resolvedProjectOptions = useResolvedProjectOptions(
    projectOptions,
    (filters.project || []) as string[]
  )
  const [createdByOptions, setCreatedByOptions] = useState<FilterOption[]>([])
  const [isCreatedByMeChecked, setIsCreatedByMeChecked] = useState(false)

  const showGlobal = !scope.visible || scope.value === IntegrationScope.USER
  const showCreatedBy = scope.value === IntegrationScope.PROJECT

  useEffect(() => {
    loadProjectOptions('')
  }, [loadProjectOptions])

  useEffect(() => {
    if (!showCreatedBy || createdByOptions.length) return
    userStore
      .loadProjectSettingsUsers()
      .then((users) =>
        setCreatedByOptions(
          users.map((user: any) => ({
            label: createdBy(user),
            value: user.name,
            id: user.username,
          }))
        )
      )
      .catch((error) => console.error('Error loading created by options:', error))
  }, [showCreatedBy, createdByOptions.length])

  const filterDefinitions: FilterDefinition[] = [
    ...(scope.visible
      ? [
          {
            name: 'scope',
            label: 'Scope',
            type: FilterDefinitionType.RadioGroup,
            value: scope.value,
            options: SCOPE_OPTIONS,
          },
        ]
      : []),
    {
      name: 'project',
      label: 'Project',
      type: FilterDefinitionType.Multiselect,
      value: filters.project || [],
      options: resolvedProjectOptions,
      config: {
        maxSelectedLabels: 3,
        filter: true,
        filterPlaceholder: 'Search for projects',
        onFilter: loadProjectOptions,
      },
    },
    {
      name: 'type',
      label: humanize('type'),
      type: FilterDefinitionType.Multiselect,
      value: filters.type || [],
      options: typeOptions,
      config: {
        filter: true,
        filterPlaceholder: 'Search for types',
        onFilter: () => {},
      },
    },
    ...(notice
      ? [
          {
            name: SCOPE_NOTICE,
            label: '',
            type: FilterDefinitionType.Custom,
            value: null,
            options: [],
          },
        ]
      : []),
    ...(showGlobal
      ? [
          {
            name: 'is_global',
            label: 'Global',
            value: filters.is_global || null,
            type: FilterDefinitionType.RadioGroup,
            options: GLOBAL_OPTIONS,
            config: { defaultValue: GLOBAL_OPTIONS[0].value },
          },
        ]
      : []),
    ...(showCreatedBy
      ? [
          {
            name: CREATED_BY,
            label: 'Created by',
            type: FilterDefinitionType.Custom,
            value: filters.created_by || '',
            options: createdByOptions,
          },
        ]
      : []),
    ...(scope.visible && scope.value === SCOPE_ALL
      ? [
          {
            name: SCOPE_HINT,
            label: '',
            type: FilterDefinitionType.Custom,
            value: null,
            options: [],
          },
        ]
      : []),
  ]

  const renderCustomFilter = useCallback(
    (definition: FilterDefinition, value: unknown, onChange: (value: any) => void) => {
      if (definition.name === SCOPE_NOTICE) {
        return <output className="block text-xs text-text-quaternary">{notice}</output>
      }
      if (definition.name === SCOPE_HINT) {
        return <p className="text-xs text-text-quaternary">{SCOPE_HINT_TEXT}</p>
      }
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
    [isCreatedByMeChecked, notice]
  )

  if (!portalSidebarRef.current) return null

  return createPortal(
    <Filters
      key={filtersKey}
      areFiltersEmpty={areFiltersEmpty}
      onApply={onApply}
      searchValue={filters.search || ''}
      filterDefinitions={filterDefinitions}
      searchPlaceholder="Search"
      searchKey="search"
      renderCustomFilter={renderCustomFilter}
    />,
    portalSidebarRef.current
  )
}

export default IntegrationsFilters
