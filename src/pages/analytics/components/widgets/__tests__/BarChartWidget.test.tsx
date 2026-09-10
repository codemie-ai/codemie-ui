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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { ColumnType } from '@/types/analytics'
import type { TabularResponse } from '@/types/analytics'

import BarChartWidget from '../BarChartWidget'

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: { datasets: Array<{ data: number[] }> } }) => (
    <canvas data-testid="bar-chart" data-values={JSON.stringify(data.datasets[0]?.data ?? [])} />
  ),
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

const makeOverride = (rows: Array<Record<string, unknown>>): TabularResponse => ({
  data: {
    columns: [
      { id: 'day', label: 'Day', type: ColumnType.STRING },
      { id: 'net_lines', label: 'Net lines', type: ColumnType.INTEGER },
    ],
    rows,
  },
  metadata: { timestamp: '', data_as_of: '' },
  pagination: { page: 0, per_page: 100, total_count: rows.length, has_more: false },
})

describe('BarChartWidget — net_lines', () => {
  it('renders a bar chart when dataOverride contains positive net_lines', () => {
    const override = makeOverride([{ day: '2026-07-01', net_lines: 42 }])
    render(
      <BarChartWidget
        title="Net lines over time"
        labelField="day"
        valueField="net_lines"
        yAxisLabel="net_lines"
        dataOverride={override}
      />
    )
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders a bar chart when dataOverride contains negative net_lines (more deletions than insertions)', () => {
    const override = makeOverride([{ day: '2026-07-01', net_lines: -15 }])
    render(
      <BarChartWidget
        title="Net lines over time"
        labelField="day"
        valueField="net_lines"
        yAxisLabel="net_lines"
        dataOverride={override}
      />
    )
    const canvas = screen.getByTestId('bar-chart')
    expect(canvas).toBeInTheDocument()
    const values = JSON.parse(canvas.getAttribute('data-values') ?? '[]') as number[]
    expect(values[0]).toBe(-15)
  })

  it('renders a bar chart when dataOverride contains mixed positive and negative net_lines', () => {
    const override = makeOverride([
      { day: '2026-07-01', net_lines: 30 },
      { day: '2026-07-02', net_lines: -10 },
      { day: '2026-07-03', net_lines: 0 },
    ])
    render(
      <BarChartWidget
        title="Net lines over time"
        labelField="day"
        valueField="net_lines"
        yAxisLabel="net_lines"
        dataOverride={override}
      />
    )
    const canvas = screen.getByTestId('bar-chart')
    const values = JSON.parse(canvas.getAttribute('data-values') ?? '[]') as number[]
    expect(values).toEqual([30, -10, 0])
  })
})
