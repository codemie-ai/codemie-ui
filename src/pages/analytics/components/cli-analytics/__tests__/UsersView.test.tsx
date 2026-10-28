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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AnalyticsQueryParams, Metric } from '@/types/analytics'
import type { ExtendedSessionsTarget, UserRow } from '@/types/cliAnalytics'

import { useCliAnalyticsUsers } from '../hooks/useCliAnalyticsUsers'
import UsersView from '../views/UsersView'

vi.mock('../hooks/useCliAnalyticsUsers', () => ({
  useCliAnalyticsUsers: vi.fn(),
}))

vi.mock('../../widgets/DonutChartWidget', () => ({
  default: ({ title }: { title: string }) => <div data-testid="donut-chart-widget">{title}</div>,
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>{children}</div>
  ),
}))

// Invokes customRenderColumns so the TOOL SUCCESS cell is actually exercised.
vi.mock('@/components/Table', () => ({
  default: ({
    items,
    customRenderColumns,
    onSelectRow,
  }: {
    items: UserRow[]
    customRenderColumns?: Record<string, (row: UserRow) => React.ReactNode>
    onSelectRow?: (rows: UserRow[]) => void
  }) => (
    <div data-testid="user-table">
      {items.map((item) => (
        <div key={item.developer_name}>
          <button data-testid="user-row" onClick={() => onSelectRow?.([item])}>
            {item.developer_name}
          </button>
          <span data-testid="cell-tool-success">
            {customRenderColumns?.tool_success_rate?.(item)}
          </span>
        </div>
      ))}
    </div>
  ),
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
        <span data-testid="modal-tool-success">
          {String(target.metrics?.find((m: Metric) => m.id === 'tool_success_rate')?.value)}
        </span>
        <button data-testid="modal-close" onClick={onHide}>
          ×
        </button>
      </div>
    ) : null,
}))

const MOCK_FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }

const CHART_ROWS = [{ developer_name: 'alice', cost_usd: 5.0 }]

const ALICE: UserRow = {
  developer_name: 'Alice',
  user_id: 'u-001',
  session_count: 4,
  turns: 8,
  tool_calls: 20,
  tool_success_rate: 95,
  net_lines: 30,
  top_model: 'claude-sonnet-4-5',
  input_tokens: 10000,
  output_tokens: 2000,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  cost_usd: 1.5,
  last_active: null,
}

function renderWithRow(overrides: Partial<UserRow> = {}) {
  vi.mocked(useCliAnalyticsUsers).mockReturnValue({
    chartRows: CHART_ROWS,
    tableRows: [{ ...ALICE, ...overrides }],
    totalCount: 1,
    currentPage: 0,
    pageSize: 20,
    avgSessionDurationMs: 120000,
    loading: false,
    error: null,
    setPage: vi.fn(),
  } as unknown as ReturnType<typeof useCliAnalyticsUsers>)
  return render(<UsersView filters={MOCK_FILTERS} />)
}

describe('UsersView', () => {
  beforeEach(() => {
    vi.mocked(useCliAnalyticsUsers).mockReset()
  })

  it('renders the per-user detail widget', () => {
    renderWithRow()
    expect(screen.getByTestId('widget-per-user-detail')).toBeInTheDocument()
  })

  it('opens ExtendedSessionsModal with user name when a user row is clicked', async () => {
    const user = userEvent.setup()
    renderWithRow()

    expect(screen.queryByTestId('extended-sessions-modal')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByTestId('extended-sessions-modal')).toBeInTheDocument()
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Alice')
  })

  it('closes ExtendedSessionsModal when onHide is called', async () => {
    const user = userEvent.setup()
    renderWithRow()

    await user.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByTestId('extended-sessions-modal')).toBeInTheDocument()
    await user.click(screen.getByTestId('modal-close'))
    expect(screen.queryByTestId('extended-sessions-modal')).not.toBeInTheDocument()
  })

  it('dashes Tool Success in the table when the user made no tool calls', () => {
    renderWithRow({ tool_calls: 0, tool_success_rate: 0 })
    expect(screen.getByTestId('cell-tool-success')).toHaveTextContent('—')
  })

  it('dashes Tool Success in the user modal when the user made no tool calls', async () => {
    const user = userEvent.setup()
    renderWithRow({ tool_calls: 0, tool_success_rate: 0 })

    await user.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByTestId('modal-tool-success')).toHaveTextContent('—')
  })

  it('keeps a real 0% in the table when every tool call failed', () => {
    renderWithRow({ tool_calls: 12, tool_success_rate: 0 })
    expect(screen.getByTestId('cell-tool-success')).toHaveTextContent('0.00%')
  })
})
