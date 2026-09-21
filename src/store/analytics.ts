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

import { ANALYTICS_DASHBOARDS_KEY, MAX_DASHBOARDS_LIMIT } from '@/pages/analytics/constants'
import {
  SummariesResponse,
  CliSummaryResponse,
  TabularResponse,
  TabularMetricType,
  AnalyticsRequestParams,
  AnalyticsPaginatedRequestParams,
  AnalyticsDashboardItem,
  LeaderboardSeasonsResponse,
  LeaderboardSeason,
  LeaderboardUserDetailQueryParams,
  LeaderboardUserDetailResponse,
  LeaderboardView,
  LeaderboardProjectsResponse,
  LeaderboardFrameworkResponse,
} from '@/types/analytics'
import type { ErrorDetails, ErrorResponse } from '@/types/common'
import api from '@/utils/api'
import storage from '@/utils/storage'

import { userStore } from './user'

/**
 * Helper function to parse error responses from the API
 * Handles both structured error responses and generic error messages
 */
const parseErrorResponse = (error: unknown, fallbackMessage: string): ErrorDetails => {
  // Check if it's a Response object with parsedError (from API wrapper)
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

  // Check if error has the ErrorResponse structure (direct from API)
  if (
    error &&
    typeof error === 'object' &&
    'error' in error &&
    error.error &&
    typeof error.error === 'object' &&
    'message' in error.error
  ) {
    const errorResponse = error as ErrorResponse
    return errorResponse.error
  }

  // Check if it's a standard Error object
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
    }
  }

  // Fallback for unknown error types
  return {
    message: fallbackMessage,
    details: typeof error === 'string' ? error : undefined,
  }
}

interface Analytics {
  // Request lifecycle management
  abortControllers: Map<string, AbortController>
  generations: Map<string, number>

  // State
  cliSummary: CliSummaryResponse | null
  dashboards: AnalyticsDashboardItem[]
  loading: Record<string, boolean>
  error: Record<string, ErrorDetails | null>

  // Methods
  fetchSummaries: (
    type: string,
    params?: AnalyticsRequestParams
  ) => Promise<SummariesResponse | null>
  fetchCliSummary: (params?: AnalyticsRequestParams) => Promise<CliSummaryResponse | null>
  fetchTabularData: (
    type: TabularMetricType,
    params?: AnalyticsPaginatedRequestParams
  ) => Promise<TabularResponse | null>
  fetchUserProjectSpending: (userEmail: string) => Promise<TabularResponse | null>
  fetchProjectMemberSpending: (projectName: string) => Promise<TabularResponse | null>
  fetchLeaderboardSeasons: (
    view: Exclude<LeaderboardView, 'current'>
  ) => Promise<LeaderboardSeason[]>
  fetchLeaderboardUserDetail: (
    userId: string,
    params?: LeaderboardUserDetailQueryParams
  ) => Promise<LeaderboardUserDetailResponse | null>
  fetchLeaderboardProjects: () => Promise<string[]>
  fetchLeaderboardFramework: () => Promise<LeaderboardFrameworkResponse | null>
  loadDashboards: () => Promise<AnalyticsDashboardItem[]>
  saveDashboards: (dashboards: AnalyticsDashboardItem[]) => Promise<void>
  createDashboard: (dashboard: Omit<AnalyticsDashboardItem, 'id'>) => Promise<string>
  updateDashboard: (id: string, dashboard: Omit<AnalyticsDashboardItem, 'id'>) => Promise<void>
  isDashboardLimitReached: () => boolean
  clearState: () => void
  startRequest: (type: string) => AbortSignal
}

/**
 * Helper function to start a new request for a specific metric type
 * - Cancels any existing request for this type
 * - Increments generation counter
 * - Creates new AbortController
 * - Sets loading state
 * @param type - The metric type identifier
 * @param store - The analytics store instance
 * @returns AbortSignal to pass to fetch
 */
const startRequest = (type: string, store: Analytics): AbortSignal => {
  // Cancel previous request if exists
  const existingController = store.abortControllers.get(type)
  if (existingController) {
    existingController.abort()
  }

  const currentGen = store.generations.get(type) ?? 0
  const newGen = currentGen + 1
  store.generations.set(type, newGen)

  const controller = new AbortController()
  store.abortControllers.set(type, controller)
  store.loading[type] = true

  return controller.signal
}

/**
 * Common helper to handle GET API calls with loading/error state management
 * @param withCancellation - If true, uses AbortController + generation tracking to prevent stale data
 */
