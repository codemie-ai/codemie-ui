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

import { useState, useCallback, useMemo } from 'react'

import { AnalyticsQueryParams } from '@/types/analytics'
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'
import { cleanObject } from '@/utils/helpers'

import { DEFAULT_FILTERS } from '../constants'

/**
 * Centralized hook for managing analytics filters
 * Handles getting saved filters, syncing with URL query params, and localStorage
 */
export const useAnalyticsFilters = () => {
  const getFilterKey = useCallback(() => FILTER_ENTITY.ANALYTICS, [])

  const getSavedFilters = useCallback(() => {
    return getFilters<AnalyticsQueryParams>(getFilterKey())
  }, [getFilterKey])

  const [filterState, setFilterState] = useState<AnalyticsQueryParams>(getSavedFilters())

  // Merge saved filters with default state to ensure all keys exist
  const filters = useMemo(() => {
    const result: AnalyticsQueryParams = {
      time_period: filterState.time_period,
      start_date: filterState.start_date,
      end_date: filterState.end_date,
      // Only include arrays if they have values, otherwise undefined
      users: filterState.users?.length ? filterState.users : undefined,
      projects: filterState.projects?.length ? filterState.projects : undefined,
    }
    return result
  }, [filterState])

  // Handle filter changes
  const handleFilterChange = useCallback(
    async (newFilters: AnalyticsQueryParams) => {
      const cleanFilters = cleanObject(newFilters)

      try {
        // Check if all filter values are empty (reset scenario)
        const isReset = Object.entries(newFilters).every(([_key, value]) => {
          if (Array.isArray(value)) return value.length === 0
          if (typeof value === 'string') return value === ''
          if (value === null || value === undefined) return true
          return false
        })

        const filtersToApply = isReset ? DEFAULT_FILTERS : cleanFilters

        if (isReset) {
          setFilters(getFilterKey(), DEFAULT_FILTERS)
          setFilterState(DEFAULT_FILTERS)
        } else {
          setFilters(getFilterKey(), filtersToApply)
          setFilterState(filtersToApply as AnalyticsQueryParams)
        }
      } catch (error) {
        console.error('Error applying filters:', error)
      }
    },
    [getFilterKey]
  )

  return {
    filters,
    handleFilterChange,
  }
}
