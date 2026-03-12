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

import { KATA_FILTER_INITIAL_STATE } from '@/constants/katas'
import { KataFilters } from '@/types/entity/kata'
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'
import { cleanObject } from '@/utils/helpers'

/**
 * Centralized hook for managing kata filters
 * Handles getting saved filters and providing filter change callback
 */
export const useKataFilters = () => {
  const getFilterKey = useCallback(() => FILTER_ENTITY.KATAS, [])

  const getSavedFilters = useCallback(() => {
    return getFilters<KataFilters>(getFilterKey())
  }, [getFilterKey])

  const [filterState, setFilterState] = useState(getSavedFilters())

  // Merge saved filters with initial state to ensure all keys exist
  const filters = useMemo(() => {
    return Object.keys(KATA_FILTER_INITIAL_STATE).reduce((result, key) => {
      if (filterState[key] !== undefined) {
        result[key] = filterState[key]
      } else {
        result[key] = KATA_FILTER_INITIAL_STATE[key]
      }
      return result
    }, {} as KataFilters)
  }, [filterState])

  // Handle filter changes
  const handleFilterChange = useCallback(
    async (newFilters: Record<string, unknown>) => {
      const cleanFilters = cleanObject(newFilters)

      try {
        // Check if all filter values are empty (reset scenario)
        const isReset = Object.values(newFilters).every((value) => {
          if (Array.isArray(value)) return value.length === 0
          if (typeof value === 'string') return value === ''
          if (value === null) return true
          return !value
        })

        const filtersToApply = isReset ? KATA_FILTER_INITIAL_STATE : cleanFilters

        if (isReset) {
          setFilters(getFilterKey(), {})
          setFilterState({} as KataFilters)
        } else {
          setFilters(getFilterKey(), filtersToApply)
          setFilterState(filtersToApply as KataFilters)
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
