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
import { describe, expect, it, vi } from 'vitest'

import type { AnalyticsQueryParams } from '@/types/analytics'

import { useCliAnalyticsActivity } from '../hooks/useCliAnalyticsActivity'
import ActivityView from '../views/ActivityView'

import type { ReactNode } from 'react'

vi.mock('../hooks/useCliAnalyticsActivity', () => ({
  useCliAnalyticsActivity: vi.fn(() => ({
    data: {
      heat: Array.from({ length: 7 }, () => Array(24).fill(0)),
      by_hour: Array(24).fill(0),
      by_weekday: Array(7).fill(0),
    },
    loading: false,
    error: null,
  })),
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({
    title,
    children,
    error,
  }: {
    title: string
    children: ReactNode
    error?: { message: string } | null
  }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {error && <span data-testid="widget-error">{error.message}</span>}
      {children}
    </div>
  ),
}))

vi.mock('../../widgets/BarChartWidget', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
    </div>
  ),
}))

const MOCK_FILTERS: AnalyticsQueryParams = {
  start_date: '2026-07-01',
  end_date: '2026-07-17',
}

describe('ActivityView', () => {
  it('renders the sessions by weekday and hour heatmap', () => {
    render(<ActivityView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-sessions-by-weekday-×-hour')).toBeInTheDocument()
  })

  it('renders the hourly and weekday activity breakdowns', () => {
    render(<ActivityView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-by-hour-of-day')).toBeInTheDocument()
    expect(screen.getByTestId('widget-by-weekday')).toBeInTheDocument()
  })

  it('renders when activity data is empty', () => {
    vi.mocked(useCliAnalyticsActivity).mockReturnValueOnce({
      data: {
        heat: Array.from({ length: 7 }, () => Array(24).fill(0)),
        by_hour: Array(24).fill(0),
        by_weekday: Array(7).fill(0),
      },
      loading: false,
      error: null,
    })

    render(<ActivityView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-sessions-by-weekday-×-hour')).toBeInTheDocument()
    expect(screen.getByTestId('widget-by-hour-of-day')).toBeInTheDocument()
    expect(screen.getByTestId('widget-by-weekday')).toBeInTheDocument()
  })

  it('shows an error from the activity hook', () => {
    vi.mocked(useCliAnalyticsActivity).mockReturnValueOnce({
      data: {
        heat: Array.from({ length: 7 }, () => Array(24).fill(0)),
        by_hour: Array(24).fill(0),
        by_weekday: Array(7).fill(0),
      },
      loading: false,
      error: 'Failed to fetch activity',
    })

    render(<ActivityView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-error')).toHaveTextContent('Failed to fetch activity')
  })

  it('passes repositories to the activity hook', () => {
    render(<ActivityView filters={MOCK_FILTERS} repositories={['repo-a']} />)

    expect(vi.mocked(useCliAnalyticsActivity)).toHaveBeenCalledWith(MOCK_FILTERS, ['repo-a'])
  })
})