const fetchWithState = async <T>(
  store: Analytics,
  key: string,
  endpoint: string,
  params?: any,
  errorMessage?: string,
  options?: { withCancellation?: boolean }
): Promise<T | null> => {
  let signal: AbortSignal | undefined
  let requestGeneration: number | undefined

  if (options?.withCancellation) {
    signal = startRequest(key, store)
    requestGeneration = store.generations.get(key)
    store.error[key] = null
  } else {
    store.loading[key] = true
    store.error[key] = null
  }

  try {
    const response = await api.get(endpoint, {
      params,
      queryParamArrayHandling: 'compact',
      skipErrorHandling: true,
      signal,
    })

    // requestGeneration === store.generations.get(key) means the current request is still ongoing

    // Stale response
    if (options?.withCancellation && requestGeneration !== store.generations.get(key)) {
      return null
    }

    const data = (await response.json()) as T

    if (!options?.withCancellation || requestGeneration === store.generations.get(key)) {
      store.loading[key] = false
    }

    return data
  } catch (error: any) {
    // AbortError is expected when request is cancelled
    if (error?.name === 'AbortError') return null

    console.error('Error fetching:', key, error)
    store.error[key] = parseErrorResponse(error, errorMessage || `Failed to fetch ${key}`)

    if (!options?.withCancellation || requestGeneration === store.generations.get(key)) {
      store.loading[key] = false
    }

    return null
  }
}

