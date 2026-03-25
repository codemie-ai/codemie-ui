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

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { FC, useEffect, useMemo, useState, ReactNode } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'
import type {
  TabularMetricType,
  TabularResponse,
  MetricFormat,
  PaginatedQueryParams,
} from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { generateChartColors } from '@/utils/chartColors'
import { getTailwindColor } from '@/utils/tailwindColors'

import AnalyticsWidget from '../AnalyticsWidget'
import ChartLegend from './ChartLegend'

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels)

interface DonutChartWidgetProps {
  metricType: TabularMetricType
  title: string
  description?: string
  valueField: string
  labelField: string
  filters?: PaginatedQueryParams
  expandable?: boolean
  actions?: ReactNode
  colorByLabel?: (label: string, index: number) => string
  dataOverride?: TabularResponse | null
  emptyStateLabel?: string
  className?: string
}

const getPrimitiveLabel = (value: unknown, fallback = 'Unknown'): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : fallback

const DonutChartWidget: FC<DonutChartWidgetProps> = ({
  metricType,
  title,
  description,
  valueField,
  labelField,
  filters,
  expandable,
  actions,
  colorByLabel,
  dataOverride,
  emptyStateLabel = 'No data available',
  className,
}) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [data, setData] = useState<TabularResponse | null>(dataOverride ?? null)

  useEffect(() => {
    if (dataOverride) {
      setData(dataOverride)
      return
    }

    const fetchData = async () => {
      const result = await analyticsStore.fetchTabularData(metricType, {
        ...filters,
        page: 0,
        per_page: 100,
      })
      if (result) {
        setData(result)
      }
    }

    fetchData().catch(console.error)
  }, [dataOverride, metricType, filters])

  const resolvedData = dataOverride ?? data
  const labels = resolvedData?.data.rows.map((row) => getPrimitiveLabel(row[labelField])) ?? []
  const values = resolvedData?.data.rows.map((row) => Number(row[valueField] ?? 0)) ?? []
  const valueColumn = resolvedData?.data.columns.find((col) => col.id === valueField)
  const valueFormat: MetricFormat | undefined = valueColumn?.format

  const backgroundColors = useMemo(
    () =>
      labels.length
        ? labels.map(
            (label, index) =>
              colorByLabel?.(label, index) || generateChartColors(labels.length)[index]
          )
        : [],
    [labels, colorByLabel]
  )
  const total = values.reduce((a, b) => a + b, 0)

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: backgroundColors,
          borderColor: getTailwindColor('--colors-border-specific-charts-bar-border'),
          borderWidth: 2,
        },
      ],
    }),
    [labels, values, backgroundColors]
  )

  const legendItems = useMemo(
    () =>
      labels.map((label, i) => ({
        label: String(label),
        value: values[i],
        formattedValue: formatMetricValue(values[i], valueFormat),
        color: backgroundColors[i],
      })),
    [labels, values, valueFormat, backgroundColors]
  )

  const chartOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: getTailwindColor('--colors-surface-specific-charts-tooltip-background'),
          titleColor: getTailwindColor('--colors-text-specific-charts-tooltip-title'),
          bodyColor: getTailwindColor('--colors-surface-specific-charts-tooltip-body'),
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const label = context.label || ''
              const value = context.parsed
              const formattedValue = formatMetricValue(value, valueFormat)
              const percentage = total ? ((value / total) * 100).toFixed(2) : '0.00'
              return ` ${label}: ${formattedValue} (${percentage}%)`
            },
          },
        },
        datalabels: {
          color: '#FFFFFF',
          font: {
            weight: 'bold' as const,
            size: 13,
          },
          formatter: (value) => {
            const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0'
            if (parseFloat(percentage) > 5) {
              return `${percentage}%`
            }
            return ''
          },
          textAlign: 'center' as const,
          anchor: 'center' as const,
          align: 'center' as const,
        },
      },
    }),
    [valueFormat, total]
  )

  const hasData = values.length > 0 && values.some((v) => v > 0)

  const renderChartContent = () => {
    if (!hasData) {
      return (
        <div className="flex h-[400px] w-full items-center justify-center text-text-quaternary">
          {emptyStateLabel}
        </div>
      )
    }

    return (
      <div className="flex h-[400px] w-full gap-4 overflow-hidden p-4">
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <Doughnut data={chartData} options={chartOptions} />
        </div>
        <ChartLegend items={legendItems} />
      </div>
    )
  }

  return (
    <AnalyticsWidget
      title={title}
      description={description}
      expandable={expandable}
      loading={dataOverride ? false : loading[metricType]}
      error={dataOverride ? null : error[metricType]}
      actions={actions}
      className={className}
    >
      {renderChartContent()}
    </AnalyticsWidget>
  )
}

export default DonutChartWidget
