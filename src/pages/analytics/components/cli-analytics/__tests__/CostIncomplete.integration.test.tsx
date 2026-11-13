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

// Consumer-level checks: the real store, hooks and views, with only `api.get` answered by a
// controlled response, so the metadata travels from the aggregating API answer to the screen.
import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'

import CostView from '../views/CostView'
import OverviewView from '../views/OverviewView'
import RepositoriesView from '../views/RepositoriesView'
import UsersView from '../views/UsersView'

const mockApi = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/utils/api', () => ({ default: mockApi }))

type BarData = { labels: string[]; datasets: { data: (number | null)[] }[] }

const chartData = vi.hoisted(() => ({ bars: [] as BarData[] }))
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: BarData }) => {
    chartData.bars.push(data)
    return <div data-testid="bar-chart" />
  },
  Doughnut: () => <div data-testid="donut-chart" />,
}))
vi.mock('@/utils/tailwindColors', () => ({ getTailwindColor: (_: string, f: string) => f }))
vi.mock('@/utils/chartColors', () => ({
  generateChartColors: (n: number) => Array(n).fill('#000'),
}))

type Route = (params: Record<string, unknown>) => unknown
let routes: Record<string, Route> = {}

const BASE = 'v1/analytics/cli-analytics/'
const FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }
const WITH_USER: AnalyticsQueryParams = { ...FILTERS, users: ['u1'] }
const PAGINATION = { page: 0, per_page: 10, total_count: 1, has_more: false }
const UNPRICED_RAW = 'bedrock/converse/anthropic.claude-opus-4-20250514-v1:0'
const UNPRICED_ROW = 'claude-opus-4-20250514'

const kpis = (cost: number) => ({
  total_sessions: 3,
  total_cost_usd: cost,
  cache_read_cost_usd: 0,
  total_tokens: 10,
  total_input_tokens: 5,
  total_output_tokens: 5,
  total_cache_creation_tokens: 0,
  total_cache_read_tokens: 0,
  total_turns: 3,
  total_tool_calls: 0,
  tool_call_success_rate: 0,
  dead_sessions: 0,
  bloat_pct: 0,
  avg_context_per_call: 0,
  duration_ms: 1,
  total_files_changed: 0,
  net_lines: 0,
})

const FULL = { cost_incomplete: false, unpriced_models: [] }
const PARTIAL = { cost_incomplete: true, unpriced_models: [UNPRICED_RAW] }

const overviewBody = (cost: number, metadata: object) => ({
  data: { kpis: kpis(cost), daily_buckets: [], model_breakdown: [] },
  metadata,
})

const costBody = (cost: number, metadata: object, byModel: object[]) => ({
  data: {
    kpis: {
      total_sessions: 3,
      total_cost_usd: cost,
      total_tokens: 10,
      avg_cost_per_session: cost / 3,
    },
    cost_by_user: [{ developer_name: 'alice', cost_usd: cost }],
    cost_by_model: byModel,
  },
  metadata,
})

const userRow = (cost_usd: number) => ({
  developer_name: 'alice',
  session_count: 1,
  input_tokens: 1,
  output_tokens: 1,
  cost_usd,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  user_id: 'u1',
})

const projectsBody = (cost: number, metadata: object) => ({
  data: {
    rows: [
      {
        project_name: 'proj',
        repository_count: 1,
        session_count: 1,
        turns: 1,
        cost_usd: cost,
        files_changed: 0,
        lines_added: 0,
        lines_removed: 0,
        net_lines: 0,
        tool_calls: 0,
        tool_calls_success: 0,
        tool_success_rate: 0,
        repositories: [],
      },
    ],
    pagination: PAGINATION,
  },
  metadata,
})

const quiet: Record<string, Route> = {
  sessions: () => ({ data: { sessions: [], page: 0, per_page: 10, total: 0 } }),
  repositories: () => ({ data: { rows: [], pagination: PAGINATION } }),
  users: () => ({ data: { rows: [userRow(1)], total_count: 1, avg_session_duration_ms: 1 } }),
}

const serve = (extra: Record<string, Route>) => {
  routes = { ...quiet, ...extra }
}

const resetStore = () => {
  Object.assign(cliAnalyticsStore, {
    overview: null,
    cost: null,
    users: null,
    projects: null,
    repositories: null,
    sessions: null,
    userCount: null,
    apiSpend: null,
    loading: {},
    error: {},
  })
}

// The marks live in tooltips and sr-only text, which Testing Library skips as text.
const tips = (label: string) =>
  Array.from(card(label).querySelectorAll('[data-tooltip-content]')).map((el) =>
    el.getAttribute('data-tooltip-content')
  )

const card = (label: string) =>
  screen
    .getAllByText(label)
    .map((el) => el.closest('.rounded-md'))
    .find(Boolean) as HTMLElement

beforeEach(() => {
  chartData.bars = []
  resetStore()
  mockApi.get.mockImplementation(
    async (endpoint: string, opts: { params: Record<string, unknown> }) => {
      const route = routes[endpoint.replace(BASE, '')]
      if (!route) throw new Error(`unrouted ${endpoint}`)
      const body = await route(opts.params ?? {})

      return { json: () => Promise.resolve(body) }
    }
  )
})

