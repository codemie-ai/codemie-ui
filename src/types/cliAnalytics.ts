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

import type { AnalyticsQueryParams, Metric } from '@/types/analytics'

interface DailyActivityBucket {
  day: string // ISO date, YYYY-MM-DD
  session_count: number
}

// Pricing of one row's own cost_usd (users, chart users, cost by user/model, project/repository/branch).
// Absent on an older backend. Model names are available to every authorized viewer.
// cost_unknown: true = nothing of this amount was priced; false = part or all was (a real $0 included);
// null = the source cannot tell.
export interface RowCostPricing {
  cost_incomplete?: boolean
  unpriced_models?: string[]
  cost_unknown?: boolean | null
}

// Response metadata of an aggregating answer, stored next to the data it describes.
export interface CostMetadata {
  cost_incomplete?: boolean
  unpriced_models?: string[]
}

export interface ChartUserRow extends RowCostPricing {
  developer_name: string
  cost_usd: number
}

export interface UserRow extends RowCostPricing {
  developer_name: string
  session_count: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
  cache_read_tokens: number
  cache_creation_tokens: number
  turns?: number
  tool_calls?: number
  last_active?: string | null
  user_id?: string | null
  tool_success_rate?: number
  top_model?: string | null
  net_lines?: number | null
  daily_activity?: DailyActivityBucket[]
}

export type SessionSummaryState = 'none' | 'provisional' | 'final'
export type SessionSummaryMetric = 'agents' | 'skills' | 'tool_calls' | 'turns'

export interface SessionRow {
  trace_id: string
  developer_name: string
  repository: string | null
  start_time: string
  duration_ms: number
  model_name: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  // Observed in telemetry (not the session total); see tool_calls_total.
  tool_call_count: number
  tool_calls_total?: number | null
  branch: string | null
  prompt?: string
  // null = unknown (not reported); 0 is a real zero.
  turns?: number | null
  // Absent on older backends: treated as unknown, never as final.
  summary_state?: SessionSummaryState
  summary_metrics?: SessionSummaryMetric[]
  cache_read_tokens?: number
  cache_creation_tokens?: number
  ctx_per_call?: number
  net_lines?: number | null
  bloat_pct?: number
  delivery_framework?: string
  // false = no model of the session has a catalog price, so cost_usd is unknown, not a real zero.
  cost_available?: boolean
  // Some of the session's usage could not be priced, so cost_usd is a subtotal. Absent on an older backend.
  cost_incomplete?: boolean
  // Names of those models, as supplied by the API.
  unpriced_models?: string[]
}

export interface SessionEvent {
  timestamp: string
  event_type: string
  model_name: string | null
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | null
  tool_name: string | null
  cache_read_tokens?: number | null
  cache_creation_tokens?: number | null
}

export interface DispatchRow {
  label: string
  kind: 'session' | 'agent' | 'skill' | 'command'
  start_offset_ms: number
  duration_ms: number
  cost_usd: number | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens?: number | null
  cache_creation_tokens?: number | null
}

export interface SessionDetail extends SessionRow {
  events: SessionEvent[]
  harness_name: string
  active_ms?: number
  agent_count?: number | null
  skill_count?: number | null
  cache_read_cost_usd?: number
  tool_calls_success?: number
  tool_success_rate?: number | null
  tools?: ToolWithSuccessRow[]
  dispatches?: DispatchRow[]
}

export interface OverviewKPIs extends RowCostPricing {
  total_sessions: number
  total_cost_usd: number
  duration_ms: number
  total_turns: number
  total_tool_calls: number
  tool_call_success_rate: number
  total_files_changed: number
  net_lines: number | null
  dead_sessions: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_creation_tokens: number
  total_cache_read_tokens: number
  total_tokens: number
  cache_read_cost_usd: number
  bloat_pct: number
  avg_context_per_call: number
  // Ticket B fields: absent until the backend ships them; their cards stay hidden until then.
  api_cost_usd?: number | null
  subscription_cost_usd?: number | null
  total_users?: number | null
}

export interface DailyBucket {
  day: string
  net_lines: number | null
}

export interface ModelBreakdownItem {
  model_name: string
  session_count: number
}

export interface CliAnalyticsOverviewData extends CostMetadata {
  kpis: OverviewKPIs
  daily_buckets: DailyBucket[]
  model_breakdown: ModelBreakdownItem[]
  // Cost of sessions on a personal Claude subscription; kept out of every spend value, Est. Cost included.
  personal_billed?: { cost_usd: number } | null
}

export interface RepositoryBranchRow extends RowCostPricing {
  branch: string | null
  session_count: number
  turns: number
  cost_usd: number
  files_changed: number
  lines_added: number | null
  lines_removed: number | null
  net_lines: number | null
  tool_calls: number
  tool_calls_success: number
  tool_success_rate: number
}

