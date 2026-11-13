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

import { API_BILLED_SUBSCRIPTION_TYPE } from '@/constants/cliAnalytics'
import type {
  CliAnalyticsActivityData,
  CliAnalyticsCostData,
  CliAnalyticsEfficiencyData,
  CliAnalyticsOverviewData,
  CliAnalyticsProjectsData,
  CliAnalyticsRepositoriesData,
  CliAnalyticsSessionsData,
  CliAnalyticsToolsData,
  CliAnalyticsUserTableData,
  CostMetadata,
  SessionDetail,
  SessionRow,
} from '@/types/cliAnalytics'
import type { ErrorDetails, ErrorResponse } from '@/types/common'
import api from '@/utils/api'
import { getBrowserTimezone } from '@/utils/timezone'

interface UnpricedMetadata {
  metadata?: CostMetadata
}

// An aggregating answer is stored as one object with its metadata: a newer answer replaces both,
// so a total never shows next to the unpriced models of another selection.
const withCostMetadata = <T extends object>(
  data: T,
  metadata?: CostMetadata
): T & CostMetadata => ({
  ...data,
  cost_incomplete: metadata?.cost_incomplete ?? false,
  unpriced_models: metadata?.unpriced_models ?? [],
})

// Mirrors the backend normalize_model (coding_agent_pricing.py): metadata names the raw model ids,
// while row.model_name holds the normalized ones (Bedrock wrapper, provider prefix, '-v1:0' tag).
export const normalizeModelName = (model: string): string =>
  model
    .replace(/^(bedrock\/)?(converse|invoke)\//i, '')
    .replace(/^([a-z0-9-]+\.)?anthropic\./i, '')
    .replace(/(\d{8})-v\d+:\d+$/, '$1')

// The list metadata names unpriced models for the whole page; keep on each row the ones it used.
const withRowUnpricedModels = (row: SessionRow, unpriced: string[]): SessionRow => {
  const models = new Set(
    (row.model_name ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map(normalizeModelName)
  )
  return {
    ...row,
    unpriced_models: unpriced.filter((name) => models.has(normalizeModelName(name))),
  }
}

interface CliAnalyticsState {
  abortControllers: Map<string, AbortController>
  generations: Map<string, number>
  activity: CliAnalyticsActivityData | null
  tools: CliAnalyticsToolsData | null
  users: {
    table: CliAnalyticsUserTableData | null
  } | null
  sessions: CliAnalyticsSessionsData | null
  overview: CliAnalyticsOverviewData | null
  repositories: CliAnalyticsRepositoriesData | null
  projects: CliAnalyticsProjectsData | null
  cost: CliAnalyticsCostData | null
  efficiency: CliAnalyticsEfficiencyData | null
  frameworks: string[] | null
  userCount: number | null
  apiSpend: number | null
  sessionDetail: Record<string, SessionDetail>
  loading: Record<string, boolean>
  error: Record<string, ErrorDetails | null>
  fetchActivity: (params: Record<string, unknown>) => Promise<void>
  fetchTools: (params: Record<string, unknown>) => Promise<void>
  fetchUsersTable: (params: Record<string, unknown>) => Promise<void>
  fetchSessions: (params: Record<string, unknown>) => Promise<void>
  fetchOverview: (params: Record<string, unknown>) => Promise<void>
  fetchRepositories: (params: Record<string, unknown>) => Promise<void>
  clearRepositories: () => void
  fetchProjects: (params: Record<string, unknown>) => Promise<void>
  fetchCost: (params: Record<string, unknown>) => Promise<void>
  fetchEfficiency: (params: Record<string, unknown>) => Promise<void>
  fetchSessionDetail: (traceId: string) => Promise<void>
  fetchFrameworks: (params: Record<string, unknown>) => Promise<void>
  fetchUserCount: (params: Record<string, unknown>) => Promise<void>
  fetchApiSpend: (params: Record<string, unknown>) => Promise<void>
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
  projects: null,
  cost: null,
  efficiency: null,
  frameworks: null,
  userCount: null,
  apiSpend: null,
  sessionDetail: {},
  loading: {},
  error: {},

  async fetchActivity(params) {
    const data = await fetchWithState<{ data: CliAnalyticsActivityData }>(
      cliAnalyticsStore,
      'activity',
      'v1/analytics/cli-analytics/activity',
      { ...params, tz: getBrowserTimezone() },
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

  async fetchUsersTable(params) {
    const data = await fetchWithState<{ data: CliAnalyticsUserTableData } & UnpricedMetadata>(
      cliAnalyticsStore,
      'usersTable',
      'v1/analytics/cli-analytics/users',
      params,
      'Failed to fetch user table'
    )
    if (data) {
      cliAnalyticsStore.users = { table: withCostMetadata(data.data, data.metadata) }
    }
  },

  // Own slot: the Users tab owns `users`, and a one-row request must not replace its table.
  // Cleared first, so a failed or pending request never leaves the count of other filters on screen.
  async fetchUserCount(params) {
    cliAnalyticsStore.userCount = null
    const data = await fetchWithState<{ data: CliAnalyticsUserTableData }>(
      cliAnalyticsStore,
      'userCount',
      'v1/analytics/cli-analytics/users',
      // Only total_count is read: skip the daily-activity and avg-duration statements.
      {
        ...params,
        page: 0,
        per_page: 1,
        include_daily_activity: false,
        include_avg_duration: false,
      },
      'Failed to fetch user count'
    )
    if (data) cliAnalyticsStore.userCount = data.data?.total_count ?? null
  },

  // Est. Cost of sessions routed through the CodeMie proxy (billed per token). Own slot, so the
  // filtered request never replaces the Overview data. Cleared first, like the user count.
  async fetchApiSpend(params) {
    cliAnalyticsStore.apiSpend = null
    const data = await fetchWithState<{ data: CliAnalyticsOverviewData }>(
      cliAnalyticsStore,
      'apiSpend',
      'v1/analytics/cli-analytics/overview',
      // Only kpis.total_cost_usd is read: skip the class lists and buckets.
      {
        ...params,
        subscription_type: API_BILLED_SUBSCRIPTION_TYPE,
        include_class_lists: false,
        include_buckets: false,
      },
      'Failed to fetch API spend'
    )
    if (data) cliAnalyticsStore.apiSpend = data.data?.kpis?.total_cost_usd ?? null
  },

  async fetchSessions(params) {
    const data = await fetchWithState<{ data: CliAnalyticsSessionsData } & UnpricedMetadata>(
      cliAnalyticsStore,
      'sessions',
      'v1/analytics/cli-analytics/sessions',
      params,
      'Failed to fetch local analytics sessions'
    )
    if (data?.data) {
      const unpriced = data.metadata?.unpriced_models ?? []
      cliAnalyticsStore.sessions = {
        ...data.data,
        sessions: (data.data.sessions ?? []).map((row) => withRowUnpricedModels(row, unpriced)),
      }
    }
  },

  async fetchOverview(params) {
    const data = await fetchWithState<{ data: CliAnalyticsOverviewData } & UnpricedMetadata>(
      cliAnalyticsStore,
      'overview',
      'v1/analytics/cli-analytics/overview',
      // The Overview tab reads neither part; false keeps the request on the start-day rollup.
      { ...params, include_class_lists: false, include_buckets: false },
      'Failed to fetch local analytics overview'
    )
    if (data) cliAnalyticsStore.overview = withCostMetadata(data.data, data.metadata)
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

  clearRepositories() {
    cliAnalyticsStore.repositories = null
  },

  async fetchProjects(params) {
    const data = await fetchWithState<{ data: CliAnalyticsProjectsData } & UnpricedMetadata>(
      cliAnalyticsStore,
      'projects',
      'v1/analytics/cli-analytics/projects',
      params,
      'Failed to fetch local analytics projects'
    )
    if (data) cliAnalyticsStore.projects = withCostMetadata(data.data, data.metadata)
  },

  async fetchCost(params) {
    const data = await fetchWithState<{ data: CliAnalyticsCostData } & UnpricedMetadata>(
      cliAnalyticsStore,
      'cost',
      'v1/analytics/cli-analytics/cost',
      // The Cost tab reads neither part; false keeps the request on the start-day rollup.
      { ...params, include_class_lists: false, include_buckets: false },
      'Failed to fetch local analytics cost'
    )
    if (data) cliAnalyticsStore.cost = withCostMetadata(data.data, data.metadata)
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
    const data = await fetchWithState<{ data: SessionDetail } & UnpricedMetadata>(
      cliAnalyticsStore,
      key,
      `v1/analytics/cli-analytics/sessions/${traceId}`,
      undefined,
      'Failed to fetch session detail'
    )
    if (data?.data) {
      cliAnalyticsStore.sessionDetail[traceId] = {
        ...data.data,
        unpriced_models: data.metadata?.unpriced_models ?? [],
      }
    }
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
