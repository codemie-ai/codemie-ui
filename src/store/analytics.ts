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
  AnalyticsQueryParams,
  PaginatedQueryParams,
  AiAdoptionConfigResponse,
  AiAdoptionConfig,
  AnalyticsDashboard,
  UserEngagementUsersRequest,
  UserEngagementDrillDownState,
  AssetReusabilityAssistantsRequest,
  AssetReusabilityWorkflowsRequest,
  AssetReusabilityDatasourcesRequest,
  AssetReusabilityDrillDownState,
  AnalyticsDashboardItem,
} from '@/types/analytics'
import type { ErrorDetails, ErrorResponse } from '@/types/common'
import {
  loadConfigFromStorage,
  saveConfigToStorage,
  clearConfigFromStorage,
} from '@/utils/aiAdoptionConfigStorage'
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
  // State
  overview: SummariesResponse | null
  cliSummary: CliSummaryResponse | null
  aiAdoptionConfig: AiAdoptionConfigResponse | null
  dashboards: AnalyticsDashboardItem[]
  userEngagementDrillDown: UserEngagementDrillDownState
  assetReusabilityDrillDown: AssetReusabilityDrillDownState
  loading: Record<string, boolean>
  loaded: { 'ai-adoption-config': boolean }
  error: Record<string, ErrorDetails | null>

  // Methods
  fetchSummaries: (type: string, params?: AnalyticsQueryParams) => Promise<SummariesResponse | null>
  fetchAiAdoptionOverview: (params?: {
    projects?: string[]
    config?: AiAdoptionConfig
  }) => Promise<SummariesResponse | null>
  fetchCliSummary: (params?: AnalyticsQueryParams) => Promise<CliSummaryResponse | null>
  fetchTabularData: (
    type: TabularMetricType,
    params?: PaginatedQueryParams & { config?: AiAdoptionConfig }
  ) => Promise<TabularResponse | null>
  fetchAiAdoptionMaturity: (params?: {
    projects?: string[]
    config?: AiAdoptionConfig
  }) => Promise<SummariesResponse | null>
  fetchAiAdoptionConfig: (dashboard: string) => Promise<AiAdoptionConfigResponse | null>
  saveAiAdoptionConfig: (config: AiAdoptionConfig) => Promise<void>
  resetAiAdoptionConfig: () => Promise<void>
  loadDashboards: () => Promise<AnalyticsDashboardItem[]>
  saveDashboards: (dashboards: AnalyticsDashboardItem[]) => Promise<void>
  createDashboard: (dashboard: Omit<AnalyticsDashboardItem, 'id'>) => Promise<string>
  updateDashboard: (id: string, dashboard: Omit<AnalyticsDashboardItem, 'id'>) => Promise<void>
  isDashboardLimitReached: () => boolean
  clearState: () => void
}

/**
 * Common helper to handle GET API calls with loading/error state management
 */
const fetchWithState = async <T>(
  store: Analytics,
  key: string,
  endpoint: string,
  params?: any,
  errorMessage?: string
): Promise<T | null> => {
  store.loading[key] = true
  store.error[key] = null

  try {
    const response = await api.get(endpoint, {
      params,
      queryParamArrayHandling: 'compact',
      skipErrorHandling: true,
    })
    return (await response.json()) as T
  } catch (error) {
    console.error(`Error fetching ${key}:`, error)
    store.error[key] = parseErrorResponse(error, errorMessage || `Failed to fetch ${key}`)
    return null
  } finally {
    store.loading[key] = false
  }
}

/**
 * Common helper to handle POST API calls with loading/error state management
 */
const fetchWithStatePost = async <T>(
  store: Analytics,
  key: string,
  endpoint: string,
  body?: any,
  errorMessage?: string
): Promise<T | null> => {
  store.loading[key] = true
  store.error[key] = null

  try {
    const response = await api.post(endpoint, body)
    return (await response.json()) as T
  } catch (error) {
    console.error(`Error fetching ${key}:`, error)
    store.error[key] = parseErrorResponse(error, errorMessage || `Failed to fetch ${key}`)
    return null
  } finally {
    store.loading[key] = false
  }
}

