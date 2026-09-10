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
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AnalyticsQueryParams } from '@/types/analytics'

import { useCliAnalyticsEfficiency } from '../hooks/useCliAnalyticsEfficiency'
import { useCliAnalyticsSessions } from '../hooks/useCliAnalyticsSessions'
import EfficiencyView from '../views/EfficiencyView'

import type { ReactNode } from 'react'

vi.mock('../hooks/useCliAnalyticsEfficiency', () => ({
  useCliAnalyticsEfficiency: vi.fn(() => ({
    kpis: {
      avg_context_per_call: 15000,
      worst_session_ctx_per_call: 28000,
      worst_session_prompt: 'Refactor the analytics dashboard components',
      cache_read_cost_usd: 1.25,
      bloat_pct: 12.3,
    },
    deadSessions: {
      count: 8,
      pct_of_sessions: 5.6,
      wasted_cost_usd: 0.42,
      avg_cost_per_dead: 0.05,
    },
    sessionDepth: [{ bucket: '1-2', count: 10 }],
    codeChanges: {
      files_changed: 63,
      files_written: 20,
      files_edited: 43,
      net_lines: 1200,
    },
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

vi.mock('../hooks/useSessionModal', () => ({
  useSessionModal: vi.fn(() => ({
    selectedTraceId: null,
    selectSession: vi.fn(),
    closeSession: vi.fn(),
  })),
}))

vi.mock('../views/SessionModal', () => ({
  default: () => <div data-testid="session-modal" />,
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

const MOCK_FILTERS: AnalyticsQueryParams = {
  start_date: '2026-07-01',
  end_date: '2026-07-17',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('EfficiencyView', () => {
  it('renders the context bloat widget and its metrics', () => {
    render(<EfficiencyView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-context-bloat')).toBeInTheDocument()
    expect(screen.getByTestId('metric-avg_context_per_call')).toBeInTheDocument()
    expect(screen.getByTestId('metric-worst_session_ctx_per_call')).toBeInTheDocument()
    expect(screen.getByTestId('metric-cache_read_cost_usd')).toBeInTheDocument()
    expect(screen.getByTestId('metric-bloat_pct')).toBeInTheDocument()
  })

  it('renders the most bloated sessions widget', () => {
    render(<EfficiencyView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-most-bloated-sessions')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'SESSION' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FRAMEWORK' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'CTX/CALL' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'CACHE READ' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'COST' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'BLOAT%' })).toBeInTheDocument()
  })

  it('renders the dead sessions widget and its metrics', () => {
    render(<EfficiencyView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-dead-sessions')).toBeInTheDocument()
    expect(screen.getByTestId('metric-dead_sessions_count')).toBeInTheDocument()
    expect(screen.getByTestId('metric-wasted_cost_usd')).toBeInTheDocument()
    expect(screen.getByTestId('metric-avg_cost_per_dead')).toBeInTheDocument()
  })

  it('renders the session depth widget', () => {
    render(<EfficiencyView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-session-depth')).toBeInTheDocument()
  })

  it('renders the code changes widget and its metrics', () => {
    render(<EfficiencyView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-code-changes')).toBeInTheDocument()
    expect(screen.getByTestId('metric-files_changed')).toBeInTheDocument()
    expect(screen.getByTestId('metric-files_written')).toBeInTheDocument()
    expect(screen.getByTestId('metric-files_edited')).toBeInTheDocument()
    expect(screen.getByTestId('metric-net_lines')).toBeInTheDocument()
  })

  it('renders fallback metric values when kpis are null', () => {
    vi.mocked(useCliAnalyticsEfficiency).mockReturnValueOnce({
      kpis: null,
      deadSessions: null,
      sessionDepth: [],
      codeChanges: null,
      loading: false,
      error: null,
    })

    render(<EfficiencyView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-context-bloat')).toBeInTheDocument()
    expect(screen.getByTestId('metric-avg_context_per_call')).toBeInTheDocument()
    expect(screen.getByTestId('widget-dead-sessions')).toBeInTheDocument()
    expect(screen.getByTestId('metric-dead_sessions_count')).toBeInTheDocument()
    expect(screen.getByTestId('widget-code-changes')).toBeInTheDocument()
    expect(screen.getByTestId('metric-files_changed')).toBeInTheDocument()
  })

  it('renders when session depth is empty', () => {
    vi.mocked(useCliAnalyticsEfficiency).mockReturnValueOnce({
      kpis: {
        avg_context_per_call: 15000,
        worst_session_ctx_per_call: 28000,
        worst_session_prompt: 'Refactor the analytics dashboard components',
        cache_read_cost_usd: 1.25,
        bloat_pct: 12.3,
        worst_session_trace_id: null,
      },
      deadSessions: {
        count: 8,
        pct_of_sessions: 5.6,
        wasted_cost_usd: 0.42,
        avg_cost_per_dead: 0.05,
      },
      sessionDepth: [],
      codeChanges: {
        files_changed: 63,
        files_written: 20,
        files_edited: 43,
        net_lines: 1200,
      },
      loading: false,
      error: null,
    })

    render(<EfficiencyView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-session-depth')).toBeInTheDocument()
  })

  it('passes errors to applicable analytics widgets', () => {
    vi.mocked(useCliAnalyticsEfficiency).mockReturnValueOnce({
      kpis: null,
      deadSessions: null,
      sessionDepth: [],
      codeChanges: null,
      loading: false,
      error: 'Failed to fetch efficiency data',
    })

    render(<EfficiencyView filters={MOCK_FILTERS} />)

    expect(screen.getAllByTestId('widget-error')).toHaveLength(3)
    expect(screen.getAllByText('Failed to fetch efficiency data')).toHaveLength(3)
  })

  it('passes repositories to the efficiency and sessions hooks', () => {
    render(<EfficiencyView filters={MOCK_FILTERS} repositories={['repo-a']} />)

    expect(vi.mocked(useCliAnalyticsEfficiency)).toHaveBeenCalledWith(MOCK_FILTERS, ['repo-a'])
    expect(vi.mocked(useCliAnalyticsSessions)).toHaveBeenCalledWith(MOCK_FILTERS, ['repo-a'], {
      sort_by: 'ctx_per_call',
      per_page: 10,
    })
  })
})
