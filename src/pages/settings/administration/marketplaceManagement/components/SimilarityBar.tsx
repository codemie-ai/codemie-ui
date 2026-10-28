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

interface SimilarityBarProps {
  topSimilarScore: number | null | undefined
  thresholds: { critical: number; optional: number } | null | undefined
}

const SimilarityBar: FC<SimilarityBarProps> = ({ topSimilarScore, thresholds }) => {
  if (thresholds == null) {
    return (
      <div
        data-testid="similarity-bar-placeholder"
        className="h-1.5 rounded-full bg-border-structural"
      />
    )
  }

  const pct = topSimilarScore != null ? Math.max(0, Math.min(100, topSimilarScore * 100)) : 0

  const getFillClass = () => {
    if (topSimilarScore == null) return null
    if (topSimilarScore >= thresholds.critical) return 'bg-failed-secondary'
    if (topSimilarScore >= thresholds.optional) return 'bg-aborted-primary'
    return 'bg-success-primary'
  }
  const fillClass = getFillClass()

  const marks = [
    {
      pct: thresholds.optional * 100,
      label: 'Optional',
      value: Math.round(thresholds.optional * 100),
    },
    {
      pct: thresholds.critical * 100,
      label: 'Critical',
      value: Math.round(thresholds.critical * 100),
    },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <div // NOSONAR: native <progress> cannot render the per-tier fill color (browser paints its own green fill); a div track keeps the semantic color.
          className="h-1.5 w-full overflow-hidden rounded-full bg-border-structural"
          role="progressbar"
          aria-valuenow={topSimilarScore != null ? Math.round(pct) : undefined}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {fillClass && (
            <div
              data-testid="similarity-bar-fill"
              className={cn('h-full rounded-full', fillClass)}
              style={{ width: `${pct}%` }}
              aria-hidden="true"
            />
          )}
        </div>
        {marks.map(({ pct: mPct, label }) => (
          <div
            key={label}
            className="absolute -top-[3px] h-3 w-0.5 rounded-sm bg-border-specific-panel-outline"
            style={{ left: `${mPct}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="relative h-3.5">
        {marks.map(({ pct: mPct, label, value }) => {
          const isRight = mPct >= 100
          return (
            <span
              key={label}
              className="absolute whitespace-nowrap text-[10px] leading-none text-text-tertiary"
              style={isRight ? { right: 0 } : { left: `${mPct}%`, transform: 'translateX(-50%)' }}
            >
              {label} ≥ {value}%
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default SimilarityBar
