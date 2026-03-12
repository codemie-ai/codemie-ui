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

import { FC, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'
import { type AnalyticsQueryParams, OverviewMetricType, SummariesResponse } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

import AnalyticsWidget from '../AnalyticsWidget'

interface Props {
  type: OverviewMetricType
  filters?: AnalyticsQueryParams
}

/**
 * Metrics widget component
 * Displays summary metrics as cards
 * Data is fetched by the parent AnalyticsDashboard component
 */
const MetricsWidget: FC<Props> = ({ type, filters }: Props) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [summaries, setSummaries] = useState<SummariesResponse | null>(null)

  useEffect(() => {
    analyticsStore.fetchSummaries(type, filters).then((result) => {
      setSummaries(result)
    })
  }, [filters])

  const renderMetrics = () => {
    if (!summaries) return null

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaries.data.metrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline"
          >
            <p className="text-sm text-text-quaternary mb-1 font-bold">{metric.label}</p>
            <p className="text-2xl font-bold text-text-primary">
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

  return (
    <AnalyticsWidget
      title="Summary Metrics"
      description="High-level overview of usage and costs"
      loading={loading[type]}
      error={error[type]}
    >
      {renderMetrics()}
    </AnalyticsWidget>
  )
}

export default MetricsWidget
