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

import type {
  CliAnalyticsActivityData,
  CliAnalyticsCostData,
  CliAnalyticsEfficiencyData,
  CliAnalyticsOverviewData,
  CliAnalyticsRepositoriesData,
  CliAnalyticsSessionsData,
  CliAnalyticsToolsData,
  CliAnalyticsUserChartsData,
  CliAnalyticsUserTableData,
  SessionDetail,
} from '@/types/cliAnalytics'
import type { ErrorDetails, ErrorResponse } from '@/types/common'
import api from '@/utils/api'

interface CliAnalyticsState {
  abortControllers: Map<string, AbortController>
  generations: Map<string, number>
  activity: CliAnalyticsActivityData | null
  tools: CliAnalyticsToolsData | null
  users: {
    charts: CliAnalyticsUserChartsData | null
    table: CliAnalyticsUserTableData | null
  } | null
  sessions: CliAnalyticsSessionsData | null
  overview: CliAnalyticsOverviewData | null
  repositories: CliAnalyticsRepositoriesData | null
  cost: CliAnalyticsCostData | null
  efficiency: CliAnalyticsEfficiencyData | null
  frameworks: string[] | null
  sessionDetail: Record<string, SessionDetail>
  loading: Record<string, boolean>
  error: Record<string, ErrorDetails | null>
  fetchActivity: (params: Record<string, unknown>) => Promise<void>
  fetchTools: (params: Record<string, unknown>) => Promise<void>
  fetchUsersCharts: (params: Record<string, unknown>) => Promise<void>
  fetchUsersTable: (params: Record<string, unknown>) => Promise<void>
  fetchSessions: (params: Record<string, unknown>) => Promise<void>
  fetchOverview: (params: Record<string, unknown>) => Promise<void>
  fetchRepositories: (params: Record<string, unknown>) => Promise<void>
  fetchCost: (params: Record<string, unknown>) => Promise<void>
  fetchEfficiency: (params: Record<string, unknown>) => Promise<void>
  fetchSessionDetail: (traceId: string) => Promise<void>
  fetchFrameworks: (params: Record<string, unknown>) => Promise<void>
}

const parseErrorResponse = (error: unknown, fallbackMessage: string): ErrorDetails => {
  if (
    error &&
    typeof error === 'object' &&
    'parsedError' in error &&
    error.parsedError &&
    typeof error.parsedError === 'object' &&
    'message' in error.parsedError
  ) {
    return error.parsedError as ErrorDetails
  }

  if (
    error &&
    typeof error === 'object' &&
    'error' in error &&
    error.error &&
    typeof error.error === 'object' &&
    'message' in error.error
  ) {
    return (error as ErrorResponse).error
  }

  if (error instanceof Error) {
    return { message: error.message || fallbackMessage }
  }

  return { message: fallbackMessage }
}

const startRequest = (key: string, store: CliAnalyticsState): AbortSignal => {
  const existing = store.abortControllers.get(key)
  if (existing) existing.abort()

  const gen = (store.generations.get(key) ?? 0) + 1
  store.generations.set(key, gen)

  const controller = new AbortController()
  store.abortControllers.set(key, controller)
  store.loading[key] = true
  store.error[key] = null

  return controller.signal
}

const fetchWithState = async <T>(
  store: CliAnalyticsState,
  key: string,
  endpoint: string,
  params?: Record<string, unknown>,
  errorMessage?: string
): Promise<T | null> => {
  const signal = startRequest(key, store)
  const requestGeneration = store.generations.get(key)

  try {
    const response = await api.get(endpoint, {
      params,
      queryParamArrayHandling: 'compact',
      skipErrorHandling: true,
      signal,
    })

    if (requestGeneration !== store.generations.get(key)) return null

    const data = (await response.json()) as T

    if (requestGeneration !== store.generations.get(key)) return null

    store.loading[key] = false

    return data
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      if (requestGeneration === store.generations.get(key)) {
        store.loading[key] = false
      }
      return null
    }

    if (requestGeneration === store.generations.get(key)) {
      store.error[key] = parseErrorResponse(error, errorMessage ?? `Failed to fetch ${key}`)
      store.loading[key] = false
    }

    return null
  }
}

