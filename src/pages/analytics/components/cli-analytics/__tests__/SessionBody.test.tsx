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

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ABSENT_VALUE_MARKER } from '@/constants'
import type { DispatchRow, SessionDetail, SessionEvent } from '@/types/cliAnalytics'

import SessionBody from '../views/SessionBody'

interface LineProps {
  data: { labels: string[]; datasets: { label: string; data: number[] }[] }
  options: {
    scales: {
      x: { ticks: { callback?: unknown } }
      y: { display?: boolean; min?: number; beginAtZero?: boolean }
    }
  }
}

const chart = vi.hoisted(() => ({ props: null as unknown }))

vi.mock('react-chartjs-2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-chartjs-2')>()),
  Line: (props: LineProps) => {
    chart.props = props
    return (
      <div
        data-testid="growth-chart"
        data-y-display={String(props.options.scales.y.display ?? true)}
      >
        {props.data.datasets.map((d) => d.label).join('|')}
      </div>
    )
  },
}))

const lineProps = () => chart.props as LineProps
const series = (label: string) =>
  lineProps().data.datasets.find((d) => d.label === label)?.data ?? []

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
    for (const label of ['Est. Cost', 'Cache Re-Read Cost']) {
      expect(card(label).textContent).not.toContain('$')
      expect(card(label).querySelector('[data-tooltip-content]')).toHaveAttribute(
        'data-tooltip-content',
        'Cost unknown: no price for mai-code-1.1-flash'
      )
    }
    expect(screen.getAllByText('Cost unknown: no price for mai-code-1.1-flash')).toHaveLength(2)
  })

  it('marks a partly priced cost and cache-read as understated', () => {
    renderSession({ cost_available: true, unpriced_models: ['mai-code-1.1-flash'] })

    expect(card('Est. Cost')).toHaveTextContent('$0.02')
    expect(card('Cache Re-Read Cost')).toHaveTextContent('$0.004')
    for (const label of ['Est. Cost', 'Cache Re-Read Cost']) {
      expect(card(label).querySelector('[data-testid="unpriced-cost-marker"]')).toHaveAttribute(
        'data-tooltip-content',
        'Understated: no price for mai-code-1.1-flash'
      )
    }
    expect(screen.getAllByText('Understated: no price for mai-code-1.1-flash')).toHaveLength(2)
  })

  it('renders a fully priced session with formatted values and no marker', () => {
    renderSession({ cost_available: true, unpriced_models: [] })

    expect(card('Est. Cost')).toHaveTextContent('$0.02')
    expect(card('Cache Re-Read Cost')).toHaveTextContent('$0.004')
    expect(screen.queryByTestId('unpriced-cost-marker')).not.toBeInTheDocument()
  })

  it('keeps the dash for a missing cache-read cost of a priced session', () => {
    renderSession({ cost_available: true, unpriced_models: [], cache_read_cost_usd: undefined })

    expect(card('Cache Re-Read Cost')).toHaveTextContent('—')
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
    expect(screen.getByTestId('growth-chart')).toHaveAttribute('data-y-display', 'false')
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
    expect(screen.getByTestId('growth-chart')).toHaveAttribute('data-y-display', 'true')
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0)
  })

  it('labels the cost series as understated for a partly priced session', () => {
    renderSession({
      cost_available: true,
      unpriced_models: ['mai-code-1.1-flash'],
      events: EVENTS,
    })

    expect(screen.getByTestId('growth-chart')).toHaveTextContent('Cost ($, understated)')
  })

  it('does not qualify dispatch costs of a partly priced session', () => {
    renderSession({
      cost_available: true,
      unpriced_models: ['mai-code-1.1-flash'],
      events: EVENTS,
      dispatches: DISPATCHES,
    })

    const row = screen.getByRole('button', { name: /Explore/ })
    expect(row.getAttribute('title')).not.toContain('understated')
    const panel = screen.getByText('Token Breakdown').closest('.w-52') as HTMLElement
    expect(within(panel).getByText('$0.00')).toBeInTheDocument()
    expect(within(panel).queryByTestId('unpriced-cost-marker')).not.toBeInTheDocument()
  })
})

