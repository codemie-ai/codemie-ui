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

import { Pagination, PaginationBE } from '@/types/common'
import api, { DEFAULT_ERROR_MESSAGE } from '@/utils/api'
import toaster from '@/utils/toaster'

export type SchedulerRunStatus = 'completed' | 'failed' | 'running' | 'cancelled'
export type SchedulerRunTrigger = 'scheduled' | 'manual'
export type SchedulerResourceType = 'Assistant' | 'Workflow' | 'Datasource'

export interface SchedulerRun {
  id: string
  status: SchedulerRunStatus
  trigger: SchedulerRunTrigger
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  executionId: string | null
}

export interface SchedulerRunLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  step: string
}

export interface SchedulerRunDetails {
  id: string
  scheduler: { id: string; name: string }
  resource: { id: string; name: string; type: SchedulerResourceType }
  project: { id: string; name: string }
  status: SchedulerRunStatus
  trigger: SchedulerRunTrigger
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  executionId: string | null
  schedulerConfig: {
    cron: string
    humanReadableSchedule: string
    timezone: string
  }
  input: Record<string, unknown> | null
  result: { available: boolean; content?: string }
  logs: SchedulerRunLogEntry[]
  metrics: { inputTokens: number; outputTokens: number; cost: number } | null
  conversationId: string | null
  workflowExecutionId: string | null
  error?: { code: string; message: string; details?: string }
}

export interface SchedulerRunStats {
  total: number
  completed: number
  failed: number
  running: number
  cancelled: number
  successRate: number
  averageDurationMs: number
}

export interface SchedulerRunsQuery {
  schedulerId: string
  page?: number
  pageSize?: number
  status?: SchedulerRunStatus | SchedulerRunStatus[]
  dateFrom?: string
  dateTo?: string
}

export interface SchedulerStatsQuery {
  schedulerId: string
  dateFrom?: string
  dateTo?: string
}

interface SchedulerRunsResponse {
  items: SchedulerRun[]
  pagination: PaginationBE
}

const DEFAULT_PAGE_SIZE = 10

const defaultPagination: Pagination = {
  page: 0,
  perPage: DEFAULT_PAGE_SIZE,
  totalPages: 0,
  totalCount: 0,
}

interface SchedulerRunsStoreType {
  runs: SchedulerRun[]
  pagination: Pagination
  stats: SchedulerRunStats | null
  loading: boolean
  statsLoading: boolean

  fetchRuns: (query: SchedulerRunsQuery) => Promise<void>
  fetchStats: (query: SchedulerStatsQuery) => Promise<void>
  fetchRunDetails: (runId: string) => Promise<SchedulerRunDetails>
  deleteRun: (runId: string) => Promise<void>
}

export const schedulerRunsStore = proxy<SchedulerRunsStoreType>({
  runs: [],
  pagination: { ...defaultPagination },
  stats: null,
  loading: false,
  statsLoading: false,

  async fetchRuns(query: SchedulerRunsQuery) {
    schedulerRunsStore.loading = true
    try {
      const params: Record<string, string | number> = {
        schedulerId: query.schedulerId,
        page: query.page ?? 0,
        pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
      }
      if (query.status)
        params.status = Array.isArray(query.status) ? query.status.join(',') : query.status
      if (query.dateFrom) params.dateFrom = query.dateFrom
      if (query.dateTo) params.dateTo = query.dateTo

      const response = await api.get('/v1/scheduler-runs', { params })
      const data = (await response.json()) as SchedulerRunsResponse

      schedulerRunsStore.runs = data.items
      schedulerRunsStore.pagination = {
        page: data.pagination.page,
        perPage: data.pagination.per_page,
        totalPages: data.pagination.pages,
        totalCount: data.pagination.total,
      }
    } catch {
      toaster.error(DEFAULT_ERROR_MESSAGE)
    } finally {
      schedulerRunsStore.loading = false
    }
  },

  async fetchRunDetails(runId: string): Promise<SchedulerRunDetails> {
    const response = await api.get(`/v1/scheduler-runs/${runId}`)
    return (await response.json()) as SchedulerRunDetails
  },

  async deleteRun(runId: string): Promise<void> {
    await api.delete(`/v1/scheduler-runs/${runId}`)
  },

  async fetchStats(query: SchedulerStatsQuery) {
    schedulerRunsStore.statsLoading = true
    try {
      const params: Record<string, string> = {
        schedulerId: query.schedulerId,
      }
      if (query.dateFrom) params.dateFrom = query.dateFrom
      if (query.dateTo) params.dateTo = query.dateTo

      const response = await api.get('/v1/scheduler-runs/stats', { params })
      schedulerRunsStore.stats = (await response.json()) as SchedulerRunStats
    } catch {
      toaster.error(DEFAULT_ERROR_MESSAGE)
    } finally {
      schedulerRunsStore.statsLoading = false
    }
  },
})
