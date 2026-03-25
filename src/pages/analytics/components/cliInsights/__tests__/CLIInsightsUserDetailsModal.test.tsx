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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AnalyticsQueryParams,
  Metric,
  SummariesResponse,
  TabularResponse,
} from '@/types/analytics'
import { ColumnType } from '@/types/analytics'
import api from '@/utils/api'

import CLIInsightsUserDetailsModal from '../CLIInsightsUserDetailsModal'

import type { ReactNode } from 'react'

vi.mock('@/components/Popup', () => ({
  default: ({
    visible,
    header,
    children,
  }: {
    visible: boolean
    header: string
    children: ReactNode
  }) =>
    visible ? (
      <div>
        <div>{header}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner">loading</div>,
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}))

vi.mock('../../widgets/MetricsGrid', () => ({
  default: ({ data }: { data: SummariesResponse | null }) => (
    <div data-testid="metrics-grid">metrics:{data?.data.metrics.length ?? 0}</div>
  ),
}))

vi.mock('../../widgets/DonutChartWidget', () => ({
  default: ({ title, dataOverride }: { title: string; dataOverride?: TabularResponse | null }) => (
    <div>{`${title}:${dataOverride?.data.rows.length ?? 0}`}</div>
  ),
}))

vi.mock('../../widgets/DistributionBarWidget', () => ({
  default: ({ title, data }: { title: string; data: TabularResponse | null }) => (
    <div>{`${title}:${data?.data.rows.length ?? 0}`}</div>
  ),
}))

vi.mock('../../widgets/MetricCard', () => ({
  default: ({ metric }: { metric: { id: string } }) => <div>{metric.id}</div>,
}))

vi.mock('../../widgets/TableWidget', () => ({
  default: ({ title, initialData }: { title: string; initialData?: TabularResponse | null }) => (
    <div>{`${title}:${initialData?.data.rows.length ?? 0}`}</div>
  ),
}))

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockedApiGet = vi.mocked(api.get)

const filters = { time_period: 'last_24_hours' } as AnalyticsQueryParams

const createMetric = (
  metric: Partial<Metric> & Pick<Metric, 'id' | 'label' | 'value'>
): Metric => ({
  type: ColumnType.STRING,
  description: '',
  ...metric,
})

const createSummariesResponse = (metrics: Metric[]): SummariesResponse => ({
  data: { metrics },
  metadata: {
    timestamp: '2026-03-24T00:00:00Z',
    data_as_of: '2026-03-24T00:00:00Z',
  },
})

const createTabularResponse = (rows: Array<Record<string, unknown>>): TabularResponse => ({
  data: {
    columns: [],
    rows,
    totals: {},
  },
  metadata: {
    timestamp: '2026-03-24T00:00:00Z',
    data_as_of: '2026-03-24T00:00:00Z',
  },
  pagination: {
    page: 0,
    per_page: 10,
    total_count: rows.length,
    has_more: false,
  },
})

const responses = {
  'v1/analytics/cli-insights-user-detail': {
    data: {
      user_name: 'Roman Pak',
      user_email: 'roman_pak@epam.com',
      unique_projects: ['sap-mobile'],
      branches_used: ['main', 'develop'],
      rule_reasons: ['frequency: 3.0 sessions/day', 'cost: $121.04'],
      tool_profile: {
        rationale: 'Primary signal suggests active development.',
      },
    },
  },
  'v1/analytics/cli-insights-user-key-metrics': createSummariesResponse([
    createMetric({ id: 'total_cost', label: 'Total Cost', value: 121.04, type: ColumnType.NUMBER }),
    createMetric({ id: 'sessions', label: 'Sessions', value: 6, type: ColumnType.INTEGER }),
  ]),
  'v1/analytics/cli-insights-user-tools': createTabularResponse([
    { tool_name: 'bash', usage_count: 12 },
  ]),
  'v1/analytics/cli-insights-user-models': createTabularResponse([
    { model_name: 'claude-sonnet-4-6', count: 5 },
  ]),
  'v1/analytics/cli-insights-user-workflow-intent': createSummariesResponse([
    createMetric({ id: 'primary_intent', label: 'Primary Intent', value: 'active_development' }),
    createMetric({
      id: 'signal_strength',
      label: 'Signal Strength',
      value: 0.32,
      type: ColumnType.NUMBER,
    }),
  ]),
  'v1/analytics/cli-insights-user-classification-detail': createSummariesResponse([
    createMetric({ id: 'primary_category', label: 'Primary Category', value: 'production' }),
    createMetric({
      id: 'is_multi_category',
      label: 'Multi-Category',
      value: false,
      type: ColumnType.BOOLEAN,
    }),
    createMetric({
      id: 'category_diversity_score',
      label: 'Diversity Score',
      value: 0,
      type: ColumnType.NUMBER,
    }),
    createMetric({
      id: 'unique_repositories',
      label: 'Repositories',
      value: 2,
      type: ColumnType.INTEGER,
    }),
  ]),
  'v1/analytics/cli-insights-user-category-breakdown': createTabularResponse([
    { category: 'production', percentage: 1, cost: 121.04 },
  ]),
  'v1/analytics/cli-insights-user-repositories': createTabularResponse([
    {
      repository: 'SAPDevelop/stplayer',
      classification: 'production',
      cost: 92.06,
      sessions: 1,
      branches: ['main'],
    },
  ]),
} as const

describe('CLIInsightsUserDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedApiGet.mockImplementation((endpoint) => {
      const payload = responses[endpoint as keyof typeof responses]
      if (!payload) {
        return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`))
      }
      return Promise.resolve({
        json: async () => payload,
      } as Response)
    })
  })

  it('does not render or fetch when userName is missing', () => {
    const { container } = render(
      <CLIInsightsUserDetailsModal userName={null} filters={filters} onHide={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
    expect(mockedApiGet).not.toHaveBeenCalled()
  })

  it('fetches all user detail widgets and renders the modal content', async () => {
    const onProjectClick = vi.fn()

    render(
      <CLIInsightsUserDetailsModal
        userName="Roman Pak"
        userId="user-1"
        filters={filters}
        onHide={vi.fn()}
        onProjectClick={onProjectClick}
      />
    )

    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(8))

    expect(mockedApiGet).toHaveBeenCalledWith(
      'v1/analytics/cli-insights-user-detail',
      expect.objectContaining({
        params: expect.objectContaining({
          user_name: 'Roman Pak',
          user_id: 'user-1',
          time_period: 'last_24_hours',
        }),
        queryParamArrayHandling: 'compact',
        skipErrorHandling: true,
      })
    )

    expect(await screen.findByText('CLI User: Roman Pak')).toBeInTheDocument()
    expect(screen.getByText('roman_pak@epam.com')).toBeInTheDocument()
    expect(screen.getByTestId('metrics-grid')).toHaveTextContent('metrics:2')
    expect(screen.getByText('Most Used Tools:1')).toBeInTheDocument()
    expect(screen.getByText('Models:1')).toBeInTheDocument()
    expect(screen.getByText('Category Breakdown:1')).toBeInTheDocument()
    expect(screen.getByText('Repositories (1):1')).toBeInTheDocument()
    expect(screen.getByText('Branches (2)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'sap-mobile' }))
    expect(onProjectClick).toHaveBeenCalledWith('sap-mobile')
  })

  it('shows an error message when the user detail request fails', async () => {
    mockedApiGet.mockRejectedValueOnce(new Error('Request failed'))

    render(<CLIInsightsUserDetailsModal userName="Roman Pak" filters={filters} onHide={vi.fn()} />)

    expect(await screen.findByText('Request failed')).toBeInTheDocument()
  })
})
