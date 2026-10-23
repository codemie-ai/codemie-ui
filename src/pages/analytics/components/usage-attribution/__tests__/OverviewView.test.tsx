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

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  UaCategoryRow,
  UaCliSummary,
  UaResponse,
  UaTiles,
  UaTotals,
} from '@/types/usageAttribution'

import { useUaQuery } from '../hooks/useUaQuery'
import OverviewView from '../views/OverviewView'

vi.mock('../hooks/useUaQuery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useUaQuery')>()),
  useUaQuery: vi.fn(),
}))

// The charts draw on a canvas: the pie stub lists the slices it is given.
vi.mock('react-chartjs-2', () => ({
  Pie: ({ data }: { data: { labels: string[]; datasets: Array<{ data: number[] }> } }) => (
    <ul data-testid="pie-slices">
      {data.labels.map((label, i) => (
        <li key={label}>{`${label}=${data.datasets[0].data[i]}`}</li>
      ))}
    </ul>
  ),
  Bar: () => <canvas />,
  Doughnut: () => <canvas />,
}))

// Covered by their own tests; their column headers and selects would repeat the labels checked here.
vi.mock('../tables/SharedProjectsTable', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../tables/SharedProjectsTable')>()),
  default: () => <div data-testid="shared-projects-table" />,
}))
vi.mock('../tables/RepositoryGroupsTable', () => ({
  default: () => <div data-testid="repository-groups-table" />,
}))
vi.mock('../widgets/BreakdownWidget', () => ({
  default: () => <div data-testid="breakdown-widget" />,
}))

const PIE_LABEL = 'Pie of spend by Web Platform and CLI category'

const TOTALS: UaTotals = {
  total: 370_000,
  web: { total: 50_000, assistant: 30_000, workflow: 15_000, datasource: 5_000 },
  cli: { total: 320_000 },
  charged_back: 100_000,
  who_pays: {
    web: { charged: 20_000, shared: 10_000, personal: 20_000 },
    cli: { charged: 80_000, shared: 100_000, personal: 140_000 },
  },
  excluded: { no_customer: 0, other_proxy: 0 },
}

/** CLI $320K: Production $200K, Experiments $20K, Unclassified $100K of which $30K is likely production. */
const TILES: UaTiles = {
  total: 370_000,
  web: 50_000,
  web_types: { assistant: 30_000, workflow: 15_000, datasource: 5_000 },
  cli: 320_000,
  cli_people: 40,
  charged_back: 100_000,
  prod: 200_000,
  prod_cb: 80_000,
  prod_alloc: 10_000,
  exp: 20_000,
  exp_alloc: 2_000,
  exp_parts: { learning: 8_000, testing: 6_000, experimental: 4_000, pet_project: 2_000 },
  allocated: 12_000,
  ncb: 150_000,
  ncb_cli_shared: 90_000,
  ncb_cli_personal: 50_000,
  ncb_allocated: 5_000,
  ncb_web: 10_000,
  uncl: 100_000,
  likely_prod: 30_000,
  uncl_parts: {
    likely_production: 30_000,
    no_repository: 40_000,
    too_little_evidence: 20_000,
    outside_limits: 10_000,
  },
  excluded: { no_customer: 0, other_proxy: 0 },
}

/** As the API sends it: the rest of Unclassified, without likely production, is "CLI Unclassified, other". */
const SUMMARY: UaCliSummary = {
  tiles: TILES,
  pie: [
    { id: 'platform', label: 'Web Platform', value: 50_000 },
    { id: 'production', label: 'CLI Production', value: 200_000 },
    { id: 'likely_production', label: 'CLI Likely production', value: 30_000 },
    { id: 'experiments', label: 'CLI Experiments', value: 20_000 },
    { id: 'unclassified', label: 'CLI Unclassified, other', value: 70_000 },
  ],
  who_pays: TOTALS.who_pays,
  categories: [],
  reasons: [],
  coverage: { share: 90, analysed: 288_000, outside_limits: 32_000, repositories_per_person: 10 },
  display: {
    shared_project_threshold: 100,
    repository_group_threshold: 1_000,
    experiments_highlight: 200,
    platform_people_filter: 100,
    candidate_production_days: 5,
    scale: 1,
  },
}

const answer = <T,>(data: T) => ({
  data: { data, range: null, analysis: null } as UaResponse<T>,
  error: null,
  loading: false,
})

const tile = (label: string) => screen.getByText(label).parentElement as HTMLElement

const legendRow = (label: string) =>
  within(screen.getByText(PIE_LABEL).parentElement as HTMLElement).getByText(label)
    .parentElement as HTMLElement

