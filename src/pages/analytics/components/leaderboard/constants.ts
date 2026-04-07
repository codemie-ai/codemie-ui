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

export const TIER_CONFIG = {
  pioneer: {
    label: 'Pioneer',
    color: '#fbbf24',
    level: 5,
    threshold: 80,
    description: 'Top AI practitioners demonstrating excellence across multiple dimensions.',
  },
  expert: {
    label: 'Expert',
    color: '#94a3b8',
    level: 4,
    threshold: 65,
    description: 'Strong AI users with broad capability and consistent high-quality usage.',
  },
  advanced: {
    label: 'Advanced',
    color: '#f97316',
    level: 3,
    threshold: 45,
    description: 'Solid AI practitioners with good breadth across platform and CLI.',
  },
  practitioner: {
    label: 'Practitioner',
    color: '#818cf8',
    level: 2,
    threshold: 25,
    description: 'Growing AI users building capability across key dimensions.',
  },
  newcomer: {
    label: 'Newcomer',
    color: '#6b7280',
    level: 1,
    threshold: 0,
    description: 'Early-stage users beginning their AI journey.',
  },
} as const

export type TierName = keyof typeof TIER_CONFIG

export const INTENT_CONFIG = {
  sdlc_unicorn: {
    label: 'SDLC Unicorn',
    emoji: '\u{1F984}',
    color: '#a855f7',
    description:
      'Excels across CLI engineering, platform creation, workflow usage, and knowledge sharing.',
  },
  developer: {
    label: 'Developer',
    emoji: '\u{1F4BB}',
    color: '#ef4444',
    description:
      'Primarily uses CLI and coding agents for real engineering work with strong delivery throughput.',
  },
  workflow_architect: {
    label: 'Workflow Architect',
    emoji: '\u{1F9E9}',
    color: '#f59e0b',
    description:
      'Creates sophisticated, original workflows with complex configurations and advanced patterns.',
  },
  workflow_user: {
    label: 'Workflow User',
    emoji: '\u{1F504}',
    color: '#10b981',
    description:
      'Actively executes workflows with high volume, success rate, and repeat usage patterns.',
  },
  platform_builder: {
    label: 'Platform Builder',
    emoji: '\u{1F6E0}\u{FE0F}',
    color: '#06b6d4',
    description: 'Creates mature platform assets with depth and configuration quality.',
  },
  ai_user: {
    label: 'AI User',
    emoji: '\u{1F91D}',
    color: '#6366f1',
    description:
      'Consistently uses the platform for conversations, assistant consumption, and day-to-day AI-assisted work.',
  },
  explorer: {
    label: 'Explorer',
    emoji: '\u{1F331}',
    color: '#6b7280',
    description:
      'Early-stage or light user exploring the platform without strong specialization yet.',
  },
} as const

export type IntentId = keyof typeof INTENT_CONFIG

export const DIMENSION_CONFIG: Record<
  string,
  { label: string; name: string; color: string; weight: number; icon: string; description?: string }
> = {
  d1: {
    label: 'D1',
    name: 'Core Platform Usage',
    color: '#6366f1',
    weight: 0.15,
    icon: '\u{1F4CA}',
  },
  d2: {
    label: 'D2',
    name: 'Core Platform Creation',
    color: '#06b6d4',
    weight: 0.2,
    icon: '\u{1F6E0}\u{FE0F}',
  },
  d3: { label: 'D3', name: 'Workflow Usage', color: '#10b981', weight: 0.15, icon: '\u{1F504}' },
  d4: { label: 'D4', name: 'Workflow Creation', color: '#f59e0b', weight: 0.1, icon: '\u{1F9E9}' },
  d5: {
    label: 'D5',
    name: 'CLI & Agentic Engineering',
    color: '#ef4444',
    weight: 0.3,
    icon: '\u{1F4BB}',
  },
  d6: { label: 'D6', name: 'Impact & Knowledge', color: '#8b5cf6', weight: 0.1, icon: '\u{1F4A1}' },
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
  ...Object.entries(INTENT_CONFIG).map(([id, cfg]) => ({
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
