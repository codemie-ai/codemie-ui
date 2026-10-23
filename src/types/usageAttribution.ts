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

/** Usage Attribution analytics (/v1/analytics/usage-attribution). */

export type UaCategory =
  | 'production'
  | 'learning'
  | 'testing'
  | 'experimental'
  | 'pet_project'
  | 'unclassified'

export type UaPayer = 'charged' | 'shared' | 'personal'

export type UaTier = 'view' | 'analysis' | 'fetch'

export interface UaRange {
  from: string
  to: string
  days: number
  clamped: boolean
  requested_from: string
  requested_to: string
  evidence_from: string
}

export interface UaSettingsInfo {
  hash: string
  defaults_hash: string
  schema_version: number
  overridden: string[]
  tier: UaTier | null
}

export interface UaAnalysisInfo {
  computed_at: string | null
  duration_ms: number | null
  cache: 'hit' | 'miss' | 'shared' | 'stale'
  stale: boolean
  /** A newer analysis is being computed: the tab asks again shortly. */
  refreshing?: boolean
  error: string | null
  ttl_s: number | null
  window: { from: string; to: string; days: number } | null
  evidence_window: { from: string; to: string; days: number } | null
  coverage: {
    share: number
    analysed: number
    outside_limits: number
    repositories_per_person: number
  } | null
  unclassified_reasons: Record<string, number> | null
  allocated: number | null
  timings: {
    total_ms?: number | null
    es_ms?: number | null
    db_ms?: number | null
    analysis_ms?: number | null
    sections_ms?: number | null
    requests?: number | null
    inputs_cached?: boolean | null
    peak_rss_mb?: number | null
  }
  settings: UaSettingsInfo
}

export interface UaResponse<T> {
  data: T
  range: UaRange | null
  analysis: UaAnalysisInfo | null
}

export interface UaPagination {
  page: number
  per_page: number
  total_count: number
  has_more: boolean
}

export interface UaTableResponse<Row, Totals = Record<string, number>> {
  data: { rows: Row[]; totals: Totals | null }
  pagination: UaPagination
  counts: Record<string, number>
  threshold: number | null
  display: UaDisplay | null
  range: UaRange
  analysis: UaAnalysisInfo
}

export interface UaDisplay {
  shared_project_threshold: number
  repository_group_threshold: number
  experiments_highlight: number
  platform_people_filter: number
  /** Production days from a personal budget that make a chargeback candidate (scaled to the evidence window). */
  candidate_production_days: number
  scale: number
}

// ---------------------------------------------------------------------------------------------------------------------
// Totals and the CLI summary
// ---------------------------------------------------------------------------------------------------------------------
export interface UaWhoPays {
  charged: number
  shared: number
  personal: number
}

export interface UaTotals {
  total: number
  web: { total: number; assistant: number; workflow: number; datasource: number }
  cli: { total: number }
  charged_back: number
  who_pays: { web: UaWhoPays; cli: UaWhoPays }
  excluded: { no_customer: number; other_proxy: number }
  duration_ms?: number
  cache?: string
}

export interface UaTiles {
  total: number
  web: number
  web_types: { assistant: number; workflow: number; datasource: number }
  cli: number
  cli_people: number
  charged_back: number
  prod: number
  prod_cb: number
  prod_alloc: number
  exp: number
  exp_alloc: number
  exp_parts: Record<'learning' | 'testing' | 'experimental' | 'pet_project', number>
  allocated: number
  ncb: number
  ncb_cli_shared: number
  ncb_cli_personal: number
  ncb_allocated: number
  ncb_web: number
  uncl: number
  /** Part of Unclassified: Production leads, on one kind of evidence or below the confidence. */
  likely_prod: number
  uncl_parts: {
    likely_production: number
    no_repository: number
    too_little_evidence: number
    outside_limits: number
  }
  excluded: { no_customer: number; other_proxy: number }
}

