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

/**
 * Analytics API Types
 * Generated from OpenAPI specification for CodeMie Dashboard Analytics API
 */

export enum AnalyticsDashboard {
  insights = 'insights',
  cliInsights = 'cliInsights',
  adoption = 'adoption',
}

// ============================================================================
// Enums
// ============================================================================

export enum TimePeriod {
  LAST_HOUR = 'last_hour',
  LAST_6_HOURS = 'last_6_hours',
  LAST_24_HOURS = 'last_24_hours',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_MONTH = 'last_month',
  LAST_60_DAYS = 'last_60_days',
  LAST_YEAR = 'last_year',
}

export enum ColumnType {
  STRING = 'string',
  INTEGER = 'integer',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

export enum MetricFormat {
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  DURATION = 'duration',
  TIMESTAMP = 'timestamp',
}

export enum WidgetType {
  TABLE = 'table',
  DONUT = 'donut',
  PIE = 'pie',
  BAR = 'bar',
  OVERVIEW = 'overview',
  RATIO = 'ratio',
}

export enum WidgetSize {
  FULL = 'full',
  HALF = 'half',
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface AnalyticsQueryParams {
  time_period?: TimePeriod
  start_date?: string // ISO 8601 format
  end_date?: string // ISO 8601 format
  users?: string[] // Array of user emails
  projects?: string[] // Array of project names
}

export interface PaginatedQueryParams extends AnalyticsQueryParams {
  page?: number // 0-indexed
  per_page?: number
}

// ============================================================================
// Core Response Structures
// ============================================================================

export interface FiltersApplied {
  time_period?: string
  start_date?: string
  end_date?: string
  users?: string[]
  projects?: string[]
}

export interface ResponseMetadata {
  timestamp: string // ISO 8601
  data_as_of: string // ISO 8601
  filters_applied?: FiltersApplied
  execution_time_ms?: number
}

export interface AnalyticsPagination {
  page: number
  per_page: number
  total_count: number
  has_more: boolean
}

// ============================================================================
// Data Element Types
// ============================================================================

export interface ColumnDefinition {
  id: string
  label: string
  type: ColumnType
  format?: MetricFormat
  description?: string
}

export type MetricValue = string | number | boolean

export interface Metric {
  id: string
  label: string
  type: ColumnType
  value: MetricValue
  format?: MetricFormat
  description?: string
  fixed_timeframe?: string
  secondary_metrics?: Metric[]
}

// ============================================================================
// Data Schemas
// ============================================================================

export interface SummariesData {
  metrics: Metric[]
}

export interface CliSummaryData {
  metrics: Metric[]
}

export interface TabularData {
  columns: ColumnDefinition[]
  rows: Record<string, unknown>[]
  totals?: Record<string, unknown> | null
}

// ============================================================================
// Response Types
// ============================================================================

export interface SummariesResponse {
  data: SummariesData
  metadata: ResponseMetadata
}

export interface CliSummaryResponse {
  data: CliSummaryData
  metadata: ResponseMetadata
}

export interface TabularResponse {
  data: TabularData
  metadata: ResponseMetadata
  pagination: AnalyticsPagination
  fixed_timeframe?: string
}

// Note: ErrorDetails and ErrorResponse have been moved to @/types/common
// Import them from there if needed: import { ErrorDetails, ErrorResponse } from '@/types/common'

// ============================================================================
// Metric Type Identifiers
// ============================================================================

export enum TabularMetricType {
  ASSISTANTS_CHATS = 'assistants-chats',
  WORKFLOWS = 'workflows',
  TOOLS_USAGE = 'tools-usage',
  AGENTS_USAGE = 'agents-usage',
  WEBHOOKS_INVOCATION = 'webhooks-invocation',
  MCP_SERVERS = 'mcp-servers',
  MCP_SERVERS_BY_USERS = 'mcp-servers-by-users',
  PROJECTS_SPENDING = 'projects-spending',
  LLMS_USAGE = 'llms-usage',
  USERS_SPENDING = 'users-spending',
  BUDGET_SOFT_LIMIT = 'budget-soft-limit',
  BUDGET_HARD_LIMIT = 'budget-hard-limit',
  USERS_ACTIVITY = 'users-activity',
  PROJECTS_ACTIVITY = 'projects-activity',
  CLI_AGENTS = 'cli-agents',
  CLI_LLMS = 'cli-llms',
  CLI_TOOLS = 'cli-tools',
  CLI_USERS = 'cli-users',
  CLI_ERRORS = 'cli-errors',
  CLI_REPOSITORIES = 'cli-repositories',
  CLI_INSIGHTS_WEEKDAY_PATTERN = 'cli-insights-weekday-pattern',
  CLI_INSIGHTS_HOURLY_USAGE = 'cli-insights-hourly-usage',
  CLI_INSIGHTS_SESSION_DEPTH = 'cli-insights-session-depth',
  CLI_INSIGHTS_USER_CLASSIFICATION = 'cli-insights-user-classification',
  CLI_INSIGHTS_TOP_USERS_BY_COST = 'cli-insights-top-users-by-cost',
  CLI_INSIGHTS_PROJECT_CLASSIFICATION = 'cli-insights-project-classification',
  CLI_INSIGHTS_TOP_PROJECTS_BY_COST = 'cli-insights-top-projects-by-cost',
  CLI_INSIGHTS_SHARED_REPOSITORIES = 'cli-insights-shared-repositories',
  CLI_INSIGHTS_TOP_SPENDERS = 'cli-insights-top-spenders',
  CLI_INSIGHTS_USER_REPOSITORIES = 'cli-insights-user-repositories',
  CLI_INSIGHTS_USERS = 'cli-insights-users',
  CLI_INSIGHTS_PROJECTS = 'cli-insights-projects',
  AI_ADOPTION_USER_ENGAGEMENT = 'ai-adoption-user-engagement',
  AI_ADOPTION_ASSET_REUSABILITY = 'ai-adoption-asset-reusability',
  AI_ADOPTION_EXPERTISE_DISTRIBUTION = 'ai-adoption-expertise-distribution',
  AI_ADOPTION_FEATURE_ADOPTION = 'ai-adoption-feature-adoption',
  KEY_SPENDING = 'budget_usage',
  ENGAGEMENT_WEEKLY_HISTOGRAM = 'engagement/weekly-histogram',
  PLATFORM_SPENDING_BY_USERS = 'spending/by-users/platform',
  CLI_SPENDING_BY_USERS = 'spending/by-users/cli',
  POWER_USERS = 'power-users',
  TOP_AGENTS_USAGE = 'top-agents-usage',
  TOP_WORKFLOW_USAGE = 'top-workflow-usage',
  PUBLISHED_TO_MARKETPLACE = 'published-to-marketplace',
}

export enum OverviewMetricType {
  SPENDING = 'spending',
  SUMMARIES = 'summaries',
  CLI_SUMMARY = 'cli-summary',
  CLI_INSIGHTS_BUDGET_RECOMMENDATIONS = 'cli-insights-budget-recommendations',
  CLI_INSIGHTS_TEAM_SUMMARY = 'cli-insights-team-summary',
  AI_ADOPTION_OVERVIEW = 'ai-adoption-overview',
  AI_ADOPTION_MATURITY = 'ai-adoption-maturity',
}

// ============================================================================
// Adoption Analytics Types
// ============================================================================

export interface AdoptionQueryParams {
  projects?: string[]
  page?: number
  per_page?: number
}

export interface OverviewQueryParams {
  projects?: string[]
}

// ============================================================================
// AI/Run Adoption Framework Config Types
// ============================================================================

export interface ConfigParam {
  value: number | string | number[]
  description: string
}

export interface AiAdoptionConfig {
  ai_maturity: {
    activation_threshold: ConfigParam
    minimum_users_threshold: ConfigParam
    maturity_levels: {
      level_2_threshold: ConfigParam
      level_3_threshold: ConfigParam
    }
    adoption_index_weights: {
      user_engagement: ConfigParam
      asset_reusability: ConfigParam
      expertise_distribution: ConfigParam
      feature_adoption: ConfigParam
    }
  }
  user_engagement: {
    component_weights: Record<string, ConfigParam>
    parameters: Record<string, ConfigParam>
  }
  asset_reusability: {
    component_weights: Record<string, ConfigParam>
    parameters: Record<string, ConfigParam>
  }
  expertise_distribution: {
    component_weights: Record<string, ConfigParam>
    parameters: Record<string, ConfigParam>
    scoring: {
      concentration: Record<string, ConfigParam>
      non_champion_activity: {
        multipliers: Record<string, ConfigParam>
        scores: Record<string, ConfigParam>
      }
      creator_diversity: {
        thresholds: Record<string, ConfigParam>
        scores: Record<string, ConfigParam>
      }
    }
  }
  feature_adoption: {
    component_weights: Record<string, ConfigParam>
    parameters: Record<string, ConfigParam>
    complexity_weights: Record<string, ConfigParam>
    scoring: {
      workflow_count: {
        thresholds: Record<string, ConfigParam>
        scores: Record<string, ConfigParam>
      }
    }
  }
}

export interface AiAdoptionConfigResponse {
  data: AiAdoptionConfig
  metadata: {
    timestamp: string
    version: string
    description: string
  }
}

// ============================================================================
// User Engagement Drill-Down Types
// ============================================================================

/**
 * Request payload for User Engagement drill-down
 */
export interface UserEngagementUsersRequest {
  project: string // Single project (required)
  page: number
  per_page: number