export interface RepositoryRow extends RowCostPricing {
  repository: string | null
  session_count: number
  turns: number
  cost_usd: number
  files_changed: number
  lines_added: number | null
  lines_removed: number | null
  net_lines: number | null
  tool_calls: number
  tool_calls_success: number
  tool_success_rate: number
  project_name?: string | null
  // Present only when include_branches=True: this repository's branches, each with its own
  // backend-computed tool_success_rate (EPMCDME-15585) -- never re-aggregated client-side.
  branches?: RepositoryBranchRow[] | null
}

export interface CliAnalyticsRepositoriesData {
  rows: RepositoryRow[]
  pagination: {
    page: number
    per_page: number
    total_count: number
    has_more: boolean
  }
}

// One project row. Repositories and branches load on demand per modal. Totals and tool_success_rate come
// from the backend, which sums the raw counts (never averaged rates).
export interface ProjectRow extends RowCostPricing {
  project_name: string | null
  repository_count: number
  session_count: number
  turns: number
  cost_usd: number
  files_changed: number
  lines_added: number | null
  lines_removed: number | null
  net_lines: number | null
  tool_calls: number
  tool_calls_success: number
  tool_success_rate: number
}

export interface CliAnalyticsBranchesData {
  rows: RepositoryBranchRow[]
  pagination: CliAnalyticsRepositoriesData['pagination']
}

// Selects one project (by name) or the unattributed bucket; replaces filters.projects in requests.
export type ProjectScope = { projectName: string } | { isProjectUnattributed: true }

export interface CliAnalyticsProjectsData extends CostMetadata {
  rows: ProjectRow[]
  pagination: CliAnalyticsRepositoriesData['pagination']
}

export interface CliAnalyticsUserTableData extends CostMetadata {
  rows: UserRow[]
  total_count: number
  avg_session_duration_ms: number | null
  // Every user of the window in rank order (requested with include_chart=true), for the cost-share chart.
  chart?: ChartUserRow[] | null
}

export interface CliAnalyticsUsersData {
  rows: UserRow[]
  avg_session_duration_ms?: number | null
  total_count?: number
}

export interface CliAnalyticsSessionsData extends CostMetadata {
  sessions: SessionRow[]
  page: number
  per_page: number
  total: number
}

export interface CliAnalyticsActivityData {
  heat: number[][] // [7][24] — heat[weekday][hour], weekday 0=Mon..6=Sun
  by_hour: number[] // length 24
  by_weekday: number[] // length 7
}

export interface CliAnalyticsCostKPIs extends RowCostPricing {
  total_sessions: number
  total_cost_usd: number
  total_tokens: number
  avg_cost_per_session: number
}

export interface CostByUserRow extends RowCostPricing {
  developer_name: string
  cost_usd: number
}

export interface CostByModelRow extends RowCostPricing {
  model_name: string
  cost_usd: number
}

export interface CliAnalyticsCostData extends CostMetadata {
  kpis: CliAnalyticsCostKPIs
  cost_by_user: CostByUserRow[]
  cost_by_model: CostByModelRow[]
}

export interface CliAnalyticsEfficiencyKPIs {
  avg_context_per_call: number
  worst_session_ctx_per_call: number | null
  worst_session_prompt: string | null
  worst_session_trace_id: string | null
  cache_read_cost_usd: number
  bloat_pct: number
  total_cost_usd: number
}

export interface CliAnalyticsDeadSessionsKPIs {
  count: number
  pct_of_sessions: number
  wasted_cost_usd: number
  avg_cost_per_dead: number | null
}

export interface CliAnalyticsSessionDepthBucket {
  bucket: string
  count: number
}

export interface CliAnalyticsCodeChangesKPIs {
  files_changed: number
  files_written: number
  files_edited: number
  net_lines: number | null
}

export interface CliAnalyticsEfficiencyData extends CostMetadata {
  kpis: CliAnalyticsEfficiencyKPIs
  dead_sessions: CliAnalyticsDeadSessionsKPIs
  session_depth: CliAnalyticsSessionDepthBucket[]
  code_changes: CliAnalyticsCodeChangesKPIs
}

export interface ToolWithSuccessRow {
  tool_name: string
  call_count: number
  success_count: number
  success_rate: number
}

export interface TokensByModelRow {
  model_name: string
  total_tokens: number
}

export interface InvocationRow {
  name: string
  count: number
}

export interface CliAnalyticsToolsData {
  tool_usage: ToolWithSuccessRow[]
  tokens_by_model: TokensByModelRow[]
  skills_invoked: InvocationRow[]
  agent_subtypes: InvocationRow[]
  slash_commands: InvocationRow[]
}

export interface ExtendedSessionsTarget {
  title: string
  metrics: Metric[]
  costPricing?: RowCostPricing
  sessionFilters: AnalyticsQueryParams
  repositories?: string[]
  isUnattributed?: boolean
  branch?: string
  projectName?: string
  isProjectUnattributed?: boolean
  isBranchUnattributed?: boolean
}
