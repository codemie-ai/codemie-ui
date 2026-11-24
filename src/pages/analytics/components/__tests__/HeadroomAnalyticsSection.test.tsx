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
import { describe, expect, it, vi } from 'vitest'

import { OverviewMetricType, TabularMetricType, TimePeriod } from '@/types/analytics'

import HeadroomAnalyticsSection from '../HeadroomAnalyticsSection'

vi.mock('../widgets/MetricsWidget', () => ({
  default: ({
    type,
    title,
    selectedMetrics,
    filters,
  }: {
    type: string
    title: string
    selectedMetrics: string[]
    filters: { time_period?: string }
  }) => (
    <div data-testid="metrics-widget">
      <span>{title}</span>
      <span data-testid="metrics-type">{type}</span>
      <span data-testid="metrics-selected">{selectedMetrics.join(',')}</span>
      <span data-testid="metrics-filters">{filters.time_period}</span>
    </div>
  ),
}))

vi.mock('../widgets/StackedBarChartWidget', () => ({
  default: ({
    metricType,
    title,
    labelField,
    series,
  }: {
    metricType: string
    title: string
    labelField: string
    series: Array<{ field: string; label: string }>
  }) => (
    <div data-testid="timeseries-widget">
      <span>{title}</span>
      <span data-testid="timeseries-type">{metricType}</span>
      <span data-testid="timeseries-label-field">{labelField}</span>
      <span data-testid="timeseries-series">
        {series.map((item) => `${item.field}:${item.label}`).join(',')}
      </span>
    </div>
  ),
}))

vi.mock('../widgets/TableWidget', () => ({
  default: ({
    metricType,
    title,
    columnOrder,
  }: {
    metricType: string
    title: string
    columnOrder?: string[]
  }) => (
    <div data-testid="strategy-widget">
      <span>{title}</span>
      <span data-testid="strategy-type">{metricType}</span>
      <span data-testid="strategy-columns">{columnOrder?.join(',')}</span>
    </div>
  ),
}))

describe('HeadroomAnalyticsSection', () => {
  it('wires the summary widget to HEADROOM_SUMMARY with the token metrics and filters', () => {
    render(<HeadroomAnalyticsSection filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)

    expect(screen.getByText('Headroom Summary')).toBeInTheDocument()
    expect(screen.getByTestId('metrics-type')).toHaveTextContent(
      OverviewMetricType.HEADROOM_SUMMARY
    )
    expect(screen.getByTestId('metrics-selected')).toHaveTextContent(
      'tokens_original,tokens_compacted,tokens_saved,saved_percent,request_count,session_count'
    )
    expect(screen.getByTestId('metrics-filters')).toHaveTextContent(TimePeriod.LAST_30_DAYS)
  })

  it('wires the savings chart to the timeseries with compacted and saved series', () => {
    render(<HeadroomAnalyticsSection filters={{}} />)

    expect(screen.getByText('Savings Over Time')).toBeInTheDocument()
    expect(screen.getByTestId('timeseries-type')).toHaveTextContent(
      TabularMetricType.HEADROOM_TIMESERIES
    )
    expect(screen.getByTestId('timeseries-label-field')).toHaveTextContent('time')
    expect(screen.getByTestId('timeseries-series')).toHaveTextContent(
      'tokens_compacted:Compacted,tokens_saved:Saved'
    )
  })

  it('wires the strategy table to HEADROOM_BY_STRATEGY with its column order', () => {
    render(<HeadroomAnalyticsSection filters={{}} />)

    expect(screen.getByText('Savings by Strategy')).toBeInTheDocument()
    expect(screen.getByTestId('strategy-type')).toHaveTextContent(
      TabularMetricType.HEADROOM_BY_STRATEGY
    )
    expect(screen.getByTestId('strategy-columns')).toHaveTextContent(
      'strategy,request_count,tokens_original,tokens_compacted,tokens_saved,saved_percent'
    )
  })
})
