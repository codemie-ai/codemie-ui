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

import React, { useCallback, useMemo } from 'react'

import Filters from '@/components/Filters'
import ProjectSelector from '@/components/ProjectSelector'
import {
  SchedulerFilterOptions,
  SchedulerLastRunStatus,
  SchedulerResourceType,
  SchedulerStatus,
} from '@/store/schedulers'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'

export interface SchedulerFilterValues {
  search?: string
  resourceType?: SchedulerResourceType | ''
  projectId?: string[]
  resourceId?: string[]
  status?: SchedulerStatus | ''
  lastRunStatus?: SchedulerLastRunStatus | ''
}

interface Props {
  filterOptions: SchedulerFilterOptions
  values: SchedulerFilterValues
  onApply: (values: SchedulerFilterValues) => void
}

const ALL_OPTION: FilterOption = { label: 'All', value: '' }

const RESOURCE_TYPE_OPTIONS: FilterOption[] = [
  ALL_OPTION,
  { label: 'Assistant', value: 'Assistant' },
  { label: 'Workflow', value: 'Workflow' },
  { label: 'Datasource', value: 'Datasource' },
]

const STATUS_OPTIONS: FilterOption[] = [
  ALL_OPTION,
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
]

const LAST_RUN_STATUS_OPTIONS: FilterOption[] = [
  ALL_OPTION,
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Running', value: 'running' },
  { label: 'Never run', value: 'never' },
]

const SchedulerFilters: React.FC<Props> = ({ filterOptions, values, onApply }) => {
  const resourceOptions: FilterOption[] = useMemo(
    () => filterOptions.resources.map((r) => ({ label: r.name || r.id, value: r.id })),
    [filterOptions.resources]
  )

  const filterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        name: 'resourceType',
        label: 'Resource Type',
        type: FilterDefinitionType.RadioGroup,
        options: RESOURCE_TYPE_OPTIONS,
        value: values.resourceType ?? '',
      },
      {
        name: 'projectId',
        label: 'Project',
        type: FilterDefinitionType.Custom,
        options: [],
        value: values.projectId ?? [],
      },
      {
        name: 'resourceId',
        label: 'Resource',
        type: FilterDefinitionType.Multiselect,
        options: resourceOptions,
        value: values.resourceId ?? [],
      },
      {
        name: 'status',
        label: 'Status',
        type: FilterDefinitionType.RadioGroup,
        options: STATUS_OPTIONS,
        value: values.status ?? '',
      },
      {
        name: 'lastRunStatus',
        label: 'Last Run Status',
        type: FilterDefinitionType.RadioGroup,
        options: LAST_RUN_STATUS_OPTIONS,
        value: values.lastRunStatus ?? '',
      },
    ],
    [resourceOptions, values]
  )

  const areFiltersEmpty = useMemo(
    () =>
      !values.search &&
      !values.resourceType &&
      !values.projectId?.length &&
      !values.resourceId?.length &&
      !values.status &&
      !values.lastRunStatus,
    [values]
  )

  const handleApply = useCallback(
    (raw: Record<string, unknown>) => {
      onApply({
        search: (raw.search as string) || undefined,
        resourceType: (raw.resourceType as SchedulerResourceType) || undefined,
        projectId: raw.projectId as string[] | undefined,
        resourceId: raw.resourceId as string[] | undefined,
        status: (raw.status as SchedulerStatus) || undefined,
        lastRunStatus: (raw.lastRunStatus as SchedulerLastRunStatus) || undefined,
      })
    },
    [onApply]
  )

  const renderCustomFilter = useCallback(
    (
      definition: FilterDefinition,
      value: unknown,
      updateValue: (value: unknown) => void
    ): React.ReactNode => {
      if (definition.name !== 'projectId') return null
      return (
        <ProjectSelector
          multiple
          fullWidth
          label=""
          value={value as string[]}
          onChange={(v) => updateValue(v)}
        />
      )
    },
    []
  )

  return (
    <Filters
      filterDefinitions={filterDefinitions}
      searchKey="search"
      searchPlaceholder="Search schedulers"
      searchValue={values.search ?? ''}
      areFiltersEmpty={areFiltersEmpty}
      renderCustomFilter={renderCustomFilter}
      onApply={handleApply}
      refreshOnValuesUpdate
    />
  )
}

export default SchedulerFilters
