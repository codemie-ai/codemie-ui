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

import { CHECK_LABEL } from '@/pages/settings/administration/MarketplaceOverviewPage'
import type {
  CoreGatesConfig,
  GatesConfig,
  PolishCheckResult,
} from '@/types/generated/marketplaceManagement'

// Core quality gate rules — covered separately in the Core section.
export const CORE_RULES = new Set(['description_length', 'system_prompt_length', 'substance'])

// The 4 critical non-core gates shown always (pass or fail) in Quality rule findings.
// Mirrors the REGISTRY in codemie/validator/gates.py — update both together.
export const QUALITY_GATE_RULES = [
  'name_length',
  'name_not_banned',
  'at_least_one_category',
  'no_inline_credentials',
]
export const QUALITY_GATE_RULE_SET = new Set(QUALITY_GATE_RULES)

export const getCoreGateLabel = (
  rule: string,
  coreGates: CoreGatesConfig | null | undefined
): string => {
  switch (rule) {
    case 'description_length':
      return `Description ≥ ${coreGates?.description_min ?? '?'} chars`
    case 'system_prompt_length':
      return `System prompt ≥ ${coreGates?.system_prompt_min ?? '?'} chars`
    case 'substance':
      return 'Has substance (tools/prompt)'
    default:
      return rule
  }
}

export const getQualityGateLabel = (
  rule: string,
  gates: GatesConfig | null | undefined
): string => {
  if (rule === 'name_length') {
    return gates != null
      ? `Name ${gates.name_min}–${gates.name_max} chars`
      : CHECK_LABEL.name_length
  }
  return CHECK_LABEL[rule as keyof typeof CHECK_LABEL] ?? rule
}

export const getPolishCheckLabel = (
  check: string,
  result: PolishCheckResult | undefined
): string => {
  const t = result?.threshold
  switch (check) {
    case 'description':
      return typeof t === 'number' ? `Description ≥ ${t} chars` : 'Description'
    case 'categories':
      return typeof t === 'number' ? `${t}+ categories` : 'Categories'
    case 'icon':
      return 'Icon set'
    case 'starters':
      return typeof t === 'number' ? `${t}+ conversation starters` : 'Conversation starters'
    default:
      return check
  }
}

export function getUsageVerdict(tierKey: string | undefined): boolean | 'warning' | null {
  if (tierKey === 'HOT') return true
  if (tierKey === 'WARM') return 'warning'
  if (tierKey === 'COLD' || tierKey === 'DEAD') return false
  return null
}

export function getUsageVerdictLabel(tierKey: string | undefined): string | undefined {
  const labels: Record<string, string> = { HOT: 'High', WARM: 'Active', COLD: 'Low', DEAD: 'Low' }
  return tierKey != null ? labels[tierKey] : undefined
}

export function getPolishTarget(tierKey: string | undefined): string | null {
  if (tierKey === 'HOT') return 'not required'
  if (tierKey === 'WARM') return 'target ≤ 1'
  if (tierKey === 'COLD' || tierKey === 'DEAD') return 'target = 0'
  return null
}

export function getPolishVerdict(
  polishChecks: PolishCheckResult[] | null | undefined,
  tierKey: string | undefined,
  failureCount: number
): boolean | null {
  if (polishChecks == null) return null
  if (tierKey === 'HOT') return true
  if (tierKey === 'WARM') return failureCount <= 1
  return failureCount === 0
}