export interface UaCategoryRow {
  category: UaCategory
  spend: number
  classified: number
  allocated: number
  cb: number
  sh: number
  pe: number
  users: number
}

export interface UaReasonRow {
  reason: string
  label: string
  repositories: number
  spend: number
  allocated: number
  remaining: number
}

export interface UaCliSummary {
  tiles: UaTiles
  pie: Array<{ id: string; label: string; value: number }>
  who_pays: { web: UaWhoPays; cli: UaWhoPays }
  categories: UaCategoryRow[]
  reasons: UaReasonRow[]
  coverage: {
    share: number
    analysed: number
    outside_limits: number
    repositories_per_person: number
  }
  display: UaDisplay
}

// ---------------------------------------------------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------------------------------------------------
export interface UaSharedProjectRow {
  id: string
  name: string
  platform: number
  web_sh: number
  cli: number
  cli_sh: number
  cli_exp: number
  cli_potential: number
  ncb: number
  people: number
  prod_pct: number | null
  web_state: 'charged' | 'shared' | 'partial'
  cli_budget: boolean
  budgets: string[]
  cost_center: string | null
  chargeback: boolean
  deleted: boolean
  members: number
  datasources: number
  via: Array<'web' | 'cli'>
  /** The project's Web Platform and CLI spend as a percentage of Total Spend; null without spend in the period. */
  share: number | null
  candidate?: boolean
}

export interface UaGroupRow {
  id: string
  name: string
  grouped: string
  repositories: number
  people: number
  spend: number
  prod: number
  ncb: number
  prod_pct: number
  excluded: boolean
  repos_preview: string[]
  related: string | null
  related_reason: string
  /** The group's CLI spend as a percentage of Total Spend; null without spend in the period. */
  share: number | null
  candidate?: boolean
}

export interface UaPersonRow {
  uid: string
  name: string
  email: string
  city: string
  country: string
  job: string
  total: number
  ncb: number
  platform: number
  cli: number
  prod: number
  exp: number
  uncl: number
  alloc: number
  prod_ncb: number
  /** Paid by project budgets (CLI and Web Platform). */
  charged_back: number
  /** Learning and experiments paid from personal budgets. */
  personal_learning: number
  /** Unclassified CLI and Web Platform paid from personal budgets. */
  personal_other: number
  /** Days on the person's most active production repository paid personally. */
  production_days: number
  shared_no_budget: number
  projects: string
  in_shared_project: boolean
  main_repo: string | null
  main_group: string | null
  /** The person's total spend as a percentage of Total Spend; null without spend in the period. */
  share: number | null
  exp_highlight?: boolean
  /** A chargeback candidate: production work from a personal budget on enough days. */
  candidate?: boolean
}

export type UaPeopleFilter = 'cand' | 'all' | 'prod' | 'exp' | 'shared' | 'platform'

/** How People groups chargeback candidates; "common" takes the first condition another candidate shares. */
export type UaPeopleGroupBy = 'none' | 'common' | 'project' | 'repositories' | 'organization'
export type UaCondition = 'project' | 'repositories' | 'organization'

export interface UaPeopleGroupRow {
  id: string
  condition: UaCondition
  name: string
  label: string
  /** CodeMie project groups: the work runs inside the project, or on repositories linked to it. */
  how: 'inside' | 'linked' | null
  candidates: number
  repositories: number
  amount: number
  estimated: number
  median_days: number
  over_threshold: boolean
}

/** The work no other candidate shares. */
export interface UaPeopleNoneRow {
  id: 'none'
  candidates: number
  amount: number
  estimated: number
  median_days: number
}

export interface UaPeopleSummary {
  tiles: {
    candidates: number
    people_with_production: number
    candidates_production: number
    production: number
    in_groups: number
    groups: number
    groups_over: number
    groups_over_amount: number
  }
  threshold: number
  display: UaDisplay
}

