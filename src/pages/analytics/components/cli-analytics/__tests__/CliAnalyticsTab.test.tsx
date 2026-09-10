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

import { render, screen } from '@testing-library/react'
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
  default: () => <div data-testid="sessions-view" />,
}))

const MOCK_FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }

describe('CliAnalyticsTab', () => {
  it('renders all 8 section buttons', () => {
    render(<CliAnalyticsTab filters={MOCK_FILTERS} />)
    expect(screen.getAllByRole('button')).toHaveLength(8)
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

  it('does not render header content', () => {
    render(<CliAnalyticsTab filters={MOCK_FILTERS} />)
    expect(screen.queryByRole('button', { name: /Remove .+ filter/ })).not.toBeInTheDocument()
  })
})
