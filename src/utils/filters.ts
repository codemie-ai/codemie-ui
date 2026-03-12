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

import isEqual from 'lodash/isEqual'

import { parseSearchParams, replace } from '@/hooks/useVueRouter'
import { userStore } from '@/store/user'

import storage from './storage'

const FILTERS_PREFIX = 'filters'

export enum FILTER_ENTITY {
  ASSISTANTS = 'assistants',
  SKILLS = 'skills',
  WORKFLOWS = 'workflows',
  DATASOURCES = 'datasources',
  KATAS = 'katas',
  USER_SETTINGS = 'user_settings',
  PROJECT_SETTINGS = 'project_settings',
  ANALYTICS = 'analytics',
}

const knownFilterKeys = {
  simple: [
    'search',
    'name',
    'created_by',
    'status',
    'level',
    'author',
    'time_period',
    'start_date',
    'end_date',
  ],
  boolean: ['is_global', 'shared'],
  multiple: ['project', 'index_type', 'type', 'categories', 'roles', 'tags', 'users', 'projects'],
}
/**
 * Get filters for a specific entity, prioritizing URL filters over storage filters
 * @param entityKey - Entity key (e.g. 'assistants')
 * @returns Combined filters from URL and localStorage
 */
export const getFilters = <T extends object>(entityKey: string): T => {
  if (!entityKey) {
    throw new Error('Entity key is required for filter operations')
  }

  const userId = userStore.user?.userId
  if (!userId) return {} as T

  // Get filters from URL and storage
  const urlFilters = getFiltersFromUrl()
  const key = `${FILTERS_PREFIX}_${entityKey}`
  const storageFilters = storage.getObject<T>(userId, key)

  // Create a result object to store the combined filters
  const result = {}

  // Process all filter keys by type
  Object.entries(knownFilterKeys).forEach(([_type, keys]) => {
    keys.forEach((key) => {
      // Check if URL filter exists for this key
      const urlValue = urlFilters[key]
      const storageValue = storageFilters[key]
      if (key === 'is_global') {
        if (urlValue === undefined && storageValue === undefined) result[key] = null
        else result[key] = String(urlValue || storageValue)
        return
      }

      // Priority: URL filters > storage filters
      // If URL filter exists (not null or undefined), use it
      // Otherwise, use storage filter if it exists
      if (urlValue != null) {
        result[key] = urlValue
      } else if (storageValue != null) {
        result[key] = storageValue
      }
    })
  })

  return result as T
}

/**
 * Extract filters from URL query parameters
 * @returns Filters object from URL or empty object if not found
 */
export const getFiltersFromUrl = (): Record<string, unknown> => {
  try {
    const { hash } = window.location
    const questionMarkIndex = hash.indexOf('?')
    if (questionMarkIndex === -1) return {}

    const searchParams = new URLSearchParams(hash.substring(questionMarkIndex))

    return Object.entries(knownFilterKeys).reduce<Record<string, unknown>>(
      (filters, [type, keys]) => {
        keys.forEach((key) => {
          const values = type === 'multiple' ? searchParams.getAll(key) : searchParams.get(key)

          if (type === 'simple' && values) {
            filters[key] = values
          } else if (type === 'boolean' && values === 'true') {
            filters[key] = true
          } else if (type === 'boolean' && values === 'false') {
            filters[key] = false
          } else if (type === 'multiple' && Array.isArray(values) && values.length > 0) {
            filters[key] = values
          }
        })

        return filters
      },
      {}
    )
  } catch (error) {
    console.error('Error parsing URL filters:', error)
    return {}
  }
}

/**
 * Set filters in URL and localStorage
 * @param entityKey - Entity key (e.g. 'assistants.visible_to_user')
 * @param filters - Filters object to store
 */
export const setFilters = <T extends object>(entityKey: string, filters: T): void => {
  if (!entityKey) {
    throw new Error('Entity key is required for filter operations')
  }

  const userId = userStore.user?.userId
  if (!userId) return

  // Update URL with filters
  updateUrlWithFilters(filters)

  // Also store in localStorage as fallback
  const key = `${FILTERS_PREFIX}_${entityKey}`
  storage.put(userId, key, filters)
}

/**
 * Update URL with filters
 * @param filters - Filters object to add to URL
 */
