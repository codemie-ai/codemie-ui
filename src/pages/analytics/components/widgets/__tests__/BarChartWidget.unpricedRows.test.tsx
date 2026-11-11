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

import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ColumnType, MetricFormat } from '@/types/analytics'
import type { TabularResponse } from '@/types/analytics'

import BarChartWidget from '../BarChartWidget'

import type { ChartData, ChartOptions } from 'chart.js'

// The bars are asserted through the data and options handed to Chart.js: a real canvas in jsdom
// would hide both the drawn value and the tooltip text.
const { chartProps } = vi.hoisted(() => ({
  chartProps: { current: null as { data: unknown; options: unknown } | null },
}))

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: { data: unknown; options: unknown }) => {
    chartProps.current = { data, options }
    return <div data-testid="bar-chart" />
  },
}))

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn(() => ({ loading: {}, error: {} })) }
})

vi.mock('@/utils/tailwindColors', () => ({
  getTailwindColor: (_varName: string, fallback: string) => fallback,
}))

vi.mock('@/utils/chartColors', () => ({
  generateChartColors: (n: number) => Array(n).fill('#06B6D4'),
}))

const COLUMNS = [
  { id: 'user_name', label: 'User', type: ColumnType.STRING },
  { id: 'session_count', label: 'Sessions', type: ColumnType.NUMBER },
  {
    id: 'total_cost',
    label: 'Total Cost',
    type: ColumnType.NUMBER,
    format: MetricFormat.CURRENCY,
  },
]

const buildResponse = (rows: Record<string, unknown>[]): TabularResponse => ({
  data: { columns: COLUMNS, rows, totals: null },
  metadata: { timestamp: '2026-10-07T00:00:00Z', data_as_of: '2026-10-07T00:00:00Z' },
  pagination: { page: 0, per_page: 100, total_count: rows.length, has_more: false },
})

const renderChart = (rows: Record<string, unknown>[]) => {
  render(
    <BarChartWidget
      title="Top Users by Cost"
      labelField="user_name"
      valueField="total_cost"
      yAxisLabel="total_cost"
      horizontal
      dataOverride={buildResponse(rows)}
    />
  )
}

const barValues = (): (number | null)[] =>
  (chartProps.current?.data as ChartData<'bar', (number | null)[]>).datasets[0].data

const tooltipLabel = (dataIndex: number): string => {
  const options = chartProps.current?.options as ChartOptions<'bar'>
  const callback = options.plugins?.tooltip?.callbacks?.label
  if (!callback) throw new Error('no tooltip label callback')
  // A horizontal bar carries its value on x. Chart.js parses a null datapoint to null.
  const context = { dataIndex, parsed: { x: barValues()[dataIndex] } }
  return callback.call({} as never, context as never) as string
}

// The CLI insights rows: priced rows and one row nobody could price.
const ROWS = [
  {
    user_name: 'MK Testuser',
    session_count: 10,
    total_cost: 0.37,
  },
  {
    user_name: 'Whole User',
    session_count: 4,
    total_cost: 0.12,
  },
  {
    user_name: 'Unpriced User',
    session_count: 2,
    total_cost: null,
  },
]

describe('BarChartWidget unpriced rows', () => {
  beforeEach(() => {
    chartProps.current = null
  })

  it('draws an unpriced row as no bar and never labels it a measured $0.00', () => {
    renderChart(ROWS)

    expect(barValues()).toStrictEqual([0.37, 0.12, null])
    expect(tooltipLabel(2)).toBe(' Total Cost: -')
  })
})
