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

import { TabularMetricType } from '@/types/analytics'

import TableWidget from '../TableWidget'

vi.mock('valtio', async () => {
  const actual = await vi.importActual<typeof import('valtio')>('valtio')
  return {
    ...actual,
    useSnapshot: vi.fn(() => ({
      loading: {},
      loaded: { 'ai-adoption-config': true },
      error: {},
      aiAdoptionConfig: null,
    })),
  }
})

const { mockFetchTabularData } = vi.hoisted(() => ({
  mockFetchTabularData: vi.fn(),
}))

vi.mock('@/store/analytics', () => ({
  analyticsStore: {
    fetchTabularData: mockFetchTabularData,
  },
}))

describe('TableWidget — empty response', () => {
  it('renders without throwing and shows an empty state for an empty rows/columns response', async () => {
    mockFetchTabularData.mockResolvedValue({
      data: { columns: [], rows: [] },
      metadata: { timestamp: '', data_as_of: '' },
      pagination: { page: 0, per_page: 10, total_count: 0, has_more: false },
    })

    render(
      <TableWidget metricType={TabularMetricType.ASSISTANTS_CHATS} title="Assistants & Chats" />
    )

    await waitFor(() => expect(mockFetchTabularData).toHaveBeenCalled())
    expect(await screen.findByText('No data available')).toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
  })
})