describe('Overview Est. Cost', () => {
  it('shows a fully priced total without any mark', async () => {
    serve({ overview: () => overviewBody(5, FULL) })
    render(<OverviewView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$5.00'))
    expect(within(card('Est. Cost')).queryByTestId('unpriced-cost-marker')).toBeNull()
    expect(screen.queryByTestId('cost-incomplete-notice')).toBeNull()
  })

  it('keeps the priced part and names the unpriced model when the cost is partial', async () => {
    serve({ overview: () => overviewBody(5, PARTIAL) })
    render(<OverviewView filters={FILTERS} />)
    const est = await waitFor(() => within(card('Est. Cost')).getByText('$5.00'))
    expect(est).toBeInTheDocument()
    expect(screen.getByTestId('cost-incomplete-notice')).toHaveTextContent(
      'Missing prices can also affect Subscription Usage and Bloat %.'
    )
    expect(tips('Est. Cost')).toEqual([
      expect.stringMatching(/^Understated: no price for .*claude-opus-4/),
    ])
  })

  it('shows unknown, not $0.00, when nothing could be priced', async () => {
    serve({ overview: () => overviewBody(0, PARTIAL) })
    render(<OverviewView filters={FILTERS} />)
    await waitFor(() =>
      expect(tips('Est. Cost')).toEqual([
        expect.stringMatching(/^Cost unknown: no price for .*claude-opus-4/),
      ])
    )
    expect(within(card('Est. Cost')).queryByText('$0.00')).toBeNull()
  })

  it('drops the mark when a changed filter returns a fully priced answer', async () => {
    serve({ overview: (p) => (p.users ? overviewBody(2, FULL) : overviewBody(5, PARTIAL)) })
    const { rerender } = render(<OverviewView filters={FILTERS} />)
    await waitFor(() => expect(tips('Est. Cost')).toHaveLength(1))
    rerender(<OverviewView filters={WITH_USER} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$2.00'))
    expect(tips('Est. Cost')).toEqual([])
  })

  it('ignores a slow answer of the previous filter that lands after the newer one', async () => {
    let releaseOld: (v: unknown) => void = () => {}
    serve({
      overview: (p) =>
        p.users
          ? overviewBody(2, FULL)
          : new Promise((resolve) => {
              releaseOld = resolve
            }),
    })
    const { rerender } = render(<OverviewView filters={FILTERS} />)
    rerender(<OverviewView filters={WITH_USER} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$2.00'))
    releaseOld(overviewBody(5, PARTIAL))
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 20)
    })
    expect(within(card('Est. Cost')).getByText('$2.00')).toBeInTheDocument()
    expect(tips('Est. Cost')).toEqual([])
  })
})

describe('Cost tab', () => {
  const byModel = [
    { model_name: 'claude-sonnet-4', cost_usd: 5 },
    { model_name: UNPRICED_ROW, cost_usd: 0 },
  ]

  it('marks Total and Avg, and the unpriced model only (names normalized)', async () => {
    serve({ cost: () => costBody(5, PARTIAL, byModel) })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$5.00'))
    expect(tips('Est. Cost')).toEqual([
      expect.stringMatching(/^Understated: no price for .*claude-opus-4/),
    ])
    expect(tips('Avg Cost / Session')).toHaveLength(1)
    await waitFor(() => expect(chartData.bars.length).toBeGreaterThan(0))
    const { labels, datasets } = chartData.bars.at(-1)!
    expect(datasets[0].data[labels.findIndex((l: string) => l.startsWith('claude-sonnet-4'))]).toBe(
      5
    )
    const unpricedIdx = labels.findIndex((l: string) => l.startsWith(UNPRICED_ROW))
    expect(labels[unpricedIdx]).toMatch(/no price/i)
    expect(datasets[0].data[unpricedIdx]).toBeNull()
  })

  it('keeps the bar of a flagged model that has a positive priced sum and marks it partly priced', async () => {
    // Backend: a token kind without a rate flags the model, while the kinds with a rate still add up.
    serve({
      cost: () => costBody(3, PARTIAL, [{ model_name: UNPRICED_ROW, cost_usd: 3 }]),
    })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => expect(chartData.bars.length).toBeGreaterThan(0))
    const { labels, datasets } = chartData.bars.at(-1)!
    expect(labels).toEqual([`${UNPRICED_ROW} (partly priced)`])
    expect(datasets[0].data).toEqual([3])
  })

  it('renders a fully priced selection without marks', async () => {
    serve({ cost: () => costBody(5, FULL, [{ model_name: 'claude-sonnet-4', cost_usd: 5 }]) })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$5.00'))
    expect(screen.queryByTestId('unpriced-cost-marker')).toBeNull()
    expect(screen.queryByTestId('cost-incomplete-notice')).toBeNull()
  })

  it('shows unknown totals when nothing was priced', async () => {
    serve({ cost: () => costBody(0, PARTIAL, [{ model_name: UNPRICED_ROW, cost_usd: 0 }]) })
    render(<CostView filters={FILTERS} />)
    await waitFor(() =>
      expect(tips('Est. Cost')).toEqual([expect.stringMatching(/^Cost unknown: no price for/)])
    )
    expect(within(card('Est. Cost')).queryByText('$0.00')).toBeNull()
  })

  it('names the affected models instead of "No data available" when every model is unpriced', async () => {
    serve({ cost: () => costBody(0, PARTIAL, [{ model_name: UNPRICED_ROW, cost_usd: 0 }]) })
    const { unmount } = render(<CostView filters={FILTERS} />)
    const notice = await screen.findByTestId('cost-by-model-unknown')
    expect(notice).toHaveTextContent(`Cost unknown: no price for ${UNPRICED_ROW}`)
    expect(chartData.bars).toHaveLength(0)
    unmount()
    // Negative control: a mixed answer keeps the chart and has no such notice.
    chartData.bars.length = 0
    serve({ cost: () => costBody(5, PARTIAL, byModel) })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => expect(chartData.bars.length).toBeGreaterThan(0))
    expect(screen.queryByTestId('cost-by-model-unknown')).toBeNull()
  })
})

