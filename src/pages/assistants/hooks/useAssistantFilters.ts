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

import { useState, useEffect, useCallback, useMemo } from 'react'

import { FILTER_INITIAL_STATE } from '@/constants/assistants'
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'
import { cleanObject } from '@/utils/helpers'

interface UseAssistantFiltersProps {
  scope: string
}

export interface AssistantFilters extends Record<string, unknown> {
  search: string
  project: string[]
  created_by: string
  is_global: boolean | null
  shared: boolean | null
  categories: string[]
}

/**
 * Centralized hook for managing assistant filters
 * Handles getting saved filters, reacting to scope changes, and providing filter change callback
 */
export const useAssistantFilters = ({ scope }: UseAssistantFiltersProps) => {
  const getFilterKey = useCallback(() => `${FILTER_ENTITY.ASSISTANTS}.${scope}`, [scope])

  const getSavedFilters = useCallback(() => {
    return getFilters<AssistantFilters>(getFilterKey())
  }, [getFilterKey])

  const [filterState, setFilterState] = useState(getSavedFilters())

  // Merge saved filters with initial state to ensure all keys exist
  const filters = useMemo(() => {
    const result = Object.keys(FILTER_INITIAL_STATE).reduce((result, key) => {
      if (filterState[key] !== undefined) {
        result[key] = filterState[key]
      } else {
        result[key] = FILTER_INITIAL_STATE[key]
      }
      return result
    }, {} as AssistantFilters)
    result[scope] = null
    return result
  }, [filterState])

  // React to scope changes - reload filters when scope changes
  useEffect(() => {
    const newFilters = getSavedFilters()
    setFilterState(newFilters)
  }, [scope, getSavedFilters])

  // Handle filter changes
  const handleFilterChange = useCallback(
    async (newFilters: Record<string, unknown>) => {
      const cleanFilters = cleanObject(newFilters)

      try {
        // Check if all filter values are empty (reset scenario)
        const isReset = Object.values(newFilters).every((value) => {
          if (Array.isArray(value)) return value.length === 0
          if (typeof value === 'string') return value === ''
          if (typeof value === 'boolean') return false
          if (value === null) return true
          return !value
        })

        const filtersToApply = isReset ? FILTER_INITIAL_STATE : cleanFilters

        if (isReset) {
          setFilters(getFilterKey(), {})
          setFilterState({} as AssistantFilters)
        } else {
          setFilters(getFilterKey(), filtersToApply)
          setFilterState(filtersToApply as AssistantFilters)
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
