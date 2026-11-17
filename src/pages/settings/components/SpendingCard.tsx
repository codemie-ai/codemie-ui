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

import { FC, useMemo, useEffect, useState, ReactElement } from 'react'

import CurrencySvg from '@/assets/icons/currency.svg?react'
import InfoIcon from '@/assets/icons/info.svg?react'
import DetailsBadge from '@/components/details/DetailsBadge'
import Spinner from '@/components/Spinner'
import Tooltip from '@/components/Tooltip/Tooltip'
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

import InfoCard from './InfoCard'
import SpendingDoughnutUsage from './SpendingDoughnutUsage'
import SpendingUsage from './SpendingUsage'

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

  const totalMetric = summaries?.data.metrics.find((m: any) => m.id === 'total')
  const spendingLabel = userId ? 'Spending' : 'Your spending'

  const getLimitLabel = (isDefaultProject: boolean) => {
    if (userId) return 'User limit'
    return isDefaultProject ? 'Personal limit' : 'Available to you'
  }

  const SHARED_LIMIT_TOOLTIP = 'This budget is shared across the project with other members'
  const getLimitLabelTooltip = (isSharedLimit: boolean) =>
    isSharedLimit ? SHARED_LIMIT_TOOLTIP : undefined

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
          <SpendingDoughnutUsage percentage={totalMetric?.value ?? null} />
        )}
      </div>
    )
  }

  const getSpendingCustomRenderColumns = () => {
    const customColumns: Record<string, (item: Record<string, MetricValue>) => ReactElement> = {}

    if (!keySpendingData) return customColumns

    keySpendingData.data.columns.forEach((col) => {
      if (col.id === 'project_name') {
        customColumns[col.id] = (item: Record<string, MetricValue>) => (
          <div className="flex flex-wrap items-center gap-2">
            <span>{item[col.id]}</span>
            {item.is_default === true && (
              <DetailsBadge value="DEFAULT" className="py-1 text-[11px] leading-none" />
            )}
          </div>
        )
      }
      if (col.format === MetricFormat.PERCENTAGE && col.id === 'total') {
        customColumns[col.id] = (item: Record<string, MetricValue>) => {
          const limitLabel = getLimitLabel(item.is_default === true)
          return (
            <SpendingUsage
              percentage={item[col.id]}
              spent={item.current_spending}
              limit={item.budget_limit}
              limitLabel={limitLabel}
              limitLabelTooltip={getLimitLabelTooltip(item.is_shared_limit === true)}
              spendingLabel={spendingLabel}
            />
          )
        }
      }
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

          <div className="col-span-2 mt-6">
            <TableWidget
              metricType={TabularMetricType.KEY_SPENDING}
              title=""
              filters={{ time_period: TimePeriod.LAST_30_DAYS }}
              initialData={keySpendingData}
              hideWrapper
              hidePagination
              hiddenColumns={['budget_limit', 'current_spending', 'is_shared_limit']}
              tableStyles={{
                className: 'spending-table-widget',
                minWidth: '100%',
                cellPadding: '0.75rem',
                columnWidths: {
                  project_name: '30%',
                  budget_reset_at: '14%',
                  time_until_reset: '17%',
                  total: '40%',
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