describe('Users and Repositories', () => {
  it('Users: the combined response marks the chart and table until a fully priced filter is applied', async () => {
    serve({
      users: (p) => ({
        data: {
          chart: [{ developer_name: 'chart-only user', cost_usd: 2 }],
          rows: [userRow(1)],
          total_count: 1,
          avg_session_duration_ms: 1,
        },
        metadata: p.users ? FULL : PARTIAL,
      }),
    })
    // Seeded: with a null slot UsersView re-renders on a fresh `[]` each pass (pre-existing, unrelated).
    cliAnalyticsStore.users = {
      table: { rows: [], total_count: 0, avg_session_duration_ms: null },
    }
    const { rerender } = render(<UsersView filters={FILTERS} />)
    const notes = await screen.findAllByTestId('cost-incomplete-notice')
    expect(notes).toHaveLength(2)
    notes.forEach((note) => expect(note).toHaveTextContent(/claude-opus-4/))
    expect(screen.getByText('chart-only user')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(mockApi.get).toHaveBeenCalledWith(
      'v1/analytics/cli-analytics/users',
      expect.objectContaining({ params: expect.objectContaining({ include_chart: true }) })
    )
    rerender(<UsersView filters={WITH_USER} />)
    await waitFor(() => expect(screen.queryByTestId('cost-incomplete-notice')).toBeNull())
  })

  // The flags describe the selection, not a row: user A (only Personal-paid sessions, so a real $0
  // company spend) must not inherit the unpriced models of user B.
  const rowOf = (name: string) => screen.getByText(name).closest('tr')!

  it('Users: a $0 row next to a flagged row stays $0.00, with the warning at selection level', async () => {
    serve({
      users: () => ({
        data: {
          rows: [
            { ...userRow(0), developer_name: 'userA', user_id: 'uA' },
            { ...userRow(2.5), developer_name: 'userB', user_id: 'uB' },
          ],
          total_count: 2,
          avg_session_duration_ms: 1,
        },
        metadata: PARTIAL,
      }),
    })
    cliAnalyticsStore.users = {
      table: { rows: [], total_count: 0, avg_session_duration_ms: null },
    }
    render(<UsersView filters={FILTERS} />)
    await screen.findByText('userA')
    expect(within(rowOf('userA')).getByText('$0.00')).toBeInTheDocument()
    expect(within(rowOf('userB')).getByText('$2.50')).toBeInTheDocument()
    expect(rowOf('userA').querySelector('[data-tooltip-content]')).toBeNull()
    expect(screen.getAllByTestId('cost-incomplete-notice')).toHaveLength(2)
    expect(screen.getByText('All Users').closest('.rounded-lg')).toHaveTextContent(
      /priced part only.*claude-opus-4/
    )
  })

  it('Repositories: a $0 project in a flagged selection is not marked per row', async () => {
    serve({ projects: () => projectsBody(0, PARTIAL) })
    render(<RepositoriesView filters={FILTERS} />)
    await screen.findByText('proj')
    expect(within(rowOf('proj')).getByText('$0.00')).toBeInTheDocument()
    expect(rowOf('proj').querySelector('[data-tooltip-content]')).toBeNull()
    expect(screen.getByTestId('cost-incomplete-notice')).toBeInTheDocument()
  })

  it('Repositories: a sample-level note names the unpriced model; none when fully priced', async () => {
    serve({ projects: (p) => projectsBody(1, p.users ? FULL : PARTIAL) })
    const { rerender } = render(<RepositoriesView filters={FILTERS} />)
    expect(await screen.findByTestId('cost-incomplete-notice')).toHaveTextContent(/claude-opus-4/)
    rerender(<RepositoriesView filters={WITH_USER} />)
    await waitFor(() => expect(screen.queryByTestId('cost-incomplete-notice')).toBeNull())
  })
})
