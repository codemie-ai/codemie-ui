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
import { describe, it, expect, vi } from 'vitest'

import { WidgetType } from '@/types/analytics'

import DynamicWidget from '../DynamicWidget'

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ error, title }: { error?: { message: string } | null; title: string }) =>
    error ? <div>{error.message}</div> : <div data-testid="widget">{title}</div>,
}))
vi.mock('../TableWidget', () => ({ default: () => <div data-testid="table-widget" /> }))
vi.mock('../BarChartWidget', () => ({ default: () => <div data-testid="bar-widget" /> }))
vi.mock('../DonutChartWidget', () => ({ default: () => <div data-testid="donut-widget" /> }))
vi.mock('../PieChartWidget', () => ({ default: () => <div data-testid="pie-widget" /> }))
vi.mock('../MetricsWidget', () => ({ default: () => <div data-testid="metrics-widget" /> }))
vi.mock('../RatioWidget', () => ({ default: () => <div data-testid="ratio-widget" /> }))

describe('DynamicWidget', () => {
  it('renders TableWidget for a TABLE widgetType', () => {
    render(
      <DynamicWidget
        widget={
          {
            id: '1',
            title: 'Live',
            size: 'LARGE',
            widgetType: WidgetType.TABLE,
            metricType: 'tabular-requests',
          } as any
        }
        filters={{}}
      />
    )
    expect(screen.getByTestId('table-widget')).toBeInTheDocument()
  })
})
