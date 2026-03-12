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

import { useState, useEffect } from 'react'

import { analyticsStore } from '@/store/analytics'
import { OverviewMetricType, Metric } from '@/types/analytics'

/**
 * Custom hook to fetch available metrics for overview widgets
 * Returns metrics that can be selected for display
 */
export const useOverviewMetrics = (metricType: OverviewMetricType | null) => {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!metricType) {
      setMetrics([])
      setError(null)
      return
    }

    const fetchMetrics = async () => {
      setLoading(true)
      setError(null)

      try {
        let response

        if (metricType === OverviewMetricType.CLI_SUMMARY) {
          response = await analyticsStore.fetchCliSummary({})
        } else {
          response = await analyticsStore.fetchSummaries(metricType, {})
        }

        if (response?.data?.metrics) {
          setMetrics(response.data.metrics)
        } else {
          setError('No metrics available')
          setMetrics([])
        }
      } catch (err) {
        console.error('Error fetching overview metrics:', err)
        setError('Failed to fetch metrics')
        setMetrics([])
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [metricType])

  // Filter numeric metrics for ratio widgets
  const numericMetrics = metrics.filter(
    (metric) => metric.type === 'number' || metric.type === 'integer'
  )

  return {
    metrics,
    numericMetrics,
    loading,
    error,
  }
}