export interface UaPeopleGroupMember {
  uid: string
  name: string
  email: string
  city: string
  country: string
  job: string
  in_group: number
  estimated: number
  prod_ncb: number
  production_days: number
  charged_back: number
  projects: string
  main_repo: string | null
}

export interface UaPeopleGroupDetail {
  row: UaPeopleGroupRow | UaPeopleNoneRow
  members: UaPeopleGroupMember[]
  repositories: Array<{ repository: string; candidates: number; amount: number }>
  facts: {
    condition: UaCondition | null
    how: 'inside' | 'linked' | null
    reason: string | null
    repositories: string[]
  }
  charged_back_same_people: number
  display: UaDisplay
}

export interface UaPersonChargeback {
  candidate: boolean
  production_days: number
  threshold_days: number
  groups: Array<{
    id: string
    condition: UaCondition
    label: string
    amount: number
    others: number
  }>
  alone: number
}

export interface UaBreakdown {
  dimension: 'country' | 'job'
  category: UaCategory
  rows: Array<{ label: string; spend: number }>
  total: number
}

// ---------------------------------------------------------------------------------------------------------------------
// Popups
// ---------------------------------------------------------------------------------------------------------------------
export interface UaModelRow {
  model: string
  spend: number
  cli?: number
  web?: number
}

export interface UaAgentRow {
  client: string
  sessions?: number | null
  spend: number
  sessionless?: boolean
}

export interface UaAsset {
  name: string
  kind: 'Assistant' | 'Workflow' | 'Datasource'
  project?: string | null
  invocations: number
  spend: number
  users?: number | null
  last: string | null
}

export interface UaSharedProjectDetail {
  row: UaSharedProjectRow
  detail: {
    repos: Array<{
      repository: string
      no_repository: boolean
      category: UaCategory
      spend: number
      paid_personally: number
    }>
    cli_people: Array<{ uid: string; name: string; location: string; cli: number }>
    web_people: Array<{ uid: string; name: string; location: string; web: number }>
    cli_people_total: number
    web_people_total: number
    agents: UaAgentRow[]
    models: UaModelRow[]
    web_models?: UaModelRow[]
    models_all?: UaModelRow[]
    assets?: UaAsset[]
    web_types?: { assistant: number; workflow: number; datasource: number }
    cli_fallback: number
    cli_charged_back: number
  }
}

export interface UaVariant {
  value: string
  rule: string
  number: number
  text: string
  people: number
  spend: number
}

export interface UaSignal {
  family: string
  id: string
  category: UaCategory
  points: number
  text: string
}

export interface UaGroupDetail {
  row: UaGroupRow
  detail: {
    why: string[]
    related: { project: string | null; reason: string; text: string }
    oversized: boolean
    categories: Partial<Record<UaCategory, number>>
    repos: Array<{
      repository: string
      kind: string
      owner_person: string | null
      category: UaCategory
      confidence: number
      reason: string | null
      people: number
      sessions: number
      spend: number
      ncb: number
      projects: string
      variants: UaVariant[]
      signals: UaSignal[]
    }>
    models: UaModelRow[]
    agents: UaAgentRow[]
    projects: Array<{ project: string | null; pay: UaPayer; spend: number }>
    people: Array<{
      uid: string
      name: string
      location: string
      repositories: number
      spend: number
    }>
    sessions: number
  }
}