  // Optional filters
  user_type?: 'power_user' | 'engaged' | 'occasional' | 'new' | 'inactive'
  activity_level?: 'daily' | 'weekly' | 'monthly' | 'inactive'
  multi_assistant_only?: boolean

  // Sorting
  sort_by?: 'engagement_score' | 'total_interactions' | 'last_used' | 'user_name'
  sort_order?: 'asc' | 'desc'

  // Optional config override
  config?: Record<string, unknown>
}

/**
 * Individual user row in drill-down response
 */
export interface UserEngagementUserRow {
  user_id: string
  user_name: string
  total_interactions: number
  first_used: string | null
  last_used: string | null
  days_since_last_activity: number
  is_activated: boolean
  is_returning: boolean
  is_daily_active: boolean
  is_weekly_active: boolean
  is_monthly_active: boolean
  is_multi_assistant_user: boolean
  distinct_assistant_count: number
  user_type: 'power_user' | 'engaged' | 'occasional' | 'new' | 'inactive'
  engagement_score: number
}

/**
 * Drill-down modal state
 */
export interface UserEngagementDrillDownState {
  isOpen: boolean
  project: string | null
  data: TabularResponse | null

  // Current filters/sort
  filters: {
    user_type?: string
    activity_level?: string
    multi_assistant_only?: boolean
  }
  sort_by: string
  sort_order: 'asc' | 'desc'
  page: number
  per_page: number
}

// ============================================================================
// Asset Reusability Drill-Down Types (Unified Tabbed Modal)
// ============================================================================

/**
 * Request payload for Asset Reusability Assistants drill-down
 */
export interface AssetReusabilityAssistantsRequest {
  project: string // Single project (required)
  page: number
  per_page: number

