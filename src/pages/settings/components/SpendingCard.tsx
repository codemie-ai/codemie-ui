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
import { FC, useMemo, useEffect, useState } from 'react'
import { Doughnut } from 'react-chartjs-2'

import CurrencySvg from '@/assets/icons/currency.svg?react'
import InfoIcon from '@/assets/icons/info.svg?react'
import Spinner from '@/components/Spinner'
import Tooltip from '@/components/Tooltip/Tooltip'
import {
  getStatusColor,
  getStatusColorWithOpacity,
} from '@/pages/analytics/components/widgets/RatioWidget/utils'
import { analyticsStore } from '@/store/analytics'
import { Metric, TabularMetricType, TabularResponse } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

import InfoCard from './InfoCard'
import SpendingTable, {
  SPENDING_DANGER_THRESHOLD,
  SPENDING_WARNING_THRESHOLD,
} from './SpendingTable'

ChartJS.register(ArcElement, ChartTooltip, Legend, ChartDataLabels)

const SpendingCard: FC = () => {
  const [keySpendingData, setKeySpendingData] = useState<TabularResponse | null>(null)
  const [isLoadingKeySpending, setIsLoadingKeySpending] = useState(true)

  useEffect(() => {
    const fetchKeySpending = async () => {
      setIsLoadingKeySpending(true)
      const result = await analyticsStore.fetchTabularData(TabularMetricType.KEY_SPENDING, {})
      if (result) {
        setKeySpendingData(result)
      }
      setIsLoadingKeySpending(false)
    }
    fetchKeySpending()
  }, [])

  const rowCount = keySpendingData?.data?.rows?.length ?? 0
  const shouldUseWidget = rowCount <= 1

  const summaries = useMemo(() => {
    if (!keySpendingData || rowCount !== 1) return null

    const row = keySpendingData.data.rows[0]

    return {
      data: {
        metrics: keySpendingData.data.columns.map((column) => ({
          id: column.id,
          label: column.label,
          type: column.type,
          format: column.format,
          description: column.description,
          value: row[column.id] as string | number | boolean,
        })),
      },
      metadata: keySpendingData.metadata,
    }
  }, [keySpendingData, rowCount])

  const currentMetric = summaries?.data.metrics.find((m: any) => m.id === 'current_spending')
  const limitMetric = summaries?.data.metrics.find((m: any) => m.id === 'budget_limit')

  const percentage = useMemo(() => {
    if (keySpendingData && rowCount === 1) {
      const row = keySpendingData.data.rows[0]
      return typeof row.total === 'number' ? row.total : 0
    }
    return 0
  }, [keySpendingData, rowCount])

  const statusColor = useMemo(() => {
    return getStatusColor(percentage, SPENDING_DANGER_THRESHOLD, SPENDING_WARNING_THRESHOLD)
  }, [percentage])

  const statusColorWithOpacity = useMemo(() => {
    return getStatusColorWithOpacity(
      percentage,
      SPENDING_DANGER_THRESHOLD,
      SPENDING_WARNING_THRESHOLD
    )
  }, [percentage])

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
    if (isLoadingKeySpending) {
      return (
        <div className="flex justify-center items-center h-28">
          <Spinner />
        </div>
      )
    }

    if (shouldUseWidget && !summaries) {
      return <p className="text-text-quaternary text-xs">No spending data available</p>
    }

    if (!shouldUseWidget || !summaries) {
      return <p className="text-text-quaternary text-xs">No spending data available</p>
    }

    return (
      <div className="flex items-center gap-28">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {summaries.data.metrics
            .filter((metric: Metric) => {
              const excludedColumns = ['project_name', 'total', 'budget_limit']
              return !excludedColumns.includes(metric.id)
            })
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

  if (rowCount !== null && rowCount > 1 && !isLoadingKeySpending) {
    return (
      <div className="bg-surface-base-chat rounded-lg p-4 border border-border-specific-panel-outline">
        <div className="grid grid-cols-[auto,1fr] gap-x-4">
          <div className="w-8 h-8 min-w-8 bg-surface-specific-dropdown-hover text-text-primary rounded-full flex justify-center items-center">
            <CurrencySvg className="w-[18px] h-[18px]" />
          </div>
          <h2 className="font-medium place-content-center">Your personal spending</h2>

          <div className="col-start-2">
            <p className="text-text-quaternary text-xs mt-2">
              Shows your current spending against your budget limit. Keep an eye on this to avoid
              unexpected costs!
            </p>
          </div>

          <div className="col-span-2 mt-6">
            <SpendingTable
              columns={
                (keySpendingData?.data.columns ?? []) as Array<{
                  id: string
                  label: string
                  format?: string | null
                }>
              }
              rows={keySpendingData?.data.rows ?? []}
              hiddenColumns={['budget_limit']}
            />
          </div>
        </div>
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
