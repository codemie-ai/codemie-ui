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
  UaPeopleGroupDetail,
  UaPeopleGroupRow,
  UaPeopleNoneRow,
  UaRange,
} from '@/types/usageAttribution'

import { useUaQuery } from '../hooks/useUaQuery'
import PeopleGroupModal from '../modals/PeopleGroupModal'
import PeopleGroupsTable from '../tables/PeopleGroupsTable'

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

const PROJECT: UaPeopleGroupRow = {
  id: 'project-0123456789',
  condition: 'project',
  name: 'northwind-payments',
  label: 'northwind-payments',
  how: 'inside',
  candidates: 4,
  repositories: 3,
  amount: 2400,
  estimated: 300,
  median_days: 11,
  over_threshold: true,
}
const ORG: UaPeopleGroupRow = {
  id: 'organization-abcdef0123',
  condition: 'organization',
  name: 'acme',
  label: 'acme',
  how: null,
  candidates: 2,
  repositories: 5,
  amount: 400,
  estimated: 0,
  median_days: 6,
  over_threshold: false,
}
const NONE: UaPeopleNoneRow = {
  id: 'none',
  candidates: 7,
  amount: 900,
  estimated: 0,
  median_days: 8,
}

const DETAIL: UaPeopleGroupDetail = {
  row: PROJECT,
  members: [
    {
      uid: 'u-1',
      name: 'Jane Example',
      email: 'jane@example.com',
      city: 'Lisbon',
      country: 'Portugal',
      job: 'Engineer',
      in_group: 1200,
      estimated: 100,
      prod_ncb: 1500,
      production_days: 14,
      charged_back: 50,
      projects: 'northwind-payments',
      main_repo: 'northwind/api',
    },
    {
      uid: 'u-2',
      name: 'Sam Other',
      email: 'sam@example.com',
      city: '',
      country: '',
      job: '',
      in_group: 1200,
      estimated: 200,
      prod_ncb: 1200,
      production_days: 9,
      charged_back: 0,
      projects: 'northwind-payments',
      main_repo: 'northwind/web',
    },
  ],
  repositories: [{ repository: 'northwind/api', candidates: 2, amount: 1400 }],
  facts: { condition: 'project', how: 'inside', reason: 'inside', repositories: ['northwind/api'] },
  charged_back_same_people: 50,
  display: DISPLAY,
}

const META = { range: {} as UaRange, analysis: {} as UaAnalysisInfo }

const answer = (rows: UaPeopleGroupRow[], none: UaPeopleNoneRow | null, detail = DETAIL) =>
  vi.mocked(useUaQuery).mockImplementation((key) => {
    if (key === 'people-groups')
      return {
        data: {
          data: { rows, totals: {}, none },
          pagination: { page: 0, per_page: 25, total_count: rows.length, has_more: false },
          counts: { groups: rows.length, shown: rows.length },
          threshold: 1000,
          display: DISPLAY,
          ...META,
        },
        error: null,
        loading: false,
      }
    if (key.startsWith('people-group') || key === 'popup-people-group')
      return { data: { data: detail, ...META }, error: null, loading: false }
    return { data: null, error: null, loading: false }
  })

const lastCall = (key: string) =>
  vi
    .mocked(useUaQuery)
    .mock.calls.filter((c) => c[0] === key)
    .at(-1)

const table = (props: Partial<Parameters<typeof PeopleGroupsTable>[0]> = {}) => (
  <PeopleGroupsTable
    params={{}}
    groupBy="common"
    minAmount={0}
    search=""
    onOpenPerson={vi.fn()}
    onOpenGroup={vi.fn()}
    {...props}
  />
)

