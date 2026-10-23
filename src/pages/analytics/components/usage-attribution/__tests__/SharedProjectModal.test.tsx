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
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UaSharedProjectDetail, UaSharedProjectRow } from '@/types/usageAttribution'

import { useUaQuery } from '../hooks/useUaQuery'
import SharedProjectModal from '../modals/SharedProjectModal'

vi.mock('../hooks/useUaQuery', () => ({ useUaQuery: vi.fn() }))

const PROJECT = 'northwind-payments'

const ROW: UaSharedProjectRow = {
  id: 'p-1',
  name: PROJECT,
  platform: 120,
  web_sh: 40,
  cli: 300,
  cli_sh: 200,
  cli_exp: 0,
  cli_potential: 0,
  ncb: 320,
  people: 4,
  prod_pct: 80,
  web_state: 'partial',
  cli_budget: true,
  budgets: ['platform', 'cli'],
  cost_center: 'CC-1042',
  chargeback: true,
  deleted: false,
  members: 6,
  datasources: 0,
  via: ['web', 'cli'],
  share: 1.2,
}

const DETAIL: UaSharedProjectDetail['detail'] = {
  repos: [],
  cli_people: [],
  web_people: [],
  cli_people_total: 0,
  web_people_total: 0,
  agents: [],
  models: [],
  cli_fallback: 0,
  cli_charged_back: 0,
}

const answerWith = (row: UaSharedProjectRow) =>
  vi.mocked(useUaQuery).mockReturnValue({
    data: { data: { row, detail: DETAIL }, range: null, analysis: null },
    error: null,
    loading: false,
  })

const renderModal = () =>
  render(
    <SharedProjectModal
      project={PROJECT}
      params={{ time_period: 'last_30_days' }}
      periodQuery={{ time_period: 'last_30_days' }}
      onHide={vi.fn()}
    />
  )

/** The line of the cost center: its label, its value and the chargeback flag. */
const costCenterLine = () => screen.getByText('Cost center').parentElement as HTMLElement

describe('SharedProjectModal — the cost center and the chargeback flag', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows totals, budget categories, cost center, chargeback flag and members', () => {
    answerWith(ROW)

    renderModal()

    expect(screen.getByText('Chargeback Potential').parentElement).toHaveTextContent('$320')
    expect(screen.queryByText('Not Charged Back')).toBeNull()
    expect(screen.getByText('Platform, CLI budget for some members')).toBeInTheDocument()
    expect(within(costCenterLine()).getByText('CC-1042')).toBeInTheDocument()
    expect(within(costCenterLine()).getByText('Chargeback on')).toBeInTheDocument()
    expect(screen.getByText(/· 6 members/)).toBeInTheDocument()
  })

  it.each([
    ['a cost center and chargeback on', 'CC-1042', true, 'Chargeback on', 'Chargeback off'],
    ['a cost center and chargeback off', 'CC-1042', false, 'Chargeback off', 'Chargeback on'],
    ['no cost center', null, false, 'Chargeback off', 'Chargeback on'],
  ])(
    'shows the flag next to the cost center for a project with %s',
    (_case, costCenter, chargeback, shown, hidden) => {
      answerWith({ ...ROW, cost_center: costCenter, chargeback })

      renderModal()

      const line = costCenterLine()
      expect(within(line).getByText(costCenter ?? 'None')).toBeInTheDocument()
      expect(within(line).getByText(shown)).toBeInTheDocument()
      expect(screen.queryByText(hidden)).not.toBeInTheDocument()
    }
  )
})
