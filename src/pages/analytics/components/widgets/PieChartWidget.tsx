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
import { FC, useEffect, useState, useMemo, ReactNode } from 'react'
import { Pie } from 'react-chartjs-2'
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

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels)

interface PieChartWidgetProps {
  metricType: TabularMetricType
  title: string
  description?: string
  valueField: string
  labelField: string
  filters?: PaginatedQueryParams
  expandable?: boolean
  actions?: ReactNode
  colorByLabel?: (label: string, index: number) => string
}

/**
 * Pie chart widget component
 * Displays tabular analytics data as a pie chart
 */
const PieChartWidget: FC<PieChartWidgetProps> = ({
  title,
  metricType,
  filters,
  description,
  valueField,
  labelField,
  expandable,
  actions,
  colorByLabel,
}) => {
  const [data, setData] = useState<TabularResponse | null>(null)
  const { loading, error } = useSnapshot(analyticsStore)

  useEffect(() => {
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
  }, [metricType, filters])

  // Extract labels, values, and format from data
  const labels = data?.data.rows.map((row) => String(row[labelField] ?? 'Unknown')) ?? []
  const values = data?.data.rows.map((row) => Number(row[valueField] ?? 0)) ?? []
  const valueColumn = data?.data.columns.find((col) => col.id === valueField)
  const valueFormat: MetricFormat | undefined = valueColumn?.format

  // Generate background colors using Tailwind status colors
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

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: backgroundColors,
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
      ],
    }),
    [labels, values, backgroundColors]
  )

  // Prepare legend items for custom HTML legend
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

  const chartOptions: ChartOptions<'pie'> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false, // Hide default legend, we'll use custom HTML
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
              const total = context.dataset.data.reduce((a: number, b: any) => a + Number(b), 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return ` ${label}: ${formattedValue} (${percentage}%)`
            },
          },
        },
        datalabels: {
          color: '#FFFFFF', // always white because used on colored backgrounds regardless of theme
          font: {
            weight: 'bold' as const,
            size: 13,
          },
          formatter: (value, context) => {
            const total = context.dataset.data.reduce((a: number, b: any) => a + Number(b), 0)
            const percentage = ((value / total) * 100).toFixed(1)
            // Only show label if slice is large enough (> 10%)
            return parseFloat(percentage) > 10 ? `${percentage}%` : ''
          },
          textAlign: 'center' as const,
          anchor: 'center' as const,
          align: 'center' as const,
          clamp: true, // Prevent labels from overflowing the chart
          clip: true, // Clip labels that overflow
        },
      },
    }
  }, [valueFormat])

  const hasData = values.length > 0 && values.some((v) => v > 0)

  const renderChartContent = () => {
    if (!hasData) {
      return (
        <div className="flex justify-center items-center w-full h-[400px] text-text-quaternary">
          No data available
        </div>
      )
    }

    return (
      <div className="flex gap-4 w-full h-[400px] p-4 overflow-hidden">
        {/* Chart */}
        <div className="flex-1 flex justify-center items-center min-w-0">
          <Pie data={chartData} options={chartOptions} />
        </div>

        {/* Legend */}
        <ChartLegend items={legendItems} />
      </div>
    )
  }

  return (
    <AnalyticsWidget
      title={title}
      description={description}
      loading={loading[metricType]}
      error={error[metricType]}
      expandable={expandable}
      actions={actions}
    >
      {renderChartContent()}
    </AnalyticsWidget>
  )
}

export default PieChartWidget
