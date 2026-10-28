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

import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

import {
  isMarketplaceStatusFilter,
  isPendingSort,
  isPendingWaitTime,
  type MarketplaceStatusFilter,
} from '../filterVocabulary'
import { buildSearch, useUrlFilterSync } from './useUrlFilterSync'

const DEBOUNCE_MS = 300

/** URL params this hook owns. Anything else in the URL is left untouched. */
const OWNED_KEYS = ['category', 'wait_time', 'sort_by', 'status', 'search'] as const

/**
 * The review queue's client-side filter state. No `gateResult` field here: the
 * Gate-result column and filter were removed on purpose in EPMCDME-14999 (the
 * Pending→Assistants rename), so a field with no control or logic behind it
 * would be worse than none (EPMCDME-14234, CR-005/CR-006).
 */
export interface AssistantsFilters {
  search: string
  category: string
  waitTime: string
  sortBy: string
  status: MarketplaceStatusFilter
}

export const INITIAL_FILTERS: AssistantsFilters = {
  search: '',
  category: '',
  waitTime: '',
  sortBy: '',
  status: 'PENDING',
}

const serialize = (filters: AssistantsFilters, current: string): string => {
  return buildSearch(current, OWNED_KEYS, {
    search: filters.search,
    category: filters.category,
    wait_time: filters.waitTime,
    sort_by: filters.sortBy,
    status: filters.status !== 'ALL' && filters.status,
  })
}

const hydrate = (search: string): AssistantsFilters => {
  const params = new URLSearchParams(search)
  const rawWaitTime = params.get('wait_time') ?? ''
  const rawSortBy = params.get('sort_by') ?? ''
  const rawStatus = params.get('status') ?? ''
  return {
    search: params.get('search') ?? '',
    category: params.get('category') ?? INITIAL_FILTERS.category,
    waitTime: isPendingWaitTime(rawWaitTime) ? rawWaitTime : INITIAL_FILTERS.waitTime,
    sortBy: isPendingSort(rawSortBy) ? rawSortBy : INITIAL_FILTERS.sortBy,
    status: isMarketplaceStatusFilter(rawStatus) ? rawStatus : 'ALL',
  }
}

/**
 * Persists the assistants filters in the URL, including the marketplace status filter.
 *
 * Owns: `category`, `wait_time`, `sort_by`, `status` and `search`.
 * Unrelated URL params are left untouched.
 *
 * The echo guard prevents URL → state → URL ping-pong.
 * Write-back is debounced to avoid a history entry per character.
 */
export const useAssistantsFilters = (): {
  filters: AssistantsFilters
  setFilters: (f: AssistantsFilters) => void
} => {
  const [searchParams] = useSearchParams()
  const search = searchParams.toString()
  const searchRef = useRef(search)
  searchRef.current = search

  const { acceptUrl, writeDebounced } = useUrlFilterSync()

  // Derive current filter values from the URL on every render.
  const filters: AssistantsFilters = hydrate(search)

  // --- store → URL: debounced, echo-guarded --------------------------------
  const setFilters = useCallback(
    (next: AssistantsFilters) =>
      writeDebounced(() => serialize(next, searchRef.current), DEBOUNCE_MS),
    [writeDebounced]
  )

  // --- URL → state: sync on every URL change (echo-guarded) ----------------
  useEffect(() => {
    acceptUrl(search)
  }, [search, acceptUrl])

  return { filters, setFilters }
}
