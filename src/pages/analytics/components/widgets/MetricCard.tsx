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
import { formatMetricValue } from '@/utils/analyticsFormatters'

interface MetricCardProps {
  metric: Metric
  mutedTextClassName?: string
  badge?: ReactNode
  valueClassName?: string
  valueOverride?: ReactNode
}

const MetricCard: FC<MetricCardProps> = ({
  metric,
  mutedTextClassName = 'text-text-quaternary',
  badge,
  valueClassName = 'text-lg sm:text-xl font-semibold leading-snug tracking-tight text-text-primary break-all [font-variant-numeric:tabular-nums]',
  valueOverride,
}) => {
  return (
    <div className="bg-surface-elevated rounded-md p-3 border border-border-specific-panel-outline shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p
          className={`min-w-0 text-[11px] font-semibold uppercase tracking-[0.03em] leading-4 line-clamp-2 ${mutedTextClassName}`}
        >
          {metric.label}
        </p>
        {badge}
      </div>
      {valueOverride || (
        <p className={valueClassName}>{formatMetricValue(metric.value, metric.format)}</p>
      )}
      {metric.description && (
        <p className={`mt-1 text-[11px] leading-5 line-clamp-3 ${mutedTextClassName}`}>
          {metric.description}
        </p>
      )}
    </div>
  )
}

export default MetricCard
