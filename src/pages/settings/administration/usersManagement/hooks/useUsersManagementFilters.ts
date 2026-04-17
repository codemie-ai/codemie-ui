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

import {
  FILTER_INITIAL_STATE,
  PlatformRole,
  UsersManagementFilters,
} from '@/pages/settings/administration/usersManagement/constants'
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'
import { cleanObject } from '@/utils/helpers'

const VALID_PLATFORM_ROLES: PlatformRole[] = ['user', 'platform_admin', 'admin']

export const useUsersManagementFilters = () => {
  const getSavedFilters = useCallback(() => {
    const saved = getFilters<UsersManagementFilters>(FILTER_ENTITY.USERS_MANAGEMENT)
    if (saved.platform_role != null && !VALID_PLATFORM_ROLES.includes(saved.platform_role)) {
      saved.platform_role = null
    }
    return saved
  }, [])

  const [filterState, setFilterState] = useState(getSavedFilters())

  const filters = useMemo(() => {
    const result = Object.keys(FILTER_INITIAL_STATE).reduce((result, key) => {
      if (filterState[key] === undefined) result[key] = FILTER_INITIAL_STATE[key]
      else result[key] = filterState[key]

      return result
    }, {} as UsersManagementFilters)
    return result
  }, [filterState])

  const handleFilterChange = useCallback((newFilters: UsersManagementFilters) => {
    const cleanFilters = cleanObject(newFilters)

    try {
      const isReset = Object.values(newFilters).every((value) => {
        if (Array.isArray(value)) return value.length === 0
        if (typeof value === 'string') return value === ''
        if (typeof value === 'boolean') return false
        if (value === null) return true
        return !value
      })

      const filtersToApply = isReset ? FILTER_INITIAL_STATE : cleanFilters

      if (isReset) {
        setFilters(FILTER_ENTITY.USERS_MANAGEMENT, {})
        setFilterState({} as UsersManagementFilters)
      } else {
        setFilters(FILTER_ENTITY.USERS_MANAGEMENT, filtersToApply)
        setFilterState(filtersToApply as UsersManagementFilters)
      }
    } catch (error) {
      console.error('Error applying filters:', error)
    }
  }, [])

  return {
    filters,
    handleFilterChange,
  }
}
