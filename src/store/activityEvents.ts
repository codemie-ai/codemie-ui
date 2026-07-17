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

import { proxy } from 'valtio'

import { Pagination, PaginatedResponse } from '@/types/common'
import {
  ActivityEvent,
  ActivityEventFilterOptions,
  ActivityEventListParams,
} from '@/types/entity/activityEvent'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

const DEFAULT_LIMIT = 50

interface ActivityEventsStore {
  events: ActivityEvent[]
  pagination: Pagination
  loading: boolean
  filterOptions: ActivityEventFilterOptions | null
  filterOptionsLoading: boolean
  listEvents: (params?: ActivityEventListParams) => Promise<void>
  loadFilterOptions: () => Promise<void>
}

export const activityEventsStore = proxy<ActivityEventsStore>({
  events: [],
  pagination: {
    page: 0,
    perPage: DEFAULT_LIMIT,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  filterOptions: null,
  filterOptionsLoading: false,

  async listEvents(params: ActivityEventListParams = {}) {
    this.loading = true
    try {
      const limit = params.limit ?? DEFAULT_LIMIT
      const offset = params.offset ?? 0

      const queryParams: Record<string, string | string[]> = {
        limit: String(limit),
        offset: String(offset),
      }
      if (params.domain?.length) queryParams.domain = params.domain
      if (params.event_type?.length) queryParams.event_type = params.event_type
      if (params.entity_type?.length) queryParams.entity_type = params.entity_type
      if (params.entity_id) queryParams.entity_id = params.entity_id
      if (params.actor_id) queryParams.actor_id = params.actor_id
      if (params.from) queryParams.from = params.from
      if (params.to) queryParams.to = params.to
      if (params.sort_dir) queryParams.sort_dir = params.sort_dir

      const response = await api.get('v1/admin/activity-events', {
        params: queryParams,
        skipErrorHandling: true,
      })
      const data = (await response.json()) as PaginatedResponse<ActivityEvent>

      this.events = data.data ?? []
      const total = data.pagination?.total ?? 0
      const perPage = data.pagination?.per_page ?? limit
      this.pagination = {
        page: data.pagination?.page ?? 0,
        perPage,
        totalPages: Math.ceil(total / perPage),
        totalCount: total,
      }
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to load activity events'
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async loadFilterOptions() {
    if (this.filterOptions) return
    this.filterOptionsLoading = true
    try {
      const response = await api.get('v1/admin/activity-events/filter-options', {
        skipErrorHandling: true,
      })
      this.filterOptions = (await response.json()) as ActivityEventFilterOptions
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to load filter options'
      toaster.error(msg)
    } finally {
      this.filterOptionsLoading = false
    }
  },
})
