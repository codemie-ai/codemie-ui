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

import { ABSENT_VALUE_MARKER } from '@/constants'
import type { DispatchRow, SessionDetail, SessionEvent } from '@/types/cliAnalytics'

import SessionBody from '../views/SessionBody'

vi.mock('react-chartjs-2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-chartjs-2')>()),
  Line: ({ data }: { data: { datasets: { label: string }[] } }) => (
    <div data-testid="growth-chart">{data.datasets.map((d) => d.label).join('|')}</div>
  ),
}))

const BASE: SessionDetail = {
  trace_id: 't1',
  developer_name: 'alice@co.com',
  repository: 'svc',
  branch: null,
  start_time: '2026-07-01T09:00:00Z',
  duration_ms: 45000,
  model_name: 'claude-sonnet-4-6, mai-code-1.1-flash',
  input_tokens: 10,
  output_tokens: 10,
  cost_usd: 0.01617,
  cache_read_cost_usd: 0.004,
  tool_call_count: 0,
  harness_name: 'Claude-Code',
  events: [],
}

const card = (label: string) =>
  screen.getByText(label, { selector: 'p' }).parentElement?.parentElement as HTMLElement

const renderSession = (s: Partial<SessionDetail>) =>
  render(<SessionBody session={{ ...BASE, ...s }} />)

describe('SessionBody cost cards (EPMCDME-16522)', () => {
  it('shows an unknown cost and cache-read as a dash naming the unpriced models', () => {
    renderSession({
      cost_usd: 0,
      cache_read_cost_usd: 0,
      cost_available: false,
      unpriced_models: ['mai-code-1.1-flash'],
    })

    expect(screen.queryAllByText('$0.00')).toHaveLength(0)
    for (const label of ['Cost', 'Cache-read']) {
      expect(card(label).textContent).not.toContain('$')
      expect(card(label).querySelector('[data-tooltip-content]')).toHaveAttribute(
        'data-tooltip-content',
        'Cost unknown: no price for mai-code-1.1-flash'
      )
    }
  })

  it('marks a partly priced cost and cache-read as understated', () => {
    renderSession({ cost_available: true, unpriced_models: ['mai-code-1.1-flash'] })

    expect(card('Cost')).toHaveTextContent('$0.02')
    expect(card('Cache-read')).toHaveTextContent('$0.0040')
    for (const label of ['Cost', 'Cache-read']) {
      expect(card(label).querySelector('[data-testid="unpriced-cost-marker"]')).toHaveAttribute(
        'data-tooltip-content',
        'Understated: no price for mai-code-1.1-flash'
      )
    }
  })

  it('renders a fully priced session with formatted values and no marker', () => {
    renderSession({ cost_available: true, unpriced_models: [] })

    expect(card('Cost')).toHaveTextContent('$0.02')
    expect(card('Cache-read')).toHaveTextContent('$0.0040')
    expect(screen.queryByTestId('unpriced-cost-marker')).not.toBeInTheDocument()
  })

  it('keeps the dash for a missing cache-read cost of a priced session', () => {
    renderSession({ cost_available: true, unpriced_models: [], cache_read_cost_usd: undefined })

    expect(card('Cache-read')).toHaveTextContent('—')
  })
})

const EVENTS: SessionEvent[] = [1, 2].map((n) => ({
  timestamp: `2026-07-01T09:00:0${n}Z`,
  event_type: 'api_request',
  model_name: 'mai-code-1.1-flash',
  input_tokens: 10,
  output_tokens: 5,
  cost_usd: 0,
  tool_name: null,
}))

const DISPATCHES: DispatchRow[] = [
  {
    label: 'Explore',
    kind: 'agent',
    start_offset_ms: 0,
    duration_ms: 1000,
    cost_usd: 0,
    input_tokens: 10,
    output_tokens: 5,
  },
]

describe('SessionBody chart and timeline cost (EPMCDME-16522)', () => {
  it('hides the cost series and dispatch cost of an unknown-cost session', () => {
    renderSession({
      cost_usd: 0,
      cost_available: false,
      unpriced_models: ['mai-code-1.1-flash'],
      events: EVENTS,
      dispatches: DISPATCHES,
    })

    expect(screen.getByTestId('growth-chart')).toHaveTextContent('Tokens')
    expect(screen.getByTestId('growth-chart')).not.toHaveTextContent('Cost')
    expect(screen.queryAllByText('$0.00')).toHaveLength(0)
    const row = screen.getByRole('button', { name: /Explore/ })
    expect(row.getAttribute('title')).not.toContain('$')
    expect(row.getAttribute('title')).toContain(`Cost: ${ABSENT_VALUE_MARKER}`)
  })

  it('keeps the cost series and dispatch cost of a priced session', () => {
    renderSession({
      cost_available: true,
      unpriced_models: [],
      events: EVENTS,
      dispatches: DISPATCHES,
    })

    expect(screen.getByTestId('growth-chart')).toHaveTextContent('Cost ($)')
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0)
  })
})
