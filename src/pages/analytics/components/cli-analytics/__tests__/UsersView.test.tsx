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
import type { ExtendedSessionsTarget } from '@/types/cliAnalytics'

import UsersView from '../views/UsersView'

vi.mock('../hooks/useCliAnalyticsUsers', () => {
  const chartRows = [{ developer_name: 'alice', cost_usd: 5.0 }]
  const tableRows = [
    {
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
    },
  ]
  return {
    useCliAnalyticsUsers: vi.fn(() => ({
      chartRows,
      tableRows,
      totalCount: 1,
      currentPage: 0,
      pageSize: 20,
      avgSessionDurationMs: 120000,
      loading: false,
      error: null,
      setPage: vi.fn(),
    })),
  }
})

vi.mock('../../widgets/DonutChartWidget', () => ({
  default: ({ title }: { title: string }) => <div data-testid="donut-chart-widget">{title}</div>,
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>{children}</div>
  ),
}))

vi.mock('@/components/Table', () => ({
  default: ({
    items,
    onSelectRow,
  }: {
    items: { developer_name: string; user_id?: string | null }[]
    onSelectRow?: (rows: { developer_name: string; user_id?: string | null }[]) => void
  }) => (
    <div data-testid="user-table">
      {items.map((item) => (
        <button
          key={item.developer_name}
          data-testid="user-row"
          onClick={() => onSelectRow?.([item])}
        >
          {item.developer_name}
        </button>
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
        <button data-testid="modal-close" onClick={onHide}>
          ×
        </button>
      </div>
    ) : null,
}))

const MOCK_FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }

describe('UsersView', () => {
  it('renders the per-user detail widget', () => {
    render(<UsersView filters={MOCK_FILTERS} />)
    expect(screen.getByTestId('widget-per-user-detail')).toBeInTheDocument()
  })

  it('opens ExtendedSessionsModal with user name when a user row is clicked', async () => {
    const user = userEvent.setup()
    render(<UsersView filters={MOCK_FILTERS} />)

    expect(screen.queryByTestId('extended-sessions-modal')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByTestId('extended-sessions-modal')).toBeInTheDocument()
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Alice')
  })

  it('closes ExtendedSessionsModal when onHide is called', async () => {
    const user = userEvent.setup()
    render(<UsersView filters={MOCK_FILTERS} />)

    await user.click(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByTestId('extended-sessions-modal')).toBeInTheDocument()
    await user.click(screen.getByTestId('modal-close'))
    expect(screen.queryByTestId('extended-sessions-modal')).not.toBeInTheDocument()
  })
})
