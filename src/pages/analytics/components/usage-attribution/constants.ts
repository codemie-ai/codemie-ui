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

import type { UaCategory, UaPayer } from '@/types/usageAttribution'

export const UA_CATEGORIES: UaCategory[] = [
  'production',
  'learning',
  'testing',
  'experimental',
  'pet_project',
  'unclassified',
]

export const UA_EXPERIMENTS: UaCategory[] = ['learning', 'testing', 'experimental', 'pet_project']

export const UA_CATEGORY_LABELS: Record<UaCategory, string> = {
  production: 'Production',
  learning: 'Learning',
  testing: 'Testing',
  experimental: 'Experimental',
  pet_project: 'Pet Project',
  unclassified: 'Unclassified',
}

/** Fixed category colours (classification-model.md §4): theme tokens, resolved at render time. */
export const UA_CATEGORY_COLOR_TOKENS: Record<UaCategory | 'platform' | 'experiments', string> = {
  production: '--colors-surface-specific-charts-green',
  learning: '--colors-surface-specific-charts-blue',
  testing: '--colors-surface-specific-charts-cyan',
  experimental: '--colors-surface-specific-charts-purple',
  pet_project: '--colors-surface-specific-charts-yellow',
  unclassified: '--colors-not-started-primary',
  platform: '--colors-in-progress-secondary',
  experiments: '--colors-surface-specific-charts-purple',
}

export const UA_CATEGORY_FALLBACK_COLORS: Record<UaCategory | 'platform' | 'experiments', string> =
  {
    production: '#259F4C',
    learning: '#2297F6',
    testing: '#06B6D4',
    experimental: '#8B5CF6',
    pet_project: '#F5A534',
    unclassified: '#A3A5A8',
    platform: '#0B5FA8',
    experiments: '#8B5CF6',
  }

/** Likely production: the Production colour, lighter, as it is less certain. */
export const UA_LIKELY_PRODUCTION_OPACITY = 0.5

export const UA_PAYER_LABELS: Record<UaPayer, string> = {
  charged: 'Charged back',
  shared: 'Shared project, no budget',
  personal: 'Personal project',
}

export const UA_PAYER_COLOR_TOKENS: Record<UaPayer, string> = {
  charged: '--colors-surface-specific-charts-green',
  shared: '--colors-surface-specific-charts-yellow',
  personal: '--colors-surface-specific-charts-purple',
}

export const UA_PAYER_FALLBACK_COLORS: Record<UaPayer, string> = {
  charged: '#259F4C',
  shared: '#F5A534',
  personal: '#8B5CF6',
}

export const UA_BUDGET_LABELS: Record<string, string> = {
  platform: 'Platform',
  cli: 'CLI',
  premium_models: 'Premium models',
}

export const UA_SUB_TABS = [
  { label: 'Overview', value: 'overview' },
  { label: 'People', value: 'people' },
  { label: 'How It Works', value: 'how' },
] as const

export type UaSubTab = (typeof UA_SUB_TABS)[number]['value']

/** While a newer analysis is computed: how often the tab asks again, and for how long (10 minutes). */
export const UA_POLL_MS = 10_000
export const UA_MAX_POLLS = 60

export const UA_RELATED_REASONS: Record<string, string> = {
  budgeted_reuse: 'A budgeted project already used on these repositories',
  datasource: 'A matching Git datasource',
  membership: 'The project at least half of its people belong to',
  owner_rule: 'An owner rule',
  none: 'None',
}

export const UA_REASON_LABELS: Record<string, string> = {
  likely_production: 'Likely production',
  no_repository: 'No repository (desktop and IDE clients)',
  too_little_evidence: 'Too little evidence',
  outside_limits: 'Outside the limits',
  low_confidence: 'Below the minimum confidence',
  production_one_family: 'Production evidence from one family',
  no_evidence: 'No evidence',
  tie: 'Tie between two categories',
}

export const UA_FAMILY_LABELS: Record<string, string> = {
  where: 'Where',
  who: 'Who',
  how: 'How',
  names: 'Names',
}

/** Per-user browser storage of the analysis settings overrides (utils/storage compound key). */
export const UA_OVERRIDES_STORAGE_KEY = 'usageAttribution.settingsOverrides'
/** URL fragment that carries shared settings (never sent to the server). */
export const UA_LINK_PARAM = 'ua'

export const UA_TABLE_PAGE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]
