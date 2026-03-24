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
import { FC, useEffect, useState, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'
import type { TabularMetricType, TabularResponse, AnalyticsQueryParams } from '@/types/analytics'
import { generateChartColors } from '@/utils/chartColors'
import { getTailwindColor } from '@/utils/tailwindColors'

import AnalyticsWidget from '../AnalyticsWidget'
import TimePeriodBadge from './TimePeriodBadge'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const getIncompleteColor = () =>
  getTailwindColor('--colors-surface-specific-charts-series-incomplete', '#6B7280')

// Format ISO timestamp label as "Mar 10, 12:00"
const formatLabel = (raw: string): string => {
  if (!raw) return raw
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

interface SeriesDefinition {
  field: string
  label: string
}

interface StackedBarChartWidgetProps {
  metricType: TabularMetricType
  title: string
  description?: string
  labelField: string
  series: SeriesDefinition[]
  filters?: AnalyticsQueryParams
}

/**
 * Stacked bar chart widget for multi-series time-series data.
 * Displays spending broken down by source (Assistants, Workflows, Datasources, CLI).
 */
const StackedBarChartWidget: FC<StackedBarChartWidgetProps> = ({
  metricType,
  title,
  description,
  labelField,
  series,
  filters,
}) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [data, setData] = useState<TabularResponse | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsStore.fetchTabularData(metricType, {
        ...filters,
      })
      if (result) {
        setData(result)
      }
    }

    fetchData().catch(console.error)
  }, [metricType, JSON.stringify(filters)])

  const gridColor = getTailwindColor(
    '--colors-surface-specific-charts-bar-grid',
    'rgba(255, 255, 255, 0.1)'
  )
  const textColor = getTailwindColor('--colors-text-secondary', '#9CA3AF')

  const labels = useMemo(
    () => data?.data.rows.map((row) => formatLabel(String(row[labelField] ?? ''))) ?? [],
    [data, labelField]
  )

  const chartData = useMemo(() => {
    const seriesColors = generateChartColors(series.length)
    const incompleteColor = getIncompleteColor()
    const rowCount = data?.data.rows.length ?? 0
    const lastIndex = rowCount - 1
    return {
      labels,
      datasets: series.map((s, idx) => {
        const baseColor = seriesColors[idx % seriesColors.length]
        const bgColors = Array.from({ length: rowCount }, (_, i) =>
          i === lastIndex ? incompleteColor : baseColor
        )
        return {
          label: s.label,
          data: data?.data.rows.map((row) => Number(row[s.field] ?? 0)) ?? [],
          backgroundColor: bgColors,
          borderColor: bgColors,
          borderWidth: 0,
          borderRadius: 2,
          barPercentage: 0.9,
          categoryPercentage: 0.95,
        }
      }),
    }
  }, [labels, series, data])

  const chartOptions: ChartOptions<'bar'> = useMemo(() => {
    const rows = data?.data.rows ?? []
    const firstDayTickIndices = new Set<number>()
    const seenDates = new Set<string>()
    rows.forEach((row, index) => {
      const raw = String(row[labelField] ?? '')
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return
      const h = d.getHours()
      const m = d.getMinutes()
      if (h % 2 !== 0 || m !== 0) return
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!seenDates.has(dateStr)) {
        seenDates.add(dateStr)
        firstDayTickIndices.add(index)
      }
    })

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        datalabels: {
          display: false,
        },
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: textColor,
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: getTailwindColor(
            '--colors-surface-specific-charts-tooltip-background',
            '#1F2937'
          ),
          titleColor: getTailwindColor('--colors-text-specific-charts-tooltip-title', '#F9FAFB'),
          bodyColor: getTailwindColor('--colors-surface-specific-charts-tooltip-body', '#E5E7EB'),
          padding: 12,
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex
              const row = data?.data.rows[index]
              if (row) {
                const raw = row[labelField]
                if (typeof raw === 'string') {
                  const d = new Date(raw)
                  if (!Number.isNaN(d.getTime())) {
                    const dateStr = d.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                    const h = String(d.getHours()).padStart(2, '0')
                    const m = String(d.getMinutes()).padStart(2, '0')
                    return `${dateStr} at ${h}:${m}`
                  }
                }
              }
              return context[0].label
            },
            label: (context) => {
              const value = context.parsed.y ?? 0
              return ` ${context.dataset.label}: $${value.toFixed(4)}`
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false,
          },
          ticks: {
            color: textColor,
            maxRotation: 45,
            minRotation: 45,
            callback: (_tickValue, index) => {
              const row = data?.data.rows[index]
              if (!row) return null
              const raw = String(row[labelField] ?? '')
              const d = new Date(raw)
              if (Number.isNaN(d.getTime())) return null
              const h = d.getHours()
              const m = d.getMinutes()
              if (h % 2 !== 0 || m !== 0) return null
              const timeStr = `${String(h).padStart(2, '0')}:00`
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              if (firstDayTickIndices.has(index)) {
                return h === 0 ? dateStr : [dateStr, timeStr]
              }
              return timeStr
            },
          },
          border: {
            color: gridColor,
          },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: {
            display: false,
          },
          ticks: {
            color: textColor,
            callback: (value) => {
              if (typeof value === 'number') {
                return `$${value.toFixed(2)}`
              }
              return value
            },
          },
          border: {
            display: false,
          },
        },
      },
    }
  }, [gridColor, textColor, data, labelField])

  const hasData = chartData.datasets.some((ds) => ds.data.some((v) => v > 0))

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
      actions={
        data?.fixed_timeframe ? (
          <TimePeriodBadge
            label={data.fixed_timeframe}
            tooltip="Time filters are ignored for this metric. It always reflects its own fixed window."
          />
        ) : undefined
      }
    >
      {renderChartContent()}
    </AnalyticsWidget>
  )
}

export default StackedBarChartWidget
