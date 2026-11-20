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

import { Pagination } from '@/types/common'
import {
  ActivityEventListItem,
  ActivityEventProjectMetadata,
  ProjectActivityEventsParams,
  ProjectActivityEventsResponse,
  mapActivityEventPagination,
} from '@/types/entity/projectActivityEvent'
import api from '@/utils/api'

const DEFAULT_LIMIT = 50

export interface ProjectActivityEventsStore {
  events: ActivityEventListItem[]
  pagination: Pagination
  loading: boolean
  error: string | null
  metadata: ActivityEventProjectMetadata | null
  metadataLoading: boolean
  metadataError: string | null
  listEvents: (projectInstanceId: string, params?: ProjectActivityEventsParams) => Promise<void>
  loadMetadata: (projectInstanceId: string) => Promise<void>
}

export function createProjectActivityEventsStore(): ProjectActivityEventsStore {
  let activeAbortController: AbortController | null = null
  let activeMetadataAbortController: AbortController | null = null

  return proxy<ProjectActivityEventsStore>({
    events: [],
    pagination: { page: 0, perPage: DEFAULT_LIMIT, totalPages: 0, totalCount: 0 },
    loading: false,
    error: null,
    metadata: null,
    metadataLoading: false,
    metadataError: null,

    async listEvents(projectInstanceId: string, params: ProjectActivityEventsParams = {}) {
      activeAbortController?.abort()
      const controller = new AbortController()
      activeAbortController = controller

      this.loading = true
      this.error = null
      try {
        const limit = params.limit ?? DEFAULT_LIMIT
        const offset = params.offset ?? 0
        const queryParams: Record<string, string | string[]> = {
          limit: String(limit),
          offset: String(offset),
          sort_dir: params.sort_dir ?? 'desc',
        }
        if (params.category?.length) queryParams.category = params.category
        if (params.domain?.length) queryParams.domain = params.domain
        if (params.event_type?.length) queryParams.event_type = params.event_type
        if (params.actor_id) queryParams.actor_id = params.actor_id
        if (params.from) queryParams.from = params.from
        if (params.to) queryParams.to = params.to

        const response = await api.get(
          `v1/projects/${encodeURIComponent(projectInstanceId)}/activity-events`,
          {
            params: queryParams,
            skipErrorHandling: true,
            signal: controller.signal,
          }
        )
        const data = (await response.json()) as ProjectActivityEventsResponse
        if (controller.signal.aborted) return
        this.events = data.data ?? []
        this.pagination = mapActivityEventPagination(data.pagination)
      } catch (error: any) {
        // Detect supersession from the controller itself rather than `error.name`: a real
        // fetch abort rejects with a DOMException that api.ts's error-wrapping (anything
        // failing `instanceof Error`) turns into a plain `Error`, losing the `AbortError`
        // name before it ever reaches this catch.
        if (controller.signal.aborted) return
        this.error =
          error?.parsedError?.message ?? error?.message ?? 'Failed to load activity events'
      } finally {
        if (!controller.signal.aborted) this.loading = false
      }
    },

    async loadMetadata(projectInstanceId: string) {
      activeMetadataAbortController?.abort()
      const controller = new AbortController()
      activeMetadataAbortController = controller

      this.metadataLoading = true
      this.metadataError = null
      try {
        const response = await api.get(
          `v1/projects/${encodeURIComponent(projectInstanceId)}/activity-events/metadata`,
          {
            skipErrorHandling: true,
            signal: controller.signal,
          }
        )
        const data = (await response.json()) as ActivityEventProjectMetadata
        if (controller.signal.aborted) return
        this.metadata = data
      } catch (error: any) {
        if (controller.signal.aborted) return
        this.metadataError =
          error?.parsedError?.message ?? error?.message ?? 'Failed to load activity metadata'
      } finally {
        if (!controller.signal.aborted) this.metadataLoading = false
      }
    },
  })
}
