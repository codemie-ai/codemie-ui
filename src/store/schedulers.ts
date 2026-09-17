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

import { IntegrationOption } from '@/constants/integration'
import { Pagination, PaginationBE } from '@/types/common'
import api, { DEFAULT_ERROR_MESSAGE } from '@/utils/api'
import toaster from '@/utils/toaster'

export type SchedulerResourceType = 'Assistant' | 'Workflow' | 'Datasource'
export type SchedulerStatus = 'enabled' | 'disabled'
export type SchedulerLastRunStatus = 'completed' | 'failed' | 'running' | 'never'

export interface SchedulerResource {
  id: string
  name: string
  type: SchedulerResourceType
}

export interface SchedulerProject {
  id: string
  name: string
}

export interface SchedulerSchedule {
  cron: string
  description: string
  timezone: string
  nextRunAt: string | null
}

export interface SchedulerLastRun {
  id: string
  status: SchedulerLastRunStatus
  startedAt: string
}

export interface Scheduler {
  id: string
  name: string
  resource: SchedulerResource
  project: SchedulerProject
  schedule: SchedulerSchedule
  isEnabled: boolean
  lastRun: SchedulerLastRun | null
}

export interface SchedulersQuery {
  page?: number
  pageSize?: number
  search?: string
  resourceType?: SchedulerResourceType
  projectId?: string
  resourceId?: string
  status?: SchedulerStatus
  lastRunStatus?: SchedulerLastRunStatus
  ownerType?: IntegrationOption
}

interface SchedulersResponse {
  items: Scheduler[]
  pagination: PaginationBE
}

export interface SchedulerFilterOptions {
  resources: SchedulerResource[]
  projects: SchedulerProject[]
}

interface SchedulerFilterOptionsResponse {
  resources: SchedulerResource[]
  projects: SchedulerProject[]
}

const DEFAULT_PAGE_SIZE = 10

const defaultPagination: Pagination = {
  page: 0,
  perPage: DEFAULT_PAGE_SIZE,
  totalPages: 0,
  totalCount: 0,
}

interface SchedulersStoreType {
  schedulers: Scheduler[]
  pagination: Pagination
  loading: boolean
  filterOptions: SchedulerFilterOptions

  fetchSchedulers: (query?: SchedulersQuery) => Promise<void>
  fetchFilterOptions: () => Promise<void>
  toggleScheduler: (id: string, enabled: boolean) => Promise<void>
  deleteScheduler: (id: string) => Promise<void>
}

export const schedulersStore = proxy<SchedulersStoreType>({
  schedulers: [],
  pagination: { ...defaultPagination },
  loading: false,
  filterOptions: { resources: [], projects: [] },

  async fetchSchedulers(query: SchedulersQuery = {}) {
    schedulersStore.loading = true
    try {
      const params: Record<string, string | number> = {
        page: query.page ?? 0,
        pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
      }
      if (query.search) params.search = query.search
      if (query.resourceType) params.resourceType = query.resourceType
      if (query.projectId) params.projectId = query.projectId
      if (query.resourceId) params.resourceId = query.resourceId
      if (query.status) params.status = query.status
      if (query.lastRunStatus) params.lastRunStatus = query.lastRunStatus
      if (query.ownerType) params.ownerType = query.ownerType

      const response = await api.get('/v1/schedulers', { params })
      const data = (await response.json()) as SchedulersResponse

      schedulersStore.schedulers = data.items
      schedulersStore.pagination = {
        page: data.pagination.page,
        perPage: data.pagination.per_page,
        totalPages: data.pagination.pages,
        totalCount: data.pagination.total,
      }
    } catch {
      toaster.error(DEFAULT_ERROR_MESSAGE)
    } finally {
      schedulersStore.loading = false
    }
  },

  async fetchFilterOptions() {
    try {
      const response = await api.get('/v1/schedulers/filter-options')
      const data = (await response.json()) as SchedulerFilterOptionsResponse
      schedulersStore.filterOptions = {
        resources: data.resources ?? [],
        projects: data.projects ?? [],
      }
    } catch {
      toaster.error(DEFAULT_ERROR_MESSAGE)
    }
  },

  async toggleScheduler(id: string, enabled: boolean) {
    try {
      const response = await api.patch(`/v1/schedulers/${id}`, { isEnabled: enabled })
      const updated = (await response.json()) as Scheduler
      const idx = schedulersStore.schedulers.findIndex((s) => s.id === id)
      if (idx !== -1) {
        schedulersStore.schedulers[idx] = updated
      }
    } catch {
      toaster.error(DEFAULT_ERROR_MESSAGE)
    }
  },

  async deleteScheduler(id: string) {
    try {
      await api.delete(`v1/settings/user/${id}`)
      schedulersStore.schedulers = schedulersStore.schedulers.filter((s) => s.id !== id)
    } catch (err) {
      toaster.error(DEFAULT_ERROR_MESSAGE)
      throw err
    }
  },
})
