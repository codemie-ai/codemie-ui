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
import type {
  AnalyticsPaginatedRequestParams,
  TabularMetricType,
  TabularResponse,
} from '@/types/analytics'
import {
  formatChartSpendQualificationSuffix,
  formatMetricValue,
  formatSpendQualificationSuffix,
  readCellSpendQualification,
  toSeriesPoint,
} from '@/utils/analyticsFormatters'
import { generateChartColors } from '@/utils/chartColors'
import { getTailwindColor } from '@/utils/tailwindColors'

import AnalyticsWidget from '../AnalyticsWidget'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels)

interface BarChartWidgetProps {
  metricType?: TabularMetricType
  title: string
  description?: string
  valueField: string
  labelField: string
  yAxisLabel: string
  yAxisInteger?: boolean
  filters?: AnalyticsPaginatedRequestParams
  extraParams?: AnalyticsPaginatedRequestParams
  expandable?: boolean
  horizontal?: boolean
  actions?: ReactNode
  colorByLabel?: (label: string, index: number) => string
  /** Row field used as the color key passed to colorByLabel (defaults to labelField) */
  colorIdField?: string
  dataOverride?: TabularResponse | null
  /** Reshapes fetched rows before drawing (e.g. reorder or fill missing buckets). Pass a stable reference. */
  transformData?: (data: TabularResponse) => TabularResponse
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
  extraParams,
  expandable,
  horizontal = false,
  actions,
  colorByLabel,
  colorIdField,
  dataOverride,
  transformData,
}) => {
  const { loading, error } = useSnapshot(analyticsStore)
  const [data, setData] = useState<TabularResponse | null>(dataOverride ?? null)
  const shouldFormatLabelsAsDates = labelField === 'date' || labelField.endsWith('_date')

  useEffect(() => {
    if (dataOverride) {
      setData(dataOverride)
      return
    }

    if (!metricType) return

    const fetchData = async () => {
      // Fetch all records without pagination (backend returns up to 10k days)
      const result = await analyticsStore.fetchTabularData(metricType, {
        ...filters,
        ...extraParams,
      })
      if (result) {
        setData(transformData ? transformData(result) : result)
      }
    }

    fetchData().catch(console.error)
  }, [metricType, filters, extraParams, dataOverride, transformData])

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

  // A null cell is a figure nobody could produce: it stays null so Chart.js draws no bar, where 0
  // would draw it as a measured zero.
  const values = data?.data.rows.map((row) => toSeriesPoint(row[valueField])) ?? []

  const barColor = getTailwindColor('--colors-surface-specific-charts-bar-background', '#06B6D4')
  const gridColor = getTailwindColor(
    '--colors-surface-specific-charts-bar-grid',
    'rgba(255, 255, 255, 0.1)'
  )
  const textColor = getTailwindColor('--colors-text-secondary', '#9CA3AF')
  const palette = useMemo(() => generateChartColors(labels.length), [labels.length])

  const barColors = labels.map((label, index) => {
    const colorId = colorIdField ? data?.data.rows[index]?.[colorIdField] : undefined
    // Only scalar ids make a colour key; anything else would stringify to "[object Object]".
    const colorKey =
      typeof colorId === 'string' || typeof colorId === 'number' ? String(colorId) : label
    return colorByLabel?.(colorKey, index) || palette[index] || barColor
  })

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: yAxisLabel,
          data: values,
          backgroundColor: barColors,
          borderColor: barColors,
          borderWidth: 0,
          borderRadius: 6,
          barPercentage: 0.9,
          categoryPercentage: 0.95,
        },
      ],
    }),
    [labels, values, yAxisLabel, barColors]
  )

  const yAxisLabelValue = data?.data.columns.find((c) => c.id === yAxisLabel)?.label
  const valueFormat = data?.data.columns.find((c) => c.id === valueField)?.format
  // Each bar's figure is qualified exactly as the tables qualify the same cell.
  const qualifications =
    data?.data.rows.map((row) =>
      readCellSpendQualification(row, { id: valueField, format: valueFormat })
    ) ?? []
  const chartQualification = formatChartSpendQualificationSuffix(qualifications)

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
              const value = horizontal ? context.parsed.x : context.parsed.y
              const qualification = formatSpendQualificationSuffix(
                qualifications[context.dataIndex]
              )
              return ` ${yAxisLabelValue}: ${formatMetricValue(value, valueFormat)}${qualification}`
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

  const hasData = values.length > 0 && values.some((v) => v !== null && v !== 0)

  const renderChartContent = () => {
    if (!hasData) {
      return (
        <div className="flex justify-center items-center w-full h-[400px] text-text-quaternary">
          No data available
        </div>
      )
    }

    return (
      <>
        <div className="w-full h-[400px] p-4">
          <Bar data={chartData} options={chartOptions} />
        </div>
        {chartQualification && (
          <p className="px-4 pb-2 text-[11px] leading-4 text-text-quaternary">
            Bars show spend{chartQualification}
          </p>
        )}
      </>
    )
  }

  return (
    <AnalyticsWidget
      title={title}
      description={description}
      loading={metricType ? loading[metricType] : false}
      error={metricType ? error[metricType] : null}
      expandable={expandable}
      actions={actions}
    >
      {renderChartContent()}
    </AnalyticsWidget>
  )
}

export default BarChartWidget
