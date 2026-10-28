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

import { cn } from '@/utils/utils'

import { reasonLabel } from './ReasonChip'
import { tierChipLabel } from './TierChip'

export type ActiveFilterKind = 'mcp' | 'category' | 'reason' | 'tier' | 'verdict' | 'rule'

interface ActiveFiltersStripProps {
  mcp: string | null
  category: string | null
  /**
   * Reason and tier are included because both can be set from a link (the
   * Overview drill-downs) while the Reason dropdown has no matching option to
   * display. Without a chip the admin saw a narrowed table with nothing on
   * screen explaining why.
   */
  reason: string | null
  tier: string | null
  /** Already-humanised Decision label (Keep / Review / Cleanup), or null. */
  verdictLabel: string | null
  /** Already-humanised quality-check label, or null. */
  ruleLabel: string | null
  onClear: (kind: ActiveFilterKind) => void
  /**
   * Optional: the filter bar already renders a labelled "Clear all". Pass
   * this only where the strip is shown without that bar, so the two never
   * appear on screen together.
   */
  onClearAll?: () => void
  className?: string
}

interface FilterChipProps {
  kind: string
  label: string
  value: string
  onRemove: () => void
}

const FilterChip: FC<FilterChipProps> = ({ kind, label, value, onRemove }) => (
  <span
    data-testid={`active-filter-${kind}`}
    className="inline-flex items-center gap-1 rounded-full border border-border-structural bg-surface-base-secondary px-2.5 py-0.5 text-xs text-text-primary"
  >
    <span className="text-text-secondary font-medium">{label}:</span>
    <span className="font-semibold">{value}</span>
    <button
      type="button"
      onClick={onRemove}
      className="ml-0.5 flex-shrink-0 text-text-secondary hover:text-text-primary focus:outline-none"
      aria-label={`Remove ${label} filter`}
    >
      ×
    </button>
  </span>
)

const ActiveFiltersStrip: FC<ActiveFiltersStripProps> = ({
  mcp,
  category,
  reason,
  tier,
  verdictLabel,
  ruleLabel,
  onClear,
  onClearAll,
  className,
}) => {
  const hasFilters =
    mcp != null ||
    category != null ||
    reason != null ||
    tier != null ||
    verdictLabel != null ||
    ruleLabel != null

  if (!hasFilters) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span className="font-semibold text-text-secondary uppercase tracking-wide">
        Active Filters:
      </span>

      {mcp != null && (
        <FilterChip kind="mcp" label="MCP" value={mcp} onRemove={() => onClear('mcp')} />
      )}

      {category != null && (
        <FilterChip
          kind="category"
          label="Category"
          value={category}
          onRemove={() => onClear('category')}
        />
      )}

      {reason != null && (
        <FilterChip
          kind="reason"
          label="Reason"
          value={reasonLabel(reason)}
          onRemove={() => onClear('reason')}
        />
      )}

      {tier != null && (
        <FilterChip
          kind="tier"
          label="Tier"
          value={tierChipLabel(tier)}
          onRemove={() => onClear('tier')}
        />
      )}

      {verdictLabel != null && (
        <FilterChip
          kind="verdict"
          label="Decision"
          value={verdictLabel}
          onRemove={() => onClear('verdict')}
        />
      )}

      {ruleLabel != null && (
        <FilterChip
          kind="rule"
          label="Failed check"
          value={ruleLabel}
          onRemove={() => onClear('rule')}
        />
      )}

      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-text-secondary underline hover:text-text-primary focus:outline-none"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default ActiveFiltersStrip
