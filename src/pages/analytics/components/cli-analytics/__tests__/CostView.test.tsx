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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AnalyticsQueryParams } from '@/types/analytics'
import type { SessionRow } from '@/types/cliAnalytics'

import { useCliAnalyticsCost } from '../hooks/useCliAnalyticsCost'
import { useCliAnalyticsSessions } from '../hooks/useCliAnalyticsSessions'
import CostView from '../views/CostView'

import type { ReactNode } from 'react'

vi.mock('../hooks/useCliAnalyticsCost', () => ({
  useCliAnalyticsCost: vi.fn(() => ({
    kpis: {
      total_cost_usd: 12.5,
      total_tokens: 2420000,
      avg_cost_per_session: 0.09,
    },
    costByUser: [{ developer_name: 'alice@co.com', cost_usd: 7.25 }],
    costByModel: [{ model_name: 'claude-sonnet-4-5', cost_usd: 12.5 }],
    loading: false,
    error: null,
  })),
}))

vi.mock('../hooks/useCliAnalyticsSessions', () => ({
  useCliAnalyticsSessions: vi.fn(() => ({
    displayRows: [],
    loading: false,
    error: null,
    page: 1,
    totalPages: 1,
    perPage: 10,
    setPage: vi.fn(),
    search: '',
    setSearch: vi.fn(),
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

vi.mock('../../widgets/MetricCard', () => ({
  default: ({ metric }: { metric: { id: string; label: string } }) => (
    <div data-testid={`metric-${metric.id}`}>
      <span>{metric.label}</span>
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

vi.mock('../../widgets/DonutChartWidget', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
    </div>
  ),
}))

vi.mock('../views/SessionModal', () => ({
  default: ({ traceId, onHide }: { traceId: string; onHide: () => void }) => (
    <div data-testid="session-modal" data-trace-id={traceId}>
      <button onClick={onHide}>Close</button>
    </div>
  ),
}))

const MOCK_FILTERS: AnalyticsQueryParams = {
  start_date: '2026-07-01',
  end_date: '2026-07-17',
}

const MOCK_ROW: SessionRow = {
  trace_id: 'abc-123',
  developer_name: 'alice@co.com',
  repository: 'proj-a',
  start_time: '2026-07-22T10:00:00Z',
  duration_ms: 60000,
  model_name: 'claude-3',
  input_tokens: 1500,
  output_tokens: 750,
  cost_usd: 0.05,
  tool_call_count: 3,
  prompt: 'Hello world',
  turns: 2,
  branch: 'main',
  cache_read_tokens: 100,
  cache_creation_tokens: 50,
  net_lines: 0,
}

describe('CostView', () => {
  it('renders the cost summary metrics', () => {
    render(<CostView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-summary')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_cost_usd')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_tokens')).toBeInTheDocument()
    expect(screen.getByTestId('metric-avg_cost_per_session')).toBeInTheDocument()
  })

  it('renders the cost-by-user and cost-by-model widgets', () => {
    render(<CostView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-cost-by-user')).toBeInTheDocument()
    expect(screen.getByTestId('widget-cost-by-model')).toBeInTheDocument()
  })

  it('renders the most expensive sessions widget', () => {
    render(<CostView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-most-expensive-sessions')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'SESSION' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'USER' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'REPOSITORY' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FRAMEWORK' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'COST' })).toBeInTheDocument()
  })

  it('renders non-summary widgets when kpis are null', () => {
    vi.mocked(useCliAnalyticsCost).mockReturnValueOnce({
      kpis: null,
      costByUser: [],
      costByModel: [],
      loading: false,
      error: null,
    })

    render(<CostView filters={MOCK_FILTERS} />)

    expect(screen.queryByTestId('widget-summary')).not.toBeInTheDocument()
    expect(screen.getByTestId('widget-cost-by-user')).toBeInTheDocument()
    expect(screen.getByTestId('widget-cost-by-model')).toBeInTheDocument()
    expect(screen.getByTestId('widget-most-expensive-sessions')).toBeInTheDocument()
  })

  it('shows an error from the cost hook in the summary widget', () => {
    vi.mocked(useCliAnalyticsCost).mockReturnValueOnce({
      kpis: {
        total_cost_usd: 12.5,
        total_tokens: 2420000,
        avg_cost_per_session: 0.09,
        total_sessions: 1,
      },
      costByUser: [],
      costByModel: [],
      loading: false,
      error: 'Failed to fetch cost data',
    })

    render(<CostView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-error')).toHaveTextContent('Failed to fetch cost data')
  })

  it('shows an error from the expensive sessions query', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [],
      loading: false,
      error: 'Failed to fetch sessions',
      page: 1,
      totalPages: 1,
      perPage: 10,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<CostView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-error')).toHaveTextContent('Failed to fetch sessions')
  })

  it('passes repositories and sorting options to both hooks', () => {
    render(<CostView filters={MOCK_FILTERS} repositories={['repo-a']} />)

    expect(vi.mocked(useCliAnalyticsCost)).toHaveBeenCalledWith(MOCK_FILTERS, ['repo-a'])
    expect(vi.mocked(useCliAnalyticsSessions)).toHaveBeenCalledWith(MOCK_FILTERS, ['repo-a'], {
      sort_by: 'cost_usd',
      per_page: 10,
    })
  })

  it('does not render SessionModal when no row is selected', () => {
    render(<CostView filters={MOCK_FILTERS} />)

    expect(screen.queryByTestId('session-modal')).not.toBeInTheDocument()
  })

  it('opens SessionModal when a session row is clicked and closes on onHide', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValue({
      displayRows: [MOCK_ROW],
      loading: false,
      error: null,
      page: 1,
      totalPages: 1,
      perPage: 10,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<CostView filters={MOCK_FILTERS} />)

    fireEvent.click(screen.getByText('proj-a'))

    expect(screen.getByTestId('session-modal')).toBeInTheDocument()
    expect(screen.getByTestId('session-modal')).toHaveAttribute('data-trace-id', 'abc-123')

    fireEvent.click(screen.getByText('Close'))

    expect(screen.queryByTestId('session-modal')).not.toBeInTheDocument()
  })
})
