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

import { FC, ReactNode } from 'react'

import { Metric } from '@/types/analytics'
import { formatMetricQualification, formatMetricValue } from '@/utils/analyticsFormatters'
import { capitalize } from '@/utils/helpers'
import { cn } from '@/utils/utils'

// `break-words`, not `break-all`: a long unbroken number wraps instead of overflowing. The qualification
// below sets its own rule. Exported so a `valueOverride` can keep the card's value typography.
export const METRIC_VALUE_CLASS_NAME =
  'text-lg font-semibold leading-snug tracking-tight text-text-primary break-words [font-variant-numeric:tabular-nums]'

interface MetricCardProps {
  metric: Metric
  mutedTextClassName?: string
  badge?: ReactNode
  valueClassName?: string
  valueColorClassName?: string
  valueOverride?: ReactNode
}

const MetricCard: FC<MetricCardProps> = ({
  metric,
  mutedTextClassName = 'text-text-quaternary',
  badge,
  valueClassName = METRIC_VALUE_CLASS_NAME,
  valueColorClassName,
  valueOverride,
}) => {
  const qualification = formatMetricQualification(metric)
  return (
    <div className="bg-surface-elevated rounded-md p-3 border border-border-specific-panel-outline shadow-sm">
      {/* Phones: the label keeps its own line and a period badge goes below it. */}
      <div className="mb-1 flex items-start justify-between gap-2 max-sm:flex-wrap max-sm:gap-1">
        <p
          className={`min-w-0 text-[11px] font-semibold uppercase tracking-[0.03em] leading-4 line-clamp-2 max-sm:basis-full ${mutedTextClassName}`}
        >
          {metric.label}
        </p>
        {badge}
      </div>
      {valueOverride || (
        <p className={cn(valueClassName, valueColorClassName)}>
          {formatMetricValue(metric.value, metric.format)}
          {/* Its own smaller line: at the figure's size, the qualification suffix does not fit a
              narrow card. `-mr-3` hands it the card's right padding (`p-3`), so a word wider than the content
              box but not the card stays whole, and `break-words` splits only a word wider than that - one
              that would otherwise draw onto the next card. */}
          {qualification && (
            <span className="-mr-3 block break-words text-[11px] font-normal leading-4 tracking-normal text-text-quaternary">
              {qualification}
            </span>
          )}
        </p>
      )}
      {metric.description && (
        <p className={`mt-1 text-[11px] leading-5 line-clamp-3 ${mutedTextClassName}`}>
          {/* Captions come from many builders and the backend; start every one with a capital. */}
          {capitalize(metric.description)}
        </p>
      )}
    </div>
  )
}

export default MetricCard
