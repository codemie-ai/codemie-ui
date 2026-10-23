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
import { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  UaAnalysisInfo,
  UaGroupRow,
  UaPersonRow,
  UaRange,
  UaSharedProjectRow,
  UaTableResponse,
} from '@/types/usageAttribution'

import { useUaQuery } from '../hooks/useUaQuery'
import PeopleTable from '../tables/PeopleTable'
import RepositoryGroupsTable from '../tables/RepositoryGroupsTable'
import SharedProjectsTable from '../tables/SharedProjectsTable'

// The requests are answered here; the page of each table is the real one (useUaPage).
vi.mock('../hooks/useUaQuery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useUaQuery')>()),
  useUaQuery: vi.fn(),
}))

const PROJECT: UaSharedProjectRow = {
  id: 'p-1',
  name: 'northwind-payments',
  platform: 120,
  web_sh: 0,
  cli: 300,
  cli_sh: 200,
  cli_exp: 0,
  cli_potential: 0,
  ncb: 320,
  people: 4,
  prod_pct: 80,
  web_state: 'shared',
  cli_budget: false,
  budgets: [],
  cost_center: null,
  chargeback: false,
  deleted: false,
  members: 6,
  datasources: 1,
  via: ['web', 'cli'],
  share: 7.1,
}

const GROUP: UaGroupRow = {
  id: 'g-1',
  name: 'payments',
  grouped: 'Same owner',
  repositories: 3,
  people: 2,
  spend: 500,
  prod: 400,
  ncb: 400,
  prod_pct: 80,
  excluded: false,
  repos_preview: ['payments/api', 'payments/web'],
  related: null,
  related_reason: '',
  share: 2.5,
}

const PERSON: UaPersonRow = {
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
  personal_learning: 100,
  personal_other: 100,
  production_days: 12,
  shared_no_budget: 0,
  projects: 'northwind-payments',
  in_shared_project: true,
  main_repo: 'payments/api',
  main_group: 'g-1',
  share: 0.03,
}

const answerWith = <Row,>(
  rows: Row[],
  totalCount = rows.length,
  totals: Record<string, number> = {}
) => {
  const data: UaTableResponse<Row> = {
    data: { rows, totals },
    pagination: { page: 0, per_page: 10, total_count: totalCount, has_more: false },
    counts: { threshold: totalCount, all: totalCount },
    threshold: 100,
    display: null,
    range: {} as UaRange,
    analysis: {} as UaAnalysisInfo,
  }
  vi.mocked(useUaQuery).mockReturnValue({ data, error: null, loading: false })
}

const cases: Array<
  [string, (onOpen: (key: string) => void) => ReactElement, () => void, string, string]
> = [
  [
    'Shared Projects Without a Budget',
    (onOpen) => <SharedProjectsTable params={{}} onOpen={onOpen} />,
    () => answerWith([PROJECT]),
    'northwind-payments',
    'northwind-payments',
  ],
  [
    'Repository Groups in Personal Projects',
    (onOpen) => <RepositoryGroupsTable params={{}} onOpen={onOpen} />,
    () => answerWith([GROUP]),
    'payments',
    'g-1',
  ],
  [
    'People',
    (onOpen) => <PeopleTable params={{}} onOpen={onOpen} />,
    () => answerWith([PERSON]),
    'Jane Example',
    'u-1',
  ],
]

describe('Usage Attribution tables open the popup from the whole row', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it.each(cases)('%s', async (_title, table, answer, name, key) => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    answer()
    render(table(onOpen))

    const nameButton = screen.getByRole('button', { name })
    const row = nameButton.closest('tr')!
    expect(row).toHaveClass('cursor-pointer')

    // Any cell of the row, not only the name.
    const cells = within(row).getAllByRole('cell')
    await user.click(cells[cells.length - 1])
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenLastCalledWith(key)

    // The name still opens it, once.
    await user.click(nameButton)
    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(onOpen).toHaveBeenLastCalledWith(key)

    // The totals row opens nothing.
    const total = screen.queryByText('Total')
    if (total) {
      await user.click(total)
      expect(onOpen).toHaveBeenCalledTimes(2)
    }
  })
})