  // Optional filters
  status?: 'active' | 'inactive'
  adoption?: 'team_adopted' | 'single_user'

  // Sorting
  sort_by?: 'total_usage' | 'unique_users' | 'last_used' | 'assistant_name' | 'created_date'
  sort_order?: 'asc' | 'desc'

  // Optional config override
  config?: Record<string, unknown>
}

/**
 * Request payload for Asset Reusability Workflows drill-down
 */
export interface AssetReusabilityWorkflowsRequest {
  project: string
  page: number
  per_page: number
  status?: 'active' | 'inactive'
  reuse?: 'multi_user' | 'single_user'
  sort_by?: 'execution_count' | 'unique_users' | 'last_executed' | 'workflow_name' | 'created_date'
  sort_order?: 'asc' | 'desc'
  config?: Record<string, unknown>
}

/**
 * Request payload for Asset Reusability Datasources drill-down
 */
export interface AssetReusabilityDatasourcesRequest {
  project: string
  page: number
  per_page: number
  status?: 'active' | 'inactive'
  shared?: 'shared' | 'single'
  type?: string
  sort_by?: 'assistant_count' | 'max_usage' | 'last_indexed' | 'datasource_name' | 'created_date'
  sort_order?: 'asc' | 'desc'
  config?: Record<string, unknown>
}

/**
 * Tab data state for Asset Reusability drill-down
 */
interface AssetReusabilityTabState {
  data: TabularResponse | null
  filters: Record<string, any>
  sort_by: string
  sort_order: 'asc' | 'desc'
  page: number
  per_page: number
}

/**
 * Unified drill-down modal state for Asset Reusability (with tabs)
 */
export interface AssetReusabilityDrillDownState {
  isOpen: boolean
  project: string | null
  activeTab: 'assistants' | 'workflows' | 'datasources'

  // Per-tab data
  assistants: AssetReusabilityTabState
  workflows: AssetReusabilityTabState
  datasources: AssetReusabilityTabState
}

export type AnalyticsDashboardItem = {
  id: string
  name: string
  sections: AnalyticsSectionItem[]
}

export type AnalyticsSectionItem = {
  id: string
  name: string
  widgets: AnalyticsWidgetItem[]
}

export type AnalyticsWidgetItem = {
  id: string
  title: string
  description?: string
  size: WidgetSize
} & (
  | TableWidgetSettings
  | DonutChartWidgetSettings
  | PieChartWidgetSettings
  | BarChartWidgetSettings
  | OverviewWidgetSettings
  | RatioWidgetSettings
)

// ============================================================================
// Widget Settings Types
// ============================================================================

// Charts

export type ChartWidgetSettings = {
  valueField: string
  labelField: string
  metricType: TabularMetricType
}

export type TableWidgetSettings = {
  widgetType: WidgetType.TABLE
  metricType: TabularMetricType
}

export type DonutChartWidgetSettings = ChartWidgetSettings & {
  widgetType: WidgetType.DONUT
}

export type PieChartWidgetSettings = ChartWidgetSettings & {
  widgetType: WidgetType.PIE
}

export type BarChartWidgetSettings = ChartWidgetSettings & {
  widgetType: WidgetType.BAR
  yAxisInteger?: boolean
}

// Summaries

export type OverviewWidgetSettings = {
  widgetType: WidgetType.OVERVIEW
  metricType: OverviewMetricType
  selectedMetrics?: string[]
}

export type RatioWidgetSettings = {
  widgetType: WidgetType.RATIO
  currentValueField: string
  limitValueField: string
  dangerThreshold: number
  warningThreshold: number
  metricType: OverviewMetricType
}
