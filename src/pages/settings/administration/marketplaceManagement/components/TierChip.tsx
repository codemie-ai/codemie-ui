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

import { FC } from 'react'

import type { UsageTier } from '@/types/generated/marketplaceManagement'

import StatusChip from './StatusChip'

interface TierChipProps {
  tier: string | null | undefined
  className?: string
  /** When provided, the chip itself becomes the hover/focus target for the
   * shared `react-tooltip` provider — no separate icon. */
  tooltip?: string
}

// Usage tier is a temperature scale coming out of the audit engine, based on
// absolute unique-user-count cutoffs (hot_min_users / warm_min_users /
// cold_min_users from the audit config):
// HOT   → wide adoption, actively used (red — signals heat)
// WARM  → moderate steady usage      (amber — needs attention)
// COLD  → low adoption / archival    (muted — dormant)
// DEAD  → below the Cold tier floor  (muted, struck through)
// The engine's UsageTier enum has exactly these four members — there is no
// COOL tier, and offering one filtered the table to zero rows (F-56).
// Every unknown value falls back to the muted "cold" style so we never
// render a raw uppercase enum with no visual hint.
const tierStyles: Record<UsageTier, string> = {
  HOT: 'bg-failed-secondary/15 text-failed-secondary border-failed-secondary/40',
  WARM: 'bg-aborted-primary/15 text-aborted-primary border-aborted-primary/40',
  COLD: 'bg-surface-base-secondary text-text-tertiary border-border-structural',
  DEAD: 'bg-surface-base-secondary text-text-tertiary border-border-structural line-through',
}

// Title-case labels for the tier chip — the sibling BucketChip renders
// "Verified" / "Community" / "Delete" in title case, so ALL-CAPS tier
// text created visual whiplash in adjacent columns.
//
// Exported (with `tierChipLabel` below) so every other surface that shows a
// usage tier — the active-filter chip, any future summary — renders the same
// word this chip does. Previously this map was private and ActiveFiltersStrip
// re-derived its own tier text with a generic humaniser, which only
// uppercased the first character and left an all-caps API value like 'WARM'
// rendering as 'WARM' there while this chip said 'Warm' for the same value
// (EPMCDME-14234, CR-004) — the exact per-surface label drift this file's own
// BucketChip sibling was built to avoid.
export const tierLabel: Record<UsageTier, string> = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
  DEAD: 'Dead',
}

/** Same fallback TierChip itself uses for an unrecognised tier value. */
export const tierChipLabel = (tier: string): string => {
  const key = tier.toUpperCase() as UsageTier
  return tierLabel[key] ?? key.charAt(0) + key.slice(1).toLowerCase()
}

const TierChip: FC<TierChipProps> = ({ tier, className, tooltip }) => {
  if (!tier) return <StatusChip label={null} />

  const key = tier.toUpperCase() as UsageTier
  const styles = tierStyles[key] ?? tierStyles.COLD

  return (
    <StatusChip
      label={tierChipLabel(tier)}
      chipClass={`${styles} tracking-wide`}
      tooltip={tooltip}
      className={className}
    />
  )
}

export default TierChip