export const updateUrlWithFilters = <T extends object>(filters: T): void => {
  try {
    const { hash } = window.location
    const questionMarkIndex = hash.indexOf('?')

    const searchParams = new URLSearchParams()

    // Always preserve tab from current URL
    if (questionMarkIndex !== -1) {
      const currentParams = new URLSearchParams(hash.substring(questionMarkIndex + 1))
      const tab = currentParams.get('tab')
      if (tab) searchParams.set('tab', tab)
    }

    // Add all filters except tab
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'tab' || value === null || value === undefined || value === '') return

      if (Array.isArray(value)) {
        if (value.length > 0) {
          value.forEach((item) => searchParams.append(key, String(item)))
        }
      } else {
        searchParams.set(key, String(value))
      }
    })

    replace({ query: parseSearchParams(searchParams) })
  } catch (error) {
    console.error('Error updating URL with filters:', error)
  }
}

/**
 * Clear filters from URL and localStorage
 * @param entityKey - Entity key (e.g. 'assistants.visible_to_user')
 */
export const clearFilters = (entityKey: string): void => {
  if (!entityKey) {
    throw new Error('Entity key is required for filter operations')
  }

  const userId = userStore.user?.userId
  if (!userId) return

  // Clear URL filters
  clearUrlFilters()

  // Clear localStorage filters
  const key = `${FILTERS_PREFIX}_${entityKey}`
  storage.remove(userId, key)
}

/**
 * Clear all filters from URL
 * Works with both React and Vue router by manipulating the URL directly
 */
const PRESERVED_PARAMS = ['tab']

export const clearUrlFilters = (): void => {
  try {
    const { hash } = window.location
    const questionMarkIndex = hash.indexOf('?')

    if (questionMarkIndex === -1) return

    const basePathInHash = hash.substring(0, questionMarkIndex)
    const existingParams = new URLSearchParams(hash.substring(questionMarkIndex + 1))
    const preservedParams = new URLSearchParams()

    // Preserve specified parameters
    PRESERVED_PARAMS.forEach((param) => {
      const value = existingParams.get(param)
      if (value) {
        preservedParams.set(param, value)
      }
    })

    const preservedString = preservedParams.toString()
    const newHash = preservedString ? `${basePathInHash}?${preservedString}` : basePathInHash

    window.history.replaceState({}, '', newHash)
  } catch (error) {
    console.error('Error clearing URL filters:', error)
  }
}

/**
 * Update filters in URL and localStorage
 * @param entityKey - Entity key (e.g. 'assistants.visible_to_user')
 * @param filterUpdates - Filters updates to apply
 */
export const updateFilters = (entityKey: string, filterUpdates: Record<string, unknown>): void => {
  if (!entityKey) {
    throw new Error('Entity key is required for filter operations')
  }

  const userId = userStore.user?.userId
  if (!userId) return

  // Get current filters (prioritizing URL filters)
  const currentFilters = getFilters(entityKey)
  const updatedFilters = { ...currentFilters, ...filterUpdates }

  // Update both URL and localStorage
  setFilters(entityKey, updatedFilters)
}

export const getChangedKeys = (
  a: Record<string, string | string[]>,
  b: Record<string, string | string[]>
): string[] => {
  return Object.keys(a).filter((key) => {
    const aVal = Array.isArray(a[key]) ? a[key] : [a[key]]
    const bVal = Array.isArray(b[key]) ? b[key] : [b[key]]
    return !isEqual(aVal, bVal)
  })
}

export const getInitialAssistantFilters = (queryFilterValues) => ({
  search: queryFilterValues.search || '',
  project: queryFilterValues.project || [],
  created_by: queryFilterValues.created_by || '',
  is_global: queryFilterValues.is_global ?? false,
  shared: queryFilterValues.shared ?? null,
  categories: queryFilterValues.categories || [],
})

export const checkEmptyFilters = (filters) => {
  return Object.values(filters).every(
    (value) =>
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
  )
}

export const createEmptyFilters = (filters) => {
  return Object.keys(filters).reduce((acc, key) => {
    if (Array.isArray(filters[key])) {
      acc[key] = []
    } else if (typeof filters[key] === 'string') {
      acc[key] = ''
    } else {
      acc[key] = null
    }
    return acc
  }, {} as Record<string, unknown>)
}

export default {
  getFilters,
  setFilters,
  clearFilters,
  updateFilters,
  getChangedKeys,
  FILTER_ENTITY,
  checkEmptyFilters,
}