describe('Usage Attribution tables show the share of Total Spend', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const shareCell = (rowName: string, header: string) => {
    const table = screen.getByRole('table')
    const index = within(table)
      .getAllByRole('columnheader')
      .findIndex((h) => h.textContent?.includes(header))
    const row = screen.getByRole('button', { name: rowName }).closest('tr') as HTMLElement
    return within(row).getAllByRole('cell')[index]
  }

  it('Shared Projects: the project share, the sum in the total row, and no "CLI Paid Personally"', () => {
    // The total row adds up every project listed, on every page.
    answerWith([PROJECT], 1, { ncb: 320, platform: 120, cli: 300, share: 12.4 })
    render(<SharedProjectsTable params={{}} onOpen={vi.fn()} />)

    expect(shareCell('northwind-payments', '% of Total Spend')).toHaveTextContent('7.1%')
    const total = screen.getByText('Total').closest('tr') as HTMLElement
    expect(total).toHaveTextContent('12.4%')
    expect(screen.queryByRole('columnheader', { name: /Paid Personally/ })).not.toBeInTheDocument()
  })

  it('Repository Groups: the group share and the sum in the total row', () => {
    answerWith([GROUP], 1, { ncb: 400, spend: 500, share: 2.5 })
    render(<RepositoryGroupsTable params={{}} onOpen={vi.fn()} />)

    expect(shareCell('payments', '% of Total Spend')).toHaveTextContent('2.5%')
    expect(screen.getByText('Total').closest('tr')).toHaveTextContent('2.5%')
  })
})

/** Rows over several pages: every table shows its pagination. */
const TOTAL_COUNT = 60

const pagedCases: Array<
  [string, (params: Record<string, string | number>) => ReactElement, () => void]
> = [
  [
    'Shared Projects Without a Budget',
    (params) => <SharedProjectsTable params={params} onOpen={vi.fn()} />,
    () => answerWith([PROJECT], TOTAL_COUNT),
  ],
  [
    'Repository Groups in Personal Projects',
    (params) => <RepositoryGroupsTable params={params} onOpen={vi.fn()} />,
    () => answerWith([GROUP], TOTAL_COUNT),
  ],
  [
    'People',
    (params) => <PeopleTable params={params} onOpen={vi.fn()} />,
    () => answerWith([PERSON], TOTAL_COUNT),
  ],
]

describe('Usage Attribution tables keep their page while a newer analysis is polled', () => {
  const PERIOD = { time_period: 'last_30_days' }
  // The table's own request: People also asks for its summary tiles, which have no page.
  const lastTableParams = () =>
    vi
      .mocked(useUaQuery)
      .mock.calls.filter((c) => 'page' in c[2])
      .at(-1)?.[2]
  const pageButton = (n: number) => screen.getByRole('button', { name: `Page ${n}` })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it.each(pagedCases)('%s', async (_title, table, answer) => {
    const user = userEvent.setup()
    answer()
    const { rerender } = render(table({ ...PERIOD, _p: 1 }))
    await user.click(pageButton(2))
    expect(pageButton(2)).toHaveAttribute('aria-current', 'page')

    // A poll: the same request with the next poll nonce.
    rerender(table({ ...PERIOD, _p: 2 }))

    expect(pageButton(2)).toHaveAttribute('aria-current', 'page')
    expect(lastTableParams()).toMatchObject({ page: 1, _p: 2 })

    // Another period starts on the first page.
    rerender(table({ time_period: 'last_7_days' }))

    expect(pageButton(1)).toHaveAttribute('aria-current', 'page')
    expect(lastTableParams()).toMatchObject({ page: 0 })
  })
})
