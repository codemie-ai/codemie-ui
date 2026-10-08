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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { analyticsStore } from '@/store/analytics'

import SpendingCard from '../SpendingCard'

vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    loading: {},
    error: {},
    fetchTabularData: vi.fn(),
  },
}))

describe('SpendingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders doughnut label with spend and clamped percentage for single row', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
          { id: 'project_name', label: 'Project' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
        ],
        rows: [
          {
            current_spending: 12.34,
            total: 45,
            budget_limit: 100,
            project_name: 'Test Project',
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$12.34')).toBeInTheDocument()
      expect(screen.getByText('(45.0%)')).toBeInTheDocument()
    })
  })

  it('renders doughnut label with unclamped spend but clamped percentage', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
          { id: 'project_name', label: 'Project' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
        ],
        rows: [
          {
            current_spending: 120,
            total: 250,
            budget_limit: 100,
            project_name: 'Test Project',
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$120.00')).toBeInTheDocument()
      expect(screen.getByText('(100.0%)')).toBeInTheDocument()
    })
  })

  it('renders doughnut label with dash for null spend', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
          { id: 'project_name', label: 'Project' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
        ],
        rows: [
          {
            current_spending: null,
            total: 30,
            budget_limit: 100,
            project_name: 'Test Project',
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('(30.0%)')).toBeInTheDocument()
    })
  })

  it('renders doughnut label with zero spend as $0.00', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
          { id: 'project_name', label: 'Project' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
        ],
        rows: [
          {
            current_spending: 0,
            total: 0,
            budget_limit: 100,
            project_name: 'Test Project',
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$0.00')).toBeInTheDocument()
      expect(screen.getByText('(0.0%)')).toBeInTheDocument()
    })
  })

  it('renders table with SpendingProgressBar label showing spend and percentage', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          {
            project_name: 'Project A',
            current_spending: 12.34,
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
            total: 45,
            budget_limit: 100,
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$12.34')).toBeInTheDocument()
      expect(screen.getByText('(45.0%)')).toBeInTheDocument()
    })
  })

  it('renders table with SpendingProgressBar handling missing current_spending key', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          {
            project_name: 'Project B',
            // current_spending key is intentionally absent
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
            total: 30,
            budget_limit: 100,
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('(30.0%)')).toBeInTheDocument()
    })
  })

  it('renders doughnut label with dash for negative spend', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
          { id: 'project_name', label: 'Project' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
        ],
        rows: [
          {
            current_spending: -5.5,
            total: 30,
            budget_limit: 100,
            project_name: 'Test Project',
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('(30.0%)')).toBeInTheDocument()
    })
  })

  it('renders table row with negative spend as dash', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          {
            project_name: 'Project C',
            current_spending: -10.0,
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
            total: 50,
            budget_limit: 100,
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument()
      expect(screen.getByText('(50.0%)')).toBeInTheDocument()
    })
  })

  it('renders multi-row table without Current Spending and with Spent / Limit column', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
          { id: 'total', label: 'Total', format: 'percentage' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          {
            project_name: 'Project A',
            current_spending: 2.29,
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
            total: 2.29,
            budget_limit: 100,
          },
          {
            project_name: 'Project B',
            current_spending: 50,
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
            total: 50,
            budget_limit: 100,
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$2.29 / $100.00 (2.3%)')).toBeInTheDocument()
      expect(screen.getByText('$50.00 / $100.00 (50.0%)')).toBeInTheDocument()
    })
    expect(screen.getByText('Spent / Limit')).toBeInTheDocument()
    expect(screen.queryByText('Current Spending')).not.toBeInTheDocument()
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
  })

  it('shows each row its own amounts when rows share a project name', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending' },
          { id: 'budget_reset_at', label: 'Budget Reset' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
          { id: 'total', label: 'Total', format: 'percentage' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          {
            project_name: 'Same Name',
            current_spending: 2.29,
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
            total: 2.29,
            budget_limit: 100,
          },
          {
            project_name: 'Same Name',
            current_spending: 50,
            budget_reset_at: '2026-10-24',
            time_until_reset: '30 days',
            total: 50,
            budget_limit: 100,
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$2.29 / $100.00 (2.3%)')).toBeInTheDocument()
      expect(screen.getByText('$50.00 / $100.00 (50.0%)')).toBeInTheDocument()
    })
  })

  it('single-row layout omits the Current Spending row but keeps the amount in the doughnut', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending ($)' },
          { id: 'budget_reset_at', label: 'Budget Reset Date' },
          { id: 'time_until_reset', label: 'Time Until Reset' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          {
            project_name: 'Project A',
            current_spending: 2.29,
            budget_reset_at: '2026-11-01',
            time_until_reset: '25 days',
            total: 2.29,
            budget_limit: 100,
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$2.29')).toBeInTheDocument()
      expect(screen.getByText('(2.3%)')).toBeInTheDocument()
    })
    expect(screen.getAllByText('$2.29')).toHaveLength(1)
    expect(screen.queryByText('Current Spending ($)')).not.toBeInTheDocument()
    expect(screen.getByText('Time Until Reset')).toBeInTheDocument()
  })

  it('single-row layout keeps the Current Spending row when there is no limit column', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending ($)', format: 'currency' },
          { id: 'budget_reset_at', label: 'Budget Reset Date' },
          { id: 'total', label: 'Total' },
        ],
        rows: [
          {
            project_name: 'Project A',
            current_spending: 2.29,
            budget_reset_at: '2026-11-01',
            total: 2.29,
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('Current Spending ($)')).toBeInTheDocument()
    })
    expect(screen.getByText('$2.29')).toBeInTheDocument()
  })

  it('single-row layout also renders spent / limit text with the bar for small screens', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending ($)' },
          { id: 'budget_reset_at', label: 'Budget Reset Date' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          {
            project_name: 'Project A',
            current_spending: 2.29,
            budget_reset_at: '2026-11-01',
            total: 2.29,
            budget_limit: 100,
          },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$2.29 / $100.00 (2.3%)')).toBeInTheDocument()
    })
    expect(screen.getByText('Spent / Limit')).toBeInTheDocument()
  })

  it('mobile card list gives Spent / Limit a full-width cell', async () => {
    const { matchMedia } = window
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia

    try {
      vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
        data: {
          columns: [
            { id: 'project_name', label: 'Project' },
            { id: 'current_spending', label: 'Current Spending ($)' },
            { id: 'total', label: 'Total', format: 'percentage' },
            { id: 'budget_limit', label: 'Budget Limit' },
          ],
          rows: [
            { project_name: 'Project A', current_spending: 2.29, total: 2.29, budget_limit: 100 },
            { project_name: 'Project B', current_spending: 50, total: 50, budget_limit: 100 },
          ],
        },
        metadata: {},
      } as any)

      render(<SpendingCard />)

      const label = await screen.findByText('$2.29 / $100.00 (2.3%)')
      expect(label.closest('.col-span-full')).not.toBeNull()
    } finally {
      window.matchMedia = matchMedia
    }
  })

  it('multi-row table shows a dash for a budget without a limit', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending ($)' },
          { id: 'total', label: 'Total', format: 'percentage' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          { project_name: 'Project A', current_spending: 4.2, total: 0, budget_limit: null },
          { project_name: 'Project B', current_spending: 2.29, total: 2.29, budget_limit: 100 },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$4.20 / - (0.0%)')).toBeInTheDocument()
      expect(screen.getByText('$2.29 / $100.00 (2.3%)')).toBeInTheDocument()
    })
  })

  it('single-row small-screen text shows a dash for a budget without a limit', async () => {
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: {
        columns: [
          { id: 'project_name', label: 'Project' },
          { id: 'current_spending', label: 'Current Spending ($)' },
          { id: 'total', label: 'Total' },
          { id: 'budget_limit', label: 'Budget Limit' },
        ],
        rows: [
          { project_name: 'Project A', current_spending: 2.29, total: 2.29, budget_limit: null },
        ],
      },
      metadata: {},
    } as any)

    render(<SpendingCard />)

    await waitFor(() => {
      expect(screen.getByText('$2.29 / - (2.3%)')).toBeInTheDocument()
    })
  })
})
