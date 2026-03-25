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
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { DateTime } from 'luxon'
import { FC, useEffect, useState, useMemo, ReactNode } from 'react'
import { Bar } from 'react-chartjs-2'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'
import type { TabularMetricType, TabularResponse, PaginatedQueryParams } from '@/types/analytics'
import { generateChartColors } from '@/utils/chartColors'
import { getTailwindColor } from '@/utils/tailwindColors'

import AnalyticsWidget from '../AnalyticsWidget'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels)

interface BarChartWidgetProps {
  metricType: TabularMetricType
  title: string
  description?: string
  valueField: string
  labelField: string
  yAxisLabel: string
  yAxisInteger?: boolean
  filters?: PaginatedQueryParams
  expandable?: boolean
  horizontal?: boolean
  actions?: ReactNode
  colorByLabel?: (label: string, index: number) => string
}

/**
 * Bar chart widget component for time-series data
 * Displays daily analytics data as a bar chart
 */
const BarChartWidget: FC<BarChartWidgetProps> = ({
  metricType,
  title,
  description,
  valueField,
  labelField,
  yAxisLabel,
  yAxisInteger,
  filters,
  expandable,
  horizontal = false,
  actions,
  colorByLabel,
}) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [data, setData] = useState<TabularResponse | null>(null)
  const shouldFormatLabelsAsDates = labelField === 'date' || labelField.endsWith('_date')

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all records without pagination (backend returns up to 10k days)
      const result = await analyticsStore.fetchTabularData(metricType, {
        ...filters,
      })
      if (result) {
        setData(result)
      }
    }

    fetchData().catch(console.error)
  }, [metricType, filters])

  // Extract labels (dates) and values from data
  const labels =
    data?.data.rows.map((row) => {
      const label = row[labelField]
      if (typeof label === 'string') {
        if (!shouldFormatLabelsAsDates) {
          return label
        }

        const date = new Date(label)
        if (DateTime.fromISO(label).invalid) return label
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      if (typeof label === 'number') {
        return String(label)
      }
      return 'Unknown'
    }) ?? []

  const values = data?.data.rows.map((row) => Number(row[valueField] ?? 0)) ?? []

  const barColor = getTailwindColor('--colors-surface-specific-charts-bar-background', '#06B6D4')
  const gridColor = getTailwindColor(
    '--colors-surface-specific-charts-bar-grid',
    'rgba(255, 255, 255, 0.1)'
  )
  const textColor = getTailwindColor('--colors-text-secondary', '#9CA3AF')
  const palette = useMemo(() => generateChartColors(labels.length), [labels.length])

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: yAxisLabel,
          data: values,
          backgroundColor: labels.map(
            (label, index) => colorByLabel?.(label, index) || palette[index] || barColor
          ),
          borderColor: labels.map(
            (label, index) => colorByLabel?.(label, index) || palette[index] || barColor
          ),
          borderWidth: 0,
          borderRadius: 6,
          barPercentage: 0.9,
          categoryPercentage: 0.95,
        },
      ],
    }),
    [labels, values, yAxisLabel, barColor, colorByLabel, palette]
  )

  const yAxisLabelValue = data?.data.columns.find((c) => c.id === yAxisLabel)?.label

  const chartOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      plugins: {
        legend: {
          display: false,
        },
        datalabels: {
          display: false,
        },
        tooltip: {
          backgroundColor: getTailwindColor(
            '--colors-surface-specific-charts-tooltip-background',
            '#1F2937'
          ),
          titleColor: getTailwindColor('--colors-text-specific-charts-tooltip-title', '#F9FAFB'),
          bodyColor: getTailwindColor('--colors-surface-specific-charts-tooltip-body', '#E5E7EB'),
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (context) => {
              // Show original date from data
              const index = context[0].dataIndex
              const row = data?.data.rows[index]
              if (row) {
                const dateValue = row[labelField]
                if (typeof dateValue === 'string') {
                  if (!shouldFormatLabelsAsDates) return dateValue

                  const parsedDate = DateTime.fromISO(dateValue)

                  if (parsedDate.invalid) return dateValue
                  return parsedDate.toJSDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                }
              }
              return context[0].label
            },
            label: (context) => {
              const value = horizontal ? context.parsed.x ?? 0 : context.parsed.y ?? 0
              return ` ${yAxisLabelValue}: ${value.toLocaleString()}`
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: horizontal,
          grid: {
            display: horizontal,
            color: horizontal ? gridColor : undefined,
            drawBorder: false,
          },
          ticks: {
            color: textColor,
            maxRotation: horizontal ? 0 : 45,
            minRotation: horizontal ? 0 : 45,
            autoSkip: !horizontal,
            maxTicksLimit: horizontal ? undefined : 20,
            callback: (value) => {
              if (typeof value === 'number') {
                if (horizontal) {
                  return yAxisInteger && !Number.isInteger(value) ? null : value.toLocaleString()
                }
                return labels[value] ?? value.toLocaleString()
              }
              return value
            },
          },
          border: {
            color: gridColor,
          },
        },
        y: {
          beginAtZero: !horizontal,
          grid: {
            color: horizontal ? undefined : gridColor,
            display: !horizontal,
            drawBorder: false,
          },
          ticks: {
            color: textColor,
            callback: (value) => {
              if (horizontal) {
                if (typeof value === 'number') {
                  return labels[value] ?? value.toLocaleString()
                }
                return value
              }
              if (typeof value === 'number') {
                return yAxisInteger && !Number.isInteger(value) ? null : value.toLocaleString()
              }
              return value
            },
          },
          border: {
            display: false,
          },
        },
      },
    }),
    [
      yAxisLabel,
      gridColor,
      textColor,
      data,
      labelField,
      horizontal,
      yAxisInteger,
      labels,
      shouldFormatLabelsAsDates,
    ]
  )

  const hasData = values.length > 0 && values.some((v) => v > 0)

  const renderChartContent = () => {
    if (!hasData) {
      return (
        <div className="flex justify-center items-center w-full h-[400px] text-text-secondary">
          No data available
        </div>
      )
    }

    return (
      <div className="w-full h-[400px] p-4">
        <Bar data={chartData} options={chartOptions} />
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

export default BarChartWidget
