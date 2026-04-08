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

export const TIER_COLORS: Record<string, string> = {
  pioneer: '#fbbf24',
  expert: '#94a3b8',
  advanced: '#f97316',
  practitioner: '#818cf8',
  newcomer: '#6b7280',
}

export const INTENT_DISPLAY: Record<string, { label: string; emoji: string; color: string }> = {
  sdlc_unicorn: { label: 'SDLC Unicorn', emoji: '\u{1F984}', color: '#a855f7' },
  developer: { label: 'Developer', emoji: '\u{1F4BB}', color: '#ef4444' },
  workflow_architect: { label: 'Workflow Architect', emoji: '\u{1F9E9}', color: '#f59e0b' },
  workflow_user: { label: 'Workflow User', emoji: '\u{1F504}', color: '#10b981' },
  platform_builder: { label: 'Platform Builder', emoji: '\u{1F6E0}\u{FE0F}', color: '#06b6d4' },
  ai_user: { label: 'AI User', emoji: '\u{1F91D}', color: '#6366f1' },
  explorer: { label: 'Explorer', emoji: '\u{1F331}', color: '#6b7280' },
}

export const DIMENSION_COLORS: Record<string, string> = {
  d1: '#6366f1',
  d2: '#06b6d4',
  d3: '#10b981',
  d4: '#f59e0b',
  d5: '#ef4444',
  d6: '#8b5cf6',
}

/** Map API icon string IDs to emojis. */
export const ICON_MAP: Record<string, string> = {
  chart: '\u{1F4CA}',
  tool: '\u{1F6E0}\u{FE0F}',
  refresh: '\u{1F504}',
  puzzle: '\u{1F9E9}',
  terminal: '\u{1F4BB}',
  lightbulb: '\u{1F4A1}',
}

export const TIER_FILTER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'pioneer', label: 'Pioneer' },
  { value: 'expert', label: 'Expert' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'newcomer', label: 'Newcomer' },
]

export const INTENT_FILTER_OPTIONS = [
  { value: '', label: 'All Intents' },
  ...Object.entries(INTENT_DISPLAY).map(([id, cfg]) => ({
    value: id,
    label: `${cfg.emoji} ${cfg.label}`,
  })),
]

export const LEADERBOARD_VIEW_OPTIONS = [
  { value: 'current', label: 'Current 30 days' },
  { value: 'monthly', label: 'Monthly champions' },
  { value: 'quarterly', label: 'Quarterly champions' },
] as const

export const DIMENSION_TOOLTIPS: Record<string, string> = {
  d1_score: 'D1: Core Platform Usage (20%)',
  d2_score: 'D2: Core Platform Creation (20%)',
  d3_score: 'D3: Workflow Usage (10%)',
  d4_score: 'D4: Workflow Creation (10%)',
  d5_score: 'D5: CLI & Agentic Engineering (30%)',
  d6_score: 'D6: Impact & Knowledge (10%)',
}

export const MEDAL_ICONS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'] as const

export const METRIC_LABELS: Record<string, string> = {
  active_days: 'Active Days',
  platform_active_days: 'Platform Active Days',
  web_conversations: 'Web Conversations',
  assistants_used: 'Assistants Used',
  assistants_created: 'Assistants Created',
  skills_created: 'Skills Created',
  datasources_created: 'Datasources Created',
  workflows_created: 'Workflows Created',
  workflow_executions: 'Workflow Executions',
  cli_sessions: 'CLI Sessions',
  cli_repos: 'CLI Repos',
  total_lines_added: 'Lines Added',
  total_spend: 'Total Spend',
  cli_spend: 'CLI Spend',
  shared_conversations: 'Shared Conversations',
  kata_completed: 'Katas Completed',
}

export const CURRENCY_METRIC_KEYS = ['total_spend', 'cli_spend']
