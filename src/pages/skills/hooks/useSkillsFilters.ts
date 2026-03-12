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

import { SKILL_FILTER_INITIAL_STATE } from '@/constants/skills'
import { SkillsFilters } from '@/types/entity/skill'
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'
import { cleanObject } from '@/utils/helpers'

interface UseSkillsFiltersProps {
  scope: string
}

/**
 * Centralized hook for managing skills filters
 * Handles getting saved filters, reacting to scope changes, and providing filter change callback
 */
export const useSkillsFilters = ({ scope }: UseSkillsFiltersProps) => {
  const getFilterKey = useCallback(() => `${FILTER_ENTITY.SKILLS}.${scope}`, [scope])

  const getSavedFilters = useCallback(() => {
    return getFilters<SkillsFilters>(getFilterKey())
  }, [getFilterKey])

  const [filterState, setFilterState] = useState(getSavedFilters())

  // Merge saved filters with initial state to ensure all keys exist
  const filters = useMemo(() => {
    return Object.keys(SKILL_FILTER_INITIAL_STATE).reduce((acc, key) => {
      if (filterState[key] !== undefined) {
        acc[key] = filterState[key]
      } else {
        acc[key] = SKILL_FILTER_INITIAL_STATE[key]
      }
      return acc
    }, {} as SkillsFilters)
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
          if (value === null) return true
          return !value
        })

        if (isReset) {
          // Reset to initial state (not empty object) for consistent filter values
          setFilters(getFilterKey(), SKILL_FILTER_INITIAL_STATE)
          setFilterState(SKILL_FILTER_INITIAL_STATE as SkillsFilters)
        } else {
          setFilters(getFilterKey(), cleanFilters)
          setFilterState(cleanFilters as SkillsFilters)
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
