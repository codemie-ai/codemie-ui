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

import TooltipButton from '@/components/TooltipButton/TooltipButton'
import type { AuditConfigResponse } from '@/types/generated/marketplaceManagement'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

const createCustomCol = (key: string, label: string, headClassNames: string): ColumnDefinition => ({
  key,
  label,
  type: DefinitionTypes.Custom,
  headClassNames,
})

// Width classes MUST be written as complete literals. Tailwind's JIT scans
// source text, so a class assembled at runtime (`w-[${width}]`) is never
// generated and every column silently fell back to auto width.
export const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  // Selection column (F-45). The cleanup queue lists exactly the assistants an
  // admin has decided to remove from the marketplace, so acting on them one
  // hover-menu at a time was the missing half of the feature.
  { key: 'select', type: DefinitionTypes.Selection, headClassNames: '!w-[4%]' },
  { ...createCustomCol('assistant', 'Assistant', 'w-[24%]'), headerNoWrap: false, sortable: true },
  { ...createCustomCol('creator', 'Creator', 'w-[10%]'), headerNoWrap: false },
  { ...createCustomCol('users', 'Users', 'w-[6%]'), sortable: true },
  { ...createCustomCol('likes', 'Likes', 'w-[6%]'), sortable: true },
  { ...createCustomCol('tier', 'Tier', 'w-[8%]') },
  { ...createCustomCol('bucket', 'Bucket', 'w-[10%]'), headerNoWrap: false },
  { ...createCustomCol('decision', 'Decision', 'w-[8%]'), headerNoWrap: false },
  { ...createCustomCol('open', '', 'w-[5%]') },
]

/**
 * Column header with an inline info-icon tooltip.
 *
 * `TooltipButton` renders its own `InfoSvg` and does not accept children —
 * this component uses the sibling pattern (label + self-closing TooltipButton).
 */
export function HeaderWithInfo({
  label,
  tooltip,
  className,
}: Readonly<{
  label: string
  tooltip: string
  className?: string
}>) {
  return (
    <span className={`flex items-center gap-1 ${className ?? ''}`}>
      {label}
      <TooltipButton content={tooltip} />
    </span>
  )
}

/**
 * Returns the column-header tooltip strings, interpolating live
 * threshold values from the current audit configuration when available and
 * falling back to placeholder text when the config has not loaded yet.
 *
 * Tier tooltip uses the audit engine's absolute unique-user-count cutoffs.
 * Bucket tooltip describes layered assignment logic — no threshold values.
 */
export function getColumnTooltips(config: AuditConfigResponse | null): {
  tier: string
  bucket: string
  decision: string
} {
  const hot = config?.verification?.hot_min_users ?? '?'
  const warm = config?.verification?.warm_min_users ?? '?'
  const cold = config?.verification?.cold_min_users ?? '?'
  return {
    tier: `Usage tier for this assistant, based on its unique-user count. Hot = ${hot}+ users; Warm = ${warm}–${hot} users; Cold = ${cold}–${warm} users; Dead = below ${cold} users. Cutoffs come from the current audit configuration.`,
    bucket:
      'Marketplace qualification bucket, assigned by layered rules combining verdict, usage tier, and quality-gate results. Qualified = passed core quality gates — hot or warm tier (warm with at most one polish gap also qualifies), or cold tier when fully polished and has ≥2 users; Community = in marketplace but flagged — gate failures, minor polish gaps, or dead-tier grace window; Delete = flagged for removal due to a cleanup verdict (duplicate, invalid, or dead), an oversized similar-assistant cluster, a cold-tier assistant that failed core gates, or a cold-tier assistant that stalled past its grace period without growing.',
    decision:
      "The audit engine's verdict for this assistant. Cleanup = recommended for removal; Review = requires human review; Keep = the assistant itself needs no changes — check Bucket for its marketplace visibility status.",
  }
}

/**
 * Per-tier cell tooltip — absolute unique-user-count cutoffs from the
 * current audit configuration.
 */
export function getTierTooltip(tier: string, config: AuditConfigResponse | null): string {
  const hot = config?.verification?.hot_min_users ?? '?'
  const warm = config?.verification?.warm_min_users ?? '?'
  const cold = config?.verification?.cold_min_users ?? '?'
  const tooltips: Record<string, string> = {
    HOT: `Hot — ${hot}+ unique users`,
    WARM: `Warm — ${warm}–${hot} unique users`,
    COLD: `Cold — ${cold}–${warm} unique users`,
    DEAD: `Dead — below ${cold} unique users`,
  }
  return tooltips[tier.toUpperCase()] ?? tier
}

/**
 * Per-bucket cell tooltip — layered assignment logic description only.
 * Must not reference percentile ranks per spec constraint.
 */
export function getBucketTooltip(bucket: string): string {
  const tooltips: Record<string, string> = {
    VERIFIED: 'Qualified — passed core gates with hot, warm, or fully-polished cold tier',
    COMMUNITY: 'Community — gate failure, polish gaps, or dead-tier grace window',
    DELETE:
      'Delete — cleanup verdict, oversized cluster, cold tier with gate failures, or cold tier stalled past its grace period',
  }
  return tooltips[bucket.toUpperCase()] ?? bucket
}
