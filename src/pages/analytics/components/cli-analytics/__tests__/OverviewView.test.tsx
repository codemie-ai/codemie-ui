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
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AnalyticsQueryParams } from '@/types/analytics'
import type { ExtendedSessionsTarget, RepositoryRow } from '@/types/cliAnalytics'

import { useCliAnalyticsOverview } from '../hooks/useCliAnalyticsOverview'
import { useCliAnalyticsRepositories } from '../hooks/useCliAnalyticsRepositories'
import OverviewView from '../views/OverviewView'

vi.mock('../hooks/useCliAnalyticsOverview', () => ({
  useCliAnalyticsOverview: vi.fn(() => ({
    kpis: {
      total_sessions: 142,
      total_cost_usd: 12.5,
      duration_ms: 8040000,
      total_turns: 284,
      total_tool_calls: 850,
      tool_call_success_rate: 94.5,
      total_files_changed: 63,
      dead_sessions: 8,
      total_input_tokens: 1500000,
      total_output_tokens: 320000,
      total_cache_creation_tokens: 200000,
      total_cache_read_tokens: 400000,
      total_tokens: 2420000,
      cache_read_cost_usd: 1.25,
      bloat_pct: 12.3,
      avg_context_per_call: 15000,
    },
    dailyBuckets: [{ day: '2026-07-01', net_lines: 18 }],
    modelBreakdown: [{ model_name: 'claude-sonnet-4-5', session_count: 80 }],
    loading: false,
    error: null,
  })),
}))

vi.mock('../hooks/useCliAnalyticsRepositories', () => ({
  useCliAnalyticsRepositories: vi.fn(() => ({
    rows: [],
    loading: false,
    error: null,
    page: 1,
    totalPages: 1,
    perPage: 20,
    setPage: vi.fn(),
  })),
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

vi.mock('../../widgets/MetricCard', () => ({
  default: ({ metric }: { metric: { id: string; label: string; value: unknown } }) => (
    <div data-testid={`metric-${metric.id}`}>
      <span>{metric.label}</span>
      <span data-testid="metric-value">{String(metric.value)}</span>
    </div>
  ),
}))

vi.mock('react-chartjs-2', () => ({
  Bar: () => <canvas data-testid="bar-chart" />,
}))

vi.mock('../../widgets/DonutChartWidget', () => ({
  default: ({ title }: { title: string }) => <div data-testid="donut-chart-widget">{title}</div>,
}))

vi.mock('../views/RepositoriesTable', () => ({
  default: ({
    onRowClick,
    clearSelectionRef,
  }: {
    onRowClick?: (row: RepositoryRow) => void
    clearSelectionRef?: { current: (() => void) | null }
  }) => {
    if (clearSelectionRef) clearSelectionRef.current = vi.fn()
    return (
      <div data-testid="repositories-table">
        <button
          data-testid="repo-row-click"
          onClick={() =>
            onRowClick?.({
              repository: 'org/test-repo',
              session_count: 5,
              turns: 10,
              cost_usd: 2.5,
              files_changed: 3,
              lines_added: 20,
              lines_removed: 5,
              net_lines: 15,
              tool_success_rate: 90,
            })
          }
        />
      </div>
    )
  },
}))

vi.mock('../views/ExtendedSessionsModal', () => ({
  default: ({
    target,
    isVisible,
    onHide,
  }: {
    target: ExtendedSessionsTarget
    isVisible: boolean
    onHide: () => void
  }) =>
    isVisible ? (
      <div data-testid="extended-sessions-modal">
        <span data-testid="modal-title">{target.title}</span>
        <button data-testid="modal-close" onClick={onHide}>
          ×
        </button>
      </div>
    ) : null,
}))

const MOCK_FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }

describe('OverviewView', () => {
  it('renders headline KPI metrics', () => {
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('metric-total_sessions')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_cost_usd')).toBeInTheDocument()
    expect(screen.getByTestId('metric-duration_ms')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_turns')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_tool_calls')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_files_changed')).toBeInTheDocument()
  })

  it('renders token usage KPI metrics', () => {
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('metric-total_input_tokens')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_output_tokens')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_tokens')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_cache_creation_tokens')).toBeInTheDocument()
    expect(screen.getByTestId('metric-total_cache_read_tokens')).toBeInTheDocument()
  })

  it('renders efficiency KPI metrics', () => {
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('metric-cache_read_cost_usd')).toBeInTheDocument()
    expect(screen.getByTestId('metric-bloat_pct')).toBeInTheDocument()
    expect(screen.getByTestId('metric-dead_sessions')).toBeInTheDocument()
    expect(screen.getByTestId('metric-avg_context_per_call')).toBeInTheDocument()
  })

  it('renders activity timeline widget', () => {
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-net-lines-over-time')).toBeInTheDocument()
  })

  it('renders sessions by model donut widget', () => {
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('donut-chart-widget')).toBeInTheDocument()
  })

  it('renders repositories table', () => {
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('repositories-table')).toBeInTheDocument()
  })

  it('renders without crashing when kpis are null', () => {
    vi.mocked(useCliAnalyticsOverview).mockReturnValueOnce({
      kpis: null,
      dailyBuckets: [],
      modelBreakdown: [],
      loading: true,
      error: null,
    })

    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.queryByTestId('metric-total_sessions')).not.toBeInTheDocument()
  })

  it('does not render active-developers or reasoning-tokens tiles', () => {
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.queryByTestId('metric-active_developers')).not.toBeInTheDocument()
    expect(screen.queryByTestId('metric-total_reasoning_tokens')).not.toBeInTheDocument()
  })

  it('passes repositories prop to both hooks', () => {
    render(<OverviewView filters={MOCK_FILTERS} repositories={['repo-a']} />)

    expect(vi.mocked(useCliAnalyticsOverview)).toHaveBeenCalledWith(MOCK_FILTERS, ['repo-a'])
    expect(vi.mocked(useCliAnalyticsRepositories)).toHaveBeenCalledWith(
      MOCK_FILTERS,
      ['repo-a'],
      false,
      10
    )
  })

  it('opens ExtendedSessionsModal with repo title when a row is clicked', async () => {
    const user = userEvent.setup()
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.queryByTestId('extended-sessions-modal')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('repo-row-click'))
    expect(screen.getByTestId('extended-sessions-modal')).toBeInTheDocument()
    expect(screen.getByTestId('modal-title')).toHaveTextContent('org/test-repo')
  })

  it('closes ExtendedSessionsModal when onHide is called', async () => {
    const user = userEvent.setup()
    render(<OverviewView filters={MOCK_FILTERS} />)

    await user.click(screen.getByTestId('repo-row-click'))
    expect(screen.getByTestId('extended-sessions-modal')).toBeInTheDocument()
    await user.click(screen.getByTestId('modal-close'))
    expect(screen.queryByTestId('extended-sessions-modal')).not.toBeInTheDocument()
  })

  it('passes sessionFilters scoped to the selected repo to the modal', async () => {
    const user = userEvent.setup()
    render(<OverviewView filters={MOCK_FILTERS} />)

    await user.click(screen.getByTestId('repo-row-click'))
    expect(screen.getByTestId('modal-title')).toHaveTextContent('org/test-repo')
  })
})
