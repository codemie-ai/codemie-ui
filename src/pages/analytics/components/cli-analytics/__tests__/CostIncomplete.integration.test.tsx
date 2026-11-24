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

// Consumer-level checks (EPMCDME-17152): the real store, hooks and views, with only `api.get`
// answered by a controlled response, so the per-amount pricing travels from the API answer to the screen.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ABSENT_VALUE_MARKER } from '@/constants'
import { UNATTRIBUTED_LABEL } from '@/constants/cliAnalytics'
import { cliAnalyticsStore } from '@/store/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'

import CostView from '../views/CostView'
import EfficiencyView from '../views/EfficiencyView'
import OverviewView from '../views/OverviewView'
import RepositoriesView from '../views/RepositoriesView'
import SessionsView from '../views/SessionsView'
import UsersView from '../views/UsersView'

const mockApi = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/utils/api', () => ({ default: mockApi }))

vi.mock('react-chartjs-2', () => ({
  Bar: (props: { data: { labels: string[]; datasets: { data: unknown[] }[] } }) => (
    <div
      data-testid="bar-chart"
      data-labels={JSON.stringify(props.data.labels)}
      data-values={JSON.stringify(props.data.datasets[0]?.data)}
    />
  ),
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
const OTHER_FILTERS: AnalyticsQueryParams = { ...FILTERS, users: ['u-clean'] }
const PAGINATION = { page: 0, per_page: 10, total_count: 1, has_more: false }
const MODEL = 'bedrock/converse/anthropic.claude-opus-4-20250514-v1:0'

// Pricing of one amount, as the API sends it.
const CLEAN = { cost_incomplete: false, unpriced_models: [], cost_unknown: false }
const PARTIAL = { cost_incomplete: true, unpriced_models: [MODEL], cost_unknown: false }
const UNKNOWN = { cost_incomplete: true, unpriced_models: [MODEL], cost_unknown: true }
const REDACTED = { cost_incomplete: true, unpriced_models: [], cost_unknown: false }
const CANNOT_TELL = { cost_incomplete: true, unpriced_models: [], cost_unknown: null }

const userRow = (name: string, cost_usd: number, pricing: object = CLEAN) => ({
  developer_name: name,
  session_count: 1,
  input_tokens: 1,
  output_tokens: 1,
  cost_usd,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  user_id: `id-${name}`,
  ...pricing,
})

const usersBody = (rows: object[], chart: object[] | undefined, metadata: object = {}) => ({
  data: { rows, total_count: rows.length, avg_session_duration_ms: 1, chart },
  metadata,
})

const repoRow = (
  repository: string | null,
  cost_usd: number,
  pricing: object,
  branches: object[] = []
) => ({
  repository,
  session_count: 1,
  turns: 1,
  cost_usd,
  files_changed: 0,
  lines_added: 0,
  lines_removed: 0,
  net_lines: 0,
  tool_calls: 0,
  tool_calls_success: 0,
  tool_success_rate: 0,
  branches,
  ...pricing,
})

const quiet: Record<string, Route> = {
  sessions: () => ({ data: { sessions: [], page: 0, per_page: 10, total: 0 } }),
  repositories: () => ({ data: { rows: [], pagination: PAGINATION } }),
  users: () => usersBody([], []),
}

const serve = (extra: Record<string, Route>) => {
  routes = { ...quiet, ...extra }
}

const resetStore = () => {
  Object.assign(cliAnalyticsStore, {
    overview: null,
    cost: null,
    // Not null: while null the Users hook hands out a new [] every render, which spins under act().
    users: { table: { rows: [], total_count: 0, avg_session_duration_ms: null } },
    projects: null,
    repositories: null,
    sessions: null,
    apiSpend: null,
    efficiency: null,
    loading: {},
    error: {},
  })
}

const rowOf = (text: string) => screen.getByText(text).closest('tr') as HTMLElement
const marks = (scope: HTMLElement) => within(scope).queryAllByTestId('unpriced-cost-marker')
// The icon is a sibling of the amount's text: before it in right-aligned tables, after it in cards.
const iconBefore = (scope: HTMLElement, amount: string) =>
  marks(scope)[0]?.nextSibling?.textContent === amount
const iconAfter = (scope: HTMLElement, amount: string) =>
  marks(scope)[0]?.previousSibling?.textContent === amount
const tip = (scope: HTMLElement) => marks(scope)[0]?.getAttribute('data-tooltip-content') ?? ''

beforeEach(() => {
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

describe('Efficiency pricing metadata', () => {
  it.each([true, false])(
    'keeps metadata and marks only price-dependent cards when incomplete=%s',
    async (incomplete) => {
      serve({
        efficiency: () => ({
          data: {
            kpis: { cache_read_cost_usd: 2, bloat_pct: 10, total_cost_usd: 20 },
            dead_sessions: {
              count: 1,
              pct_of_sessions: 50,
              wasted_cost_usd: 3,
              avg_cost_per_dead: 3,
            },
            code_changes: { files_changed: 0, files_written: 0, files_edited: 0, net_lines: 0 },
            session_depth: [],
          },
          metadata: { cost_incomplete: incomplete, unpriced_models: incomplete ? [MODEL] : [] },
        }),
      })
      render(<EfficiencyView filters={FILTERS} />)
      await screen.findByText('$2.00')
      expect(cliAnalyticsStore.efficiency?.cost_incomplete).toBe(incomplete)
      expect(screen.queryAllByTestId('unpriced-cost-marker')).toHaveLength(incomplete ? 4 : 0)
      if (incomplete) {
        expect(
          screen.getAllByTestId('unpriced-cost-marker')[0].getAttribute('data-tooltip-content')
        ).toContain(MODEL)
      }
    }
  )
})

describe('All Users Est. Cost (per amount)', () => {
  it.each([
    [CLEAN, 3, '$3.00', 0],
    [PARTIAL, 3, '$3.00', 1],
    [UNKNOWN, 0, ABSENT_VALUE_MARKER, 1],
  ])(
    'keeps the pricing state when a user opens its session summary',
    async (pricing, cost, amount, count) => {
      serve({ users: () => usersBody([userRow('drill@x', cost, pricing)], []) })
      render(<UsersView filters={FILTERS} />)
      await screen.findByText('drill@x')
      fireEvent.click(rowOf('drill@x'))
      const dialog = await screen.findByRole('dialog')
      const costCard = within(dialog)
        .getByText('Est. Cost', { selector: 'p' })
        .closest('.rounded-md') as HTMLElement
      expect(within(costCard).getByText(amount)).toBeInTheDocument()
      expect(marks(dialog)).toHaveLength(count)
      if (count) expect(tip(dialog)).toContain(MODEL)
    }
  )
  const rows = [
    userRow('zero@x', 0),
    userRow('partial@x', 3.5, PARTIAL),
    userRow('unknown@x', 0, UNKNOWN),
    userRow('cannot-tell@x', 0, CANNOT_TELL),
    userRow('clean@x', 7),
  ]

  it('keeps a real $0 plain, marks only the incomplete amounts, and shows unknown only on evidence', async () => {
    serve({ users: () => usersBody(rows, []) })
    render(<UsersView filters={FILTERS} />)
    await screen.findByText('zero@x')

    expect(within(rowOf('zero@x')).getByText('$0.00')).toBeInTheDocument()
    expect(marks(rowOf('zero@x'))).toHaveLength(0)
    expect(marks(rowOf('clean@x'))).toHaveLength(0)

    // Priced subtotal kept, own mark, names listed.
    expect(within(rowOf('partial@x')).getByText('$3.50')).toBeInTheDocument()
    expect(tip(rowOf('partial@x'))).toContain('Partial estimate')
    expect(tip(rowOf('partial@x'))).toContain('claude-opus-4')

    // Right-aligned column: the icon sits before the amount so the amounts stay aligned.
    expect(iconBefore(rowOf('partial@x'), '$3.50')).toBe(true)

    // cost_unknown true: no figure.
    expect(within(rowOf('unknown@x')).queryByText('$0.00')).toBeNull()
    expect(tip(rowOf('unknown@x'))).toContain('Cost unknown')

    // cost_unknown null is no evidence of unknown: the subtotal stays, marked as partial.
    expect(within(rowOf('cannot-tell@x')).getByText('$0.00')).toBeInTheDocument()
    expect(tip(rowOf('cannot-tell@x'))).toContain('Partial estimate')
    expect(screen.queryByTestId('cost-incomplete-notice')).toBeNull()
  })

  it('shows a generic tooltip without model names and lists the names when provided', async () => {
    serve({ users: () => usersBody([userRow('redacted@x', 2, REDACTED)], []) })
    const { unmount } = render(<UsersView filters={FILTERS} />)
    await screen.findByText('redacted@x')
    expect(tip(rowOf('redacted@x'))).toBe(
      'Partial estimate.\nThe estimate excludes usage that could not be priced.'
    )
    unmount()

    resetStore()
    const two = { ...PARTIAL, unpriced_models: [MODEL, 'gpt-x'] }
    serve({ users: () => usersBody([userRow('named@x', 2, two)], []) })
    render(<UsersView filters={FILTERS} />)
    await screen.findByText('named@x')
    expect(tip(rowOf('named@x'))).toContain(`• ${MODEL}\n• gpt-x`)
  })

  it('an older response (no per-row fields) uses the generic notice only when the metadata says so', async () => {
    const legacy = [userRow('a@x', 0, {}), userRow('b@x', 4, {})]
    serve({ users: () => usersBody(legacy, [], { cost_incomplete: true, unpriced_models: [] }) })
    const { unmount } = render(<UsersView filters={FILTERS} />)
    await screen.findByText('a@x')
    expect(screen.getAllByTestId('cost-incomplete-notice').length).toBeGreaterThan(0)
    expect(marks(rowOf('a@x'))).toHaveLength(0)
    unmount()

    resetStore()
    serve({ users: () => usersBody(legacy, [], { cost_incomplete: false, unpriced_models: [] }) })
    render(<UsersView filters={FILTERS} />)
    await screen.findByText('a@x')
    expect(screen.queryByTestId('cost-incomplete-notice')).toBeNull()
  })

  it('does not carry a mark over when the filters change to a selection that is fully priced', async () => {
    serve({
      users: (p) =>
        p.users
          ? usersBody([userRow('clean@x', 7)], [])
          : usersBody([userRow('partial@x', 3.5, PARTIAL)], []),
    })
    const { rerender } = render(<UsersView filters={FILTERS} />)
    await screen.findByText('partial@x')
    expect(marks(rowOf('partial@x'))).toHaveLength(1)

    rerender(<UsersView filters={OTHER_FILTERS} />)
    await screen.findByText('clean@x')
    expect(screen.queryByTestId('unpriced-cost-marker')).toBeNull()
  })
})

describe('Cost Share by User legend', () => {
  it('marks a chart user that is outside the current table page, from the chart response', async () => {
    serve({
      users: () =>
        usersBody(
          [userRow('on-page@x', 9)],
          [
            { developer_name: 'on-page@x', cost_usd: 9, ...CLEAN },
            { developer_name: 'off-page@x', cost_usd: 4, ...PARTIAL },
            { developer_name: 'nothing-priced@x', cost_usd: 0, ...UNKNOWN },
          ]
        ),
    })
    render(<UsersView filters={FILTERS} />)
    await screen.findByTestId('donut-chart')

    const legend = (name: string) => screen.getByTitle(new RegExp(`^${name}:`))
    expect(within(legend('off-page@x')).getByText('$4.00')).toBeInTheDocument()
    expect(marks(legend('off-page@x'))).toHaveLength(1)
    expect(marks(legend('on-page@x'))).toHaveLength(0)
    expect(within(legend('nothing-priced@x')).getByText(ABSENT_VALUE_MARKER)).toBeInTheDocument()
    expect(tip(legend('nothing-priced@x'))).toContain('Cost unknown')
    // The user is in no table row, so only the chart response can say it.
    expect(screen.queryByText('off-page@x', { selector: 'td *' })).toBeNull()
  })

  it('keeps the marked legend when every chart value is 0 and a row is incomplete', async () => {
    serve({
      users: () =>
        usersBody(
          [userRow('zero@x', 0)],
          [
            { developer_name: 'zero@x', cost_usd: 0, ...CLEAN },
            { developer_name: 'nothing-priced@x', cost_usd: 0, ...UNKNOWN },
            { developer_name: 'part@x', cost_usd: 0, ...PARTIAL },
          ]
        ),
    })
    render(<UsersView filters={FILTERS} />)
    await screen.findByTestId('donut-chart')

    const legend = (name: string) => screen.getByTitle(new RegExp(`^${name}:`))
    expect(screen.queryByText('No cost data available')).toBeNull()
    expect(within(legend('zero@x')).getByText('$0.00')).toBeInTheDocument()
    expect(marks(legend('zero@x'))).toHaveLength(0)
    expect(marks(legend('nothing-priced@x'))).toHaveLength(1)
    expect(within(legend('part@x')).getByText('$0.00')).toBeInTheDocument()
    expect(marks(legend('part@x'))).toHaveLength(1)
  })

  it('keeps the generic empty state when every value is 0 and nothing is incomplete', async () => {
    serve({
      users: () =>
        usersBody([userRow('zero@x', 0)], [{ developer_name: 'zero@x', cost_usd: 0, ...CLEAN }]),
    })
    render(<UsersView filters={FILTERS} />)
    await screen.findByText('No cost data available')
    expect(screen.queryByTitle(/^zero@x:/)).toBeNull()
  })
})

describe('Repositories Est. Cost (project / repository / branch)', () => {
  const branchRow = (name: string | null, cost: number, pricing: object) => ({
    branch: name,
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
    ...pricing,
  })
  const page = (rows: object[]) => ({ data: { rows, pagination: PAGINATION } })

  it.each(['project', 'repository', 'branch', 'unattributed-branch'])(
    'keeps a partial subtotal in the %s Summary',
    async (level) => {
      const project = {
        ...repoRow('', 3, PARTIAL),
        project_name: 'proj-partial',
        repository_count: 1,
      }
      const branchName = level === 'unattributed-branch' ? null : 'branch-partial'
      serve({
        projects: () => page([project]),
        repositories: () => page([repoRow('repo-partial', 3, PARTIAL)]),
        branches: () => page([branchRow(branchName, 3, PARTIAL)]),
      })
      render(<RepositoriesView filters={FILTERS} />)
      await screen.findByText('proj-partial')
      fireEvent.click(rowOf('proj-partial'))
      const dialog = await screen.findByRole('dialog')
      if (level !== 'project') {
        fireEvent.click(await within(dialog).findByText('repo-partial'))
      }
      if (level === 'branch' || level === 'unattributed-branch') {
        fireEvent.click(await within(dialog).findByText(branchName ?? UNATTRIBUTED_LABEL))
      }
      await waitFor(() => {
        const costCard = within(dialog)
          .getAllByText('Est. Cost', { selector: 'p' })
          .at(-1)
          ?.closest('.rounded-md') as HTMLElement
        expect(within(costCard).getByText('$3.00')).toBeInTheDocument()
        expect(tip(costCard)).toContain('Partial estimate')
        expect(tip(costCard)).toContain(MODEL)
      })
    }
  )

  it('marks each level for its own amount only', async () => {
    const project = { ...repoRow('', 5, PARTIAL), project_name: 'proj-p', repository_count: 1 }
    serve({
      projects: () => ({
        ...page([project]),
        metadata: { cost_incomplete: true, unpriced_models: [] },
      }),
      repositories: () => page([repoRow('repo-clean', 2, CLEAN)]),
      branches: () => page([branchRow('b-clean', 2, CLEAN), branchRow('b-partial', 0, UNKNOWN)]),
    })
    render(<RepositoriesView filters={FILTERS} />)
    await screen.findByText('proj-p')
    const projectRow = rowOf('proj-p')
    fireEvent.click(projectRow)
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('repo-clean')

    expect(marks(projectRow)).toHaveLength(1)
    const repoRowEl = within(dialog).getByText('repo-clean').closest('tr') as HTMLElement
    expect(marks(repoRowEl)).toHaveLength(0)
    // Per-amount pricing replaces the widget-level fallback.
    expect(screen.queryByTestId('cost-incomplete-notice')).toBeNull()
    fireEvent.click(repoRowEl)
    await within(dialog).findByText('b-partial')
    const rowIn = (t: string) => within(dialog).getByText(t).closest('tr') as HTMLElement
    expect(marks(rowIn('b-clean'))).toHaveLength(0)
    expect(marks(rowIn('b-partial'))).toHaveLength(1)
    fireEvent.click(rowIn('b-partial'))
    await waitFor(() =>
      expect(within(dialog).getAllByText(ABSENT_VALUE_MARKER).length).toBeGreaterThan(0)
    )
    expect(within(dialog).queryByText('$0.00')).toBeNull()
    const summaryCard = within(dialog)
      .getAllByText('Est. Cost', { selector: 'p' })
      .at(-1)
      ?.closest('.rounded-md') as HTMLElement
    expect(tip(summaryCard)).toContain('Cost unknown')
  })

  it.each([
    [true, 1],
    [false, 0],
  ])(
    'an older response (no per-row fields): metadata cost_incomplete=%s gives %i notice',
    async (incomplete, notices) => {
      const project = {
        ...repoRow('', 5, {}),
        project_name: 'proj-old',
        repository_count: 0,
      }
      serve({
        projects: () => ({
          data: { rows: [project], pagination: PAGINATION },
          metadata: { cost_incomplete: incomplete, unpriced_models: [] },
        }),
      })
      render(<RepositoriesView filters={FILTERS} />)
      await screen.findByText('proj-old')

      expect(screen.queryAllByTestId('cost-incomplete-notice')).toHaveLength(notices)
      expect(marks(rowOf('proj-old'))).toHaveLength(0)
    }
  )
})

describe('Overview and Cost Summary', () => {
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
  const card = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('.rounded-md'))
      .find(Boolean) as HTMLElement
  const costBody = (cost: number, metadata: object) => ({
    data: {
      kpis: {
        total_sessions: 3,
        total_cost_usd: cost,
        total_tokens: 10,
        avg_cost_per_session: cost / 3,
      },
      cost_by_user: [],
      cost_by_model: [],
    },
    metadata,
  })

  it.each([
    [UNKNOWN, ABSENT_VALUE_MARKER],
    [PARTIAL, '$0.00'],
    [{ ...PARTIAL, cost_unknown: null }, '$0.00'],
    [CLEAN, '$0.00'],
  ])('Overview: explicit KPI pricing distinguishes unknown and zero', async (pricing, amount) => {
    serve({
      overview: () => ({
        data: { kpis: { ...kpis(0), ...pricing }, daily_buckets: [], model_breakdown: [] },
        metadata: { cost_incomplete: true, unpriced_models: ['outside-kpi'] },
      }),
    })
    render(<OverviewView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText(amount))
    expect(marks(card('Est. Cost'))).toHaveLength(pricing.cost_incomplete ? 1 : 0)
    expect(tip(card('Est. Cost'))).not.toContain('outside-kpi')
    if (pricing.cost_unknown) expect(tip(card('Est. Cost'))).toContain('Cost unknown')
  })

  it.each([
    [UNKNOWN, ABSENT_VALUE_MARKER],
    [PARTIAL, '$0.00'],
    [{ ...PARTIAL, cost_unknown: null }, '$0.00'],
    [CLEAN, '$0.00'],
  ])('Cost: explicit KPI pricing controls both cost cards', async (pricing, amount) => {
    const body = costBody(0, { cost_incomplete: true, unpriced_models: ['outside-kpi'] })
    serve({
      cost: () => ({ ...body, data: { ...body.data, kpis: { ...body.data.kpis, ...pricing } } }),
    })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText(amount))
    expect(within(card('Avg Cost / Session')).getByText(amount)).toBeInTheDocument()
    expect(marks(card('Est. Cost'))).toHaveLength(pricing.cost_incomplete ? 1 : 0)
    expect(tip(card('Est. Cost'))).not.toContain('outside-kpi')
    if (pricing.cost_unknown) expect(tip(card('Est. Cost'))).toContain('Cost unknown')
  })

  it.each([
    [CLEAN, 3, '$3.00'],
    [PARTIAL, 3, '$3.00'],
    [UNKNOWN, 0, ABSENT_VALUE_MARKER],
  ])('Overview repository Summary retains its own pricing', async (pricing, cost, amount) => {
    serve({
      overview: () => ({ data: { kpis: kpis(5), daily_buckets: [], model_breakdown: [] } }),
      repositories: () => ({
        data: { rows: [repoRow('overview-repo', cost, pricing)], pagination: PAGINATION },
      }),
    })
    render(<OverviewView filters={FILTERS} />)
    await screen.findByText('overview-repo')
    fireEvent.click(rowOf('overview-repo'))
    const dialog = await screen.findByRole('dialog')
    const summary = within(dialog)
      .getByText('Est. Cost', { selector: 'p' })
      .closest('.rounded-md') as HTMLElement
    expect(within(summary).getByText(amount)).toBeInTheDocument()
    expect(marks(summary)).toHaveLength(pricing.cost_incomplete ? 1 : 0)
    if (pricing.cost_incomplete) expect(tip(summary)).toContain(MODEL)
  })

  it('Overview: one icon, at Est. Cost, with the priced subtotal', async () => {
    serve({
      overview: () => ({
        data: { kpis: kpis(5), daily_buckets: [], model_breakdown: [] },
        metadata: { cost_incomplete: true, unpriced_models: [MODEL] },
      }),
    })
    render(<OverviewView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$5.00'))
    expect(screen.getAllByTestId('unpriced-cost-marker')).toHaveLength(1)
    expect(marks(card('Est. Cost'))).toHaveLength(1)
    expect(iconAfter(card('Est. Cost'), '$5.00')).toBe(true)
  })

  it('Cost by Model: labels are the plain model names; unknown has no bar, a partial one keeps its subtotal', async () => {
    serve({
      cost: () => ({
        ...costBody(6, { cost_incomplete: true, unpriced_models: [MODEL] }),
        data: {
          ...costBody(6, {}).data,
          cost_by_model: [
            { model_name: 'm-clean', cost_usd: 3, ...CLEAN },
            { model_name: 'm-partial', cost_usd: 2, ...PARTIAL },
            { model_name: 'm-unknown', cost_usd: 0, ...UNKNOWN },
          ],
        },
      }),
    })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$6.00'))
    const chart = screen
      .getAllByTestId('bar-chart')
      .find((el) => el.getAttribute('data-labels')?.includes('m-clean')) as HTMLElement
    expect(JSON.parse(chart.dataset.labels as string)).toEqual([
      'm-clean',
      'm-partial',
      'm-unknown',
    ])
    expect(JSON.parse(chart.dataset.values as string)).toEqual([3, 2, null])
    const clean = screen.getByTitle('m-clean: $3.00')
    const partial = screen.getByTitle('m-partial: $2.00')
    const unknown = screen.getByTitle(`m-unknown: ${ABSENT_VALUE_MARKER}`)
    expect(marks(clean)).toHaveLength(0)
    expect(tip(partial)).toContain(MODEL)
    expect(tip(partial)).toContain('Partial estimate')
    expect(tip(unknown)).toContain('Cost unknown')
  })

  it('Cost Summary: the Cost Share by User legend marks its own rows from cost_by_user', async () => {
    serve({
      cost: () => ({
        ...costBody(6, {}),
        data: {
          ...costBody(6, {}).data,
          cost_by_user: [
            { developer_name: 'clean@x', cost_usd: 3, ...CLEAN },
            { developer_name: 'partial@x', cost_usd: 2, ...PARTIAL },
            { developer_name: 'unknown@x', cost_usd: 0, ...UNKNOWN },
          ],
        },
      }),
    })
    render(<CostView filters={FILTERS} />)
    await screen.findByTitle(/^partial@x:/)

    const legend = (name: string) => screen.getByTitle(new RegExp(`^${name}:`))
    expect(marks(legend('clean@x'))).toHaveLength(0)
    expect(within(legend('partial@x')).getByText('$2.00')).toBeInTheDocument()
    expect(tip(legend('partial@x'))).toContain('Partial estimate')
    expect(within(legend('unknown@x')).getByText(ABSENT_VALUE_MARKER)).toBeInTheDocument()
    expect(tip(legend('unknown@x'))).toContain('Cost unknown')
  })

  it('Cost by Model: when every model is unknown the chart is replaced by the unknown notice', async () => {
    serve({
      cost: () => ({
        ...costBody(0, {}),
        data: {
          ...costBody(0, {}).data,
          cost_by_model: [
            { model_name: 'm-a', cost_usd: 0, ...UNKNOWN },
            { model_name: 'm-b', cost_usd: 0, ...UNKNOWN },
          ],
        },
      }),
    })
    render(<CostView filters={FILTERS} />)

    expect(await screen.findByTestId('cost-by-model-unknown')).toBeInTheDocument()
    expect(
      screen
        .queryAllByTestId('bar-chart')
        .some((el) => el.getAttribute('data-labels')?.includes('m-a'))
    ).toBe(false)
  })

  it('Cost Summary: one icon at Est. Cost; Avg Cost / Session keeps a plain status', async () => {
    serve({ cost: () => costBody(6, { cost_incomplete: true, unpriced_models: [] }) })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$6.00'))
    expect(screen.getAllByTestId('unpriced-cost-marker')).toHaveLength(1)
    expect(within(card('Avg Cost / Session')).getByText('Partial estimate')).toBeInTheDocument()
    expect(marks(card('Avg Cost / Session'))).toHaveLength(0)
  })

  it('Overview: an explicit $0 stays $0 with the partial marker when the metadata does not say unknown', async () => {
    serve({
      overview: () => ({
        data: { kpis: kpis(0), daily_buckets: [], model_breakdown: [] },
        metadata: { cost_incomplete: true, unpriced_models: [] },
      }),
    })
    render(<OverviewView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$0.00'))
    expect(marks(card('Est. Cost'))).toHaveLength(1)
    expect(within(card('Est. Cost')).queryByText(ABSENT_VALUE_MARKER)).toBeNull()
  })

  it('Cost Summary: $0 Est. Cost and $0 Avg Cost keep their value; the partial marker stays at Est. Cost', async () => {
    serve({ cost: () => costBody(0, { cost_incomplete: true, unpriced_models: [] }) })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$0.00'))
    expect(marks(card('Est. Cost'))).toHaveLength(1)
    expect(within(card('Avg Cost / Session')).getByText('$0.00')).toBeInTheDocument()
    expect(within(card('Avg Cost / Session')).getByText('Partial estimate')).toBeInTheDocument()
    expect(marks(card('Avg Cost / Session'))).toHaveLength(0)
  })

  it('Cost Summary: a fully priced answer carries no mark', async () => {
    serve({ cost: () => costBody(6, { cost_incomplete: false, unpriced_models: [] }) })
    render(<CostView filters={FILTERS} />)
    await waitFor(() => within(card('Est. Cost')).getByText('$6.00'))
    expect(screen.queryByTestId('unpriced-cost-marker')).toBeNull()
  })
})

describe('Sessions list (per-session pricing from the API)', () => {
  const session = (trace_id: string, pricing: object = {}) => ({
    trace_id,
    developer_name: 'dev',
    repository: 'repo',
    start_time: '2026-07-02T10:00:00Z',
    duration_ms: 1000,
    model_name: 'gpt-x',
    input_tokens: 1,
    output_tokens: 1,
    cost_usd: 1,
    cost_available: true,
    prompt: `prompt-${trace_id}`,
    ...pricing,
  })
  const sessions = (rows: object[], metadata: object) => ({
    data: { sessions: rows, page: 0, per_page: 10, total: rows.length },
    metadata,
  })
  const costBody = {
    data: {
      kpis: { total_sessions: 2, total_cost_usd: 2, total_tokens: 4, avg_cost_per_session: 1 },
      cost_by_user: [],
      cost_by_model: [],
    },
    metadata: { cost_incomplete: false, unpriced_models: [] },
  }

  it('maintainer: only the session the API flags is marked, with its own names', async () => {
    serve({
      cost: () => costBody,
      sessions: () =>
        sessions(
          [
            session('s-clean', { cost_incomplete: false, unpriced_models: [] }),
            session('s-part', { cost_incomplete: true, unpriced_models: [MODEL] }),
          ],
          { cost_incomplete: true, unpriced_models: [MODEL] }
        ),
    })
    render(<CostView filters={FILTERS} />)
    await screen.findByText('prompt-s-clean')
    expect(marks(rowOf('prompt-s-clean'))).toHaveLength(0)
    expect(marks(rowOf('prompt-s-part'))).toHaveLength(1)
    expect(tip(rowOf('prompt-s-part'))).toContain(MODEL)
    expect(tip(rowOf('prompt-s-part'))).toContain('Partial estimate')
  })

  it('redacted viewer: the flagged session gets the generic status, the clean sibling none', async () => {
    serve({
      cost: () => costBody,
      sessions: () =>
        sessions(
          [
            session('s-clean', { cost_incomplete: false, unpriced_models: [] }),
            session('s-part', { cost_incomplete: true, unpriced_models: [] }),
          ],
          { cost_incomplete: true, unpriced_models: [] }
        ),
    })
    render(<CostView filters={FILTERS} />)
    await screen.findByText('prompt-s-clean')
    expect(marks(rowOf('prompt-s-clean'))).toHaveLength(0)
    expect(marks(rowOf('prompt-s-part'))).toHaveLength(1)
    expect(tip(rowOf('prompt-s-part'))).toContain('Partial estimate')
    expect(tip(rowOf('prompt-s-part'))).not.toContain('Model')
  })

  it.each([
    [CostView, true],
    [SessionsView, true],
    [EfficiencyView, true],
    [CostView, false],
    [SessionsView, false],
    [EfficiencyView, false],
  ] as const)(
    'legacy session lists show a selection warning without marking individual rows',
    async (View, incomplete) => {
      serve({
        cost: () => costBody,
        efficiency: () => ({
          data: { kpis: {}, dead_sessions: {}, code_changes: {}, session_depth: [] },
        }),
        sessions: () =>
          sessions([session('s-old'), session('s-old-2')], {
            cost_incomplete: incomplete,
            unpriced_models: incomplete ? [MODEL] : [],
          }),
      })
      render(<View filters={FILTERS} />)
      await screen.findByText('prompt-s-old')
      expect(marks(rowOf('prompt-s-old'))).toHaveLength(0)
      expect(marks(rowOf('prompt-s-old-2'))).toHaveLength(0)
      expect(screen.queryAllByTestId('cost-incomplete-notice')).toHaveLength(incomplete ? 1 : 0)
    }
  )
})