describe('OverviewView — the Summary tiles and the pie with likely production', () => {
  beforeEach(() => {
    vi.mocked(useUaQuery).mockImplementation((key) => {
      if (key === 'totals') return answer(TOTALS)
      if (key === 'cli-summary') return answer(SUMMARY)
      return { data: null, error: null, loading: false }
    })

    render(<OverviewView params={{ time_period: 'last_30_days' }} periodQuery={{}} />)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('calls the potential chargeback "Chargeback Potential", never "Not Charged Back"', () => {
    expect(tile('Chargeback Potential')).toBeInTheDocument()
    expect(screen.queryByText('Not Charged Back')).toBeNull()
  })

  it('counts likely production in the CLI Unclassified tile and says so', () => {
    const unclassified = tile('CLI Unclassified')

    expect(unclassified).toHaveTextContent('$100,000')
    expect(unclassified).toHaveTextContent('31% of CLI · likely production $30.0K')
  })

  it('names likely production on the CLI Production tile, counted in Unclassified', () => {
    const production = tile('CLI Production')

    expect(production).toHaveTextContent('$200,000')
    expect(production).toHaveTextContent('plus $30.0K likely production, counted in Unclassified')
  })

  it('shows likely production as its own slice, and the rest of Unclassified as "Unclassified, other"', () => {
    const likely = legendRow('Likely production')
    expect(within(likely).getByText('$30,000')).toBeInTheDocument()
    expect(within(likely).getByText('8.1%')).toBeInTheDocument()

    const other = legendRow('Unclassified, other')
    expect(within(other).getByText('$70,000')).toBeInTheDocument()
    expect(within(other).getByText('18.9%')).toBeInTheDocument()
  })

  it('lists the CLI slices under one CLI heading, without the "CLI " prefix', () => {
    const pie = within(screen.getByText(PIE_LABEL).parentElement as HTMLElement)

    expect(pie.getByText('CLI')).toBeInTheDocument()
    expect(pie.queryByText(/^CLI /)).not.toBeInTheDocument()
  })

  it('draws the five slices with their amounts: the tile equals likely production plus "other"', () => {
    const slices = within(screen.getByTestId('pie-slices'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)

    expect(slices).toEqual([
      'Web Platform=50000',
      'Production=200000',
      'Likely production=30000',
      'Experiments=20000',
      'Unclassified, other=70000',
    ])
    expect(TILES.likely_prod + 70_000).toBe(TILES.uncl)
  })
})

/** CLI $320K of a $370K total: Production $200K, Learning $24K, Unclassified $96K. */
// prettier-ignore
const CATEGORIES: UaCategoryRow[] = [
  { category: 'production', spend: 200_000, classified: 190_000, allocated: 10_000, cb: 80_000, sh: 60_000, pe: 60_000, users: 20 },
  { category: 'learning', spend: 24_000, classified: 24_000, allocated: 0, cb: 0, sh: 4_000, pe: 20_000, users: 9 },
  { category: 'unclassified', spend: 96_000, classified: 106_000, allocated: -10_000, cb: 0, sh: 36_000, pe: 60_000, users: 30 },
]

describe('OverviewView — CLI Spend by Category', () => {
  beforeEach(() => {
    vi.mocked(useUaQuery).mockImplementation((key) => {
      if (key === 'totals') return answer(TOTALS)
      if (key === 'cli-summary') return answer({ ...SUMMARY, categories: CATEGORIES })
      return { data: null, error: null, loading: false }
    })

    render(<OverviewView params={{ time_period: 'last_30_days' }} periodQuery={{}} />)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows each category as a share of all spend, and the share of CLI in the total row', () => {
    const table = screen.getByRole('table', { name: 'CLI spend by category' })

    expect(
      within(table).getByRole('columnheader', { name: /% of Total Spend/ })
    ).toBeInTheDocument()
    const production = within(table).getByText('Production').closest('tr') as HTMLElement
    expect(production).toHaveTextContent('62.5%') // of CLI spend
    expect(production).toHaveTextContent('54.1%') // of all spend
    const total = within(table).getByText('Total').closest('tr') as HTMLElement
    expect(total).toHaveTextContent('100%')
    expect(total).toHaveTextContent('86.5%') // CLI is $320K of $370K
  })

  it('has no allocated or previous-period column', () => {
    const table = screen.getByRole('table', { name: 'CLI spend by category' })

    expect(within(table).queryByRole('columnheader', { name: /Allocated/ })).not.toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: /Previous/ })).not.toBeInTheDocument()
  })

  it('reads no previous period, and the CLI Experiments tile has no change against it', () => {
    expect(vi.mocked(useUaQuery).mock.calls.map(([key]) => key)).not.toContain('previous-period')
    expect(tile('CLI Experiments')).not.toHaveTextContent('previous period')
  })
})