export interface UaPersonDetail {
  row: UaPersonRow
  detail: {
    projects: Array<{ project: string; pay: UaPayer; web: number; cli: number }>
    repos: Array<{
      value: string
      repository: string | null
      group_id: string | null
      group: string | null
      category: UaCategory
      sessions: number
      spend: number
      net_lines: number
      rule: string
      rule_text: string
      pay: UaPayer
    }>
    by_category: Array<{
      category: UaCategory
      sessions: number
      spend: number
      avg_prompts: number
      net_lines: number
    }>
    reasons: Array<{
      kind: 'positive' | 'negative' | 'neutral'
      text: string
      category: UaCategory
    }>
    allocated: Partial<Record<UaCategory, number>>
    sessions: number
    net_lines: number
    cli_charged_back: number
    cli_shared_no_budget: number
    cli_no_customer: number
    models?: UaModelRow[]
    agents?: UaAgentRow[]
    recent?: Array<{
      date: string
      repository: string | null
      branch: string | null
      category: UaCategory
      client: string | null
      framework: string
      turns: number | null
      requests: number
      spend: number
    }>
    assets?: UaAsset[]
    active_days?: number
    project_sessions?: Record<string, number>
    chargeback?: UaPersonChargeback
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Settings and How It Works
// ---------------------------------------------------------------------------------------------------------------------
export type UaSettingType = 'money' | 'int' | 'float' | 'share' | 'bool' | 'list' | 'rules'

export interface UaOwnerRule {
  owner: string
  project: string
}

export type UaSettingValue = number | boolean | string | string[] | UaOwnerRule[]

export interface UaSettingSpec {
  key: string
  group: string
  tier: UaTier
  type: UaSettingType
  label: string
  description: string
  default: UaSettingValue
  min: number | null
  max: number | null
  step: number | null
  unit: string | null
  max_items: number | null
  max_item_length: number | null
}

export interface UaSettingsSchema {
  schema_version: number
  defaults_hash: string
  can_tune: boolean
  /** Recompute: admins and maintainers. */
  can_refresh: boolean
  /** Country, city and job title group come from user enrichment (features:userEnrichmentEnabled). */
  enrichment: boolean
  tuning: {
    enabled: boolean
    roles: string[]
    max_override_bytes: number
    max_custom_computations_per_hour: number
    max_computations_per_hour: number
  }
  tiers: Array<{ id: UaTier; label: string; description: string }>
  groups: Array<{ id: string; label: string; tier: UaTier }>
  settings: UaSettingSpec[]
  fixed: {
    signal_points: Record<string, [UaCategory, number]>
    max_range_days: number
    analysis_cache_minutes: number
    analysis_timeout_seconds: number
    fallback_field_since: string
  }
}

export interface UaStatus {
  tiles: {
    uncl: number
    uncl_parts: UaTiles['uncl_parts']
    allocated: number
    excluded: UaTiles['excluded']
    cli: number
  }
  coverage: UaCliSummary['coverage']
  reasons: UaReasonRow[]
  signals: Array<{
    id: string
    label: string
    family: string
    category: UaCategory
    points: number
    repositories: number
    spend_share: number
    won: number
  }>
  identity: Array<{
    rule: string
    number: number
    label: string
    values: number
    pairs: number
    repositories: number
    spend: number
  }>
  folder_like: Array<{ owner: string; values: number; people: number; shared: number }>
  confidence: Array<{ bucket: string; repositories: number; spend: number }>
  db: Record<string, number>
  counts: Record<string, number>
  run: Record<string, unknown>
  settings: {
    values: Record<string, UaSettingValue>
    defaults: Record<string, UaSettingValue>
    overridden: string[]
    signal_points: Record<string, [UaCategory, number]>
    fixed: Record<string, number>
  }
  display: UaDisplay
}

/** The overrides kept in the browser, per user. */
export interface UaStoredOverrides {
  schemaVersion: number
  defaultsHash: string
  overrides: Record<string, UaSettingValue>
  updatedAt: string
}

/**
 * The `error` of an error response body. `retry_after` (whole seconds) comes with every Retry-After header: unlike the
 * header, the browser does not hide it when the UI and the API are on different origins.
 */
export interface UaErrorBody {
  message: string
  details?: string | object
  help?: string
  retry_after?: number | null
}

export interface UaError {
  message: string
  details?: string | object
  help?: string
  status?: number
  /** Seconds to wait before asking again: `retry_after` of the body, else the Retry-After header. */
  retryAfter?: number | null
}
