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
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store/user'
import { AnalyticsQueryParams, TimePeriod } from '@/types/analytics'
import {
  FILTER_ENTITY,
  FilterKeys,
  getFilterStorageKey,
  getFilters,
  getFiltersFromUrl,
  setFilters,
} from '@/utils/filters'
import { cleanObject } from '@/utils/helpers'
import storage from '@/utils/storage'

import { DEFAULT_FILTERS } from '../constants'

/** Narrows URL and localStorage reads to analytics-only keys. */
const ANALYTICS_FILTER_KEYS: FilterKeys = {
  simple: ['time_period', 'start_date', 'end_date'],
  boolean: [],
  multiple: ['users', 'projects'],
}

const isValidTimePeriod = (v: unknown): v is TimePeriod =>
  Object.values(TimePeriod).includes(v as TimePeriod)

/** The calendar-date half only. Kept flat so the expression stays trivial. */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Accepts a calendar date with an optional time component. DatePicker is rendered
 * with `showTime` and emits full ISO timestamps (`2024-01-01T00:00:00Z`), so a
 * date-only pattern would discard every value the date filters actually produce.
 *
 * Splitting on `T` lets the date half be matched by a flat pattern while
 * `Date.parse` validates the time half and rejects out-of-range values such as
 * `2024-99-99`. Anchoring the date half still refuses trailing garbage, which a
 * `Date.parse` check alone would let through (`2024-01-01 (note)` parses fine).
 */
const isValidISODate = (v: unknown): v is string => {
  if (typeof v !== 'string') return false
  const parts = v.split('T')
  return parts.length <= 2 && ISO_DATE_ONLY.test(parts[0]) && !Number.isNaN(Date.parse(v))
}

/**
 * Per-field sanitization (AC 6): keeps valid siblings, drops invalid fields.
 * An empty result is a legitimate outcome — it means "no filters", which the
 * API answers with its own default window.
 */
const sanitizeUrlFilters = (f: AnalyticsQueryParams): AnalyticsQueryParams => {
  const result: AnalyticsQueryParams = {}
  if (f.time_period !== undefined && isValidTimePeriod(f.time_period))
    result.time_period = f.time_period
  if (f.start_date !== undefined && isValidISODate(f.start_date)) result.start_date = f.start_date
  if (f.end_date !== undefined && isValidISODate(f.end_date)) result.end_date = f.end_date
  if (f.users !== undefined) result.users = f.users
  if (f.projects !== undefined) result.projects = f.projects
  return result
}

/**
 * Pure synchronous state resolver — no side effects.
 * Runs in the useState lazy initializer so the first render already carries the
 * URL/stored filters instead of briefly fetching with a different set.
 * All writes (URL and localStorage) happen exclusively in the useEffect below.
 */
function resolveInitialFilters(): AnalyticsQueryParams {
  const userId = userStore.user?.userId
  if (!userId) return DEFAULT_FILTERS
  const urlFilters = getFiltersFromUrl(ANALYTICS_FILTER_KEYS) as AnalyticsQueryParams
  const hasUrlFilters = Object.keys(urlFilters).length > 0
  if (hasUrlFilters) return sanitizeUrlFilters(urlFilters)
  return getFilters<AnalyticsQueryParams>(FILTER_ENTITY.ANALYTICS, ANALYTICS_FILTER_KEYS)
}

export const useAnalyticsFilters = () => {
  const [searchParams] = useSearchParams()
  // String dep prevents effect re-firing when React Router re-issues an identical URL string.
  const searchStr = searchParams.toString()
  const { user } = useSnapshot(userStore)
  const [filterState, setFilterState] = useState<AnalyticsQueryParams>(resolveInitialFilters)

  useEffect(() => {
    if (!user?.userId) return

    const urlFilters = getFiltersFromUrl(ANALYTICS_FILTER_KEYS) as AnalyticsQueryParams
    const hasUrlFilters = Object.keys(urlFilters).length > 0

    let resolved: AnalyticsQueryParams
    if (hasUrlFilters) {
      const sanitized = sanitizeUrlFilters(urlFilters)
      const wasSanitized = !isEqual(sanitized, urlFilters)
      resolved = sanitized

      if (wasSanitized) {
        // Malformed values corrected: rewrite URL via setFilters.
        // The param-reorder-loop concern does not apply because URL content
        // is genuinely changing; the next effect pass will find no sanitization
        // needed and drop into the storage.put path below.
        setFilters(FILTER_ENTITY.ANALYTICS, resolved)
      } else {
        // URL already valid: write only to localStorage.
        // Skipping updateUrlWithFilters prevents the param-reorder loop
        // (?time_period=x&tab=y → ?tab=y&time_period=x → effect re-fires).
        storage.put(user.userId, getFilterStorageKey(FILTER_ENTITY.ANALYTICS), resolved)
      }
    } else {
      // No URL filter params: restore whatever the user last chose, if anything.
      resolved = getFilters<AnalyticsQueryParams>(FILTER_ENTITY.ANALYTICS, ANALYTICS_FILTER_KEYS)
      setFilters(FILTER_ENTITY.ANALYTICS, resolved) // writes URL + localStorage
    }

    // Stability guard: skip re-render when derived values equal current state.
    setFilterState((prev) => (isEqual(prev, resolved) ? prev : resolved))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, searchStr])

  const filters = useMemo(
    (): AnalyticsQueryParams => ({
      time_period: filterState.time_period,
      start_date: filterState.start_date,
      end_date: filterState.end_date,
      users: filterState.users?.length ? filterState.users : undefined,
      projects: filterState.projects?.length ? filterState.projects : undefined,
    }),
    [filterState]
  )

  const handleFilterChange = useCallback(async (newFilters: AnalyticsQueryParams) => {
    const cleanFilters = cleanObject(newFilters)
    const isReset = Object.entries(newFilters).every(([_key, value]) => {
      if (Array.isArray(value)) return value.length === 0
      if (typeof value === 'string') return value === ''
      return value === null || value === undefined
    })
    const filtersToApply = isReset ? DEFAULT_FILTERS : (cleanFilters as AnalyticsQueryParams)
    try {
      setFilters(FILTER_ENTITY.ANALYTICS, filtersToApply)
      setFilterState(filtersToApply)
    } catch (error) {
      console.error('Error applying filters:', error)
    }
  }, [])

  return { filters, handleFilterChange }
}
