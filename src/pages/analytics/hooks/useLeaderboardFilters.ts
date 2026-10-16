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

import pick from 'lodash/pick'
import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store/user'
import type { LeaderboardEntriesParams } from '@/types/analytics'
import { FILTER_ENTITY, getFilterStorageKey } from '@/utils/filters'
import storage from '@/utils/storage'

/** View, season, snapshot and paging are deliberately not persisted. */
const PERSISTED_KEYS = [
  'tier',
  'project',
  'search',
  'intent',
  'cli_only',
  'sort_by',
  'sort_order',
] as const

const STORAGE_KEY = getFilterStorageKey(FILTER_ENTITY.ANALYTICS_LEADERBOARD)

/**
 * Leaderboard filter state persisted to localStorage only — never to the URL.
 * A stored object is used as-is, without merging `defaults`, so a filter or sort the
 * user cleared stays cleared; `defaults` apply only when nothing is stored.
 */
export const useLeaderboardFilters = (defaults: LeaderboardEntriesParams) => {
  const userId = useSnapshot(userStore).user?.userId
  const [filters, setFilters] = useState<LeaderboardEntriesParams>(() => {
    const stored = userId
      ? storage.getObject<LeaderboardEntriesParams | null>(userId, STORAGE_KEY, null)
      : null
    return stored ? pick(stored, PERSISTED_KEYS) : defaults
  })

  useEffect(() => {
    if (userId) storage.put(userId, STORAGE_KEY, pick(filters, PERSISTED_KEYS))
  }, [userId, filters])

  return [filters, setFilters] as const
}
