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
  }: {
    title: string
    children: React.ReactNode
    error?: { message: string } | null
  }) => (
    <div data-testid={`widget-${title}`}>
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
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'DATE',
      'PROMPT',
      'REPOSITORY',
      'BRANCH',
      'FRAMEWORK',
      'TURNS',
      'NET LINES',
      'INPUT',
      'OUTPUT',
      'CACHED',
      'COST',
    ])
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
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getByText('$0.05')).toBeInTheDocument()
  })

  it('passes error to AnalyticsWidget', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [],
      loading: false,
      error: 'Failed to fetch sessions',
      page: 1,
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

  it('renders InfoWarning banner when at least one session has null repository', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [{ ...MOCK_ROW, repository: null }],
      loading: false,
      error: null,
      page: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.getByText(/analytics plugin was not active/i)).toBeInTheDocument()
  })

  it('does not render InfoWarning banner when all sessions have a repository', () => {
    vi.mocked(useCliAnalyticsSessions).mockReturnValueOnce({
      displayRows: [MOCK_ROW],
      loading: false,
      error: null,
      page: 1,
      totalPages: 1,
      perPage: 20,
      setPage: vi.fn(),
      search: '',
      setSearch: vi.fn(),
    })

    render(<SessionsView filters={MOCK_FILTERS} />)

    expect(screen.queryByText(/analytics plugin was not active/i)).not.toBeInTheDocument()
  })
})
