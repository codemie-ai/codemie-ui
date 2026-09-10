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

import { ColumnType, MetricFormat } from '@/types/analytics'
import type { ExtendedSessionsTarget } from '@/types/cliAnalytics'

import ExtendedSessionsModal from '../views/ExtendedSessionsModal'

vi.mock('@/components/Popup', () => ({
  default: ({
    visible,
    children,
    onHide,
    header,
  }: {
    visible?: boolean
    children: React.ReactNode
    onHide: () => void
    header?: string
  }) =>
    visible ? (
      <div data-testid="popup">
        <span data-testid="popup-header">{header}</span>
        <button data-testid="popup-close" onClick={onHide}>
          ×
        </button>
        {children}
      </div>
    ) : null,
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>{children}</div>
  ),
}))

vi.mock('../../widgets/MetricCard', () => ({
  default: ({ metric }: { metric: { id: string; label: string; value: unknown } }) => (
    <div data-testid={`metric-${metric.id}`}>
      <span>{metric.label}</span>
      <span data-testid={`metric-value-${metric.id}`}>{String(metric.value)}</span>
    </div>
  ),
}))

vi.mock('../views/SessionsView', () => ({
  default: ({ filters, repositories }: { filters: unknown; repositories?: string[] }) => (
    <div
      data-testid="sessions-view"
      data-filters={JSON.stringify(filters)}
      data-repositories={JSON.stringify(repositories)}
    />
  ),
}))

const MOCK_TARGET: ExtendedSessionsTarget = {
  title: 'org/my-repo',
  metrics: [
    { id: 'session_count', label: 'Sessions', type: ColumnType.INTEGER, value: 10 },
    {
      id: 'cost_usd',
      label: 'Est. Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: 3.75,
    },
  ],
  sessionFilters: { start_date: '2026-07-01', repository: 'org/my-repo' },
  repositories: ['org/my-repo'],
}

const DEFAULT_PROPS = {
  target: MOCK_TARGET,
  isVisible: true,
  onHide: vi.fn(),
}

describe('ExtendedSessionsModal', () => {
  it('renders popup with target.title as header', () => {
    render(<ExtendedSessionsModal {...DEFAULT_PROPS} />)
    expect(screen.getByTestId('popup-header')).toHaveTextContent('org/my-repo')
  })

  it('renders all metrics from target.metrics', () => {
    render(<ExtendedSessionsModal {...DEFAULT_PROPS} />)
    expect(screen.getByTestId('metric-session_count')).toBeInTheDocument()
    expect(screen.getByTestId('metric-value-session_count')).toHaveTextContent('10')
    expect(screen.getByTestId('metric-cost_usd')).toBeInTheDocument()
  })

  it('passes target.sessionFilters and target.repositories to SessionsView', () => {
    render(<ExtendedSessionsModal {...DEFAULT_PROPS} />)
    const sv = screen.getByTestId('sessions-view')
    expect(JSON.parse(sv.getAttribute('data-filters') ?? '{}')).toMatchObject({
      repository: 'org/my-repo',
    })
    expect(JSON.parse(sv.getAttribute('data-repositories') ?? '[]')).toEqual(['org/my-repo'])
  })

  it('calls onHide when popup close is clicked', async () => {
    const onHide = vi.fn()
    const user = userEvent.setup()
    render(<ExtendedSessionsModal {...DEFAULT_PROPS} onHide={onHide} />)
    await user.click(screen.getByTestId('popup-close'))
    expect(onHide).toHaveBeenCalledOnce()
  })

  it('does not render when isVisible is false', () => {
    render(<ExtendedSessionsModal {...DEFAULT_PROPS} isVisible={false} />)
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('always renders the summary widget', () => {
    render(<ExtendedSessionsModal {...DEFAULT_PROPS} />)
    expect(screen.getByTestId('widget-summary')).toBeInTheDocument()
  })
})
