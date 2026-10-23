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
  UaPersonChargeback,
  UaPersonDetail,
  UaPersonRow,
  UaRange,
} from '@/types/usageAttribution'

import { useUaQuery } from '../hooks/useUaQuery'
import PersonModal from '../modals/PersonModal'

vi.mock('../hooks/useUaQuery', () => ({ useUaQuery: vi.fn() }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('../widgets/Charts', () => ({ ModelsDonut: () => null }))

const ROW: UaPersonRow = {
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
  main_repo: 'northwind/api',
  main_group: 'g-1',
  share: 0.4,
  candidate: true,
}

const CANDIDATE: UaPersonChargeback = {
  candidate: true,
  production_days: 12,
  threshold_days: 5,
  groups: [
    {
      id: 'project-0123456789',
      condition: 'project',
      label: 'northwind-payments',
      amount: 220,
      others: 3,
    },
  ],
  alone: 80,
}

const detail = (chargeback: UaPersonChargeback): UaPersonDetail['detail'] => ({
  projects: [],
  repos: [],
  by_category: [],
  reasons: [],
  allocated: {},
  sessions: 40,
  net_lines: 1200,
  cli_charged_back: 300,
  cli_shared_no_budget: 0,
  cli_no_customer: 0,
  chargeback,
})

const answer = (row: UaPersonRow, chargeback: UaPersonChargeback, range = {} as UaRange) =>
  vi.mocked(useUaQuery).mockReturnValue({
    data: { data: { row, detail: detail(chargeback) }, range, analysis: {} as UaAnalysisInfo },
    error: null,
    loading: false,
  })

const open = (onOpenGroup = vi.fn()) =>
  render(
    <PersonModal
      uid="u-1"
      params={{}}
      periodQuery={{}}
      onHide={vi.fn()}
      onOpenGroup={onOpenGroup}
    />
  )

const section = () =>
  screen.getByText('Chargeback candidate', { selector: 'h5' }).closest('section') as HTMLElement

describe('PersonModal — who pays and the chargeback candidate', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('a candidate sees the groups they share, as links', async () => {
    const user = userEvent.setup()
    const onOpenGroup = vi.fn()
    answer(ROW, CANDIDATE)
    open(onOpenGroup)

    expect(section()).toHaveTextContent(
      'Production work from a personal budget on 12 days in this period.'
    )
    expect(section()).toHaveTextContent(
      '$220 · CodeMie project northwind-payments, shared with 3 other candidates'
    )
    expect(section()).toHaveTextContent('$80 · no other candidate shares this work')
    await user.click(
      within(section()).getByRole('button', { name: 'CodeMie project northwind-payments' })
    )
    expect(onOpenGroup).toHaveBeenCalledWith('project-0123456789')
  })

  it('on a period shorter than the evidence window, says since when the days are counted', () => {
    const week = {
      from: '2026-10-09T15:00:00Z',
      to: '2026-10-16T15:00:00Z',
      evidence_from: '2026-09-16T00:00:00Z',
    } as UaRange
    answer(ROW, CANDIDATE, week)
    open()

    expect(section()).toHaveTextContent(
      'Production work from a personal budget on 12 days since Sep 16, 2026.'
    )
    expect(section()).not.toHaveTextContent('in this period')
  })

  it('a person below the days threshold is told why', () => {
    answer(
      { ...ROW, candidate: false, production_days: 1 },
      { candidate: false, production_days: 1, threshold_days: 5, groups: [], alone: 0 }
    )
    open()

    expect(section()).toHaveTextContent(
      'Not a candidate: production work from a personal budget on 1 day in this period only (5 or more needed).'
    )
  })

  it('splits the spend by who pays, without Chargeback Potential', () => {
    answer(ROW, CANDIDATE)
    open()

    const tile = (label: string) => screen.getByText(label).parentElement as HTMLElement
    expect(tile('Charged Back')).toHaveTextContent('$400')
    expect(tile('Charged Back')).toHaveTextContent('Paid by project budgets')
    expect(tile('Personal Budget: Production')).toHaveTextContent('$300')
    expect(tile('Personal Budget: Production')).toHaveTextContent('12 days with production')
    expect(tile('Personal Budget: Learning & Experiments')).toHaveTextContent('$120')
    for (const gone of [
      'Not Charged Back',
      'Chargeback Potential',
      'CLI Production',
      'CLI Experiments',
    ]) {
      expect(screen.queryByText(gone)).toBeNull()
    }
  })

  it('no chargeback section without production on a personal budget', () => {
    answer(
      { ...ROW, prod_ncb: 0, candidate: false },
      { ...CANDIDATE, candidate: false, groups: [], alone: 0 }
    )
    open()

    expect(screen.queryByText('Chargeback candidate', { selector: 'h5' })).toBeNull()
  })
})
