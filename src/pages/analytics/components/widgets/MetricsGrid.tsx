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

import { CliSummaryResponse, SummariesResponse, WidgetSize } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { cn } from '@/utils/utils'

import TimePeriodBadge from './TimePeriodBadge'

interface MetricsGridProps {
  size?: WidgetSize
  data: SummariesResponse | CliSummaryResponse | null
  isExpanded?: boolean
  selectedMetrics?: string[]
}

/**
 * Reusable metrics grid component
 * Displays metrics in a responsive card grid layout
 * If selectedMetrics is provided, only displays those metrics
 */
const MetricsGrid: FC<MetricsGridProps> = ({ data, size, isExpanded, selectedMetrics }) => {
  if (!data) return null

  const metricsToDisplay =
    selectedMetrics && selectedMetrics.length > 0
      ? data.data.metrics.filter((metric) => selectedMetrics.includes(metric.id))
      : data.data.metrics

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4',
        size === WidgetSize.HALF && !isExpanded && 'xl:grid-cols-3 md:grid-cols-2'
      )}
    >
      {metricsToDisplay.map((metric) => (
        <div
          key={metric.id}
          className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm text-text-quaternary font-bold truncate">{metric.label}</p>
            {metric.fixed_timeframe && (
              <TimePeriodBadge
                label={metric.fixed_timeframe}
                tooltip="Time filters are ignored for this metric. It always reflects its own fixed window."
              />
            )}
          </div>
          <p className="text-2xl font-bold text-text-primary break-words">
            {formatMetricValue(metric.value, metric.format)}
          </p>
          {metric.description && (
            <p className="text-xs text-text-quaternary mt-2">{metric.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default MetricsGrid