export const analyticsStore = proxy<Analytics>({
  // Request lifecycle management
  abortControllers: new Map<string, AbortController>(),
  generations: new Map<string, number>(),

  // State initialization
  cliSummary: null,
  dashboards: [],
  loading: {},
  error: {},

  /**
   * Fetch summary metrics (total tokens, money spent, etc.)
   * @param type - The type of summaries to fetch (used as key for loading/error state)
   * @param params - Query parameters for filtering
   * @returns Promise with SummariesResponse or null
   */
  async fetchSummaries(type: string, params?: AnalyticsRequestParams) {
    return fetchWithState<SummariesResponse>(
      this,
      type,
      `v1/analytics/${type}`,
      params,
      `Failed to fetch ${type}`,
      { withCancellation: true }
    )
  },

  /**
   * Fetch CLI summary metrics
   * @param params - Query parameters for filtering
   * @returns Promise with CliSummaryResponse or null
   */
  async fetchCliSummary(params?: AnalyticsRequestParams) {
    const data = await fetchWithState<CliSummaryResponse>(
      this,
      'cliSummary',
      'v1/analytics/cli-summary',
      params,
      'Failed to fetch CLI summary',
      { withCancellation: true }
    )
    this.cliSummary = data
    return data
  },

  /**
   * Fetch tabular data for any analytics endpoint that returns TabularResponse
   * This is a parameterized method that handles all tabular endpoints:
   * - assistants-chats, workflows, tools-usage, webhooks-invocation
   * - mcp-servers, mcp-servers-by-users, projects-spending, llms-usage
   * - users-spending, budget-soft-limit, budget-hard-limit
   * - users-activity, projects-activity, agents-usage
   * - cli-agents, cli-llms, cli-users, cli-errors, cli-repositories
   *
   * @param type - The type of tabular data to fetch (from TabularMetricType enum)
   * @param params - Query parameters including pagination and optional config
   * @returns Promise with TabularResponse or null
   */
  async fetchTabularData(
    type: TabularMetricType,
    params?: AnalyticsPaginatedRequestParams
  ) {
    // Clean query params: convert empty arrays to null for proper backend handling
    const cleanedParams = {
      ...params,
      projects:
        Array.isArray(params?.projects) && params.projects.length === 0
          ? null
          : params?.projects,
      users:
        Array.isArray(params?.users) && params.users.length === 0
          ? null
          : params?.users,
    }

    return fetchWithState<TabularResponse>(
      this,
      type,
      `v1/analytics/${type}`,
      cleanedParams,
      `Failed to fetch ${type} data`,
      { withCancellation: true }
    )
  },

  async fetchUserProjectSpending(userEmail: string) {
    const type = TabularMetricType.USER_PROJECT_SPENDING

    return fetchWithState<TabularResponse>(
      this,
      `${type}:${userEmail}`,
      `v1/analytics/${type}`,
      { users: [userEmail] },
      `Failed to fetch ${type} data`
    )
  },

  /** Per-member spending inside one project (project details Spending column). */
  async fetchProjectMemberSpending(projectName: string) {
    return this.fetchTabularData(TabularMetricType.PROJECT_MEMBER_SPENDING, {
      projects: [projectName],
    })
  },

  async fetchLeaderboardProjects() {
    const result = await fetchWithState<LeaderboardProjectsResponse>(
      this,
      'leaderboard-projects',
      'v1/analytics/leaderboard/projects',
      undefined,
      'Failed to fetch leaderboard projects'
    )
    return result?.data?.projects ?? []
  },

  async fetchLeaderboardFramework() {
    return fetchWithState<LeaderboardFrameworkResponse>(
      this,
      'leaderboard-framework',
      'v1/analytics/leaderboard/framework',
      undefined,
      'Failed to fetch leaderboard framework'
    )
  },

  async fetchLeaderboardSeasons(view: Exclude<LeaderboardView, 'current'>) {
    const key = `leaderboard-seasons-${view}`
    this.loading[key] = true
    this.error[key] = null

    try {
      const response = await api.get('v1/analytics/leaderboard/seasons', {
        params: { view },
        skipErrorHandling: true,
      })
      const result = (await response.json()) as
        | LeaderboardSeasonsResponse
        | { data?: { seasons?: LeaderboardSeason[] } }
      let seasons: LeaderboardSeason[] = []

      if (Array.isArray(result?.data)) {
        seasons = result.data
      } else if (Array.isArray(result?.data?.seasons)) {
        seasons = result.data.seasons
      }

      return seasons
    } catch (error) {
      console.error('Error fetching leaderboard seasons:', error)
      this.error[key] = parseErrorResponse(error, 'Failed to fetch leaderboard seasons')
      return []
    } finally {
      this.loading[key] = false
    }
  },

  async fetchLeaderboardUserDetail(userId: string, params?: LeaderboardUserDetailQueryParams) {
    const key = `leaderboard-user-${userId}`
    this.loading[key] = true
    this.error[key] = null

    try {
      const response = await api.get(`v1/analytics/leaderboard/user/${userId}`, {
        params,
        skipErrorHandling: true,
      })
      return (await response.json()) as LeaderboardUserDetailResponse
    } catch (error) {
      console.error('Failed to fetch leaderboard user detail:', error)
      this.error[key] = parseErrorResponse(error, 'Failed to load user details.')
      return null
    } finally {
      this.loading[key] = false
    }
  },

  /**
   * Load dashboards from localStorage with migration from old format
   * @returns Promise with AnalyticsDashboardItem array
   */
  async loadDashboards() {
    const userId = userStore.user?.userId ?? ''

    let dashboards = storage.getObject<AnalyticsDashboardItem[] | null>(
      userId,
      ANALYTICS_DASHBOARDS_KEY,
      null
    )

    dashboards = dashboards && Array.isArray(dashboards) ? dashboards : []
    this.dashboards = dashboards
    return dashboards
  },

  /**
   * Save dashboards array to localStorage
   * @param dashboards - Array of dashboards to save
   */
  async saveDashboards(dashboards: AnalyticsDashboardItem[]) {
    const userId = userStore.user?.userId ?? ''
    storage.put(userId, ANALYTICS_DASHBOARDS_KEY, dashboards)
    this.dashboards = dashboards
  },

  /**
   * Create a new dashboard
   * @param dashboard - Dashboard to create (without id)
   * @returns The generated dashboard ID
   */
  async createDashboard(dashboard: Omit<AnalyticsDashboardItem, 'id'>) {
    const id = crypto.randomUUID()
    const newDashboard: AnalyticsDashboardItem = {
      ...dashboard,
      id,
    }
    const updatedDashboards = [...this.dashboards, newDashboard]
    await this.saveDashboards(updatedDashboards)
    return id
  },

  /**
   * Update an existing dashboard
   * @param id - ID of dashboard to update
   * @param dashboard - Updated dashboard data (without id)
   */
  async updateDashboard(id: string, dashboard: Omit<AnalyticsDashboardItem, 'id'>) {
    const updatedDashboards = this.dashboards.map((d) => (d.id === id ? { ...dashboard, id } : d))
    await this.saveDashboards(updatedDashboards)
  },

  isDashboardLimitReached() {
    return this.dashboards.length >= MAX_DASHBOARDS_LIMIT
  },

  /**
   * Start a new request for a specific metric type
   * Delegates to the startRequest module-level helper
   */
  startRequest(type: string): AbortSignal {
    return startRequest(type, this)
  },

  /**
   * Clear all state
   */
  clearState() {
    this.cliSummary = null
    this.dashboards = []
    this.loading = {}
    this.error = {}
  },
})