const apiRequest = (
  minute: number,
  usage: Partial<SessionEvent> & Pick<SessionEvent, 'cost_usd'>
): SessionEvent => ({
  timestamp: `2026-07-01T09:${String(minute).padStart(2, '0')}:00Z`,
  event_type: 'api_request',
  model_name: 'claude-sonnet-4-6',
  input_tokens: 0,
  output_tokens: 0,
  tool_name: null,
  ...usage,
})

describe('SessionBody token and cost growth (EPMCDME-16574)', () => {
  // 3 turns, 8 API requests: the chart has no turn boundaries, so it plots one point per request.
  const REQUESTS: SessionEvent[] = [
    apiRequest(1, {
      input_tokens: 100,
      output_tokens: 10,
      cache_read_tokens: 0,
      cache_creation_tokens: 500,
      cost_usd: 0.5,
    }),
    apiRequest(2, {
      input_tokens: 10,
      output_tokens: 20,
      cache_read_tokens: 500,
      cache_creation_tokens: 0,
      cost_usd: 0.25,
    }),
    apiRequest(3, {
      input_tokens: 10,
      output_tokens: 30,
      cache_read_tokens: 500,
      cache_creation_tokens: 40,
      cost_usd: 0.25,
    }),
    apiRequest(4, {
      input_tokens: 20,
      output_tokens: 5,
      cache_read_tokens: 540,
      cache_creation_tokens: 0,
      cost_usd: 0.125,
    }),
    apiRequest(5, {
      input_tokens: 5,
      output_tokens: 15,
      cache_read_tokens: 540,
      cache_creation_tokens: 60,
      cost_usd: 0.25,
    }),
    apiRequest(6, {
      input_tokens: 5,
      output_tokens: 5,
      cache_read_tokens: 600,
      cache_creation_tokens: 0,
      cost_usd: 0.125,
    }),
    apiRequest(7, {
      input_tokens: 15,
      output_tokens: 25,
      cache_read_tokens: 600,
      cache_creation_tokens: 0,
      cost_usd: 0.25,
    }),
    apiRequest(8, {
      input_tokens: 5,
      output_tokens: 10,
      cache_read_tokens: 600,
      cache_creation_tokens: 100,
      cost_usd: 0.25,
    }),
  ]
  const sum = (key: keyof SessionEvent) =>
    REQUESTS.reduce((acc, e) => acc + ((e[key] as number | null | undefined) ?? 0), 0)
  // The session totals come from the same requests, so the TOTAL tile and the chart share one source.
  const SESSION: Partial<SessionDetail> = {
    turns: 3,
    input_tokens: sum('input_tokens'),
    output_tokens: sum('output_tokens'),
    cache_read_tokens: sum('cache_read_tokens'),
    cache_creation_tokens: sum('cache_creation_tokens'),
    cost_usd: sum('cost_usd'),
    cost_available: true,
    unpriced_models: [],
    events: REQUESTS,
  }

  it('plots one point per API request labelled from 1, never "turn 0"', () => {
    renderSession(SESSION)

    expect(lineProps().data.labels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
    expect(lineProps().options.scales.x.ticks.callback).toBeUndefined()
    expect(screen.getByText('Cumulative cost and tokens per API request.')).toBeInTheDocument()
  })

  it('ends the token line at the TOTAL tile, cache creation included, and the cost line at the session cost', () => {
    renderSession(SESSION)

    const total =
      sum('input_tokens') +
      sum('output_tokens') +
      sum('cache_read_tokens') +
      sum('cache_creation_tokens')
    expect(series('Tokens').at(-1)).toBe(total)
    expect(series('Cost ($)').at(-1)).toBe(SESSION.cost_usd)
  })

  it('floors the cost axis at $0 for a session whose requests all cost $0', () => {
    renderSession({
      cost_usd: 0,
      cost_available: true,
      unpriced_models: [],
      events: [
        apiRequest(1, { input_tokens: 100, output_tokens: 10, cost_usd: 0 }),
        apiRequest(2, { input_tokens: 50, output_tokens: 20, cost_usd: 0 }),
      ],
    })

    expect(lineProps().options.scales.y.min).toBe(0)
    expect(series('Cost ($)')).toEqual([0, 0])
  })
})
