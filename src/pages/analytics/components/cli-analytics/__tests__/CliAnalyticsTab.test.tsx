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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { AnalyticsQueryParams } from '@/types/analytics'

import CliAnalyticsTab from '../CliAnalyticsTab'

vi.mock('../views/OverviewView', () => ({
  default: () => <div data-testid="overview-view" />,
}))

vi.mock('../views/ActivityView', () => ({
  default: () => <div data-testid="activity-view" />,
}))
vi.mock('../views/CostView', () => ({
  default: () => <div data-testid="cost-view" />,
}))
vi.mock('../views/EfficiencyView', () => ({
  default: () => <div data-testid="efficiency-view" />,
}))
vi.mock('../views/RepositoriesView', () => ({
  default: () => <div data-testid="repositories-view" />,
}))
vi.mock('../views/ToolsView', () => ({
  default: () => <div data-testid="tools-view" />,
}))

vi.mock('../views/UsersView', () => ({
  default: () => <div data-testid="users-view" />,
}))

vi.mock('../views/SessionsView', () => ({
  default: ({ filters }: { filters: unknown }) => (
    <div data-testid="sessions-view">{JSON.stringify(filters)}</div>
  ),
}))

// Native stand-in for the PrimeReact multiselect: one option click toggles a value.
vi.mock('@/components/form/MultiSelect', () => ({
  default: ({
    id,
    value,
    options,
    onChange,
  }: {
    id: string
    value: string[]
    options: { label: string; value: string }[]
    onChange: (e: { value: string[] }) => void
  }) => (
    <div data-testid={id}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-label={`${id}:${o.label}`}
          onClick={() =>
            onChange({
              value: value.includes(o.value)
                ? value.filter((v) => v !== o.value)
                : [...value, o.value],
            })
          }
        />
      ))}
    </div>
  ),
}))

const MOCK_FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }

describe('CliAnalyticsTab', () => {
  it('renders all 8 section buttons', () => {
    render(<CliAnalyticsTab filters={MOCK_FILTERS} />)
    expect(screen.getAllByRole('button', { name: /^[A-Z][\w &]+$/ })).toHaveLength(8)
  })

  it('renders all 8 section tab labels', () => {
    render(<CliAnalyticsTab filters={MOCK_FILTERS} />)
    const expectedLabels = [
      'Overview',
      'Activity',
      'Cost',
      'Efficiency',
      'Repositories',
      'Tools & Models',
      'Users',
      'Sessions',
    ]
    for (const label of expectedLabels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('shows overview view as the default active tab', () => {
    render(<CliAnalyticsTab filters={MOCK_FILTERS} />)
    expect(screen.getByTestId('overview-view')).toBeInTheDocument()
  })

  it('offers the documented subscription and origin options', () => {
    render(<CliAnalyticsTab filters={MOCK_FILTERS} />)
    for (const l of ['CodeMie', 'Corporate', 'Personal', 'Unknown']) {
      expect(screen.getByLabelText(`cli-analytics-subscription:${l}`)).toBeInTheDocument()
    }
    for (const l of [
      'Linked folder',
      'Selected profile',
      'Registered repository',
      'Default project',
      'Personal project',
      'Legacy project adoption',
      'Not recorded',
    ]) {
      expect(screen.getByLabelText(`cli-analytics-project-origin:${l}`)).toBeInTheDocument()
    }
  })

  it('passes both selections to the views next to the page filters, and drops them on clear', () => {
    render(<CliAnalyticsTab filters={{ ...MOCK_FILTERS, users: ['a@co.com'] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }))

    fireEvent.click(screen.getByLabelText('cli-analytics-subscription:CodeMie'))
    fireEvent.click(screen.getByLabelText('cli-analytics-subscription:Unknown'))
    fireEvent.click(screen.getByLabelText('cli-analytics-project-origin:Linked folder'))

    const passed = () => JSON.parse(screen.getByTestId('sessions-view').textContent ?? '{}')
    expect(passed()).toEqual({
      ...MOCK_FILTERS,
      users: ['a@co.com'],
      subscription_type: ['codemie', 'unknown'],
      project_origin: ['linked_folder'],
    })

    fireEvent.click(screen.getByLabelText('cli-analytics-subscription:CodeMie'))
    fireEvent.click(screen.getByLabelText('cli-analytics-subscription:Unknown'))
    expect(passed().subscription_type).toEqual([])
  })

  it('does not render header content', () => {
    render(<CliAnalyticsTab filters={MOCK_FILTERS} />)
    expect(screen.queryByRole('button', { name: /Remove .+ filter/ })).not.toBeInTheDocument()
  })
})
