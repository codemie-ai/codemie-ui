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
import {
  OverviewMetricType,
  SummariesResponse,
  WidgetSize,
  type AnalyticsQueryParams,
} from '@/types/analytics'

import AnalyticsWidget from '../AnalyticsWidget'
import MetricsGrid from './MetricsGrid'

interface DynamicOverviewWidgetProps {
  metricType: OverviewMetricType
  title: string
  description?: string
  filters: AnalyticsQueryParams
  size: WidgetSize
  selectedMetrics?: string[]
  expandable?: boolean
}

/**
 * Dynamic overview widget component
 * Displays overview metrics based on the metric type
 * Supports: summaries, cli-summary, ai-adoption-overview, ai-adoption-maturity
 */
const DynamicOverviewWidget: FC<DynamicOverviewWidgetProps> = ({
  metricType,
  title,
  description,
  filters,
  size,
  selectedMetrics,
  expandable = true,
}) => {
  const [summaries, setSummaries] = useState<SummariesResponse | null>(null)
  const { loading, error } = useSnapshot(analyticsStore)

  useEffect(() => {
    analyticsStore.fetchSummaries(metricType, filters).then((result) => {
      setSummaries(result)
    })
  }, [metricType, filters])

  return (
    <AnalyticsWidget
      title={title}
      description={description}
      expandable={expandable}
      loading={loading[metricType]}
      error={error[metricType]}
      renderContent={({ isExpanded }) => (
        <MetricsGrid
          data={summaries}
          size={size}
          isExpanded={isExpanded}
          selectedMetrics={selectedMetrics}
        />
      )}
    />
  )
}

export default DynamicOverviewWidget
