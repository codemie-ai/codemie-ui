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

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { FC, useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'

import InfoIcon from '@/assets/icons/info.svg?react'
import Tooltip from '@/components/Tooltip/Tooltip'
import { useRatioWidgetData } from '@/hooks/useRatioWidgetData'
import { type AnalyticsQueryParams, Metric, OverviewMetricType } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

import AnalyticsWidget from '../../AnalyticsWidget'

// Register Chart.js components
ChartJS.register(ArcElement, ChartTooltip, Legend, ChartDataLabels)

interface RatioWidgetProps {
  metricType: OverviewMetricType
  title: string
  description?: string
  currentValueField: string
  limitValueField: string
  filters?: AnalyticsQueryParams
  hideLimitField?: boolean
  dangerThreshold?: number // Default: 25 - below this is danger (red)
  warningThreshold?: number // Default: 50 - below this is warning (yellow)
}

/**
 * Ratio widget component
 * Displays summary metrics as a list with a donut chart showing
 * percentage calculated from current and limit values
 */
const RatioWidget: FC<RatioWidgetProps> = ({
  metricType,
  title,
  description,
  currentValueField,
  limitValueField,
  filters,
  dangerThreshold = 75,
  warningThreshold = 50,
  hideLimitField = true,
}) => {
  const {
    loading,
    error,
    summaries,
    currentMetric,
    limitMetric,
    percentage,
    statusColor,
    chartData,
  } = useRatioWidgetData({
    metricType,
    currentValueField,
    limitValueField,
    filters,
    dangerThreshold,
    warningThreshold,
  })

  // Check if data is valid (used for displaying N/A when limit is 0)
  const isDataValid = useMemo(() => {
    return !!Number(limitMetric?.value)
  }, [limitMetric])

  const chartOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      cutout: '80%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
        datalabels: {
          display: false,
        },
      },
    }),
    []
  )

  const renderMetrics = () => {
    if (!summaries) return null

    return (
      <div className="flex gap-8 items-center">
        {/* Left side: Donut chart (smaller, moved to start) */}
        {currentMetric && limitMetric && (
          <div className="flex-shrink-0 relative w-28 h-28">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-2xl font-bold" style={{ color: statusColor }}>
                {isDataValid ? `${percentage.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Right side: Rows with labels and values */}
        <div className="flex flex-col gap-1">
          {summaries.data.metrics
            .filter((metric) => !hideLimitField || metric.id !== limitValueField)
            .map((metric: Metric) => (
              <div key={metric.id} className="flex items-center gap-16">
                {/* Label column */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary font-medium whitespace-nowrap">
                    {metric.label}
                  </span>
                  {metric.description && (
                    <>
                      <InfoIcon
                        className="w-4 h-4 text-text-quaternary cursor-pointer"
                        data-pr-tooltip={metric.description}
                        data-pr-position="top"
                      />
                      <Tooltip target={`[data-pr-tooltip="${metric.description}"]`} />
                    </>
                  )}
                </div>

                {/* Value column */}
                <div className="ml-auto text-right">
                  <span className="text-sm text-text-primary font-semibold whitespace-nowrap">
                    {formatMetricValue(metric.value, metric.format)}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  return (
    <AnalyticsWidget
      title={title}
      description={description}
      loading={loading[metricType]}
      error={error?.[metricType]}
      expandable={false}
    >
      {renderMetrics()}
    </AnalyticsWidget>
  )
}

export default RatioWidget
