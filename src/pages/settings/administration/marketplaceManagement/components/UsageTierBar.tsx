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

import type { AuditConfigResponse } from '@/types/generated/marketplaceManagement'
import { cn } from '@/utils/utils'

interface UsageTierBarProps {
  usage_tier: string | null | undefined
  unique_users_count: number | null | undefined
  usageTiers: AuditConfigResponse['usage_tiers'] | null | undefined
  verification: AuditConfigResponse['verification'] | null | undefined
}

// Maps the tier string (HOT/WARM/COLD/DEAD from the backend UsageTier enum)
// to a fill colour. HOT is the healthiest tier; COLD and DEAD are cleanup
// candidates and are shown in the failed palette.
const TIER_FILL: Record<string, string> = {
  HOT: 'bg-success-primary',
  WARM: 'bg-aborted-primary',
  COLD: 'bg-failed-secondary',
  DEAD: 'bg-failed-secondary',
}

const UsageTierBar: FC<UsageTierBarProps> = ({
  usage_tier,
  unique_users_count,
  usageTiers,
  verification,
}) => {
  if (usageTiers == null || usage_tier == null) {
    return (
      <div
        data-testid="usage-tier-bar-placeholder"
        className="h-1.5 rounded-full bg-border-structural"
      />
    )
  }

  const tierKey = usage_tier.toUpperCase()
  const fillClass = TIER_FILL[tierKey] ?? 'bg-aborted-primary'

  const userCount = unique_users_count ?? 0

  if (verification == null) {
    return (
      <div
        data-testid="usage-tier-bar-placeholder"
        className="h-1.5 rounded-full bg-border-structural"
      />
    )
  }

  const coldMin = verification.cold_min_users
  const warmMin = verification.warm_min_users
  const hotMin = verification.hot_min_users

  const max = hotMin
  const fillPct = max > 0 ? Math.min((userCount / max) * 100, 100) : 0

  const marks = [
    { pct: (coldMin / max) * 100, label: 'Cold', value: coldMin },
    { pct: (warmMin / max) * 100, label: 'Warm', value: warmMin },
    { pct: (hotMin / max) * 100, label: 'Hot', value: hotMin },
  ]

  return (
    <div className="flex flex-col gap-2">
      {/* Bar track + fill + tick marks */}
      <div className="relative">
        <div // NOSONAR: native <progress> cannot render the per-tier fill color (browser paints its own green fill); a div track keeps the semantic color.
          className="h-1.5 w-full overflow-hidden rounded-full bg-border-structural"
          role="progressbar"
          aria-valuenow={userCount}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            data-testid="usage-tier-bar-fill"
            className={cn('h-full rounded-full', fillClass)}
            style={{ width: `${fillPct}%` }}
            aria-hidden="true"
          />
        </div>
        {marks.map(({ pct, label }) => (
          <div
            key={label}
            className="absolute -top-[3px] h-3 w-0.5 rounded-sm bg-border-specific-panel-outline"
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Tier threshold labels */}
      <div className="relative h-3.5">
        {marks.map(({ pct, label, value }) => {
          const isRight = pct >= 100
          return (
            <span
              key={label}
              className="absolute whitespace-nowrap text-[10px] leading-none text-text-tertiary"
              style={isRight ? { right: 0 } : { left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              {label} ≥ {value}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default UsageTierBar
