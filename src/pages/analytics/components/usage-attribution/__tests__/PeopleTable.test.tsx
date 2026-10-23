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
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  UaAnalysisInfo,
  UaDisplay,
  UaPeopleSummary,
  UaPersonRow,
  UaRange,
  UaResponse,
  UaTableResponse,
} from '@/types/usageAttribution'

import { useUaQuery } from '../hooks/useUaQuery'
import PeopleTable from '../tables/PeopleTable'

vi.mock('../hooks/useUaQuery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useUaQuery')>()),
  useUaQuery: vi.fn(),
}))

const DISPLAY: UaDisplay = {
  shared_project_threshold: 1000,
  repository_group_threshold: 1000,
  experiments_highlight: 500,
  platform_people_filter: 300,
  candidate_production_days: 5,
  scale: 1,
}

const person = (over: Partial<UaPersonRow>): UaPersonRow => ({
  uid: 'u-1',
  name: 'Jane Example',
  email: 'jane@example.com',
  city: 'Lisbon',
  country: 'Portugal',
  job: 'Engineer',
  total: 900,
  ncb: 300,
  platform: 100,
  cli: 800,
  prod: 500,
  exp: 100,
  uncl: 200,
  alloc: 0,
  prod_ncb: 300,
  charged_back: 400,
  personal_learning: 120,
  personal_other: 80,
  production_days: 12,
  shared_no_budget: 0,
  projects: 'personal · northwind-payments',
  in_shared_project: true,
  main_repo: 'payments/api',
  main_group: 'g-1',
  share: 0.4,
  candidate: true,
  ...over,
})

const TABLE: UaTableResponse<UaPersonRow> = {
  data: {
    rows: [
      person({}),
      person({ uid: 'u-2', name: 'Sam Other', candidate: false, production_days: 2 }),
    ],
    totals: {},
  },
  pagination: { page: 0, per_page: 25, total_count: 2, has_more: false },
  counts: { cand: 1, all: 2, prod: 2, exp: 0, shared: 1, platform: 0 },
  threshold: 0,
  display: DISPLAY,
  range: {} as UaRange,
  analysis: {} as UaAnalysisInfo,
}

const SUMMARY: UaResponse<UaPeopleSummary> = {
  data: {
    tiles: {
      candidates: 120,
      people_with_production: 180,
      candidates_production: 48210,
      production: 60000,
      in_groups: 30500,
      groups: 40,
      groups_over: 7,
      groups_over_amount: 12000,
    },
    threshold: 1000,
    display: DISPLAY,
  },
  range: {} as UaRange,
  analysis: {} as UaAnalysisInfo,
}

const answer = () =>
  vi.mocked(useUaQuery).mockImplementation((key) => {
    if (key === 'people') return { data: TABLE, error: null, loading: false }
    if (key === 'people-summary') return { data: SUMMARY, error: null, loading: false }
    return { data: null, error: null, loading: false }
  })

const lastParams = (key: string) =>
  vi
    .mocked(useUaQuery)
    .mock.calls.filter((c) => c[0] === key)
    .at(-1)?.[2]

const headers = () =>
  within(screen.getByRole('table', { name: 'People' }))
    .getAllByRole('columnheader')
    .map((h) => h.textContent ?? '')

