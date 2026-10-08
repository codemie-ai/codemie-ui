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
import { FC, useMemo, useEffect, useState, ReactElement } from 'react'
import { Doughnut } from 'react-chartjs-2'

import CurrencySvg from '@/assets/icons/currency.svg?react'
import InfoIcon from '@/assets/icons/info.svg?react'
import Spinner from '@/components/Spinner'
import Tooltip from '@/components/Tooltip/Tooltip'
import {
  getStatusColor,
  getStatusColorWithOpacity,
} from '@/pages/analytics/components/widgets/RatioWidget/utils'
import SpendingProgressBar from '@/pages/analytics/components/widgets/SpendingProgressBar'
import TableWidget from '@/pages/analytics/components/widgets/TableWidget'
import { analyticsStore } from '@/store/analytics'
import {
  TimePeriod,
  Metric,
  TabularMetricType,
  MetricFormat,
  MetricValue,
  TabularResponse,
} from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { formatSpend } from '@/utils/currency'

import InfoCard from './InfoCard'

ChartJS.register(ArcElement, ChartTooltip, Legend, ChartDataLabels)

const SPENDING_DANGER_THRESHOLD = 75
const SPENDING_WARNING_THRESHOLD = 50

interface SpendingCardProps {
  userId?: string
}

const SpendingCard: FC<SpendingCardProps> = ({ userId }) => {
  const [keySpendingData, setKeySpendingData] = useState<TabularResponse | null>(null)
  const [isLoadingKeySpending, setIsLoadingKeySpending] = useState(true)

  useEffect(() => {
    const fetchKeySpending = async () => {
      setIsLoadingKeySpending(true)
      const result = await analyticsStore.fetchTabularData(
        TabularMetricType.KEY_SPENDING,
        userId ? { user_id: userId } : {}
      )
      if (result) {
        setKeySpendingData(result)
      }
      setIsLoadingKeySpending(false)
    }
    fetchKeySpending()
  }, [userId])

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
          value: row[column.id] as MetricValue,
        })),
      },
      metadata: keySpendingData.metadata,
    }
  }, [keySpendingData, rowCount])

  const currentMetric = summaries?.data.metrics.find((m: any) => m.id === 'current_spending')
  const limitMetric = summaries?.data.metrics.find((m: any) => m.id === 'budget_limit')

  const currentSpendValue = useMemo(() => {
    if (keySpendingData && rowCount === 1) {
      const row = keySpendingData.data.rows[0]
      const rawSpend = row.current_spending
      // Accept only non-negative numbers; coerce non-numeric/absent/negative values to null
      if (typeof rawSpend === 'number' && rawSpend >= 0) {
        return rawSpend
      }
      return null
    }
    return null
  }, [keySpendingData, rowCount])

  const percentage = useMemo(() => {
    if (keySpendingData && rowCount === 1) {
      const row = keySpendingData.data.rows[0]
      const rawPercentage = Math.min(typeof row.total === 'number' ? row.total : 0, 100)
      return rawPercentage
    }
    return 0
  }, [keySpendingData, rowCount])

  const limitValue = useMemo(() => {
    if (keySpendingData && rowCount === 1) {
      const rawLimit = keySpendingData.data.rows[0].budget_limit
      return typeof rawLimit === 'number' && rawLimit >= 0 ? rawLimit : null
    }
    return null
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
      <div className="[container-type:inline-size]">
        <div className="flex flex-col gap-3 [@container(min-width:400px)]:flex-row [@container(min-width:400px)]:items-center [@container(min-width:400px)]:gap-4 [@container(min-width:500px)]:gap-0">
          <div className="flex flex-col gap-1 min-w-0 [@container(min-width:400px)]:flex-1 [@container(min-width:500px)]:min-w-fit">
            {summaries.data.metrics
              .filter((metric: Metric) => {
                // Spend moves into the doughnut only when it renders (needs both metrics); otherwise keep its row
                const excludedColumns = [
                  'project_name',
                  'total',
                  'budget_limit',
                  ...(currentMetric && limitMetric ? ['current_spending'] : []),
                ]
                return !excludedColumns.includes(metric.id)
              })
              .map((metric: Metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between gap-4 [@container(max-width:499px)]:flex-wrap [@container(max-width:499px)]:gap-y-0"
                >
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
                    <span className="text-sm leading-lg font-normal text-text-primary [@container(min-width:500px)]:whitespace-nowrap">
                      {formatMetricValue(metric.value, metric.format)}
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {currentMetric && limitMetric && (
            <div className="hidden [@container(min-width:400px)]:flex justify-center shrink-0 [@container(min-width:500px)]:shrink [@container(min-width:500px)]:basis-[232px] [@container(min-width:500px)]:min-w-[160px]">
              <div className="flex-shrink-0 relative w-32 h-32">
                <Doughnut data={chartData} options={chartOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2">
                  <div
                    className="text-sm font-bold text-center flex flex-col items-center"
                    style={{ color: statusColor }}
                  >
                    <span>{formatSpend(currentSpendValue)}</span>
                    <span>{`(${percentage.toFixed(1)}%)`}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentMetric && limitMetric && (
            <div className="flex flex-col gap-1 [@container(min-width:400px)]:hidden">
              <span className="text-sm leading-lg font-normal text-text-quaternary">
                Spent / Limit
              </span>
              <SpendingProgressBar
                percentage={percentage}
                spend={currentSpendValue}
                limit={limitValue}
                dangerThreshold={SPENDING_DANGER_THRESHOLD}
                warningThreshold={SPENDING_WARNING_THRESHOLD}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSpendCell = (colId: string, item: Record<string, MetricValue>) => {
    const value = item[colId]
    const percentage: number = typeof value === 'number' ? value : 0
    // budget_limit and current_spending are hidden columns, so item keeps their raw values
    const rawSpend = item.current_spending
    const spend = typeof rawSpend === 'number' && rawSpend >= 0 ? rawSpend : null
    const rawLimit = item.budget_limit
    const limit = typeof rawLimit === 'number' && rawLimit >= 0 ? rawLimit : null
    return (
      <SpendingProgressBar
        percentage={percentage}
        spend={spend}
        limit={limit}
        dangerThreshold={SPENDING_DANGER_THRESHOLD}
        warningThreshold={SPENDING_WARNING_THRESHOLD}
      />
    )
  }

  const isTotalPercentageColumn = (col: TabularResponse['data']['columns'][number]) =>
    col.format === MetricFormat.PERCENTAGE && col.id === 'total'

  const getSpendingCustomRenderColumns = () => {
    if (!keySpendingData) return {}

    const { data } = keySpendingData
    const customColumns: Record<string, (item: Record<string, MetricValue>) => ReactElement> = {}

    data.columns.filter(isTotalPercentageColumn).forEach((col) => {
      customColumns[col.id] = (item) => renderSpendCell(col.id, item)
    })

    return Object.keys(customColumns).length > 0 ? customColumns : undefined
  }

  if (rowCount !== null && rowCount > 1 && !isLoadingKeySpending) {
    return (
      <div
        className="bg-surface-base-chat rounded-lg p-4 border border-border-specific-panel-outline"
        data-onboarding="spending-card"
      >
        <div className="grid grid-cols-[auto,1fr] gap-x-4">
          <div className="w-8 h-8 min-w-8 bg-surface-specific-dropdown-hover text-text-primary rounded-full flex justify-center items-center">
            <CurrencySvg className="w-[18px] h-[18px]" />
          </div>
          <h2 className="font-medium place-content-center">
            {userId ? 'User spending' : 'Your personal spending'}
          </h2>

          <div className="col-start-2">
            <p className="text-text-quaternary text-xs mt-2">
              {userId
                ? "Shows this user's current spending against their budget limit."
                : 'Shows your current spending against your budget limit. Keep an eye on this to avoid unexpected costs!'}
            </p>
          </div>

          <div className="col-span-2 mt-6 max-xl:[--sp-project:136px] max-xl:[--sp-reset:112px] max-xl:[--sp-time:100px] max-xl:[--sp-total:208px]">
            <TableWidget
              metricType={TabularMetricType.KEY_SPENDING}
              title=""
              filters={{ time_period: TimePeriod.LAST_30_DAYS }}
              initialData={keySpendingData}
              hideWrapper
              hidePagination
              hiddenColumns={['budget_limit', 'current_spending']}
              columnLabels={{ total: 'Spent / Limit' }}
              fullWidthColumns={['total']}
              tableStyles={{
                className: 'spending-table-widget',
                minWidth: '100%',
                cellPadding: '0.75rem',
                columnWidths: {
                  project_name: 'var(--sp-project, 220px)',
                  budget_reset_at: 'var(--sp-reset, 112px)',
                  time_until_reset: 'var(--sp-time, 130px)',
                  total: 'var(--sp-total, 320px)',
                },
              }}
              customRenderColumns={getSpendingCustomRenderColumns()}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <InfoCard
      heading={userId ? 'User spending' : 'Your personal spending'}
      description={
        userId
          ? "Shows this user's current spending against their budget limit."
          : 'Shows your current spending against your budget limit. Keep an eye on this to avoid unexpected costs!'
      }
      icon={() => <CurrencySvg className="w-[18px] h-[18px]" />}
      data-onboarding="spending-card"
    >
      {renderContent()}
    </InfoCard>
  )
}

export default SpendingCard
