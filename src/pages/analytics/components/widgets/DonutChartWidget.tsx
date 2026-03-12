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
import { FC, useEffect, useState, useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'
import type {
  TabularMetricType,
  TabularResponse,
  MetricFormat,
  AnalyticsQueryParams,
} from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { generateChartColors } from '@/utils/chartColors'
import { getTailwindColor } from '@/utils/tailwindColors'

import AnalyticsWidget from '../AnalyticsWidget'
import ChartLegend from './ChartLegend'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels)

interface DonutChartWidgetProps {
  metricType: TabularMetricType
  title: string
  description?: string
  valueField: string
  labelField: string
  filters?: AnalyticsQueryParams
  expandable?: boolean
}

/**
 * Donut chart widget component
 * Displays tabular analytics data as a donut chart with labels on slices
 */
const DonutChartWidget: FC<DonutChartWidgetProps> = ({
  metricType,
  title,
  description,
  valueField,
  labelField,
  filters,
  expandable,
}) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [data, setData] = useState<TabularResponse | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsStore.fetchTabularData(metricType, {
        ...filters,
        page: 0,
        per_page: 100, // Fetch more items for chart
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
  const backgroundColors = useMemo(() => generateChartColors(values.length), [values.length])
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

  const chartOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%', // Creates the donut hole
      plugins: {
        legend: {
          display: false, // Hide legend since we show labels on slices
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
              const percentage = ((value / total) * 100).toFixed(2)
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
          formatter: (value) => {
            const percentage = ((value / total) * 100).toFixed(1)

            // Only show label if slice is large enough (> 5%)
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
        <div className="flex justify-center items-center w-full h-[400px] text-text-quaternary">
          No data available
        </div>
      )
    }

    return (
      <div className="flex gap-4 w-full h-[400px] p-4 overflow-hidden">
        {/* Chart */}
        <div className="flex-1 flex justify-center items-center min-w-0">
          <Doughnut data={chartData} options={chartOptions} />
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
      expandable={expandable}
      loading={loading[metricType]}
      error={error[metricType]}
    >
      {renderChartContent()}
    </AnalyticsWidget>
  )
}

export default DonutChartWidget
