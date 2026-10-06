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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { OverviewMetricType } from '@/types/analytics'

import MetricsWidget from '../MetricsWidget'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return { ...actual, useSnapshot: vi.fn(() => ({ loading: {}, error: {} })) }
})

const { mockFetchSummaries } = vi.hoisted(() => ({
  mockFetchSummaries: vi.fn(),
}))

vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    fetchSummaries: mockFetchSummaries,
  },
}))

describe('MetricsWidget — empty/zero response', () => {
  it('renders without throwing and shows no metric cards for an empty metrics array', async () => {
    mockFetchSummaries.mockResolvedValue({
      data: { metrics: [] },
      metadata: { timestamp: '', data_as_of: '' },
    })

    render(<MetricsWidget type={OverviewMetricType.SUMMARIES} />)

    await waitFor(() => expect(mockFetchSummaries).toHaveBeenCalled())
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
  })
})