describe('PeopleTable — chargeback candidates and who pays', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens on chargeback candidates sorted by production on personal budgets', () => {
    answer()
    render(<PeopleTable params={{}} onOpen={vi.fn()} />)

    expect(lastParams('people')).toMatchObject({
      filter: 'cand',
      sort_by: 'prod_ncb',
      sort_order: 'desc',
    })
  })

  it('marks candidates and shows their production days', () => {
    answer()
    render(<PeopleTable params={{}} onOpen={vi.fn()} />)

    const jane = screen.getByRole('button', { name: 'Jane Example' }).closest('tr') as HTMLElement
    const sam = screen.getByRole('button', { name: 'Sam Other' }).closest('tr') as HTMLElement
    expect(within(jane).getByText('Candidate')).toBeInTheDocument()
    expect(within(sam).queryByText('Candidate')).toBeNull()
    expect(within(jane).getByLabelText('12 production days')).toBeInTheDocument()
  })

  it('splits spend by who pays under one Personal Budget header, without Not Charged Back', () => {
    answer()
    render(<PeopleTable params={{}} onOpen={vi.fn()} />)

    const all = headers().join(' | ')
    for (const gone of [
      'Not Charged Back',
      '% of Total Spend',
      'Web Platform',
      'CLI Production',
      'CLI Experiments',
      'CLI Unclassified',
    ]) {
      expect(all).not.toContain(gone)
    }
    for (const label of [
      'Total Spend',
      'Charged Back',
      'Production',
      'Learning & Experiments',
      'Other',
      'Production Days',
      'Works In',
    ]) {
      expect(all).toContain(label)
    }
    expect(screen.getByText('Personal Budget').tagName).toBe('H4')
    const jane = screen.getByRole('button', { name: 'Jane Example' }).closest('tr') as HTMLElement
    expect(jane).toHaveTextContent('$400')
    expect(jane).toHaveTextContent('$300')
    expect(jane).toHaveTextContent('$120')
    expect(jane).toHaveTextContent('$80')
  })

  it('shows the summary tiles for candidates, with the days threshold', () => {
    answer()
    render(<PeopleTable params={{}} onOpen={vi.fn()} />)

    const tile = (label: string) => screen.getByText(label).parentElement as HTMLElement
    expect(tile('Chargeback candidates')).toHaveTextContent('120')
    expect(tile('Chargeback candidates')).toHaveTextContent(
      'of 180 people with production on a personal budget'
    )
    expect(tile('Their production on personal budgets')).toHaveTextContent('$48,210')
    expect(tile('Shared with other candidates')).toHaveTextContent('$30,500')
    expect(tile('Groups over $1,000')).toHaveTextContent('7')
    expect(screen.getByText(/on 5 or more days in this period/)).toBeInTheDocument()
  })

  it('the note says since when production days are counted on a short period', () => {
    vi.mocked(useUaQuery).mockImplementation((key) => {
      if (key === 'people') return { data: TABLE, error: null, loading: false }
      if (key === 'people-summary')
        return {
          data: {
            ...SUMMARY,
            range: {
              from: '2026-10-09T15:00:00Z',
              to: '2026-10-16T15:00:00Z',
              evidence_from: '2026-09-16T00:00:00Z',
            } as UaRange,
          },
          error: null,
          loading: false,
        }
      return { data: null, error: null, loading: false }
    })
    render(<PeopleTable params={{}} onOpen={vi.fn()} />)

    expect(screen.getByText(/on 5 or more days since Sep 16, 2026/)).toBeInTheDocument()
  })

  it('"show them" lists the groups over the threshold the tile counts', async () => {
    const user = userEvent.setup()
    const over2000 = { ...SUMMARY, data: { ...SUMMARY.data, threshold: 2000 } }
    vi.mocked(useUaQuery).mockImplementation((key) => {
      if (key === 'people') return { data: TABLE, error: null, loading: false }
      if (key === 'people-summary') return { data: over2000, error: null, loading: false }
      return { data: null, error: null, loading: false }
    })
    render(<PeopleTable params={{}} onOpen={vi.fn()} />)

    expect(screen.getByText('Groups over $2,000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'show them' }))

    expect(lastParams('people-groups')).toMatchObject({ group_by: 'common', min_amount: 2000 })
    expect(screen.getAllByText('Groups over $2,000 per 30 days').length).toBeGreaterThan(0)
  })

  it('shows the summary tiles while they load and when they fail', () => {
    vi.mocked(useUaQuery).mockImplementation((key) => {
      if (key === 'people') return { data: TABLE, error: null, loading: false }
      if (key === 'people-summary') return { data: null, error: null, loading: true }
      return { data: null, error: null, loading: false }
    })
    const { unmount } = render(<PeopleTable params={{}} onOpen={vi.fn()} />)
    expect(screen.getByText('Chargeback candidates')).toBeInTheDocument()
    expect(screen.getAllByText('Analysing repositories…')).toHaveLength(4)
    unmount()

    vi.mocked(useUaQuery).mockImplementation((key) => {
      if (key === 'people') return { data: TABLE, error: null, loading: false }
      if (key === 'people-summary')
        return { data: null, error: { message: 'Too many requests' }, loading: false }
      return { data: null, error: null, loading: false }
    })
    render(<PeopleTable params={{}} onOpen={vi.fn()} />)
    expect(screen.getAllByText('Too many requests')).toHaveLength(4)
  })

  it('hides the summary tiles for all people', () => {
    answer()
    render(<PeopleTable params={{}} onOpen={vi.fn()} initialFilter="all" />)

    expect(screen.queryByText('Chargeback candidates')).toBeNull()
    expect(lastParams('people')).toMatchObject({ filter: 'all', sort_by: 'total' })
  })

  it('grouping fixes the people filter to chargeback candidates', () => {
    answer()
    render(<PeopleTable params={{}} onOpen={vi.fn()} initialFilter="all" initialGroupBy="common" />)

    // PrimeReact marks a disabled dropdown on its root.
    expect(screen.getByLabelText('Filter people').closest('.p-dropdown')).toHaveClass('p-disabled')
    expect(screen.getAllByText('Chargeback candidates').length).toBeGreaterThan(0)
    expect(lastParams('people-groups')).toMatchObject({ group_by: 'common', min_amount: 0 })
  })
})