export const analyticsStore = proxy<Analytics>({
  // State initialization
  overview: null,
  cliSummary: null,
  aiAdoptionConfig: null,
  dashboards: [],
  userEngagementDrillDown: {
    isOpen: false,
    project: null,
    data: null,
    filters: {},
    sort_by: 'engagement_score',
    sort_order: 'desc',
    page: 0,
    per_page: 20,
  },
  assetReusabilityDrillDown: {
    isOpen: false,
    project: null,
    activeTab: 'assistants',
    assistants: {
      data: null,
      filters: {},
      sort_by: 'total_usage',
      sort_order: 'desc',
      page: 0,
      per_page: 20,
    },
    workflows: {
      data: null,
      filters: {},
      sort_by: 'execution_count',
      sort_order: 'desc',
      page: 0,
      per_page: 20,
    },
    datasources: {
      data: null,
      filters: {},
      sort_by: 'assistant_count',
      sort_order: 'desc',
      page: 0,
      per_page: 20,
    },
  },
  loading: {},
  loaded: {
    'ai-adoption-config': false,
  },
  error: {},

  /**
   * Fetch summary metrics (total tokens, money spent, etc.)
   * @param type - The type of summaries to fetch (used as key for loading/error state)
   * @param params - Query parameters for filtering
   * @returns Promise with SummariesResponse or null
   */
  async fetchSummaries(type: string, params?: AnalyticsQueryParams) {
    return fetchWithState<SummariesResponse>(
      this,
      type,
      `v1/analytics/${type}`,
      params,
      `Failed to fetch ${type}`
    )
  },

  /**
   * Fetch AI adoption overview metrics (total projects, users, assistants, workflows, datasources)
   * @param params - Query parameters for filtering (projects and optional config)
   * @returns Promise with SummariesResponse or null
   */
  async fetchAiAdoptionOverview(params?: { projects?: string[]; config?: AiAdoptionConfig }) {
    const { config, ...queryParams } = params || {}

    // Clean query params: convert empty arrays to null for proper backend handling
    const cleanedParams = {
      ...queryParams,
      projects:
        Array.isArray(queryParams.projects) && queryParams.projects.length === 0
          ? null
          : queryParams.projects,
    }

    const data = await fetchWithStatePost<SummariesResponse>(
      this,
      'overview',
      'v1/analytics/ai-adoption-overview',
      {
        ...cleanedParams,
        config: config || undefined,
      },
      'Failed to fetch AI adoption overview'
    )
    this.overview = data
    return data
  },

  /**
   * Fetch CLI summary metrics
   * @param params - Query parameters for filtering
   * @returns Promise with CliSummaryResponse or null
   */
  async fetchCliSummary(params?: AnalyticsQueryParams) {
    const data = await fetchWithState<CliSummaryResponse>(
      this,
      'cliSummary',
      'v1/analytics/cli-summary',
      params,
      'Failed to fetch CLI summary'
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
    params?: PaginatedQueryParams & { config?: AiAdoptionConfig }
  ) {
    // Extract config from params if present
    const { config, ...queryParams } = params || {}

    // Clean query params: convert empty arrays to null for proper backend handling
    const cleanedParams = {
      ...queryParams,
      projects:
        Array.isArray(queryParams.projects) && queryParams.projects.length === 0
          ? null
          : queryParams.projects,
      users:
        Array.isArray(queryParams.users) && queryParams.users.length === 0
          ? null
          : queryParams.users,
    }

    // For AI adoption dimension tables, always use POST
    const isAiAdoptionDimension =
      type === 'ai-adoption-user-engagement' ||
      type === 'ai-adoption-asset-reusability' ||
      type === 'ai-adoption-expertise-distribution' ||
      type === 'ai-adoption-feature-adoption'

    if (isAiAdoptionDimension) {
      return fetchWithStatePost<TabularResponse>(
        this,
        type,
        `v1/analytics/${type}`,
        {
          ...cleanedParams,
          config: config || undefined,
        },
        `Failed to fetch ${type} data`
      )
    }

    // For other metrics, use GET
    return fetchWithState<TabularResponse>(
      this,
      type,
      `v1/analytics/${type}`,
      cleanedParams,
      `Failed to fetch ${type} data`
    )
  },

  /**
   * Fetch AI Adoption Maturity metrics
   * Returns adoption_index, maturity_level, and dimension scores (d1-d4)
   * @param params - Query parameters (projects and optional config)
   * @returns Promise with SummariesResponse or null
   */
  async fetchAiAdoptionMaturity(params?: { projects?: string[]; config?: AiAdoptionConfig }) {
    const { config, ...queryParams } = params || {}

    // Clean query params: convert empty arrays to null for proper backend handling
    const cleanedParams = {
      ...queryParams,
      projects:
        Array.isArray(queryParams.projects) && queryParams.projects.length === 0
          ? null
          : queryParams.projects,
    }

    return fetchWithStatePost<SummariesResponse>(
      this,
      'ai-adoption-maturity',
      'v1/analytics/ai-adoption-maturity',
      {
        ...cleanedParams,
        config: config || undefined,
      },
      'Failed to fetch AI adoption maturity'
    )
  },

  /**
   * Fetch AI Adoption Framework configuration
   * Returns framework configuration (weights, thresholds, scoring rules)
   * Checks localStorage first, falls back to API if not found
   * @returns Promise with AiAdoptionConfigResponse or null
   */
  async fetchAiAdoptionConfig(dashboard) {
    const key = 'ai-adoption-config'
    this.loaded[key] = false

    if (dashboard !== AnalyticsDashboard.adoption) {
      this.loaded[key] = true
      return null
    }

    try {
      this.loading[key] = true
      this.error[key] = null

      // Check localStorage first
      const storedConfig = loadConfigFromStorage()
      if (storedConfig) {
        this.aiAdoptionConfig = {
          data: storedConfig,
          metadata: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            description: 'Configuration loaded from localStorage',
          },
        }
        return this.aiAdoptionConfig
      }

      // Fetch from API if not in localStorage
      const response = await api.get('v1/analytics/ai-adoption-config', {
        skipErrorHandling: true,
      })
      const data = (await response.json()) as AiAdoptionConfigResponse

      this.aiAdoptionConfig = data

      // Cache in localStorage
      if (data?.data) {
        saveConfigToStorage(data.data)
      }

      return data
    } catch (error) {
      console.error('Error fetching AI adoption config:', error)
      this.error[key] = parseErrorResponse(error, 'Failed to fetch AI adoption config')
      return null
    } finally {
      this.loading[key] = false
      this.loaded[key] = true
    }
  },

  /**
   * Save AI Adoption Framework configuration to localStorage
   * @param config - Configuration object to save
   */
  async saveAiAdoptionConfig(config: AiAdoptionConfig) {
    try {
      // Save to localStorage
      saveConfigToStorage(config)

      // Update store state
      this.aiAdoptionConfig = {
        data: config,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          description: 'Configuration saved to localStorage',
        },
      }
    } catch (error) {
      console.error('Failed to save AI adoption config:', error)
      throw error
    }
  },

  /**
   * Reset AI Adoption Framework configuration to defaults
   * Clears localStorage and fetches fresh config from API
   */
  async resetAiAdoptionConfig() {
    try {
      // Clear localStorage
      clearConfigFromStorage()

      // Clear store state
      this.aiAdoptionConfig = null

      // Fetch fresh from API
      const response = await api.get('v1/analytics/ai-adoption-config', {
        skipErrorHandling: true,
      })
      const data = (await response.json()) as AiAdoptionConfigResponse

      this.aiAdoptionConfig = data

      // Cache in localStorage
      if (data?.data) {
        saveConfigToStorage(data.data)
      }
    } catch (error) {
      console.error('Failed to reset AI adoption config:', error)
      throw error
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
   * Clear all state
   */
  clearState() {
    this.overview = null
    this.cliSummary = null
    this.aiAdoptionConfig = null
    this.dashboards = []
    this.userEngagementDrillDown = {
      isOpen: false,
      project: null,
      data: null,
      filters: {},
      sort_by: 'engagement_score',
      sort_order: 'desc',
      page: 0,
      per_page: 20,
    }
    this.assetReusabilityDrillDown = {
      isOpen: false,
      project: null,
      activeTab: 'assistants',
      assistants: {
        data: null,
        filters: {},
        sort_by: 'total_usage',
        sort_order: 'desc',
        page: 0,
        per_page: 20,
      },
      workflows: {
        data: null,
        filters: {},
        sort_by: 'execution_count',
        sort_order: 'desc',
        page: 0,
        per_page: 20,
      },
      datasources: {
        data: null,
        filters: {},
        sort_by: 'assistant_count',
        sort_order: 'desc',
        page: 0,
        per_page: 20,
      },
    }
    this.loading = {}
    this.error = {}
  },
})

/**
 * Open User Engagement drill-down modal for a specific project
 */
export async function openUserEngagementDrillDown(project: string) {
  analyticsStore.userEngagementDrillDown.isOpen = true
  analyticsStore.userEngagementDrillDown.project = project
  analyticsStore.userEngagementDrillDown.page = 0
  analyticsStore.userEngagementDrillDown.filters = {}

  await fetchUserEngagementUsers()
}

/**
 * Close User Engagement drill-down modal
 */
export function closeUserEngagementDrillDown() {
  analyticsStore.userEngagementDrillDown.isOpen = false
  analyticsStore.userEngagementDrillDown.project = null
  analyticsStore.userEngagementDrillDown.data = null
  // Clear global loading/error state
  analyticsStore.loading['user-engagement-drill-down'] = false
  analyticsStore.error['user-engagement-drill-down'] = null
}

/**
 * Fetch user-level data for User Engagement drill-down
 */
export async function fetchUserEngagementUsers() {
  const state = analyticsStore.userEngagementDrillDown

  if (!state.project) {
    console.error('Cannot fetch users: project is null')
    return
  }

  // Build payload and filter out undefined values
  const payload: UserEngagementUsersRequest = {
    project: state.project,
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by as UserEngagementUsersRequest['sort_by'],
    sort_order: state.sort_order,
  }

  // Only add filter fields if they have values
  if (state.filters.user_type) {
    payload.user_type = state.filters.user_type as UserEngagementUsersRequest['user_type']
  }
  if (state.filters.activity_level) {
    payload.activity_level = state.filters
      .activity_level as UserEngagementUsersRequest['activity_level']
  }
  if (state.filters.multi_assistant_only !== undefined) {
    payload.multi_assistant_only = state.filters.multi_assistant_only
  }

  const data = await fetchWithStatePost<TabularResponse>(
    analyticsStore,
    'user-engagement-drill-down',
    'v1/analytics/ai-adoption-user-engagement/users',
    payload,
    'Failed to fetch user engagement users'
  )

  if (data) {
    state.data = data
  }
}

/**
 * Update drill-down filters
 */
export async function updateUserEngagementFilters(
  filters: Partial<UserEngagementDrillDownState['filters']>
) {
  analyticsStore.userEngagementDrillDown.filters = {
    ...analyticsStore.userEngagementDrillDown.filters,
    ...filters,
  }
  analyticsStore.userEngagementDrillDown.page = 0 // Reset to first page
  await fetchUserEngagementUsers()
}

/**
 * Update drill-down sorting
 */
export async function updateUserEngagementSort(sort_by: string, sort_order: 'asc' | 'desc') {
  analyticsStore.userEngagementDrillDown.sort_by = sort_by
  analyticsStore.userEngagementDrillDown.sort_order = sort_order
  analyticsStore.userEngagementDrillDown.page = 0 // Reset to first page
  await fetchUserEngagementUsers()
}

/**
 * Update drill-down pagination
 */
export async function updateUserEngagementPage(page: number) {
  analyticsStore.userEngagementDrillDown.page = page
  await fetchUserEngagementUsers()
}

// ============================================================================
// Asset Reusability Drill-Down Actions (Unified Tabbed Modal)
// ============================================================================

/**
 * Open Asset Reusability drill-down modal for a specific project
 */
export async function openAssetReusabilityDrillDown(
  project: string,
  tab: 'assistants' | 'workflows' | 'datasources' = 'assistants'
) {
  analyticsStore.assetReusabilityDrillDown.isOpen = true
  analyticsStore.assetReusabilityDrillDown.project = project
  analyticsStore.assetReusabilityDrillDown.activeTab = tab

  // Fetch data for the active tab
  switch (tab) {
    case 'assistants':
      await fetchAssetReusabilityAssistants()
      break
    case 'workflows':
      await fetchAssetReusabilityWorkflows()
      break
    case 'datasources':
      await fetchAssetReusabilityDatasources()
      break
    default:
      break
  }
}

/**
 * Close Asset Reusability drill-down modal
 */
export function closeAssetReusabilityDrillDown() {
  analyticsStore.assetReusabilityDrillDown.isOpen = false
  analyticsStore.assetReusabilityDrillDown.project = null
  // Clear all tab data
  analyticsStore.assetReusabilityDrillDown.assistants.data = null
  analyticsStore.assetReusabilityDrillDown.workflows.data = null
  analyticsStore.assetReusabilityDrillDown.datasources.data = null
  // Clear global loading/error state for all tabs
  analyticsStore.loading['asset-reusability-assistants'] = false
  analyticsStore.error['asset-reusability-assistants'] = null
  analyticsStore.loading['asset-reusability-workflows'] = false
  analyticsStore.error['asset-reusability-workflows'] = null
  analyticsStore.loading['asset-reusability-datasources'] = false
  analyticsStore.error['asset-reusability-datasources'] = null
}

/**
 * Switch active tab and fetch data if needed
 */
export async function setAssetReusabilityTab(tab: 'assistants' | 'workflows' | 'datasources') {
  analyticsStore.assetReusabilityDrillDown.activeTab = tab

  // Fetch data if not already loaded
  switch (tab) {
    case 'assistants':
      if (!analyticsStore.assetReusabilityDrillDown.assistants.data) {
        await fetchAssetReusabilityAssistants()
      }
      break
    case 'workflows':
      if (!analyticsStore.assetReusabilityDrillDown.workflows.data) {
        await fetchAssetReusabilityWorkflows()
      }
      break
    case 'datasources':
      if (!analyticsStore.assetReusabilityDrillDown.datasources.data) {
        await fetchAssetReusabilityDatasources()
      }
      break
    default:
      break
  }
}

/**
 * Fetch assistant-level data for Asset Reusability drill-down
 */
export async function fetchAssetReusabilityAssistants() {
  const parentState = analyticsStore.assetReusabilityDrillDown
  const state = parentState.assistants

  if (!parentState.project) {
    console.error('Cannot fetch assistants: project is null')
    return
  }

  const payload: AssetReusabilityAssistantsRequest = {
    project: parentState.project,
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by as AssetReusabilityAssistantsRequest['sort_by'],
    sort_order: state.sort_order,
  }

  // Only add filter fields if they have values
  if (state.filters.status) {
    payload.status = state.filters.status as AssetReusabilityAssistantsRequest['status']
  }
  if (state.filters.adoption) {
    payload.adoption = state.filters.adoption as AssetReusabilityAssistantsRequest['adoption']
  }

  const data = await fetchWithStatePost<TabularResponse>(
    analyticsStore,
    'asset-reusability-assistants',
    'v1/analytics/ai-adoption-asset-reusability/assistants',
    payload,
    'Failed to fetch asset reusability assistants'
  )

  if (data) {
    state.data = data
  }
}

/**
 * Fetch workflow-level data for Asset Reusability drill-down
 */
export async function fetchAssetReusabilityWorkflows() {
  const parentState = analyticsStore.assetReusabilityDrillDown
  const state = parentState.workflows

  if (!parentState.project) {
    console.error('Cannot fetch workflows: project is null')
    return
  }

  const payload: AssetReusabilityWorkflowsRequest = {
    project: parentState.project,
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by as AssetReusabilityWorkflowsRequest['sort_by'],
    sort_order: state.sort_order,
  }

  if (state.filters.status) {
    payload.status = state.filters.status as AssetReusabilityWorkflowsRequest['status']
  }
  if (state.filters.reuse) {
    payload.reuse = state.filters.reuse as AssetReusabilityWorkflowsRequest['reuse']
  }

  const data = await fetchWithStatePost<TabularResponse>(
    analyticsStore,
    'asset-reusability-workflows',
    'v1/analytics/ai-adoption-asset-reusability/workflows',
    payload,
    'Failed to fetch asset reusability workflows'
  )

  if (data) {
    state.data = data
  }
}

/**
 * Fetch datasource-level data for Asset Reusability drill-down
 */
export async function fetchAssetReusabilityDatasources() {
  const parentState = analyticsStore.assetReusabilityDrillDown
  const state = parentState.datasources

  if (!parentState.project) {
    console.error('Cannot fetch datasources: project is null')
    return
  }

  const payload: AssetReusabilityDatasourcesRequest = {
    project: parentState.project,
    page: state.page,
    per_page: state.per_page,
    sort_by: state.sort_by as AssetReusabilityDatasourcesRequest['sort_by'],
    sort_order: state.sort_order,
  }

  if (state.filters.status) {
    payload.status = state.filters.status as AssetReusabilityDatasourcesRequest['status']
  }
  if (state.filters.shared) {
    payload.shared = state.filters.shared as AssetReusabilityDatasourcesRequest['shared']
  }
  if (state.filters.type) {
    payload.type = state.filters.type
  }

  const data = await fetchWithStatePost<TabularResponse>(
    analyticsStore,
    'asset-reusability-datasources',
    'v1/analytics/ai-adoption-asset-reusability/datasources',
    payload,
    'Failed to fetch asset reusability datasources'
  )

  if (data) {
    state.data = data
  }
}

/**
 * Update assistants tab filters
 */
export async function updateAssistantsFilters(filters: Partial<Record<string, any>>) {
  const state = analyticsStore.assetReusabilityDrillDown.assistants
  state.filters = {
    ...state.filters,
    ...filters,
  }
  state.page = 0 // Reset to first page
  await fetchAssetReusabilityAssistants()
}

/**
 * Update workflows tab filters
 */
export async function updateWorkflowsFilters(filters: Partial<Record<string, any>>) {
  const state = analyticsStore.assetReusabilityDrillDown.workflows
  state.filters = {
    ...state.filters,
    ...filters,
  }
  state.page = 0
  await fetchAssetReusabilityWorkflows()
}

/**
 * Update datasources tab filters
 */
export async function updateDatasourcesFilters(filters: Partial<Record<string, any>>) {
  const state = analyticsStore.assetReusabilityDrillDown.datasources
  state.filters = {
    ...state.filters,
    ...filters,
  }
  state.page = 0
  await fetchAssetReusabilityDatasources()
}

/**
 * Update assistants tab pagination
 */
export async function updateAssistantsPage(page: number) {
  analyticsStore.assetReusabilityDrillDown.assistants.page = page
  await fetchAssetReusabilityAssistants()
}

/**
 * Update workflows tab pagination
 */
export async function updateWorkflowsPage(page: number) {
  analyticsStore.assetReusabilityDrillDown.workflows.page = page
  await fetchAssetReusabilityWorkflows()
}

/**
 * Update datasources tab pagination
 */
export async function updateDatasourcesPage(page: number) {
  analyticsStore.assetReusabilityDrillDown.datasources.page = page
  await fetchAssetReusabilityDatasources()
}
