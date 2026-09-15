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
import { SchedulerRunStatus } from '@/store/schedulerRuns'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'

export interface SchedulerRunFilterValues {
  status?: SchedulerRunStatus | ''
  dateFrom?: string
  dateTo?: string
}

interface Props {
  values: SchedulerRunFilterValues
  onApply: (values: SchedulerRunFilterValues) => void
}

const ALL_OPTION: FilterOption = { label: 'All', value: '' }

const STATUS_OPTIONS: FilterOption[] = [
  ALL_OPTION,
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Running', value: 'running' },
  { label: 'Cancelled', value: 'cancelled' },
]

const DATE_RANGE_OPTIONS: FilterOption[] = [
  ALL_OPTION,
  { label: 'Last 24 hours', value: 'last24h' },
  { label: 'Last 7 days', value: 'last7d' },
  { label: 'Last 30 days', value: 'last30d' },
]

const resolveDateRange = (range: string): { dateFrom?: string; dateTo?: string } => {
  const now = new Date()
  const toISO = (d: Date) => d.toISOString()
  if (range === 'last24h') {
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    return { dateFrom: toISO(from), dateTo: toISO(now) }
  }
  if (range === 'last7d') {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { dateFrom: toISO(from), dateTo: toISO(now) }
  }
  if (range === 'last30d') {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return { dateFrom: toISO(from), dateTo: toISO(now) }
  }
  return {}
}

const SchedulerRunFilters: React.FC<Props> = ({ values, onApply }) => {
  const filterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        name: 'status',
        label: 'Status',
        type: FilterDefinitionType.RadioGroup,
        options: STATUS_OPTIONS,
        value: values.status ?? '',
      },
      {
        name: 'dateRange',
        label: 'Date Range',
        type: FilterDefinitionType.RadioGroup,
        options: DATE_RANGE_OPTIONS,
        value: '',
      },
    ],
    [values]
  )

  const areFiltersEmpty = useMemo(
    () => !values.status && !values.dateFrom && !values.dateTo,
    [values]
  )

  const handleApply = useCallback(
    (raw: Record<string, unknown>) => {
      const dateRange = raw.dateRange as string | undefined
      const resolved = dateRange ? resolveDateRange(dateRange) : {}
      onApply({
        status: (raw.status as SchedulerRunStatus) || undefined,
        ...resolved,
      })
    },
    [onApply]
  )

  return (
    <Filters
      filterDefinitions={filterDefinitions}
      searchKey="_search"
      areFiltersEmpty={areFiltersEmpty}
      onApply={handleApply}
      refreshOnValuesUpdate
    />
  )
}

export default SchedulerRunFilters
