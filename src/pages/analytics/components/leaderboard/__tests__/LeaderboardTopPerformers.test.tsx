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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { analyticsStore } from '@/store/analytics'

import LeaderboardTopPerformers from '../LeaderboardTopPerformers'

vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    loading: {},
    error: {},
    fetchTabularData: vi.fn(),
  },
}))

vi.mock('../../AnalyticsWidget', () => ({
  default: ({ children }: any) => <div data-testid="analytics-widget">{children}</div>,
}))

const buildPerformer = (overrides: Record<string, unknown> = {}) => ({
  user_name: 'Test User',
  tier_name: 'pioneer',
  total_score: 85.5,
  dimensions: JSON.stringify([
    { id: 'd1', score: 0.8 },
    { id: 'd2', score: 0.6 },
  ]),
  ...overrides,
})

describe('LeaderboardTopPerformers - dimensions parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse valid JSON string dimensions correctly', async () => {
    const performer = buildPerformer()
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: { columns: [], rows: [performer] },
    } as any)

    render(<LeaderboardTopPerformers />)

    await waitFor(() => {
      // D1 dimension label should appear in a DimensionBar
      expect(screen.getByText(/D1 · Core Platform Usage/)).toBeInTheDocument()
      expect(screen.getByText(/D2 · Core Platform Creation/)).toBeInTheDocument()
    })
  })

  it('should fall back to empty array when dimensions is malformed JSON', async () => {
    const performer = buildPerformer({ dimensions: '{not valid json[' })
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: { columns: [], rows: [performer] },
    } as any)

    render(<LeaderboardTopPerformers />)

    await waitFor(() => {
      // The performer card should render (user name visible) but no dimension bars
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    // Dimension labels should NOT appear since parsing failed
    expect(screen.queryByText(/D1 · Core Platform Usage/)).not.toBeInTheDocument()
    expect(screen.queryByText(/D2 · Core Platform Creation/)).not.toBeInTheDocument()
  })

  it('should use array dimensions directly without parsing', async () => {
    const performer = buildPerformer({
      dimensions: [
        { id: 'd3', score: 0.7 },
        { id: 'd4', score: 0.5 },
      ],
    })
    vi.mocked(analyticsStore.fetchTabularData).mockResolvedValue({
      data: { columns: [], rows: [performer] },
    } as any)

    render(<LeaderboardTopPerformers />)

    await waitFor(() => {
      expect(screen.getByText(/D3 · Workflow Usage/)).toBeInTheDocument()
      expect(screen.getByText(/D4 · Workflow Creation/)).toBeInTheDocument()
    })
  })
})
