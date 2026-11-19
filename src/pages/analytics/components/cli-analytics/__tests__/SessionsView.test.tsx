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

import { useCliAnalyticsSessions } from '../hooks/useCliAnalyticsSessions'
import SessionsView from '../views/SessionsView'

vi.mock('../hooks/useCliAnalyticsSessions', () => ({
  useCliAnalyticsSessions: vi.fn(() => ({
    displayRows: [],
    loading: false,
    error: null,
    page: 1,
    total: 1,
    totalPages: 1,
    perPage: 20,
    setPage: vi.fn(),
    search: '',
    setSearch: vi.fn(),
  })),
}))

vi.mock('../views/SessionModal', () => ({
  default: ({ traceId, onHide }: { traceId: string; onHide: () => void }) => (
    <div data-testid="session-modal" data-trace-id={traceId}>
      <button onClick={onHide}>Close</button>
    </div>
  ),
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({
    title,
    children,
    error,
    className,
  }: {
    title: string
    children: React.ReactNode
    error?: { message: string } | null
    className?: string
  }) => (
    <div data-testid={`widget-${title}`} className={className}>
      {error && <span data-testid="widget-error">{error.message}</span>}
      {children}
    </div>
  ),
}))

const MOCK_FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-22' }

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

describe('SessionsView', () => {
  it('renders the Sessions widget', () => {
    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-Sessions')).toBeInTheDocument()
  })

  it('renders all column headers in order', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [MOCK_ROW],
      loading: false,
      error: null,
      page: 1,
      total: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Date',
      'Prompt',
      'Repository',
      'Branch',
      'Framework',
      'Est. Cost',
      'Turns',
      'Net Lines',
      'Input Tokens',
      'Output Tokens',
      'Cache Read Tokens',
    ])
  })

  it.each([
    [null, 'none', undefined, '—'],
    [0, 'final', ['turns'], '0'],
    [4, 'final', ['turns'], '4'],
    [4, 'provisional', ['turns'], '4+'],
    [4, undefined, undefined, '4+'],
  ] as const)('turns %s / %s renders %s', (turns, state, metrics, text) => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [
        { ...MOCK_ROW, turns, summary_state: state, summary_metrics: metrics as never },
      ],
      loading: false,
      error: null,
      page: 1,
      total: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getAllByRole('cell').some((c) => c.textContent === text)).toBe(true)
  })

  it('renders a search input with correct placeholder', () => {
    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getByPlaceholderText('Search sessions...')).toBeInTheDocument()
  })

  it('renders formatted cost in row data', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [MOCK_ROW],
      loading: false,
      error: null,
      page: 1,
      total: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getByText('$0.05')).toBeInTheDocument()
  })

  it('shows cache reads only in the Cache Read Tokens cell, not reads plus creation', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [MOCK_ROW],
      loading: false,
      error: null,
      page: 1,
      total: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    const cell = screen.getAllByRole('cell')[headers.indexOf('Cache Read Tokens')]
    expect(cell).toHaveTextContent(/^100$/)
  })

  it('passes error to AnalyticsWidget', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [],
      loading: false,
      error: 'Failed to fetch sessions',
      page: 1,
      total: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-error')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch sessions')).toBeInTheDocument()
  })

  it('does not render SessionModal when no row is selected', () => {
    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.queryByTestId('session-modal')).not.toBeInTheDocument()
  })

  it('opens SessionModal when a row is clicked and closes on onHide', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValue({
      displayRows: [MOCK_ROW],
      loading: false,
      error: null,
      page: 1,
      total: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    fireEvent.click(screen.getByText('proj-a'))

    expect(screen.getByTestId('session-modal')).toBeInTheDocument()
    expect(screen.getByTestId('session-modal')).toHaveAttribute('data-trace-id', 'abc-123')

    fireEvent.click(screen.getByText('Close'))

    expect(screen.queryByTestId('session-modal')).not.toBeInTheDocument()
  })

  it('renders Not reported in italic-gray for a session with null repository', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [{ ...MOCK_ROW, repository: null, branch: null }],
      loading: false,
      error: null,
      page: 1,
      total: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    const labels = screen.getAllByText('Not reported')
    expect(labels.length).toBeGreaterThanOrEqual(1)
    labels.forEach((el) => {
      expect(el.tagName.toLowerCase()).toBe('span')
      expect(el.className).toContain('italic')
    })
  })

  describe('gap warning', () => {
    const mockSessions = (rows: unknown[], total: number) =>
      vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
        displayRows: rows as never,
        loading: false,
        error: null,
        page: 1,
        total,
        totalPages: Math.ceil(total / 20),
        perPage: 20,
        setPage: vi.fn(),
        search: '',
        setSearch: vi.fn(),
      })

    it('counts every session of the Unattributed drill-down, not only the loaded page', () => {
      mockSessions(Array(20).fill({ ...MOCK_ROW, repository: null }), 1183)
      render(<SessionsView filters={MOCK_FILTERS} isUnattributed />)
      expect(
        screen.getByText(/1,183 sessions in this view have no repository/i)
      ).toBeInTheDocument()
    })

    it('uses the singular for one unattributed session', () => {
      mockSessions([{ ...MOCK_ROW, repository: null }], 1)
      render(<SessionsView filters={MOCK_FILTERS} isUnattributed />)
      expect(screen.getByText(/^1 session has no repository/i)).toBeInTheDocument()
    })

    it('shows no banner when the view mixes attributed and unattributed sessions', () => {
      mockSessions([{ ...MOCK_ROW, repository: null }, MOCK_ROW], 1183)
      render(<SessionsView filters={MOCK_FILTERS} />)
      expect(screen.queryByText(/analytics plugin was not active/i)).not.toBeInTheDocument()
    })
  })

  it('does not render InfoWarning banner when all sessions have a repository', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [MOCK_ROW],
      loading: false,
      error: null,
      page: 1,
      total: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.queryByText(/analytics plugin was not active/i)).not.toBeInTheDocument()
  })

  describe('net lines', () => {
    const renderRow = (net_lines: number | null) => {
      vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
        displayRows: [{ ...MOCK_ROW, net_lines }],
        loading: false,
        error: null,
        page: 1,
        total: 1,
        totalPages: 1,
        perPage: 20,
        setPage: vi.fn(),
        search: '',
        setSearch: vi.fn(),
      })
      return render(<SessionsView filters={MOCK_FILTERS} />)
    }
    const TITLE = 'Not reported - no line data was received'

    it('renders the marker with a title for null', () => {
      renderRow(null)
      expect(screen.getByTitle(TITLE)).toHaveTextContent('-')
    })

    it('renders 0 without a title', () => {
      renderRow(0)
      expect(screen.queryByTitle(TITLE)).not.toBeInTheDocument()
    })

    it('renders a positive number grouped', () => {
      renderRow(1234)
      expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument()
    })
  })
  describe('cost', () => {
    const renderRow = (row: Partial<SessionRow>) => {
      vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
        displayRows: [{ ...MOCK_ROW, ...row }],
        loading: false,
        error: null,
        page: 1,
        total: 1,
        totalPages: 1,
        perPage: 20,
        setPage: vi.fn(),
        search: '',
        setSearch: vi.fn(),
      })
      return render(<SessionsView filters={MOCK_FILTERS} />)
    }
    const costCell = () => {
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
      return screen.getAllByRole('cell')[headers.indexOf('Est. Cost')]
    }

    it('shows an unknown cost as a dash naming the unpriced models, never $0.00', () => {
      renderRow({ cost_usd: 0, cost_available: false, unpriced_models: ['mai-code-1.1-flash'] })

      expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
      expect(costCell()).toHaveTextContent(/^-/)
      expect(costCell().querySelector('[data-tooltip-content]')).toHaveAttribute(
        'data-tooltip-content',
        'Cost unknown.\nModel with missing pricing for some or all usage: mai-code-1.1-flash\nThe cost could not be estimated because pricing is unavailable for this usage.'
      )
    })

    it('marks a partly priced cost as understated', () => {
      renderRow({
        cost_usd: 0.01617,
        cost_available: true,
        unpriced_models: ['mai-code-1.1-flash'],
      })

      expect(costCell()).toHaveTextContent('$0.02')
      expect(screen.getByTestId('unpriced-cost-marker')).toHaveAttribute(
        'data-tooltip-content',
        'Partial estimate.\nModel with missing pricing for some or all usage: mai-code-1.1-flash\nThe estimate excludes usage that could not be priced.'
      )
    })

    it('marks a row by its own cost_incomplete flag (generic status, no names) with the icon before the amount', () => {
      renderRow({
        cost_usd: 0.01617,
        cost_available: true,
        cost_incomplete: true,
        unpriced_models: [],
      })

      const marker = screen.getByTestId('unpriced-cost-marker')
      expect(marker).toHaveAttribute(
        'data-tooltip-content',
        'Partial estimate.\nThe estimate excludes usage that could not be priced.'
      )
      expect(marker.nextSibling?.textContent).toBe('$0.02')
    })

    it('renders a fully priced cost without a marker', () => {
      renderRow({ cost_usd: 0.01617, cost_available: true, unpriced_models: [] })

      expect(costCell()).toHaveTextContent('$0.02')
      expect(screen.queryByTestId('unpriced-cost-marker')).not.toBeInTheDocument()
    })
  })

  describe('fill-height layout', () => {
    it('keeps a min-height floor on the widget when it fills the available height', () => {
      render(<SessionsView filters={MOCK_FILTERS} fillAvailableHeight />)

      expect(screen.getByTestId('widget-Sessions').className).toContain('min-h-[360px]')
    })

    it('does not add the floor without fillAvailableHeight', () => {
      render(<SessionsView filters={MOCK_FILTERS} />)

      expect(screen.getByTestId('widget-Sessions').className).not.toContain('min-h-[360px]')
    })

    it('keeps the table wrapper horizontally scrollable without imposing a height', () => {
      render(<SessionsView filters={MOCK_FILTERS} fillAvailableHeight />)

      const wrapper = screen.getByRole('table').closest('.overflow-x-auto') as HTMLElement
      const tokens = wrapper.className.split(/\s+/)
      expect(tokens).toContain('min-w-0')
      expect(tokens.some((t) => /^(max-)?h-/.test(t))).toBe(false)
    })
  })
})
