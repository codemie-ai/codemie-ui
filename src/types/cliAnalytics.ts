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

export interface ChartUserRow {
  developer_name: string
  cost_usd: number
}

export interface UserRow {
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
  net_lines?: number
  daily_activity?: DailyActivityBucket[]
}

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
  tool_call_count: number
  branch: string | null
  prompt?: string
  turns?: number
  cache_read_tokens?: number
  cache_creation_tokens?: number
  net_lines?: number
  bloat_pct?: number
  delivery_framework?: string
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
  active_ms?: number
  agent_count?: number
  skill_count?: number
  cache_read_cost_usd?: number
  tool_calls_success?: number
  tools?: ToolWithSuccessRow[]
  dispatches?: DispatchRow[]
}

export interface OverviewKPIs {
  total_sessions: number
  total_cost_usd: number
  duration_ms: number
  total_turns: number
  total_tool_calls: number
  tool_call_success_rate: number
  total_files_changed: number
  net_lines: number
  dead_sessions: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_creation_tokens: number
  total_cache_read_tokens: number
  total_tokens: number
  cache_read_cost_usd: number
  bloat_pct: number
  avg_context_per_call: number
}

export interface DailyBucket {
  day: string
  net_lines: number
}

export interface ModelBreakdownItem {
  model_name: string
  session_count: number
}

export interface CliAnalyticsOverviewData {
  kpis: OverviewKPIs
  daily_buckets: DailyBucket[]
  model_breakdown: ModelBreakdownItem[]
}

export interface RepositoryRow {
  repository: string | null
  branch?: string | null
  session_count: number
  turns: number
  cost_usd: number
  files_changed: number
  lines_added: number
  lines_removed: number
  net_lines: number
  tool_success_rate: number
  project_name?: string | null
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

export interface CliAnalyticsUserChartsData {
  rows: ChartUserRow[]
}

export interface CliAnalyticsUserTableData {
  rows: UserRow[]
  total_count: number
  avg_session_duration_ms: number | null
}

export interface CliAnalyticsUsersData {
  rows: UserRow[]
  avg_session_duration_ms?: number | null
  total_count?: number
}

export interface CliAnalyticsSessionsData {
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

export interface CliAnalyticsCostKPIs {
  total_sessions: number
  total_cost_usd: number
  total_tokens: number
  avg_cost_per_session: number
}

export interface CostByUserRow {
  developer_name: string
  cost_usd: number
}

export interface CostByModelRow {
  model_name: string
  cost_usd: number
}

export interface CliAnalyticsCostData {
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
  net_lines: number
}

export interface CliAnalyticsEfficiencyData {
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
  sessionFilters: AnalyticsQueryParams
  repositories?: string[]
  isUnattributed?: boolean
  branch?: string
}
