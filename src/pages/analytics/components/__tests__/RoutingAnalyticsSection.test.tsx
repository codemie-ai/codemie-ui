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

import { TimePeriod } from '@/types/analytics'

import RoutingAnalyticsSection from '../RoutingAnalyticsSection'

vi.mock('../widgets/DonutChartWidget', () => ({
  default: ({ title }: { title: string }) => <div data-testid="donut-widget">{title}</div>,
}))

vi.mock('../widgets/MetricsWidget', () => ({
  default: ({ title }: { title: string }) => <div data-testid="metrics-widget">{title}</div>,
}))

vi.mock('../widgets/StackedBarChartWidget', () => ({
  default: ({
    title,
    series,
    actions,
  }: {
    title: string
    series: Array<{ label: string }>
    actions?: React.ReactNode
  }) => (
    <div data-testid="activity-widget">
      <span>{title}</span>
      <span data-testid="activity-series">{series.map((item) => item.label).join(',')}</span>
      {actions}
    </div>
  ),
}))

vi.mock('../widgets/TableWidget', () => ({
  default: ({ title, columnOrder }: { title: string; columnOrder?: string[] }) => (
    <div data-testid="paths-widget">
      <span>{title}</span>
      <span data-testid="path-columns">{columnOrder?.join(',')}</span>
    </div>
  ),
}))

describe('RoutingAnalyticsSection', () => {
  it('composes router distribution, four-tier activity, and cost-aware path details', () => {
    render(<RoutingAnalyticsSection filters={{ time_period: TimePeriod.LAST_30_DAYS }} />)

    expect(screen.getByText('Routers')).toBeInTheDocument()
    expect(screen.getByText('Routing Activity')).toBeInTheDocument()
    expect(screen.getByText('Routing Paths')).toBeInTheDocument()
    expect(screen.getByTestId('activity-series')).toHaveTextContent(
      'Simple,Medium,Reasoning,Complex'
    )
    expect(screen.getByTestId('activity-series')).not.toHaveTextContent('Other')
    expect(screen.queryByLabelText('Routing tier')).not.toBeInTheDocument()
    expect(screen.getByTestId('path-columns')).toHaveTextContent(
      'router,routed_model,tier,request_count,actual_cost_usd,estimated_max_cost_usd,potential_savings_usd'
    )
  })
})
