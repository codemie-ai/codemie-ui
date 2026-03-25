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

import { FC } from 'react'

import type { MetricFormat, TabularResponse } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { generateChartColors } from '@/utils/chartColors'

import AnalyticsWidget from '../AnalyticsWidget'

interface DistributionBarWidgetProps {
  data: TabularResponse | null
  title: string
  description?: string
  labelField: string
  valueField: string
  secondaryValueField?: string
  colorByLabel?: (label: string, index: number) => string
  emptyStateLabel?: string
}

const getPrimitiveLabel = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : fallback

const DISTRIBUTION_PALETTE_SIZE = 6

const defaultColorByLabel = (_label: string, index: number) => {
  const palette = generateChartColors(DISTRIBUTION_PALETTE_SIZE)
  return palette[index % DISTRIBUTION_PALETTE_SIZE]
}

const DistributionBarWidget: FC<DistributionBarWidgetProps> = ({
  data,
  title,
  description,
  labelField,
  valueField,
  secondaryValueField,
  colorByLabel = defaultColorByLabel,
  emptyStateLabel = 'No data available.',
}) => {
  const rows = data?.data.rows ?? []

  return (
    <AnalyticsWidget title={title} description={description} expandable={false}>
      <div className="flex flex-col gap-3">
        {!rows.length ? (
          <div className="text-text-quaternary">{emptyStateLabel}</div>
        ) : (
          <>
            <div className="overflow-hidden rounded-full bg-surface-elevated">
              <div className="flex h-6 w-full">
                {rows.map((item, index) => {
                  const label = getPrimitiveLabel(item[labelField])
                  const share = Number(item[valueField] ?? 0) * 100
                  const color = colorByLabel(label, index)
                  return (
                    <div
                      key={`${label}-${index}`}
                      className="flex items-center justify-center text-xs font-semibold text-white"
                      style={{ width: `${share}%`, backgroundColor: color }}
                      title={`${label}: ${share.toFixed(1)}%`}
                    >
                      {share >= 12 ? `${Math.round(share)}%` : ''}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {rows.map((item, index) => {
                const label = getPrimitiveLabel(item[labelField])
                const share = Number(item[valueField] ?? 0) * 100
                const secondaryValue = secondaryValueField
                  ? Number(item[secondaryValueField] ?? 0)
                  : null
                return (
                  <span
                    key={`${label}-legend-${index}`}
                    style={{ color: colorByLabel(label, index) }}
                  >
                    {label}: {share.toFixed(1)}%
                    {secondaryValueField
                      ? ` (${formatMetricValue(secondaryValue ?? 0, 'currency' as MetricFormat)})`
                      : ''}
                  </span>
                )
              })}
            </div>
          </>
        )}
      </div>
    </AnalyticsWidget>
  )
}

export default DistributionBarWidget