export const cliAnalyticsStore = proxy<CliAnalyticsState>({
  abortControllers: new Map(),
  generations: new Map(),
  activity: null,
  tools: null,
  users: null,
  sessions: null,
  overview: null,
  repositories: null,
  cost: null,
  efficiency: null,
  frameworks: null,
  sessionDetail: {},
  loading: {},
  error: {},

  async fetchActivity(params) {
    const data = await fetchWithState<{ data: CliAnalyticsActivityData }>(
      cliAnalyticsStore,
      'activity',
      'v1/analytics/cli-analytics/activity',
      params,
      'Failed to fetch local analytics activity'
    )
    if (data) cliAnalyticsStore.activity = data.data
  },

  async fetchTools(params) {
    const data = await fetchWithState<{ data: CliAnalyticsToolsData }>(
      cliAnalyticsStore,
      'tools',
      'v1/analytics/cli-analytics/tools',
      params,
      'Failed to fetch local analytics tools'
    )
    if (data) cliAnalyticsStore.tools = data.data
  },

  async fetchUsersCharts(params) {
    const data = await fetchWithState<{ data: CliAnalyticsUserChartsData }>(
      cliAnalyticsStore,
      'usersCharts',
      'v1/analytics/cli-analytics/user-charts',
      params,
      'Failed to fetch user charts'
    )
    if (data && cliAnalyticsStore.users) {
      cliAnalyticsStore.users.charts = data.data
    } else if (data) {
      cliAnalyticsStore.users = { charts: data.data, table: null }
    }
  },

  async fetchUsersTable(params) {
    const data = await fetchWithState<{ data: CliAnalyticsUserTableData }>(
      cliAnalyticsStore,
      'usersTable',
      'v1/analytics/cli-analytics/users',
      params,
      'Failed to fetch user table'
    )
    if (data && cliAnalyticsStore.users) {
      cliAnalyticsStore.users.table = data.data
    } else if (data) {
      cliAnalyticsStore.users = { charts: null, table: data.data }
    }
  },

  async fetchSessions(params) {
    const data = await fetchWithState<{ data: CliAnalyticsSessionsData }>(
      cliAnalyticsStore,
      'sessions',
      'v1/analytics/cli-analytics/sessions',
      params,
      'Failed to fetch local analytics sessions'
    )
    if (data) cliAnalyticsStore.sessions = data.data
  },

  async fetchOverview(params) {
    const data = await fetchWithState<{ data: CliAnalyticsOverviewData }>(
      cliAnalyticsStore,
      'overview',
      'v1/analytics/cli-analytics/overview',
      params,
      'Failed to fetch local analytics overview'
    )
    if (data) cliAnalyticsStore.overview = data.data
  },

  async fetchRepositories(params) {
    const data = await fetchWithState<{ data: CliAnalyticsRepositoriesData }>(
      cliAnalyticsStore,
      'repositories',
      'v1/analytics/cli-analytics/repositories',
      params,
      'Failed to fetch local analytics repositories'
    )
    if (data) cliAnalyticsStore.repositories = data.data
  },

  async fetchCost(params) {
    const data = await fetchWithState<{ data: CliAnalyticsCostData }>(
      cliAnalyticsStore,
      'cost',
      'v1/analytics/cli-analytics/cost',
      params,
      'Failed to fetch local analytics cost'
    )
    if (data) cliAnalyticsStore.cost = data.data
  },

  async fetchEfficiency(params) {
    const data = await fetchWithState<{ data: CliAnalyticsEfficiencyData }>(
      cliAnalyticsStore,
      'efficiency',
      'v1/analytics/cli-analytics/efficiency',
      params,
      'Failed to fetch local analytics efficiency'
    )
    if (data) cliAnalyticsStore.efficiency = data.data
  },

  async fetchSessionDetail(traceId) {
    const key = `session:${traceId}`
    const data = await fetchWithState<{ data: SessionDetail }>(
      cliAnalyticsStore,
      key,
      `v1/analytics/cli-analytics/sessions/${traceId}`,
      undefined,
      'Failed to fetch session detail'
    )
    if (data) cliAnalyticsStore.sessionDetail[traceId] = data.data
  },

  async fetchFrameworks(params) {
    const data = await fetchWithState<{ data: string[] }>(
      cliAnalyticsStore,
      'frameworks',
      'v1/analytics/cli-analytics/frameworks',
      params,
      'Failed to fetch frameworks'
    )
    if (data) cliAnalyticsStore.frameworks = data.data
  },
})
