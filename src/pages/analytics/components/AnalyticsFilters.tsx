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

import { debounce } from 'lodash'
import { FC, useState, useEffect, useCallback, useMemo, useRef } from 'react'

import CrossIcon from '@/assets/icons/cross.svg?react'
import Button from '@/components/Button'
import FilterAccordionItem from '@/components/FilterAccordionItem'
import DatePicker from '@/components/form/DatePicker'
import Select from '@/components/form/Select'
import ProjectSelector from '@/components/ProjectSelector'
import { userStore } from '@/store/user'
import type { AnalyticsQueryParams } from '@/types/analytics'

import AnalyticsUserFilter from './AnalyticsUserFilter'
import { DEFAULT_FILTERS, TIME_PERIOD_OPTIONS } from '../constants'

import type { DropdownChangeEvent } from 'primereact/dropdown'

interface AnalyticsFiltersProps {
  filters: AnalyticsQueryParams
  onFiltersChange: (filters: AnalyticsQueryParams) => void
}

const AnalyticsFilters: FC<AnalyticsFiltersProps> = ({ filters, onFiltersChange }) => {
  const [userOptions, setUserOptions] = useState<Array<{ label: string; value: string }>>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [localFilters, setLocalFilters] = useState<AnalyticsQueryParams>(filters)
  const onFiltersChangeRef = useRef(onFiltersChange)

  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange
  }, [onFiltersChange])

  const debouncedFiltersChange = useMemo(
    () =>
      debounce(
        (newFilters: AnalyticsQueryParams) => {
          onFiltersChangeRef.current(newFilters)
        },
        2000,
        { leading: true, trailing: true }
      ),
    []
  )

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  useEffect(() => {
    return () => {
      debouncedFiltersChange.cancel()
    }
  }, [debouncedFiltersChange])

  const updateFilters = (newFilters: AnalyticsQueryParams) => {
    setLocalFilters(newFilters)
    debouncedFiltersChange(newFilters)
  }

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const { users: _users, ...filtersWithoutUsers } = localFilters
      const options = await userStore.getAnalyticsUsers(filtersWithoutUsers)
      setUserOptions(options)
    } catch (error) {
      console.error('Error loading users:', error)
      setUserOptions([])
    } finally {
      setIsLoadingUsers(false)
    }
  }, [localFilters])

  useEffect(() => {
    loadUsers().catch(console.error)
  }, [loadUsers])

  const handleTimePeriodChange = (e: DropdownChangeEvent) => {
    updateFilters({
      ...localFilters,
      time_period: e.value,
      start_date: undefined,
      end_date: undefined,
    })
  }

  const handleUsersChange = (value: string[]) => {
    updateFilters({
      ...localFilters,
      users: value,
    })
  }

  const handleProjectsChange = (value: string | string[]) => {
    updateFilters({
      ...localFilters,
      projects: Array.isArray(value) ? value : [value],
    })
  }

  const handleStartDateChange = (value: string | null) => {
    updateFilters({
      ...localFilters,
      start_date: value ?? undefined,
      time_period: undefined,
    })
  }

  const handleEndDateChange = (value: string | null) => {
    updateFilters({
      ...localFilters,
      end_date: value ?? undefined,
      time_period: undefined,
    })
  }

  const handleClearFilters = () => {
    updateFilters(DEFAULT_FILTERS)
  }

  const hasNonDefaultFilters = useMemo(() => {
    // Check if filters differ from default
    const hasCustomTimePeriod = localFilters.time_period !== DEFAULT_FILTERS.time_period
    const hasDateRange = !!(localFilters.start_date || localFilters.end_date)
    const hasUsers = !!(localFilters.users && localFilters.users.length > 0)
    const hasProjects = !!(localFilters.projects && localFilters.projects.length > 0)

    return hasCustomTimePeriod || hasDateRange || hasUsers || hasProjects
  }, [localFilters])

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between leading-7 mb-4">
        <span className="text-sm-1 tracking-wide text-text-secondary uppercase font-semibold">
          Filters
        </span>
        {hasNonDefaultFilters && (
          <Button variant="tertiary" className="ml-auto gap-[5px]" onClick={handleClearFilters}>
            <CrossIcon className="w-3.5 h-3.5" /> Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <FilterAccordionItem label="Time Period">
          <Select
            id="time-period"
            value={localFilters.time_period}
            options={TIME_PERIOD_OPTIONS}
            onChange={handleTimePeriodChange}
            placeholder="Select time period"
            rootClassName="w-full"
          />
        </FilterAccordionItem>

        <FilterAccordionItem label="Start Date">
          <DatePicker
            id="start-date"
            value={localFilters.start_date ?? null}
            onChange={handleStartDateChange}
            showTime
            hourFormat="24"
            placeholder="Select start date and time"
            rootClassName="w-full"
            maxDate={localFilters.end_date ?? new Date().toISOString()}
          />
        </FilterAccordionItem>

        <FilterAccordionItem label="End Date">
          <DatePicker
            id="end-date"
            value={localFilters.end_date ?? null}
            onChange={handleEndDateChange}
            showTime
            hourFormat="24"
            placeholder="Select end date and time"
            rootClassName="w-full"
            minDate={localFilters.start_date}
            maxDate={new Date().toISOString()}
          />
        </FilterAccordionItem>

        <FilterAccordionItem label="Project">
          <ProjectSelector
            value={localFilters.projects ?? []}
            onChange={handleProjectsChange}
            fullWidth
            label=""
            multiple
          />
        </FilterAccordionItem>

        <FilterAccordionItem label="Users">
          <AnalyticsUserFilter
            value={localFilters.users ?? []}
            onChange={handleUsersChange}
            userOptions={userOptions}
            isLoadingOptions={isLoadingUsers}
          />
        </FilterAccordionItem>
      </div>
    </div>
  )
}

export default AnalyticsFilters
