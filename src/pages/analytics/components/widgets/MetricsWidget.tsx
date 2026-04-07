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

import { FC, ReactNode, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'
import {
  type AnalyticsRequestParams,
  OverviewMetricType,
  SummariesResponse,
  WidgetSize,
} from '@/types/analytics'

import AnalyticsWidget from '../AnalyticsWidget'
import MetricsGrid from './MetricsGrid'

interface Props {
  type: OverviewMetricType
  filters?: AnalyticsRequestParams
  extraParams?: AnalyticsRequestParams
  title?: string
  description?: string
  expandable?: boolean
  actions?: ReactNode
  selectedMetrics?: string[]
  size?: WidgetSize
  metricsGridClassName?: string
}

/**
 * Metrics widget component
 * Displays summary metrics as cards
 * Data is fetched by the parent AnalyticsDashboard component
 */
const MetricsWidget: FC<Props> = ({
  type,
  filters,
  extraParams,
  title = 'Summary Metrics',
  description = 'High-level overview of usage and costs',
  expandable = true,
  actions,
  selectedMetrics,
  size,
  metricsGridClassName,
}: Props) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [summaries, setSummaries] = useState<SummariesResponse | null>(null)

  useEffect(() => {
    analyticsStore
      .fetchSummaries(type, { ...filters, ...extraParams })
      .then((result) => {
        setSummaries(result)
      })
      .catch(console.error)
  }, [type, filters, extraParams])

  return (
    <AnalyticsWidget
      title={title}
      description={description}
      loading={loading[type]}
      error={error[type]}
      expandable={expandable}
      actions={actions}
      renderContent={({ isExpanded }) => (
        <MetricsGrid
          data={summaries}
          size={size}
          isExpanded={isExpanded}
          selectedMetrics={selectedMetrics}
          className={metricsGridClassName}
        />
      )}
    >
      {null}
    </AnalyticsWidget>
  )
}

export default MetricsWidget
