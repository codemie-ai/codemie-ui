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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ColumnType, MetricFormat, TabularMetricType } from '@/types/analytics'
import type { TabularResponse } from '@/types/analytics'

import StackedBarChartWidget from '../StackedBarChartWidget'

import type { ChartData, ChartOptions } from 'chart.js'

vi.hoisted(() => vi.resetModules())

const { mockAnalyticsStore } = vi.hoisted(() => ({
  mockAnalyticsStore: {
    loading: {},
    loaded: {},
    error: {},
    aiAdoptionConfig: null,
    fetchTabularData: vi.fn(),
  },
}))

vi.mock('@/store/analytics', () => ({
  analyticsStore: mockAnalyticsStore,
}))

// The bars are asserted through the data handed to Chart.js: a real canvas in jsdom would hide the
// very thing under test, which is whether an unmeasured window becomes a gap or a zero bar.
const { chartProps } = vi.hoisted(() => ({
  chartProps: { current: null as { data: unknown; options: unknown } | null },
}))

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: { data: unknown; options: unknown }) => {
    chartProps.current = { data, options }
    return <div data-testid="bar-chart" />
  },
}))

const SERIES = [
  { field: 'assistants_spent', label: 'Assistants' },
  { field: 'workflows_spent', label: 'Workflows' },
]

const COLUMNS = [
  { id: 'time', label: 'Time', type: ColumnType.STRING },
  {
    id: 'assistants_spent',
    label: 'Assistants',
    type: ColumnType.NUMBER,
    format: MetricFormat.CURRENCY,
  },
  {
    id: 'workflows_spent',
    label: 'Workflows',
    type: ColumnType.NUMBER,
    format: MetricFormat.CURRENCY,
  },
]

const buildResponse = (rows: Record<string, unknown>[]): TabularResponse => ({
  data: { columns: COLUMNS, rows, totals: null },
  metadata: { timestamp: '2026-08-27T00:00:00Z', data_as_of: '2026-08-27T00:00:00Z' },
  pagination: { page: 0, per_page: 100, total_count: rows.length, has_more: false },
})

const renderChart = async (rows: Record<string, unknown>[]) => {
  mockAnalyticsStore.fetchTabularData.mockResolvedValue(buildResponse(rows))
  render(
    <StackedBarChartWidget
      metricType={TabularMetricType.ENGAGEMENT_WEEKLY_HISTOGRAM}
      title="Weekly Money Spent"
      labelField="time"
      series={SERIES}
    />
  )
  await screen.findByTestId('bar-chart')
}

const seriesData = (label: string): (number | null)[] => {
  const data = chartProps.current?.data as ChartData<'bar', (number | null)[]>
  const dataset = data.datasets.find((candidate) => candidate.label === label)
  if (!dataset) throw new Error(`no dataset labelled ${label}`)
  return dataset.data
}

const tooltipLabel = (datasetIndex: number, dataIndex: number): string => {
  const options = chartProps.current?.options as ChartOptions<'bar'>
  const callback = options.plugins?.tooltip?.callbacks?.label
  if (!callback) throw new Error('no tooltip label callback')
  const context = {
    datasetIndex,
    dataIndex,
    dataset: { label: SERIES[datasetIndex].label },
    parsed: { y: seriesData(SERIES[datasetIndex].label)[dataIndex] ?? 0 },
  }
  // Chart.js hands the callback a full TooltipItem; the callback only reads these four fields.
  return callback.call({} as never, context as never) as string
}

const ROWS = [
  { time: '2026-08-24T00:00:00Z', assistants_spent: null, workflows_spent: 0 },
  { time: '2026-08-24T03:00:00Z', assistants_spent: 1.5, workflows_spent: 2 },
]

describe('StackedBarChartWidget absent series values', () => {
  beforeEach(() => {
    chartProps.current = null
    mockAnalyticsStore.fetchTabularData.mockReset()
  })

  it('leaves an unmeasured cell as a null datapoint so the bar is a gap, not a zero', async () => {
    await renderChart(ROWS)

    expect(seriesData('Assistants')).toStrictEqual([null, 1.5])
  })

  it('keeps a measured zero as zero', async () => {
    await renderChart(ROWS)

    expect(seriesData('Workflows')).toStrictEqual([0, 2])
  })

  it('omits a cell the backend did not send at all', async () => {
    await renderChart([{ time: '2026-08-24T00:00:00Z', workflows_spent: 3 }])

    expect(seriesData('Assistants')).toStrictEqual([null])
  })

  it('tells the tooltip reader an unmeasured cell is absent, in the vocabulary every widget uses', async () => {
    await renderChart(ROWS)

    expect(tooltipLabel(0, 0)).toBe(' Assistants: -')
  })

  it('formats a measured amount in the tooltip, zero included', async () => {
    await renderChart(ROWS)

    expect(tooltipLabel(0, 1)).toBe(' Assistants: $1.5000')
    expect(tooltipLabel(1, 0)).toBe(' Workflows: $0.0000')
  })
})

describe('StackedBarChartWidget spend qualification', () => {
  beforeEach(() => {
    chartProps.current = null
    mockAnalyticsStore.fetchTabularData.mockReset()
  })

  const partialRow = (time: string, missing: number | null) => ({
    time,
    assistants_spent: 0.02,
    assistants_spent_spend_partial: true,
    assistants_spent_spend_missing_amount: missing,
    workflows_spent: 0,
    workflows_spent_spend_partial: true,
    workflows_spent_spend_missing_amount: missing,
  })

  it('says once, under the chart, that the bars are a floor and by how much', async () => {
    await renderChart([
      partialRow('2026-08-24T00:00:00Z', 0.026),
      partialRow('2026-08-24T03:00:00Z', 0.026),
    ])

    expect(screen.queryByText(/Bars show spend/)).not.toBeInTheDocument()
    // The window's residue rides on every cell; a tooltip repeating it would claim it per bar.
    expect(tooltipLabel(0, 0)).toBe(' Assistants: $0.0200')
  })

  it('names no amount when the partial cells disagree on it', async () => {
    await renderChart([
      partialRow('2026-08-24T00:00:00Z', 0.026),
      partialRow('2026-08-24T03:00:00Z', 0.5),
    ])

    expect(screen.queryByText(/Bars show spend/)).not.toBeInTheDocument()
  })

  it('adds no note to a chart whose figures are whole', async () => {
    await renderChart(ROWS)

    expect(screen.queryByText(/Bars show spend/)).not.toBeInTheDocument()
  })
})