describe('PeopleGroupsTable', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('lists groups by common condition with the over mark', () => {
    answer([PROJECT, ORG], null)
    render(table())

    const project = screen
      .getByRole('button', { name: 'northwind-payments' })
      .closest('tr') as HTMLElement
    expect(project).toHaveTextContent('CodeMie project')
    expect(project).toHaveTextContent('Over $1,000')
    expect(project).toHaveTextContent('4 candidates · work inside it, no budget for them')
    expect(project).toHaveTextContent('$2,400')
    expect(project).toHaveTextContent('$300 estimated')
    expect(project).toHaveTextContent('median 11')
    const org = screen.getByRole('button', { name: 'acme' }).closest('tr') as HTMLElement
    expect(org).toHaveTextContent('Git organization')
    expect(org).toHaveTextContent('2 candidates · 5 repositories')
    expect(org).not.toHaveTextContent('Over')
    expect(screen.getByText(/add up group amounts, never person totals/)).toBeInTheDocument()
  })

  it('expands a group to its candidates', async () => {
    const user = userEvent.setup()
    answer([PROJECT], null)
    render(table())

    const row = screen
      .getByRole('button', { name: 'northwind-payments' })
      .closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Expand row' }))

    expect(lastCall(`people-group-common-${PROJECT.id}`)?.[1]).toBe(
      `people-groups/common/${PROJECT.id}`
    )
    const members = screen.getByRole('table', { name: 'Candidates in the group' })
    const jane = within(members)
      .getByRole('button', { name: 'Jane Example' })
      .closest('tr') as HTMLElement
    expect(jane).toHaveTextContent('$1,200 of $1,500')
    const sam = within(members)
      .getByRole('button', { name: 'Sam Other' })
      .closest('tr') as HTMLElement
    expect(sam).not.toHaveTextContent(' of ')
  })

  it('sends the groups filter as min_amount', () => {
    answer([PROJECT], null)
    render(table({ minAmount: 1000, groupBy: 'organization' }))

    expect(lastCall('people-groups')?.[2]).toMatchObject({
      group_by: 'organization',
      min_amount: 1000,
    })
  })

  it('shows No common condition last, only when the API sends it', () => {
    answer([PROJECT, ORG], NONE)
    render(table())

    const rows = within(screen.getByRole('table', { name: 'Groups of chargeback candidates' }))
      .getAllByRole('row')
      .filter((r) => within(r).queryAllByRole('cell').length > 0)
    expect(rows.at(-1)).toHaveTextContent('No common condition')
    expect(rows.at(-1)).toHaveTextContent('7 candidates')
    cleanup()

    answer([PROJECT, ORG], null)
    render(table({ minAmount: 500 }))
    expect(screen.queryByText('No common condition')).toBeNull()
  })

  it('searching a person expands the groups that contain them', () => {
    answer([PROJECT, ORG], null)
    render(table({ search: 'jane' }))

    expect(screen.getAllByRole('button', { name: 'Collapse row' })).toHaveLength(2)
    expect(lastCall('people-groups')?.[2]).toMatchObject({ search: 'jane' })
    // Each expanded group lists only the people searched for.
    const lists = screen.getAllByRole('table', { name: 'Candidates in the group' })
    expect(within(lists[0]).getByRole('button', { name: 'Jane Example' })).toBeInTheDocument()
    expect(within(lists[0]).queryByRole('button', { name: 'Sam Other' })).toBeNull()
    expect(screen.getAllByText('1 of 2 candidates match “jane”').length).toBe(2)
  })

  it('collapses a group while searching', async () => {
    const user = userEvent.setup()
    answer([PROJECT, ORG], null)
    render(table({ search: 'jane' }))

    await user.click(screen.getAllByRole('button', { name: 'Collapse row' })[0])

    expect(screen.getAllByRole('button', { name: 'Collapse row' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Expand row' })).toHaveLength(1)
  })

  it('an expanded group shows its first 50 candidates', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 60 }, (_, i) => ({
      ...DETAIL.members[0],
      uid: `u-${i}`,
      name: `Person ${i}`,
    }))
    answer([PROJECT], null, { ...DETAIL, members: many })
    render(table())

    const row = screen
      .getByRole('button', { name: 'northwind-payments' })
      .closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Expand row' }))

    const list = screen.getByRole('table', { name: 'Candidates in the group' })
    expect(
      within(list)
        .getAllByRole('row')
        .filter((r) => within(r).queryAllByRole('cell').length)
    ).toHaveLength(50)
    expect(screen.getByText(/Showing 50 of 60 candidates/)).toBeInTheDocument()
  })
})

describe('PeopleGroupModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('explains an inside project and copies the people list', async () => {
    const user = userEvent.setup()
    answer([], null)
    render(
      <PeopleGroupModal
        groupBy="common"
        groupId={PROJECT.id}
        params={{}}
        onHide={vi.fn()}
        onOpenPerson={vi.fn()}
      />
    )

    expect(lastCall('popup-people-group')?.[1]).toBe(`people-groups/common/${PROJECT.id}`)
    expect(screen.getByText('CodeMie project: northwind-payments')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Their production work runs inside the shared CodeMie project northwind-payments, which has no budget for them.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Charged back for the same people').parentElement).toHaveTextContent(
      '$50'
    )
    expect(
      screen.getByText(/Map this group to the project or account it works for/)
    ).toBeInTheDocument()

    // userEvent.setup() gives the page a clipboard to read back.
    await user.click(screen.getByRole('button', { name: 'Copy people list' }))
    expect(await navigator.clipboard.readText()).toBe(
      'Jane Example <jane@example.com>\nSam Other <sam@example.com>'
    )
  })

  it('copies people without an email by name only', async () => {
    const user = userEvent.setup()
    const members = [
      DETAIL.members[0],
      { ...DETAIL.members[1], name: 'No Email', email: '' },
      { ...DETAIL.members[1], uid: 'u-3', name: 'same@example.com', email: 'same@example.com' },
    ]
    answer([], null, { ...DETAIL, members })
    render(
      <PeopleGroupModal
        groupBy="common"
        groupId={PROJECT.id}
        params={{}}
        onHide={vi.fn()}
        onOpenPerson={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Copy people list' }))
    expect(await navigator.clipboard.readText()).toBe(
      'Jane Example <jane@example.com>\nNo Email\nsame@example.com'
    )
  })

  it('No common condition gets its own next step', () => {
    const none: UaPeopleGroupDetail = {
      ...DETAIL,
      row: NONE,
      facts: { condition: null, how: null, reason: null, repositories: [] },
    }
    answer([], null, none)
    render(
      <PeopleGroupModal
        groupBy="common"
        groupId="none"
        params={{}}
        onHide={vi.fn()}
        onOpenPerson={vi.fn()}
      />
    )

    expect(screen.getByText('No common condition')).toBeInTheDocument()
    expect(screen.queryByText(/Map this group to the project or account/)).toBeNull()
    expect(screen.getByText(/one by one/)).toBeInTheDocument()
  })

  it('shows a group gone from the analysis as not found', () => {
    vi.mocked(useUaQuery).mockReturnValue({
      data: null,
      error: { message: 'Not found', status: 404 },
      loading: false,
    })
    render(
      <PeopleGroupModal
        groupBy="common"
        groupId="project-gone"
        params={{}}
        onHide={vi.fn()}
        onOpenPerson={vi.fn()}
      />
    )

    expect(screen.getByText(/This group is not in the analysis any more/)).toBeInTheDocument()
  })
})
