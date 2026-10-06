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

import type { TabularResponse } from '@/types/analytics'

import BarChartWidget from '../BarChartWidget'

vi.mock('react-chartjs-2', () => ({
  Bar: () => <canvas data-testid="bar-chart" />,
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

const emptyOverride: TabularResponse = {
  data: { columns: [], rows: [] },
  metadata: { timestamp: '', data_as_of: '' },
  pagination: { page: 0, per_page: 100, total_count: 0, has_more: false },
}

describe('BarChartWidget — empty response', () => {
  it('renders a "No data available" empty state instead of a chart or crashing', () => {
    render(
      <BarChartWidget
        title="Net lines over time"
        labelField="day"
        valueField="net_lines"
        yAxisLabel="net_lines"
        dataOverride={emptyOverride}
      />
    )
    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
  })
})
