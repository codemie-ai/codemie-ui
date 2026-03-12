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

import CurrencySvg from '@/assets/icons/currency.svg?react'
import InfoIcon from '@/assets/icons/info.svg?react'
import Spinner from '@/components/Spinner'
import Tooltip from '@/components/Tooltip/Tooltip'
import { useRatioWidgetData } from '@/hooks/useRatioWidgetData'
import { OverviewMetricType, TimePeriod, Metric } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

import InfoCard from './InfoCard'

ChartJS.register(ArcElement, ChartTooltip, Legend, ChartDataLabels)

const SpendingCard: FC = () => {
  const { loading, summaries, currentMetric, limitMetric, percentage, statusColor, chartData } =
    useRatioWidgetData({
      metricType: OverviewMetricType.SPENDING,
      currentValueField: 'current_spending',
      limitValueField: 'budget_limit',
      filters: { time_period: TimePeriod.LAST_30_DAYS },
    })

  const hideLimitField = true
  const limitValueField = 'budget_limit'

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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-28">
          <Spinner />
        </div>
      )
    }

    if (!summaries) {
      return <p className="text-text-quaternary text-xs">No spending data available</p>
    }

    return (
      <div className="flex items-center gap-28">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {summaries.data.metrics
            .filter((metric: Metric) => !hideLimitField || metric.id !== limitValueField)
            .map((metric: Metric) => (
              <div key={metric.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm leading-lg font-normal text-text-quaternary">
                    {metric.label}
                  </span>
                  {metric.description && (
                    <>
                      <InfoIcon
                        className="w-4 h-4 text-text-quaternary cursor-pointer flex-shrink-0"
                        data-pr-tooltip={metric.description}
                        data-pr-position="top"
                      />
                      <Tooltip target={`[data-pr-tooltip="${metric.description}"]`} />
                    </>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-sm leading-lg font-normal text-text-primary whitespace-nowrap">
                    {formatMetricValue(metric.value, metric.format)}
                  </span>
                </div>
              </div>
            ))}
        </div>

        {currentMetric && limitMetric && (
          <div className="flex-shrink-0 relative w-32 h-32">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2">
              <div className="text-base font-bold" style={{ color: statusColor }}>
                {percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <InfoCard
      heading="Your personal spending"
      description="Shows your current spending against your budget limit. Keep an eye on this to avoid unexpected costs!"
      icon={() => <CurrencySvg className="w-[18px] h-[18px]" />}
    >
      {renderContent()}
    </InfoCard>
  )
}

export default SpendingCard
