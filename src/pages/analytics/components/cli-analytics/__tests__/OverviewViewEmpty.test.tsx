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
import { describe, expect, it, vi } from 'vitest'

import type { AnalyticsQueryParams } from '@/types/analytics'

import OverviewView from '../views/OverviewView'

// Simulates the CLI Analytics store slice resolving `data: null` (empty/zero backend response).
vi.mock('../hooks/useCliAnalyticsOverview', () => ({
  useCliAnalyticsOverview: vi.fn(() => ({
    kpis: null,
    dailyBuckets: [],
    modelBreakdown: [],
    loading: false,
    error: null,
  })),
}))

vi.mock('../hooks/useCliAnalyticsRepositories', () => ({
  useCliAnalyticsRepositories: vi.fn(() => ({
    rows: [],
    loading: false,
    error: null,
    search: '',
    setSearch: vi.fn(),
  })),
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`widget-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

vi.mock('react-chartjs-2', () => ({
  Bar: () => <canvas data-testid="bar-chart" />,
  Doughnut: () => <canvas data-testid="donut-chart" />,
}))

vi.mock('../views/RepositoriesTable', () => ({
  default: () => <div data-testid="repositories-table" />,
}))

const MOCK_FILTERS: AnalyticsQueryParams = { start_date: '2026-07-01', end_date: '2026-07-17' }

describe('OverviewView — empty/zero response (data: null)', () => {
  it('renders without throwing and shows an empty state, not undefined/NaN', () => {
    render(<OverviewView filters={MOCK_FILTERS} />)

    expect(screen.getByTestId('widget-summary')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
  })
})
