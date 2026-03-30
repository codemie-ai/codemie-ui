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

import { useEffect, useState, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import {
  calculatePercentage,
  getStatusColor,
  getStatusColorWithOpacity,
} from '@/pages/analytics/components/widgets/RatioWidget/utils'
import { analyticsStore } from '@/store/analytics'
import {
  type AnalyticsQueryParams,
  SummariesResponse,
  Metric,
  OverviewMetricType,
} from '@/types/analytics'

interface UseRatioWidgetDataParams {
  metricType: OverviewMetricType
  currentValueField: string
  limitValueField: string
  filters?: AnalyticsQueryParams
  dangerThreshold?: number
  warningThreshold?: number
}

export const useRatioWidgetData = ({
  metricType,
  currentValueField,
  limitValueField,
  filters,
  dangerThreshold = 75,
  warningThreshold = 50,
}: UseRatioWidgetDataParams) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [summaries, setSummaries] = useState<SummariesResponse | null>(null)

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])

  useEffect(() => {
    analyticsStore.fetchSummaries(metricType, filters).then((result) => {
      setSummaries(result)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricType, filtersKey])

  const currentMetric = useMemo(() => {
    return summaries?.data.metrics.find((metric: Metric) => metric.id === currentValueField)
  }, [summaries, currentValueField])

  const limitMetric = useMemo(() => {
    return summaries?.data.metrics.find((metric: Metric) => metric.id === limitValueField)
  }, [summaries, limitValueField])

  const percentage = useMemo(() => {
    if (!currentMetric || !limitMetric) return 0
    const current = Number(currentMetric.value)
    const limit = Number(limitMetric.value)
    return calculatePercentage(current, limit)
  }, [currentMetric, limitMetric])

  const statusColor = useMemo(() => {
    return getStatusColor(percentage, dangerThreshold, warningThreshold)
  }, [percentage, dangerThreshold, warningThreshold])

  const statusColorWithOpacity = useMemo(() => {
    return getStatusColorWithOpacity(percentage, dangerThreshold, warningThreshold)
  }, [percentage, dangerThreshold, warningThreshold])

  const chartData = useMemo(() => {
    const remainingPercentage = Math.max(0, 100 - percentage)
    return {
      labels: ['Value', 'Remaining'],
      datasets: [
        {
          data: [percentage, remainingPercentage],
          backgroundColor: [statusColor, statusColorWithOpacity],
          borderColor: 'transparent',
          borderWidth: 2,
        },
      ],
    }
  }, [percentage, statusColor, statusColorWithOpacity])

  return {
    loading: loading[metricType],
    error: error[metricType],
    summaries,
    currentMetric,
    limitMetric,
    percentage,
    statusColor,
    statusColorWithOpacity,
    chartData,
  }
}
